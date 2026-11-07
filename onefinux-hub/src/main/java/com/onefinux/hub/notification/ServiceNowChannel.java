package com.onefinux.hub.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ServiceNow incidents through the Table API ({@code POST {url}/api/now/table/{table}}) for the transitions that
 * need someone to act (BLOCKED, DELAYED, SLA_BREACHED, ACTION_FAILED, ESCALATED by default). One incident per subject and
 * transition: {@code correlation_id} carries that pair and a repeat in this hub is not raised again.
 */
@Component
class ServiceNowChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(ServiceNowChannel.class);

    private final ChannelProperties.ServiceNow config;
    private final RestClient rest;
    private final Set<String> raised = ConcurrentHashMap.newKeySet();

    ServiceNowChannel(ChannelProperties properties, RestClient.Builder builder) {
        this.config = properties.servicenow();
        this.rest = builder.build();
    }

    @Override
    public String name() {
        return "servicenow";
    }

    @Override
    public boolean enabled() {
        return config.enabled() && StringUtils.hasText(config.url());
    }

    @Override
    public void deliver(NotificationView n) {
        if (!config.transitions().contains(n.transition())) {
            return;
        }
        String correlation = n.outcomeKey() + "|" + n.transition();
        if (!raised.add(correlation)) {
            return;
        }
        String level = switch (n.severity() == null ? com.onefinux.hub.outcome.Severity.INFO : n.severity()) {
            case CRITICAL -> "1";
            case WARN -> "2";
            default -> "3";
        };
        Map<String, Object> incident = new LinkedHashMap<>();
        incident.put("short_description", n.title());
        incident.put("description", n.message() + "\n\nOutcome: " + n.outcomeName() + " (" + n.outcomeKey() + ")");
        incident.put("urgency", level);
        incident.put("impact", level);
        incident.put("category", "One Finance close");
        incident.put("assignment_group", config.assignmentGroups().getOrDefault(String.valueOf(n.audience()), config.defaultGroup()));
        incident.put("correlation_id", correlation);
        incident.put("correlation_display", "One Finance");
        try {
            var request = rest.post().uri(config.url().replaceAll("/+$", "") + "/api/now/table/" + config.table())
                    .contentType(MediaType.APPLICATION_JSON).accept(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(config.username())) {
                String basic = config.username() + ":" + (config.password() == null ? "" : config.password());
                request = request.header(HttpHeaders.AUTHORIZATION,
                        "Basic " + Base64.getEncoder().encodeToString(basic.getBytes(StandardCharsets.UTF_8)));
            }
            Map<?, ?> body = request.body(incident).retrieve().body(Map.class);
            Object number = body != null && body.get("result") instanceof Map<?, ?> result ? result.get("number") : null;
            log.info("ServiceNow incident {} raised for {}", number, correlation);
        } catch (RuntimeException e) {
            raised.remove(correlation);
            throw e;
        }
    }
}
