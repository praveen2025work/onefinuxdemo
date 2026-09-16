package com.onefinux.hub.event;

import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.stitch.StitchRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EventLifecycleServiceTest {

    @Test
    @DisplayName("AC-CONSOLE-19 lifecycle names receive, persist, and next state for a stitch fact")
    void stitch_fact_walks_receive_to_next_state() {
        EventHubService hub = mock(EventHubService.class);
        StitchRepository stitch = mock(StitchRepository.class);
        OutcomeEngine engine = mock(OutcomeEngine.class);
        String id = "FOBO|2026-09-12|EMEA|R-2031";
        BusinessEvent ev = new BusinessEvent("E1", "LEDGER_REJECTED", "MOTIF", "MB014",
                "LEDGER", "MB014", Map.of(), LocalDate.parse("2026-09-12"), "EMEA",
                EventStatus.FAILED, Instant.parse("2026-09-12T20:00:00Z"),
                Instant.parse("2026-09-12T20:00:01Z"),
                Map.of("instanceId", id, "ingestChannel", "FEED"));
        when(hub.find("E1")).thenReturn(java.util.Optional.of(ev));
        when(stitch.instance(id)).thenReturn(Map.of("instanceId", id, "status", "BLOCKED", "namedBlocker", "MOTIF MB014 FAILED"));
        when(stitch.readinessKeys(id)).thenReturn(List.of(
                Map.of("sourceId", "MOTIF", "sourceKey", "MB014", "keyStatus", "FAILED")));
        when(engine.views()).thenReturn(List.of());

        Map<String, Object> view = new EventLifecycleService(hub, stitch, engine).of("E1");

        assertThat(view.get("channel")).isEqualTo("FEED");
        assertThat(view.get("next").toString()).contains("BLOCKED");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> steps = (List<Map<String, String>>) view.get("steps");
        assertThat(steps).extracting(s -> s.get("id"))
                .containsExactly("receive", "validate", "persist", "translate", "fold", "next");
        @SuppressWarnings("unchecked")
        Map<String, Object> saved = (Map<String, Object>) view.get("saved");
        assertThat(saved.get("table")).isEqualTo("event_store");
        @SuppressWarnings("unchecked")
        Map<String, Object> request = (Map<String, Object>) view.get("request");
        assertThat(request.get("eventType")).isEqualTo("LEDGER_REJECTED");
    }
}
