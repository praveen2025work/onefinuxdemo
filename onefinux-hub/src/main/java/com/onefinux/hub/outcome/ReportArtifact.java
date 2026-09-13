package com.onefinux.hub.outcome;

import java.time.Instant;

/**
 * The viewable output an outcome produces once its action completes. For the 15C3 report this is the
 * generated regulatory report: a catalog id and a locator the console can open ("available to view").
 * Null until the completion event carries one.
 */
public record ReportArtifact(
        String reportId,
        String uri,
        String catalogId,
        Integer rowCount,
        Instant generatedAt) {
}
