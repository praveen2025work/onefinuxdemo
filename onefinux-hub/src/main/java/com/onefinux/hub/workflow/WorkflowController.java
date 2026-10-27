package com.onefinux.hub.workflow;

import com.onefinux.hub.activity.ActivityFeed;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.outcome.DependencyView;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeStatus;
import com.onefinux.hub.outcome.OutcomeView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;

/**
 * Component 4 - Workflow layer, "human in the loop" half: manual overrides and re-runs.
 * Both are recorded as events, so they appear in the audit trail and survive a replay.
 * Production adds maker-checker for overrides on regulatory outcomes such as 15C3.
 */
@RestController
@RequestMapping("/api/outcomes/{outcomeId}/{cobDate}/{region}")
public class WorkflowController {

    private static final EnumSet<OutcomeStatus> RERUNNABLE =
            EnumSet.of(OutcomeStatus.READY, OutcomeStatus.COMPLETED, OutcomeStatus.ACTION_FAILED);

    private final OutcomeEngine engine;
    private final EventHubService hub;
    private final ActionDispatcher dispatcher;
    private final ActivityFeed activity;

    public WorkflowController(OutcomeEngine engine, EventHubService hub, ActionDispatcher dispatcher, ActivityFeed activity) {
        this.engine = engine;
        this.hub = hub;
        this.dispatcher = dispatcher;
        this.activity = activity;
    }

    public record OverrideRequest(@NotBlank String dependency, @NotBlank String reason, @NotBlank String requestedBy) {
    }

    public record RunRequest(String requestedBy) {
    }

    @PostMapping("/override")
    public OutcomeView override(@PathVariable String outcomeId,
                                @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                                @PathVariable String region,
                                @Valid @RequestBody OverrideRequest request) {
        OutcomeView outcome = find(outcomeId, cobDate, region);
        DependencyView input = outcome.dependencies().stream()
                .filter(d -> d.eventType().equalsIgnoreCase(request.dependency())).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        request.dependency() + " is not an input of " + outcome.name()));
        if (input.pending() == 0 && input.failedKeys().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, input.label() + " is already complete; nothing to override");
        }
        hub.publishInternal(OutcomeEngine.OVERRIDE_EVENT, "OVR-" + request.dependency().toUpperCase(), cobDate,
                outcome.region(), EventStatus.COMPLETED,
                Map.of("outcomeId", outcome.outcomeId(), "dependency", request.dependency().toUpperCase(),
                        "reason", request.reason(), "requestedBy", request.requestedBy()));
        activity.publish(new ActivityFeed.Activity("OVERRIDE", request.requestedBy(),
                "Override " + input.label() + " on " + outcome.name() + ": " + request.reason(), outcome.outcomeId(),
                null, null, null, cobDate.toString(), outcome.region(), "console"));
        return find(outcomeId, cobDate, region);
    }

    @PostMapping("/run")
    public Map<String, String> run(@PathVariable String outcomeId,
                                   @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                                   @PathVariable String region,
                                   @RequestBody(required = false) RunRequest request) {
        OutcomeView outcome = find(outcomeId, cobDate, region);
        if (!outcome.hasAction()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, outcome.name() + " has no downstream action");
        }
        if (!RERUNNABLE.contains(outcome.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    outcome.name() + " is " + outcome.status() + "; it can only run once all inputs are complete");
        }
        String by = request == null || request.requestedBy() == null ? "unknown user" : request.requestedBy();
        String runId = dispatcher.trigger(outcome, by);
        activity.publish(new ActivityFeed.Activity("RERUN", by,
                "Re-ran " + outcome.actionLabel() + " for " + outcome.name() + " (" + runId + ")", outcome.outcomeId(),
                null, null, null, cobDate.toString(), outcome.region(), "console"));
        return Map.of("runId", runId);
    }

    private OutcomeView find(String outcomeId, LocalDate cobDate, String region) {
        return engine.view(outcomeId, cobDate, region).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "No outcome " + outcomeId + " for " + cobDate + " " + region));
    }
}
