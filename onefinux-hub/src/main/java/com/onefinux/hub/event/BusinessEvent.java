package com.onefinux.hub.event;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/** An inbound event after translation into the common business language. */
public record BusinessEvent(
        String eventId,
        String eventType,
        String sourceSystem,
        String sourceKey,
        String businessIdType,
        String businessId,
        Map<String, String> crossReferences,
        LocalDate cobDate,
        String region,
        EventStatus status,
        Instant occurredAt,
        Instant receivedAt,
        Map<String, Object> attributes) {

    public String attribute(String name) {
        Object value = attributes == null ? null : attributes.get(name);
        return value == null ? null : String.valueOf(value);
    }
}
