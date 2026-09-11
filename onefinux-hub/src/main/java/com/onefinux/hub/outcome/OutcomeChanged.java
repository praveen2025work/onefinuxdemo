package com.onefinux.hub.outcome;

/** Published by the engine; consumed by notifications, the workflow dispatcher and the live stream. */
public record OutcomeChanged(OutcomeView view, Transition transition, String title, String message) {
}
