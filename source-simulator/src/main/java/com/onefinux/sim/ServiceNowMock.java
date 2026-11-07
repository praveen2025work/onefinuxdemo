package com.onefinux.sim;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A stand-in ServiceNow instance: the Table API shape the hub's ServiceNow channel calls
 * ({@code POST /sim/servicenow/api/now/table/incident}). An incident with a known correlation_id is returned,
 * not duplicated, as a ServiceNow business rule on correlation_id would.
 */
@RestController
@RequestMapping("/sim/servicenow")
public class ServiceNowMock {

    private final List<Map<String, Object>> incidents = new ArrayList<>();
    private final AtomicInteger next = new AtomicInteger(10_001);

    @PostMapping("/api/now/table/{table}")
    public synchronized ResponseEntity<Map<String, Object>> create(@PathVariable String table, @RequestBody Map<String, Object> body) {
        Object correlation = body.get("correlation_id");
        for (Map<String, Object> existing : incidents) {
            if (correlation != null && correlation.equals(existing.get("correlation_id"))) {
                return ResponseEntity.ok(Map.of("result", existing));
            }
        }
        Map<String, Object> incident = new LinkedHashMap<>(body);
        incident.put("number", "INC00" + next.getAndIncrement());
        incident.put("sys_id", UUID.randomUUID().toString().replace("-", ""));
        incident.put("table", table);
        incident.put("state", "New");
        incident.put("opened_at", Instant.now().toString());
        incidents.add(0, incident);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("result", incident));
    }

    @GetMapping("/incidents")
    public synchronized List<Map<String, Object>> list() {
        return List.copyOf(incidents);
    }

    @DeleteMapping("/incidents")
    public synchronized Map<String, Integer> clear() {
        int n = incidents.size();
        incidents.clear();
        return Map.of("cleared", n);
    }
}
