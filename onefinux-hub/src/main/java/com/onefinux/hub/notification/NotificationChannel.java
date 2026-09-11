package com.onefinux.hub.notification;

/** A delivery channel. Add Teams, Symphony, email or ServiceNow by implementing this interface. */
public interface NotificationChannel {

    String name();

    boolean enabled();

    void deliver(NotificationView notification);
}
