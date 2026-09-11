package com.onefinux.sim;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Plays the part of the finance estate for the POC: Motif, SAP, GMIS, RAM, US Castle, Finance Store and
 * Axiom publish events to the hub over HTTP, and mock Helix / Axiom accept downstream commands and
 * report back with their own completion events. Nothing here is polled.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class SourceSimulatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(SourceSimulatorApplication.class, args);
    }
}
