package com.onefinux.sim;

import java.util.List;

/** CORS origins must be full URLs. Wildcards are reject-at-boot. */
final class ExactOrigins {

    private ExactOrigins() {
    }

    static List<String> require(List<String> origins) {
        List<String> copy = origins == null ? List.of() : List.copyOf(origins);
        for (String origin : copy) {
            if (origin == null || origin.isBlank()) {
                throw new IllegalArgumentException("CORS origin is blank");
            }
            if (origin.contains("*") || "null".equalsIgnoreCase(origin) || "/".equals(origin)) {
                throw new IllegalArgumentException("CORS origin must be exact, not a wildcard: " + origin);
            }
        }
        return copy;
    }
}
