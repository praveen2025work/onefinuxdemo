package com.onefinux.hub.writeback;

import com.onefinux.hub.activity.ActivityFeed;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.ux.TestDb;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WritebackServiceTest {

    CurrentUser currentUser = mock(CurrentUser.class);
    ActivityFeed feed = mock(ActivityFeed.class);
    WritebackService service;

    static Entitlements user(String name, String... verbs) {
        return new Entitlements(name, Set.of(), Set.of("REV-ACC"), Set.of(), false, Set.of(verbs), false);
    }

    @BeforeEach
    void setUp() {
        service = new WritebackService(TestDb.migrated(), currentUser, feed, new WritebackProperties(Map.of()),
                RestClient.builder(), Clock.systemUTC());
    }

    WritebackService.Submission submission(String approval) {
        return new WritebackService.Submission("Break register", approval, null, null, Map.of("groupUnit", "REV-ACC"),
                List.of(new WritebackService.Change("BK-4519", "owner", "", "Priya")));
    }

    @Test
    void makerCheckerNeedsADifferentApproverThenAppliesAndOverlays() {
        when(currentUser.entitlements()).thenReturn(user("alice", "WRITEBACK"));
        Map<String, Object> sub = service.submit("break-register", submission("maker-checker"));
        assertThat(sub.get("status")).isEqualTo("PENDING");
        String id = (String) sub.get("id");
        assertThat(service.overlay("break-register")).isEmpty();

        when(currentUser.entitlements()).thenReturn(user("alice", "WRITEBACK", "WRITEBACK_APPROVE"));
        assertThatThrownBy(() -> service.decide(id, true, null)).isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("different user");

        when(currentUser.entitlements()).thenReturn(user("gla", "WRITEBACK_APPROVE"));
        assertThat(service.decide(id, true, null).get("status")).isEqualTo("APPLIED");
        assertThat(service.overlay("break-register")).containsEntry("BK-4519", Map.of("owner", "Priya"));
        assertThat(service.list("break-register", "APPLIED")).hasSize(1);
        verify(feed, atLeastOnce()).publish(any());
    }

    @Test
    void withoutApprovalItAppliesAtOnceAndRolesAreEnforced() {
        when(currentUser.entitlements()).thenReturn(user("auditor", "ACCESS_REVIEW"));
        assertThatThrownBy(() -> service.submit("break-register", submission("none"))).hasMessageContaining("WRITEBACK");
        when(currentUser.entitlements()).thenReturn(user("alice", "WRITEBACK"));
        assertThat(service.submit("break-register", submission("none")).get("status")).isEqualTo("APPLIED");
    }

    @Test
    void unknownTargetsAndBadKeysAreRefused() {
        when(currentUser.entitlements()).thenReturn(user("alice", "WRITEBACK"));
        WritebackService.Submission bad = new WritebackService.Submission("t", "none", "http://evil", null, null,
                List.of(new WritebackService.Change("BK-1", "owner", null, "x")));
        assertThatThrownBy(() -> service.submit("g", bad)).hasMessageContaining("unknown write-back target");
        WritebackService.Submission badKey = new WritebackService.Submission("t", "none", null, null, null,
                List.of(new WritebackService.Change("<script>", "owner", null, "x")));
        assertThatThrownBy(() -> service.submit("g", badKey)).hasMessageContaining("row key");
    }
}
