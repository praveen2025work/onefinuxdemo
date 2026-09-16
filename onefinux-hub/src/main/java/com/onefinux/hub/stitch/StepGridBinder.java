package com.onefinux.hub.stitch;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns kit_destination.grid_params_json into request parameters using the instance context envelope.
 */
public final class StepGridBinder {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private StepGridBinder() {
    }

    public static List<Map<String, Object>> parse(String json) {
        if (json == null || json.isBlank() || "[]".equals(json.strip())) {
            return List.of();
        }
        try {
            List<Map<String, Object>> spec = MAPPER.readValue(json, new TypeReference<>() {});
            return spec == null ? List.of() : spec;
        } catch (Exception e) {
            return List.of();
        }
    }

    public static Map<String, String> bind(List<Map<String, Object>> spec, Map<String, Object> instance) {
        Map<String, String> out = new LinkedHashMap<>();
        if (spec == null) {
            return out;
        }
        for (Map<String, Object> item : spec) {
            if (item == null) {
                continue;
            }
            String name = str(item.get("name"));
            if (name == null || name.isBlank()) {
                continue;
            }
            Object literal = item.get("value");
            if (literal != null) {
                String value = str(literal);
                if (value != null && !value.isBlank()) {
                    out.put(name, value);
                }
                continue;
            }
            String from = str(item.get("from"));
            if (from == null || from.isBlank() || instance == null) {
                continue;
            }
            String value = str(instance.get(from));
            if (value != null && !value.isBlank() && !"null".equals(value)) {
                out.put(name, value);
            }
        }
        return out;
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }
}
