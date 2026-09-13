package com.onefinux.hub.outcome;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * The human-readable report a completed outcome makes available to view. Composed on demand from the
 * outcome instance: its identity, the feeds that fed it, and the artifact the downstream system produced.
 */
public record ReportDocument(
        String reportId,
        String title,
        String outcomeId,
        String name,
        String question,
        LocalDate cobDate,
        String region,
        String ownerGroup,
        String stage,
        Instant generatedAt,
        String catalogId,
        String uri,
        Integer rowCount,
        String summary,
        List<Feed> feeds) {

    /** One input that contributed to the report, as it stood when the report was generated. */
    public record Feed(String label, String sourceSystem, int completed, int expected) {
    }

    public static ReportDocument from(OutcomeView view) {
        ReportArtifact artifact = view.report();
        List<Feed> feeds = view.dependencies().stream()
                .map(d -> new Feed(d.label(), d.sourceSystem(), d.completed(), d.expected()))
                .toList();
        return new ReportDocument(
                artifact == null ? null : artifact.reportId(),
                view.name() + " — " + view.cobDate() + " (" + view.region() + ")",
                view.outcomeId(),
                view.name(),
                view.question(),
                view.cobDate(),
                view.region(),
                view.ownerGroup(),
                view.stage(),
                artifact == null ? view.completedAt() : artifact.generatedAt(),
                artifact == null ? null : artifact.catalogId(),
                artifact == null ? null : artifact.uri(),
                artifact == null ? null : artifact.rowCount(),
                view.resultSummary(),
                feeds);
    }
}
