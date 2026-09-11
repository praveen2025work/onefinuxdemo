package com.onefinux.hub.translation;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.CrossReference;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.InboundEvent;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Component 2 - Event Translation Layer.
 * Motif speaks Master Book, SAP speaks Cost Centre, GMIS speaks Book ID, RAM speaks Chorus Group.
 * This service stamps every event with its business identifier type and any known cross references
 * so the outcome engine can correlate events across systems.
 *
 * POC: mappings come from application.yml. Production: effective-dated reference tables, so a replay
 * uses the mapping that was valid on the event's COB date.
 */
@Service
public class TranslationService {

    private static final String UNMAPPED = "SOURCE_KEY";

    private final Map<String, String> identifierTypeBySource = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    private final Map<String, Map<String, String>> crossReferences = new HashMap<>();

    public TranslationService(OneFinUxProperties properties) {
        identifierTypeBySource.putAll(properties.translation().sourceIdentifiers());
        for (CrossReference ref : properties.translation().crossReferences()) {
            crossReferences
                    .computeIfAbsent(key(ref.fromType(), ref.fromId()), k -> new LinkedHashMap<>())
                    .put(ref.toType(), ref.toId());
        }
    }

    public BusinessEvent translate(InboundEvent in, String eventId, Instant receivedAt) {
        String identifierType = identifierTypeBySource.getOrDefault(in.sourceSystem().trim(), UNMAPPED);
        Map<String, String> refs = crossReferences.getOrDefault(key(identifierType, in.sourceKey().trim()), Map.of());
        return new BusinessEvent(
                eventId,
                in.eventType().trim().toUpperCase(),
                in.sourceSystem().trim().toUpperCase(),
                in.sourceKey().trim(),
                identifierType,
                in.sourceKey().trim(),
                refs,
                in.cobDate(),
                in.region().trim().toUpperCase(),
                in.status(),
                in.occurredAt() != null ? in.occurredAt() : receivedAt,
                receivedAt,
                in.attributes() == null ? Map.of() : in.attributes());
    }

    private static String key(String type, String id) {
        return (type + "/" + id).toUpperCase();
    }
}
