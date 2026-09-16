package com.onefinux.sim;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "sim")
public record SimProperties(String hubUrl, String zone, List<String> allowedOrigins, Integer downstreamSeconds) {

    static final List<String> DEFAULT_ORIGINS = List.of(
            "http://localhost:7091",
            "http://127.0.0.1:7091",
            "http://localhost:8080",
            "http://127.0.0.1:8080");

    public SimProperties {
        hubUrl = hubUrl == null ? "http://localhost:7070" : hubUrl;
        zone = zone == null ? "America/New_York" : zone;
        allowedOrigins = ExactOrigins.require(allowedOrigins == null ? DEFAULT_ORIGINS : allowedOrigins);
        downstreamSeconds = downstreamSeconds == null ? 6 : downstreamSeconds;
    }
}
