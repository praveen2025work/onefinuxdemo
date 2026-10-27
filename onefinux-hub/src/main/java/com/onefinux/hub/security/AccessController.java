package com.onefinux.hub.security;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Access, in one place: what I have and why, one request for everything a desk needs, approvals by someone else,
 * periodic review of every grant, and restoring a user suspended for inactivity. Approve and review are verbs in the
 * role structure (ACCESS_APPROVE, ACCESS_REVIEW), so who may do them is configuration.
 */
@RestController
@RequestMapping("/api/access")
public class AccessController {

    private final AccessRegistry access;
    private final CurrentUser currentUser;
    private final SecurityProperties props;

    public AccessController(AccessRegistry access, CurrentUser currentUser, SecurityProperties props) {
        this.access = access;
        this.currentUser = currentUser;
        this.props = props;
    }

    /** My entitlements: from the token, from approved requests, and the verbs my roles allow. */
    @GetMapping("/me")
    public Map<String, Object> me() {
        Entitlements ent = currentUser.entitlements();
        AccessRegistry.Snapshot granted = access.snapshot(ent.subject());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subject", ent.subject());
        m.put("roles", ent.roles());
        m.put("groupUnits", ent.superuser() ? List.of("*") : ent.groupUnits());
        m.put("ceesProducts", ent.ceesProducts());
        m.put("superuser", ent.superuser());
        m.put("suspended", ent.suspended());
        m.put("actions", ent.actions() == null ? List.of("*") : ent.actions().stream().sorted().toList());
        m.put("granted", Map.of("roles", granted.roles(), "groupUnits", granted.groupUnits(), "ceesProducts", granted.ceesProducts()));
        m.put("roleStructure", props.roleActions());
        m.put("inactivityDays", props.inactivityDays());
        return m;
    }

    /** Entitlement report: everyone the hub has seen, when, whether suspended, and what was granted to them. */
    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        require("ACCESS_REVIEW");
        return access.users();
    }

    @GetMapping("/requests")
    public List<Map<String, Object>> requests(@RequestParam(required = false) String status) {
        Entitlements ent = currentUser.entitlements();
        List<Map<String, Object>> all = access.requests(status);
        if (ent.canAct("ACCESS_APPROVE") && !ent.suspended()) return all;
        return all.stream().filter(r -> ent.subject().equals(r.get("subject"))).toList();
    }

    @PostMapping("/requests")
    public Map<String, Object> request(@RequestBody AccessRequest body) {
        if (body == null || body.target() == null || body.target().isBlank() || body.target().length() > 160) {
            throw bad("target (the desk or app the access is for) is required");
        }
        try {
            return access.request(currentUser.actor(), body.target().trim(), body.items() == null ? List.of() : body.items(),
                    body.reason() == null ? null : body.reason().substring(0, Math.min(400, body.reason().length())));
        } catch (IllegalArgumentException e) {
            throw bad(e.getMessage());
        }
    }

    @PostMapping("/requests/{id}/{decision}")
    public Map<String, Object> decide(@PathVariable String id, @PathVariable String decision) {
        require("ACCESS_APPROVE");
        if (!decision.equals("approve") && !decision.equals("reject")) throw bad("decision is approve or reject");
        return guarded(() -> access.decide(id, decision.equals("approve"), currentUser.actor()));
    }

    /** Review queue: every active grant, whether it still fits the role structure, and when the user was last seen. */
    @GetMapping("/review")
    public List<Map<String, Object>> review() {
        require("ACCESS_REVIEW");
        return access.reviewQueue(props.roleActions().keySet());
    }

    @PostMapping("/review/{grantId}")
    public Map<String, Object> reviewOne(@PathVariable long grantId, @RequestParam boolean keep) {
        require("ACCESS_REVIEW");
        return guarded(() -> access.review(grantId, keep, currentUser.actor()));
    }

    @PostMapping("/users/{subject}/restore")
    public Map<String, Object> restore(@PathVariable String subject) {
        require("ACCESS_APPROVE");
        if (subject.equals(currentUser.actor())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "you cannot restore yourself");
        access.restore(subject, currentUser.actor());
        return Map.of("subject", subject, "suspended", false);
    }

    /** Run the inactivity sweep now (it also runs nightly). */
    @PostMapping("/sweep")
    public Map<String, Object> sweep() {
        require("ACCESS_APPROVE");
        return Map.of("suspended", access.suspendInactive());
    }

    private void require(String verb) {
        Entitlements ent = currentUser.entitlements();
        if (ent.suspended() || !ent.canAct(verb) || "anonymous".equals(ent.subject())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow " + verb);
        }
    }

    private static <T> T guarded(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        }
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    public record AccessRequest(String target, List<Map<String, String>> items, String reason) {
    }
}
