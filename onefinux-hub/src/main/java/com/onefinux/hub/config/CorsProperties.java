package com.onefinux.hub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Exact browser origins allowed to call the hub. No star origin and no any-port localhost.
 * The product UI is same-origin behind Vite / IIS / nginx; this list is only for the Origin
 * header those proxies forward, plus a laptop hitting the hub without the proxy.
 */
@ConfigurationProperties(prefix = "onefinux.cors")
public record CorsProperties(List<String> allowedOrigins) {

    static final List<String> DEFAULT_ORIGINS = List.of(
            "http://localhost:7091",
            "http://127.0.0.1:7091",
            "http://localhost:8080",
            "http://127.0.0.1:8080");

    public CorsProperties {
        allowedOrigins = ExactOrigins.require(allowedOrigins == null ? DEFAULT_ORIGINS : allowedOrigins);
    }
}
