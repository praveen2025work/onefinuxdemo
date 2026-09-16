package com.onefinux.hub.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SchemaValidatorsConfig;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;
import java.util.Set;

/**
 * Gateway contract validation. Every externally-published event is checked against the versioned
 * inbound JSON-Schema (contracts/inbound-event-v1.schema.json) before it is trusted and folded, so a
 * malformed producer is rejected at the edge with a precise, machine-readable reason (RFC 7807) rather
 * than corrupting the event store. Platform-internal workflow events bypass this (they are hub-generated).
 */
@Component
public class EventContractValidator {

    public static final String CONTRACT = "inbound-event/v1";
    public static final String FEED_CONTRACT = "feed-event/v1";

    private final JsonSchema inbound;
    private final JsonSchema feed;

    public EventContractValidator() {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
        SchemaValidatorsConfig config = SchemaValidatorsConfig.builder().build();
        this.inbound = load(factory, config, "contracts/inbound-event-v1.schema.json");
        this.feed = load(factory, config, "contracts/feed-event-v1.schema.json");
    }

    private static JsonSchema load(JsonSchemaFactory factory, SchemaValidatorsConfig config, String resource) {
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            return factory.getSchema(in, config);
        } catch (Exception e) {
            throw new IllegalStateException("Could not load event contract schema " + resource, e);
        }
    }

    /** @throws EventContractException with all violations if the payload does not satisfy inbound-event-v1. */
    public void validate(JsonNode payload) {
        check(inbound, payload);
    }

    /** @throws EventContractException if the payload does not satisfy feed-event-v1. */
    public void validateFeed(JsonNode payload) {
        check(feed, payload);
    }

    private static void check(JsonSchema schema, JsonNode payload) {
        Set<ValidationMessage> messages = schema.validate(payload);
        if (!messages.isEmpty()) {
            List<String> violations = messages.stream().map(ValidationMessage::getMessage).sorted().toList();
            throw new EventContractException(violations);
        }
    }
}
