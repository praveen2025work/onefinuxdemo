package com.onefinux.sim;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets the One Finance console's Drive buttons reach this simulator. Exact origins only. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SimProperties properties;

    public WebConfig(SimProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = properties.allowedOrigins().toArray(String[]::new);
        if (origins.length == 0) {
            return;
        }
        registry.addMapping("/sim/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST");
    }
}
