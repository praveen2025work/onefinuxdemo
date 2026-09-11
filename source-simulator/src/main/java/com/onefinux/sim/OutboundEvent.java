package com.onefinux.sim;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/** The canonical business event, as a producer sends it. Mirrors contracts/business-event.schema.json. */
public record OutboundEvent(
        String eventId,
        String eventType,
        String sourceSystem,
        String sourceKey,
        LocalDate cobDate,
        String region,
        String status,
        Instant occurredAt,
        Map<String, Object> attributes) {
}
