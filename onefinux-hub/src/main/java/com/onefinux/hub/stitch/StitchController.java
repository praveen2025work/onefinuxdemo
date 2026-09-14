package com.onefinux.hub.stitch;

import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.http.ResponseEntity;
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
    private final CurrentUser currentUser;

    public StitchController(StitchRepository repo, StitchService service, StreamHub stream, CurrentUser currentUser) {
        this.repo = repo;
        this.service = service;
        this.stream = stream;
        this.currentUser = currentUser;
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
        // Tenant-scoped: the service filters to the caller's entitled group units.
        return service.instances(groupUnit, cobDate, region, status);
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
    public Map<String, Object> signoff(@RequestParam String id) {
        // Actor is the authenticated principal, never a client-supplied name.
        return service.signoff(id);
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

    /**
     * Generic human action, gated by the instance's kit {@code userActions}. Launch a new console
     * capability by adding a verb to the kit — no new endpoint. Ids carry '|', so travel as query params.
     */
    @PostMapping("/instance/action")
    public Map<String, Object> action(@RequestParam String id, @RequestParam String action,
                                      @RequestBody(required = false) Map<String, Object> body) {
        return service.action(id, action, body);
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
        repo.insertAudit(currentUser.actor(), "REPLAY_DEADLETTER", id, updated > 0 ? "OK" : "DENY", null);
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

    @GetMapping("/kit")
    public ResponseEntity<Map<String, Object>> kit(@RequestParam String id) {
        Map<String, Object> kit = repo.kitById(id);
        if (kit == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
                "kit", kit,
                "sources", repo.kitSources(id),
                "destinations", repo.kitDestinations(id),
                "embed", repo.kitEmbed(id) == null ? Map.of() : repo.kitEmbed(id)));
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        service.reset();
        return Map.of("reset", true);
    }
}
