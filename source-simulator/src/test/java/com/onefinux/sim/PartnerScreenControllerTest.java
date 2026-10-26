package com.onefinux.sim;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerScreenControllerTest {

    private final PartnerScreenController controller = new PartnerScreenController();

    @Test
    void helix_paints_from_the_shared_tokens_and_follows_its_link_channel() {
        ResponseEntity<String> res = controller.helix("FOBO|2026-09-12|EMEA|R-2031", "REV-ACC", "2026-09-12", "EMEA", "RUN-1", "dark", "steps");
        String html = res.getBody();
        assertThat(html).contains("data-ofx-embedded=\"1\"", "data-theme=\"dark\"", "data-skin=\"steps\"");
        assertThat(html).contains("/theme/onefinux-tokens.css", "/ofx-interop.js", "fdc3.addContextListener");
        assertThat(html).contains("width: 100%;", "COB 2026-09-12", "BK-4420");
        assertThat(res.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("frame-ancestors *");
    }

    @Test
    void helix_escapes_query_values_and_defaults_to_the_standard_skin() {
        String html = controller.helix("<script>", "", "", "", "", "anything", "other").getBody();
        assertThat(html).contains("&lt;script&gt;").doesNotContain("<script>alert");
        assertThat(html).contains("data-theme=\"light\"", "data-skin=\"steps\"");
    }
}
