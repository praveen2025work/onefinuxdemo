package com.onefinux.hub.stitch;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Orchestrates the human commands and onboarding writes on top of the stitch schema. Every command is
 * also published as a workflow event (through the hub) so it is audited and replayable.
 */
@Service
public class StitchService {

    private final StitchRepository repo;
    private final StitchFold fold;
    private final EventHubService hub;
    private final StreamHub stream;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final CurrentUser currentUser;

    public StitchService(StitchRepository repo, StitchFold fold, EventHubService hub,
                         StreamHub stream, ObjectMapper mapper, Clock clock, CurrentUser currentUser) {
        this.repo = repo;
        this.fold = fold;
        this.hub = hub;
        this.stream = stream;
        this.mapper = mapper;
        this.clock = clock;
        this.currentUser = currentUser;
    }

    /**
     * Fetch an instance the caller is entitled to see, or fail closed. Unknown and unentitled are the
     * same 404 so the API never reveals the existence of another tenant's instance.
     */
    private Map<String, Object> requireEntitledInstance(String instanceId) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst == null || !currentUser.entitlements().canSeeGroupUnit(str(inst, "groupUnitId"))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No such instance");
        }
        return inst;
    }

    /** Tenant-scoped instance list: rows are filtered to the caller's entitled group units. */
    public List<Map<String, Object>> instances(String groupUnit, String cobDate, String region, String status) {
        var ent = currentUser.entitlements();
        return repo.instances(groupUnit, cobDate, region, status).stream()
                .filter(row -> ent.canSeeGroupUnit(str(row, "groupUnitId")))
                .toList();
    }

    public Map<String, Object> context(int liveClients) {
        return Map.of(
                "businessDate", LocalDate.now(clock).toString(),
                "zone", clock.getZone().getId(),
                "groupUnits", repo.groupUnits(),
                "cobDates", repo.distinctCobDates().stream().map(m -> m.get("cobDate")).toList(),
                "regions", repo.distinctRegions().stream().map(m -> m.get("region")).toList(),
                "liveClients", liveClients);
    }

    public Map<String, Object> instanceDetail(String instanceId) {
        Map<String, Object> inst = repo.instance(instanceId);
        // Fail-closed: unknown or unentitled both return null -> the controller answers 404 (never 403),
        // so a caller cannot probe for instances outside their entitled group units.
        if (inst == null || !currentUser.entitlements().canSeeGroupUnit(str(inst, "groupUnitId"))) {
            return null;
        }
        return Map.of(
                "instance", inst,
                "keys", repo.readinessKeys(instanceId),
                "destinations", repo.destinationsForInstance(instanceId),
                "events", repo.eventsForInstance(instanceId));
    }

    public Map<String, Object> signoff(String instanceId) {
        Map<String, Object> inst = requireEntitledInstance(instanceId);
        if (!"READY".equals(inst.get("status"))) {
            throw new IllegalStateException("Only a READY instance can be signed off (was " + inst.get("status") + ")");
        }
        repo.updateInstanceStatus(instanceId, "CLEARED", null, null);
        String actor = currentUser.actor();
        repo.insertAudit(actor, "SIGN_OFF", instanceId, "OK", json(Map.of("from", inst.get("status"), "to", "CLEARED")));
        publishWorkflow("OUTCOME_SIGNED_OFF", instanceId, inst, Map.of("by", actor));
        repo.insertNotification("SUCCESS", "CLEARED", str(inst, "kitId"), str(inst, "question"),
                str(inst, "groupUnitId"), inst.get("kitId") + " " + inst.get("sliceKey") + " cleared",
                "Instance " + instanceId + " signed off by " + actor,
                "SSE", instanceId, str(inst, "groupUnitId"));
        stream.broadcast("notification", Map.of("severity", "INFO", "transition", "CLEARED",
                "title", inst.get("kitId") + " " + inst.get("sliceKey") + " cleared", "instanceId", instanceId));
        fold.broadcastOutcome(instanceId);
        return repo.instance(instanceId);
    }

    public Map<String, Object> post(String instanceId) {
        Map<String, Object> inst = requireEntitledInstance(instanceId);
        String runId = "RUN-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        repo.insertPendingCommandRun(runId, instanceId, "FAS_MOTIF");
        repo.insertAudit(currentUser.actor(), "POST", instanceId, "OK", json(Map.of("runId", runId, "dest", "FAS_MOTIF")));
        publishWorkflow("POST_REQUESTED", instanceId, inst, Map.of("runId", runId, "dest", "FAS_MOTIF"));
        fold.broadcastOutcome(instanceId);
        return Map.of("instanceId", instanceId, "runId", runId, "dest", "FAS_MOTIF", "echoPending", true);
    }

    public Map<String, Object> escalate(String instanceId, String reason) {
        Map<String, Object> inst = requireEntitledInstance(instanceId);
        String escalationId = "ESC-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        repo.insertEscalation(escalationId, instanceId, "HUMAN");
        repo.insertAudit(currentUser.actor(), "ESCALATE", instanceId, "OK",
                json(Map.of("escalationId", escalationId, "reason", reason == null ? "" : reason)));
        publishWorkflow("ESCALATION_RAISED", instanceId, inst,
                Map.of("escalationId", escalationId, "reason", reason == null ? "" : reason));
        repo.insertNotification("WARN", "ESCALATED", str(inst, "kitId"), str(inst, "question"),
                "platform.support", "Escalation " + escalationId + " raised on " + inst.get("sliceKey"),
                reason == null ? "Human escalation to RTB" : reason, "SSE", instanceId, str(inst, "groupUnitId"));
        stream.broadcast("notification", Map.of("severity", "WARN", "transition", "ESCALATED",
                "title", "Escalation " + escalationId + " raised", "instanceId", instanceId));
        return Map.of("escalationId", escalationId, "instanceId", instanceId, "status", "OPEN");
    }

    /**
     * Generic human action, gated by the kit's declared {@code userActions}. Known verbs keep their rich
     * behaviour; any other declared verb is handled generically — audited and published as a
     * {@code WORKFLOW_<VERB>} fact — so a new console capability is launched by adding it to the kit's
     * {@code userActions}, with no new endpoint or service method.
     */
    public Map<String, Object> action(String instanceId, String actionName, Map<String, Object> body) {
        String action = actionName == null ? "" : actionName.trim().toUpperCase();
        Map<String, Object> inst = requireEntitledInstance(instanceId);
        Set<String> allowed = allowedActions(repo.kitById(str(inst, "kitId")));
        if (!allowed.contains(action)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Action '" + action + "' is not offered by kit "
                    + str(inst, "kitId") + " (allowed: " + String.join(", ", allowed) + ")");
        }
        String reason = body == null ? null : str(body.get("reason"));
        return switch (action) {
            case "SIGN_OFF" -> signoff(instanceId);
            case "POST" -> post(instanceId);
            case "ESCALATE" -> escalate(instanceId, reason);
            default -> genericAction(action, instanceId, inst, body);
        };
    }

    private Map<String, Object> genericAction(String action, String instanceId, Map<String, Object> inst,
                                              Map<String, Object> body) {
        String actor = currentUser.actor();
        String note = body == null ? null : str(body.get("note"));
        repo.insertAudit(actor, action, instanceId, "OK", json(Map.of("note", note == null ? "" : note)));
        publishWorkflow("WORKFLOW_" + action, instanceId, inst, Map.of("by", actor, "note", note == null ? "" : note));
        String headline = inst.get("kitId") + " " + inst.get("sliceKey") + " " + action.toLowerCase();
        repo.insertNotification("INFO", action, str(inst, "kitId"), str(inst, "question"),
                str(inst, "groupUnitId"), headline,
                actor + " performed " + action + (note == null || note.isBlank() ? "" : ": " + note),
                "SSE", instanceId, str(inst, "groupUnitId"));
        stream.broadcast("notification", Map.of("severity", "INFO", "transition", action,
                "title", headline, "instanceId", instanceId));
        fold.broadcastOutcome(instanceId);
        return Map.of("instanceId", instanceId, "action", action, "status", "OK", "by", actor);
    }

    /** The verbs a kit offers, parsed from its {@code userActions} column (comma/space separated, upper-cased). */
    private Set<String> allowedActions(Map<String, Object> kit) {
        if (kit == null) {
            return Set.of();
        }
        String userActions = str(kit.get("userActions"));
        if (userActions == null || userActions.isBlank()) {
            return Set.of();
        }
        Set<String> verbs = new LinkedHashSet<>();
        for (String part : userActions.split("[,\\s]+")) {
            if (!part.isBlank()) {
                verbs.add(part.trim().toUpperCase());
            }
        }
        return verbs;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> registerKit(Map<String, Object> body) {
        String kitId = str(body, "kitId");
        Map<String, Object> kit = new java.util.HashMap<>();
        kit.put("kitId", kitId);
        kit.put("groupUnitId", str(body, "groupUnitId"));
        kit.put("domain", body.getOrDefault("domain", "Rev Acc"));
        kit.put("question", str(body, "question"));
        kit.put("renderer", body.getOrDefault("renderer", "NOTIFY_MILESTONE"));
        kit.put("userActions", body.getOrDefault("userActions", "ACKNOWLEDGE"));
        kit.put("ceesProduct", body.getOrDefault("ceesProduct", "product:" + kitId));
        kit.put("slaCutoff", body.get("slaCutoff"));
        repo.insertKit(kit);
        for (Object s : (List<Object>) body.getOrDefault("sources", List.of())) {
            Map<String, Object> src = (Map<String, Object>) s;
            repo.insertKitSource(kitId, str(src, "sourceId"), Boolean.TRUE.equals(src.getOrDefault("required", true)));
        }
        List<Object> dests = (List<Object>) body.getOrDefault("destinations", List.of());
        for (int i = 0; i < dests.size(); i++) {
            Map<String, Object> d = (Map<String, Object>) dests.get(i);
            int step = d.get("stepOrder") instanceof Number n ? n.intValue() : i + 1;
            repo.insertKitDestination(kitId, str(d, "destId"), step);
        }
        Object embed = body.get("embed");
        if (embed instanceof Map<?, ?> e) {
            repo.insertKitEmbed(kitId, str((Map<String, Object>) e, "url"),
                    str((Map<String, Object>) e, "allowedOrigin"), str((Map<String, Object>) e, "chrome"));
        }
        repo.insertAudit(currentUser.actor(), "REGISTER_KIT", kitId, "OK",
                json(Map.of("groupUnit", str(body, "groupUnitId"), "renderer", String.valueOf(kit.get("renderer")))));
        stream.broadcast("kit", Map.of("kitId", kitId, "status", "LIVE"));
        return Map.of("kitId", kitId, "status", "LIVE", "message", "Kit registered as data — no Java type added.");
    }

    public void reset() {
        repo.resetDemo();
        repo.insertAudit(currentUser.actor(), "RESET", "demo", "OK", null);
        stream.broadcast("reset", Map.of("at", clock.instant().toString()));
    }

    private void publishWorkflow(String eventType, String instanceId, Map<String, Object> inst,
                                 Map<String, Object> extra) {
        Map<String, Object> attrs = new java.util.HashMap<>(extra);
        attrs.put("instanceId", instanceId);
        LocalDate cob = LocalDate.parse(str(inst, "cobDate"));
        hub.publishInternal(eventType, str(inst, "sliceKey"), cob, str(inst, "region"),
                EventStatus.COMPLETED, attrs);
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String str(Map<String, Object> map, String key) {
        return str(map.get(key));
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
