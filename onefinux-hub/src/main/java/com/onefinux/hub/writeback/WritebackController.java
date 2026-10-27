package com.onefinux.hub.writeback;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Grid write-back: submit a change set, list and approve them, and read applied values for a grid. */
@RestController
public class WritebackController {

    private final WritebackService service;

    public WritebackController(WritebackService service) {
        this.service = service;
    }

    @PostMapping("/api/writeback/{gridId}")
    public Map<String, Object> submit(@PathVariable String gridId, @RequestBody WritebackService.Submission body) {
        return service.submit(gridId, body);
    }

    /** Change sets, optionally for one grid and one status (the checker's queue is status=PENDING). */
    @GetMapping("/api/writeback")
    public List<Map<String, Object>> list(@RequestParam(required = false) String grid, @RequestParam(required = false) String status) {
        return service.list(grid, status);
    }

    @GetMapping("/api/writeback/{gridId}/overlay")
    public Map<String, Map<String, Object>> overlay(@PathVariable String gridId) {
        return service.overlay(gridId);
    }

    @PostMapping("/api/writeback/sets/{id}/approve")
    public Map<String, Object> approve(@PathVariable String id) {
        return service.decide(id, true, null);
    }

    @PostMapping("/api/writeback/sets/{id}/reject")
    public Map<String, Object> reject(@PathVariable String id, @RequestParam(required = false) String reason) {
        return service.decide(id, false, reason);
    }
}
