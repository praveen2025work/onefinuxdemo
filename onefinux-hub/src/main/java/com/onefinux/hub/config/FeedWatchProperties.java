package com.onefinux.hub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Directory the hub watches for producer JSON drops (feed-event-v1 or inbound-event-v1). */
@ConfigurationProperties(prefix = "onefinux.feed-watch")
public record FeedWatchProperties(
        Boolean enabled,
        String inbox,
        String processed,
        String rejected,
        Integer intervalMs) {

    public FeedWatchProperties {
        enabled = enabled == null || enabled;
        inbox = inbox == null || inbox.isBlank() ? "data/feeds/inbox" : inbox;
        processed = processed == null || processed.isBlank() ? "data/feeds/processed" : processed;
        rejected = rejected == null || rejected.isBlank() ? "data/feeds/rejected" : rejected;
        intervalMs = intervalMs == null ? 1000 : intervalMs;
    }

    public boolean on() {
        return Boolean.TRUE.equals(enabled);
    }
}
