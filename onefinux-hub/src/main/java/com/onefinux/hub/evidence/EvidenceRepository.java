package com.onefinux.hub.evidence;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/** Reads for the close evidence pack. Everything is oldest first, so the pack reads as a timeline. */
@Repository
class EvidenceRepository {

    private static final String TS = "'YYYY-MM-DD HH24:MI:SS'";

    private final NamedParameterJdbcTemplate jdbc;

    EvidenceRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<Map<String, Object>> decisions(String resource) {
        return jdbc.queryForList("""
                SELECT TO_CHAR(at, %s) AS "at", actor AS "actor", action AS "action", decision AS "decision",
                       detail_json AS "detail"
                FROM audit_log WHERE resource = :r ORDER BY at, id""".formatted(TS), new MapSqlParameterSource("r", resource));
    }

    List<Map<String, Object>> commandRuns(String instanceId) {
        return jdbc.queryForList("""
                SELECT run_id AS "runId", dest_id AS "destId", TO_CHAR(commanded_at, %s) AS "commandedAt",
                       TO_CHAR(completed_at, %s) AS "completedAt", result_locator AS "resultLocator", echo_ok AS "echoOk"
                FROM command_run WHERE instance_id = :id ORDER BY commanded_at""".formatted(TS, TS),
                new MapSqlParameterSource("id", instanceId));
    }

    List<Map<String, Object>> escalations(String instanceId) {
        return jdbc.queryForList("""
                SELECT escalation_id AS "escalationId", kind AS "kind", TO_CHAR(opened_at, %s) AS "openedAt",
                       status AS "status"
                FROM escalation WHERE instance_id = :id ORDER BY opened_at""".formatted(TS),
                new MapSqlParameterSource("id", instanceId));
    }

    List<Map<String, Object>> notifications(String instanceId) {
        return jdbc.queryForList("""
                SELECT TO_CHAR(created_at, %s) AS "at", severity AS "severity", transition AS "transition",
                       audience AS "audience", title AS "title"
                FROM notification WHERE instance_id = :id ORDER BY created_at, id""".formatted(TS),
                new MapSqlParameterSource("id", instanceId));
    }

    List<Map<String, Object>> notificationsForOutcome(String outcomeKey) {
        return jdbc.queryForList("""
                SELECT TO_CHAR(created_at, %s) AS "at", severity AS "severity", transition AS "transition",
                       audience AS "audience", title AS "title"
                FROM notification WHERE outcome_key = :k ORDER BY created_at, id""".formatted(TS),
                new MapSqlParameterSource("k", outcomeKey));
    }

    List<Map<String, Object>> facts(String instanceId) {
        return jdbc.queryForList("""
                SELECT event_id AS "eventId", TO_CHAR(occurred_at, %s) AS "occurredAt",
                       TO_CHAR(received_at, %s) AS "receivedAt", event_type AS "eventType",
                       source_system AS "sourceSystem", source_key AS "sourceKey", status AS "status",
                       ingest_offset AS "ingestOffset"
                FROM event_store WHERE instance_id = :id ORDER BY received_at, event_id""".formatted(TS, TS),
                new MapSqlParameterSource("id", instanceId));
    }

    List<Map<String, Object>> facts(java.time.LocalDate cobDate, String region) {
        return jdbc.queryForList("""
                SELECT event_id AS "eventId", TO_CHAR(occurred_at, %s) AS "occurredAt",
                       TO_CHAR(received_at, %s) AS "receivedAt", event_type AS "eventType",
                       source_system AS "sourceSystem", source_key AS "sourceKey", status AS "status",
                       attributes_json AS "attributesJson"
                FROM event_store WHERE cob_date = :cob AND region = :region
                ORDER BY received_at, event_id""".formatted(TS, TS),
                new MapSqlParameterSource("cob", java.sql.Date.valueOf(cobDate)).addValue("region", region));
    }
}
