package com.onefinux.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * One Finance UX hub. A single deployable for the POC that contains the five logical components
 * from the vision document, each in its own package so they can be split into services later:
 *
 * <pre>
 *   event        Component 1  Event Hub            ingest, idempotency, persist, publish
 *   translation  Component 2  Translation Layer    source identifiers to business identifiers
 *   outcome      Component 3  Outcome Engine       readiness, progress, ETA, SLA
 *   workflow     Component 4  Workflow Layer       downstream actions, overrides, re-runs
 *   notification + stream + static UI  Component 5 notifications and the unified UX
 * </pre>
 */
@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class OneFinUxHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(OneFinUxHubApplication.class, args);
    }
}
