package com.onefinux.hub.stream;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;

/**
 * {@code /api/ws}: the browser's push channel. The hub writes; the browser only listens.
 * The one inbound frame we answer is an application ping ({@code {"type":"ping"}}) so a console can
 * measure the round trip. Anything else is ignored — facts enter through the gateway, never a browser socket.
 */
@Component
public class LiveSocketHandler extends TextWebSocketHandler {

    private final StreamHub stream;

    public LiveSocketHandler(StreamHub stream) {
        this.stream = stream;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        stream.attach(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        if (payload.length() < 256 && payload.contains("\"ping\"")) {
            stream.reply(session, "pong", Map.of("at", System.currentTimeMillis()));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        stream.detach(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        stream.detach(session);
    }
}
