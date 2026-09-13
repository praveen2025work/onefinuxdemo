package com.onefinux.sim;

import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Demo scenarios that reproduce the examples in the One Finance UX vision document.
 * Events are built at send time so occurredAt is real, which is what drives the ETA.
 */
@Service
public class ScenarioService {

    public record ScenarioRun(String scenario, LocalDate cobDate, int eventsScheduled, int durationSeconds, String story) {
    }

    private final HubClient hub;
    private final ZoneId zone;
    private final Random random = new Random();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final List<ScheduledFuture<?>> pending = new CopyOnWriteArrayList<>();

    public ScenarioService(HubClient hub, SimProperties properties) {
        this.hub = hub;
        this.zone = ZoneId.of(properties.zone());
    }

    public static final String INST_READY = "FOBO|2026-09-12|APAC|R-1042";
    public static final String INST_BLOCKED = "FOBO|2026-09-12|EMEA|R-2031";

    /**
     * The worked example. Systems of record publish stitch facts that carry the outcome instance id:
     * R-1042 gets all three origins (then Helix echoes the run) and folds to READY; R-2031 gets a
     * MOTIF rejection (MB014) and folds to BLOCKED. Reset the hub first: POST /api/stitch/reset.
     */
    public ScenarioRun fobo() {
        LocalDate cob = LocalDate.parse("2026-09-12");
        at(800,  () -> stitch("TRADE_BOOKED",            "CATS",  "TR-9901", cob, "EMEA", "COMPLETED", INST_BLOCKED));
        at(1200, () -> stitch("TRADE_BOOKED",            "CATS",  "TR-8812", cob, "APAC", "COMPLETED", INST_READY));
        at(2600, () -> stitch("BREAK_CLEARED",           "MBR",   "BK-4420", cob, "EMEA", "COMPLETED", INST_BLOCKED));
        at(3000, () -> stitch("BREAK_CLEARED",           "MBR",   "BK-4410", cob, "APAC", "COMPLETED", INST_READY));
        at(4200, () -> stitch("LEDGER_POSTED",           "MOTIF", "MB012",   cob, "APAC", "COMPLETED", INST_READY));
        at(5200, () -> stitch("LEDGER_REJECTED",         "MOTIF", "MB014",   cob, "EMEA", "FAILED",    INST_BLOCKED));
        at(6800, () -> stitch("HELIX_ANALYSIS_COMPLETE", "HELIX", "RUN-A37C", cob, "APAC", "COMPLETED", INST_READY));
        return new ScenarioRun("fobo", cob, 7, 7,
                "CATS/MOTIF/MBR drive R-1042 to READY (Helix echoes RUN-A37C) and R-2031 to BLOCKED (MOTIF MB014 FAILED).");
    }

    private OutboundEvent stitch(String type, String source, String key, LocalDate cob, String region,
                                 String status, String instanceId) {
        return new OutboundEvent(UUID.randomUUID().toString(), type, source, key, cob, region, status,
                Instant.now(), Map.of("instanceId", instanceId));
    }

    /** Section 7 of the vision: 300 master books arrive from Motif, then Helix is triggered automatically. */
    public ScenarioRun helix(int masterBooks, int seconds) {
        LocalDate cob = today();
        List<Integer> order = new ArrayList<>();
        for (int i = 1; i <= masterBooks; i++) {
            order.add(i);
        }
        Collections.shuffle(order, random);
        for (int slot = 0; slot < order.size(); slot++) {
            String book = "MB%03d".formatted(order.get(slot));
            long delay = Math.max(0, (long) ((slot + 1) * (seconds * 1000.0 / masterBooks)) + random.nextInt(300) - 150);
            at(delay, () -> event("MASTERBOOK_READY", "MOTIF", book, cob, "GLOBAL", "COMPLETED",
                    Map.of("masterBook", book)));
        }
        return new ScenarioRun("helix", cob, masterBooks, seconds,
                masterBooks + " master books publish MASTERBOOK_READY; at 100% the hub triggers Helix, which reports back.");
    }

    /** Section 8 of the vision: 15C3 needs SAP TB, US Castle, Finance Store and Axiom (5 each = 20 events). */
    public ScenarioRun report15c3(boolean withFailure) {
        LocalDate cob = today();
        List<String[]> inputs = new ArrayList<>();
        for (String cc : List.of("CC-4410", "CC-4420", "CC-4430", "CC-4440", "CC-4450")) {
            inputs.add(new String[]{"SAP_TB_COMPLETE", "SAP", cc});
        }
        for (int i = 1; i <= 5; i++) {
            inputs.add(new String[]{"USCASTLE_COMPLETE", "USCASTLE", "BATCH-0" + i});
        }
        for (String feed : List.of("FEED-GL", "FEED-SUBLEDGER", "FEED-POSITIONS", "FEED-CASH", "FEED-STOCKLOAN")) {
            inputs.add(new String[]{"FINSTORE_LOADED", "FINSTORE", feed});
        }
        for (String schedule : List.of("SCHED-A", "SCHED-B", "SCHED-C", "SCHED-D", "SCHED-E")) {
            inputs.add(new String[]{"AXIOM_READY", "AXIOM", schedule});
        }
        Collections.shuffle(inputs, random);
        int seconds = 40;
        for (int slot = 0; slot < inputs.size(); slot++) {
            String[] in = inputs.get(slot);
            long delay = (slot + 1) * 2000L;
            boolean failThisOne = withFailure && "BATCH-03".equals(in[2]);
            at(delay, () -> event(in[0], in[1], in[2], cob, "AMRS", failThisOne ? "FAILED" : "COMPLETED",
                    failThisOne ? Map.of("error", "Position file checksum mismatch") : Map.of()));
            if (failThisOne) {
                at(delay + 12_000, () -> event(in[0], in[1], in[2], cob, "AMRS", "COMPLETED",
                        Map.of("note", "Re-run after checksum fix")));
                seconds = Math.max(seconds, (int) ((delay + 12_000) / 1000));
            }
        }
        return new ScenarioRun(withFailure ? "15c3-with-failure" : "15c3", cob, inputs.size() + (withFailure ? 1 : 0),
                seconds, withFailure
                        ? "US Castle BATCH-03 fails (15C3 blocked, owner alerted), then succeeds 12s later on re-run."
                        : "20 inputs across SAP, US Castle, Finance Store and Axiom; at 100% the hub asks Axiom to generate the report.");
    }

    /** PnL shares SAP TB with 15C3 and has a tight 1 minute SLA, so it shows at-risk and breach alerts. */
    public ScenarioRun pnl() {
        LocalDate cob = today();
        at(10_000, () -> event("RAM_CHORUS_READY", "RAM", "CG-RATES", cob, "AMRS", "COMPLETED", Map.of()));
        at(20_000, () -> event("GMIS_LOADED", "GMIS", "BK-EQ", cob, "AMRS", "COMPLETED", Map.of()));
        at(30_000, () -> event("RAM_CHORUS_READY", "RAM", "CG-CREDIT", cob, "AMRS", "COMPLETED", Map.of()));
        at(50_000, () -> event("GMIS_LOADED", "GMIS", "BK-FI", cob, "AMRS", "COMPLETED", Map.of()));
        at(85_000, () -> event("GMIS_LOADED", "GMIS", "BK-FX", cob, "AMRS", "COMPLETED", Map.of()));
        return new ScenarioRun("pnl", cob, 5, 85,
                "GMIS and RAM publish slowly. PnL also needs the SAP trial balance (sent by the 15C3 scenario). "
                        + "Run alone, it goes at risk and then breaches its 1 minute SLA.");
    }

    /** A controller reruns SAP TB for one cost centre after the fact: every outcome using it loses readiness. */
    public ScenarioRun restateSapTrialBalance() {
        LocalDate cob = today();
        at(0, () -> event("SAP_TB_COMPLETE", "SAP", "CC-4430", cob, "AMRS", "REVOKED",
                Map.of("reason", "Late journal posted, trial balance being re-run")));
        at(8_000, () -> event("SAP_TB_COMPLETE", "SAP", "CC-4430", cob, "AMRS", "COMPLETED",
                Map.of("note", "Trial balance re-run complete")));
        return new ScenarioRun("restate", cob, 2, 8,
                "SAP TB for CC-4430 is revoked (15C3 and PnL lose readiness), then completes again 8s later and 15C3 re-runs.");
    }

    public List<ScenarioRun> all() {
        return List.of(helix(300, 45), report15c3(false), pnl());
    }

    public int cancelAll() {
        int cancelled = 0;
        for (ScheduledFuture<?> future : pending) {
            if (future.cancel(false)) {
                cancelled++;
            }
        }
        pending.clear();
        return cancelled;
    }

    private void at(long delayMs, Supplier<OutboundEvent> event) {
        pending.removeIf(ScheduledFuture::isDone);
        pending.add(scheduler.schedule(() -> hub.publish(event.get()), delayMs, TimeUnit.MILLISECONDS));
    }

    private OutboundEvent event(String type, String source, String key, LocalDate cob, String region, String status,
                                Map<String, Object> attributes) {
        return new OutboundEvent(UUID.randomUUID().toString(), type, source, key, cob, region, status,
                Instant.now(), attributes);
    }

    private LocalDate today() {
        return LocalDate.now(zone);
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
