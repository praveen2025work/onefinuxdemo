package com.onefinux.hub.propagation;

import com.onefinux.hub.stream.StreamHub;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Polls {@code event_outbox} and delivers PENDING rows to their subscriber. When a route has a
 * {@code target_url} the payload is POSTed over HTTP (a real cross-process hop to the "other system");
 * routes with no URL are delivered in-app over SSE only. Delivery is at-least-once — subscribers
 * de-duplicate on {@code event_id}. Every dispatch is broadcast as a {@code propagation} SSE event so
 * the monitoring screen updates live.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final PropagationRepository repo;
    private final StreamHub stream;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

    public OutboxRelay(PropagationRepository repo, StreamHub stream) {
        this.repo = repo;
        this.stream = stream;
    }

    @Scheduled(fixedDelay = 1500)
    @SchedulerLock(name = "outbox-relay", lockAtLeastFor = "PT1S", lockAtMostFor = "PT20S")
    public void dispatch() {
        List<Map<String, Object>> pending = repo.pending(50);
        for (Map<String, Object> row : pending) {
            String outboxId = str(row, "outboxId");
            String subscriber = str(row, "subscriber");
            String eventId = str(row, "eventId");
            String url = str(row, "targetUrl");
            String payload = str(row, "payload");
            try {
                if (url != null && !url.isBlank()) {
                    post(url, subscriber, payload);
                }
                repo.markDispatched(outboxId);
                stream.broadcast("propagation", Map.of(
                        "subscriber", subscriber, "eventId", eventId, "status", "DISPATCHED"));
            } catch (Exception e) {
                String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                repo.markFailed(outboxId, reason);
                log.warn("propagation to {} failed for {}: {}", subscriber, eventId, reason);
                stream.broadcast("propagation", Map.of(
                        "subscriber", subscriber, "eventId", eventId, "status", "FAILED"));
            }
        }
    }

    private void post(String url, String subscriber, String payload) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(3))
                .header("Content-Type", "application/json")
                .header("X-Onefinux-Subscriber", subscriber)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("sink returned HTTP " + response.statusCode());
        }
    }

    private static String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
