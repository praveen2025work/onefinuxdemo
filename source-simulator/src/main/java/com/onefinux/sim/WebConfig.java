package com.onefinux.sim;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets the One Finance console's Drive buttons reach this simulator from localhost or LAN IPv4. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SimProperties properties;

    public WebConfig(SimProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = properties.allowedOrigins().toArray(String[]::new);
        String[] patterns = properties.allowedOriginPatterns().toArray(String[]::new);
        if (origins.length == 0 && patterns.length == 0) {
            return;
        }
        var mapping = registry.addMapping("/sim/**").allowedMethods("GET", "POST");
        if (origins.length > 0) {
            mapping.allowedOrigins(origins);
        }
        if (patterns.length > 0) {
            mapping.allowedOriginPatterns(patterns);
        }
    }
}
