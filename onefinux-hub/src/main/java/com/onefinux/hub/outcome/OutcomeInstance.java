package com.onefinux.hub.outcome;

import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * One business outcome for one scope: (outcome, COB date, region). "15C3 for AMRS on 10 Sep" is an
 * instance; the same definition for 11 Sep is another. Not thread-safe: guarded by the engine.
 */
class OutcomeInstance {

    private final OutcomeDefinition definition;
    private final LocalDate cobDate;
    private final String region;
    private final ZoneId zone;
    private final Map<String, DependencyProgress> dependencies = new LinkedHashMap<>();
    private final Set<Integer> milestonesAnnounced = new HashSet<>();

    private OutcomeStatus status = OutcomeStatus.NOT_STARTED;
    private Instant firstEventAt;
    private Instant firstCompletionAt;
    private Instant lastCompletionAt;
    private Instant readyAt;
    private Instant completedAt;
    private Instant eta;
    private Instant updatedAt;
    private boolean atRisk;
    private boolean breached;
    private String actionRunId;
    private String resultSummary;
    private String lastMessage;

    OutcomeInstance(OutcomeDefinition definition, LocalDate cobDate, String region, ZoneId zone) {
        this.definition = definition;
        this.cobDate = cobDate;
        this.region = region;
        this.zone = zone;
        for (DependencyDefinition dep : definition.dependencies()) {
            dependencies.put(dep.eventType().toUpperCase(), new DependencyProgress(dep));
        }
    }

    static String key(String outcomeId, LocalDate cobDate, String region) {
        return outcomeId + "/" + cobDate + "/" + region;
    }

    String key() {
        return key(definition.id(), cobDate, region);
    }

    OutcomeDefinition definition() { return definition; }
    LocalDate cobDate() { return cobDate; }
    String region() { return region; }
    OutcomeStatus status() { return status; }
    Instant readyAt() { return readyAt; }
    Instant eta() { return eta; }
    boolean atRisk() { return atRisk; }
    boolean breached() { return breached; }
    String actionRunId() { return actionRunId; }

    DependencyProgress dependency(String eventType) {
        return dependencies.get(eventType.toUpperCase());
    }

    Collection<DependencyProgress> dependencies() {
        return dependencies.values();
    }

    void setStatus(OutcomeStatus status) { this.status = status; }
    void setAtRisk(boolean atRisk) { this.atRisk = atRisk; }
    void setBreached(boolean breached) { this.breached = breached; }
    void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    void touch(Instant at) { this.updatedAt = at; }

    void recordArrival(Instant at, boolean completion) {
        if (firstEventAt == null || at.isBefore(firstEventAt)) {
            firstEventAt = at;
        }
        if (completion) {
            if (firstCompletionAt == null || at.isBefore(firstCompletionAt)) {
                firstCompletionAt = at;
            }
            if (lastCompletionAt == null || at.isAfter(lastCompletionAt)) {
                lastCompletionAt = at;
            }
        }
    }

    void markReady(Instant at) {
        status = OutcomeStatus.READY;
        readyAt = at;
        eta = null;
        atRisk = false;
    }

    void withdrawReadiness(OutcomeStatus derived) {
        status = derived;
        readyAt = null;
        completedAt = null;
        actionRunId = null;
        resultSummary = null;
    }

    void markActionRunning(String runId) {
        status = OutcomeStatus.ACTION_RUNNING;
        actionRunId = runId;
        resultSummary = null;
    }

    void markActionFailed(String summary) {
        status = OutcomeStatus.ACTION_FAILED;
        resultSummary = summary;
    }

    void markCompleted(Instant at, String summary) {
        status = OutcomeStatus.COMPLETED;
        completedAt = at;
        resultSummary = summary;
    }

    boolean announceMilestone(int milestone) {
        return milestonesAnnounced.add(milestone);
    }

    int completed() {
        return dependencies.values().stream().mapToInt(DependencyProgress::completedCount).sum();
    }

    int expected() {
        return dependencies.values().stream().mapToInt(DependencyProgress::expected).sum();
    }

    int percent() {
        int expected = expected();
        return expected == 0 ? 100 : (int) Math.floor(completed() * 100.0 / expected);
    }

    /** Readiness derived purely from dependency state. */
    OutcomeStatus dependencyStatus() {
        if (dependencies.values().stream().anyMatch(DependencyProgress::hasFailures)) {
            return OutcomeStatus.BLOCKED;
        }
        if (dependencies.values().stream().allMatch(DependencyProgress::satisfied)) {
            return OutcomeStatus.READY;
        }
        return completed() > 0 ? OutcomeStatus.IN_PROGRESS : OutcomeStatus.NOT_STARTED;
    }

    /**
     * POC ETA: observed arrival rate projected over what is still pending.
     * Phase 1 blends this with historical P50/P90 per dependency; Phase 3 replaces it with a model.
     */
    void recomputeEta() {
        int done = completed();
        int total = expected();
        if (done < 2 || done >= total || firstCompletionAt == null || lastCompletionAt == null) {
            eta = null;
            return;
        }
        long elapsedMs = Duration.between(firstCompletionAt, lastCompletionAt).toMillis();
        if (elapsedMs <= 0) {
            eta = null;
            return;
        }
        double msPerInput = elapsedMs / (double) (done - 1);
        eta = lastCompletionAt.plusMillis((long) (msPerInput * (total - done)));
    }

    Instant deadline() {
        Integer within = definition.sla().withinMinutes();
        if (within != null) {
            return firstEventAt == null ? null : firstEventAt.plus(Duration.ofMinutes(within));
        }
        String cutoff = definition.sla().cutoff();
        if (cutoff == null || cutoff.isBlank()) {
            return null;
        }
        return cobDate.plusDays(definition.sla().dayOffset()).atTime(LocalTime.parse(cutoff)).atZone(zone).toInstant();
    }

    String pendingSummary() {
        return dependencies.values().stream()
                .filter(d -> !d.satisfied())
                .map(d -> d.label() + " " + d.completedCount() + " of " + d.expected())
                .collect(Collectors.joining(", "));
    }

    String failureSummary() {
        return dependencies.values().stream()
                .filter(DependencyProgress::hasFailures)
                .map(d -> d.label() + " failed: " + String.join(", ", d.failedKeys()))
                .collect(Collectors.joining("; "));
    }

    /** The dependency with the most items still outstanding, i.e. where to look first. */
    String slowestInput() {
        return dependencies.values().stream()
                .filter(d -> !d.satisfied())
                .max((a, b) -> Double.compare(a.pending() / (double) a.expected(), b.pending() / (double) b.expected()))
                .map(DependencyProgress::label)
                .orElse("none");
    }

    OutcomeView view() {
        List<DependencyView> deps = dependencies.values().stream().map(DependencyProgress::view).toList();
        return new OutcomeView(key(), definition.id(), definition.name(), definition.question(), cobDate, region,
                definition.ownerGroup(), status, percent(), completed(), expected(), expected() - completed(),
                eta, deadline(), atRisk, breached, readyAt, completedAt, definition.hasAction(),
                definition.onReady() == null ? null : definition.onReady().actionLabel(),
                actionRunId, resultSummary, lastMessage, updatedAt, deps);
    }
}
