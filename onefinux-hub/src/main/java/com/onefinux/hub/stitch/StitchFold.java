package com.onefinux.hub.stitch;

import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventIngested;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.stream.StreamHub;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The stitch fold. Every event that carries an {@code instanceId} attribute updates one readiness key,
 * then the instance status is recomputed from the distinct keys:
 *
 * <ul>
 *   <li>any required key FAILED  → BLOCKED (named blocker), open an escalation</li>
 *   <li>any key still WAITING    → NOT_YET</li>
 *   <li>all required sources COMPLETED → READY</li>
 * </ul>
 *
 * A HELIX completion echoes the run id (the downstream "echo_ok" rule). On a notifiable transition we
 * persist one notification and push {@code outcome} + {@code notification} to every browser over SSE.
 * There is no product logic here — no {@code if (kit == FOBO)}.
 */
@Component
public class StitchFold {

    private static final Logger log = LoggerFactory.getLogger(StitchFold.class);

    private final StitchRepository repo;
    private final StreamHub stream;

    public StitchFold(StitchRepository repo, StreamHub stream) {
        this.repo = repo;
        this.stream = stream;
    }

    @EventListener
    public synchronized void onEvent(EventIngested ingested) {
        BusinessEvent ev = ingested.event();
        String instanceId = ev.attribute("instanceId");
        if (instanceId == null || instanceId.isBlank()) {
            return; // not a stitch fact — the YAML outcome engine handles legacy demos
        }
        String kitId = repo.kitOf(instanceId);
        if (kitId == null) {
            return; // unknown instance
        }
        repo.linkEventToInstance(ev.eventId(), instanceId);

        // Platform/workflow facts (sign-off, post, escalate) are audited but never fold a readiness key.
        if ("ONEFINUX".equalsIgnoreCase(ev.sourceSystem())) {
            return;
        }

        if ("HELIX".equalsIgnoreCase(ev.sourceSystem())) {
            if (ev.status() == EventStatus.COMPLETED) {
                repo.completeCommandRun(instanceId, ev.sourceKey());
                recompute(instanceId, ev.sourceKey());
            }
            return;
        }

        repo.upsertReadinessKey(instanceId, ev.sourceSystem(), ev.sourceKey(),
                keyStatus(ev.status()), ev.eventId());
        recompute(instanceId, null);
    }

    private void recompute(String instanceId, String echoedRunId) {
        String kitId = repo.kitOf(instanceId);
        String previous = repo.statusOf(instanceId);
        List<Map<String, Object>> keys = repo.readinessKeys(instanceId);
        List<String> required = repo.requiredSources(kitId);

        Map<String, Object> failed = keys.stream()
                .filter(k -> "FAILED".equals(k.get("keyStatus"))).findFirst().orElse(null);
        boolean anyWaiting = keys.stream().anyMatch(k -> "WAITING".equals(k.get("keyStatus")));

        java.util.Set<String> completedSources = keys.stream()
                .filter(k -> "COMPLETED".equals(k.get("keyStatus")))
                .map(k -> String.valueOf(k.get("sourceId")))
                .collect(java.util.stream.Collectors.toSet());
        boolean allRequiredCovered = completedSources.containsAll(required);

        String next;
        String blocker = null;
        if (failed != null) {
            next = "BLOCKED";
            blocker = failed.get("sourceId") + " " + failed.get("sourceKey") + " FAILED";
        } else if (allRequiredCovered && !anyWaiting) {
            next = "READY";
        } else {
            next = "NOT_YET";
        }

        boolean changed = !Objects.equals(previous, next);
        String runId = "READY".equals(next) ? echoedRunId : null;

        if (changed) {
            repo.updateInstanceStatus(instanceId, next, blocker, runId);
            log.info("stitch {} {} -> {}{}", instanceId, previous, next, blocker == null ? "" : " (" + blocker + ")");
            if ("BLOCKED".equals(next)) {
                repo.insertEscalation(escalationId(instanceId), instanceId, "SLA");
            }
            notifyTransition(instanceId, next, blocker);
            broadcastOutcome(instanceId);
        } else if (echoedRunId != null) {
            repo.updateInstanceStatus(instanceId, next, blocker, echoedRunId);
            broadcastOutcome(instanceId);
        }
    }

    private void notifyTransition(String instanceId, String status, String blocker) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst == null) {
            return;
        }
        String severity;
        String title;
        String message;
        String slice = String.valueOf(inst.get("sliceKey"));
        String kitId = String.valueOf(inst.get("kitId"));
        switch (status) {
            case "READY" -> {
                severity = "SUCCESS";
                title = kitId + " " + slice + " ready — sign off or post";
                message = "All required origins completed for instance " + instanceId + ".";
            }
            case "BLOCKED" -> {
                severity = "CRITICAL";
                title = kitId + " " + slice + " blocked — " + blocker;
                message = "Named key " + blocker + " on instance " + instanceId + ".";
            }
            case "CLEARED" -> {
                severity = "SUCCESS";
                title = kitId + " " + slice + " cleared";
                message = "Instance " + instanceId + " signed off.";
            }
            default -> {
                return; // NOT_YET etc. are not notifiable
            }
        }
        repo.insertNotification(severity, status, kitId, String.valueOf(inst.get("question")),
                String.valueOf(inst.get("groupUnitId")), title, message, "SSE",
                instanceId, String.valueOf(inst.get("groupUnitId")));
        stream.broadcast("notification", Map.of(
                "severity", severity, "transition", status, "title", title,
                "message", message, "instanceId", instanceId));
    }

    /** Push the fresh instance summary so open boards re-render without polling. */
    public void broadcastOutcome(String instanceId) {
        Map<String, Object> inst = repo.instance(instanceId);
        if (inst != null) {
            stream.broadcast("outcome", inst);
        }
    }

    private static String escalationId(String instanceId) {
        return instanceId.contains("R-2031") ? "ESC-19" : "ESC-" + Math.abs(instanceId.hashCode() % 100000);
    }

    private static String keyStatus(EventStatus status) {
        return switch (status) {
            case COMPLETED -> "COMPLETED";
            case FAILED -> "FAILED";
            case REVOKED -> "REVOKED";
            case STARTED -> "WAITING";
        };
    }
}
