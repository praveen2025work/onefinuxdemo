package com.onefinux.hub.outcome;

/**
 * Everything that can happen to a business outcome. Notifiable transitions become user notifications;
 * PROGRESS only refreshes the live board (no one wants 300 "master book ready" alerts).
 */
public enum Transition {
    PROGRESS(Severity.INFO, false),
    STARTED(Severity.INFO, true),
    MILESTONE(Severity.INFO, true),
    AT_RISK(Severity.WARN, true),
    SLA_BREACHED(Severity.CRITICAL, true),
    BLOCKED(Severity.CRITICAL, true),
    UNBLOCKED(Severity.INFO, true),
    READY(Severity.SUCCESS, true),
    ACTION_TRIGGERED(Severity.INFO, true),
    ACTION_FAILED(Severity.CRITICAL, true),
    COMPLETED(Severity.SUCCESS, true),
    REVOKED(Severity.CRITICAL, true),
    OVERRIDDEN(Severity.WARN, true);

    private final Severity severity;
    private final boolean notifiable;

    Transition(Severity severity, boolean notifiable) {
        this.severity = severity;
        this.notifiable = notifiable;
    }

    public Severity severity() {
        return severity;
    }

    public boolean notifiable() {
        return notifiable;
    }
}
