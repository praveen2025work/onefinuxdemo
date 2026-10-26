package com.onefinux.hub.stream;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pushes live updates to every open browser, over Server-Sent Events ({@code /api/stream}) and
 * WebSocket ({@code /api/ws}). Both carry the same named events; a WebSocket frame is
 * {@code {"type": name, "data": payload}}. Sends happen on a single background thread so a slow browser
 * never stalls event ingestion, and ordering is preserved. Production: a WebSocket/SSE gateway fed from a
 * Kafka consumer group — the browser still never touches the bus.
 */
@Component
public class StreamHub {

    private static final Logger log = LoggerFactory.getLogger(StreamHub.class);
    private static final int SEND_TIME_LIMIT_MS = 10_000;
    private static final int BUFFER_LIMIT_BYTES = 512 * 1024;

    private final ObjectMapper json;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final Map<String, WebSocketSession> sockets = new ConcurrentHashMap<>();
    private final ExecutorService sender = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "sse-sender");
        t.setDaemon(true);
        return t;
    });

    public StreamHub(ObjectMapper json) {
        this.json = json;
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        broadcastTo(emitter, "hello", Map.of("clients", clients(), "transport", "sse"));
        return emitter;
    }

    /** A browser opened {@code /api/ws}. Sends are serialised per session and bounded so one slow tab is dropped, not waited on. */
    public void attach(WebSocketSession session) {
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_LIMIT_BYTES);
        sockets.put(session.getId(), safe);
        String hello = frame("hello", Map.of("clients", clients(), "transport", "ws"));
        if (hello != null) {
            sender.execute(() -> sendText(safe, hello));
        }
    }

    public void detach(WebSocketSession session) {
        sockets.remove(session.getId());
    }

    /** Answer an application-level ping from one browser (WebSocket ping frames are handled by the container). */
    public void reply(WebSocketSession session, String name, Object data) {
        WebSocketSession safe = sockets.get(session.getId());
        String text = frame(name, data);
        if (safe != null && text != null) {
            sender.execute(() -> sendText(safe, text));
        }
    }

    public void broadcast(String name, Object data) {
        String text = sockets.isEmpty() ? null : frame(name, data);
        sender.execute(() -> {
            emitters.forEach(e -> send(e, name, data));
            if (text != null) {
                sockets.values().forEach(s -> sendText(s, text));
            }
        });
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

    private void sendText(WebSocketSession session, String text) {
        if (!session.isOpen()) {
            sockets.remove(session.getId());
            return;
        }
        try {
            session.sendMessage(new TextMessage(text));
        } catch (IOException | IllegalStateException e) {
            sockets.remove(session.getId());
            closeQuietly(session, CloseStatus.SESSION_NOT_RELIABLE);
            log.debug("Dropped a disconnected socket: {}", e.getMessage());
        }
    }

    String frame(String name, Object data) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", name);
        envelope.put("data", data);
        try {
            return json.writeValueAsString(envelope);
        } catch (JsonProcessingException e) {
            log.warn("Could not serialise live event {}: {}", name, e.getMessage());
            return null;
        }
    }

    @Scheduled(fixedRate = 15_000)
    public void heartbeat() {
        sender.execute(() -> {
            emitters.forEach(e -> {
                try {
                    e.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException ex) {
                    emitters.remove(e);
                }
            });
            // Ping frames keep nginx / IIS ARR from idling the socket out; the browser answers with a pong.
            sockets.values().forEach(s -> {
                try {
                    if (s.isOpen()) {
                        s.sendMessage(new PingMessage());
                    } else {
                        sockets.remove(s.getId());
                    }
                } catch (IOException | IllegalStateException ex) {
                    sockets.remove(s.getId());
                }
            });
        });
    }

    public int clients() {
        return emitters.size() + sockets.size();
    }

    public int socketClients() {
        return sockets.size();
    }

    private static void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException | IllegalStateException ignored) {
            // already gone
        }
    }

    @PreDestroy
    void shutdown() {
        emitters.forEach(SseEmitter::complete);
        sockets.values().forEach(s -> closeQuietly(s, CloseStatus.GOING_AWAY));
        sender.shutdownNow();
    }
}
