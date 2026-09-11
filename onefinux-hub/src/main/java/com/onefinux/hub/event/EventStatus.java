package com.onefinux.hub.event;

/**
 * Status semantics every producer must follow.
 * REVOKED is the important one for finance: a rerun or restatement withdraws something that was
 * previously complete, and every outcome that relied on it must lose its readiness.
 */
public enum EventStatus {
    STARTED,
    COMPLETED,
    FAILED,
    REVOKED
}
