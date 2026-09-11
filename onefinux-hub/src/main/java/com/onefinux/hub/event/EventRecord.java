package com.onefinux.hub.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Append-only event store row. The outcome state is a fold over this table, so it can always be
 * rebuilt (restart, new outcome definition, audit question) by replaying it.
 */
@Entity
@Table(name = "event_store")
public class EventRecord {

    @Id
    @Column(length = 120)
    private String eventId;

    @Column(nullable = false, length = 80)
    private String eventType;

    @Column(nullable = false, length = 40)
    private String sourceSystem;

    @Column(nullable = false, length = 120)
    private String sourceKey;

    @Column(length = 40)
    private String businessIdType;

    @Column(length = 120)
    private String businessId;

    @Column(length = 2000)
    private String crossRefsJson;

    @Column(nullable = false)
    private LocalDate cobDate;

    @Column(nullable = false, length = 20)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Column(nullable = false)
    private Instant occurredAt;

    @Column(nullable = false)
    private Instant receivedAt;

    @Column(length = 8000)
    private String attributesJson;

    protected EventRecord() {
    }

    public EventRecord(BusinessEvent e, String crossRefsJson, String attributesJson) {
        this.eventId = e.eventId();
        this.eventType = e.eventType();
        this.sourceSystem = e.sourceSystem();
        this.sourceKey = e.sourceKey();
        this.businessIdType = e.businessIdType();
        this.businessId = e.businessId();
        this.crossRefsJson = crossRefsJson;
        this.cobDate = e.cobDate();
        this.region = e.region();
        this.status = e.status();
        this.occurredAt = e.occurredAt();
        this.receivedAt = e.receivedAt();
        this.attributesJson = attributesJson;
    }

    public String getEventId() { return eventId; }
    public String getEventType() { return eventType; }
    public String getSourceSystem() { return sourceSystem; }
    public String getSourceKey() { return sourceKey; }
    public String getBusinessIdType() { return businessIdType; }
    public String getBusinessId() { return businessId; }
    public String getCrossRefsJson() { return crossRefsJson; }
    public LocalDate getCobDate() { return cobDate; }
    public String getRegion() { return region; }
    public EventStatus getStatus() { return status; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getReceivedAt() { return receivedAt; }
    public String getAttributesJson() { return attributesJson; }
}
