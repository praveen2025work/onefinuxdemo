package com.onefinux.hub.propagation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Monitoring + propagation API. Everything the console needs to watch received events, how they were
 * persisted, how they fan out to other systems (the outbox), and the audit trail.
 */
@RestController
@RequestMapping("/api/stitch/monitor")
public class MonitorController {

    private final MonitorService monitor;

    public MonitorController(MonitorService monitor) {
        this.monitor = monitor;
    }

    @GetMapping("/overview")
    public Map<String, Object> overview() {
        return monitor.overview();
    }

    @GetMapping("/outbox")
    public List<Map<String, Object>> outbox(@RequestParam(required = false) String status,
                                            @RequestParam(defaultValue = "100") int limit) {
        return monitor.outbox(status, limit);
    }

    @GetMapping("/routes")
    public List<Map<String, Object>> routes() {
        return monitor.routes();
    }

    @PostMapping("/outbox/{id}/retry")
    public Map<String, Object> retry(@PathVariable String id) {
        return Map.of("outboxId", id, "requeued", monitor.retry(id) > 0);
    }

    /** Dead-letter queue: outbox rows that exhausted their retries and await an operator redrive. */
    @GetMapping("/deadletters")
    public List<Map<String, Object>> deadLetters(@RequestParam(defaultValue = "100") int limit) {
        return monitor.deadLetters(limit);
    }

    @GetMapping("/events")
    public List<Map<String, Object>> tape(@RequestParam(defaultValue = "40") int limit) {
        return monitor.tape(limit);
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit(@RequestParam(defaultValue = "50") int limit) {
        return monitor.audit(limit);
    }
}
