package com.onefinux.hub.propagation;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Reads/writes the propagation tables: {@code event_route} (Admin-governed fan-out rules) and
 * {@code event_outbox} (one row per fact × matching route). Same JdbcTemplate-over-DDL approach as the
 * stitch layer, so the JSON contract the console reads is stable and there is no Hibernate drift.
 */
@Repository
public class PropagationRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public PropagationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private MapSqlParameterSource p() {
        return new MapSqlParameterSource();
    }

    /** Enabled routes whose (event_type, source_id) filter matches this fact. NULL filter means "any". */
    public List<Map<String, Object>> matchingRoutes(String eventType, String sourceId) {
        return jdbc.queryForList("""
                SELECT route_id AS "routeId", subscriber AS "subscriber", event_type AS "eventType",
                       source_id AS "sourceId", target_url AS "targetUrl"
                FROM event_route
                WHERE enabled = 'Y'
                  AND (event_type IS NULL OR event_type = :eventType)
                  AND (source_id  IS NULL OR source_id  = :sourceId)
                ORDER BY route_id""",
                p().addValue("eventType", eventType).addValue("sourceId", sourceId));
    }

    public void enqueue(String outboxId, String eventId, String routeId, String subscriber, String eventType,
                        String sourceId, String targetUrl, String payloadJson) {
        jdbc.update("""
                INSERT INTO event_outbox (outbox_id, event_id, route_id, subscriber, event_type, source_id,
                                          target_url, payload_json, status, attempts, created_at)
                VALUES (:outboxId, :eventId, :routeId, :subscriber, :eventType, :sourceId,
                        :targetUrl, :payload, 'PENDING', 0, :now)""",
                p().addValue("outboxId", outboxId).addValue("eventId", eventId).addValue("routeId", routeId)
                        .addValue("subscriber", subscriber).addValue("eventType", eventType)
                        .addValue("sourceId", sourceId).addValue("targetUrl", targetUrl)
                        .addValue("payload", payloadJson).addValue("now", Instant.now()));
    }

    public List<Map<String, Object>> pending(int limit) {
        return jdbc.queryForList("""
                SELECT outbox_id AS "outboxId", event_id AS "eventId", subscriber AS "subscriber",
                       target_url AS "targetUrl", payload_json AS "payload"
                FROM event_outbox WHERE status = 'PENDING'
                ORDER BY created_at FETCH FIRST :limit ROWS ONLY""",
                p().addValue("limit", Math.max(1, limit)));
    }

    public void markDispatched(String outboxId) {
        jdbc.update("""
                UPDATE event_outbox SET status = 'DISPATCHED', attempts = attempts + 1,
                       dispatched_at = :now, last_error = NULL WHERE outbox_id = :id""",
                p().addValue("id", outboxId).addValue("now", Instant.now()));
    }

    public void markFailed(String outboxId, String error) {
        jdbc.update("""
                UPDATE event_outbox SET status = 'FAILED', attempts = attempts + 1, last_error = :err
                WHERE outbox_id = :id""",
                p().addValue("id", outboxId).addValue("err", error == null ? "error" : error.substring(0, Math.min(error.length(), 390))));
    }

    public int retry(String outboxId) {
        return jdbc.update("""
                UPDATE event_outbox SET status = 'PENDING', last_error = NULL
                WHERE outbox_id = :id AND status = 'FAILED'""",
                p().addValue("id", outboxId));
    }

    public List<Map<String, Object>> outbox(String status, int limit) {
        MapSqlParameterSource params = p().addValue("limit", Math.max(1, Math.min(limit, 500)));
        String filter = "";
        if (status != null && !status.isBlank()) {
            filter = " WHERE status = :status ";
            params.addValue("status", status);
        }
        String sql = """
                SELECT outbox_id AS "outboxId", event_id AS "eventId", route_id AS "routeId",
                       subscriber AS "subscriber", event_type AS "eventType", source_id AS "sourceId",
                       target_url AS "targetUrl", status AS "status", attempts AS "attempts",
                       CAST(created_at AS VARCHAR) AS "createdAt", CAST(dispatched_at AS VARCHAR) AS "dispatchedAt",
                       last_error AS "lastError"
                FROM event_outbox """ + filter + " ORDER BY created_at DESC FETCH FIRST :limit ROWS ONLY";
        return jdbc.queryForList(sql, params);
    }

    public Map<String, Object> outboxCounts() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT status AS \"status\", COUNT(*) AS \"n\" FROM event_outbox GROUP BY status", p());
        long pending = 0;
        long dispatched = 0;
        long failed = 0;
        for (Map<String, Object> r : rows) {
            long n = ((Number) r.get("n")).longValue();
            switch (String.valueOf(r.get("status"))) {
                case "PENDING" -> pending = n;
                case "DISPATCHED" -> dispatched = n;
                case "FAILED" -> failed = n;
                default -> { }
            }
        }
        return Map.of("pending", pending, "dispatched", dispatched, "failed", failed,
                "total", pending + dispatched + failed);
    }

    public List<Map<String, Object>> routes() {
        return jdbc.queryForList("""
                SELECT route_id AS "routeId", subscriber AS "subscriber", event_type AS "eventType",
                       source_id AS "sourceId", target_url AS "targetUrl", description AS "description",
                       enabled AS "enabled",
                       (SELECT COUNT(*) FROM event_outbox o WHERE o.route_id = r.route_id) AS "delivered"
                FROM event_route r ORDER BY route_id""", p());
    }
}
