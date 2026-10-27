package com.onefinux.hub.writeback;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.activity.ActivityFeed;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Tabular write-back. A grid submits its edited cells as one change set; with maker-checker a different user who
 * holds WRITEBACK_APPROVE approves it before it is applied. Applying means calling the spec's named target (the
 * system that owns the data) and, either way, recording the values so every grid on that spec shows them. Submit,
 * approve, reject and apply are audited and pushed to every desk as activity.
 */
@Service
public class WritebackService {

    static final Pattern ID = Pattern.compile("^[A-Za-z0-9_:.-]{1,80}$");
    static final int MAX_CHANGES = 500;
    static final int MAX_VALUE = 400;

    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentUser currentUser;
    private final ActivityFeed activity;
    private final WritebackProperties props;
    private final RestClient rest;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();

    public WritebackService(NamedParameterJdbcTemplate jdbc, CurrentUser currentUser, ActivityFeed activity,
                            WritebackProperties props, RestClient.Builder rest, Clock clock) {
        this.jdbc = jdbc;
        this.currentUser = currentUser;
        this.activity = activity;
        this.props = props;
        this.rest = rest.build();
        this.clock = clock;
    }

    public Map<String, Object> submit(String gridId, Submission s) {
        id(gridId, "grid id");
        Entitlements ent = currentUser.entitlements();
        if (!ent.canAct("WRITEBACK") || ent.suspended() || "anonymous".equals(ent.subject())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow WRITEBACK");
        }
        if (s == null || s.changes() == null || s.changes().isEmpty()) throw bad("no changes to submit");
        if (s.changes().size() > MAX_CHANGES) throw bad("at most " + MAX_CHANGES + " changes per submission");
        for (Change c : s.changes()) {
            if (c == null) throw bad("empty change");
            id(c.key(), "row key");
            id(c.column(), "column");
            if (len(c.before()) > MAX_VALUE || len(c.after()) > MAX_VALUE) throw bad("values are limited to " + MAX_VALUE + " characters");
        }
        if (s.target() != null && !props.targets().containsKey(s.target())) throw bad("unknown write-back target " + s.target());
        boolean checker = !"none".equals(s.approval());
        String setId = "WB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Instant now = clock.instant();
        jdbc.update("""
                INSERT INTO writeback_change_set (id, grid_id, grid_title, status, maker, approval, context_json, changes_json,
                                                  reason, created_at)
                VALUES (:id, :g, :t, 'PENDING', :m, :a, :ctx, :ch, :r, :at)""",
                p().addValue("id", setId).addValue("g", gridId).addValue("t", cut(s.title(), 160)).addValue("m", ent.subject())
                        .addValue("a", checker ? "maker-checker" : "none")
                        .addValue("ctx", json(Map.of("target", s.target() == null ? "" : s.target(),
                                "context", s.context() == null ? Map.of() : s.context())))
                        .addValue("ch", json(s.changes())).addValue("r", cut(s.reason(), 400)).addValue("at", Timestamp.from(now)));
        audit(ent.subject(), "WRITEBACK_SUBMITTED", setId, Map.of("grid", gridId, "changes", s.changes().size()));
        if (!checker) return apply(setId, ent.subject());
        publish("WRITEBACK_SUBMITTED", ent.subject(), s.changes().size() + " change(s) to " + label(s.title(), gridId)
                + " await a checker", s.context());
        return Map.of("id", setId, "status", "PENDING");
    }

    public Map<String, Object> decide(String setId, boolean approve, String reason) {
        Entitlements ent = currentUser.entitlements();
        if (!ent.canAct("WRITEBACK_APPROVE") || ent.suspended()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow WRITEBACK_APPROVE");
        }
        Map<String, Object> set = load(setId);
        if (!"PENDING".equals(set.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, setId + " is " + set.get("status"));
        if (ent.subject().equals(set.get("maker"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "maker-checker: a different user must approve your change set");
        }
        if (!approve) {
            jdbc.update("UPDATE writeback_change_set SET status = 'REJECTED', checker = :c, decided_at = :t, reason = :r WHERE id = :id",
                    p().addValue("c", ent.subject()).addValue("t", Timestamp.from(clock.instant())).addValue("r", cut(reason, 400))
                            .addValue("id", setId));
            audit(ent.subject(), "WRITEBACK_REJECTED", setId, Map.of("reason", reason == null ? "" : reason));
            publish("WRITEBACK_REJECTED", ent.subject(), "Rejected " + label((String) set.get("gridTitle"), (String) set.get("gridId"))
                    + " change set " + setId, null);
            return Map.of("id", setId, "status", "REJECTED");
        }
        return apply(setId, ent.subject());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> apply(String setId, String checker) {
        Map<String, Object> set = load(setId);
        Map<String, Object> ctx = (Map<String, Object>) set.getOrDefault("context", Map.of());
        String target = String.valueOf(ctx.getOrDefault("target", ""));
        String applied = "recorded";
        if (!target.isBlank()) {
            WritebackProperties.Target t = props.targets().get(target);
            if (t == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "write-back target " + target + " is not configured");
            try {
                rest.post().uri(t.url()).contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("changeSet", setId, "grid", set.get("gridId"), "maker", set.get("maker"),
                                "checker", checker, "changes", set.get("changes")))
                        .retrieve().toBodilessEntity();
                applied = "applied in " + target;
            } catch (Exception e) {
                audit(checker, "WRITEBACK_FAILED", setId, Map.of("target", target, "error", String.valueOf(e.getMessage())));
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "the owning system refused the change: " + e.getMessage());
            }
        }
        jdbc.update("UPDATE writeback_change_set SET status = 'APPLIED', checker = :c, decided_at = :t WHERE id = :id",
                p().addValue("c", checker).addValue("t", Timestamp.from(clock.instant())).addValue("id", setId));
        audit(checker, "WRITEBACK_APPLIED", setId, Map.of("grid", set.get("gridId"), "how", applied));
        int n = ((List<?>) set.get("changes")).size();
        publish("WRITEBACK_APPLIED", checker, n + " change(s) to " + label((String) set.get("gridTitle"), (String) set.get("gridId"))
                + " " + applied + (checker.equals(set.get("maker")) ? "" : " (maker " + set.get("maker") + ")"),
                (Map<String, Object>) ctx.get("context"));
        return Map.of("id", setId, "status", "APPLIED", "how", applied);
    }

    /** Change sets for one grid (or every grid), newest first. */
    public List<Map<String, Object>> list(String gridId, String status) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : jdbc.queryForList("""
                SELECT id, grid_id, grid_title, status, maker, checker, approval, context_json,
                       CAST(changes_json AS VARCHAR(1000000)) AS changes_json, reason,
                       CAST(created_at AS VARCHAR) AS created_at, CAST(decided_at AS VARCHAR) AS decided_at
                  FROM writeback_change_set
                 WHERE (:g IS NULL OR grid_id = :g) AND (:s IS NULL OR status = :s)
                 ORDER BY created_at DESC LIMIT 200""",
                p().addValue("g", gridId).addValue("s", status == null ? null : status.toUpperCase()))) {
            out.add(row(r));
        }
        return out;
    }

    /** Applied values per row: {rowKey: {column: value}}, oldest first so the latest change wins. */
    public Map<String, Map<String, Object>> overlay(String gridId) {
        Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        for (Map<String, Object> r : jdbc.queryForList("""
                SELECT CAST(changes_json AS VARCHAR(1000000)) AS changes_json FROM writeback_change_set
                 WHERE grid_id = :g AND status = 'APPLIED' ORDER BY decided_at""", p().addValue("g", gridId))) {
            for (Change c : changes(String.valueOf(r.get("CHANGES_JSON")))) {
                out.computeIfAbsent(c.key(), k -> new LinkedHashMap<>()).put(c.column(), c.after());
            }
        }
        return out;
    }

    private Map<String, Object> load(String setId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, grid_id, grid_title, status, maker, checker, approval, context_json,
                       CAST(changes_json AS VARCHAR(1000000)) AS changes_json, reason,
                       CAST(created_at AS VARCHAR) AS created_at, CAST(decided_at AS VARCHAR) AS decided_at
                  FROM writeback_change_set WHERE id = :id""", p().addValue("id", setId));
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no change set " + setId);
        return row(rows.get(0));
    }

    private Map<String, Object> row(Map<String, Object> r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.get("ID"));
        m.put("gridId", r.get("GRID_ID"));
        m.put("gridTitle", r.get("GRID_TITLE"));
        m.put("status", r.get("STATUS"));
        m.put("maker", r.get("MAKER"));
        m.put("checker", r.get("CHECKER"));
        m.put("approval", r.get("APPROVAL"));
        m.put("context", parseMap(String.valueOf(r.get("CONTEXT_JSON"))));
        m.put("changes", changes(String.valueOf(r.get("CHANGES_JSON"))));
        m.put("reason", r.get("REASON"));
        m.put("createdAt", r.get("CREATED_AT"));
        m.put("decidedAt", r.get("DECIDED_AT"));
        return m;
    }

    private void publish(String action, String actor, String summary, Map<String, Object> context) {
        Map<String, Object> c = context == null ? Map.of() : context;
        activity.publish(new ActivityFeed.Activity(action, actor, summary, str(c.get("outcomeId")), str(c.get("kitId")),
                null, str(c.get("groupUnit")), str(c.get("cobDate")), str(c.get("region")), "writeback"));
    }

    private void audit(String actor, String action, String resource, Map<String, Object> detail) {
        jdbc.update("""
                INSERT INTO audit_log (at, actor, action, resource, decision, detail_json)
                VALUES (:at, :a, :act, :res, 'OK', :j)""",
                p().addValue("at", Timestamp.from(clock.instant())).addValue("a", actor).addValue("act", action)
                        .addValue("res", resource).addValue("j", cut(json(detail), 2000)));
    }

    private List<Change> changes(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() { });
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> parseMap(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() { });
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String json(Object o) {
        try {
            return mapper.writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String label(String title, String gridId) {
        return title == null || title.isBlank() ? gridId : title;
    }

    private static String str(Object o) {
        return o == null || String.valueOf(o).isBlank() ? null : String.valueOf(o);
    }

    private static int len(Object o) {
        return o == null ? 0 : String.valueOf(o).length();
    }

    private static String cut(String s, int max) {
        return s == null ? null : s.length() > max ? s.substring(0, max) : s;
    }

    private static void id(String v, String name) {
        if (v == null || !ID.matcher(v).matches()) throw bad(name + " must be 1-80 of A-Z a-z 0-9 _ : . -");
    }

    private static MapSqlParameterSource p() {
        return new MapSqlParameterSource();
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    /** One edited cell: the row key, the column, the value before and after. */
    public record Change(String key, String column, Object before, Object after) {
    }

    public record Submission(String title, String approval, String target, String reason, Map<String, Object> context,
                             List<Change> changes) {
    }
}
