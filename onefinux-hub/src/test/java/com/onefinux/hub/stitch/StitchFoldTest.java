package com.onefinux.hub.stitch;

import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventIngested;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StitchFoldTest {

    static final String ID = "FOBO|2026-09-12|EMEA|R-2031";

    @Mock StitchRepository repo;
    @Mock StreamHub stream;

    StitchFold fold;

    @BeforeEach
    void setUp() {
        fold = new StitchFold(repo, stream);
        when(repo.kitOf(ID)).thenReturn("FOBO");
    }

    @Test
    @DisplayName("AC-ACTION-013 / AC-CONSOLE-23 copies accounting attributes onto the instance")
    void copies_accounting_attributes_onto_instance() {
        when(repo.statusOf(ID)).thenReturn("BLOCKED");
        when(repo.readinessKeys(ID)).thenReturn(List.of(key("MOTIF", "MB014", "FAILED")));
        when(repo.requiredSources("FOBO")).thenReturn(List.of("CATS", "MOTIF", "MBR"));

        fold.onEvent(new EventIngested(event("MOTIF", "MB014", EventStatus.FAILED, Map.of(
                "instanceId", ID,
                "account", "410000",
                "journalId", "JE-8801",
                "amount", 12_450_000,
                "fsLine", "Fee income")), false));

        verify(repo).updateInstanceAccounting(ID, "410000", "JE-8801", "12450000", "Fee income");
    }

    @Test
    @DisplayName("ADJUST echo runId completes command_run on a Motif completion")
    void motif_completion_with_runId_completes_command_run() {
        when(repo.statusOf(ID)).thenReturn("BLOCKED");
        when(repo.readinessKeys(ID)).thenReturn(List.of(
                key("CATS", "TR-9901", "COMPLETED"),
                key("MOTIF", "MB014", "COMPLETED"),
                key("MBR", "BK-4420", "COMPLETED")));
        when(repo.requiredSources("FOBO")).thenReturn(List.of("CATS", "MOTIF", "MBR"));

        fold.onEvent(new EventIngested(event("MOTIF", "MB014", EventStatus.COMPLETED, Map.of(
                "instanceId", ID,
                "runId", "RUN-AB12")), false));

        verify(repo).completeCommandRun(ID, "RUN-AB12");
        verify(repo).updateInstanceStatus(ID, "READY", null, "RUN-AB12");
    }

    @Test
    @DisplayName("SIGNED is not overwritten to READY when keys stay complete")
    void signed_holds_when_keys_complete() {
        when(repo.statusOf(ID)).thenReturn("SIGNED");
        when(repo.readinessKeys(ID)).thenReturn(List.of(
                key("CATS", "TR-9901", "COMPLETED"),
                key("MOTIF", "MB014", "COMPLETED"),
                key("MBR", "BK-4420", "COMPLETED")));
        when(repo.requiredSources("FOBO")).thenReturn(List.of("CATS", "MOTIF", "MBR"));

        fold.onEvent(new EventIngested(event("MOTIF", "MB014", EventStatus.COMPLETED, Map.of(
                "instanceId", ID)), false));

        verify(repo, never()).updateInstanceStatus(eq(ID), eq("READY"), any(), any());
        verify(repo, never()).updateInstanceStatus(eq(ID), eq("CLEARED"), any(), any());
    }

    private static Map<String, Object> key(String source, String sourceKey, String status) {
        return Map.of("sourceId", source, "sourceKey", sourceKey, "keyStatus", status);
    }

    private static BusinessEvent event(String source, String sourceKey, EventStatus status,
                                       Map<String, Object> attributes) {
        return new BusinessEvent("EVT-1", "LEDGER_POSTED", source, sourceKey, "LEDGER", sourceKey,
                Map.of(), LocalDate.parse("2026-09-12"), "EMEA", status,
                Instant.parse("2026-09-12T18:00:00Z"), Instant.parse("2026-09-12T18:00:00Z"), attributes);
    }
}
