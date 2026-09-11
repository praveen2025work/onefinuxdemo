package com.onefinux.hub.outcome;

import java.util.List;

public record DependencyView(
        String eventType,
        String label,
        String sourceSystem,
        int expected,
        int completed,
        int pending,
        List<String> completedKeys,
        List<String> failedKeys,
        boolean overridden,
        String overrideReason,
        String overriddenBy) {
}
