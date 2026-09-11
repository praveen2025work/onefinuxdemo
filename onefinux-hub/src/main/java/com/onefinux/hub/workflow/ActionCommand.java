package com.onefinux.hub.workflow;

import java.time.LocalDate;

/** Command sent to a downstream system (Helix, Axiom) when an outcome becomes ready. */
public record ActionCommand(
        String runId,
        String correlationId,
        String outcomeId,
        LocalDate cobDate,
        String region,
        int inputs,
        String completionEvent,
        String callbackUrl) {
}
