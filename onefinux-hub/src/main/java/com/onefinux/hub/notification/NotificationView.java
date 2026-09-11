package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;

import java.time.Instant;

public record NotificationView(Long id, Instant createdAt, Severity severity, String transition, String outcomeKey,
                               String outcomeName, String audience, String title, String message, String channels) {

    static NotificationView from(Notification n) {
        return new NotificationView(n.getId(), n.getCreatedAt(), n.getSeverity(), n.getTransition(), n.getOutcomeKey(),
                n.getOutcomeName(), n.getAudience(), n.getTitle(), n.getMessage(), n.getChannels());
    }
}
