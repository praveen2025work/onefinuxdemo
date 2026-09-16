package com.onefinux.hub.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.config.FeedWatchProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

/**
 * Feed channel: JSON files in the inbox folder. Same {@link EventHubService#ingest} as HTTP.
 * Valid files move to processed/; schema failures move to rejected/ and never touch event_store.
 */
@Service
public class FeedWatchService {

    private static final Logger log = LoggerFactory.getLogger(FeedWatchService.class);

    private final FeedWatchProperties properties;
    private final EventBinder binder;
    private final EventHubService hub;
    private final ObjectMapper mapper;
    private final AtomicReference<String> lastFile = new AtomicReference<>();
    private final AtomicReference<String> lastResult = new AtomicReference<>();

    public FeedWatchService(FeedWatchProperties properties, EventBinder binder,
                            EventHubService hub, ObjectMapper mapper) {
        this.properties = properties;
        this.binder = binder;
        this.hub = hub;
        this.mapper = mapper;
        ensureDirs();
    }

    @Scheduled(fixedDelayString = "${onefinux.feed-watch.interval-ms:1000}")
    public void scheduledScan() {
        if (!properties.on()) {
            return;
        }
        scan();
    }

    public synchronized int scan() {
        Path inbox = Path.of(properties.inbox());
        if (!Files.isDirectory(inbox)) {
            return 0;
        }
        int accepted = 0;
        try (Stream<Path> files = Files.list(inbox)) {
            for (Path file : files.filter(p -> p.getFileName().toString().endsWith(".json")).sorted().toList()) {
                if (processFile(file)) {
                    accepted++;
                }
            }
        } catch (IOException e) {
            log.warn("Feed inbox unreadable {}: {}", inbox, e.getMessage());
        }
        return accepted;
    }

    /** Write a body into the inbox and scan immediately (Drive / demo). */
    public synchronized IngestResult drop(JsonNode body) throws IOException {
        ensureDirs();
        String name = fileName(body);
        Path dest = Path.of(properties.inbox()).resolve(name);
        mapper.writerWithDefaultPrettyPrinter().writeValue(dest.toFile(), body);
        lastFile.set(dest.getFileName().toString());
        return ingestFile(dest);
    }

    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", properties.on());
        m.put("inbox", properties.inbox());
        m.put("processed", properties.processed());
        m.put("rejected", properties.rejected());
        m.put("intervalMs", properties.intervalMs());
        m.put("lastFile", lastFile.get());
        m.put("lastResult", lastResult.get());
        return m;
    }

    boolean processFile(Path file) {
        IngestResult result = ingestFile(file);
        return "ACCEPTED".equals(result.result());
    }

    private IngestResult ingestFile(Path file) {
        lastFile.set(file.getFileName().toString());
        try {
            JsonNode body = mapper.readTree(file.toFile());
            InboundEvent event = binder.bindFeed(body);
            IngestResult result = hub.ingest(event);
            move(file, Path.of(properties.processed()).resolve(file.getFileName()));
            lastResult.set(result.result());
            log.info("Feed {} -> {} {}", file.getFileName(), result.result(), result.eventId());
            return result;
        } catch (Exception e) {
            lastResult.set("REJECTED");
            try {
                move(file, Path.of(properties.rejected()).resolve(file.getFileName()));
                Files.writeString(Path.of(properties.rejected()).resolve(file.getFileName() + ".reason.txt"),
                        e.getMessage() == null ? e.toString() : e.getMessage());
            } catch (IOException io) {
                log.warn("Could not reject {}: {}", file, io.getMessage());
            }
            log.warn("Feed {} rejected: {}", file.getFileName(), e.getMessage());
            return new IngestResult(file.getFileName().toString(), "REJECTED", null, null);
        }
    }

    private String fileName(JsonNode body) {
        JsonNode id = body.path("eventId");
        if (id.isMissingNode() || id.isNull()) {
            id = body.path("id");
        }
        if (id.isMissingNode() || id.isNull()) {
            id = body.path("data").path("eventId");
        }
        String raw = id.isMissingNode() || id.isNull() ? "feed-" + System.currentTimeMillis() : id.asText();
        return raw.replaceAll("[^A-Za-z0-9._-]", "_") + ".json";
    }

    private void ensureDirs() {
        for (String dir : new String[]{properties.inbox(), properties.processed(), properties.rejected()}) {
            try {
                Files.createDirectories(Path.of(dir));
            } catch (IOException e) {
                log.warn("Could not create feed directory {}: {}", dir, e.getMessage());
            }
        }
    }

    private static void move(Path from, Path to) throws IOException {
        Files.createDirectories(to.getParent());
        Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
    }
}
