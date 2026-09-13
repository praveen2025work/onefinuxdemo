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

    private final JsonSchema schema;

    public EventContractValidator() {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
        SchemaValidatorsConfig config = SchemaValidatorsConfig.builder().build();
        try (InputStream in = new ClassPathResource("contracts/inbound-event-v1.schema.json").getInputStream()) {
            this.schema = factory.getSchema(in, config);
        } catch (Exception e) {
            throw new IllegalStateException("Could not load inbound event contract schema", e);
        }
    }

    /** @throws EventContractException with all violations if the payload does not satisfy the contract. */
    public void validate(JsonNode payload) {
        Set<ValidationMessage> messages = schema.validate(payload);
        if (!messages.isEmpty()) {
            List<String> violations = messages.stream().map(ValidationMessage::getMessage).sorted().toList();
            throw new EventContractException(violations);
        }
    }
}
