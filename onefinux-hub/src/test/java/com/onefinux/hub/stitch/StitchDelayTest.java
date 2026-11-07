package com.onefinux.hub.stitch;

import com.onefinux.hub.calendar.CalendarProperties;
import com.onefinux.hub.calendar.CalendarProperties.Region;
import com.onefinux.hub.calendar.CloseCalendar;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventIngested;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** DELAYED: still waiting after the kit's cutoff on the COB, in the instance region's zone. */
@ExtendWith(MockitoExtension.class)
class StitchDelayTest {

    static final String ID = "FOBO|2026-09-12|EMEA|R-2031";
    /** 19:00 London on 12 Sep 2026 (BST) is 18:00Z. */
    static final Instant BEFORE = Instant.parse("2026-09-12T17:59:00Z");
    static final Instant AFTER = Instant.parse("2026-09-12T18:01:00Z");

    @Mock StitchRepository repo;
    @Mock StreamHub stream;

    StitchFold fold(Instant now, boolean delays) {
        CloseCalendar calendar = new CloseCalendar(new CalendarProperties(null,
                Map.of("EMEA", new Region("Europe/London", List.of())), delays), ZoneId.of("America/New_York"));
        lenient().when(repo.kitOf(ID)).thenReturn("FOBO");
        lenient().when(repo.slaOf(ID)).thenReturn(Map.of("cobDate", java.sql.Date.valueOf("2026-09-12"),
                "region", "EMEA", "slaCutoff", "19:00"));
        lenient().when(repo.requiredSources("FOBO")).thenReturn(List.of("CATS", "MOTIF", "MBR"));
        lenient().when(repo.instance(ID)).thenReturn(Map.of("sliceKey", "R-2031", "kitId", "FOBO",
                "question", "Can I execute this rec?", "groupUnitId", "REV-ACC"));
        return new StitchFold(repo, stream, calendar, Clock.fixed(now, ZoneId.of("UTC")));
    }

    void keys(String motifStatus) {
        when(repo.readinessKeys(ID)).thenReturn(List.of(
                key("CATS", "TR-9901", "COMPLETED"), key("MOTIF", "MB014", motifStatus), key("MBR", "BK-4420", "COMPLETED")));
    }

    @Test
    @DisplayName("AC-FOLD-03 a waiting key before the cutoff leaves the instance NOT_YET")
    void waiting_before_cutoff_is_not_yet() {
        StitchFold fold = fold(BEFORE, true);
        when(repo.statusOf(ID)).thenReturn("BLOCKED");
        keys("WAITING");

        fold.onEvent(new EventIngested(event("CATS", "TR-9901", EventStatus.COMPLETED), false));

        verify(repo).updateInstanceStatus(ID, "NOT_YET", null, null);
    }

    @Test
    @DisplayName("AC-FOLD-04 a waiting key after the region's cutoff makes the instance DELAYED, notified and escalated")
    void waiting_after_cutoff_is_delayed() {
        StitchFold fold = fold(AFTER, true);
        when(repo.statusOf(ID)).thenReturn("NOT_YET");
        keys("WAITING");

        fold.onEvent(new EventIngested(event("CATS", "TR-9901", EventStatus.COMPLETED), false));

        verify(repo).updateInstanceStatus(ID, "DELAYED", null, null);
        verify(repo).insertEscalation(startsWith("ESC-D"), eq(ID), eq("DELAY"));
        verify(repo).insertNotification(eq("WARN"), eq("DELAYED"), eq("FOBO"), anyString(), anyString(),
                anyString(), anyString(), anyString(), eq(ID), anyString());
    }

    @Test
    @DisplayName("AC-FOLD-20 a DELAYED instance whose last waiting key completes becomes READY")
    void delayed_to_ready() {
        StitchFold fold = fold(AFTER, true);
        when(repo.statusOf(ID)).thenReturn("DELAYED");
        keys("COMPLETED");

        fold.onEvent(new EventIngested(event("MOTIF", "MB014", EventStatus.COMPLETED), false));

        verify(repo).updateInstanceStatus(ID, "READY", null, null);
    }

    @Test
    @DisplayName("AC-FOLD-24 the sweep turns a NOT_YET instance DELAYED when its cutoff passes with no new fact")
    void sweep_moves_not_yet_past_cutoff() {
        StitchFold fold = fold(AFTER, true);
        when(repo.instanceIdsWithStatus("NOT_YET")).thenReturn(List.of(ID));
        when(repo.statusOf(ID)).thenReturn("NOT_YET");
        keys("WAITING");

        assertThat(fold.sweepDelayed()).isEqualTo(1);
        verify(repo).updateInstanceStatus(ID, "DELAYED", null, null);
    }

    @Test
    @DisplayName("AC-FOLD-25 with stitch-delays off the instance stays NOT_YET past the cutoff")
    void switch_off_keeps_not_yet() {
        StitchFold fold = fold(AFTER, false);
        when(repo.instanceIdsWithStatus("NOT_YET")).thenReturn(List.of(ID));

        assertThat(fold.sweepDelayed()).isZero();
        verify(repo, never()).updateInstanceStatus(eq(ID), eq("DELAYED"), any(), any());
    }

    private static Map<String, Object> key(String source, String sourceKey, String status) {
        return Map.of("sourceId", source, "sourceKey", sourceKey, "keyStatus", status);
    }

    private static BusinessEvent event(String source, String sourceKey, EventStatus status) {
        return new BusinessEvent("EVT-1", "LEDGER_POSTED", source, sourceKey, "LEDGER", sourceKey,
                Map.of(), LocalDate.parse("2026-09-12"), "EMEA", status,
                Instant.parse("2026-09-12T18:00:00Z"), Instant.parse("2026-09-12T18:00:00Z"), Map.of("instanceId", ID));
    }
}
