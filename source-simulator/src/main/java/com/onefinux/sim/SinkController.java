package com.onefinux.sim;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;

/**
 * A stand-in "other system" (Finance Store / P&L feed / archive). The hub's outbox relay POSTs each
 * propagated business fact here over HTTP, so cross-system propagation is a real network hop, not an
 * in-JVM mock. It de-duplicates on the CloudEvents envelope id and keeps the last N for inspection.
 */
@RestController
@RequestMapping("/sim/sink")
public class SinkController {

    private static final Logger log = LoggerFactory.getLogger(SinkController.class);
    private static final int MAX = 200;

    private final Deque<Map<String, Object>> received = new ArrayDeque<>();
    private final java.util.Set<String> seen = new java.util.HashSet<>();

    @PostMapping
    public synchronized Map<String, Object> receive(@RequestBody Map<String, Object> envelope,
                                                    @RequestHeader(value = "X-Onefinux-Subscriber", required = false) String subscriber) {
        String id = String.valueOf(envelope.get("id"));
        // At-least-once means the same subscriber may receive a fact twice; different subscribers are
        // different systems, so de-dupe per subscriber + event id.
        String dedupeKey = (subscriber == null ? "?" : subscriber) + ":" + id;
        boolean duplicate = !seen.add(dedupeKey);
        if (!duplicate) {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("receivedAt", Instant.now().toString());
            row.put("subscriber", subscriber == null ? "?" : subscriber);
            row.put("id", id);
            row.put("type", envelope.get("type"));
            row.put("source", envelope.get("source"));
            Object data = envelope.get("data");
            if (data instanceof Map<?, ?> d) {
                row.put("eventType", d.get("eventType"));
                row.put("sourceKey", d.get("sourceKey"));
                row.put("status", d.get("status"));
            }
            received.addFirst(row);
            while (received.size() > MAX) {
                received.removeLast();
            }
            log.info("sink received {} for {} (subscriber {})", id, row.get("eventType"), subscriber);
        }
        return Map.of("stored", !duplicate, "duplicate", duplicate, "count", received.size());
    }

    @GetMapping
    public synchronized Map<String, Object> list() {
        return Map.of("count", received.size(), "received", List.copyOf(received));
    }
}
