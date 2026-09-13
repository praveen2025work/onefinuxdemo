package com.onefinux.hub.propagation;

import com.onefinux.hub.stitch.StitchRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Read model for the monitoring screen. Composes event-tape metrics (from the stitch/event store) with
 * the propagation outbox and routes so one call powers the "received / persisted / propagated / audited"
 * dashboard.
 */
@Service
public class MonitorService {

    private final StitchRepository stitch;
    private final PropagationRepository propagation;

    public MonitorService(StitchRepository stitch, PropagationRepository propagation) {
        this.stitch = stitch;
        this.propagation = propagation;
    }

    public Map<String, Object> overview() {
        List<Map<String, Object>> routes = propagation.routes();
        return Map.of(
                "events", Map.of(
                        "total", stitch.eventTotal(),
                        "byStatus", stitch.eventCountsByStatus(),
                        "bySource", stitch.eventCountsBySource()),
                "deadLetters", stitch.deadLetterDepth(),
                "watermarks", stitch.watermarks(),
                "outbox", propagation.outboxCounts(),
                "commands", stitch.commandStats(),
                "routeCount", routes.size(),
                "subscribers", routes.stream().map(r -> r.get("subscriber")).distinct().toList());
    }

    public List<Map<String, Object>> outbox(String status, int limit) {
        return propagation.outbox(status, limit);
    }

    public List<Map<String, Object>> routes() {
        return propagation.routes();
    }

    public int retry(String outboxId) {
        return propagation.retry(outboxId);
    }

    public List<Map<String, Object>> deadLetters(int limit) {
        return propagation.deadLetters(limit);
    }

    public List<Map<String, Object>> tape(int limit) {
        return stitch.recentEvents(limit);
    }

    public List<Map<String, Object>> audit(int limit) {
        return stitch.auditLog(limit);
    }
}
