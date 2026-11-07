package com.onefinux.hub.evidence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.onefinux.hub.config.OneFinUxProperties.DependencyDefinition;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.stitch.StitchRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The close evidence pack: everything an auditor asks for about one outcome on one COB — the facts that
 * arrived, the readiness they produced, who decided what, what was commanded downstream, who was told —
 * in one document with a SHA-256 digest over its canonical JSON. Exporting needs the EVIDENCE_EXPORT
 * verb, follows the same group-unit fence as the instance (404), and is itself audited.
 */
@Service
public class EvidenceService {

    public static final String FORMAT = "onefinux-evidence/1";
    static final String VERB = "EVIDENCE_EXPORT";

    private final StitchRepository stitch;
    private final EvidenceRepository repo;
    private final OutcomeEngine engine;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final ObjectMapper mapper;
    private final ObjectMapper canonical;

    public EvidenceService(StitchRepository stitch, EvidenceRepository repo, OutcomeEngine engine,
                           CurrentUser currentUser, Clock clock, ObjectMapper mapper) {
        this.stitch = stitch;
        this.repo = repo;
        this.engine = engine;
        this.currentUser = currentUser;
        this.clock = clock;
        this.mapper = mapper;
        this.canonical = mapper.copy()
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
                .configure(SerializationFeature.INDENT_OUTPUT, false)
                .configure(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS, true);
    }

    /** The pack for one stitch instance (a kit's slice on a COB). */
    public Map<String, Object> forInstance(String instanceId) {
        Map<String, Object> inst = stitch.instance(instanceId);
        if (inst == null || !currentUser.entitlements().canSeeGroupUnit(String.valueOf(inst.get("groupUnitId")))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No such instance");
        }
        requireVerb(instanceId);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("subject", inst);
        content.put("readiness", stitch.readinessKeys(instanceId));
        content.put("facts", repo.facts(instanceId));
        content.put("decisions", repo.decisions(instanceId));
        content.put("commands", repo.commandRuns(instanceId));
        content.put("escalations", repo.escalations(instanceId));
        content.put("notifications", repo.notifications(instanceId));
        return seal("INSTANCE", instanceId, String.valueOf(inst.get("question")), content);
    }

    /** The pack for one engine outcome (outcome id, COB, region). */
    public Map<String, Object> forOutcome(String outcomeId, LocalDate cobDate, String region) {
        OutcomeView view = engine.view(outcomeId, cobDate, region)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such outcome"));
        OutcomeDefinition definition = engine.definition(outcomeId).orElse(null);
        requireVerb(view.key());

        List<Map<String, Object>> facts = repo.facts(cobDate, region).stream()
                .filter(row -> belongs(row, view, definition))
                .map(row -> {
                    Map<String, Object> copy = new LinkedHashMap<>(row);
                    copy.remove("attributesJson");
                    return copy;
                })
                .toList();

        Map<String, Object> subject = new LinkedHashMap<>();
        subject.put("key", view.key());
        subject.put("outcomeId", view.outcomeId());
        subject.put("name", view.name());
        subject.put("question", view.question());
        subject.put("cobDate", view.cobDate());
        subject.put("region", view.region());
        subject.put("ownerGroup", view.ownerGroup());
        subject.put("status", view.status());
        subject.put("stage", view.stage());
        subject.put("deadline", view.deadline());
        subject.put("breached", view.breached());
        subject.put("readyAt", view.readyAt());
        subject.put("completedAt", view.completedAt());
        subject.put("actionRunId", view.actionRunId());
        subject.put("resultSummary", view.resultSummary());

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("subject", subject);
        content.put("readiness", view.dependencies());
        content.put("facts", facts);
        content.put("decisions", repo.decisions(view.key()));
        content.put("report", view.report());
        content.put("notifications", repo.notificationsForOutcome(view.key()));
        return seal("OUTCOME", view.key(), view.question(), content);
    }

    /** Recomputes the digest of a pack someone hands back, so a changed file is caught. */
    public Map<String, Object> verify(String packJson) {
        Map<String, Object> pack;
        try {
            pack = canonical.readValue(packJson, new TypeReference<LinkedHashMap<String, Object>>() { });
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not an evidence pack (invalid JSON)");
        }
        if (!(pack.get("digest") instanceof Map<?, ?> digest) || !FORMAT.equals(pack.get("format"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not an evidence pack (" + FORMAT + ")");
        }
        String claimed = String.valueOf(digest.get("value"));
        pack.remove("digest");
        String actual = sha256(canonicalBytes(pack));
        return Map.of("valid", claimed.equalsIgnoreCase(actual), "claimed", claimed, "actual", actual,
                "subjectId", String.valueOf(pack.get("subjectId")));
    }

    private Map<String, Object> seal(String kind, String subjectId, String question, Map<String, Object> content) {
        Map<String, Object> pack = new LinkedHashMap<>();
        pack.put("format", FORMAT);
        pack.put("kind", kind);
        pack.put("subjectId", subjectId);
        pack.put("question", question);
        pack.put("generatedAt", clock.instant().toString());
        pack.put("generatedBy", currentUser.actor());
        pack.put("zone", clock.getZone().getId());
        pack.put("content", content);

        Map<String, Object> normalised = normalise(pack);
        String value = sha256(canonicalBytes(normalised));
        normalised.put("digest", Map.of("algorithm", "SHA-256", "covers", "every field except digest", "value", value));
        stitch.insertAudit(currentUser.actor(), VERB, subjectId, "OK", json(Map.of("digest", value, "kind", kind)));
        return normalised;
    }

    private void requireVerb(String resource) {
        if (!currentUser.entitlements().canAct(VERB)) {
            stitch.insertAudit(currentUser.actor(), VERB, resource, "DENY", json(Map.of("reason", "role does not allow " + VERB)));
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow " + VERB);
        }
    }

    private boolean belongs(Map<String, Object> row, OutcomeView view, OutcomeDefinition definition) {
        String type = String.valueOf(row.get("eventType"));
        String source = String.valueOf(row.get("sourceSystem"));
        if (type.startsWith("WORKFLOW_")) {
            return attributes(row).get("outcomeId") instanceof String id && id.equalsIgnoreCase(view.outcomeId());
        }
        if (definition == null) {
            return false;
        }
        for (DependencyDefinition dependency : definition.dependencies()) {
            if (dependency.eventType().equalsIgnoreCase(type)
                    && (dependency.sourceSystem() == null || dependency.sourceSystem().equalsIgnoreCase(source))) {
                return true;
            }
        }
        return definition.onReady() != null && type.equalsIgnoreCase(definition.onReady().completionEvent())
                && Objects.equals(String.valueOf(row.get("sourceKey")), view.actionRunId());
    }

    private Map<String, Object> attributes(Map<String, Object> row) {
        Object raw = row.get("attributesJson");
        if (raw == null) {
            return Map.of();
        }
        try {
            return mapper.readValue(raw.toString(), new TypeReference<Map<String, Object>>() { });
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    /** Through JSON text and back, so the digest is computed over exactly what a reader of the file sees. */
    private Map<String, Object> normalise(Map<String, Object> pack) {
        try {
            return canonical.readValue(mapper.writeValueAsString(pack), new TypeReference<LinkedHashMap<String, Object>>() { });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Evidence pack is not serialisable", e);
        }
    }

    private byte[] canonicalBytes(Map<String, Object> pack) {
        try {
            return canonical.writeValueAsString(pack).getBytes(StandardCharsets.UTF_8);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Evidence pack is not serialisable", e);
        }
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private String json(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
