package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;
import com.onefinux.hub.stream.StreamHub;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ExternalChannelsTest {

    static NotificationView view(Severity severity, String transition, String audience) {
        return new NotificationView(null, Instant.parse("2026-11-06T18:00:00Z"), severity, transition,
                "FOBO|2026-09-12|EMEA|R-2031", "Can I execute this rec?", audience,
                "FOBO R-2031 blocked — MOTIF MB014 FAILED", "Named key MOTIF MB014 FAILED", null);
    }

    static ChannelProperties email(boolean enabled) {
        return new ChannelProperties(new ChannelProperties.Email(enabled, "noreply@bank.example", Severity.WARN,
                List.of(), Map.of("REV-ACC", List.of("rev-acc@bank.example"))), null);
    }

    @SuppressWarnings("unchecked")
    static ObjectProvider<JavaMailSender> provider(JavaMailSender sender) {
        ObjectProvider<JavaMailSender> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(sender);
        return p;
    }

    @Test
    @DisplayName("AC-OPERATE-24 email goes to the audience's addresses at or above the minimum severity")
    void email_routes_by_audience_and_severity() {
        JavaMailSender sender = mock(JavaMailSender.class);
        SmtpEmailChannel channel = new SmtpEmailChannel(email(true), provider(sender));
        assertThat(channel.enabled()).isTrue();

        channel.deliver(view(Severity.CRITICAL, "BLOCKED", "REV-ACC"));
        channel.deliver(view(Severity.INFO, "SIGNED", "REV-ACC"));
        channel.deliver(view(Severity.CRITICAL, "BLOCKED", "MARKETS"));

        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender, times(1)).send(mail.capture());
        assertThat(mail.getValue().getTo()).containsExactly("rev-acc@bank.example");
        assertThat(mail.getValue().getSubject()).isEqualTo("[One Finance · CRITICAL] FOBO R-2031 blocked — MOTIF MB014 FAILED");
    }

    @Test
    @DisplayName("AC-OPERATE-25 email is off without the switch or without an SMTP sender")
    void email_off_by_default() {
        assertThat(new SmtpEmailChannel(email(false), provider(mock(JavaMailSender.class))).enabled()).isFalse();
        assertThat(new SmtpEmailChannel(email(true), provider(null)).enabled()).isFalse();
    }

    @Test
    @DisplayName("AC-OPERATE-26 a BLOCKED notification raises one ServiceNow incident with group, urgency and correlation")
    void servicenow_raises_one_incident_per_subject_and_transition() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ChannelProperties props = new ChannelProperties(null, new ChannelProperties.ServiceNow(true, "https://snow.example/",
                null, "svc-onefinance", "secret", null, Map.of("REV-ACC", "Revenue Accounting Controllers"), null));
        ServiceNowChannel channel = new ServiceNowChannel(props, builder);

        server.expect(requestTo("https://snow.example/api/now/table/incident"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Basic c3ZjLW9uZWZpbmFuY2U6c2VjcmV0"))
                .andExpect(jsonPath("$.assignment_group").value("Revenue Accounting Controllers"))
                .andExpect(jsonPath("$.urgency").value("1"))
                .andExpect(jsonPath("$.correlation_id").value("FOBO|2026-09-12|EMEA|R-2031|BLOCKED"))
                .andRespond(withSuccess("{\"result\":{\"number\":\"INC0010001\"}}", MediaType.APPLICATION_JSON));

        channel.deliver(view(Severity.CRITICAL, "BLOCKED", "REV-ACC"));
        channel.deliver(view(Severity.CRITICAL, "BLOCKED", "REV-ACC"));
        channel.deliver(view(Severity.SUCCESS, "READY", "REV-ACC"));

        server.verify();
    }

    @Test
    @DisplayName("AC-OPERATE-27 stitch notifications reach external channels but not the browser channel twice")
    void dispatcher_skips_browser_and_disabled_channels() {
        NotificationChannel on = mock(NotificationChannel.class);
        when(on.enabled()).thenReturn(true);
        NotificationChannel off = mock(NotificationChannel.class);
        when(off.enabled()).thenReturn(false);
        StreamHub stream = mock(StreamHub.class);
        ChannelDispatcher dispatcher = new ChannelDispatcher(List.of(new BrowserChannel(stream), on, off), Clock.systemUTC());

        dispatcher.dispatch("CRITICAL", "BLOCKED", "FOBO|2026-09-12|EMEA|R-2031", "Can I execute this rec?", "REV-ACC",
                "FOBO R-2031 blocked", "Named key");

        ArgumentCaptor<NotificationView> sent = ArgumentCaptor.forClass(NotificationView.class);
        verify(on).deliver(sent.capture());
        assertThat(sent.getValue().severity()).isEqualTo(Severity.CRITICAL);
        assertThat(sent.getValue().outcomeKey()).isEqualTo("FOBO|2026-09-12|EMEA|R-2031");
        verify(off, never()).deliver(any());
        verify(stream, never()).broadcast(any(), any());
    }
}
