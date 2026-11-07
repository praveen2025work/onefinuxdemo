package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

/**
 * External notification channels ({@code onefinux.channels}). Both are off unless enabled: email needs an SMTP
 * host ({@code spring.mail.host}); ServiceNow needs the instance URL and an integration user.
 */
@ConfigurationProperties(prefix = "onefinux.channels")
public record ChannelProperties(Email email, ServiceNow servicenow) {

    public ChannelProperties {
        email = email == null ? new Email(false, null, null, null, null) : email;
        servicenow = servicenow == null ? new ServiceNow(false, null, null, null, null, null, null, null) : servicenow;
    }

    /** Audience (group unit, owner group, platform.support) to addresses; notifications below minSeverity are not mailed. */
    public record Email(boolean enabled, String from, Severity minSeverity, List<String> defaultTo,
                        Map<String, List<String>> audiences) {
        public Email {
            from = from == null || from.isBlank() ? "onefinance-noreply@bank.example" : from;
            minSeverity = minSeverity == null ? Severity.WARN : minSeverity;
            defaultTo = defaultTo == null ? List.of() : List.copyOf(defaultTo);
            audiences = audiences == null ? Map.of() : Map.copyOf(audiences);
        }
    }

    /** One incident per subject and transition in {@code transitions}, assigned by audience. */
    public record ServiceNow(boolean enabled, String url, String table, String username, String password,
                             List<String> transitions, Map<String, String> assignmentGroups, String defaultGroup) {
        public ServiceNow {
            table = table == null || table.isBlank() ? "incident" : table;
            transitions = transitions == null ? List.of("BLOCKED", "DELAYED", "SLA_BREACHED", "ACTION_FAILED", "ESCALATED") : List.copyOf(transitions);
            assignmentGroups = assignmentGroups == null ? Map.of() : Map.copyOf(assignmentGroups);
            defaultGroup = defaultGroup == null || defaultGroup.isBlank() ? "One Finance Support" : defaultGroup;
        }
    }
}
