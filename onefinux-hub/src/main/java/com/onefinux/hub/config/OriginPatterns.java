package com.onefinux.hub.config;

import java.util.List;

/**
 * CORS origin patterns for Ethernet / WiFi IPv4. Star is allowed only in the host, and only
 * for the console ports (7091, 8080). Never a star origin and never any console port.
 */
public final class OriginPatterns {

    private OriginPatterns() {
    }

    public static List<String> require(List<String> patterns) {
        List<String> copy = patterns == null ? List.of() : List.copyOf(patterns);
        for (String pattern : copy) {
            if (pattern == null || pattern.isBlank()) {
                throw new IllegalArgumentException("CORS origin pattern is blank");
            }
            if ("*".equals(pattern) || "http://*".equals(pattern) || "https://*".equals(pattern)) {
                throw new IllegalArgumentException("CORS must not allow every origin: " + pattern);
            }
            if (pattern.endsWith(":*")) {
                throw new IllegalArgumentException("CORS must not allow every port: " + pattern);
            }
            boolean consolePort = pattern.endsWith(":7091") || pattern.endsWith(":8080");
            if (!consolePort) {
                throw new IllegalArgumentException("CORS pattern must be the console port 7091 or 8080: " + pattern);
            }
            if (!pattern.startsWith("http://") && !pattern.startsWith("https://")) {
                throw new IllegalArgumentException("CORS pattern must be an http(s) URL: " + pattern);
            }
        }
        return copy;
    }
}
