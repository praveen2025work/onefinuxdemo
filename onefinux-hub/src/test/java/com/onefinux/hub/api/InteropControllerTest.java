package com.onefinux.hub.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class InteropControllerTest {

    private final StreamHub stream = mock(StreamHub.class);
    private final InteropController controller = new InteropController(stream, new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-09-12T20:00:00Z"), ZoneOffset.UTC));

    @Test
    @SuppressWarnings("unchecked")
    void pushesAContextOnAColourChannel() {
        controller.context(new InteropController.ContextPush("blue",
                Map.of("type", "ofx.instance", "id", "FOBO|2026-09-12|EMEA|R-2031"), "drive"));
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(stream).broadcast(eq("context"), payload.capture());
        Map<String, Object> sent = (Map<String, Object>) payload.getValue();
        assertThat(sent).containsEntry("channel", "blue").containsEntry("source", "hub:drive").containsEntry("at", "2026-09-12T20:00:00Z");
        assertThat((Map<String, Object>) sent.get("context")).containsEntry("type", "ofx.instance");
    }

    @Test
    void acceptsAnAppChannel() {
        controller.context(new InteropController.ContextPush("app:fobo-desk", Map.of("type", "fdc3.instrument"), null));
        verify(stream).broadcast(eq("context"), any());
    }

    @Test
    void rejectsABadChannelOrAContextWithoutType() {
        assertThatThrownBy(() -> controller.context(new InteropController.ContextPush("Blue Channel", Map.of("type", "x"), null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> controller.context(new InteropController.ContextPush("blue", Map.of("id", "x"), null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> controller.context(new InteropController.ContextPush("blue", Map.of("type", "x", "blob", "y".repeat(17_000)), null)))
                .isInstanceOf(ResponseStatusException.class);
        verify(stream, never()).broadcast(anyString(), any());
    }

    @Test
    void raisesAnIntentAndRejectsABadName() {
        controller.intent(new InteropController.IntentPush("ViewInstance", Map.of("type", "ofx.instance", "id", "X"), "rtb.ops"));
        verify(stream).broadcast(eq("intent"), any());
        assertThatThrownBy(() -> controller.intent(new InteropController.IntentPush("view instance!", Map.of("type", "x"), null)))
                .isInstanceOf(ResponseStatusException.class);
    }
}
