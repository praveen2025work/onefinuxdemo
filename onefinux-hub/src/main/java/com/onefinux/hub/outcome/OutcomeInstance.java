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

    private OutcomeDefinition definition;
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
    private String etaBasis = "NONE";
    private int historicSamples;
    private Instant historicP50;
    private String actionRunId;
    private String resultSummary;
    private ReportArtifact report;
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

    /** Swap the live contract (grids, SLA, feeds) without dropping this instance's progress. */
    void rebind(OutcomeDefinition next) {
        this.definition = next;
        Map<String, DependencyProgress> kept = new LinkedHashMap<>();
        for (DependencyDefinition dep : next.dependencies()) {
            String key = dep.eventType().toUpperCase();
            DependencyProgress existing = dependencies.get(key);
            kept.put(key, existing != null ? existing : new DependencyProgress(dep));
        }
        dependencies.clear();
        dependencies.putAll(kept);
    }
    LocalDate cobDate() { return cobDate; }
    String region() { return region; }
    OutcomeStatus status() { return status; }
    Instant readyAt() { return readyAt; }
    Instant eta() { return eta; }
    Instant firstEventAt() { return firstEventAt; }

    Duration readyDuration() {
        if (readyAt == null || firstEventAt == null) {
            return null;
        }
        Duration d = Duration.between(firstEventAt, readyAt);
        return d.isNegative() || d.isZero() ? null : d;
    }
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
        etaBasis = "NONE";
        historicP50 = null;
        atRisk = false;
    }

    void withdrawReadiness(OutcomeStatus derived) {
        status = derived;
        readyAt = null;
        completedAt = null;
        actionRunId = null;
        resultSummary = null;
        report = null;
    }

    void markActionRunning(String runId) {
        status = OutcomeStatus.ACTION_RUNNING;
        actionRunId = runId;
        resultSummary = null;
        report = null;
    }

    void markActionFailed(String summary) {
        status = OutcomeStatus.ACTION_FAILED;
        resultSummary = summary;
    }

    void markCompleted(Instant at, String summary, ReportArtifact report) {
        status = OutcomeStatus.COMPLETED;
        completedAt = at;
        resultSummary = summary;
        this.report = report;
    }

    ReportArtifact report() {
        return report;
    }

    /**
     * Derived business stage for the report flow the console draws:
     * feeds arriving → ready → processing → generated → available to view.
     */
    String stage() {
        return switch (status) {
            case NOT_STARTED -> "NOT_STARTED";
            case IN_PROGRESS -> "FEEDS";
            case BLOCKED -> "BLOCKED";
            case READY -> "READY";
            case ACTION_RUNNING -> "PROCESSING";
            case ACTION_FAILED -> "FAILED";
            case COMPLETED -> report != null ? "AVAILABLE" : "GENERATED";
        };
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
     * Advisory ETA. LIVE = this COB's arrival rate. HISTORIC = P50 ready-duration of prior COBs
     * for the same outcome + region. BLENDED = 60% live / 40% historic. Never used for readiness.
     */
    void recomputeEta(Duration historicP50, int historicSamples, Instant now) {
        this.historicSamples = historicSamples;
        this.historicP50 = null;
        this.etaBasis = "NONE";
        this.eta = null;

        int done = completed();
        int total = expected();
        if (done >= total || total <= 0) {
            return;
        }

        Instant liveEta = null;
        if (done >= 2 && firstCompletionAt != null && lastCompletionAt != null) {
            long elapsedMs = Duration.between(firstCompletionAt, lastCompletionAt).toMillis();
            if (elapsedMs > 0) {
                double msPerInput = elapsedMs / (double) (done - 1);
                liveEta = lastCompletionAt.plusMillis((long) (msPerInput * (total - done)));
            }
        }

        Instant histEta = null;
        if (historicP50 != null && !historicP50.isZero() && !historicP50.isNegative()) {
            Instant start = firstEventAt != null ? firstEventAt : now;
            this.historicP50 = start.plus(historicP50);
            long remainingMs = historicP50.toMillis() * (total - done) / total;
            histEta = now.plusMillis(Math.max(0, remainingMs));
        }

        if (liveEta != null && histEta != null) {
            long liveRemain = Duration.between(now, liveEta).toMillis();
            long histRemain = Duration.between(now, histEta).toMillis();
            eta = now.plusMillis(Math.max(0, (long) (0.6 * liveRemain + 0.4 * histRemain)));
            etaBasis = "BLENDED";
        } else if (liveEta != null) {
            eta = liveEta;
            etaBasis = "LIVE";
        } else if (histEta != null) {
            eta = histEta;
            etaBasis = "HISTORIC";
        }
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
                actionRunId, resultSummary, lastMessage, updatedAt, deps, stage(), report,
                etaBasis, historicSamples, historicP50);
    }
}
