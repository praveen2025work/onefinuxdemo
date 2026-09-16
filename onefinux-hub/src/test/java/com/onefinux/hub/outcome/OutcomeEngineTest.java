package com.onefinux.hub.outcome;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.config.OneFinUxProperties.Sla;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OutcomeEngineTest {

    private static final LocalDate COB = LocalDate.of(2026, 9, 10);
    private static final Instant T0 = Instant.parse("2026-09-10T20:00:00Z");

    private final List<OutcomeChanged> changes = new ArrayList<>();
    private OutcomeEngine engine;
    private int tick;

    @BeforeEach
    void setUp() {
        OutcomeDefinition report = new OutcomeDefinition("REPORT_15C3", "15C3 report", "Can I produce the 15C3 report?",
                List.of("AMRS"), "US Regulatory Reporting", new Sla(null, 0, 60),
                List.of(new DependencyDefinition("SAP_TB_COMPLETE", "SAP", 2, "SAP trial balance"),
                        new DependencyDefinition("USCASTLE_COMPLETE", "USCASTLE", 2, "US Castle batches")),
                new OnReady("HTTP_COMMAND", "axiom", "REG_REPORT_GENERATED", "15C3 report generation"), List.of());
        OutcomeDefinition pnl = new OutcomeDefinition("PNL_REPORTING", "PnL reporting", "Can I run PnL reporting?",
                List.of("AMRS"), "Product Control", null,
                List.of(new DependencyDefinition("SAP_TB_COMPLETE", "SAP", 2, "SAP trial balance")),
                new OnReady("NOTIFY_ONLY", null, null, null), List.of());
        OneFinUxProperties props = new OneFinUxProperties("America/New_York", null, null, null,
                List.of(report, pnl), null, null);
        engine = new OutcomeEngine(props, e -> changes.add((OutcomeChanged) e),
                Clock.fixed(T0, ZoneId.of("America/New_York")), new SimpleMeterRegistry());
        engine.initialise(COB);
    }

    @Test
    void becomesReadyOnlyWhenEveryDistinctInputHasArrived() {
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);   // re-sent: must not double count
        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-01", EventStatus.COMPLETED);
        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-02", EventStatus.COMPLETED);
        assertThat(report().status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
        assertThat(report().percent()).isEqualTo(75);

        send("SAP_TB_COMPLETE", "SAP", "CC-4420", EventStatus.COMPLETED);

        assertThat(report().status()).isEqualTo(OutcomeStatus.READY);
        assertThat(transitions()).contains(Transition.STARTED, Transition.READY);
    }

    @Test
    void oneEventFeedsEveryOutcomeThatDependsOnIt() {
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);
        send("SAP_TB_COMPLETE", "SAP", "CC-4420", EventStatus.COMPLETED);

        assertThat(engine.view("PNL_REPORTING", COB, "AMRS").orElseThrow().status()).isEqualTo(OutcomeStatus.READY);
        assertThat(report().status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
    }

    @Test
    void failureBlocksAndRetryUnblocks() {
        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-01", EventStatus.FAILED);
        assertThat(report().status()).isEqualTo(OutcomeStatus.BLOCKED);

        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-01", EventStatus.COMPLETED);
        assertThat(report().status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
        assertThat(transitions()).contains(Transition.BLOCKED, Transition.UNBLOCKED);
    }

    @Test
    void restatementWithdrawsReadinessFromEveryDependentOutcome() {
        completeAll();
        assertThat(report().status()).isEqualTo(OutcomeStatus.READY);

        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.REVOKED);

        assertThat(report().status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
        assertThat(engine.view("PNL_REPORTING", COB, "AMRS").orElseThrow().status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
        assertThat(changes.stream().filter(c -> c.transition() == Transition.REVOKED).count()).isEqualTo(2);
    }

    @Test
    void downstreamCompletionClosesTheOutcomeAndStaleRunsAreIgnored() {
        completeAll();
        workflow(OutcomeEngine.ACTION_TRIGGERED_EVENT, "RUN-2", Map.of("outcomeId", "REPORT_15C3"));
        assertThat(report().status()).isEqualTo(OutcomeStatus.ACTION_RUNNING);

        send("REG_REPORT_GENERATED", "AXIOM", "RUN-1", EventStatus.COMPLETED,
                Map.of("correlationId", report().key(), "runId", "RUN-1"));
        assertThat(report().status()).isEqualTo(OutcomeStatus.ACTION_RUNNING);

        send("REG_REPORT_GENERATED", "AXIOM", "RUN-2", EventStatus.COMPLETED,
                Map.of("correlationId", report().key(), "runId", "RUN-2", "summary", "Report RPT-1 generated"));
        assertThat(report().status()).isEqualTo(OutcomeStatus.COMPLETED);
        assertThat(report().resultSummary()).isEqualTo("Report RPT-1 generated");
    }

    @Test
    void manualOverrideSatisfiesADependencyAndIsAnnounced() {
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);
        send("SAP_TB_COMPLETE", "SAP", "CC-4420", EventStatus.COMPLETED);
        workflow(OutcomeEngine.OVERRIDE_EVENT, "OVR-1", Map.of("outcomeId", "REPORT_15C3",
                "dependency", "USCASTLE_COMPLETE", "reason", "Batch confirmed by ops", "requestedBy", "controller1"));

        assertThat(report().status()).isEqualTo(OutcomeStatus.READY);
        assertThat(transitions()).contains(Transition.OVERRIDDEN);
    }

    @Test
    void replayRebuildsStateWithoutNotifyingAnyone() {
        for (String key : List.of("CC-4410", "CC-4420")) {
            engine.apply(event("SAP_TB_COMPLETE", "SAP", key, EventStatus.COMPLETED, Map.of()), true);
        }
        assertThat(engine.view("PNL_REPORTING", COB, "AMRS").orElseThrow().status()).isEqualTo(OutcomeStatus.READY);
        assertThat(changes).isEmpty();
    }

    @Test
    void etaIsProjectedFromThisCobArrivalsAndIsNotReadiness() {
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);
        send("SAP_TB_COMPLETE", "SAP", "CC-4420", EventStatus.COMPLETED);
        OutcomeView v = report();
        assertThat(v.status()).isEqualTo(OutcomeStatus.IN_PROGRESS);
        assertThat(v.etaBasis()).isEqualTo("LIVE");
        assertThat(v.eta()).isNotNull();
        assertThat(v.historicSamples()).isZero();
    }

    @Test
    void etaUsesHistoricP50FromAPriorCobWhenThisCobHasTooFewArrivals() {
        completeAll();
        assertThat(report().status()).isEqualTo(OutcomeStatus.READY);
        assertThat(report().eta()).isNull();

        LocalDate next = COB.plusDays(1);
        engine.apply(eventOn(next, "SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED, Map.of()), false);
        OutcomeView nextView = engine.view("REPORT_15C3", next, "AMRS").orElseThrow();
        assertThat(nextView.etaBasis()).isEqualTo("HISTORIC");
        assertThat(nextView.historicSamples()).isEqualTo(1);
        assertThat(nextView.eta()).isNotNull();
        assertThat(nextView.historicP50()).isNotNull();
    }

    // ---------------------------------------------------------------- helpers

    private void completeAll() {
        send("SAP_TB_COMPLETE", "SAP", "CC-4410", EventStatus.COMPLETED);
        send("SAP_TB_COMPLETE", "SAP", "CC-4420", EventStatus.COMPLETED);
        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-01", EventStatus.COMPLETED);
        send("USCASTLE_COMPLETE", "USCASTLE", "BATCH-02", EventStatus.COMPLETED);
    }

    private OutcomeView report() {
        return engine.view("REPORT_15C3", COB, "AMRS").orElseThrow();
    }

    private List<Transition> transitions() {
        return changes.stream().map(OutcomeChanged::transition).toList();
    }

    private void send(String type, String source, String key, EventStatus status) {
        send(type, source, key, status, Map.of());
    }

    private void send(String type, String source, String key, EventStatus status, Map<String, Object> attributes) {
        engine.apply(event(type, source, key, status, attributes), false);
    }

    private void workflow(String type, String key, Map<String, Object> attributes) {
        engine.apply(event(type, "ONEFINUX", key, EventStatus.COMPLETED, attributes), false);
    }

    private BusinessEvent event(String type, String source, String key, EventStatus status, Map<String, Object> attributes) {
        return eventOn(COB, type, source, key, status, attributes);
    }

    private BusinessEvent eventOn(LocalDate cob, String type, String source, String key, EventStatus status,
                                  Map<String, Object> attributes) {
        Instant at = T0.plusSeconds(++tick);
        return new BusinessEvent(UUID.randomUUID().toString(), type, source, key, "SOURCE_KEY", key, Map.of(),
                cob, "AMRS", status, at, at, attributes);
    }
}
