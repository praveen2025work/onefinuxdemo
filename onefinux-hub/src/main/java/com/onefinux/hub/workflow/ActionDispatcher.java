package com.onefinux.hub.workflow;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.ActionTarget;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.outcome.OutcomeChanged;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.outcome.Transition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ExecutorService;

/**
 * Component 4 - Workflow layer, "act" half. When an outcome with an action becomes READY, this sends
 * the command downstream (e.g. "Trigger Helix analysis"). The downstream system reports back by
 * publishing its completion event to the hub like any other source; there is no polling anywhere.
 */
@Component
public class ActionDispatcher {

    private static final Logger log = LoggerFactory.getLogger(ActionDispatcher.class);

    private final OutcomeEngine engine;
    private final EventHubService hub;
    private final ExecutorService executor;
    private final RestClient rest;
    private final Map<String, ActionTarget> targets = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    private final String callbackUrl;

    public ActionDispatcher(OutcomeEngine engine, EventHubService hub, ExecutorService actionExecutor,
                            RestClient.Builder restBuilder, OneFinUxProperties properties) {
        this.engine = engine;
        this.hub = hub;
        this.executor = actionExecutor;
        this.rest = restBuilder.build();
        this.targets.putAll(properties.actionTargets());
        this.callbackUrl = properties.publicUrl() + "/api/events";
    }

    @EventListener
    public void onOutcomeChanged(OutcomeChanged change) {
        if (change.transition() == Transition.READY && change.view().hasAction()) {
            executor.execute(() -> trigger(change.view(), "system"));
        }
    }

    /** Used for the automatic trigger and for a user's manual re-run. Returns the run id. */
    public String trigger(OutcomeView outcome, String requestedBy) {
        OutcomeDefinition definition = engine.definition(outcome.outcomeId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown outcome " + outcome.outcomeId()));
        String targetName = definition.onReady().target();
        String runId = "RUN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        hub.publishInternal(OutcomeEngine.ACTION_TRIGGERED_EVENT, runId, outcome.cobDate(), outcome.region(),
                EventStatus.STARTED, Map.of("outcomeId", outcome.outcomeId(), "requestedBy", requestedBy,
                        "target", String.valueOf(targetName)));

        ActionCommand command = new ActionCommand(runId, outcome.key(), outcome.outcomeId(), outcome.cobDate(),
                outcome.region(), outcome.expected(), definition.onReady().completionEvent(), callbackUrl);
        executor.execute(() -> send(targetName, command));
        return runId;
    }

    private void send(String targetName, ActionCommand command) {
        ActionTarget target = targetName == null ? null : targets.get(targetName);
        try {
            if (target == null || target.url() == null) {
                throw new IllegalStateException("no action target configured for '" + targetName + "'");
            }
            rest.post().uri(target.url()).contentType(MediaType.APPLICATION_JSON).body(command)
                    .retrieve().toBodilessEntity();
            log.info("Sent {} for {} to {}", command.runId(), command.correlationId(), target.url());
        } catch (Exception e) {
            log.warn("Action {} for {} failed: {}", command.runId(), command.correlationId(), e.getMessage());
            hub.publishInternal(OutcomeEngine.ACTION_FAILED_EVENT, command.runId(), command.cobDate(),
                    command.region(), EventStatus.FAILED, Map.of("outcomeId", command.outcomeId(),
                            "error", String.valueOf(e.getMessage())));
        }
    }
}
