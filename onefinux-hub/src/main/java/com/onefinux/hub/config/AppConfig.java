package com.onefinux.hub.config;

import com.onefinux.hub.stitch.DownstreamPoster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.ZoneId;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class AppConfig {

    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);

    @Bean
    public ZoneId businessZone(OneFinUxProperties properties) {
        return ZoneId.of(properties.zone());
    }

    @Bean
    public DownstreamPoster downstreamPoster(RestClient.Builder builder) {
        RestClient rest = builder.build();
        return (url, body) -> {
            try {
                rest.post().uri(url).contentType(MediaType.APPLICATION_JSON).body(body)
                        .retrieve().toBodilessEntity();
            } catch (Exception e) {
                log.warn("Downstream command to {} failed: {}", url, e.getMessage());
            }
        };
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
