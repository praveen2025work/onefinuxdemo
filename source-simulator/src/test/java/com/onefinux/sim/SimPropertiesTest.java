package com.onefinux.sim;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SimPropertiesTest {

    @Test
    void defaultOriginsAreExact() {
        assertThat(new SimProperties(null, null, null, null).allowedOrigins())
                .containsExactly(
                        "http://localhost:7091",
                        "http://127.0.0.1:7091",
                        "http://localhost:8080",
                        "http://127.0.0.1:8080");
    }

    @Test
    void rejectsWildcard() {
        assertThatThrownBy(() -> new SimProperties(null, null, List.of("http://localhost:*"), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard");
    }
}
