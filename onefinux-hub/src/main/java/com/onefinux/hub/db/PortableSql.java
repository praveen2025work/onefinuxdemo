package com.onefinux.hub.db;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * SQL that runs unchanged on H2 (the demo store) and Oracle 19c. Upserts are UPDATE-then-INSERT rather than a
 * vendor MERGE, and boolean columns (BOOLEAN on H2, NUMBER(1) on Oracle) are read through {@link #truthy}.
 * PortableSqlTest fails the build when H2-only syntax (MERGE ... KEY, LIMIT, CAST AS VARCHAR) appears in main code.
 */
public final class PortableSql {

    private PortableSql() {
    }

    /**
     * Insert the row, or update every non-key column of the row with the same key. {@code columns} maps each column
     * to its SQL value expression (a named parameter such as {@code :st}, or a literal such as CURRENT_TIMESTAMP);
     * the key columns must be in it.
     */
    public static void upsert(NamedParameterJdbcTemplate jdbc, String table, List<String> keys,
                              Map<String, String> columns, MapSqlParameterSource params) {
        String where = keys.stream().map(k -> k + " = " + columns.get(k)).collect(Collectors.joining(" AND "));
        String set = columns.entrySet().stream().filter(e -> !keys.contains(e.getKey()))
                .map(e -> e.getKey() + " = " + e.getValue()).collect(Collectors.joining(", "));
        String update = set.isEmpty() ? null : "UPDATE " + table + " SET " + set + " WHERE " + where;
        if (update != null && jdbc.update(update, params) > 0) {
            return;
        }
        String insert = "INSERT INTO " + table + " (" + String.join(", ", columns.keySet()) + ") VALUES ("
                + String.join(", ", columns.values()) + ")";
        try {
            jdbc.update(insert, params);
        } catch (DuplicateKeyException raced) {
            if (update != null) {
                jdbc.update(update, params);
            }
        }
    }

    /** Column-to-expression pairs, in order, for {@link #upsert}: {@code cols("kit_id", ":kit", "status", "'LIVE'")}. */
    public static Map<String, String> cols(String... columnThenExpression) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < columnThenExpression.length; i += 2) {
            m.put(columnThenExpression[i], columnThenExpression[i + 1]);
        }
        return m;
    }

    /** A boolean column's value as read back: Boolean on H2, a number (1 / 0) on Oracle. */
    public static boolean truthy(Object v) {
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number n) {
            return n.intValue() != 0;
        }
        return v != null && ("Y".equalsIgnoreCase(v.toString()) || "true".equalsIgnoreCase(v.toString()) || "1".equals(v.toString()));
    }
}
