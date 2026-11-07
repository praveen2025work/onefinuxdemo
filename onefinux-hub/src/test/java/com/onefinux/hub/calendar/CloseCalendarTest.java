package com.onefinux.hub.calendar;

import com.onefinux.hub.calendar.CalendarProperties.Region;
import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.config.OneFinUxProperties.Sla;
import com.onefinux.hub.outcome.OutcomeEngine;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CloseCalendarTest {

    final CloseCalendar calendar = new CloseCalendar(new CalendarProperties(null, Map.of(
            "AMRS", new Region("America/New_York", List.of(LocalDate.of(2026, 11, 26), LocalDate.of(2026, 12, 25))),
            "EMEA", new Region("Europe/London", List.of(LocalDate.of(2026, 12, 25), LocalDate.of(2026, 12, 28))),
            "APAC", new Region("Asia/Singapore", List.of()))), ZoneId.of("America/New_York"));

    @Test
    @DisplayName("AC-ENGINE-24 day-offset counts business days in the region, skipping weekends and its holidays")
    void business_days_skip_weekend_and_region_holidays() {
        LocalDate christmasEve = LocalDate.of(2026, 12, 24);
        assertThat(calendar.plusBusinessDays("EMEA", christmasEve, 1)).isEqualTo(LocalDate.of(2026, 12, 29));
        assertThat(calendar.plusBusinessDays("AMRS", christmasEve, 1)).isEqualTo(LocalDate.of(2026, 12, 28));
        assertThat(calendar.plusBusinessDays("AMRS", LocalDate.of(2026, 11, 25), 1)).isEqualTo(LocalDate.of(2026, 11, 27));
        assertThat(calendar.plusBusinessDays("APAC", LocalDate.of(2026, 11, 6), 0)).isEqualTo(LocalDate.of(2026, 11, 6));
        assertThat(calendar.isBusinessDay("EMEA", LocalDate.of(2026, 12, 28))).isFalse();
        assertThat(calendar.isBusinessDay("AMRS", LocalDate.of(2026, 12, 28))).isTrue();
    }

    @Test
    @DisplayName("AC-ENGINE-25 the cutoff is the region's wall clock")
    void cutoff_is_in_the_region_zone() {
        LocalDate cob = LocalDate.of(2026, 11, 6);
        assertThat(calendar.deadline("EMEA", cob, 1, "18:00")).isEqualTo(Instant.parse("2026-11-09T18:00:00Z"));
        assertThat(calendar.deadline("APAC", cob, 1, "18:00")).isEqualTo(Instant.parse("2026-11-09T10:00:00Z"));
        assertThat(calendar.deadline("AMRS", LocalDate.of(2026, 11, 25), 1, "07:30")).isEqualTo(Instant.parse("2026-11-27T12:30:00Z"));
        assertThat(calendar.deadline("UNLISTED", cob, 0, "19:00")).isEqualTo(Instant.parse("2026-11-07T00:00:00Z"));
        assertThat(calendar.deadline("EMEA", cob, 1, null)).isNull();
    }

    @Test
    @DisplayName("AC-ENGINE-26 an outcome's deadline comes from the close calendar for its region")
    void engine_deadline_uses_the_calendar() {
        OutcomeDefinition close = new OutcomeDefinition("MONTH_END_CLOSE", "Month-end close", "Can I close the month?",
                List.of("EMEA"), "Financial Control", new Sla("18:00", 3, null),
                List.of(new DependencyDefinition("SUBLEDGER_CLOSED", "SAP", 1, "Sub-ledgers")),
                new OnReady("NOTIFY_ONLY", null, null, null), List.of());
        OneFinUxProperties props = new OneFinUxProperties("America/New_York", null, null, null, List.of(close), null, null);
        Clock clock = Clock.fixed(Instant.parse("2026-12-23T12:00:00Z"), ZoneId.of("America/New_York"));
        OutcomeEngine engine = new OutcomeEngine(props, e -> { }, clock, new SimpleMeterRegistry(), calendar);
        LocalDate cob = LocalDate.of(2026, 12, 23);
        engine.initialise(cob);

        // Three EMEA business days after Wed 23 Dec: 24 Dec, 29 Dec, 30 Dec (25, 28 are holidays; 26-27 weekend).
        assertThat(engine.view("MONTH_END_CLOSE", cob, "EMEA").orElseThrow().deadline())
                .isEqualTo(Instant.parse("2026-12-30T18:00:00Z"));
    }
}
