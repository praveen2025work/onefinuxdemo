package com.onefinux.hub.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorsPropertiesTest {

    @Test
    void defaultOriginsAreExactConsoleAndHostedUrls() {
        assertThat(new CorsProperties(null, null).allowedOrigins()).containsExactly(
                "http://localhost:7091",
                "http://127.0.0.1:7091",
                "http://localhost:8080",
                "http://127.0.0.1:8080");
    }

    @Test
    void defaultPatternsCoverPrivateIpv4OnConsolePorts() {
        assertThat(new CorsProperties(null, null).allowedOriginPatterns())
                .contains("http://192.168.*:7091", "http://10.*:7091");
    }

    @Test
    void rejectsWildcardHostOnExactList() {
        assertThatThrownBy(() -> new CorsProperties(List.of("http://localhost:*"), List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard");
    }

    @Test
    void rejectsStarOrigin() {
        assertThatThrownBy(() -> new CorsProperties(List.of("*"), List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("wildcard");
    }

    @Test
    void rejectsStarPattern() {
        assertThatThrownBy(() -> new CorsProperties(List.of(), List.of("*")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("every origin");
    }

    @Test
    void rejectsAnyPortPattern() {
        assertThatThrownBy(() -> new CorsProperties(List.of(), List.of("http://192.168.*:*")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("every port");
    }

    @Test
    void emptyListMeansNoCrossOrigin() {
        CorsProperties empty = new CorsProperties(List.of(), List.of());
        assertThat(empty.allowedOrigins()).isEmpty();
        assertThat(empty.allowedOriginPatterns()).isEmpty();
    }
}
