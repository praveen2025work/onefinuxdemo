package com.onefinux.hub.ux;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
import java.util.regex.Pattern;

/**
 * The One UX platform API: usage telemetry (app opens, view launches, component use, experiment exposure and
 * conversion, feedback), the reports built on it, A-B assignments, team recommendations, and a user's saved layout
 * and settings with team templates. The actor is always the authenticated user; a team is only recorded when the
 * user is entitled to that group unit.
 */
@RestController
public class UxController {

    static final Set<String> TYPES = Set.of("APP_OPEN", "VIEW_OPEN", "COMPONENT_USE", "SEARCH", "ASSIST", "EXPOSURE",
            "CONVERSION", "FEEDBACK");
    static final Set<String> PREF_KEYS = Set.of("desks", "grids", "settings");
    /** Team templates: a desk layout, a shared GridSpec, or a finance dashboard blueprint. */
    static final Set<String> TEMPLATE_KINDS = Set.of("desk", "grid", "finance");
    static final Pattern TEXT = Pattern.compile("^[\\p{L}\\p{N} _.:/|?=&%#,()'+@-]{1,120}$");
    static final int MAX_BATCH = 50;
    static final int MAX_DETAIL = 2000;
    static final int MAX_PREF = 200_000;
    static final int PER_MINUTE = 600;

    private final UxRepository repo;
    private final Experiments experiments;
    private final UxProperties props;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, long[]> rate = new ConcurrentHashMap<>();

    public UxController(UxRepository repo, Experiments experiments, UxProperties props, CurrentUser currentUser, Clock clock) {
        this.repo = repo;
        this.experiments = experiments;
        this.props = props;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- telemetry

    /** A batch of usage events from one console. Unknown types and oversize fields are refused, not truncated. */
    @PostMapping("/api/ux/events")
    public Map<String, Object> events(@RequestBody List<UxEvent> batch) {
        if (batch == null || batch.isEmpty()) return Map.of("accepted", 0);
        if (batch.size() > MAX_BATCH) throw bad("at most " + MAX_BATCH + " events per batch");
        Entitlements ent = currentUser.entitlements();
        if ("anonymous".equals(ent.subject())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "sign in first");
        if (!allow(ent.subject(), batch.size())) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "slow down");
        Instant now = clock.instant();
        int n = 0;
        for (UxEvent e : batch) {
            if (e == null || e.type() == null || !TYPES.contains(e.type())) throw bad("type must be one of " + TYPES);
            String team = e.team() != null && ent.canSeeGroupUnit(e.team()) ? text(e.team(), "team") : null;
            String detail = e.detail() == null || e.detail().isNull() ? null : e.detail().toString();
            if (detail != null && detail.length() > MAX_DETAIL) throw bad("detail is limited to " + MAX_DETAIL + " characters");
            repo.insertEvent(now, ent.subject(), team, e.type(), text(e.app(), "app"), text(e.component(), "component"),
                    text(e.variant(), "variant"), detail);
            n++;
        }
        return Map.of("accepted", n);
    }

    private boolean allow(String subject, int count) {
        long minute = clock.millis() / 60_000;
        long[] slot = rate.compute(subject, (k, v) -> v == null || v[0] != minute ? new long[]{minute, 0} : v);
        synchronized (slot) {
            slot[1] += count;
            return slot[1] <= PER_MINUTE;
        }
    }

    /** Usage report: app opens, component use and the access log over the last {@code days}, optionally for one team. */
    @GetMapping("/api/ux/usage")
    public Map<String, Object> usage(@RequestParam(defaultValue = "30") int days, @RequestParam(required = false) String team) {
        Entitlements ent = currentUser.entitlements();
        if (team != null && !ent.canSeeGroupUnit(team)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no such team");
        if (team == null && !ent.superuser() && !ent.canAct("ACCESS_REVIEW")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "pick a team you belong to");
        }
        Instant since = clock.instant().minus(Duration.ofDays(Math.max(1, Math.min(days, 365))));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("apps", repo.appUsage(since, team));
        m.put("components", repo.componentUsage(since, team));
        m.put("access", team == null ? repo.accessLog(since, 200) : List.of());
        return m;
    }

    @GetMapping("/api/ux/feedback")
    public List<Map<String, Object>> feedback(@RequestParam(defaultValue = "100") int limit) {
        return repo.feedback(Math.max(1, Math.min(limit, 500))).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>(r);
            Object d = parse(String.valueOf(r.get("detail")));
            m.put("text", d instanceof JsonNode n && n.hasNonNull("text") ? n.get("text").asText() : "");
            m.remove("detail");
            return m;
        }).toList();
    }

    /** What the console needs at start: other applications' search sources and this user's experiment variants. */
    @GetMapping("/api/ux/config")
    public Map<String, Object> config() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("searchProviders", props.searchProviders());
        m.put("assignments", experiments.assignments(currentUser.actor()));
        if (props.chatbot().enabled()) m.put("chatbot", props.chatbot());
        return m;
    }

    // ---------------------------------------------------------------- experiments

    /** This user's variant for each running experiment. */
    @GetMapping("/api/ux/experiments")
    public Map<String, Object> assignments() {
        return Map.of("assignments", experiments.assignments(currentUser.actor()));
    }

    /** Every experiment with distinct users exposed and converted per variant. */
    @GetMapping("/api/ux/experiments/results")
    public List<Map<String, Object>> results() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (UxProperties.Experiment e : props.experiments()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.id());
            m.put("description", e.description());
            m.put("enabled", e.enabled());
            m.put("conversion", e.conversion());
            m.put("variants", repo.experimentResults(e.id()));
            out.add(m);
        }
        return out;
    }

    // ---------------------------------------------------------------- recommendations

    /** What teammates in this group unit use that you have not opened lately. */
    @GetMapping("/api/ux/recommendations")
    public List<Map<String, Object>> recommendations(@RequestParam String team) {
        Entitlements ent = currentUser.entitlements();
        if (!ent.canSeeGroupUnit(team)) return List.of();
        Instant now = clock.instant();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : repo.teamPicks(ent.subject(), team, now.minus(Duration.ofDays(30)),
                now.minus(Duration.ofDays(14)), 5)) {
            Map<String, Object> m = new LinkedHashMap<>(row);
            long mates = ((Number) row.get("teammates")).longValue();
            m.put("why", mates + (mates == 1 ? " colleague" : " colleagues") + " in " + team + " opened it this month");
            out.add(m);
        }
        return out;
    }

    // ---------------------------------------------------------------- preferences

    /** A saved preference (desks, grids, settings) for the signed-in user; follows them to any browser. */
    @GetMapping("/api/prefs/{key}")
    public Map<String, Object> pref(@PathVariable String key) {
        prefKey(key);
        return repo.pref(currentUser.actor(), key)
                .<Map<String, Object>>map(r -> Map.of("key", key, "value", parse(String.valueOf(r.get("json"))), "updatedAt", r.get("updatedAt")))
                .orElse(Map.of("key", key));
    }

    @PutMapping("/api/prefs/{key}")
    public Map<String, Object> savePref(@PathVariable String key, @RequestBody JsonNode value) {
        prefKey(key);
        String json = value == null ? "null" : value.toString();
        if (json.length() > MAX_PREF) throw bad("preference is limited to " + MAX_PREF + " characters");
        Instant now = clock.instant();
        repo.savePref(currentUser.actor(), key, json, now);
        return Map.of("key", key, "updatedAt", now.toString());
    }

    private static void prefKey(String key) {
        if (!PREF_KEYS.contains(key)) throw bad("preference key must be one of " + PREF_KEYS);
    }

    // ---------------------------------------------------------------- team templates

    @GetMapping("/api/templates")
    public List<Map<String, Object>> templates(@RequestParam String team, @RequestParam(required = false) String kind) {
        if (!currentUser.entitlements().canSeeGroupUnit(team)) return List.of();
        if (kind != null && !TEMPLATE_KINDS.contains(kind)) throw bad("kind is desk, grid or finance");
        return repo.templates(team, kind).stream().map(this::templateRow).toList();
    }

    /**
     * GridSpec catalogue for a group unit: unit-shared templates (kind=grid) and this user's saved grids
     * (prefs). Platform built-ins stay in the console; the hub never invents a product-specific list.
     * Unentitled group units return empty lists (fail-closed), never 403 with a leak.
     */
    @GetMapping("/api/grids")
    public Map<String, Object> grids(@RequestParam String groupUnit) {
        Entitlements ent = currentUser.entitlements();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("groupUnit", groupUnit);
        if (!ent.canSeeGroupUnit(groupUnit)) {
            out.put("unit", List.of());
            out.put("mine", List.of());
            return out;
        }
        out.put("unit", repo.templates(groupUnit, "grid").stream().map(this::templateRow).toList());
        List<Object> mine = List.of();
        var pref = repo.pref(ent.subject(), "grids");
        if (pref.isPresent()) {
            Object value = parse(String.valueOf(pref.get().get("json")));
            if (value instanceof JsonNode node && node.isObject() && node.has("state") && node.get("state").isArray()) {
                mine = new ArrayList<>();
                node.get("state").forEach(mine::add);
            } else if (value instanceof JsonNode node && node.isArray()) {
                mine = new ArrayList<>();
                node.forEach(mine::add);
            }
        }
        out.put("mine", mine);
        return out;
    }

    /** Share a desk, grid or finance dashboard with the team. Anyone in the team can start from it; only its author or an admin removes it. */
    @PostMapping("/api/templates")
    public Map<String, Object> share(@RequestBody Template body) {
        if (body == null || body.team() == null || body.name() == null || body.json() == null) throw bad("team, name and json are required");
        if (!TEMPLATE_KINDS.contains(body.kind())) throw bad("kind is desk, grid or finance");
        if (!currentUser.entitlements().canSeeGroupUnit(body.team())) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no such team");
        String json = body.json().toString();
        if (json.length() > MAX_PREF) throw bad("template is limited to " + MAX_PREF + " characters");
        String id = "TPL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        repo.insertTemplate(id, body.team(), body.kind(), text(body.name(), "name"), json, currentUser.actor(), clock.instant());
        return Map.of("id", id);
    }

    @DeleteMapping("/api/templates/{id}")
    public Map<String, Object> unshare(@PathVariable String id) {
        Map<String, Object> t = repo.template(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no such template"));
        Entitlements ent = currentUser.entitlements();
        if (!ent.subject().equals(t.get("createdBy")) && !ent.superuser()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only its author removes a team template");
        }
        repo.deleteTemplate(id);
        return Map.of("deleted", id);
    }

    @Scheduled(cron = "0 30 2 * * *")
    public void purgeOldEvents() {
        repo.purgeBefore(clock.instant().minus(Duration.ofDays(props.retentionDays())));
    }

    // ---------------------------------------------------------------- helpers

    private Map<String, Object> templateRow(Map<String, Object> r) {
        Map<String, Object> m = new LinkedHashMap<>(r);
        m.put("json", parse(String.valueOf(r.get("json"))));
        return m;
    }

    private Object parse(String json) {
        try {
            return mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private static String text(String value, String name) {
        if (value == null || value.isBlank()) return null;
        if (!TEXT.matcher(value).matches()) throw bad(name + " is limited to 120 plain characters");
        return value;
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    public record UxEvent(String type, String app, String component, String variant, String team, JsonNode detail) {
    }

    public record Template(String team, String kind, String name, JsonNode json) {
    }
}
