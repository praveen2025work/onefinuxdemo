package com.onefinux.hub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Browser origins allowed to call the hub. Exact localhost URLs plus RFC1918 patterns on the
 * console ports so Ethernet / WiFi IPv4 works. Never a star origin and never any-port localhost.
 */
@ConfigurationProperties(prefix = "onefinux.cors")
public record CorsProperties(List<String> allowedOrigins, List<String> allowedOriginPatterns) {

    static final List<String> DEFAULT_ORIGINS = List.of(
            "http://localhost:7091",
            "http://127.0.0.1:7091",
            "http://localhost:8080",
            "http://127.0.0.1:8080");

    static final List<String> DEFAULT_PATTERNS = List.of(
            "http://192.168.*:7091",
            "http://10.*:7091",
            "http://172.*:7091",
            "http://169.254.*:7091",
            "http://192.168.*:8080",
            "http://10.*:8080",
            "http://172.*:8080",
            "http://169.254.*:8080");

    public CorsProperties {
        allowedOrigins = ExactOrigins.require(allowedOrigins == null ? DEFAULT_ORIGINS : allowedOrigins);
        allowedOriginPatterns = OriginPatterns.require(
                allowedOriginPatterns == null ? DEFAULT_PATTERNS : allowedOriginPatterns);
    }
}
