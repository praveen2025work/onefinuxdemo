package com.onefinux.hub.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * The canonical contract a source system publishes (see contracts/business-event.schema.json).
 *
 * @param eventId    producer-assigned id; re-sending the same id is safe (idempotent)
 * @param eventType  governed name from the event catalogue, e.g. MASTERBOOK_READY
 * @param sourceKey  the source's own identifier (master book, cost centre, batch, feed)
 * @param cobDate    business date the event belongs to
 * @param region     processing scope, e.g. AMRS, EMEA, APAC, GLOBAL
 */
public record InboundEvent(
        String eventId,
        @NotBlank String eventType,
        @NotBlank String sourceSystem,
        @NotBlank String sourceKey,
        @NotNull LocalDate cobDate,
        @NotBlank String region,
        @NotNull EventStatus status,
        Instant occurredAt,
        Map<String, Object> attributes) {
}
