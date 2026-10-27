package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository repository;
    @Mock CurrentUser currentUser;

    NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(repository, List.of(), Clock.systemUTC(), currentUser);
    }

    @Test
    @DisplayName("recent keeps a blank group unit only for a superuser")
    void recent_filters_by_group_unit() {
        when(repository.findAllByOrderByIdDesc(any())).thenReturn(List.of(
                note("rev", "REV-ACC"),
                note("markets", "MARKETS"),
                note("blank", null),
                note("spaces", "  ")));
        when(currentUser.entitlements()).thenReturn(
                new Entitlements("bob.markets", Set.of("CONTROLLER"), Set.of("MARKETS"), Set.of(), false));

        assertThat(service.recent(50)).extracting(NotificationView::outcomeKey).containsExactly("markets");
    }

    @Test
    @DisplayName("recent returns every row to a superuser, including a blank group unit")
    void recent_superuser_sees_blank_group_unit() {
        when(repository.findAllByOrderByIdDesc(any())).thenReturn(List.of(
                note("rev", "REV-ACC"),
                note("blank", null),
                note("spaces", "   ")));
        when(currentUser.entitlements()).thenReturn(
                new Entitlements("praveen.kumar", Set.of("ADMIN"), Set.of(), Set.of(), true));

        assertThat(service.recent(50)).extracting(NotificationView::outcomeKey)
                .containsExactly("rev", "blank", "spaces");
    }

    private static Notification note(String outcomeKey, String groupUnitId) {
        Notification n = new Notification(Instant.parse("2026-09-12T18:00:00Z"), Severity.WARN, "BLOCKED",
                outcomeKey, "Outcome", "all", outcomeKey, "message", "SSE");
        try {
            Field field = Notification.class.getDeclaredField("groupUnitId");
            field.setAccessible(true);
            field.set(n, groupUnitId);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
        return n;
    }
}
