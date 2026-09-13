package com.onefinux.hub.stitch;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

    public StitchService(StitchRepository repo, StitchFold fold, EventHubService hub,
                         StreamHub stream, ObjectMapper mapper, Clock clock) {
        this.repo = repo;
        this.fold = fold;
        this.hub = hub;
        this.stream = stream;
        this.mapper = mapper;
        this.clock = clock;
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
        if (inst == null) {
            return null;
        }
        return Map.of(
                "instance", inst,
                "keys", repo.readinessKeys(instanceId),
                "destinations", repo.destinationsForInstance(instanceId),
                "events", repo.eventsForInstance(instanceId));
    }

    public Map<String, Object> signoff(String instanceId, String user) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst == null) {
            throw new IllegalArgumentException("Unknown instance " + instanceId);
        }
        if (!"READY".equals(inst.get("status"))) {
            throw new IllegalStateException("Only a READY instance can be signed off (was " + inst.get("status") + ")");
        }
        repo.updateInstanceStatus(instanceId, "CLEARED", null, null);
        publishWorkflow("OUTCOME_SIGNED_OFF", instanceId, inst, Map.of("by", user == null ? "praveen.kumar" : user));
        repo.insertNotification("SUCCESS", "CLEARED", str(inst, "kitId"), str(inst, "question"),
                str(inst, "groupUnitId"), inst.get("kitId") + " " + inst.get("sliceKey") + " cleared",
                "Instance " + instanceId + " signed off by " + (user == null ? "praveen.kumar" : user),
                "SSE", instanceId, str(inst, "groupUnitId"));
        stream.broadcast("notification", Map.of("severity", "INFO", "transition", "CLEARED",
                "title", inst.get("kitId") + " " + inst.get("sliceKey") + " cleared", "instanceId", instanceId));
        fold.broadcastOutcome(instanceId);
        return repo.instance(instanceId);
    }

    public Map<String, Object> post(String instanceId) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst == null) {
            throw new IllegalArgumentException("Unknown instance " + instanceId);
        }
        String runId = "RUN-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        repo.insertPendingCommandRun(runId, instanceId, "FAS_MOTIF");
        publishWorkflow("POST_REQUESTED", instanceId, inst, Map.of("runId", runId, "dest", "FAS_MOTIF"));
        fold.broadcastOutcome(instanceId);
        return Map.of("instanceId", instanceId, "runId", runId, "dest", "FAS_MOTIF", "echoPending", true);
    }

    public Map<String, Object> escalate(String instanceId, String reason) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst == null) {
            throw new IllegalArgumentException("Unknown instance " + instanceId);
        }
        String escalationId = "ESC-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        repo.insertEscalation(escalationId, instanceId, "HUMAN");
        publishWorkflow("ESCALATION_RAISED", instanceId, inst,
                Map.of("escalationId", escalationId, "reason", reason == null ? "" : reason));
        repo.insertNotification("WARN", "ESCALATED", str(inst, "kitId"), str(inst, "question"),
                "platform.support", "Escalation " + escalationId + " raised on " + inst.get("sliceKey"),
                reason == null ? "Human escalation to RTB" : reason, "SSE", instanceId, str(inst, "groupUnitId"));
        stream.broadcast("notification", Map.of("severity", "WARN", "transition", "ESCALATED",
                "title", "Escalation " + escalationId + " raised", "instanceId", instanceId));
        return Map.of("escalationId", escalationId, "instanceId", instanceId, "status", "OPEN");
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
        stream.broadcast("kit", Map.of("kitId", kitId, "status", "LIVE"));
        return Map.of("kitId", kitId, "status", "LIVE", "message", "Kit registered as data — no Java type added.");
    }

    public Map<String, Object> saveView(Map<String, Object> body) {
        String viewId = body.get("viewId") != null ? str(body, "viewId")
                : "VW-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String groupUnit = str(body, "groupUnitId");
        String datasetId = body.get("datasetId") != null ? str(body, "datasetId") : repo.firstDatasetId(groupUnit);
        String widget = body.getOrDefault("widget", "GRID").toString();
        String fieldMap = json(body.getOrDefault("fieldMap", body));
        String ceesReport = body.getOrDefault("ceesReport", "report:" + viewId).toString();
        repo.insertView(viewId, groupUnit, datasetId, widget, fieldMap, ceesReport);
        return Map.of("viewId", viewId, "status", "SAVED");
    }

    public void reset() {
        repo.resetDemo();
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
        Object v = map.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
