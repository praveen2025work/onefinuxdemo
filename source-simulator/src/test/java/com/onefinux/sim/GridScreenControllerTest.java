package com.onefinux.sim;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GridScreenControllerTest {

    @Test
    void investigation_echoes_bound_account_and_journal() {
        GridScreenController c = new GridScreenController();
        ResponseEntity<Map<String, Object>> res = c.grid(
                "investigation", "2026-09-12", "EMEA", "REV-ACC", "410000", "JE-8801", null);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = res.getBody();
        assertThat(body.get("title")).isEqualTo("Investigation");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) body.get("rows");
        assertThat(rows).isNotEmpty();
        assertThat(rows.get(0).get("id")).isEqualTo("410000");
        @SuppressWarnings("unchecked")
        Map<String, Object> ctx = (Map<String, Object>) body.get("context");
        assertThat(ctx).containsEntry("journalId", "JE-8801").containsEntry("cobDate", "2026-09-12");
    }

    @Test
    void close_uses_instance_status() {
        GridScreenController c = new GridScreenController();
        ResponseEntity<Map<String, Object>> res = c.grid(
                "close", "2026-09-12", "EMEA", "REV-ACC", null, null, "BLOCKED");
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("title")).isEqualTo("Close and sign-off");
    }

    @Test
    void unknown_grid_is_404() {
        GridScreenController c = new GridScreenController();
        assertThat(c.grid("sap-gl", null, null, null, null, null, null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
