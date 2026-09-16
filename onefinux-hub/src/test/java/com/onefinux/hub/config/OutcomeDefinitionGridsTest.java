package com.onefinux.hub.config;

import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.GridParam;
import com.onefinux.hub.config.OneFinUxProperties.GridStep;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.config.OneFinUxProperties.Sla;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OutcomeDefinitionGridsTest {

    @Test
    @DisplayName("AC-CONSOLE-22 eight-arg OutcomeDefinition keeps grids empty")
    void eightArgConstructorLeavesGridsEmpty() {
        OutcomeDefinition def = new OutcomeDefinition("FOBO_HELIX", "FOBO investigation",
                "Can I execute FOBO analysis?", List.of("GLOBAL"), "FOBO Controllers",
                new Sla(null, 0, 5),
                List.of(new DependencyDefinition("MASTERBOOK_READY", "MOTIF", 1, "Master books")),
                new OnReady("NOTIFY_ONLY", null, null, null));
        assertThat(def.grids()).isEmpty();
    }

    @Test
    @DisplayName("AC-CONSOLE-22 outcome grids carry endpoint method and from params")
    void gridsCarryEndpointAndParams() {
        GridStep investigation = new GridStep("investigation", "Investigation",
                "/sim/grids/investigation", "GET",
                List.of(new GridParam("cobDate", "cobDate", null),
                        new GridParam("account", "account", null)));
        OutcomeDefinition def = new OutcomeDefinition("FOBO_HELIX", "FOBO investigation",
                "Can I execute FOBO analysis?", List.of("GLOBAL"), "FOBO Controllers",
                new Sla(null, 0, 5),
                List.of(new DependencyDefinition("MASTERBOOK_READY", "MOTIF", 1, "Master books")),
                new OnReady("NOTIFY_ONLY", null, null, null),
                List.of(investigation));
        assertThat(def.grids()).hasSize(1);
        assertThat(def.grids().get(0).endpoint()).isEqualTo("/sim/grids/investigation");
        assertThat(def.grids().get(0).method()).isEqualTo("GET");
        assertThat(def.grids().get(0).params()).extracting(GridParam::from)
                .containsExactly("cobDate", "account");
    }
}
