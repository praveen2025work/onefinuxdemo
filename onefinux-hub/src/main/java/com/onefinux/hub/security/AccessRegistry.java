package com.onefinux.hub.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * The access register. It records when each user was last seen and suspends anyone idle longer than
 * {@code onefinux.security.inactivity-days}; it holds access granted through requests (one request names every
 * entitlement a desk or app needs, an approver who is not the requester grants it), and it records periodic reviews
 * that confirm or revoke each grant. Every decision is written to the audit log.
 *
 * <p>In production the request, approval and review steps hand off to the bank's identity governance system; this
 * register is the console's view of it and the enforcement point the hub reads on every request.
 */
@Component
public class AccessRegistry {

    static final Duration CACHE = Duration.ofSeconds(20);
    static final Duration TOUCH_EVERY = Duration.ofMinutes(1);
    static final Set<String> KINDS = Set.of("ROLE", "GROUP_UNIT", "CEES");

    private final NamedParameterJdbcTemplate jdbc;
    private final SecurityProperties props;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private final Map<String, Instant> touched = new ConcurrentHashMap<>();

    public AccessRegistry(NamedParameterJdbcTemplate jdbc, SecurityProperties props, Clock clock) {
        this.jdbc = jdbc;
        this.props = props;
        this.clock = clock;
    }

    /** Grants and suspension for one user, cached briefly so the hub does not query on every entitlement check. */
    public Snapshot snapshot(String subject) {
        Instant now = clock.instant();
        Cached c = cache.get(subject);
        if (c != null && c.at.plus(CACHE).isAfter(now)) return c.snapshot;
        Snapshot s = load(subject);
        cache.put(subject, new Cached(now, s));
        return s;
    }

    private Snapshot load(String subject) {
        Map<String, Set<String>> byKind = new LinkedHashMap<>();
        for (Map<String, Object> g : jdbc.queryForList(
                "SELECT kind, grant_value FROM access_grant WHERE subject = :s AND status = 'ACTIVE'", p().addValue("s", subject))) {
            byKind.computeIfAbsent(String.valueOf(g.get("KIND")), k -> new java.util.HashSet<>()).add(String.valueOf(g.get("GRANT_VALUE")));
        }
        List<Boolean> suspended = jdbc.queryForList("SELECT suspended FROM access_seen WHERE subject = :s",
                p().addValue("s", subject), Boolean.class);
        return new Snapshot(byKind.getOrDefault("ROLE", Set.of()), byKind.getOrDefault("GROUP_UNIT", Set.of()),
                byKind.getOrDefault("CEES", Set.of()), !suspended.isEmpty() && Boolean.TRUE.equals(suspended.get(0)));
    }

    /**
     * Note that the user is active. A user whose last visit is older than the inactivity limit is suspended here,
     * on their first request back, before the visit is recorded.
     */
    public void touch(String subject) {
        if (subject == null || subject.isBlank() || "anonymous".equals(subject)) return;
        Instant now = clock.instant();
        Instant last = touched.get(subject);
        if (last != null && last.plus(TOUCH_EVERY).isAfter(now)) return;
        touched.put(subject, now);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT last_seen, suspended FROM access_seen WHERE subject = :s", p().addValue("s", subject));
        if (rows.isEmpty()) {
            jdbc.update("INSERT INTO access_seen (subject, last_seen, suspended) VALUES (:s, :t, FALSE)",
                    p().addValue("s", subject).addValue("t", Timestamp.from(now)));
            return;
        }
        boolean suspended = Boolean.TRUE.equals(rows.get(0).get("SUSPENDED"));
        Instant seen = ((Timestamp) rows.get(0).get("LAST_SEEN")).toInstant();
        if (!suspended && idleTooLong(seen, now)) {
            suspend(subject, now, "idle since " + seen);
            return;
        }
        if (!suspended) {
            jdbc.update("UPDATE access_seen SET last_seen = :t WHERE subject = :s",
                    p().addValue("s", subject).addValue("t", Timestamp.from(now)));
        }
    }

    boolean idleTooLong(Instant seen, Instant now) {
        return seen.plus(Duration.ofDays(props.inactivityDays())).isBefore(now);
    }

    /** Daily sweep: suspend everyone idle past the limit, so reports and reviews show it before they come back. */
    @Scheduled(cron = "0 15 2 * * *")
    public int suspendInactive() {
        Instant now = clock.instant();
        int n = 0;
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT subject, last_seen FROM access_seen WHERE suspended = FALSE", p())) {
            if (idleTooLong(((Timestamp) row.get("LAST_SEEN")).toInstant(), now)) {
                suspend(String.valueOf(row.get("SUBJECT")), now, "inactivity sweep");
                n++;
            }
        }
        return n;
    }

    private void suspend(String subject, Instant now, String why) {
        jdbc.update("UPDATE access_seen SET suspended = TRUE, suspended_at = :t WHERE subject = :s",
                p().addValue("s", subject).addValue("t", Timestamp.from(now)));
        audit("system", "ACCESS_SUSPENDED", subject, "DENY", Map.of("reason", why, "inactivityDays", props.inactivityDays()));
        cache.remove(subject);
    }

    /** Restore a suspended user (an approver re-grants access). */
    public void restore(String subject, String by) {
        jdbc.update("UPDATE access_seen SET suspended = FALSE, suspended_at = NULL, last_seen = :t WHERE subject = :s",
                p().addValue("s", subject).addValue("t", Timestamp.from(clock.instant())));
        audit(by, "ACCESS_RESTORED", subject, "ALLOW", Map.of());
        cache.remove(subject);
        touched.remove(subject);
    }

    // ---------------------------------------------------------------- reports

    /** Every known user: last seen, suspension, and the access granted through requests. */
    public List<Map<String, Object>> users() {
        Map<String, List<String>> grants = new LinkedHashMap<>();
        for (Map<String, Object> g : jdbc.queryForList(
                "SELECT subject, kind, grant_value FROM access_grant WHERE status = 'ACTIVE' ORDER BY id", p())) {
            grants.computeIfAbsent(String.valueOf(g.get("SUBJECT")), k -> new ArrayList<>())
                    .add(g.get("KIND") + ":" + g.get("GRANT_VALUE"));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT subject, last_seen, suspended FROM access_seen ORDER BY subject", p())) {
            String subject = String.valueOf(row.get("SUBJECT"));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subject", subject);
            m.put("lastSeen", String.valueOf(row.get("LAST_SEEN")));
            m.put("suspended", Boolean.TRUE.equals(row.get("SUSPENDED")));
            m.put("granted", String.join(", ", grants.getOrDefault(subject, List.of())));
            out.add(m);
        }
        return out;
    }

    // ---------------------------------------------------------------- requests (integrated provisioning)

    /** One request for every entitlement a desk or app needs. Items are {kind, value}. */
    public Map<String, Object> request(String subject, String target, List<Map<String, String>> items, String reason) {
        List<Map<String, String>> clean = new ArrayList<>();
        for (Map<String, String> it : items) {
            String kind = it.get("kind") == null ? "" : it.get("kind").toUpperCase();
            String value = it.get("value") == null ? "" : it.get("value").trim();
            if (!KINDS.contains(kind)) throw new IllegalArgumentException("kind must be one of " + KINDS);
            if (!value.matches("^[A-Za-z0-9_:.-]{1,80}$")) throw new IllegalArgumentException("bad value: " + value);
            clean.add(Map.of("kind", kind, "value", value));
        }
        if (clean.isEmpty()) throw new IllegalArgumentException("ask for at least one entitlement");
        String id = "AR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        jdbc.update("""
                INSERT INTO access_request (id, subject, target, items_json, reason, status, requested_at)
                VALUES (:id, :s, :t, :items, :r, 'PENDING', :at)""",
                p().addValue("id", id).addValue("s", subject).addValue("t", target).addValue("items", json(clean))
                        .addValue("r", reason).addValue("at", Timestamp.from(clock.instant())));
        audit(subject, "ACCESS_REQUESTED", id, "OK", Map.of("target", target, "items", clean));
        return Map.of("id", id, "status", "PENDING", "items", clean);
    }

    public List<Map<String, Object>> requests(String status) {
        String where = status == null || status.isBlank() ? "" : " WHERE status = :st";
        return jdbc.queryForList("""
                SELECT id AS "id", subject AS "subject", target AS "target", items_json AS "items", reason AS "reason",
                       status AS "status", CAST(requested_at AS VARCHAR) AS "requestedAt", decided_by AS "decidedBy",
                       CAST(decided_at AS VARCHAR) AS "decidedAt"
                  FROM access_request""" + where + " ORDER BY requested_at DESC",
                p().addValue("st", status == null ? null : status.toUpperCase()));
    }

    /** Approve or reject. The approver may not decide their own request (separation of duties). */
    public Map<String, Object> decide(String id, boolean approve, String approver) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT subject, items_json, status FROM access_request WHERE id = :id", p().addValue("id", id));
        if (rows.isEmpty()) throw new IllegalArgumentException("no request " + id);
        Map<String, Object> req = rows.get(0);
        String subject = String.valueOf(req.get("SUBJECT"));
        if (!"PENDING".equals(req.get("STATUS"))) throw new IllegalStateException("request " + id + " is " + req.get("STATUS"));
        if (subject.equals(approver)) throw new SecurityException("you cannot approve your own access request");
        Instant now = clock.instant();
        jdbc.update("UPDATE access_request SET status = :st, decided_by = :b, decided_at = :t WHERE id = :id",
                p().addValue("st", approve ? "APPROVED" : "REJECTED").addValue("b", approver)
                        .addValue("t", Timestamp.from(now)).addValue("id", id));
        if (approve) {
            for (Map<String, String> it : parse(String.valueOf(req.get("ITEMS_JSON")))) {
                jdbc.update("""
                        INSERT INTO access_grant (subject, kind, grant_value, status, source, granted_by, granted_at)
                        VALUES (:s, :k, :v, 'ACTIVE', :src, :b, :t)""",
                        p().addValue("s", subject).addValue("k", it.get("kind")).addValue("v", it.get("value"))
                                .addValue("src", id).addValue("b", approver).addValue("t", Timestamp.from(now)));
            }
            jdbc.update("UPDATE access_seen SET suspended = FALSE, suspended_at = NULL, last_seen = :t WHERE subject = :s",
                    p().addValue("s", subject).addValue("t", Timestamp.from(now)));
            touched.remove(subject);
        }
        audit(approver, approve ? "ACCESS_APPROVED" : "ACCESS_REJECTED", id, approve ? "ALLOW" : "DENY", Map.of("subject", subject));
        cache.remove(subject);
        return Map.of("id", id, "status", approve ? "APPROVED" : "REJECTED");
    }

    // ---------------------------------------------------------------- reviews

    /** Grants due for review, with whether each still fits the role structure and how long since the user was seen. */
    public List<Map<String, Object>> reviewQueue(Set<String> knownRoles) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> g : jdbc.queryForList("""
                SELECT g.id, g.subject, g.kind, g.grant_value, g.granted_by, CAST(g.granted_at AS VARCHAR) AS granted_at,
                       g.reviewed_by, CAST(g.reviewed_at AS VARCHAR) AS reviewed_at, CAST(s.last_seen AS VARCHAR) AS last_seen,
                       s.suspended
                  FROM access_grant g LEFT JOIN access_seen s ON s.subject = g.subject
                 WHERE g.status = 'ACTIVE' ORDER BY g.subject, g.id""", p())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) g.get("ID")).longValue());
            m.put("subject", g.get("SUBJECT"));
            m.put("grant", g.get("KIND") + ":" + g.get("GRANT_VALUE"));
            m.put("grantedBy", g.get("GRANTED_BY"));
            m.put("grantedAt", g.get("GRANTED_AT"));
            m.put("lastSeen", g.get("LAST_SEEN"));
            m.put("suspended", Boolean.TRUE.equals(g.get("SUSPENDED")));
            boolean fits = !"ROLE".equals(g.get("KIND")) || knownRoles.isEmpty() || knownRoles.contains(String.valueOf(g.get("GRANT_VALUE")));
            m.put("inStructure", fits);
            m.put("reviewedBy", g.get("REVIEWED_BY"));
            m.put("reviewedAt", g.get("REVIEWED_AT"));
            out.add(m);
        }
        return out;
    }

    /** Confirm (keep) or revoke one grant. A reviewer may not review their own access. */
    public Map<String, Object> review(long grantId, boolean keep, String reviewer) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT subject FROM access_grant WHERE id = :id AND status = 'ACTIVE'",
                p().addValue("id", grantId));
        if (rows.isEmpty()) throw new IllegalArgumentException("no active grant " + grantId);
        String subject = String.valueOf(rows.get(0).get("SUBJECT"));
        if (subject.equals(reviewer)) throw new SecurityException("you cannot review your own access");
        jdbc.update("UPDATE access_grant SET status = :st, reviewed_by = :r, reviewed_at = :t WHERE id = :id",
                p().addValue("st", keep ? "ACTIVE" : "REVOKED").addValue("r", reviewer)
                        .addValue("t", Timestamp.from(clock.instant())).addValue("id", grantId));
        audit(reviewer, keep ? "ACCESS_CONFIRMED" : "ACCESS_REVOKED", subject, keep ? "ALLOW" : "DENY", Map.of("grantId", grantId));
        cache.remove(subject);
        return Map.of("id", grantId, "status", keep ? "ACTIVE" : "REVOKED");
    }

    // ---------------------------------------------------------------- helpers

    private void audit(String actor, String action, String resource, String decision, Map<String, Object> detail) {
        jdbc.update("""
                INSERT INTO audit_log (at, actor, action, resource, decision, detail_json)
                VALUES (:at, :a, :act, :res, :d, :j)""",
                p().addValue("at", Timestamp.from(clock.instant())).addValue("a", actor).addValue("act", action)
                        .addValue("res", resource).addValue("d", decision).addValue("j", json(detail)));
    }

    private String json(Object o) {
        try {
            String s = mapper.writeValueAsString(o);
            return s.length() > 2000 ? s.substring(0, 2000) : s;
        } catch (Exception e) {
            return "{}";
        }
    }

    private List<Map<String, String>> parse(String s) {
        try {
            return mapper.readValue(s, new TypeReference<>() { });
        } catch (Exception e) {
            return List.of();
        }
    }

    private static MapSqlParameterSource p() {
        return new MapSqlParameterSource();
    }

    /** What the register adds to (or takes from) a user's token. */
    public record Snapshot(Set<String> roles, Set<String> groupUnits, Set<String> ceesProducts, boolean suspended) {
        public static final Snapshot NONE = new Snapshot(Set.of(), Set.of(), Set.of(), false);

        public Set<String> joinRoles(Set<String> claimed) {
            return union(claimed, roles);
        }

        static Set<String> union(Set<String> a, Set<String> b) {
            return java.util.stream.Stream.concat(a.stream(), b.stream()).collect(Collectors.toUnmodifiableSet());
        }
    }

    private record Cached(Instant at, Snapshot snapshot) {
    }
}
