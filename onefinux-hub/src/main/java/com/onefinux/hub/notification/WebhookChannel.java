package com.onefinux.hub.notification;

import com.onefinux.hub.config.OneFinUxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Generic JSON webhook, e.g. a Teams Workflows / Power Automate "When a webhook request is received" flow.
 * Disabled unless onefinux.notifications.webhook-url is set.
 */
@Component
class WebhookChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(WebhookChannel.class);

    private final String url;
    private final RestClient rest;

    WebhookChannel(OneFinUxProperties properties, RestClient.Builder builder) {
        this.url = properties.notifications().webhookUrl();
        this.rest = builder.build();
    }

    @Override
    public String name() {
        return "webhook";
    }

    @Override
    public boolean enabled() {
        return StringUtils.hasText(url);
    }

    @Override
    public void deliver(NotificationView n) {
        try {
            rest.post().uri(url).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("title", n.title(), "text", String.valueOf(n.message()),
                            "severity", n.severity().name(), "outcome", n.outcomeKey(),
                            "audience", String.valueOf(n.audience())))
                    .retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("Webhook delivery failed for notification {}: {}", n.id(), e.getMessage());
        }
    }
}
