package com.onefinux.hub.activity;

import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ActivityFeedTest {

    private final StreamHub stream = mock(StreamHub.class);
    private final ActivityFeed feed = new ActivityFeed(stream, Clock.fixed(Instant.parse("2026-09-12T20:00:00Z"), ZoneOffset.UTC));

    private static ActivityFeed.Activity act(String action, String outcomeId, String kitId) {
        return new ActivityFeed.Activity(action, "pk", action + " done", outcomeId, kitId, null, null, null, null, "console");
    }

    @Test
    @SuppressWarnings("unchecked")
    void publishPushesTheActivityToEveryConsoleWithoutBlankFields() {
        feed.publish(new ActivityFeed.Activity("SIGN_OFF", "pk", "R-2031 signed off and cleared", null, "FOBO",
                "FOBO|2026-09-12|EMEA|R-2031", "REV-ACC", "2026-09-12", "EMEA", "console"));
        ArgumentCaptor<Object> sent = ArgumentCaptor.forClass(Object.class);
        verify(stream).broadcast(eq("activity"), sent.capture());
        Map<String, Object> payload = (Map<String, Object>) sent.getValue();
        assertThat(payload).containsEntry("id", "ACT-1").containsEntry("at", "2026-09-12T20:00:00Z")
                .containsEntry("action", "SIGN_OFF").containsEntry("actor", "pk").containsEntry("kitId", "FOBO")
                .doesNotContainKey("outcomeId");
    }

    @Test
    void recentIsNewestFirstAndFiltersByOutcomeOrKit() {
        feed.publish(act("POST", null, "FOBO"));
        feed.publish(act("OVERRIDE", "FOBO_HELIX", null));
        feed.publish(act("RERUN", "REPORT_15C3", null));
        assertThat(feed.recent(null, null, 10)).extracting(a -> a.get("action")).containsExactly("RERUN", "OVERRIDE", "POST");
        assertThat(feed.recent("fobo_helix", null, 10)).extracting(a -> a.get("action")).containsExactly("OVERRIDE");
        assertThat(feed.recent("FOBO_HELIX", "FOBO", 10)).extracting(a -> a.get("action")).containsExactly("OVERRIDE", "POST");
        assertThat(feed.recent(null, null, 1)).hasSize(1);
    }

    @Test
    void keepsOnlyTheLatestActivities() {
        for (int i = 0; i < ActivityFeed.KEEP + 20; i++) feed.publish(act("POST", null, "FOBO"));
        List<Map<String, Object>> all = feed.recent(null, null, 10_000);
        assertThat(all).hasSize(ActivityFeed.KEEP);
        assertThat(all.get(0)).containsEntry("id", "ACT-" + (ActivityFeed.KEEP + 20));
    }

    @Test
    void partnerScreensPostActivityAsTheAuthenticatedActor() {
        CurrentUser user = mock(CurrentUser.class);
        when(user.actor()).thenReturn("alex");
        ActivityController controller = new ActivityController(feed, user);
        Map<String, Object> sent = controller.publish(new ActivityController.ActivityPush("ASSIGNED", "BK-4420 assigned to Alex",
                null, "FOBO", "FOBO|2026-09-12|EMEA|R-2031", null, null, "helix"));
        assertThat(sent).containsEntry("actor", "alex").containsEntry("source", "client:helix").containsEntry("kitId", "FOBO");
        assertThat(controller.recent(null, "FOBO", 5)).hasSize(1);
    }

    @Test
    void rejectsActivityWithoutAVerbASummaryOrAnOutcome() {
        ActivityController controller = new ActivityController(feed, mock(CurrentUser.class));
        assertThatThrownBy(() -> controller.publish(new ActivityController.ActivityPush("assigned", "x", "FOBO_HELIX", null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> controller.publish(new ActivityController.ActivityPush("ASSIGNED", " ", "FOBO_HELIX", null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> controller.publish(new ActivityController.ActivityPush("ASSIGNED", "x", null, null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> controller.publish(new ActivityController.ActivityPush("ASSIGNED", "x", "<script>", null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(feed.recent(null, null, 10)).isEmpty();
    }
}
