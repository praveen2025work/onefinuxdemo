package com.onefinux.hub.search;

import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.stitch.StitchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock StitchService stitch;
    @Mock OutcomeEngine engine;
    @Mock CurrentUser currentUser;

    SearchService service;

    @BeforeEach
    void setUp() {
        service = new SearchService(stitch, engine, currentUser);
        lenient().when(currentUser.actor()).thenReturn("alice.revacc");
        lenient().when(currentUser.entitlements()).thenReturn(
                new Entitlements("alice.revacc", Set.of("CONTROLLER"), Set.of("REV-ACC"), Set.of("product:FOBO"), false));

        Map<String, Object> row = new HashMap<>();
        row.put("instanceId", "FOBO|2026-09-12|EMEA|R-2031");
        row.put("groupUnitId", "REV-ACC");
        row.put("kitId", "FOBO");
        row.put("sliceKey", "R-2031");
        row.put("region", "EMEA");
        row.put("status", "BLOCKED");
        row.put("cobDate", "2026-09-12");
        lenient().when(stitch.instances(any(), any(), any(), any())).thenReturn(List.of(row));

        lenient().when(engine.definitions()).thenReturn(List.of(
                new OutcomeDefinition("FOBO_HELIX", "FOBO investigation", "Can I execute FOBO analysis?",
                        List.of("GLOBAL"), "FOBO Controllers", null, List.of(), null, List.of())));

        Map<String, Object> note = new HashMap<>();
        note.put("id", 9);
        note.put("groupUnitId", "REV-ACC");
        note.put("title", "Book blocked");
        note.put("message", "Slice R-2031 is blocked");
        lenient().when(stitch.notifications(50)).thenReturn(List.of(note));
    }

    @Test
    void short_query_returns_no_hits() {
        assertThat(service.search("R", "REV-ACC", "2026-09-12")).isEmpty();
    }

    @Test
    void instance_hit_uses_the_instance_route() {
        List<SearchHit> hits = service.search("R-2031", "REV-ACC", "2026-09-12");
        assertThat(hits).anySatisfy(h -> {
            assertThat(h.kind()).isEqualTo("instance");
            assertThat(h.route()).isEqualTo("/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031");
        });
    }

    @Test
    void other_unit_query_returns_empty_without_calling_forbidden_data() {
        when(currentUser.entitlements()).thenReturn(
                new Entitlements("bob.markets", Set.of("CONTROLLER"), Set.of("MARKETS"), Set.of(), false));
        assertThat(service.search("R-2031", "REV-ACC", null)).isEmpty();
        verify(stitch, never()).instances(any(), any(), any(), any());
    }

    @Test
    void bob_still_receives_a_matching_outcome_definition() {
        when(currentUser.entitlements()).thenReturn(
                new Entitlements("bob.markets", Set.of("CONTROLLER"), Set.of("MARKETS"), Set.of(), false));
        when(stitch.instances(null, null, null, null)).thenReturn(List.of());
        List<SearchHit> hits = service.search("FOBO", null, null);
        assertThat(hits).anySatisfy(h -> {
            assertThat(h.kind()).isEqualTo("outcome");
            assertThat(h.id()).isEqualTo("FOBO_HELIX");
        });
        assertThat(hits).noneMatch(h -> "instance".equals(h.kind()));
    }
}
