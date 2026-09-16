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
            OnReady onReady,
            List<GridStep> grids) {

        public OutcomeDefinition {
            regions = regions == null || regions.isEmpty() ? List.of("GLOBAL") : List.copyOf(regions);
            dependencies = dependencies == null ? List.of() : List.copyOf(dependencies);
            sla = sla == null ? new Sla(null, 0, null) : sla;
            grids = grids == null ? List.of() : List.copyOf(grids);
        }

        /** Existing 8-arg call sites keep compiling; grids default to empty. */
        public OutcomeDefinition(String id, String name, String question, List<String> regions,
                                 String ownerGroup, Sla sla, List<DependencyDefinition> dependencies,
                                 OnReady onReady) {
            this(id, name, question, regions, ownerGroup, sla, dependencies, onReady, List.of());
        }

        public int expectedTotal() {
            return dependencies.stream().mapToInt(DependencyDefinition::expectedCount).sum();
        }

        /**
         * True when readiness should auto-run a downstream capability. Any {@code onReady.action} other
         * than {@code NOTIFY_ONLY} is dispatched through the {@code ActionExecutor} registry, so new
         * action types (e.g. HTTP_COMMAND, LOG_COMMAND, …) are launched by config, not engine changes.
         */
        public boolean hasAction() {
            return onReady != null && onReady.action() != null
                    && !"NOTIFY_ONLY".equalsIgnoreCase(onReady.action());
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

    /**
     * Console-only grid step. The UI binds {@code params} from context and fetches {@code endpoint}.
     * The hub does not proxy this call.
     */
    public record GridStep(String id, String title, String endpoint, String method, List<GridParam> params) {
        public GridStep {
            method = method == null || method.isBlank() ? "GET" : method;
            params = params == null ? List.of() : List.copyOf(params);
        }
    }

    /** {@code from} names a context field; {@code value} is a literal that wins when set. */
    public record GridParam(String name, String from, String value) {
    }

    public record ActionTarget(String url) {
    }

    public record Notifications(List<Integer> milestones, boolean logChannelEnabled, String webhookUrl) {
        public Notifications {
            milestones = milestones == null ? List.of(50, 90) : List.copyOf(milestones);
        }
    }
}
