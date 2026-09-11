package com.onefinux.hub.notification;

import com.onefinux.hub.config.OneFinUxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Stands in for email in the POC: writes exactly what would be sent, to whom, into the log. */
@Component
class LogEmailChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger("notification.email");

    private final boolean enabled;

    LogEmailChannel(OneFinUxProperties properties) {
        this.enabled = properties.notifications().logChannelEnabled();
    }

    @Override
    public String name() {
        return "email (simulated)";
    }

    @Override
    public boolean enabled() {
        return enabled;
    }

    @Override
    public void deliver(NotificationView n) {
        log.info("[{}] to: {} | {} | {}", n.severity(), n.audience(), n.title(), n.message());
    }
}
