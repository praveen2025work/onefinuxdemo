package com.onefinux.hub.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorsPropertiesTest {

    @Test
    void defaultOriginsAreExactConsoleAndHostedUrls() {
        assertThat(new CorsProperties(null).allowedOrigins()).containsExactly(
                "http://localhost:7091",
                "http://127.0.0.1:7091",
                "http://localhost:8080",
                "http://127.0.0.1:8080");
    }

    @Test
    void rejectsWildcardHost() {
        assertThatThrownBy(() -> new CorsProperties(List.of("http://localhost:*")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard");
    }

    @Test
    void rejectsStarOrigin() {
        assertThatThrownBy(() -> new CorsProperties(List.of("*")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard");
    }

    @Test
    void emptyListMeansNoCrossOrigin() {
        assertThat(new CorsProperties(List.of()).allowedOrigins()).isEmpty();
    }
}
