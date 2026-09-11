package com.onefinux.hub.api;

import com.onefinux.hub.notification.NotificationService;
import com.onefinux.hub.notification.NotificationView;
import org.springframework.web.bind.annotation.GetMapping;
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
}
