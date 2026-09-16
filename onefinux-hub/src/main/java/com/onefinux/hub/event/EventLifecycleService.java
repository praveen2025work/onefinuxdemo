package com.onefinux.hub.event;

import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.stitch.StitchRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Walk one stored fact from the request we received through persist, translate, and the next state.
 */
@Service
public class EventLifecycleService {

    private final EventHubService hub;
    private final StitchRepository stitch;
    private final OutcomeEngine engine;

    public EventLifecycleService(EventHubService hub, StitchRepository stitch, OutcomeEngine engine) {
        this.hub = hub;
        this.stitch = stitch;
        this.engine = engine;
    }

    public Map<String, Object> latest() {
        List<BusinessEvent> recent = hub.recent(1);
        if (recent.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("eventId", null);
            empty.put("steps", List.of());
            empty.put("contracts", contracts());
            return empty;
        }
        return describe(recent.get(0));
    }

    public Map<String, Object> of(String eventId) {
        return hub.find(eventId)
                .map(this::describe)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown event"));
    }

    public List<Map<String, Object>> recent(int limit) {
        return hub.recent(limit).stream().map(ev -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("eventId", ev.eventId());
            row.put("eventType", ev.eventType());
            row.put("sourceSystem", ev.sourceSystem());
            row.put("sourceKey", ev.sourceKey());
            row.put("status", ev.status().name());
            row.put("channel", channel(ev));
            row.put("receivedAt", ev.receivedAt() == null ? null : ev.receivedAt().toString());
            return row;
        }).toList();
    }

    Map<String, Object> describe(BusinessEvent ev) {
        String channel = channel(ev);
        String instanceId = ev.attribute("instanceId");
        Map<String, Object> request = requestOf(ev);
        Map<String, Object> saved = new LinkedHashMap<>();
        saved.put("table", "event_store");
        saved.put("eventId", ev.eventId());
        saved.put("receivedAt", ev.receivedAt() == null ? null : ev.receivedAt().toString());
        saved.put("businessIdType", ev.businessIdType());
        saved.put("businessId", ev.businessId());
        saved.put("cobDate", ev.cobDate() == null ? null : ev.cobDate().toString());
        saved.put("region", ev.region());
        saved.put("status", ev.status().name());

        Map<String, Object> stitchView = null;
        String next = "Stored. No stitch instanceId and no matching engine feed.";
        if (instanceId != null && !instanceId.isBlank()) {
            Map<String, Object> inst = stitch.instance(instanceId);
            List<Map<String, Object>> keys = stitch.readinessKeys(instanceId);
            Map<String, Object> thisKey = keys.stream()
                    .filter(k -> ev.sourceSystem().equals(k.get("sourceId"))
                            && ev.sourceKey().equals(k.get("sourceKey")))
                    .findFirst().orElse(null);
            stitchView = new LinkedHashMap<>();
            stitchView.put("instanceId", instanceId);
            stitchView.put("status", inst == null ? null : inst.get("status"));
            stitchView.put("namedBlocker", inst == null ? null : inst.get("namedBlocker"));
            stitchView.put("key", thisKey);
            stitchView.put("keys", keys);
            if (inst != null) {
                next = "Instance " + instanceId + " is " + inst.get("status")
                        + (inst.get("namedBlocker") != null ? " (" + inst.get("namedBlocker") + ")" : "");
            }
        }

        List<Map<String, Object>> engineHits = new ArrayList<>();
        for (OutcomeView view : engine.views()) {
            boolean match = view.cobDate().equals(ev.cobDate())
                    && view.region().equalsIgnoreCase(ev.region())
                    && view.dependencies().stream().anyMatch(d ->
                    d.eventType().equalsIgnoreCase(ev.eventType()));
            if (match) {
                Map<String, Object> hit = new LinkedHashMap<>();
                hit.put("outcomeId", view.outcomeId());
                hit.put("stage", view.stage());
                hit.put("status", view.status() == null ? null : view.status().name());
                hit.put("percent", view.percent());
                engineHits.add(hit);
                if (instanceId == null) {
                    next = "Engine " + view.outcomeId() + " stage " + view.stage();
                }
            }
        }

        List<Map<String, String>> steps = new ArrayList<>();
        steps.add(step("receive", "Receive",
                CHANNEL_FEED.equals(channel) ? "Feed file in the inbox folder" : "POST /api/events"));
        steps.add(step("validate", "Validate",
                CHANNEL_FEED.equals(channel) ? "feed-event-v1 or inbound-event-v1" : "inbound-event-v1"));
        steps.add(step("persist", "Persist", "Append-only event_store row " + ev.eventId()));
        steps.add(step("translate", "Translate",
                ev.businessIdType() + " / " + ev.businessId()));
        steps.add(step("fold", "Fold",
                instanceId == null ? "Engine feed match on eventType + sourceSystem" : "Stitch readiness key " + ev.sourceSystem() + " " + ev.sourceKey()));
        steps.add(step("next", "Next state", next));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("eventId", ev.eventId());
        out.put("channel", channel);
        out.put("request", request);
        out.put("saved", saved);
        out.put("stitch", stitchView);
        out.put("engine", engineHits);
        out.put("next", next);
        out.put("steps", steps);
        out.put("contracts", contracts());
        return out;
    }

    private static String channel(BusinessEvent ev) {
        String c = ev.attribute(EventBinder.ATTR_CHANNEL);
        return c == null || c.isBlank() ? EventBinder.CHANNEL_API : c;
    }

    private static Map<String, Object> requestOf(BusinessEvent ev) {
        Map<String, Object> req = new LinkedHashMap<>();
        req.put("eventId", ev.eventId());
        req.put("eventType", ev.eventType());
        req.put("sourceSystem", ev.sourceSystem());
        req.put("sourceKey", ev.sourceKey());
        req.put("cobDate", ev.cobDate() == null ? null : ev.cobDate().toString());
        req.put("region", ev.region());
        req.put("status", ev.status().name());
        req.put("occurredAt", ev.occurredAt() == null ? null : ev.occurredAt().toString());
        req.put("attributes", ev.attributes());
        return req;
    }

    private static Map<String, String> step(String id, String title, String detail) {
        Map<String, String> s = new LinkedHashMap<>();
        s.put("id", id);
        s.put("title", title);
        s.put("detail", detail);
        return s;
    }

    private static Map<String, String> contracts() {
        Map<String, String> c = new LinkedHashMap<>();
        c.put("api", "inbound-event-v1");
        c.put("feed", "feed-event-v1");
        c.put("outbound", "generic-business-event-v1");
        return c;
    }

    private static final String CHANNEL_FEED = EventBinder.CHANNEL_FEED;
}
