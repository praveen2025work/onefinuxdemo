package com.onefinux.sim;

import java.util.List;

/** CORS origin patterns for Ethernet / WiFi IPv4 on the console ports only. */
final class OriginPatterns {

    private OriginPatterns() {
    }

    static List<String> require(List<String> patterns) {
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
