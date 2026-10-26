package com.onefinux.hub.stream;

import com.onefinux.hub.config.CorsProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Registers {@code /api/ws}. The handshake accepts same-origin plus the exact CORS allowlist
 * (localhost and RFC1918 on the console ports) — the same rule as REST, never a star origin.
 */
@Configuration
@EnableWebSocket
public class LiveSocketConfig implements WebSocketConfigurer {

    private final LiveSocketHandler handler;
    private final CorsProperties cors;

    public LiveSocketConfig(LiveSocketHandler handler, CorsProperties cors) {
        this.handler = handler;
        this.cors = cors;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/api/ws")
                .setAllowedOrigins(cors.allowedOrigins().toArray(String[]::new))
                .setAllowedOriginPatterns(cors.allowedOriginPatterns().toArray(String[]::new));
    }
}
