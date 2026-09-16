package com.onefinux.hub.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventBinder;
import com.onefinux.hub.event.EventContractException;
import com.onefinux.hub.event.EventContractValidator;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventLifecycleService;
import com.onefinux.hub.event.InboundEvent;
import com.onefinux.hub.event.IngestResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/** Where every source system publishes. 202 = accepted, 200 = duplicate (already had it, safe to ignore). */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventHubService hub;
    private final EventBinder binder;
    private final EventLifecycleService walks;

    public EventController(EventHubService hub, EventBinder binder, EventLifecycleService walks) {
        this.hub = hub;
        this.binder = binder;
        this.walks = walks;
    }

    @PostMapping
    public ResponseEntity<IngestResult> publish(@RequestBody JsonNode body) {
        InboundEvent event = validateAndBind(body);
        IngestResult result = hub.ingest(event);
        return ResponseEntity.status(result.isDuplicate() ? HttpStatus.OK : HttpStatus.ACCEPTED)
                .header("X-Onefinux-Contract", EventContractValidator.CONTRACT)
                .body(result);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<IngestResult>> publishBatch(@RequestBody List<JsonNode> events) {
        List<IngestResult> results = new ArrayList<>();
        for (JsonNode body : events) {
            results.add(hub.ingest(validateAndBind(body)));
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .header("X-Onefinux-Contract", EventContractValidator.CONTRACT)
                .body(results);
    }

    /** Validate against the versioned gateway contract first, then bind to the typed event. */
    private InboundEvent validateAndBind(JsonNode body) {
        try {
            return binder.bindApi(body);
        } catch (IllegalArgumentException e) {
            throw new EventContractException(List.of(rootReason(e)));
        }
    }

    private static String rootReason(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? e.toString() : cause.getMessage();
    }

    @GetMapping("/lifecycle")
    public java.util.Map<String, Object> lifecycle(@RequestParam(required = false) String id) {
        if (id == null || id.isBlank()) {
            return walks.latest();
        }
        return walks.of(id);
    }

    @GetMapping("/lifecycle/tape")
    public java.util.List<java.util.Map<String, Object>> lifecycleTape(@RequestParam(defaultValue = "40") int limit) {
        return walks.recent(limit);
    }

    @GetMapping
    public List<BusinessEvent> recent(@RequestParam(defaultValue = "100") int limit) {
        return hub.recent(limit);
    }
}
