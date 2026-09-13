package com.onefinux.sim;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets the One Finance UX board's demo buttons start scenarios here. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SimProperties properties;

    public WebConfig(SimProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // The configured origin (the hub, when the console is served same-origin) plus any localhost port,
        // so the dev console's scenario buttons work whichever Vite port they land on (5173, 5174, ...).
        registry.addMapping("/sim/**")
                .allowedOriginPatterns(properties.allowedOrigin(), "http://localhost:*", "http://127.0.0.1:*")
                .allowedMethods("GET", "POST");
    }
}
