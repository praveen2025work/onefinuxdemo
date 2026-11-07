package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.List;

/**
 * Sends a stitch notification (fold transition, escalation, sign-off) to the external channels — email,
 * ServiceNow, webhook. The stitch path already stores the row and pushes it to browsers itself.
 */
@Component
public class ChannelDispatcher {

    private static final Logger log = LoggerFactory.getLogger(ChannelDispatcher.class);

    private final List<NotificationChannel> channels;
    private final Clock clock;

    ChannelDispatcher(List<NotificationChannel> channels, Clock clock) {
        this.channels = channels.stream().filter(c -> !(c instanceof BrowserChannel)).toList();
        this.clock = clock;
    }

    public void dispatch(String severity, String transition, String subject, String subjectName, String audience,
                         String title, String message) {
        NotificationView view = new NotificationView(null, clock.instant(), severity(severity), transition, subject,
                subjectName, audience, title, message, null);
        for (NotificationChannel channel : channels) {
            if (!channel.enabled()) {
                continue;
            }
            try {
                channel.deliver(view);
            } catch (RuntimeException e) {
                log.warn("Channel {} failed for {} {}: {}", channel.name(), transition, subject, e.getMessage());
            }
        }
    }

    private static Severity severity(String value) {
        try {
            return Severity.valueOf(value);
        } catch (RuntimeException e) {
            return Severity.INFO;
        }
    }
}
