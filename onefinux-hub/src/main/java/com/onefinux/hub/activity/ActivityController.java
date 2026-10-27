package com.onefinux.hub.activity;

import com.onefinux.hub.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Recent activity for a desk, and the door for screens One Finance does not own: a partner or STEPS screen that
 * performs an action in its own system posts it here, and every console desk on that outcome hears about it.
 * The actor is always the authenticated principal, never a value the client sends.
 */
@RestController
public class ActivityController {

    static final Pattern ACTION = Pattern.compile("^[A-Z][A-Z0-9_]{0,39}$");
    static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_|:./-]{1,80}$");
    static final Pattern LABEL = Pattern.compile("^[A-Za-z0-9._-]{1,40}$");
    static final int MAX_SUMMARY = 280;

    private final ActivityFeed feed;
    private final CurrentUser currentUser;

    public ActivityController(ActivityFeed feed, CurrentUser currentUser) {
        this.feed = feed;
        this.currentUser = currentUser;
    }

    @GetMapping("/api/activity")
    public List<Map<String, Object>> recent(@RequestParam(required = false) String outcomeId,
                                            @RequestParam(required = false) String kitId,
                                            @RequestParam(defaultValue = "50") int limit) {
        return feed.recent(outcomeId, kitId, limit);
    }

    @PostMapping("/api/interop/activity")
    public Map<String, Object> publish(@RequestBody ActivityPush body) {
        if (body == null || body.action() == null || !ACTION.matcher(body.action()).matches()) {
            throw bad("action must be an UPPER_SNAKE verb such as ASSIGNED (max 40 chars)");
        }
        if (body.summary() == null || body.summary().isBlank() || body.summary().length() > MAX_SUMMARY) {
            throw bad("summary is required (max " + MAX_SUMMARY + " chars)");
        }
        if (blank(body.outcomeId()) && blank(body.kitId())) {
            throw bad("outcomeId or kitId is required so desks know whose activity it is");
        }
        return feed.publish(new ActivityFeed.Activity(body.action(), currentUser.actor(), body.summary().trim(),
                key(body.outcomeId(), "outcomeId"), key(body.kitId(), "kitId"), key(body.instanceId(), "instanceId"),
                null, key(body.cobDate(), "cobDate"), key(body.region(), "region"),
                body.source() != null && LABEL.matcher(body.source()).matches() ? "client:" + body.source() : "client"));
    }

    private static String key(String value, String name) {
        if (blank(value)) return null;
        if (!KEY.matcher(value).matches()) throw bad(name + " has characters outside A-Z a-z 0-9 _ | : . / -");
        return value;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    public record ActivityPush(String action, String summary, String outcomeId, String kitId, String instanceId,
                               String cobDate, String region, String source) {
    }
}
