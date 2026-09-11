package com.onefinux.hub.api;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.notification.NotificationService;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;

@RestController
public class AdminController {

    private final OneFinUxProperties properties;
    private final EventHubService hub;
    private final NotificationService notifications;
    private final OutcomeEngine engine;
    private final StreamHub stream;
    private final Clock clock;

    public AdminController(OneFinUxProperties properties, EventHubService hub, NotificationService notifications,
                           OutcomeEngine engine, StreamHub stream, Clock clock) {
        this.properties = properties;
        this.hub = hub;
        this.notifications = notifications;
        this.engine = engine;
        this.stream = stream;
        this.clock = clock;
    }

    @GetMapping("/api/config")
    public Map<String, Object> config() {
        return Map.of("zone", properties.zone(), "businessDate", LocalDate.now(clock).toString(),
                "simulatorUrl", String.valueOf(properties.simulatorUrl()), "liveClients", stream.clients());
    }

    /** Demo only: wipes events, notifications and outcome state, then re-creates today's outcomes. */
    @PostMapping("/api/admin/reset")
    public Map<String, Object> reset() {
        hub.purge(() -> {
            notifications.purge();
            engine.clear();
            engine.initialise(LocalDate.now(clock));
        });
        stream.broadcast("reset", Map.of("at", clock.instant().toString()));
        return Map.of("reset", true, "outcomes", engine.views().size());
    }
}
