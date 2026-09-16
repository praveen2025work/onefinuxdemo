package com.onefinux.sim;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "sim")
public record SimProperties(
        String hubUrl,
        String zone,
        List<String> allowedOrigins,
        List<String> allowedOriginPatterns,
        Integer downstreamSeconds) {

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

    public SimProperties {
        hubUrl = hubUrl == null ? "http://localhost:7070" : hubUrl;
        zone = zone == null ? "America/New_York" : zone;
        allowedOrigins = ExactOrigins.require(allowedOrigins == null ? DEFAULT_ORIGINS : allowedOrigins);
        allowedOriginPatterns = OriginPatterns.require(
                allowedOriginPatterns == null ? DEFAULT_PATTERNS : allowedOriginPatterns);
        downstreamSeconds = downstreamSeconds == null ? 6 : downstreamSeconds;
    }
}
