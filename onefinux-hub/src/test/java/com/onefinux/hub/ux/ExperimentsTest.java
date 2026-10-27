package com.onefinux.hub.ux;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ExperimentsTest {

    @Test
    void aUserAlwaysGetsTheSameVariantAndBothVariantsAreUsed() {
        UxProperties.Experiment e = new UxProperties.Experiment("home-team-picks", null, List.of("hidden", "shown"), List.of(1, 1), true, null);
        assertThat(Experiments.variant(e, "alice")).isEqualTo(Experiments.variant(e, "alice"));
        Map<String, Integer> seen = new HashMap<>();
        for (int i = 0; i < 200; i++) seen.merge(Experiments.variant(e, "user" + i), 1, Integer::sum);
        assertThat(seen.keySet()).containsExactlyInAnyOrder("hidden", "shown");
        assertThat(seen.get("shown")).isBetween(60, 140);
    }

    @Test
    void onlyEnabledExperimentsAreAssignedAndZeroWeightIsNeverPicked() {
        UxProperties props = new UxProperties(List.of(
                new UxProperties.Experiment("on", null, List.of("A", "B"), List.of(0, 1), true, null),
                new UxProperties.Experiment("off", null, null, null, false, null)), null, null, null);
        Map<String, String> a = new Experiments(props).assignments("alice");
        assertThat(a).containsOnlyKeys("on").containsEntry("on", "B");
    }
}
