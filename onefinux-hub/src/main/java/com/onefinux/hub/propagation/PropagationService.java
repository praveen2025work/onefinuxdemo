package com.onefinux.hub.propagation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventIngested;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Transactional-outbox writer. When a fact is ingested, every enabled route it matches gets one
 * {@code event_outbox} row (PENDING). The {@link OutboxRelay} dispatches those rows to the subscriber
 * systems at-least-once. Persisting the fact and enqueuing its fan-out in the same flow is what keeps
 * "what we stored" and "what we propagated" from drifting apart — the core of the audit story.
 *
 * <p>Replayed events (state rebuild at startup) are never re-propagated.
 */
@Service
public class PropagationService {

    private static final Logger log = LoggerFactory.getLogger(PropagationService.class);

    private final PropagationRepository repo;
    private final ObjectMapper mapper;
    private final MeterRegistry metrics;

    public PropagationService(PropagationRepository repo, ObjectMapper mapper, MeterRegistry metrics) {
        this.repo = repo;
        this.mapper = mapper;
        this.metrics = metrics;
    }

    @EventListener
    public void onEvent(EventIngested ingested) {
        if (ingested.replay()) {
            return; // rebuilding state, not receiving a new fact — do not fan out history again
        }
        BusinessEvent ev = ingested.event();
        List<Map<String, Object>> routes = repo.matchingRoutes(ev.eventType(), ev.sourceSystem());
        if (routes.isEmpty()) {
            return;
        }
        String payload = envelope(ev);
        for (Map<String, Object> route : routes) {
            repo.enqueue(UUID.randomUUID().toString().substring(0, 8), ev.eventId(),
                    str(route, "routeId"), str(route, "subscriber"), ev.eventType(), ev.sourceSystem(),
                    str(route, "targetUrl"), payload);
            metrics.counter("onefinux.propagation.enqueued", "subscriber", str(route, "subscriber")).increment();
        }
        log.info("propagation: {} {} queued to {} subscriber(s)", ev.sourceSystem(), ev.eventType(), routes.size());
    }

    /** CloudEvents 1.0 envelope around the generic fact — the same shape every subscriber receives. */
    private String envelope(BusinessEvent ev) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("eventType", ev.eventType());
        data.put("sourceSystem", ev.sourceSystem());
        data.put("sourceKey", ev.sourceKey());
        data.put("cobDate", ev.cobDate() == null ? null : ev.cobDate().toString());
        data.put("region", ev.region());
        data.put("status", ev.status() == null ? null : ev.status().name());
        data.put("attributes", ev.attributes());

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("specversion", "1.0");
        envelope.put("id", ev.eventId());
        envelope.put("source", ev.sourceSystem() == null ? null : ev.sourceSystem().toLowerCase());
        envelope.put("type", "onefinux.fact.v1");
        envelope.put("time", ev.occurredAt() == null ? null : ev.occurredAt().toString());
        envelope.put("datacontenttype", "application/json");
        envelope.put("data", data);
        try {
            return mapper.writeValueAsString(envelope);
        } catch (Exception e) {
            return "{\"id\":\"" + ev.eventId() + "\"}";
        }
    }

    private static String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
