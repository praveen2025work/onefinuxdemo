package com.onefinux.hub.assist;

import com.onefinux.hub.search.SearchHit;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AssistServiceTest {

    AssistService.Facts facts() {
        return new AssistService.Facts(
                List.of(new SearchHit("instance", "FOBO|2026-09-12|EMEA|R-2031", "FOBO · R-2031", "EMEA · BLOCKED", "/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031")),
                List.of(Map.of("outcomeId", "FOBO_HELIX", "name", "FOBO investigation", "status", "BLOCKED", "breached", true),
                        Map.of("outcomeId", "PNL_REPORTING", "name", "PnL reporting", "status", "READY", "breached", false)),
                List.of(Map.of("instanceId", "FOBO|2026-09-12|EMEA|R-2031", "sliceKey", "R-2031", "region", "EMEA", "status", "BLOCKED",
                        "namedBlocker", "Motif MB014")),
                List.of(), "REV-ACC", "2026-09-12");
    }

    @Test
    void groundedAnswersNameTheBlockerAndCounts() {
        String a = AssistService.grounded("why is R-2031 blocked", facts());
        assertThat(a).contains("2 outcomes for 2026-09-12").contains("R-2031 EMEA is BLOCKED on Motif MB014").contains("past SLA");
    }

    @Test
    void actionsComeFromTheFactsNotTheModel() {
        List<Map<String, Object>> actions = AssistService.actions(facts());
        assertThat(actions).extracting(m -> m.get("route")).contains("/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031", "/desks?outcome=FOBO_HELIX");
        assertThat(actions.get(0)).containsKey("context");
    }

    @Test
    void keywordsDropFillerWords() {
        assertThat(AssistService.keywords("Why is R-2031 still blocked on MB014?")).containsExactly("R-2031", "blocked", "MB014");
    }

    @Test
    void modelOnlyWithBothModelAndKey() {
        assertThat(new AssistProperties(null, "k", null, null, null).modelEnabled()).isFalse();
        assertThat(new AssistProperties("m", "", null, null, null).modelEnabled()).isFalse();
        assertThat(new AssistProperties("m", "k", null, null, null).modelEnabled()).isTrue();
    }
}
