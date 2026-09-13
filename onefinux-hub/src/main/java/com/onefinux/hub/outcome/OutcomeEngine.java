package com.onefinux.hub.outcome;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventIngested;
import com.onefinux.hub.event.EventStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Component 3 - Business Outcome Engine. The core differentiator.
 *
 * It is a deterministic fold over the event stream: each event updates the outcome instances that
 * depend on it, readiness is re-derived, and any meaningful change is published as an
 * {@link OutcomeChanged}. No AI in the readiness path; AI (Phase 3) only advises on ETA and root cause.
 *
 * Workflow decisions arrive as WORKFLOW_* events so that the same fold reproduces them on replay.
 */
@Service
public class OutcomeEngine {

    public static final String OVERRIDE_EVENT = "WORKFLOW_OVERRIDE";
    public static final String ACTION_TRIGGERED_EVENT = "WORKFLOW_ACTION_TRIGGERED";
    public static final String ACTION_FAILED_EVENT = "WORKFLOW_ACTION_FAILED";
    public static final String SLA_BREACHED_EVENT = "WORKFLOW_SLA_BREACHED";

    private static final Logger log = LoggerFactory.getLogger(OutcomeEngine.class);

    private final List<OutcomeDefinition> definitions;
    private final List<Integer> milestones;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;
    private final ZoneId zone;
    private final DateTimeFormatter timeFormat;
    private final Map<String, OutcomeInstance> instances = new LinkedHashMap<>();

    public OutcomeEngine(OneFinUxProperties properties, ApplicationEventPublisher publisher, Clock clock) {
        this.definitions = new ArrayList<>(properties.outcomes());
        this.milestones = properties.notifications().milestones().stream().sorted(Comparator.reverseOrder()).toList();
        this.publisher = publisher;
        this.clock = clock;
        this.zone = clock.getZone();
        this.timeFormat = DateTimeFormatter.ofPattern("HH:mm").withZone(zone);
    }

    @EventListener
    public void onEvent(EventIngested ingested) {
        apply(ingested.event(), ingested.replay());
    }

    public synchronized void apply(BusinessEvent event, boolean replay) {
        switch (event.eventType()) {
            case OVERRIDE_EVENT -> applyOverride(event, replay);
            case ACTION_TRIGGERED_EVENT -> applyActionTriggered(event, replay);
            case ACTION_FAILED_EVENT -> applyActionFailed(event, replay);
            case SLA_BREACHED_EVENT -> applySlaBreached(event, replay);
            default -> applyBusinessEvent(event, replay);
        }
    }

    // ---------------------------------------------------------------- business events

    private void applyBusinessEvent(BusinessEvent event, boolean replay) {
        for (OutcomeDefinition definition : definitions) {
            for (DependencyDefinition dependency : definition.dependencies()) {
                if (matches(dependency, event)) {
                    OutcomeInstance instance = getOrCreate(definition, event.cobDate(), event.region());
                    DependencyProgress progress = instance.dependency(dependency.eventType());
                    switch (event.status()) {
                        case COMPLETED -> progress.complete(event.sourceKey());
                        case FAILED -> progress.fail(event.sourceKey());
                        case REVOKED -> progress.revoke(event.sourceKey());
                        case STARTED -> { /* informational: starts the SLA clock only */ }
                    }
                    instance.recordArrival(event.occurredAt(), event.status() == EventStatus.COMPLETED);
                    reevaluate(instance, event.occurredAt(), describe(progress, event), replay);
                }
            }
            if (definition.onReady() != null && event.eventType().equalsIgnoreCase(definition.onReady().completionEvent())) {
                applyActionResult(definition, event, replay);
            }
        }
    }

    private static boolean matches(DependencyDefinition dependency, BusinessEvent event) {
        return dependency.eventType().equalsIgnoreCase(event.eventType())
                && (dependency.sourceSystem() == null || dependency.sourceSystem().equalsIgnoreCase(event.sourceSystem()));
    }

    /**
     * Re-derives readiness after any dependency change and emits at most one state transition,
     * followed by milestone / at-risk signals and a PROGRESS refresh for the live board.
     */
    private void reevaluate(OutcomeInstance instance, Instant at, String cause, boolean replay) {
        OutcomeStatus before = instance.status();
        OutcomeStatus derived = instance.dependencyStatus();
        String name = instance.definition().name();
        instance.recomputeEta();
        instance.touch(at);

        if (before.readyOrBeyond()) {
            if (derived != OutcomeStatus.READY) {
                Instant wasReadyAt = instance.readyAt();
                instance.withdrawReadiness(derived);
                emit(instance, Transition.REVOKED, name + ": readiness withdrawn",
                        cause + ". Anything produced since " + time(wasReadyAt) + " may need to be re-run.", replay);
            }
        } else if (derived == OutcomeStatus.READY) {
            instance.markReady(at);
            OutcomeDefinition def = instance.definition();
            emit(instance, Transition.READY, name + " is ready",
                    "All " + instance.expected() + " inputs are complete."
                            + (def.hasAction() ? " Starting " + def.onReady().actionLabel() + "." : " You can proceed."),
                    replay);
        } else {
            instance.setStatus(derived);
            if (derived == OutcomeStatus.BLOCKED && before != OutcomeStatus.BLOCKED) {
                emit(instance, Transition.BLOCKED, name + " is blocked",
                        instance.failureSummary() + ". Owner: " + instance.definition().ownerGroup() + ".", replay);
            } else if (before == OutcomeStatus.BLOCKED && derived != OutcomeStatus.BLOCKED) {
                emit(instance, Transition.UNBLOCKED, name + " is moving again", cause + ".", replay);
            } else if (before == OutcomeStatus.NOT_STARTED && derived == OutcomeStatus.IN_PROGRESS) {
                emit(instance, Transition.STARTED, name + " has started", "First input arrived: " + cause + ".", replay);
            }
        }

        if (instance.status() == OutcomeStatus.IN_PROGRESS) {
            announceMilestone(instance, replay);
        }
        assessRisk(instance, replay);
        emit(instance, Transition.PROGRESS, null, null, replay);
    }

    private void announceMilestone(OutcomeInstance instance, boolean replay) {
        int percent = instance.percent();
        for (int milestone : milestones) {            // highest first, announce only the newest one crossed
            if (percent >= milestone && milestone < 100) {
                boolean fresh = instance.announceMilestone(milestone);
                milestones.stream().filter(m -> m < milestone).forEach(instance::announceMilestone);
                if (fresh) {
                    emit(instance, Transition.MILESTONE,
                            instance.definition().name() + ": " + percent + "% complete",
                            instance.completed() + " of " + instance.expected() + " inputs in. " + etaText(instance)
                                    + " Still waiting on " + instance.pendingSummary() + ".", replay);
                }
                return;
            }
        }
    }

    private void assessRisk(OutcomeInstance instance, boolean replay) {
        if (instance.status().readyOrBeyond() || instance.breached()) {
            instance.setAtRisk(instance.breached() && !instance.status().readyOrBeyond());
            return;                                  // once breached, the breach alert is the message
        }
        Instant deadline = instance.deadline();
        Instant eta = instance.eta();
        boolean projectedLate = deadline != null && eta != null && eta.isAfter(deadline);
        if (projectedLate && !instance.atRisk()) {
            instance.setAtRisk(true);
            emit(instance, Transition.AT_RISK, instance.definition().name() + " may miss its deadline",
                    "Projected ready at " + time(eta) + ", deadline " + time(deadline)
                            + ". Slowest input: " + instance.slowestInput() + ".", replay);
        } else if (!projectedLate && instance.atRisk() && eta != null) {
            instance.setAtRisk(false);
        }
    }

    // ---------------------------------------------------------------- downstream action results

    private void applyActionResult(OutcomeDefinition definition, BusinessEvent event, boolean replay) {
        String correlationId = event.attribute("correlationId");
        OutcomeInstance instance = correlationId != null
                ? instances.get(correlationId)
                : instances.get(OutcomeInstance.key(definition.id(), event.cobDate(), event.region()));
        if (instance == null || !instance.definition().id().equals(definition.id())) {
            return;
        }
        String runId = event.attribute("runId");
        if (!instance.status().readyOrBeyond()
                || (runId != null && instance.actionRunId() != null && !runId.equals(instance.actionRunId()))) {
            log.warn("Ignoring stale {} for {} (status {}, run {})", event.eventType(), instance.key(),
                    instance.status(), runId);
            return;
        }
        String label = definition.onReady().actionLabel();
        String summary = Optional.ofNullable(event.attribute("summary")).orElse(label + " finished.");
        switch (event.status()) {
            case COMPLETED -> {
                instance.markCompleted(event.occurredAt(), summary, reportArtifact(event));
                emit(instance, Transition.COMPLETED, definition.name() + " is done", summary, replay);
            }
            case FAILED -> {
                instance.markActionFailed(summary);
                emit(instance, Transition.ACTION_FAILED, label + " failed", summary, replay);
            }
            default -> { /* STARTED / REVOKED from the downstream system are informational here */ }
        }
        instance.touch(event.occurredAt());
        emit(instance, Transition.PROGRESS, null, null, replay);
    }

    /** The viewable output a completion event carries, if any (reportId is what makes it "available to view"). */
    private ReportArtifact reportArtifact(BusinessEvent event) {
        String reportId = event.attribute("reportId");
        if (reportId == null || reportId.isBlank()) {
            return null;
        }
        Integer rowCount = null;
        String rows = event.attribute("rowCount");
        if (rows != null && !rows.isBlank()) {
            try {
                rowCount = Integer.valueOf(rows.trim());
            } catch (NumberFormatException ignore) {
                // leave rowCount null when the source sends a non-numeric value
            }
        }
        return new ReportArtifact(reportId, event.attribute("reportUri"), event.attribute("catalogId"),
                rowCount, event.occurredAt());
    }

    // ---------------------------------------------------------------- workflow events

    private void applyActionTriggered(BusinessEvent event, boolean replay) {
        OutcomeInstance instance = forWorkflowEvent(event);
        if (instance == null) {
            return;
        }
        instance.markActionRunning(event.sourceKey());
        instance.touch(event.occurredAt());
        String by = Optional.ofNullable(event.attribute("requestedBy")).orElse("system");
        emit(instance, Transition.ACTION_TRIGGERED, instance.definition().onReady().actionLabel() + " started",
                "Run " + event.sourceKey() + " for " + instance.definition().name()
                        + ("system".equals(by) ? " was triggered automatically." : " was requested by " + by + "."),
                replay);
        emit(instance, Transition.PROGRESS, null, null, replay);
    }

    private void applyActionFailed(BusinessEvent event, boolean replay) {
        OutcomeInstance instance = forWorkflowEvent(event);
        if (instance == null) {
            return;
        }
        String error = Optional.ofNullable(event.attribute("error")).orElse("no response");
        instance.markActionFailed("Could not start: " + error);
        instance.touch(event.occurredAt());
        emit(instance, Transition.ACTION_FAILED, instance.definition().onReady().actionLabel() + " could not start",
                "Run " + event.sourceKey() + ": " + error + ". Use re-run once the target is available.", replay);
        emit(instance, Transition.PROGRESS, null, null, replay);
    }

    private void applyOverride(BusinessEvent event, boolean replay) {
        OutcomeInstance instance = forWorkflowEvent(event);
        String dependencyType = event.attribute("dependency");
        if (instance == null || dependencyType == null || instance.dependency(dependencyType) == null) {
            return;
        }
        DependencyProgress dependency = instance.dependency(dependencyType);
        String reason = Optional.ofNullable(event.attribute("reason")).orElse("no reason given");
        String by = Optional.ofNullable(event.attribute("requestedBy")).orElse("unknown");
        dependency.override(reason, by);
        emit(instance, Transition.OVERRIDDEN, dependency.label() + " overridden",
                by + " marked " + dependency.label() + " as complete for " + instance.definition().name()
                        + ". Reason: " + reason, replay);
        reevaluate(instance, event.occurredAt(), "Manual override of " + dependency.label(), replay);
    }

    private OutcomeInstance forWorkflowEvent(BusinessEvent event) {
        String outcomeId = event.attribute("outcomeId");
        return outcomeId == null ? null : instances.get(OutcomeInstance.key(outcomeId, event.cobDate(), event.region()));
    }

    // ---------------------------------------------------------------- SLA clock

    /** Outcomes past their deadline that have not been flagged yet. The SlaMonitor turns each into an event. */
    public synchronized List<OutcomeView> overdue() {
        Instant now = clock.instant();
        return instances.values().stream()
                .filter(i -> !i.status().readyOrBeyond() && !i.breached())
                .filter(i -> i.deadline() != null && now.isAfter(i.deadline()))
                .map(OutcomeInstance::view)
                .toList();
    }

    private void applySlaBreached(BusinessEvent event, boolean replay) {
        OutcomeInstance instance = forWorkflowEvent(event);
        if (instance == null || instance.breached() || instance.status().readyOrBeyond()) {
            return;
        }
        instance.setBreached(true);
        instance.setAtRisk(true);
        instance.touch(event.occurredAt());
        emit(instance, Transition.SLA_BREACHED, instance.definition().name() + " missed its deadline",
                "Deadline was " + time(instance.deadline()) + ". Still waiting on " + instance.pendingSummary() + ".", replay);
        emit(instance, Transition.PROGRESS, null, null, replay);
    }

    // ---------------------------------------------------------------- queries and lifecycle

    public synchronized void initialise(LocalDate cobDate) {
        definitions.forEach(d -> d.regions().forEach(r -> getOrCreate(d, cobDate, r.toUpperCase())));
    }

    public synchronized void clear() {
        instances.clear();
    }

    public synchronized List<OutcomeView> views() {
        return instances.values().stream()
                .sorted(Comparator.comparing(OutcomeInstance::cobDate).reversed()
                        .thenComparing(i -> definitions.indexOf(i.definition())))
                .map(OutcomeInstance::view)
                .toList();
    }

    public synchronized Optional<OutcomeView> view(String outcomeId, LocalDate cobDate, String region) {
        return Optional.ofNullable(instances.get(OutcomeInstance.key(outcomeId, cobDate, region.toUpperCase())))
                .map(OutcomeInstance::view);
    }

    public Optional<OutcomeDefinition> definition(String outcomeId) {
        return definitions.stream().filter(d -> d.id().equalsIgnoreCase(outcomeId)).findFirst();
    }

    public synchronized List<OutcomeDefinition> definitions() {
        return List.copyOf(definitions);
    }

    /**
     * Onboards a new outcome kit at runtime. In production a maker-checker gate sits in front of this;
     * here it lets an operator define a question, its input feeds, an SLA and an optional action, and
     * immediately see the outcome fold live from the same event stream as the seeded outcomes. The new
     * definition joins the engine's list, so a demo reset (which re-runs {@link #initialise}) keeps it.
     * Rejects a duplicate id.
     */
    public synchronized OutcomeView register(OutcomeDefinition definition, LocalDate cobDate) {
        if (definitions.stream().anyMatch(d -> d.id().equalsIgnoreCase(definition.id()))) {
            throw new IllegalArgumentException("An outcome with id " + definition.id() + " already exists");
        }
        definitions.add(definition);
        OutcomeInstance seed = null;
        for (String region : definition.regions()) {
            OutcomeInstance instance = getOrCreate(definition, cobDate, region.toUpperCase());
            if (seed == null) {
                seed = instance;
            }
        }
        return seed == null ? null : seed.view();
    }

    private OutcomeInstance getOrCreate(OutcomeDefinition definition, LocalDate cobDate, String region) {
        return instances.computeIfAbsent(OutcomeInstance.key(definition.id(), cobDate, region),
                k -> new OutcomeInstance(definition, cobDate, region, zone));
    }

    private void emit(OutcomeInstance instance, Transition transition, String title, String message, boolean replay) {
        if (title != null) {
            instance.setLastMessage(title);
        }
        if (!replay) {
            publisher.publishEvent(new OutcomeChanged(instance.view(), transition, title, message));
        }
    }

    private String describe(DependencyProgress progress, BusinessEvent event) {
        String verb = switch (event.status()) {
            case COMPLETED -> "complete";
            case FAILED -> "failed";
            case REVOKED -> "restated (previous completion withdrawn)";
            case STARTED -> "started";
        };
        return progress.label() + " " + event.sourceKey() + " " + verb;
    }

    private String etaText(OutcomeInstance instance) {
        Instant eta = instance.eta();
        if (eta == null) {
            return "ETA is still being calculated.";
        }
        long minutes = Duration.between(clock.instant(), eta).toMinutes();
        if (eta.isBefore(clock.instant())) {
            return "Expected by " + time(eta) + ", now running late.";
        }
        return "ETA " + time(eta) + (minutes < 1 ? " (under a minute)." : " (about " + minutes + " min).");
    }

    private String time(Instant instant) {
        return instant == null ? "earlier" : timeFormat.format(instant);
    }
}
