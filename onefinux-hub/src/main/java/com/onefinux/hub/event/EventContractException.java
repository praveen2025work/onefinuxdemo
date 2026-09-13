package com.onefinux.hub.event;

import java.util.List;

/** Thrown when an inbound event fails the gateway JSON-Schema contract. Carries the violations for RFC 7807. */
public class EventContractException extends RuntimeException {

    private final List<String> violations;

    public EventContractException(List<String> violations) {
        super("Event failed contract validation: " + String.join("; ", violations));
        this.violations = List.copyOf(violations);
    }

    public List<String> violations() {
        return violations;
    }
}
