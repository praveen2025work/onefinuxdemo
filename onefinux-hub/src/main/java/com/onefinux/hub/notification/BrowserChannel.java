package com.onefinux.hub.notification;

import com.onefinux.hub.stream.StreamHub;
import org.springframework.stereotype.Component;

/** In-app notification inbox, pushed live to the One Finance UX board. */
@Component
class BrowserChannel implements NotificationChannel {

    private final StreamHub stream;

    BrowserChannel(StreamHub stream) {
        this.stream = stream;
    }

    @Override
    public String name() {
        return "in-app";
    }

    @Override
    public boolean enabled() {
        return true;
    }

    @Override
    public void deliver(NotificationView notification) {
        stream.broadcast("notification", notification);
    }
}
