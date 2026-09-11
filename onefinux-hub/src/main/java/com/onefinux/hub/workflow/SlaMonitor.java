package com.onefinux.hub.workflow;

import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The SLA clock. A missed deadline is recorded as an event (not just a flag) so it is in the audit
 * trail and survives a restart; for regulatory outcomes such as 15C3 that evidence matters.
 */
@Component
class SlaMonitor {

    private final OutcomeEngine engine;
    private final EventHubService hub;
    private final AtomicBoolean live = new AtomicBoolean(false);

    SlaMonitor(OutcomeEngine engine, EventHubService hub) {
        this.engine = engine;
        this.hub = hub;
    }

    /** Start checking only after the startup replay has rebuilt state. */
    @EventListener(ApplicationReadyEvent.class)
    void goLive() {
        live.set(true);
    }

    @Scheduled(fixedDelay = 10_000, initialDelay = 10_000)
    void checkDeadlines() {
        if (!live.get()) {
            return;
        }
        for (OutcomeView overdue : engine.overdue()) {
            hub.publishInternal(OutcomeEngine.SLA_BREACHED_EVENT, "SLA-" + overdue.outcomeId(), overdue.cobDate(),
                    overdue.region(), EventStatus.FAILED,
                    Map.of("outcomeId", overdue.outcomeId(), "deadline", String.valueOf(overdue.deadline())));
        }
    }
}
