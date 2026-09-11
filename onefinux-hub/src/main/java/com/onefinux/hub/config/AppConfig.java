package com.onefinux.hub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class AppConfig {

    @Bean
    public ZoneId businessZone(OneFinUxProperties properties) {
        return ZoneId.of(properties.zone());
    }

    @Bean
    public Clock clock(ZoneId businessZone) {
        return Clock.system(businessZone);
    }

    /** Downstream commands (Helix, Axiom) run off the ingestion thread. */
    @Bean(destroyMethod = "close")
    public ExecutorService actionExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
