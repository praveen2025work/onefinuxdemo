package com.onefinux.hub.calendar;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.event.BusinessEvent;
import com.onefinux.hub.event.EventStatus;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** The shipped application.yml binds: the calendar, and the outcomes that use it. */
class CalendarBindingTest {

    static Binder binder() throws Exception {
        StandardEnvironment env = new StandardEnvironment();
        for (PropertySource<?> source : new YamlPropertySourceLoader().load("app", new ClassPathResource("application.yml"))) {
            env.getPropertySources().addLast(source);
        }
        return Binder.get(env);
    }

    @Test
    @DisplayName("AC-ENGINE-27 application.yml binds the close calendar and MONTH_END_CLOSE with a business-day SLA")
    void shipped_configuration_binds() throws Exception {
        Binder binder = binder();
        CalendarProperties calendar = binder.bind("onefinux.calendar", CalendarProperties.class).get();
        assertThat(calendar.weekend()).containsExactly(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
        assertThat(calendar.regions()).containsKeys("AMRS", "EMEA", "APAC", "GLOBAL");
        assertThat(calendar.regions().get("EMEA").zone()).isEqualTo("Europe/London");
        assertThat(calendar.regions().get("EMEA").holidays()).contains(LocalDate.of(2026, 12, 25));
        assertThat(calendar.stitchDelays()).isTrue();
        assertThat(new CloseCalendar(calendar, ZoneId.of("America/New_York")).zone("apac")).isEqualTo(ZoneId.of("Asia/Singapore"));

        OneFinUxProperties props = binder.bind("onefinux", OneFinUxProperties.class).get();
        var close = props.outcomes().stream().filter(o -> o.id().equals("MONTH_END_CLOSE")).findFirst().orElseThrow();
        assertThat(close.regions()).containsExactly("EMEA");
        assertThat(close.sla().cutoff()).isEqualTo("18:00");
        assertThat(close.sla().dayOffset()).isEqualTo(3);
        assertThat(close.dependencies()).hasSize(4);
        assertThat(props.actionTargets()).containsKey(close.onReady().target());
    }

    @Test
    @DisplayName("AC-OPERATE-28 application.yml binds the channels off by default, with dotted and spaced audience keys")
    void shipped_channels_bind() throws Exception {
        var channels = binder().bind("onefinux.channels", com.onefinux.hub.notification.ChannelProperties.class).get();
        assertThat(channels.email().enabled()).isFalse();
        assertThat(channels.servicenow().enabled()).isFalse();
        assertThat(channels.email().audiences()).containsKeys("REV-ACC", "platform.support", "Financial Control");
        assertThat(channels.servicenow().assignmentGroups()).containsEntry("platform.support", "RTB Finance Platforms");
        assertThat(channels.servicenow().transitions()).contains("BLOCKED", "DELAYED", "SLA_BREACHED", "ESCALATED");
    }

    @Test
    @DisplayName("AC-ENGINE-28 the shipped MONTH_END_CLOSE blocks on an intercompany break and is ready once it re-matches")
    void month_end_close_folds_from_shipped_definition() throws Exception {
        Binder binder = binder();
        OneFinUxProperties props = binder.bind("onefinux", OneFinUxProperties.class).get();
        CloseCalendar calendar = new CloseCalendar(binder.bind("onefinux.calendar", CalendarProperties.class).get(),
                ZoneId.of(props.zone()));
        LocalDate cob = LocalDate.of(2026, 11, 6);
        Instant now = Instant.parse("2026-11-06T20:00:00Z");
        OutcomeEngine engine = new OutcomeEngine(props, e -> { }, Clock.fixed(now, ZoneId.of(props.zone())),
                new SimpleMeterRegistry(), calendar);
        engine.initialise(cob);

        List<String[]> inputs = List.of(new String[]{"SUBLEDGER_CLOSED", "SAP", "AP"}, new String[]{"SUBLEDGER_CLOSED", "SAP", "AR"},
                new String[]{"SUBLEDGER_CLOSED", "SAP", "FA"}, new String[]{"SUBLEDGER_CLOSED", "SAP", "PAYROLL"},
                new String[]{"ACCRUALS_POSTED", "MOTIF", "ACR-OPEX"}, new String[]{"ACCRUALS_POSTED", "MOTIF", "ACR-BONUS"},
                new String[]{"ACCRUALS_POSTED", "MOTIF", "ACR-RENT"}, new String[]{"INTERCO_MATCHED", "RECFACTORY", "IC-UK-SG"},
                new String[]{"FX_REVALUED", "SAP", "FXR-EOM"});
        inputs.forEach(in -> engine.apply(event(in[0], in[1], in[2], cob, EventStatus.COMPLETED, now), false));
        engine.apply(event("INTERCO_MATCHED", "RECFACTORY", "IC-UK-US", cob, EventStatus.FAILED, now), false);
        assertThat(engine.view("MONTH_END_CLOSE", cob, "EMEA").orElseThrow().status()).isEqualTo(OutcomeStatus.BLOCKED);

        engine.apply(event("INTERCO_MATCHED", "RECFACTORY", "IC-UK-US", cob, EventStatus.COMPLETED, now), false);
        var view = engine.view("MONTH_END_CLOSE", cob, "EMEA").orElseThrow();
        assertThat(view.status()).isEqualTo(OutcomeStatus.READY);
        assertThat(view.deadline()).isEqualTo(Instant.parse("2026-11-11T18:00:00Z"));
    }

    static BusinessEvent event(String type, String source, String key, LocalDate cob, EventStatus status, Instant at) {
        return new BusinessEvent(UUID.randomUUID().toString(), type, source, key, null, key, Map.of(), cob, "EMEA",
                status, at, at, Map.of());
    }
}
