package com.onefinux.hub.notification;

import com.onefinux.hub.outcome.Severity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity;

    @Column(nullable = false, length = 30)
    private String transition;

    @Column(nullable = false, length = 160)
    private String outcomeKey;

    @Column(length = 120)
    private String outcomeName;

    @Column(length = 120)
    private String audience;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 2000)
    private String message;

    @Column(length = 200)
    private String channels;

    protected Notification() {
    }

    public Notification(Instant createdAt, Severity severity, String transition, String outcomeKey,
                        String outcomeName, String audience, String title, String message, String channels) {
        this.createdAt = createdAt;
        this.severity = severity;
        this.transition = transition;
        this.outcomeKey = outcomeKey;
        this.outcomeName = outcomeName;
        this.audience = audience;
        this.title = title;
        this.message = message;
        this.channels = channels;
    }

    public Long getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Severity getSeverity() { return severity; }
    public String getTransition() { return transition; }
    public String getOutcomeKey() { return outcomeKey; }
    public String getOutcomeName() { return outcomeName; }
    public String getAudience() { return audience; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getChannels() { return channels; }
}
