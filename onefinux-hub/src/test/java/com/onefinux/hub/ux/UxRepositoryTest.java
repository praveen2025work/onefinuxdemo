package com.onefinux.hub.ux;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UxRepositoryTest {

    UxRepository repo;
    final Instant now = Instant.parse("2026-10-27T10:00:00Z");

    @BeforeEach
    void setUp() {
        repo = new UxRepository(TestDb.migrated());
    }

    @Test
    void usageCountsOpensAndDistinctUsers() {
        repo.insertEvent(now, "alice", "REV-ACC", "APP_OPEN", "/board", null, null, null);
        repo.insertEvent(now, "alice", "REV-ACC", "APP_OPEN", "/board", null, null, null);
        repo.insertEvent(now, "bob", "REV-ACC", "VIEW_OPEN", "/board", null, null, null);
        repo.insertEvent(now, "bob", "REV-ACC", "COMPONENT_USE", "/grids", "lens.pivot", null, null);
        List<Map<String, Object>> apps = repo.appUsage(now.minus(Duration.ofDays(1)), null);
        assertThat(apps).hasSize(1);
        assertThat(((Number) apps.get(0).get("opens")).intValue()).isEqualTo(3);
        assertThat(((Number) apps.get(0).get("users")).intValue()).isEqualTo(2);
        assertThat(repo.componentUsage(now.minus(Duration.ofDays(1)), "REV-ACC")).extracting(m -> m.get("component")).containsExactly("lens.pivot");
    }

    @Test
    void teamPicksSkipWhatTheUserAlreadyOpened() {
        repo.insertEvent(now, "bob", "REV-ACC", "APP_OPEN", "/operations", null, null, null);
        repo.insertEvent(now, "carol", "REV-ACC", "APP_OPEN", "/operations", null, null, null);
        repo.insertEvent(now, "bob", "REV-ACC", "APP_OPEN", "/board", null, null, null);
        repo.insertEvent(now, "alice", "REV-ACC", "APP_OPEN", "/board", null, null, null);
        repo.insertEvent(now, "dave", "MARKETS", "APP_OPEN", "/finance", null, null, null);
        List<Map<String, Object>> picks = repo.teamPicks("alice", "REV-ACC", now.minus(Duration.ofDays(30)), now.minus(Duration.ofDays(14)), 5);
        assertThat(picks).extracting(m -> m.get("app")).containsExactly("/operations");
        assertThat(((Number) picks.get(0).get("teammates")).intValue()).isEqualTo(2);
    }

    @Test
    void experimentResultsCountDistinctUsersPerVariant() {
        repo.insertEvent(now, "alice", null, "EXPOSURE", "/", "home-team-picks", "shown", null);
        repo.insertEvent(now, "alice", null, "EXPOSURE", "/", "home-team-picks", "shown", null);
        repo.insertEvent(now, "alice", null, "CONVERSION", "/", "home-team-picks", "shown", null);
        repo.insertEvent(now, "bob", null, "EXPOSURE", "/", "home-team-picks", "hidden", null);
        List<Map<String, Object>> r = repo.experimentResults("home-team-picks");
        assertThat(r).hasSize(2);
        Map<String, Object> shown = r.stream().filter(m -> "shown".equals(m.get("variant"))).findFirst().orElseThrow();
        assertThat(((Number) shown.get("exposed")).intValue()).isEqualTo(1);
        assertThat(((Number) shown.get("converted")).intValue()).isEqualTo(1);
    }

    @Test
    void prefsUpsertAndTemplatesRoundTrip() {
        repo.savePref("alice", "desks", "{\"v\":1}", now);
        repo.savePref("alice", "desks", "{\"v\":2}", now.plusSeconds(5));
        assertThat(repo.pref("alice", "desks")).get().extracting(m -> m.get("json")).isEqualTo("{\"v\":2}");
        assertThat(repo.pref("bob", "desks")).isEmpty();
        repo.insertTemplate("TPL-1", "REV-ACC", "desk", "Close desk", "{\"views\":[]}", "alice", now);
        assertThat(repo.templates("REV-ACC", "desk")).hasSize(1);
        assertThat(repo.templates("MARKETS", null)).isEmpty();
        repo.deleteTemplate("TPL-1");
        assertThat(repo.template("TPL-1")).isEmpty();
        repo.insertTemplate("TPL-G", "REV-ACC", "grid", "Breaks", "{\"id\":\"breaks\",\"source\":{\"rows\":[]}}", "alice", now);
        repo.insertTemplate("TPL-F", "REV-ACC", "finance", "Liquidity board", "{\"id\":\"liq\",\"tiles\":[{\"id\":\"t1\"}]}", "alice", now);
        assertThat(repo.templates("REV-ACC", "grid")).extracting(m -> m.get("id")).containsExactly("TPL-G");
        assertThat(repo.templates("REV-ACC", "finance")).extracting(m -> m.get("name")).containsExactly("Liquidity board");
        assertThat(repo.templates("REV-ACC", null)).hasSize(2);
    }
}
