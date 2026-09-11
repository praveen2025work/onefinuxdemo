package com.onefinux.hub.api;

import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.InboundEvent;
import com.onefinux.hub.event.IngestResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Where every source system publishes. 202 = accepted, 200 = duplicate (already had it, safe to ignore). */
@RestController
@Validated
@RequestMapping("/api/events")
public class EventController {

    private final EventHubService hub;

    public EventController(EventHubService hub) {
        this.hub = hub;
    }

    @PostMapping
    public ResponseEntity<IngestResult> publish(@Valid @RequestBody InboundEvent event) {
        IngestResult result = hub.ingest(event);
        return ResponseEntity.status(result.isDuplicate() ? HttpStatus.OK : HttpStatus.ACCEPTED).body(result);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<IngestResult>> publishBatch(@RequestBody List<@Valid InboundEvent> events) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(events.stream().map(hub::ingest).toList());
    }

    @GetMapping
    public List<BusinessEvent> recent(@RequestParam(defaultValue = "100") int limit) {
        return hub.recent(limit);
    }
}
