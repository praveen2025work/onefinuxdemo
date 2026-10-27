package com.onefinux.hub.security;

import com.onefinux.hub.ux.TestDb;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccessRegistryTest {

    NamedParameterJdbcTemplate jdbc;
    AccessRegistry registry;
    SecurityProperties props = new SecurityProperties(null, true, null, null, null, null, null, null, 90, null, false);

    @BeforeEach
    void setUp() {
        jdbc = TestDb.migrated();
        registry = new AccessRegistry(jdbc, props, Clock.fixed(Instant.now(), ZoneOffset.UTC));
    }

    @Test
    void theSeededAuditorIsSuspendedOnTheirFirstRequestBack() {
        assertThat(registry.snapshot("auditor").suspended()).isFalse();
        registry.touch("auditor");
        assertThat(registry.snapshot("auditor").suspended()).isTrue();
        assertThat(jdbc.queryForList("SELECT action FROM audit_log WHERE resource = 'auditor'", new MapSqlParameterSource(), String.class))
                .contains("ACCESS_SUSPENDED");
    }

    @Test
    void aNewUserIsRecordedAndNotSuspended() {
        registry.touch("alice.revacc");
        assertThat(registry.users()).extracting(m -> m.get("subject")).contains("alice.revacc");
        assertThat(registry.snapshot("alice.revacc").suspended()).isFalse();
    }

    @Test
    void oneRequestGrantsEveryItemOnceSomeoneElseApproves() {
        Map<String, Object> req = registry.request("bob.markets", "Desk: FOBO rec",
                List.of(Map.of("kind", "GROUP_UNIT", "value", "REV-ACC"), Map.of("kind", "CEES", "value", "product:FOBO")), "cover Alice");
        String id = (String) req.get("id");
        assertThatThrownBy(() -> registry.decide(id, true, "bob.markets")).isInstanceOf(SecurityException.class);
        registry.decide(id, true, "praveen.kumar");
        AccessRegistry.Snapshot s = registry.snapshot("bob.markets");
        assertThat(s.groupUnits()).containsExactly("REV-ACC");
        assertThat(s.ceesProducts()).containsExactly("product:FOBO");
        assertThatThrownBy(() -> registry.decide(id, true, "praveen.kumar")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void badItemsAreRefused() {
        assertThatThrownBy(() -> registry.request("bob", "x", List.of(Map.of("kind", "SUPERUSER", "value", "yes")), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> registry.request("bob", "x", List.of(), null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void reviewFlagsGrantsOutsideTheRoleStructureAndRevokes() {
        String id = (String) registry.request("bob.markets", "Desk", List.of(Map.of("kind", "ROLE", "value", "WIZARD")), null).get("id");
        registry.decide(id, true, "praveen.kumar");
        List<Map<String, Object>> queue = registry.reviewQueue(java.util.Set.of("CONTROLLER", "ADMIN"));
        assertThat(queue).hasSize(1);
        assertThat(queue.get(0).get("inStructure")).isEqualTo(false);
        long grantId = (Long) queue.get(0).get("id");
        assertThatThrownBy(() -> registry.review(grantId, false, "bob.markets")).isInstanceOf(SecurityException.class);
        registry.review(grantId, false, "auditor2");
        assertThat(registry.snapshot("bob.markets").roles()).isEmpty();
    }

    @Test
    void idleLimitIsInDays() {
        Instant now = Instant.parse("2026-10-27T00:00:00Z");
        assertThat(registry.idleTooLong(now.minusSeconds(91L * 86400), now)).isTrue();
        assertThat(registry.idleTooLong(now.minusSeconds(89L * 86400), now)).isFalse();
    }
}
