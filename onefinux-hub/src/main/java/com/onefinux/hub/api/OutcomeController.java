package com.onefinux.hub.api;

import com.onefinux.hub.outcome.OutcomeEngine;
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

/** "Can I produce the 15C3 report?" answered as an API. */
@RestController
@RequestMapping("/api/outcomes")
public class OutcomeController {

    private final OutcomeEngine engine;

    public OutcomeController(OutcomeEngine engine) {
        this.engine = engine;
    }

    @GetMapping
    public List<OutcomeView> all() {
        return engine.views();
    }

    @GetMapping("/{outcomeId}/{cobDate}/{region}")
    public OutcomeView one(@PathVariable String outcomeId,
                           @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                           @PathVariable String region) {
        return engine.view(outcomeId, cobDate, region)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such outcome instance"));
    }
}
