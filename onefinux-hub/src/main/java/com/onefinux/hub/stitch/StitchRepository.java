package com.onefinux.hub.stitch;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * All reads and writes for the stitch schema (docs/design/schema/onefinux-stitch.sql).
 *
 * We deliberately use JdbcTemplate against the DDL rather than a JPA entity per table: the schema is
 * the agreed contract, the columns are camelCase-aliased here so the API and the React console read one
 * shape, and there is no Hibernate/DDL drift to manage. Dates are cast to text ('YYYY-MM-DD') so the
 * JSON contract is stable regardless of the JDBC driver's temporal binding.
 */
@Repository
public class StitchRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public StitchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private MapSqlParameterSource p() {
        return new MapSqlParameterSource();
    }

    // ---------------------------------------------------------------- tenancy + catalog

    public List<Map<String, Object>> groupUnits() {
        return jdbc.queryForList("""
                SELECT group_unit_id AS "groupUnitId", name AS "name", domain AS "domain",
                       cees_resource AS "ceesResource", default_region AS "defaultRegion", status AS "status"
                FROM group_unit ORDER BY group_unit_id""", p());
    }

    public List<Map<String, Object>> sources() {
        return jdbc.queryForList("""
                SELECT source_id AS "sourceId", display_name AS "displayName",
                       identifier_type AS "identifierType", ingest_mode AS "ingestMode",
                       topic_or_url AS "topicOrUrl", mapper_id AS "mapperId"
                FROM source_system ORDER BY source_id""", p());
    }

    public List<Map<String, Object>> destinations() {
        return jdbc.queryForList("""
                SELECT dest_id AS "destId", display_name AS "displayName",
                       action_type AS "actionType", command_url AS "commandUrl"
                FROM destination_system ORDER BY dest_id""", p());
    }

    public List<Map<String, Object>> kits() {
        return jdbc.queryForList("""
                SELECT kit_id AS "kitId", group_unit_id AS "groupUnitId", domain AS "domain", question AS "question",
                       renderer AS "renderer", user_actions AS "userActions", cees_product AS "ceesProduct",
                       sla_cutoff AS "slaCutoff", version AS "version", status AS "status"
                FROM product_kit ORDER BY kit_id""", p());
    }

    public Map<String, Object> kitById(String kitId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT kit_id AS "kitId", group_unit_id AS "groupUnitId", domain AS "domain", question AS "question",
                       renderer AS "renderer", user_actions AS "userActions", cees_product AS "ceesProduct",
                       sla_cutoff AS "slaCutoff", version AS "version", status AS "status"
                FROM product_kit WHERE kit_id = :id""", p().addValue("id", kitId));
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> kitSources(String kitId) {
        return jdbc.queryForList("""
                SELECT ks.source_id AS "sourceId", s.display_name AS "displayName", s.identifier_type AS "identifierType",
                       s.ingest_mode AS "ingestMode", s.topic_or_url AS "topicOrUrl", s.mapper_id AS "mapperId",
                       ks.required AS "required"
                FROM kit_source ks JOIN source_system s ON s.source_id = ks.source_id
                WHERE ks.kit_id = :id ORDER BY ks.source_id""", p().addValue("id", kitId));
    }

    public List<Map<String, Object>> kitDestinations(String kitId) {
        return jdbc.queryForList("""
                SELECT kd.dest_id AS "destId", d.display_name AS "displayName", d.action_type AS "actionType",
                       d.command_url AS "commandUrl", kd.step_order AS "stepOrder"
                FROM kit_destination kd JOIN destination_system d ON d.dest_id = kd.dest_id
                WHERE kd.kit_id = :id ORDER BY kd.step_order""", p().addValue("id", kitId));
    }

    public Map<String, Object> kitEmbed(String kitId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT embed_url AS "embedUrl", allowed_origin AS "allowedOrigin", chrome AS "chrome"
                FROM kit_embed WHERE kit_id = :id""", p().addValue("id", kitId));
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> distinctCobDates() {
        return jdbc.queryForList(
                "SELECT DISTINCT CAST(cob_date AS VARCHAR) AS \"cobDate\" FROM outcome_instance ORDER BY 1 DESC", p());
    }

    public List<Map<String, Object>> distinctRegions() {
        return jdbc.queryForList(
                "SELECT DISTINCT region AS \"region\" FROM outcome_instance ORDER BY region", p());
    }

    // ---------------------------------------------------------------- board / instances

    public List<Map<String, Object>> instances(String groupUnit, String cobDate, String region, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT i.instance_id AS "instanceId", i.kit_id AS "kitId", k.question AS "question",
                       i.group_unit_id AS "groupUnitId", i.slice_key AS "sliceKey", i.region AS "region",
                       CAST(i.cob_date AS VARCHAR) AS "cobDate", i.status AS "status", i.run_id AS "runId",
                       i.named_blocker AS "namedBlocker", k.renderer AS "renderer", k.user_actions AS "userActions",
                       (SELECT COUNT(*) FROM readiness_key rk WHERE rk.instance_id = i.instance_id) AS "totalKeys",
                       (SELECT COUNT(*) FROM readiness_key rk WHERE rk.instance_id = i.instance_id AND rk.key_status = 'COMPLETED') AS "completedKeys",
                       (SELECT COUNT(*) FROM escalation e WHERE e.instance_id = i.instance_id AND e.status = 'OPEN') AS "openEscalations"
                FROM outcome_instance i JOIN product_kit k ON k.kit_id = i.kit_id
                WHERE 1 = 1""");
        MapSqlParameterSource ps = p();
        if (has(groupUnit)) { sql.append(" AND i.group_unit_id = :gu"); ps.addValue("gu", groupUnit); }
        if (has(cobDate))   { sql.append(" AND CAST(i.cob_date AS VARCHAR) = :cob"); ps.addValue("cob", cobDate); }
        if (has(region))    { sql.append(" AND i.region = :region"); ps.addValue("region", region); }
        if (has(status))    { sql.append(" AND i.status = :status"); ps.addValue("status", status); }
        sql.append(" ORDER BY i.status, i.instance_id");
        return jdbc.queryForList(sql.toString(), ps);
    }

    public Map<String, Object> instance(String instanceId) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT i.instance_id AS "instanceId", i.kit_id AS "kitId", k.question AS "question",
                       i.group_unit_id AS "groupUnitId", i.slice_key AS "sliceKey", i.region AS "region",
                       CAST(i.cob_date AS VARCHAR) AS "cobDate", i.status AS "status", i.run_id AS "runId",
                       i.named_blocker AS "namedBlocker", k.renderer AS "renderer", k.user_actions AS "userActions",
                       ke.embed_url AS "embedUrl", ke.allowed_origin AS "allowedOrigin", ke.chrome AS "chrome"
                FROM outcome_instance i
                JOIN product_kit k ON k.kit_id = i.kit_id
                LEFT JOIN kit_embed ke ON ke.kit_id = i.kit_id
                WHERE i.instance_id = :id""", p().addValue("id", instanceId));
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> readinessKeys(String instanceId) {
        return jdbc.queryForList("""
                SELECT rk.source_id AS "sourceId", s.display_name AS "sourceName", rk.source_key AS "sourceKey",
                       rk.key_status AS "keyStatus", rk.last_event_id AS "lastEventId", ks.required AS "required"
                FROM readiness_key rk
                JOIN source_system s ON s.source_id = rk.source_id
                LEFT JOIN outcome_instance i ON i.instance_id = rk.instance_id
                LEFT JOIN kit_source ks ON ks.kit_id = i.kit_id AND ks.source_id = rk.source_id
                WHERE rk.instance_id = :id ORDER BY rk.source_id, rk.source_key""",
                p().addValue("id", instanceId));
    }

    public List<Map<String, Object>> destinationsForInstance(String instanceId) {
        return jdbc.queryForList("""
                SELECT d.dest_id AS "destId", d.display_name AS "displayName", d.action_type AS "actionType",
                       kd.step_order AS "stepOrder",
                       (SELECT cr.echo_ok FROM command_run cr WHERE cr.instance_id = :id AND cr.dest_id = d.dest_id
                        ORDER BY cr.commanded_at DESC LIMIT 1) AS "echoOk"
                FROM outcome_instance i
                JOIN kit_destination kd ON kd.kit_id = i.kit_id
                JOIN destination_system d ON d.dest_id = kd.dest_id
                WHERE i.instance_id = :id ORDER BY kd.step_order""",
                p().addValue("id", instanceId));
    }

    public List<Map<String, Object>> eventsForInstance(String instanceId) {
        return jdbc.queryForList("""
                SELECT event_id AS "eventId", event_type AS "eventType", source_system AS "sourceSystem",
                       source_key AS "sourceKey", status AS "status", CAST(cob_date AS VARCHAR) AS "cobDate", region AS "region",
                       CAST(occurred_at AS VARCHAR) AS "occurredAt", ingest_offset AS "ingestOffset"
                FROM event_store WHERE instance_id = :id ORDER BY occurred_at DESC, event_id""",
                p().addValue("id", instanceId));
    }

    // ---------------------------------------------------------------- fold writes

    public String kitOf(String instanceId) {
        List<String> r = jdbc.queryForList(
                "SELECT kit_id FROM outcome_instance WHERE instance_id = :id",
                p().addValue("id", instanceId), String.class);
        return r.isEmpty() ? null : r.get(0);
    }

    public String statusOf(String instanceId) {
        List<String> r = jdbc.queryForList(
                "SELECT status FROM outcome_instance WHERE instance_id = :id",
                p().addValue("id", instanceId), String.class);
        return r.isEmpty() ? null : r.get(0);
    }

    public List<String> requiredSources(String kitId) {
        return jdbc.queryForList(
                "SELECT source_id FROM kit_source WHERE kit_id = :kit AND required = 'Y'",
                p().addValue("kit", kitId), String.class);
    }

    public void upsertReadinessKey(String instanceId, String sourceId, String sourceKey,
                                   String keyStatus, String lastEventId) {
        jdbc.update("""
                MERGE INTO readiness_key KEY (instance_id, source_id, source_key)
                VALUES (:id, :src, :key, :st, :evt)""",
                p().addValue("id", instanceId).addValue("src", sourceId).addValue("key", sourceKey)
                        .addValue("st", keyStatus).addValue("evt", lastEventId));
    }

    public void linkEventToInstance(String eventId, String instanceId) {
        jdbc.update("UPDATE event_store SET instance_id = :inst WHERE event_id = :id AND instance_id IS NULL",
                p().addValue("inst", instanceId).addValue("id", eventId));
    }

    public void updateInstanceStatus(String instanceId, String status, String namedBlocker, String runId) {
        MapSqlParameterSource ps = p().addValue("id", instanceId).addValue("st", status)
                .addValue("blk", namedBlocker);
        String sql = "UPDATE outcome_instance SET status = :st, named_blocker = :blk, updated_at = CURRENT_TIMESTAMP";
        if (runId != null) { sql += ", run_id = :run"; ps.addValue("run", runId); }
        sql += " WHERE instance_id = :id";
        jdbc.update(sql, ps);
    }

    public void insertPendingCommandRun(String runId, String instanceId, String destId) {
        jdbc.update("""
                MERGE INTO command_run KEY (run_id) VALUES
                (:run, :id, :dest, CURRENT_TIMESTAMP, NULL, NULL, NULL)""",
                p().addValue("run", runId).addValue("id", instanceId).addValue("dest", destId));
    }

    public void completeCommandRun(String instanceId, String runId) {
        jdbc.update("""
                MERGE INTO command_run KEY (run_id) VALUES
                (:run, :id, 'HELIX', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :loc, 'Y')""",
                p().addValue("run", runId).addValue("id", instanceId)
                        .addValue("loc", "helix://analysis/" + runId));
    }

    // ---------------------------------------------------------------- notifications

    public void insertNotification(String severity, String transition, String kitId, String question,
                                   String audience, String title, String message, String channels,
                                   String instanceId, String groupUnitId) {
        jdbc.update("""
                INSERT INTO notification (created_at, severity, transition, outcome_key, outcome_name,
                    audience, title, message, channels, instance_id, group_unit_id)
                VALUES (CURRENT_TIMESTAMP, :sev, :tr, :kit, :q, :aud, :title, :msg, :ch, :inst, :gu)""",
                p().addValue("sev", severity).addValue("tr", transition).addValue("kit", kitId)
                        .addValue("q", question).addValue("aud", audience).addValue("title", title)
                        .addValue("msg", message).addValue("ch", channels).addValue("inst", instanceId)
                        .addValue("gu", groupUnitId));
    }

    public List<Map<String, Object>> notifications(int limit) {
        return jdbc.queryForList("""
                SELECT id AS "id", CAST(created_at AS VARCHAR) AS "createdAt", severity AS "severity", transition AS "transition",
                       outcome_key AS "kitId", outcome_name AS "question", audience AS "audience", title AS "title",
                       message AS "message", channels AS "channels", instance_id AS "instanceId", group_unit_id AS "groupUnitId"
                FROM notification ORDER BY id DESC LIMIT :lim""", p().addValue("lim", limit));
    }

    // ---------------------------------------------------------------- run-the-bank

    public List<Map<String, Object>> escalations() {
        return jdbc.queryForList("""
                SELECT e.escalation_id AS "escalationId", e.instance_id AS "instanceId", e.kind AS "kind",
                       CAST(e.opened_at AS VARCHAR) AS "openedAt", e.status AS "status", i.slice_key AS "sliceKey", i.region AS "region"
                FROM escalation e LEFT JOIN outcome_instance i ON i.instance_id = e.instance_id
                ORDER BY e.status, e.opened_at DESC""", p());
    }

    public List<Map<String, Object>> deadLetters() {
        return jdbc.queryForList("""
                SELECT dead_letter_id AS "deadLetterId", source_id AS "sourceId", ingest_offset AS "ingestOffset",
                       reason AS "reason", payload_ref AS "payloadRef", status AS "status", instance_id AS "instanceId"
                FROM dead_letter ORDER BY status, dead_letter_id""", p());
    }

    public List<Map<String, Object>> watermarks() {
        return jdbc.queryForList("""
                SELECT source_id AS "sourceId", partition_id AS "partitionId", last_offset AS "lastOffset",
                       lag_seconds AS "lagSeconds"
                FROM feed_watermark ORDER BY source_id, partition_id""", p());
    }

    public int replayDeadLetter(String deadLetterId) {
        return jdbc.update("UPDATE dead_letter SET status = 'REPLAYED' WHERE dead_letter_id = :id AND status = 'HOLD'",
                p().addValue("id", deadLetterId));
    }

    // ---------------------------------------------------------------- monitoring + audit

    /** Global event tape — the most recent facts across every source, for the monitoring screen. */
    public List<Map<String, Object>> recentEvents(int limit) {
        return jdbc.queryForList("""
                SELECT event_id AS "eventId", event_type AS "eventType", source_system AS "sourceSystem",
                       source_key AS "sourceKey", status AS "status", CAST(cob_date AS VARCHAR) AS "cobDate",
                       region AS "region", CAST(received_at AS VARCHAR) AS "receivedAt", instance_id AS "instanceId"
                FROM event_store ORDER BY received_at DESC, event_id FETCH FIRST :limit ROWS ONLY""",
                p().addValue("limit", Math.max(1, Math.min(limit, 500))));
    }

    public List<Map<String, Object>> eventCountsByStatus() {
        return jdbc.queryForList("""
                SELECT status AS "status", COUNT(*) AS "n" FROM event_store GROUP BY status ORDER BY status""", p());
    }

    public List<Map<String, Object>> eventCountsBySource() {
        return jdbc.queryForList("""
                SELECT source_system AS "sourceSystem", COUNT(*) AS "n",
                       CAST(MAX(received_at) AS VARCHAR) AS "lastReceivedAt"
                FROM event_store GROUP BY source_system ORDER BY source_system""", p());
    }

    public long eventTotal() {
        Long n = jdbc.getJdbcTemplate().queryForObject("SELECT COUNT(*) FROM event_store", Long.class);
        return n == null ? 0 : n;
    }

    public long deadLetterDepth() {
        Long n = jdbc.getJdbcTemplate().queryForObject(
                "SELECT COUNT(*) FROM dead_letter WHERE status = 'HOLD'", Long.class);
        return n == null ? 0 : n;
    }

    public Map<String, Object> commandStats() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT SUM(CASE WHEN echo_ok = 'Y' THEN 1 ELSE 0 END) AS "echoed",
                       SUM(CASE WHEN echo_ok IS NULL OR echo_ok <> 'Y' THEN 1 ELSE 0 END) AS "pending",
                       COUNT(*) AS "total"
                FROM command_run""", p());
        Map<String, Object> r = rows.isEmpty() ? Map.of() : rows.get(0);
        return Map.of(
                "echoed", num(r.get("echoed")), "pending", num(r.get("pending")), "total", num(r.get("total")));
    }

    public void insertAudit(String actor, String action, String resource, String decision, String detailJson) {
        jdbc.update("""
                INSERT INTO audit_log (at, actor, action, resource, decision, detail_json)
                VALUES (CURRENT_TIMESTAMP, :actor, :action, :resource, :decision, :detail)""",
                p().addValue("actor", actor == null ? "system" : actor).addValue("action", action)
                        .addValue("resource", resource).addValue("decision", decision == null ? "OK" : decision)
                        .addValue("detail", detailJson));
    }

    public List<Map<String, Object>> auditLog(int limit) {
        return jdbc.queryForList("""
                SELECT id AS "id", CAST(at AS VARCHAR) AS "at", actor AS "actor", action AS "action",
                       resource AS "resource", decision AS "decision", detail_json AS "detailJson"
                FROM audit_log ORDER BY at DESC, id DESC FETCH FIRST :limit ROWS ONLY""",
                p().addValue("limit", Math.max(1, Math.min(limit, 500))));
    }

    private static long num(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }

    public void insertEscalation(String escalationId, String instanceId, String kind) {
        jdbc.update("""
                MERGE INTO escalation KEY (escalation_id)
                VALUES (:id, :inst, :kind, CURRENT_TIMESTAMP, 'OPEN')""",
                p().addValue("id", escalationId).addValue("inst", instanceId).addValue("kind", kind));
    }

    // ---------------------------------------------------------------- onboarding writes

    public void insertKit(Map<String, Object> kit) {
        jdbc.update("""
                MERGE INTO product_kit KEY (kit_id) VALUES
                (:kitId, :groupUnitId, :domain, :question, :renderer, :userActions, :ceesProduct, :slaCutoff, 1, 'LIVE')""",
                new MapSqlParameterSource(kit));
    }

    public void insertKitSource(String kitId, String sourceId, boolean required) {
        jdbc.update("MERGE INTO kit_source KEY (kit_id, source_id) VALUES (:kit, :src, :req)",
                p().addValue("kit", kitId).addValue("src", sourceId).addValue("req", required ? "Y" : "N"));
    }

    public void insertKitDestination(String kitId, String destId, int stepOrder) {
        jdbc.update("MERGE INTO kit_destination KEY (kit_id, dest_id) VALUES (:kit, :dest, :step)",
                p().addValue("kit", kitId).addValue("dest", destId).addValue("step", stepOrder));
    }

    public void insertKitEmbed(String kitId, String url, String allowedOrigin, String chrome) {
        jdbc.update("MERGE INTO kit_embed KEY (kit_id) VALUES (:kit, :url, :origin, :chrome)",
                p().addValue("kit", kitId).addValue("url", url).addValue("origin", allowedOrigin)
                        .addValue("chrome", chrome == null ? "HOST" : chrome));
    }

    // ---------------------------------------------------------------- analyst

    public List<Map<String, Object>> datasets(String groupUnit) {
        MapSqlParameterSource ps = p();
        String sql = """
                SELECT dl.dataset_id AS "datasetId", dl.group_unit_id AS "groupUnitId", dl.source_id AS "sourceId",
                       s.display_name AS "sourceName", dl.instance_id AS "instanceId", dl.locator_url AS "locatorUrl"
                FROM dataset_locator dl JOIN source_system s ON s.source_id = dl.source_id""";
        if (has(groupUnit)) { sql += " WHERE dl.group_unit_id = :gu"; ps.addValue("gu", groupUnit); }
        sql += " ORDER BY dl.dataset_id";
        return jdbc.queryForList(sql, ps);
    }

    /** Facts from origins already bound to a group unit (the analyst explorer data set). */
    public List<Map<String, Object>> explore(String groupUnit, String source, String cobDate,
                                             String region, String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT e.event_id AS "eventId", e.event_type AS "eventType", e.source_system AS "sourceSystem",
                       e.source_key AS "sourceKey", e.status AS "status", CAST(e.cob_date AS VARCHAR) AS "cobDate", e.region AS "region",
                       CAST(e.occurred_at AS VARCHAR) AS "occurredAt", e.instance_id AS "instanceId",
                       e.ingest_offset AS "ingestOffset"
                FROM event_store e
                WHERE e.source_system IN (SELECT DISTINCT source_id FROM dataset_locator""");
        MapSqlParameterSource ps = p();
        if (has(groupUnit)) { sql.append(" WHERE group_unit_id = :gu"); ps.addValue("gu", groupUnit); }
        sql.append(")");
        if (has(source))  { sql.append(" AND e.source_system = :src"); ps.addValue("src", source); }
        if (has(cobDate)) { sql.append(" AND CAST(e.cob_date AS VARCHAR) = :cob"); ps.addValue("cob", cobDate); }
        if (has(region))  { sql.append(" AND e.region = :region"); ps.addValue("region", region); }
        if (has(status))  { sql.append(" AND e.status = :status"); ps.addValue("status", status); }
        sql.append(" ORDER BY e.occurred_at DESC, e.event_id");
        return jdbc.queryForList(sql.toString(), ps);
    }

    public List<Map<String, Object>> views(String groupUnit) {
        MapSqlParameterSource ps = p();
        String sql = """
                SELECT view_id AS "viewId", group_unit_id AS "groupUnitId", dataset_id AS "datasetId",
                       widget AS "widget", field_map_json AS "fieldMapJson", cees_report AS "ceesReport", status AS "status"
                FROM analyst_view_def""";
        if (has(groupUnit)) { sql += " WHERE group_unit_id = :gu"; ps.addValue("gu", groupUnit); }
        sql += " ORDER BY view_id";
        return jdbc.queryForList(sql, ps);
    }

    public void insertView(String viewId, String groupUnit, String datasetId, String widget,
                           String fieldMapJson, String ceesReport) {
        jdbc.update("""
                MERGE INTO analyst_view_def KEY (view_id)
                VALUES (:id, :gu, :ds, :w, :fm, :cees, 'SAVED')""",
                p().addValue("id", viewId).addValue("gu", groupUnit).addValue("ds", datasetId)
                        .addValue("w", widget).addValue("fm", fieldMapJson).addValue("cees", ceesReport));
    }

    public int deleteView(String viewId) {
        return jdbc.update("DELETE FROM analyst_view_def WHERE view_id = :id", p().addValue("id", viewId));
    }

    public String firstDatasetId(String groupUnit) {
        List<String> r = jdbc.queryForList(
                "SELECT dataset_id FROM dataset_locator WHERE group_unit_id = :gu ORDER BY dataset_id LIMIT 1",
                p().addValue("gu", groupUnit), String.class);
        return r.isEmpty() ? "DS-DEFAULT" : r.get(0);
    }

    // ---------------------------------------------------------------- demo reset

    /** Rewind the two seeded instances so the simulator can re-drive the fold live. */
    public void resetDemo() {
        jdbc.update("UPDATE readiness_key SET key_status = 'WAITING', last_event_id = NULL", p());
        jdbc.update("""
                UPDATE outcome_instance SET status = 'NOT_YET', named_blocker = NULL, run_id = NULL,
                    updated_at = CURRENT_TIMESTAMP""", p());
        jdbc.update("UPDATE escalation SET status = 'CLEARED'", p());
        jdbc.update("DELETE FROM event_outbox", p());
        jdbc.update("DELETE FROM event_store WHERE instance_id IS NOT NULL", p());
        jdbc.update("DELETE FROM notification WHERE instance_id IS NOT NULL", p());
    }

    public List<Map<String, Object>> instanceLookup() {
        return jdbc.queryForList("""
                SELECT instance_id AS "instanceId", kit_id AS "kitId", group_unit_id AS "groupUnitId",
                       CAST(cob_date AS VARCHAR) AS "cobDate", region, slice_key AS "sliceKey"
                FROM outcome_instance""", p());
    }

    private static boolean has(String v) {
        return v != null && !v.isBlank();
    }

    public Instant now() {
        return Instant.now();
    }
}
