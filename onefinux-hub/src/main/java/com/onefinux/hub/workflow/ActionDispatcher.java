package com.onefinux.hub.workflow;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
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
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ExecutorService;

/**
 * Component 4 - Workflow layer, "act" half. When an outcome with an action becomes READY, this routes the
 * command to the {@link ActionExecutor} registered for its {@code onReady.action} type. Adding a new kind
 * of capability (a message publish, an internal handoff, a new protocol) is a new {@code ActionExecutor}
 * bean plus one line of config; this dispatcher and the engine stay untouched.
 */
@Component
public class ActionDispatcher {

    private static final Logger log = LoggerFactory.getLogger(ActionDispatcher.class);

    private final OutcomeEngine engine;
    private final EventHubService hub;
    private final ExecutorService executor;
    private final Map<String, ActionExecutor> executors = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    private final String callbackUrl;

    public ActionDispatcher(OutcomeEngine engine, EventHubService hub, ExecutorService actionExecutor,
                            List<ActionExecutor> actionExecutors, OneFinUxProperties properties) {
        this.engine = engine;
        this.hub = hub;
        this.executor = actionExecutor;
        actionExecutors.forEach(e -> this.executors.put(e.type(), e));
        this.callbackUrl = properties.publicUrl() + "/api/events";
        log.info("Action executors registered: {}", this.executors.keySet());
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
        OnReady onReady = definition.onReady();
        String actionType = onReady == null ? null : onReady.action();
        String runId = "RUN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        hub.publishInternal(OutcomeEngine.ACTION_TRIGGERED_EVENT, runId, outcome.cobDate(), outcome.region(),
                EventStatus.STARTED, Map.of("outcomeId", outcome.outcomeId(), "requestedBy", requestedBy,
                        "target", String.valueOf(onReady == null ? null : onReady.target())));

        ActionCommand command = new ActionCommand(runId, outcome.key(), outcome.outcomeId(), outcome.cobDate(),
                outcome.region(), outcome.expected(), onReady == null ? null : onReady.completionEvent(), callbackUrl);

        ActionExecutor chosen = actionType == null ? null : executors.get(actionType);
        if (chosen == null) {
            fail(command, "no executor registered for action type '" + actionType + "'");
            return runId;
        }
        executor.execute(() -> run(chosen, command, onReady));
        return runId;
    }

    private void run(ActionExecutor chosen, ActionCommand command, OnReady onReady) {
        try {
            chosen.execute(command, onReady);
        } catch (Exception e) {
            log.warn("Action {} ({}) for {} failed: {}", command.runId(), chosen.type(),
                    command.correlationId(), e.getMessage());
            fail(command, String.valueOf(e.getMessage()));
        }
    }

    private void fail(ActionCommand command, String error) {
        hub.publishInternal(OutcomeEngine.ACTION_FAILED_EVENT, command.runId(), command.cobDate(),
                command.region(), EventStatus.FAILED, Map.of("outcomeId", command.outcomeId(), "error", error));
    }

    /** The action types with a registered executor — the capabilities an outcome's {@code onReady} can invoke. */
    public Set<String> registeredActionTypes() {
        return Set.copyOf(executors.keySet());
    }
}
