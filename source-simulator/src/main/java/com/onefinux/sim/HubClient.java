package com.onefinux.sim;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** What a source system's publisher looks like: fire the event at the hub, log, never block the business process. */
@Component
public class HubClient {

    private static final Logger log = LoggerFactory.getLogger(HubClient.class);

    private final RestClient rest;

    public HubClient(RestClient.Builder builder, SimProperties properties) {
        this.rest = builder.baseUrl(properties.hubUrl()).build();
    }

    public void publish(OutboundEvent event) {
        try {
            rest.post().uri("/api/events").contentType(MediaType.APPLICATION_JSON).body(event)
                    .retrieve().toBodilessEntity();
            log.info("{} -> {} {} {}", event.sourceSystem(), event.eventType(), event.sourceKey(), event.status());
        } catch (Exception e) {
            // A real producer would write to an outbox table and retry; the eventId keeps retries idempotent.
            log.warn("Hub unreachable for {} {}: {}", event.eventType(), event.sourceKey(), e.getMessage());
        }
    }
}
