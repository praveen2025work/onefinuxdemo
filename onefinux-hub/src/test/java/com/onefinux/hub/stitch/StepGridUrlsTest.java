package com.onefinux.hub.stitch;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StepGridUrlsTest {

    static final String SIM = "http://localhost:7081";

    @Test
    @DisplayName("resolves /sim grid paths against the simulator base")
    void resolves_relative_sim_path() {
        assertThat(StepGridUrls.resolve("/sim/grids/investigation", SIM))
                .isEqualTo("http://localhost:7081/sim/grids/investigation");
    }

    @Test
    @DisplayName("allows an absolute URL on the simulator host under /sim")
    void allows_absolute_simulator_url() {
        assertThat(StepGridUrls.resolve("http://localhost:7081/sim/grids/close", SIM))
                .isEqualTo("http://localhost:7081/sim/grids/close");
    }

    @Test
    @DisplayName("rejects a host that is not the configured simulator")
    void rejects_foreign_host() {
        assertThatThrownBy(() -> StepGridUrls.resolve("http://evil.example/sim/grids/x", SIM))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("rejects paths outside /sim")
    void rejects_non_sim_path() {
        assertThatThrownBy(() -> StepGridUrls.resolve("/api/admin/reset", SIM))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
