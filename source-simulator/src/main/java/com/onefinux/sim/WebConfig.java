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
        registry.addMapping("/sim/**").allowedOrigins(properties.allowedOrigin()).allowedMethods("GET", "POST");
    }
}
