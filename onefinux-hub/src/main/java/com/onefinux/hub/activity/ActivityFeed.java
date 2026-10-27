package com.onefinux.hub.activity;

import com.onefinux.hub.stream.StreamHub;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Who did what, to which business outcome. Every human action (sign-off, post, override, re-run, a partner screen's
 * own action) is pushed to every open console the moment it happens — live event {@code activity}, over the
 * WebSocket and SSE — so an outcome desk on another screen, tab or browser sees it. The last {@value #KEEP} are kept
 * in memory so a desk opened later shows recent activity; the audit trail and the event store stay the durable record.
 */
@Component
public class ActivityFeed {

    static final int KEEP = 300;

    private final StreamHub stream;
    private final Clock clock;
    private final Deque<Map<String, Object>> recent = new ArrayDeque<>();
    private final AtomicLong seq = new AtomicLong();

    public ActivityFeed(StreamHub stream, Clock clock) {
        this.stream = stream;
        this.clock = clock;
    }

    /** Record an activity and push it to every console. Returns the payload that was sent. */
    public Map<String, Object> publish(Activity activity) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", "ACT-" + seq.incrementAndGet());
        payload.put("at", clock.instant().toString());
        put(payload, "action", activity.action());
        put(payload, "actor", activity.actor());
        put(payload, "summary", activity.summary());
        put(payload, "outcomeId", activity.outcomeId());
        put(payload, "kitId", activity.kitId());
        put(payload, "instanceId", activity.instanceId());
        put(payload, "groupUnitId", activity.groupUnitId());
        put(payload, "cobDate", activity.cobDate());
        put(payload, "region", activity.region());
        put(payload, "source", activity.source());
        synchronized (recent) {
            recent.addFirst(payload);
            while (recent.size() > KEEP) recent.removeLast();
        }
        stream.broadcast("activity", payload);
        return payload;
    }

    /** Newest first. With an outcome id or kit id, only activity on that outcome (either key matches). */
    public List<Map<String, Object>> recent(String outcomeId, String kitId, int limit) {
        int max = Math.max(1, Math.min(limit, KEEP));
        boolean all = blank(outcomeId) && blank(kitId);
        List<Map<String, Object>> out = new ArrayList<>();
        synchronized (recent) {
            for (Map<String, Object> a : recent) {
                if (all || matches(a.get("outcomeId"), outcomeId) || matches(a.get("kitId"), kitId)) out.add(a);
                if (out.size() >= max) break;
            }
        }
        return out;
    }

    private static boolean matches(Object value, String wanted) {
        return !blank(wanted) && value instanceof String s && s.equalsIgnoreCase(wanted);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static void put(Map<String, Object> map, String key, String value) {
        if (value != null && !value.isBlank()) map.put(key, value);
    }

    /** One action. Only {@code action} and {@code summary} are required; the keys say which outcome it belongs to. */
    public record Activity(String action, String actor, String summary, String outcomeId, String kitId,
                           String instanceId, String groupUnitId, String cobDate, String region, String source) {
    }
}
