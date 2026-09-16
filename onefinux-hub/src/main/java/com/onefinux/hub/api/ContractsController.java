package com.onefinux.hub.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Schema registry. Publishes the versioned contracts the platform speaks so producers and downstream
 * subscribers can fetch the exact schema the gateway enforces (inbound facts) and the CloudEvents 1.0
 * envelope the outbox propagates (outbound facts). In production this fronts a real registry with
 * compatibility rules; here it serves the source-controlled schemas the build ships.
 */
@RestController
@RequestMapping("/api/contracts")
public class ContractsController {

    private record Contract(String name, String version, String direction, String resource) {
    }

    private static final List<Contract> CONTRACTS = List.of(
            new Contract("inbound-event", "v1", "inbound",
                    "contracts/inbound-event-v1.schema.json"),
            new Contract("feed-event", "v1", "inbound-feed",
                    "contracts/feed-event-v1.schema.json"),
            new Contract("generic-business-event", "v1", "outbound",
                    "contracts/generic-business-event-v1.schema.json"));

    private final ObjectMapper mapper;

    public ContractsController(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return CONTRACTS.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", c.name());
            m.put("version", c.version());
            m.put("direction", c.direction());
            m.put("url", "/api/contracts/" + c.name());
            return m;
        }).toList();
    }

    @GetMapping("/{name}")
    public ResponseEntity<JsonNode> schema(@PathVariable String name) {
        return CONTRACTS.stream()
                .filter(c -> c.name().equals(name))
                .findFirst()
                .map(c -> {
                    try (InputStream in = new ClassPathResource(c.resource()).getInputStream()) {
                        return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(mapper.readTree(in));
                    } catch (Exception e) {
                        throw new IllegalStateException("Could not read contract " + name, e);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
