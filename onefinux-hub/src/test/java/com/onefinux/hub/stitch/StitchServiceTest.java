package com.onefinux.hub.stitch;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StitchServiceTest {

    static final String ID = "FOBO|2026-09-12|EMEA|R-2031";

    @Mock StitchRepository repo;
    @Mock StitchFold fold;
    @Mock EventHubService hub;
    @Mock StreamHub stream;
    @Mock CurrentUser currentUser;

    StitchService service;

    @BeforeEach
    void setUp() {
        service = new StitchService(repo, fold, hub, stream, new ObjectMapper(), Clock.systemUTC(), currentUser);
        lenient().when(currentUser.actor()).thenReturn("alice.revacc");
        lenient().when(currentUser.entitlements()).thenReturn(
                new Entitlements("alice.revacc", Set.of("CONTROLLER"), Set.of("REV-ACC"), Set.of("product:FOBO"), false));
    }

    @Test
    @DisplayName("AC-ACTION-09 sign-off without COUNTERSIGN clears")
    void ac_action_09_signoff_clears_without_countersign() {
        when(repo.instance(ID)).thenReturn(inst("READY"), inst("CLEARED"));
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,POST,AMEND"));

        Map<String, Object> out = service.signoff(ID);

        verify(repo).updateInstanceStatus(ID, "CLEARED", null, null);
        assertThat(out.get("status")).isEqualTo("CLEARED");
    }

    @Test
    @DisplayName("AC-ACTION-18 SIGN_OFF with COUNTERSIGN declared sets SIGNED")
    void ac_action_18_signoff_sets_signed_when_countersign_declared() {
        when(repo.instance(ID)).thenReturn(inst("READY"), inst("READY"), inst("SIGNED"));
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,ADJUST,COUNTERSIGN"));

        Map<String, Object> out = service.action(ID, "SIGN_OFF", Map.of());

        verify(repo).updateInstanceStatus(ID, "SIGNED", null, null);
        verify(repo).setSignedBy(ID, "alice.revacc");
        verify(repo, never()).updateInstanceStatus(ID, "CLEARED", null, null);
        assertThat(out.get("status")).isEqualTo("SIGNED");
    }

    @Test
    @DisplayName("AC-ACTION-20 same actor cannot countersign")
    void ac_action_20_same_actor_countersign_rejected() {
        Map<String, Object> signed = inst("SIGNED");
        signed.put("signedBy", "alice.revacc");
        when(repo.instance(ID)).thenReturn(signed);
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,COUNTERSIGN"));

        assertThatThrownBy(() -> service.action(ID, "COUNTERSIGN", Map.of()))
                .isInstanceOf(ResponseStatusException.class);
        verify(repo, never()).updateInstanceStatus(eq(ID), eq("CLEARED"), any(), any());
    }

    @Test
    @DisplayName("AC-ACTION-23 COUNTERSIGN by a different actor clears")
    void ac_action_23_countersign_by_other_actor_clears() {
        Map<String, Object> signed = inst("SIGNED");
        signed.put("signedBy", "alice.revacc");
        when(repo.instance(ID)).thenReturn(signed, signed, inst("CLEARED"));
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,COUNTERSIGN"));
        when(currentUser.actor()).thenReturn("gla.reviewer");
        when(currentUser.entitlements()).thenReturn(
                new Entitlements("gla.reviewer", Set.of("GLA"), Set.of("REV-ACC"), Set.of("product:FOBO"), false));

        Map<String, Object> out = service.action(ID, "COUNTERSIGN", Map.of());

        verify(repo).updateInstanceStatus(ID, "CLEARED", null, null);
        assertThat(out.get("status")).isEqualTo("CLEARED");
    }

    @Test
    @DisplayName("AC-ACTION-22 ADJUST on BLOCKED records FAS_MOTIF runId")
    void ac_action_22_adjust_records_pending_fas_run() {
        when(repo.instance(ID)).thenReturn(inst("BLOCKED"));
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,ADJUST,COUNTERSIGN"));

        Map<String, Object> out = service.action(ID, "ADJUST", Map.of());

        verify(repo).insertPendingCommandRun(eq((String) out.get("runId")), eq(ID), eq("FAS_MOTIF"));
        assertThat(out.get("runId")).isNotNull();
        assertThat(out.get("dest")).isEqualTo("FAS_MOTIF");
        assertThat(out.get("echoPending")).isEqualTo(true);
    }

    @Test
    @DisplayName("AC-ACTION-05 ADJUST is rejected when the kit does not declare it")
    void adjust_rejected_when_not_declared() {
        when(repo.instance(ID)).thenReturn(inst("BLOCKED"));
        when(repo.kitById("FOBO")).thenReturn(kit("SIGN_OFF,POST"));

        assertThatThrownBy(() -> service.action(ID, "ADJUST", Map.of()))
                .isInstanceOf(ResponseStatusException.class);
        verify(repo, never()).insertPendingCommandRun(any(), any(), any());
    }

    private static Map<String, Object> kit(String userActions) {
        return Map.of("kitId", "FOBO", "userActions", userActions);
    }

    private static Map<String, Object> inst(String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("instanceId", ID);
        m.put("groupUnitId", "REV-ACC");
        m.put("kitId", "FOBO");
        m.put("sliceKey", "R-2031");
        m.put("status", status);
        m.put("cobDate", "2026-09-12");
        m.put("region", "EMEA");
        m.put("question", "Can I execute this rec?");
        m.put("namedBlocker", "MOTIF MB014 FAILED");
        return m;
    }
}
