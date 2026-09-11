package com.onefinux.hub.outcome;

import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Tracks one dependency of one outcome instance, e.g. "300 master books from Motif".
 * Counting is by DISTINCT source key, so a producer re-sending MB017 never double counts.
 */
class DependencyProgress {

    private final DependencyDefinition definition;
    private final Set<String> completed = new LinkedHashSet<>();
    private final Set<String> failed = new LinkedHashSet<>();
    private String overrideReason;
    private String overriddenBy;

    DependencyProgress(DependencyDefinition definition) {
        this.definition = definition;
    }

    DependencyDefinition definition() {
        return definition;
    }

    void complete(String key) {
        completed.add(key);
        failed.remove(key);
    }

    void fail(String key) {
        failed.add(key);
        completed.remove(key);
    }

    void revoke(String key) {
        completed.remove(key);
    }

    void override(String reason, String by) {
        this.overrideReason = reason;
        this.overriddenBy = by;
    }

    boolean overridden() {
        return overrideReason != null;
    }

    int expected() {
        return definition.expectedCount();
    }

    int completedCount() {
        return overridden() ? expected() : Math.min(completed.size(), expected());
    }

    int pending() {
        return expected() - completedCount();
    }

    boolean satisfied() {
        return completedCount() >= expected();
    }

    boolean hasFailures() {
        return !overridden() && !failed.isEmpty();
    }

    Set<String> failedKeys() {
        return failed;
    }

    String label() {
        return definition.label() != null ? definition.label() : definition.eventType();
    }

    DependencyView view() {
        return new DependencyView(definition.eventType(), label(), definition.sourceSystem(), expected(),
                completedCount(), pending(), new ArrayList<>(completed), new ArrayList<>(failed),
                overridden(), overrideReason, overriddenBy);
    }
}
