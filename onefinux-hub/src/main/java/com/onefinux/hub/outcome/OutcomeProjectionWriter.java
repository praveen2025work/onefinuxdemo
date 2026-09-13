package com.onefinux.hub.outcome;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Projects each {@link OutcomeChanged} into the durable {@code outcome_projection} table. Runs only for
 * live changes (the engine does not publish during replay), so the projection persists the board across
 * restarts and is available to other nodes/consumers without touching the in-memory engine.
 */
@Component
public class OutcomeProjectionWriter {

    private static final Logger log = LoggerFactory.getLogger(OutcomeProjectionWriter.class);

    private final OutcomeProjectionRepository repo;
    private final ObjectMapper mapper;

    public OutcomeProjectionWriter(OutcomeProjectionRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @EventListener
    public void on(OutcomeChanged change) {
        OutcomeView view = change.view();
        try {
            repo.upsert(view, mapper.writeValueAsString(view));
        } catch (Exception e) {
            // The projection is a convenience read model; never let it break the fold or the live stream.
            log.warn("Could not persist outcome projection for {}: {}", view.key(), e.toString());
        }
    }
}
