package com.onefinux.hub.db;

import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.event.InboundEvent;
import com.onefinux.hub.outcome.OutcomeProjectionRepository;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.propagation.PropagationRepository;
import com.onefinux.hub.security.AccessRegistry;
import com.onefinux.hub.stitch.StitchRepository;
import com.onefinux.hub.ux.UxRepository;
import com.onefinux.hub.writeback.WritebackService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The hub on the Oracle migration set (db/oracle) with H2 in Oracle compatibility mode: the schema
 * builds, and the runtime SQL — upserts, row limits, date formatting, boolean columns, the quoted RESOURCE
 * column and JPA — runs against it. H2's Oracle mode is not Oracle; this guards the syntax both stores share.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:oracle-mode;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.flyway.locations=classpath:db/oracle",
        "onefinux.feed-watch.enabled=false"
})
class OracleModeMigrationTest {

    @Autowired Flyway flyway;
    @Autowired EventHubService events;
    @Autowired StitchRepository stitch;
    @Autowired AccessRegistry access;
    @Autowired UxRepository ux;
    @Autowired WritebackService writeback;
    @Autowired OutcomeProjectionRepository projection;
    @Autowired PropagationRepository propagation;
    @Autowired OutcomeEngine engine;

    @Test
    @DisplayName("AC-OPERATE-29 the Oracle migration set applies every version the H2 set has")
    void oracle_set_mirrors_h2_versions() {
        assertThat(flyway.getConfiguration().getLocations()).extracting(Object::toString).containsExactly("classpath:db/oracle");
        assertThat(flyway.info().applied()).hasSize(10);
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("10");
    }

    @Test
    @DisplayName("AC-OPERATE-30 runtime SQL runs on the Oracle schema: ingest, upserts, row limits, booleans, audit")
    void runtime_sql_runs_on_oracle_schema() {
        String id = "ORA-" + System.nanoTime();
        InboundEvent e = new InboundEvent(id, "LEDGER_POSTED", "MOTIF", "MB-ORA", LocalDate.of(2031, 3, 3), "EMEA",
                EventStatus.COMPLETED, Instant.now(), Map.of("book", "MB-ORA"));
        assertThat(events.ingest(e).result()).isEqualTo("ACCEPTED");
        assertThat(events.ingest(e).result()).isEqualTo("DUPLICATE");
        assertThat(stitch.recentEvents(5)).extracting(r -> r.get("eventId")).contains(id);

        String instance = "FOBO|2026-09-12|EMEA|R-2031";
        stitch.upsertReadinessKey(instance, "MBR", "BK-4420", "WAITING", null);
        stitch.upsertReadinessKey(instance, "MBR", "BK-4420", "COMPLETED", "EVT-ORA");
        assertThat(stitch.readinessKeys(instance)).filteredOn(k -> "BK-4420".equals(k.get("sourceKey")))
                .singleElement().satisfies(k -> assertThat(k.get("keyStatus")).isEqualTo("COMPLETED"));
        stitch.insertEscalation("ESC-ORA", instance, "DELAY");
        stitch.insertEscalation("ESC-ORA", instance, "DELAY");
        assertThat(stitch.escalations()).filteredOn(x -> "ESC-ORA".equals(x.get("escalationId"))).hasSize(1);
        assertThat(stitch.instances(null, "2026-09-12", "EMEA", null)).extracting(r -> r.get("cobDate")).containsOnly("2026-09-12");
        assertThat(stitch.destinationsForInstance("FOBO|2026-09-12|APAC|R-1042")).isNotEmpty();
        assertThat(stitch.slaOf(instance)).containsEntry("cobDate", "2026-09-12");

        stitch.insertAudit("ora.tester", "PROBE", "oracle-mode", "OK", "{}");
        assertThat(stitch.auditLog(10)).filteredOn(a -> "PROBE".equals(a.get("action")))
                .first().satisfies(a -> assertThat(a.get("resource")).isEqualTo("oracle-mode"));

        access.touch("ora.user");
        assertThat(access.snapshot("ora.user").suspended()).isFalse();
        assertThat(access.suspendInactive()).isGreaterThanOrEqualTo(1);
        assertThat(access.snapshot("auditor").suspended()).isTrue();
        access.restore("auditor", "ora.tester");
        assertThat(access.snapshot("auditor").suspended()).isFalse();

        ux.insertEvent(Instant.now(), "ora.user", "REV-ACC", "APP_OPEN", "/platform", null, null, null);
        assertThat(ux.accessLog(Instant.now().minus(1, ChronoUnit.DAYS), 5)).isNotEmpty();
        ux.savePref("ora.user", "desks", "{\"desks\":[]}", Instant.now());
        assertThat(ux.pref("ora.user", "desks")).hasValueSatisfying(p -> assertThat(p.get("json")).isEqualTo("{\"desks\":[]}"));

        assertThat(writeback.list(null, null)).isNotNull();
        assertThat(propagation.pending(5)).isNotNull();
        engine.definitions();
        assertThat(projection.count()).isGreaterThanOrEqualTo(0);
    }
}
