package com.onefinux.hub.api;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.outcome.ReportDocument;
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
    private final OneFinUxProperties properties;

    public OutcomeController(OutcomeEngine engine, OneFinUxProperties properties) {
        this.engine = engine;
        this.properties = properties;
    }

    @GetMapping
    public List<OutcomeView> all() {
        return engine.views();
    }

    /**
     * The kit registry: every outcome definition the platform folds — its business question, input
     * feeds (with expected counts), SLA and on-ready action. This is the configuration that drives the
     * engine, surfaced so the console can show what each outcome depends on.
     */
    @GetMapping("/definitions")
    public List<OutcomeDefinition> definitions() {
        return properties.outcomes();
    }

    @GetMapping("/{outcomeId}/{cobDate}/{region}")
    public OutcomeView one(@PathVariable String outcomeId,
                           @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                           @PathVariable String region) {
        return engine.view(outcomeId, cobDate, region)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such outcome instance"));
    }

    /**
     * The generated report, once it is available to view. Returns 404 if the instance is unknown and 409
     * ("not available yet") while the outcome is still gathering feeds, ready, or processing.
     */
    @GetMapping("/{outcomeId}/{cobDate}/{region}/report")
    public ReportDocument report(@PathVariable String outcomeId,
                                 @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate,
                                 @PathVariable String region) {
        OutcomeView view = engine.view(outcomeId, cobDate, region)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such outcome instance"));
        if (view.report() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Report is not available yet (stage " + view.stage() + ")");
        }
        return ReportDocument.from(view);
    }
}
