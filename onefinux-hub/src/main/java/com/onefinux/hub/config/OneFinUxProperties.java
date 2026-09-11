package com.onefinux.hub.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

/**
 * Metadata that drives the platform. Adding a new business outcome is a configuration change,
 * not a code change: declare its dependencies, SLA and what to do when it becomes ready.
 * In production this moves from YAML to governed reference tables (Oracle) with effective dating.
 */
@ConfigurationProperties(prefix = "onefinux")
public record OneFinUxProperties(
        String zone,
        String publicUrl,
        String simulatorUrl,
        Translation translation,
        List<OutcomeDefinition> outcomes,
        Map<String, ActionTarget> actionTargets,
        Notifications notifications) {

    public OneFinUxProperties {
        zone = zone == null ? "America/New_York" : zone;
        publicUrl = publicUrl == null ? "http://localhost:7070" : publicUrl;
        translation = translation == null ? new Translation(null, null) : translation;
        outcomes = outcomes == null ? List.of() : List.copyOf(outcomes);
        actionTargets = actionTargets == null ? Map.of() : Map.copyOf(actionTargets);
        notifications = notifications == null ? new Notifications(null, true, null) : notifications;
    }

    public record Translation(Map<String, String> sourceIdentifiers, List<CrossReference> crossReferences) {
        public Translation {
            sourceIdentifiers = sourceIdentifiers == null ? Map.of() : Map.copyOf(sourceIdentifiers);
            crossReferences = crossReferences == null ? List.of() : List.copyOf(crossReferences);
        }
    }

    public record CrossReference(String fromType, String fromId, String toType, String toId) {
    }

    public record OutcomeDefinition(
            String id,
            String name,
            String question,
            List<String> regions,
            String ownerGroup,
            Sla sla,
            List<DependencyDefinition> dependencies,
            OnReady onReady) {

        public OutcomeDefinition {
            regions = regions == null || regions.isEmpty() ? List.of("GLOBAL") : List.copyOf(regions);
            dependencies = dependencies == null ? List.of() : List.copyOf(dependencies);
            sla = sla == null ? new Sla(null, 0, null) : sla;
        }

        public int expectedTotal() {
            return dependencies.stream().mapToInt(DependencyDefinition::expectedCount).sum();
        }

        public boolean hasAction() {
            return onReady != null && "HTTP_COMMAND".equalsIgnoreCase(onReady.action());
        }
    }

    /**
     * Either a business cut-off (e.g. 07:30 on COB+1) or, for demos, a window measured from the first event.
     */
    public record Sla(String cutoff, Integer dayOffset, Integer withinMinutes) {
        public Sla {
            dayOffset = dayOffset == null ? 0 : dayOffset;
        }
    }

    public record DependencyDefinition(String eventType, String sourceSystem, int expectedCount, String label) {
    }

    public record OnReady(String action, String target, String completionEvent, String actionLabel) {
    }

    public record ActionTarget(String url) {
    }

    public record Notifications(List<Integer> milestones, boolean logChannelEnabled, String webhookUrl) {
        public Notifications {
            milestones = milestones == null ? List.of(50, 90) : List.copyOf(milestones);
        }
    }
}
