package com.onefinux.hub.api;

import com.onefinux.hub.notification.NotificationService;
import com.onefinux.hub.notification.NotificationView;
import com.onefinux.hub.outcome.Severity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/api/notifications")
    public List<NotificationView> recent(@RequestParam(defaultValue = "50") int limit) {
        return notifications.recent(limit);
    }

    /**
     * Demo / RTB only: push a platform announcement to every open console (SSE and WebSocket) and the inbox.
     * Same trust level as {@code /api/admin/reset}; production puts this behind an RTB entitlement.
     */
    @PostMapping("/api/admin/announce")
    public NotificationView announce(@Valid @RequestBody Announcement body) {
        return notifications.announce(body.severity(), body.title().strip(),
                body.message() == null ? null : body.message().strip(), body.audience());
    }

    public record Announcement(@NotBlank @Size(max = 300) String title,
                               @Size(max = 2000) String message,
                               Severity severity,
                               @Size(max = 120) String audience) {
    }
}
