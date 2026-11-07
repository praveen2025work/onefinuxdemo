package com.onefinux.hub.evidence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.stitch.StitchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvidenceServiceTest {

    static final String ID = "FOBO|2026-09-12|EMEA|R-2031";
    static final LocalDate COB = LocalDate.of(2026, 9, 12);

    @Mock StitchRepository stitch;
    @Mock EvidenceRepository repo;
    @Mock OutcomeEngine engine;
    @Mock CurrentUser currentUser;

    final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    EvidenceService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-12T22:00:00Z"), ZoneId.of("America/New_York"));
        service = new EvidenceService(stitch, repo, engine, currentUser, clock, mapper);
        lenient().when(currentUser.actor()).thenReturn("auditor");
        lenient().when(currentUser.entitlements()).thenReturn(user("auditor", Set.of("REV-ACC"), Set.of("EVIDENCE_EXPORT")));
    }

    static Entitlements user(String subject, Set<String> units, Set<String> actions) {
        return new Entitlements(subject, Set.of("AUDIT"), units, Set.of(), false, actions, false);
    }

    void stubInstance() {
        Map<String, Object> inst = new LinkedHashMap<>();
        inst.put("instanceId", ID);
        inst.put("groupUnitId", "REV-ACC");
        inst.put("question", "Is Helix FOBO for EMEA ready to sign?");
        inst.put("status", "BLOCKED");
        inst.put("amount", new BigDecimal("12450000.00"));
        when(stitch.instance(ID)).thenReturn(inst);
        when(stitch.readinessKeys(ID)).thenReturn(List.of(Map.of("sourceId", "CATS", "keyStatus", "FAILED")));
        when(repo.facts(ID)).thenReturn(List.of(Map.of("eventId", "e1", "eventType", "RECON_COMPLETED")));
        when(repo.decisions(ID)).thenReturn(List.of(Map.of("actor", "alice.revacc", "action", "SIGN_OFF", "decision", "OK")));
        when(repo.commandRuns(ID)).thenReturn(List.of());
        when(repo.escalations(ID)).thenReturn(List.of());
        when(repo.notifications(ID)).thenReturn(List.of());
    }

    @Test
    @DisplayName("AC-GOVERN-24 AC-GOVERN-30 an instance pack carries every section, a SHA-256 digest, and the export is audited")
    @SuppressWarnings("unchecked")
    void instance_pack_is_complete_and_audited() {
        stubInstance();

        Map<String, Object> pack = service.forInstance(ID);

        assertThat(pack).containsEntry("format", EvidenceService.FORMAT).containsEntry("kind", "INSTANCE")
                .containsEntry("subjectId", ID).containsEntry("generatedBy", "auditor");
        Map<String, Object> content = (Map<String, Object>) pack.get("content");
        assertThat(content).containsKeys("subject", "readiness", "facts", "decisions", "commands", "escalations", "notifications");
        String digest = (String) ((Map<String, Object>) pack.get("digest")).get("value");
        assertThat(digest).matches("[0-9a-f]{64}");
        verify(stitch).insertAudit(eq("auditor"), eq("EVIDENCE_EXPORT"), eq(ID), eq("OK"), contains(digest));
    }

    @Test
    @DisplayName("AC-GOVERN-26 AC-GOVERN-27 the digest verifies the untouched pack and catches a changed amount")
    void verify_catches_tampering() throws Exception {
        stubInstance();
        String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(service.forInstance(ID));

        assertThat(service.verify(json)).containsEntry("valid", true);
        assertThat(service.verify(json.replace("12450000.00", "12450001.00"))).containsEntry("valid", false);
        assertThatThrownBy(() -> service.verify("{\"hello\":1}"))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
    }

    @Test
    @DisplayName("AC-GOVERN-28 AC-GOVERN-29 another group unit's instance is 404; a role without EVIDENCE_EXPORT is 403 and audited")
    void fenced_and_role_checked() {
        Map<String, Object> inst = Map.of("instanceId", ID, "groupUnitId", "REV-ACC");
        when(stitch.instance(ID)).thenReturn(inst);

        when(currentUser.entitlements()).thenReturn(user("bob.markets", Set.of("MARKETS"), Set.of("EVIDENCE_EXPORT")));
        assertThatThrownBy(() -> service.forInstance(ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(404));
        verify(stitch, never()).insertAudit(anyString(), anyString(), anyString(), anyString(), anyString());

        when(currentUser.entitlements()).thenReturn(user("rtb", Set.of("REV-ACC"), Set.of("REPLAY")));
        assertThatThrownBy(() -> service.forInstance(ID))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(403));
        verify(stitch).insertAudit(eq("auditor"), eq("EVIDENCE_EXPORT"), eq(ID), eq("DENY"), anyString());
    }

    @Test
    @DisplayName("AC-GOVERN-25 an outcome pack holds that outcome's inputs and workflow events, not another outcome's")
    @SuppressWarnings("unchecked")
    void outcome_pack_selects_its_own_facts() {
        OutcomeDefinition def = mock(OutcomeDefinition.class);
        when(def.dependencies()).thenReturn(List.of(new DependencyDefinition("TRADE_FEED", "CATS", 1, "Trades")));
        when(def.onReady()).thenReturn(new OnReady("LOG_COMMAND", "AXIOM", "REPORT_COMPLETED", "Generate"));
        OutcomeView view = mock(OutcomeView.class);
        when(view.key()).thenReturn("REPORT_15C3|2026-09-12|AMRS");
        when(view.outcomeId()).thenReturn("REPORT_15C3");
        when(view.question()).thenReturn("Can I produce the 15C3 report?");
        when(view.actionRunId()).thenReturn("RUN-1");
        when(engine.view("REPORT_15C3", COB, "AMRS")).thenReturn(Optional.of(view));
        when(engine.definition("REPORT_15C3")).thenReturn(Optional.of(def));
        when(repo.facts(COB, "AMRS")).thenReturn(List.of(
                fact("f1", "TRADE_FEED", "CATS", "T-1", null),
                fact("f2", "TRADE_FEED", "MOTIF", "T-2", null),
                fact("f3", "WORKFLOW_OVERRIDE", "ONEFINUX", "OVR-X", "{\"outcomeId\":\"REPORT_15C3\"}"),
                fact("f4", "WORKFLOW_OVERRIDE", "ONEFINUX", "OVR-Y", "{\"outcomeId\":\"PNL_REPORTING\"}"),
                fact("f5", "REPORT_COMPLETED", "AXIOM", "RUN-1", null),
                fact("f6", "REPORT_COMPLETED", "AXIOM", "RUN-OLD", null)));

        Map<String, Object> pack = service.forOutcome("REPORT_15C3", COB, "AMRS");

        List<Map<String, Object>> facts = (List<Map<String, Object>>) ((Map<String, Object>) pack.get("content")).get("facts");
        assertThat(facts).extracting(f -> f.get("eventId")).containsExactly("f1", "f3", "f5");
        assertThat(facts).allSatisfy(f -> assertThat(f).doesNotContainKey("attributesJson"));
        assertThat(pack).containsEntry("kind", "OUTCOME").containsEntry("subjectId", "REPORT_15C3|2026-09-12|AMRS");
    }

    @Test
    @DisplayName("AC-GOVERN-31 the printable pack escapes values and paints from the shared tokens")
    @SuppressWarnings("unchecked")
    void html_is_escaped_and_themed() {
        stubInstance();
        Map<String, Object> pack = service.forInstance(ID);
        ((Map<String, Object>) pack.get("content")).put("facts", List.of(Map.of("eventId", "<script>alert(1)</script>")));

        String html = EvidenceHtml.render(pack);

        assertThat(html).contains("/theme/onefinux-tokens.css", "class=\"ofx-tbl\"", "&lt;script&gt;")
                .doesNotContain("<script>").doesNotContainPattern("#[0-9a-fA-F]{3,6}\\b");
    }

    static Map<String, Object> fact(String id, String type, String source, String key, String attributes) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("eventId", id);
        row.put("eventType", type);
        row.put("sourceSystem", source);
        row.put("sourceKey", key);
        row.put("attributesJson", attributes);
        return row;
    }
}
