package com.onefinux.hub.propagation;

import com.onefinux.hub.stream.StreamHub;
import io.micrometer.core.instrument.MeterRegistry;
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
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Polls {@code event_outbox} and delivers due rows to their subscriber. Delivery is at-least-once —
 * subscribers de-duplicate on {@code event_id}. Resiliency features:
 *
 * <ul>
 *   <li><b>Exponential backoff</b>: a failed row is retried automatically, but only after a growing
 *       delay ({@code next_attempt_at}), capped at {@link #MAX_BACKOFF}.</li>
 *   <li><b>Dead-letter queue</b>: after {@link #MAX_ATTEMPTS} failures a row becomes {@code DEAD} and is
 *       no longer retried automatically — an operator redrives it once the subscriber is healthy.</li>
 *   <li><b>Per-subscriber circuit breaker</b>: after {@link #BREAKER_THRESHOLD} consecutive failures to a
 *       subscriber the circuit opens for {@link #BREAKER_COOLDOWN}, so one down system does not burn the
 *       relay retrying every queued row against it every tick.</li>
 * </ul>
 *
 * Runs under a ShedLock so only one node dispatches; every outcome is emitted as a {@code propagation}
 * SSE event and counted in Micrometer.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    static final int MAX_ATTEMPTS = 4;
    static final Duration BASE_BACKOFF = Duration.ofSeconds(2);
    static final Duration MAX_BACKOFF = Duration.ofSeconds(60);
    static final int BREAKER_THRESHOLD = 3;
    static final Duration BREAKER_COOLDOWN = Duration.ofSeconds(5);

    private final PropagationRepository repo;
    private final StreamHub stream;
    private final MeterRegistry metrics;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final Map<String, Breaker> breakers = new ConcurrentHashMap<>();

    public OutboxRelay(PropagationRepository repo, StreamHub stream, MeterRegistry metrics) {
        this.repo = repo;
        this.stream = stream;
        this.metrics = metrics;
    }

    @Scheduled(fixedDelay = 1500)
    @SchedulerLock(name = "outbox-relay", lockAtLeastFor = "PT1S", lockAtMostFor = "PT20S")
    public void dispatch() {
        List<Map<String, Object>> due = repo.pending(50);
        for (Map<String, Object> row : due) {
            String outboxId = str(row, "outboxId");
            String subscriber = str(row, "subscriber");
            String eventId = str(row, "eventId");
            String url = str(row, "targetUrl");
            String payload = str(row, "payload");
            int attempts = intval(row, "attempts");

            Breaker breaker = breakers.computeIfAbsent(subscriber, s -> new Breaker());
            if (breaker.isOpen()) {
                continue;   // subscriber is unhealthy; leave the row due and try again after cooldown
            }
            try {
                if (url != null && !url.isBlank()) {
                    post(url, subscriber, payload);
                }
                repo.markDispatched(outboxId);
                breaker.recordSuccess();
                metrics.counter("onefinux.propagation.dispatched", "subscriber", subscriber).increment();
                stream.broadcast("propagation", Map.of(
                        "subscriber", subscriber, "eventId", eventId, "status", "DISPATCHED"));
            } catch (Exception e) {
                String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                int newAttempts = attempts + 1;
                boolean dead = newAttempts >= MAX_ATTEMPTS;
                repo.recordFailure(outboxId, reason, dead, nextAttempt(newAttempts));
                breaker.recordFailure();
                if (dead) {
                    metrics.counter("onefinux.propagation.dead", "subscriber", subscriber).increment();
                    log.warn("propagation to {} DEAD-lettered for {} after {} attempts: {}",
                            subscriber, eventId, newAttempts, reason);
                } else {
                    metrics.counter("onefinux.propagation.failed", "subscriber", subscriber).increment();
                    log.warn("propagation to {} failed for {} (attempt {}/{}): {}",
                            subscriber, eventId, newAttempts, MAX_ATTEMPTS, reason);
                }
                stream.broadcast("propagation", Map.of(
                        "subscriber", subscriber, "eventId", eventId, "status", dead ? "DEAD" : "FAILED"));
            }
        }
    }

    /** Exponential backoff with a ceiling: 2s, 4s, 8s, 16s, … capped at MAX_BACKOFF. */
    private Instant nextAttempt(int attempts) {
        long millis = Math.min(BASE_BACKOFF.toMillis() * (1L << Math.min(attempts, 20)), MAX_BACKOFF.toMillis());
        return Instant.now().plusMillis(millis);
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

    private static int intval(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    /**
     * Per-subscriber circuit breaker. Opens after {@link #BREAKER_THRESHOLD} consecutive failures and
     * stays open for {@link #BREAKER_COOLDOWN}. After the cooldown it is half-open: the failure counter
     * resets once so a fresh trial batch is allowed; if those trials keep failing it re-opens.
     */
    private static final class Breaker {
        private int consecutiveFailures;
        private Instant openUntil = Instant.EPOCH;

        synchronized boolean isOpen() {
            return Instant.now().isBefore(openUntil);
        }

        synchronized void recordSuccess() {
            consecutiveFailures = 0;
            openUntil = Instant.EPOCH;
        }

        synchronized void recordFailure() {
            Instant now = Instant.now();
            if (openUntil != Instant.EPOCH && !now.isBefore(openUntil)) {
                // Entering half-open after a cooldown: start a fresh trial window.
                consecutiveFailures = 0;
                openUntil = Instant.EPOCH;
            }
            consecutiveFailures++;
            if (consecutiveFailures >= BREAKER_THRESHOLD) {
                openUntil = now.plus(BREAKER_COOLDOWN);
            }
        }
    }
}
