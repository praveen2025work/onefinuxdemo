package com.onefinux.hub.security;

import com.onefinux.hub.config.CorsProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HubCorsTest {

    private final CorsConfigurationSource source = HubCors.source(new CorsProperties(null, null));

    @Test
    void allowsListedConsoleOrigin() {
        CorsConfiguration cfg = source.getCorsConfiguration(request("http://localhost:7091"));
        assertThat(cfg).isNotNull();
        assertThat(cfg.checkOrigin("http://localhost:7091")).isEqualTo("http://localhost:7091");
    }

    @Test
    void allowsEthernetOrWifiIpv4OnConsolePort() {
        CorsConfiguration cfg = source.getCorsConfiguration(request("http://192.168.1.24:7091"));
        assertThat(cfg).isNotNull();
        assertThat(cfg.checkOrigin("http://192.168.1.24:7091")).isEqualTo("http://192.168.1.24:7091");
        assertThat(cfg.checkOrigin("http://10.0.0.8:7091")).isEqualTo("http://10.0.0.8:7091");
    }

    @Test
    void rejectsUnlistedLocalPort() {
        CorsConfiguration cfg = source.getCorsConfiguration(request("http://localhost:9999"));
        assertThat(cfg).isNotNull();
        assertThat(cfg.checkOrigin("http://localhost:9999")).isNull();
    }

    @Test
    void rejectsLanIpOnNonConsolePort() {
        CorsConfiguration cfg = source.getCorsConfiguration(request("http://192.168.1.24:7070"));
        assertThat(cfg).isNotNull();
        assertThat(cfg.checkOrigin("http://192.168.1.24:7070")).isNull();
    }

    @Test
    void rejectsForeignOrigin() {
        CorsConfiguration cfg = source.getCorsConfiguration(request("https://evil.example"));
        assertThat(cfg).isNotNull();
        assertThat(cfg.checkOrigin("https://evil.example")).isNull();
    }

    private static MockHttpServletRequest request(String origin) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/outcomes");
        req.addHeader("Origin", origin);
        return req;
    }
}
