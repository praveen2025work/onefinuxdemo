package com.onefinux.hub.stream;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StreamHubTest {

    private final StreamHub hub = new StreamHub(new ObjectMapper());

    @AfterEach
    void stop() {
        hub.shutdown();
    }

    @Test
    void framesEventsAsTypeAndData() {
        assertThat(hub.frame("notification", Map.of("title", "FOBO is READY")))
                .isEqualTo("{\"type\":\"notification\",\"data\":{\"title\":\"FOBO is READY\"}}");
    }

    @Test
    void attachedSocketGetsHelloThenBroadcasts() throws Exception {
        WebSocketSession session = openSession("s1");
        hub.attach(session);
        hub.broadcast("outcome", Map.of("key", "FOBO_HELIX"));

        List<String> sent = sentTexts(session, 2);
        assertThat(sent.get(0)).startsWith("{\"type\":\"hello\"").contains("\"transport\":\"ws\"");
        assertThat(sent.get(1)).isEqualTo("{\"type\":\"outcome\",\"data\":{\"key\":\"FOBO_HELIX\"}}");
        assertThat(hub.socketClients()).isEqualTo(1);
    }

    @Test
    void detachedSocketStopsCounting() {
        WebSocketSession session = openSession("s2");
        hub.attach(session);
        hub.detach(session);
        assertThat(hub.socketClients()).isZero();
        assertThat(hub.clients()).isZero();
    }

    @Test
    void closedSocketIsDroppedOnNextSend() throws Exception {
        WebSocketSession session = openSession("s3");
        hub.attach(session);
        sentTexts(session, 1);
        when(session.isOpen()).thenReturn(false);
        hub.broadcast("kit", Map.of("kitId", "HELIX_RECON"));
        hub.broadcast("kit", Map.of("kitId", "HELIX_RECON"));
        // The sender thread is ordered: once a later broadcast runs, the closed session is gone.
        long deadline = System.currentTimeMillis() + 2_000;
        while (hub.socketClients() > 0 && System.currentTimeMillis() < deadline) {
            Thread.onSpinWait();
        }
        assertThat(hub.socketClients()).isZero();
    }

    private static WebSocketSession openSession(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static List<String> sentTexts(WebSocketSession session, int atLeast) throws Exception {
        ArgumentCaptor<WebSocketMessage> captor = ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(session, timeout(2_000).atLeast(atLeast)).sendMessage(captor.capture());
        verify(session, atLeast(atLeast)).sendMessage(any());
        return captor.getAllValues().stream()
                .filter(m -> m instanceof TextMessage)
                .map(m -> ((TextMessage) m).getPayload())
                .toList();
    }
}
