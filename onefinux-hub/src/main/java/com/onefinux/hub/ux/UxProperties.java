package com.onefinux.hub.ux;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * The One UX platform's own configuration: A-B experiments, the search sources other applications register so the
 * header search covers them, and how long usage events are kept.
 */
@ConfigurationProperties(prefix = "onefinux.ux")
public record UxProperties(List<Experiment> experiments, List<SearchProvider> searchProviders, Integer retentionDays) {

    public UxProperties {
        experiments = experiments == null ? List.of() : List.copyOf(experiments);
        searchProviders = searchProviders == null ? List.of() : List.copyOf(searchProviders);
        retentionDays = retentionDays == null ? 180 : retentionDays;
    }

    /**
     * An experiment: variants with weights; each user always sees the same variant. {@code conversion} names the
     * component-use event that counts as success, so the results compare variants on it.
     */
    public record Experiment(String id, String description, List<String> variants, List<Integer> weights, boolean enabled,
                             String conversion) {
        public Experiment {
            variants = variants == null || variants.isEmpty() ? List.of("A", "B") : List.copyOf(variants);
            weights = weights == null || weights.size() != variants.size()
                    ? variants.stream().map(v -> 1).toList() : List.copyOf(weights);
        }
    }

    /**
     * Another application's search: GET {@code url}?q=… returns {@code {hits: [{kind, id, title, detail, route}]}}.
     * The console calls it from the browser (same origin or CORS), so the user's own access applies.
     */
    public record SearchProvider(String id, String label, String url) {
    }
}
