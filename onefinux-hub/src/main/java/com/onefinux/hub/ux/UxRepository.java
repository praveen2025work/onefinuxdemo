package com.onefinux.hub.ux;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Usage events, saved preferences and team templates. */
@Repository
public class UxRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public UxRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- usage events

    public void insertEvent(Instant at, String actor, String team, String type, String app, String component,
                            String variant, String detailJson) {
        jdbc.update("""
                INSERT INTO ux_event (at, actor, team, type, app, component, variant, detail_json)
                VALUES (:at, :actor, :team, :type, :app, :component, :variant, :detail)""",
                p().addValue("at", Timestamp.from(at)).addValue("actor", actor).addValue("team", team)
                        .addValue("type", type).addValue("app", app).addValue("component", component)
                        .addValue("variant", variant).addValue("detail", detailJson));
    }

    /** Opens per app (route or desk view): how often, by how many people, and when last. */
    public List<Map<String, Object>> appUsage(Instant since, String team) {
        return jdbc.queryForList("""
                SELECT app AS "app", COUNT(*) AS "opens", COUNT(DISTINCT actor) AS "users",
                       CAST(MAX(at) AS VARCHAR) AS "lastUsed"
                  FROM ux_event
                 WHERE type IN ('APP_OPEN', 'VIEW_OPEN') AND at >= :since AND (:team IS NULL OR team = :team)
                 GROUP BY app ORDER BY COUNT(*) DESC""", p().addValue("since", Timestamp.from(since)).addValue("team", team));
    }

    /** Uses per component (a lens switch, a search, an assistant question, a desk action). */
    public List<Map<String, Object>> componentUsage(Instant since, String team) {
        return jdbc.queryForList("""
                SELECT app AS "app", component AS "component", COUNT(*) AS "uses", COUNT(DISTINCT actor) AS "users",
                       CAST(MAX(at) AS VARCHAR) AS "lastUsed"
                  FROM ux_event
                 WHERE type IN ('COMPONENT_USE', 'SEARCH', 'ASSIST') AND at >= :since AND (:team IS NULL OR team = :team)
                 GROUP BY app, component ORDER BY COUNT(*) DESC""",
                p().addValue("since", Timestamp.from(since)).addValue("team", team));
    }

    /** Application access log: who opened what, newest first. */
    public List<Map<String, Object>> accessLog(Instant since, int limit) {
        return jdbc.queryForList("""
                SELECT CAST(at AS VARCHAR) AS "at", actor AS "actor", team AS "team", type AS "type", app AS "app"
                  FROM ux_event WHERE type IN ('APP_OPEN', 'VIEW_OPEN') AND at >= :since
                 ORDER BY at DESC LIMIT :limit""", p().addValue("since", Timestamp.from(since)).addValue("limit", limit));
    }

    public List<Map<String, Object>> feedback(int limit) {
        return jdbc.queryForList("""
                SELECT id AS "id", CAST(at AS VARCHAR) AS "at", actor AS "actor", team AS "team", app AS "app",
                       component AS "category", variant AS "rating", detail_json AS "detail"
                  FROM ux_event WHERE type = 'FEEDBACK' ORDER BY at DESC LIMIT :limit""", p().addValue("limit", limit));
    }

    /** Distinct users exposed to, and converting on, each variant of one experiment. */
    public List<Map<String, Object>> experimentResults(String experimentId) {
        return jdbc.queryForList("""
                SELECT variant AS "variant",
                       COUNT(DISTINCT CASE WHEN type = 'EXPOSURE' THEN actor END) AS "exposed",
                       COUNT(DISTINCT CASE WHEN type = 'CONVERSION' THEN actor END) AS "converted"
                  FROM ux_event WHERE component = :id AND type IN ('EXPOSURE', 'CONVERSION')
                 GROUP BY variant ORDER BY variant""", p().addValue("id", experimentId));
    }

    /**
     * What colleagues in the team opened recently that this user has not: apps ranked by how many teammates used
     * them, skipping anything the user opened in the last {@code ownDays}.
     */
    public List<Map<String, Object>> teamPicks(String subject, String team, Instant since, Instant ownSince, int limit) {
        return jdbc.queryForList("""
                SELECT app AS "app", COUNT(DISTINCT actor) AS "teammates", COUNT(*) AS "opens"
                  FROM ux_event
                 WHERE type IN ('APP_OPEN', 'VIEW_OPEN') AND team = :team AND actor <> :me AND at >= :since
                   AND app NOT IN (SELECT app FROM ux_event WHERE actor = :me AND at >= :own
                                     AND type IN ('APP_OPEN', 'VIEW_OPEN') AND app IS NOT NULL)
                 GROUP BY app ORDER BY COUNT(DISTINCT actor) DESC, COUNT(*) DESC LIMIT :limit""",
                p().addValue("team", team).addValue("me", subject).addValue("since", Timestamp.from(since))
                        .addValue("own", Timestamp.from(ownSince)).addValue("limit", limit));
    }

    public int purgeBefore(Instant cutoff) {
        return jdbc.update("DELETE FROM ux_event WHERE at < :c", p().addValue("c", Timestamp.from(cutoff)));
    }

    // ---------------------------------------------------------------- preferences

    public Optional<Map<String, Object>> pref(String subject, String key) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT CAST(json AS VARCHAR(1000000)) AS "json", CAST(updated_at AS VARCHAR) AS "updatedAt" FROM user_pref
                 WHERE subject = :s AND pref_key = :k""", p().addValue("s", subject).addValue("k", key));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public void savePref(String subject, String key, String json, Instant at) {
        int n = jdbc.update("UPDATE user_pref SET json = :j, updated_at = :t WHERE subject = :s AND pref_key = :k",
                p().addValue("j", json).addValue("t", Timestamp.from(at)).addValue("s", subject).addValue("k", key));
        if (n == 0) {
            jdbc.update("INSERT INTO user_pref (subject, pref_key, json, updated_at) VALUES (:s, :k, :j, :t)",
                    p().addValue("j", json).addValue("t", Timestamp.from(at)).addValue("s", subject).addValue("k", key));
        }
    }

    // ---------------------------------------------------------------- team templates

    public List<Map<String, Object>> templates(String team, String kind) {
        return jdbc.queryForList("""
                SELECT id AS "id", team AS "team", kind AS "kind", name AS "name", CAST(json AS VARCHAR(1000000)) AS "json",
                       created_by AS "createdBy", CAST(created_at AS VARCHAR) AS "createdAt"
                  FROM team_template WHERE team = :team AND (:kind IS NULL OR kind = :kind)
                 ORDER BY created_at DESC""", p().addValue("team", team).addValue("kind", kind));
    }

    public Optional<Map<String, Object>> template(String id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id AS \"id\", team AS \"team\", created_by AS \"createdBy\" FROM team_template WHERE id = :id",
                p().addValue("id", id));
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public void insertTemplate(String id, String team, String kind, String name, String json, String by, Instant at) {
        jdbc.update("""
                INSERT INTO team_template (id, team, kind, name, json, created_by, created_at)
                VALUES (:id, :team, :kind, :name, :json, :by, :at)""",
                p().addValue("id", id).addValue("team", team).addValue("kind", kind).addValue("name", name)
                        .addValue("json", json).addValue("by", by).addValue("at", Timestamp.from(at)));
    }

    public void deleteTemplate(String id) {
        jdbc.update("DELETE FROM team_template WHERE id = :id", p().addValue("id", id));
    }

    private static MapSqlParameterSource p() {
        return new MapSqlParameterSource();
    }
}
