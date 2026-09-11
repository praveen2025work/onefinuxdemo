package com.onefinux.sim;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sim")
public record SimProperties(String hubUrl, String zone, String allowedOrigin, Integer downstreamSeconds) {

    public SimProperties {
        hubUrl = hubUrl == null ? "http://localhost:7070" : hubUrl;
        zone = zone == null ? "America/New_York" : zone;
        allowedOrigin = allowedOrigin == null ? "http://localhost:7070" : allowedOrigin;
        downstreamSeconds = downstreamSeconds == null ? 6 : downstreamSeconds;
    }
}
