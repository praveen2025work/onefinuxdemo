package com.onefinux.hub.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Turns an API body or a feed-watch file into an {@link InboundEvent}.
 * Feed files may be CloudEvents ({@code feed-event-v1}) or a raw {@code inbound-event-v1} object.
 * POST /api/events always uses the inbound contract (no envelope).
 */
@Component
public class EventBinder {

    public static final String CHANNEL_API = "API";
    public static final String CHANNEL_FEED = "FEED";
    public static final String ATTR_CHANNEL = "ingestChannel";

    private final ObjectMapper mapper;
    private final EventContractValidator contract;

    public EventBinder(ObjectMapper mapper, EventContractValidator contract) {
        this.mapper = mapper;
        this.contract = contract;
    }

    public InboundEvent bind(JsonNode body, String channel) {
        JsonNode payload = body;
        String envelopeId = null;
        if (body != null && body.hasNonNull("specversion")) {
            contract.validateFeed(body);
            payload = body.get("data");
            envelopeId = text(body, "id");
        } else {
            contract.validate(body);
        }
        InboundEvent raw = mapper.convertValue(payload, InboundEvent.class);
        Map<String, Object> attrs = new HashMap<>();
        if (raw.attributes() != null) {
            attrs.putAll(raw.attributes());
        }
        attrs.put(ATTR_CHANNEL, channel);
        String eventId = raw.eventId();
        if ((eventId == null || eventId.isBlank()) && envelopeId != null) {
            eventId = envelopeId;
        }
        return new InboundEvent(eventId, raw.eventType(), raw.sourceSystem(), raw.sourceKey(),
                raw.cobDate(), raw.region(), raw.status(), raw.occurredAt(), attrs);
    }

    public InboundEvent bindApi(JsonNode body) {
        if (body != null && body.hasNonNull("specversion")) {
            throw new EventContractException(java.util.List.of(
                    "POST /api/events accepts inbound-event-v1, not a CloudEvents envelope"));
        }
        return bind(body, CHANNEL_API);
    }

    public InboundEvent bindFeed(JsonNode body) {
        return bind(body, CHANNEL_FEED);
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    static JsonNode stampChannel(ObjectNode node, String channel) {
        ObjectNode attrs = node.has("attributes") && node.get("attributes").isObject()
                ? (ObjectNode) node.get("attributes")
                : node.putObject("attributes");
        attrs.put(ATTR_CHANNEL, channel);
        return node;
    }
}
