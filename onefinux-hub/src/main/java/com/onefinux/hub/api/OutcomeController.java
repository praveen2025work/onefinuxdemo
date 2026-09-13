package com.onefinux.hub.api;

import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeProjectionRepository;
import com.onefinux.hub.outcome.OutcomeView;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** "Can I produce the 15C3 report?" answered as an API. */
@RestController
@RequestMapping("/api/outcomes")
public class OutcomeController {

    private final OutcomeEngine engine;
    private final OutcomeProjectionRepository projection;

    public OutcomeController(OutcomeEngine engine, OutcomeProjectionRepository projection) {
        this.engine = engine;
        this.projection = projection;
    }

    @GetMapping
    public List<OutcomeView> all() {
        return engine.views();
    }

    /** Durable read model: the last persisted board, served straight from the DB (no engine state). */
    @GetMapping("/projection")
    public List<Map<String, Object>> projection() {
        return projection.all();
    }

    @GetMapping("/{outcomeId}/{cobDate}/{region}")
    public OutcomeView one(@PathVariable String outcomeId,
                           @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                           @PathVariable String region) {
        return engine.view(outcomeId, cobDate, region)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such outcome instance"));
    }
}
