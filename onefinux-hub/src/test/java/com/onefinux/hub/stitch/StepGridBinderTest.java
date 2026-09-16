package com.onefinux.hub.stitch;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StepGridBinderTest {

    @Test
    @DisplayName("binds named request params from instance context fields")
    void binds_from_instance_fields() {
        Map<String, Object> instance = Map.of(
                "cobDate", "2026-09-12",
                "region", "EMEA",
                "account", "410000",
                "journalId", "JE-8801",
                "status", "BLOCKED");
        List<Map<String, Object>> spec = List.of(
                Map.of("name", "cobDate", "from", "cobDate"),
                Map.of("name", "account", "from", "account"),
                Map.of("name", "journalId", "from", "journalId"),
                Map.of("name", "entity", "value", "BARC-UK"));

        Map<String, String> params = StepGridBinder.bind(spec, instance);

        assertThat(params).containsEntry("cobDate", "2026-09-12")
                .containsEntry("account", "410000")
                .containsEntry("journalId", "JE-8801")
                .containsEntry("entity", "BARC-UK")
                .doesNotContainKey("status");
    }

    @Test
    @DisplayName("omits params whose instance field is blank")
    void omits_blank_instance_fields() {
        Map<String, Object> instance = Map.of("cobDate", "2026-09-12");
        List<Map<String, Object>> spec = List.of(
                Map.of("name", "cobDate", "from", "cobDate"),
                Map.of("name", "account", "from", "account"));

        Map<String, String> params = StepGridBinder.bind(spec, instance);

        assertThat(params).containsOnlyKeys("cobDate");
    }

    @Test
    @DisplayName("parses grid_params_json array of name/from objects")
    void parses_params_json() {
        List<Map<String, Object>> spec = StepGridBinder.parse(
                "[{\"name\":\"cobDate\",\"from\":\"cobDate\"},{\"name\":\"legalEntity\",\"value\":\"BARC\"}]");

        assertThat(spec).hasSize(2);
        assertThat(spec.get(0)).containsEntry("name", "cobDate").containsEntry("from", "cobDate");
        assertThat(spec.get(1)).containsEntry("value", "BARC");
    }
}
