package com.onefinux.hub.event;

/** In-process notification that an event was accepted. replay=true during state rebuild at startup. */
public record EventIngested(BusinessEvent event, boolean replay) {
}
