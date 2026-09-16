package com.onefinux.hub.api;

import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.outcome.OutcomeEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/** On start: create today's outcome instances, then rebuild their state by replaying the event store. */
@Component
class StartupReplay implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupReplay.class);

    private final OutcomeEngine engine;
    private final EventHubService hub;
    private final Clock clock;

    StartupReplay(OutcomeEngine engine, EventHubService hub, Clock clock) {
        this.engine = engine;
        this.hub = hub;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        engine.initialise(LocalDate.now(clock));
        int replayed = hub.replay();
        log.info("One Finance ready: {} outcome instances rebuilt from {} stored events", engine.views().size(), replayed);
    }
}
