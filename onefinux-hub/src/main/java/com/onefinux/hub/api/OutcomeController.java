package com.onefinux.hub.api;

import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeProjectionRepository;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.outcome.ReportDocument;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** "Can I produce the 15C3 report?" answered as an API. */
@RestController
@RequestMapping("/api/outcomes")
public class OutcomeController {

    private final OutcomeEngine engine;
    private final OutcomeProjectionRepository projection;
    private final Clock clock;

    public OutcomeController(OutcomeEngine engine, OutcomeProjectionRepository projection, Clock clock) {
        this.engine = engine;
        this.projection = projection;
        this.clock = clock;
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

    /**
     * The kit registry: every outcome definition the platform folds — its business question, input
     * feeds (with expected counts), SLA and on-ready action. Includes both the seeded outcomes and any
     * onboarded at runtime, so the console can show what each outcome depends on.
     */
    @GetMapping("/definitions")
    public List<OutcomeDefinition> definitions() {
        return engine.definitions();
    }

    /**
     * Onboard a new business outcome as data. In production this is gated by maker-checker; here it lets
     * an operator define a question, its input feeds, an SLA and an optional on-ready action, and
     * immediately see the outcome fold live on the Board and Reports for the given COB (defaults to today).
     */
    @PostMapping("/definitions")
    @ResponseStatus(HttpStatus.CREATED)
    public OutcomeView register(@RequestBody OutcomeDefinition definition,
                                @RequestParam(required = false)
                                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cobDate) {
        if (isBlank(definition.id()) || isBlank(definition.name()) || isBlank(definition.question())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id, name and question are required");
        }
        if (definition.dependencies().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An outcome needs at least one input feed");
        }
        LocalDate cob = cobDate != null ? cobDate : LocalDate.now(clock);
        try {
            return engine.register(definition, cob);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
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
