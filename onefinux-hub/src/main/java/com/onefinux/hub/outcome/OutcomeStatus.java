package com.onefinux.hub.outcome;

public enum OutcomeStatus {
    NOT_STARTED,
    IN_PROGRESS,
    BLOCKED,
    READY,
    ACTION_RUNNING,
    ACTION_FAILED,
    COMPLETED;

    /** Every input is satisfied; the business can act (or already has). */
    public boolean readyOrBeyond() {
        return this == READY || this == ACTION_RUNNING || this == ACTION_FAILED || this == COMPLETED;
    }
}
