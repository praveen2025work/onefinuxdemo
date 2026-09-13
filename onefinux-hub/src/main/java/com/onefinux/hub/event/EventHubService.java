package com.onefinux.hub.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.stream.StreamHub;
import com.onefinux.hub.translation.TranslationService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Component 1 - Event Hub: ingest, de-duplicate, translate, persist, then publish in-process.
 *
 * The hub is deliberately a "dumb pipe with a memory": it knows nothing about 15C3 or FOBO.
 * Orchestration lives in the outcome engine and workflow layer. In production the transport becomes
 * Kafka (or Solace / IBM MQ adapters for legacy producers); this class is the only thing that changes.
 *
 * Ingestion is serialised for the POC to keep ordering and idempotency trivially correct.
 */
@Service
public class EventHubService {

    private static final Logger log = LoggerFactory.getLogger(EventHubService.class);
    public static final String PLATFORM_SOURCE = "ONEFINUX";

    private final EventRecordRepository repository;
    private final TranslationService translation;
    private final ApplicationEventPublisher publisher;
    private final StreamHub stream;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final MeterRegistry metrics;

    public EventHubService(EventRecordRepository repository, TranslationService translation,
                           ApplicationEventPublisher publisher, StreamHub stream,
                           ObjectMapper mapper, Clock clock, MeterRegistry metrics) {
        this.repository = repository;
        this.translation = translation;
        this.publisher = publisher;
        this.stream = stream;
        this.mapper = mapper;
        this.clock = clock;
        this.metrics = metrics;
    }

    public synchronized IngestResult ingest(InboundEvent in) {
        String eventId = StringUtils.hasText(in.eventId()) ? in.eventId().trim() : deterministicId(in);
        if (repository.existsById(eventId)) {
            log.debug("Duplicate event {} ignored", eventId);
            metrics.counter("onefinux.events.ingested", "result", "duplicate",
                    "source", safeTag(in.sourceSystem())).increment();
            return IngestResult.duplicate(eventId);
        }
        BusinessEvent event = translation.translate(in, eventId, clock.instant());
        repository.save(toRecord(event));
        log.info("{} {} {} {} [{} {}]", event.sourceSystem(), event.eventType(), event.sourceKey(),
                event.status(), event.cobDate(), event.region());
        metrics.counter("onefinux.events.ingested", "result", "accepted",
                "source", safeTag(event.sourceSystem())).increment();
        stream.broadcast("event", event);
        publisher.publishEvent(new EventIngested(event, false));
        return IngestResult.accepted(event);
    }

    private static String safeTag(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim().toUpperCase();
    }

    /** Workflow decisions (overrides, action runs) are events too, so they are audited and replayable. */
    public IngestResult publishInternal(String eventType, String sourceKey, LocalDate cobDate, String region,
                                        EventStatus status, Map<String, Object> attributes) {
        return ingest(new InboundEvent(UUID.randomUUID().toString(), eventType, PLATFORM_SOURCE, sourceKey,
                cobDate, region, status, clock.instant(), attributes));
    }

    /** Rebuilds in-memory outcome state from the event store. */
    public synchronized int replay() {
        List<EventRecord> records = repository.findAllByOrderByReceivedAtAsc();
        records.forEach(r -> publisher.publishEvent(new EventIngested(fromRecord(r), true)));
        return records.size();
    }

    public List<BusinessEvent> recent(int limit) {
        return repository.findAllByOrderByReceivedAtDesc(PageRequest.of(0, Math.max(1, Math.min(limit, 500))))
                .stream().map(this::fromRecord).toList();
    }

    /** Demo reset. The callback runs while ingestion is paused so no event lands half way through. */
    public synchronized void purge(Runnable alsoWhilePaused) {
        repository.deleteAllInBatch();
        alsoWhilePaused.run();
    }

    private String deterministicId(InboundEvent in) {
        String natural = String.join("|", in.sourceSystem(), in.eventType(), in.sourceKey(),
                String.valueOf(in.cobDate()), in.region(), String.valueOf(in.status()), String.valueOf(in.occurredAt()));
        return UUID.nameUUIDFromBytes(natural.toUpperCase().getBytes(StandardCharsets.UTF_8)).toString();
    }

    private EventRecord toRecord(BusinessEvent e) {
        return new EventRecord(e, json(e.crossReferences()), json(e.attributes()));
    }

    private BusinessEvent fromRecord(EventRecord r) {
        Map<String, String> refs = read(r.getCrossRefsJson(), new TypeReference<>() { });
        Map<String, Object> attributes = read(r.getAttributesJson(), new TypeReference<>() { });
        return new BusinessEvent(r.getEventId(), r.getEventType(), r.getSourceSystem(), r.getSourceKey(),
                r.getBusinessIdType(), r.getBusinessId(), refs, r.getCobDate(), r.getRegion(), r.getStatus(),
                r.getOccurredAt(), r.getReceivedAt(), attributes);
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Event attributes are not serialisable", e);
        }
    }

    private <T> T read(String json, TypeReference<T> type) {
        try {
            return mapper.readValue(json == null ? "{}" : json, type);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt event store row", e);
        }
    }
}
