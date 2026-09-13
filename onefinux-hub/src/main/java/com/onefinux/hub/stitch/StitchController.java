package com.onefinux.hub.stitch;

import com.onefinux.hub.stream.StreamHub;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * The stitch API. The console reads every dropdown and every filter from here; it never invents an id.
 * Instance ids carry '|' so they travel as a query parameter, not a path segment.
 */
@RestController
@RequestMapping("/api/stitch")
public class StitchController {

    private final StitchRepository repo;
    private final StitchService service;
    private final StreamHub stream;

    public StitchController(StitchRepository repo, StitchService service, StreamHub stream) {
        this.repo = repo;
        this.service = service;
        this.stream = stream;
    }

    @GetMapping("/context")
    public Map<String, Object> context() {
        return service.context(stream.clients());
    }

    @GetMapping("/group-units")
    public List<Map<String, Object>> groupUnits() {
        return repo.groupUnits();
    }

    @GetMapping("/instances")
    public List<Map<String, Object>> instances(@RequestParam(required = false) String groupUnit,
                                               @RequestParam(required = false) String cobDate,
                                               @RequestParam(required = false) String region,
                                               @RequestParam(required = false) String status) {
        return repo.instances(groupUnit, cobDate, region, status);
    }

    @GetMapping("/instance")
    public ResponseEntity<Map<String, Object>> instance(@RequestParam String id) {
        Map<String, Object> detail = service.instanceDetail(id);
        // Fail-closed contract: an unentitled / unknown instance is 404, never 403.
        return detail == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(detail);
    }

    @GetMapping("/instance/events")
    public List<Map<String, Object>> instanceEvents(@RequestParam String id) {
        return repo.eventsForInstance(id);
    }

    @PostMapping("/instance/signoff")
    public Map<String, Object> signoff(@RequestParam String id,
                                       @RequestBody(required = false) Map<String, Object> body) {
        String user = body == null ? null : (String) body.get("user");
        return service.signoff(id, user);
    }

    @PostMapping("/instance/post")
    public Map<String, Object> post(@RequestParam String id) {
        return service.post(id);
    }

    @PostMapping("/instance/escalate")
    public Map<String, Object> escalate(@RequestParam String id,
                                        @RequestBody(required = false) Map<String, Object> body) {
        String reason = body == null ? null : (String) body.get("reason");
        return service.escalate(id, reason);
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> notifications(@RequestParam(defaultValue = "50") int limit) {
        return repo.notifications(limit);
    }

    @GetMapping("/rtb")
    public Map<String, Object> rtb() {
        return Map.of(
                "escalations", repo.escalations(),
                "deadLetters", repo.deadLetters(),
                "watermarks", repo.watermarks());
    }

    @PostMapping("/deadletters/{id}/replay")
    public Map<String, Object> replay(@PathVariable String id) {
        int updated = repo.replayDeadLetter(id);
        return Map.of("deadLetterId", id, "replayed", updated > 0);
    }

    @GetMapping("/sources")
    public List<Map<String, Object>> sources() {
        return repo.sources();
    }

    @GetMapping("/destinations")
    public List<Map<String, Object>> destinations() {
        return repo.destinations();
    }

    @GetMapping("/kits")
    public List<Map<String, Object>> kits() {
        return repo.kits();
    }

    @PostMapping("/kits")
    public Map<String, Object> registerKit(@RequestBody Map<String, Object> body) {
        return service.registerKit(body);
    }

    @GetMapping("/datasets")
    public List<Map<String, Object>> datasets(@RequestParam(required = false) String groupUnit) {
        return repo.datasets(groupUnit);
    }

    @GetMapping("/explore")
    public List<Map<String, Object>> explore(@RequestParam(required = false) String groupUnit,
                                             @RequestParam(required = false) String source,
                                             @RequestParam(required = false) String cobDate,
                                             @RequestParam(required = false) String region,
                                             @RequestParam(required = false) String status) {
        return repo.explore(groupUnit, source, cobDate, region, status);
    }

    @GetMapping("/views")
    public List<Map<String, Object>> views(@RequestParam(required = false) String groupUnit) {
        return repo.views(groupUnit);
    }

    @PostMapping("/views")
    public Map<String, Object> saveView(@RequestBody Map<String, Object> body) {
        return service.saveView(body);
    }

    @DeleteMapping("/views/{id}")
    public Map<String, Object> deleteView(@PathVariable String id) {
        return Map.of("viewId", id, "deleted", repo.deleteView(id) > 0);
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        service.reset();
        return Map.of("reset", true);
    }
}
