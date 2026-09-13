package com.onefinux.hub.outcome;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Durable read model for the outcome board. The engine is the single writer of truth (an in-memory
 * fold that can always be rebuilt by replay); this table is a projection of it so a restarting node, a
 * second replica, or a downstream reporting consumer can read the last known board straight from the
 * database. Written on every {@link OutcomeChanged}; never on replay (no events are published then).
 */
@Repository
public class OutcomeProjectionRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public OutcomeProjectionRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void upsert(OutcomeView v, String viewJson) {
        jdbc.update("""
                MERGE INTO outcome_projection
                    (instance_key, outcome_id, cob_date, region, status, view_json, updated_at)
                KEY (instance_key)
                VALUES (:key, :outcomeId, :cob, :region, :status, :json, :now)""",
                new MapSqlParameterSource()
                        .addValue("key", v.key())
                        .addValue("outcomeId", v.outcomeId())
                        .addValue("cob", v.cobDate())
                        .addValue("region", v.region())
                        .addValue("status", v.status() == null ? "UNKNOWN" : v.status().name())
                        .addValue("json", viewJson)
                        .addValue("now", Instant.now()));
    }

    public List<Map<String, Object>> all() {
        return jdbc.queryForList("""
                SELECT instance_key AS "key", outcome_id AS "outcomeId", CAST(cob_date AS VARCHAR) AS "cobDate",
                       region AS "region", status AS "status", CAST(updated_at AS VARCHAR) AS "updatedAt"
                FROM outcome_projection
                ORDER BY cob_date DESC, outcome_id, region""",
                new MapSqlParameterSource());
    }

    public int count() {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM outcome_projection",
                new MapSqlParameterSource(), Integer.class);
        return n == null ? 0 : n;
    }
}
