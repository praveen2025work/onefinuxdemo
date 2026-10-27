package com.onefinux.hub.writeback;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;

/**
 * Where approved grid edits are applied. A GridSpec names a target by key; only targets listed here can be called,
 * so a spec cannot point the hub at an arbitrary URL.
 */
@ConfigurationProperties(prefix = "onefinux.writeback")
public record WritebackProperties(Map<String, Target> targets) {

    public WritebackProperties {
        targets = targets == null ? Map.of() : Map.copyOf(targets);
    }

    public record Target(String url) {
    }
}
