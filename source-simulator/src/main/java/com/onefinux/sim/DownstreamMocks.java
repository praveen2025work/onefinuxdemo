package com.onefinux.sim;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Mock downstream systems the workflow layer commands. They accept the command (202), do "work",
 * then publish their completion event back to the hub, carrying the correlationId and runId.
 */
@RestController
public class DownstreamMocks {

    private static final Logger log = LoggerFactory.getLogger(DownstreamMocks.class);

    public record ActionCommand(String runId, String correlationId, String outcomeId, LocalDate cobDate, String region,
                                int inputs, String completionEvent, String callbackUrl) {
    }

    private final HubClient hub;
    private final int seconds;
    private final Random random = new Random();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    public DownstreamMocks(HubClient hub, SimProperties properties) {
        this.hub = hub;
        this.seconds = properties.downstreamSeconds();
    }

    @PostMapping("/helix/analysis")
    public ResponseEntity<Map<String, String>> helix(@RequestBody ActionCommand command) {
        log.info("Helix received {} for {} ({} master books)", command.runId(), command.correlationId(), command.inputs());
        int breaks = 8 + random.nextInt(14);
        int material = 1 + random.nextInt(4);
        reply(command, "HELIX", Map.of(
                "breaksFound", breaks,
                "materialBreaks", material,
                "summary", "Helix analysed " + command.inputs() + " master books: " + breaks
                        + " FOBO breaks, " + material + " above materiality and routed to investigation."));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("runId", command.runId(), "status", "ACCEPTED"));
    }

    @PostMapping("/axiom/reports/15c3")
    public ResponseEntity<Map<String, String>> axiom(@RequestBody ActionCommand command) {
        log.info("Axiom received {} for {}", command.runId(), command.correlationId());
        String reportId = "RPT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        int rowCount = 1_800 + command.inputs() * 240 + random.nextInt(600);
        String catalogId = "AXM-15C3-" + command.cobDate().toString().replace("-", "");
        String reportUri = "onefinux://reports/15c3/" + command.cobDate() + "/" + command.region() + "/" + reportId;
        reply(command, "AXIOM", Map.of(
                "reportId", reportId,
                "catalogId", catalogId,
                "reportUri", reportUri,
                "rowCount", rowCount,
                "summary", "15C3 report " + reportId + " generated from " + command.inputs()
                        + " inputs (" + rowCount + " rows) and is available to view."));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("runId", command.runId(), "status", "ACCEPTED"));
    }

    @PostMapping("/fas/adjust")
    public ResponseEntity<Map<String, String>> fasAdjust(@RequestBody Map<String, Object> command) {
        String runId = String.valueOf(command.getOrDefault("runId", "RUN-ADJ"));
        String instanceId = String.valueOf(command.getOrDefault("instanceId", ""));
        String sourceKey = String.valueOf(command.getOrDefault("sourceKey", "MB014"));
        LocalDate cob = LocalDate.parse(String.valueOf(command.getOrDefault("cobDate", LocalDate.now().toString())));
        String region = String.valueOf(command.getOrDefault("region", "EMEA"));
        log.info("FAS/Motif received adjust {} for {} key {}", runId, instanceId, sourceKey);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("instanceId", instanceId);
        result.put("runId", runId);
        if (command.get("account") != null) {
            result.put("account", command.get("account"));
        }
        if (command.get("journalId") != null) {
            result.put("journalId", command.get("journalId"));
        }
        if (command.get("amount") != null) {
            result.put("amount", command.get("amount"));
        }
        if (command.get("fsLine") != null) {
            result.put("fsLine", command.get("fsLine"));
        }
        result.put("summary", "Motif posted adjustment " + runId + " for " + sourceKey);
        scheduler.schedule(() -> hub.publish(new OutboundEvent(UUID.randomUUID().toString(), "LEDGER_POSTED", "MOTIF",
                sourceKey, cob, region, "COMPLETED", Instant.now(), result)), Math.min(seconds, 3), TimeUnit.SECONDS);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("runId", runId, "status", "ACCEPTED"));
    }

    private void reply(ActionCommand command, String source, Map<String, Object> result) {
        scheduler.schedule(() -> {
            Map<String, Object> attributes = new java.util.HashMap<>(result);
            attributes.put("correlationId", command.correlationId());
            attributes.put("runId", command.runId());
            hub.publish(new OutboundEvent(UUID.randomUUID().toString(), command.completionEvent(), source,
                    command.runId(), command.cobDate(), command.region(), "COMPLETED", Instant.now(), attributes));
        }, seconds, TimeUnit.SECONDS);
    }
}
