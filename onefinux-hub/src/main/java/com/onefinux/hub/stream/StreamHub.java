package com.onefinux.hub.stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pushes live updates to every open browser via Server-Sent Events.
 * Sends happen on a single background thread so a slow browser never stalls event ingestion,
 * and ordering is preserved. Production: WebSocket/SSE gateway fed from a Kafka consumer group.
 */
@Component
public class StreamHub {

    private static final Logger log = LoggerFactory.getLogger(StreamHub.class);

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final ExecutorService sender = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "sse-sender");
        t.setDaemon(true);
        return t;
    });

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        broadcastTo(emitter, "hello", java.util.Map.of("clients", emitters.size()));
        return emitter;
    }

    public void broadcast(String name, Object data) {
        sender.execute(() -> emitters.forEach(e -> send(e, name, data)));
    }

    private void broadcastTo(SseEmitter emitter, String name, Object data) {
        sender.execute(() -> send(emitter, name, data));
    }

    private void send(SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data, MediaType.APPLICATION_JSON));
        } catch (IOException | IllegalStateException e) {
            emitters.remove(emitter);
            log.debug("Dropped a disconnected browser: {}", e.getMessage());
        }
    }

    @Scheduled(fixedRate = 15_000)
    public void heartbeat() {
        sender.execute(() -> emitters.forEach(e -> {
            try {
                e.send(SseEmitter.event().comment("heartbeat"));
            } catch (IOException | IllegalStateException ex) {
                emitters.remove(e);
            }
        }));
    }

    public int clients() {
        return emitters.size();
    }

    @PreDestroy
    void shutdown() {
        emitters.forEach(SseEmitter::complete);
        sender.shutdownNow();
    }
}
