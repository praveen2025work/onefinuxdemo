package com.onefinux.hub.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.calendar.CalendarProperties;
import com.onefinux.hub.calendar.CloseCalendar;
import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.config.OneFinUxProperties.Sla;
import com.onefinux.hub.notification.ChannelProperties;
import com.onefinux.hub.notification.NotificationChannel;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.security.SecurityProperties;
import com.onefinux.hub.stitch.StitchRepository;
import com.onefinux.hub.ux.UxProperties;
import com.onefinux.hub.writeback.WritebackProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlatformControllerTest {

    CurrentUser currentUser = mock(CurrentUser.class);
    StitchRepository audit = mock(StitchRepository.class);
    PlatformController controller;

    @BeforeEach
    void setUp() {
        SecurityProperties security = mock(SecurityProperties.class);
        when(security.roleActions()).thenReturn(Map.of("AUDIT", List.of("ACCESS_REVIEW", "EVIDENCE_EXPORT", "PLATFORM_VIEW"),
                "RTB", List.of("REPLAY")));
        CloseCalendar calendar = new CloseCalendar(new CalendarProperties(null,
                Map.of("EMEA", new CalendarProperties.Region("Europe/London", List.of())), null), ZoneId.of("America/New_York"));
        OutcomeEngine engine = mock(OutcomeEngine.class);
        when(engine.definitions()).thenReturn(List.of(new OutcomeDefinition("MONTH_END_CLOSE", "Month-end close", "Can I close?",
                List.of("EMEA"), "Financial Control", new Sla("18:00", 3, null),
                List.of(new DependencyDefinition("SUBLEDGER_CLOSED", "SAP", 4, "Sub-ledgers")),
                new OnReady("HTTP_COMMAND", "closepack", "CLOSE_PACK_GENERATED", "Close pack"), List.of())));
        OneFinUxProperties hub = new OneFinUxProperties("America/New_York", null, null, null, List.of(),
                Map.of("closepack", new OneFinUxProperties.ActionTarget("http://sim/axiom/reports/close-pack")), null);
        NotificationChannel snow = mock(NotificationChannel.class);
        when(snow.name()).thenReturn("servicenow");
        when(snow.enabled()).thenReturn(true);
        ChannelProperties channels = new ChannelProperties(null, new ChannelProperties.ServiceNow(true, "https://snow.example",
                null, "svc", "top-secret-password", null, null, null));
        controller = new PlatformController(currentUser, audit, security, calendar, engine, hub, List.of(snow), channels,
                new UxProperties(null, null, null, null), new WritebackProperties(Map.of()));
        when(currentUser.actor()).thenReturn("auditor");
    }

    @Test
    @DisplayName("AC-GOVERN-33 platform settings list roles, calendar, SLAs and channels, and never a secret")
    @SuppressWarnings("unchecked")
    void settings_as_rows_without_secrets() throws Exception {
        when(currentUser.entitlements()).thenReturn(new Entitlements("auditor", Set.of("AUDIT"), Set.of(), Set.of(), false,
                Set.of("PLATFORM_VIEW"), false));

        Map<String, Object> s = controller.settings();

        assertThat((List<Map<String, Object>>) s.get("roles")).contains(Map.of("role", "AUDIT", "verb", "PLATFORM_VIEW"));
        assertThat((List<Map<String, Object>>) s.get("calendar")).extracting(r -> r.get("zone")).contains("Europe/London");
        Map<String, Object> mec = ((List<Map<String, Object>>) s.get("outcomes")).get(0);
        assertThat(mec).containsEntry("deadline", "18:00 on COB + 3 business days").containsEntry("zone", "Europe/London");
        assertThat((List<Map<String, Object>>) s.get("channels")).first()
                .satisfies(c -> assertThat(c).containsEntry("channel", "servicenow").containsEntry("enabled", true));
        assertThat(new ObjectMapper().writeValueAsString(s)).doesNotContain("top-secret-password").doesNotContain("svc\"");
    }

    @Test
    @DisplayName("AC-GOVERN-34 a role without PLATFORM_VIEW is refused 403 and the refusal is audited")
    void refused_and_audited() {
        when(currentUser.entitlements()).thenReturn(new Entitlements("alice.revacc", Set.of("CONTROLLER"), Set.of("REV-ACC"),
                Set.of(), false, Set.of("SIGN_OFF"), false));

        assertThatThrownBy(() -> controller.settings())
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(403));
        verify(audit).insertAudit(eq("auditor"), eq("PLATFORM_VIEW"), eq("platform.settings"), eq("DENY"), anyString());
    }
}
