package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.OutcomeChanged;
import com.onefinux.hub.outcome.Severity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Turns notifiable outcome transitions into notifications: persist once (the inbox and audit record),
 * then fan out to every enabled channel. Users are notified about business outcomes, never raw events.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    public static final String ANNOUNCEMENT = "ANNOUNCEMENT";
    static final String PLATFORM_KEY = "PLATFORM";

    private final NotificationRepository repository;
    private final List<NotificationChannel> channels;
    private final Clock clock;

    public NotificationService(NotificationRepository repository, List<NotificationChannel> channels, Clock clock) {
        this.repository = repository;
        this.channels = channels;
        this.clock = clock;
    }

    @EventListener
    public void onOutcomeChanged(OutcomeChanged change) {
        if (!change.transition().notifiable()) {
            return;
        }
        List<NotificationChannel> active = activeChannels();
        Notification saved = repository.save(new Notification(
                clock.instant(),
                change.transition().severity(),
                change.transition().name(),
                change.view().key(),
                change.view().name(),
                change.view().ownerGroup(),
                change.title(),
                change.message(),
                channelNames(active)));
        deliver(NotificationView.from(saved), active);
    }

    /**
     * A platform announcement (RTB broadcast, Drive test card). Not an outcome transition: it is persisted
     * to the same inbox under {@link #ANNOUNCEMENT} so every console and the audit trail see one record.
     */
    public NotificationView announce(Severity severity, String title, String message, String audience) {
        List<NotificationChannel> active = activeChannels();
        Notification saved = repository.save(new Notification(
                clock.instant(),
                severity == null ? Severity.INFO : severity,
                ANNOUNCEMENT,
                PLATFORM_KEY,
                "One Finance",
                audience == null || audience.isBlank() ? "all" : audience,
                title,
                message,
                channelNames(active)));
        NotificationView view = NotificationView.from(saved);
        deliver(view, active);
        return view;
    }

    private List<NotificationChannel> activeChannels() {
        return channels.stream().filter(NotificationChannel::enabled).toList();
    }

    private static String channelNames(List<NotificationChannel> active) {
        return active.stream().map(NotificationChannel::name).collect(Collectors.joining(", "));
    }

    private void deliver(NotificationView view, List<NotificationChannel> active) {
        for (NotificationChannel channel : active) {
            try {
                channel.deliver(view);
            } catch (RuntimeException e) {
                log.warn("Channel {} failed for notification {}: {}", channel.name(), view.id(), e.getMessage());
            }
        }
    }

    public List<NotificationView> recent(int limit) {
        return repository.findAllByOrderByIdDesc(PageRequest.of(0, Math.max(1, Math.min(limit, 500))))
                .stream().map(NotificationView::from).toList();
    }

    public void purge() {
        repository.deleteAllInBatch();
    }
}
