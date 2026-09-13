package com.onefinux.hub.outcome;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** What the UX, notifications and workflow see. Immutable snapshot of an outcome instance. */
public record OutcomeView(
        String key,
        String outcomeId,
        String name,
        String question,
        LocalDate cobDate,
        String region,
        String ownerGroup,
        OutcomeStatus status,
        int percent,
        int completed,
        int expected,
        int pending,
        Instant eta,
        Instant deadline,
        boolean atRisk,
        boolean breached,
        Instant readyAt,
        Instant completedAt,
        boolean hasAction,
        String actionLabel,
        String actionRunId,
        String resultSummary,
        String lastMessage,
        Instant updatedAt,
        List<DependencyView> dependencies,
        /** Business lifecycle stage for the report flow: NOT_STARTED, FEEDS, READY, PROCESSING, GENERATED, AVAILABLE, BLOCKED, FAILED. */
        String stage,
        /** The generated output, once available to view. Null until the outcome completes with an artifact. */
        ReportArtifact report) {
}
