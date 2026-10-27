package com.onefinux.hub.assist;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.activity.ActivityFeed;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.outcome.OutcomeView;
import com.onefinux.hub.search.SearchHit;
import com.onefinux.hub.search.SearchService;
import com.onefinux.hub.stitch.StitchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Answers a question about the user's close from facts the hub already holds for that user: matching instances,
 * outcomes and notifications (entitlement-filtered by {@link SearchService}), the outcome fold for the COB, the
 * blocked instances with their named blockers, and recent activity. The suggested actions under an answer are built
 * from those facts, not by the model, so a button always points at something real. Advisory only: it never changes
 * state and it is not on the readiness path.
 */
@Service
public class AssistService {

    private static final Logger log = LoggerFactory.getLogger(AssistService.class);

    static final String SYSTEM = """
            You are the assistant inside One Finance, the console a finance team uses to close the books. Each \
            question comes with <facts>: JSON the hub holds for this user, already limited to what they may see. \
            Answer only from those facts. If they do not answer the question, say so in one sentence and name the \
            screen that would (Board, Reports, Operations, Desks, Grid library). Keep answers under 120 words in plain \
            sentences; use instance ids, outcome names and blocker names exactly as the facts give them. You are \
            advisory: never say you did something. The user acts with the buttons shown under your answer. Readiness \
            is decided by the hub's fold, not by you.""";
    static final Set<String> STOP = Set.of("the", "and", "for", "what", "which", "why", "how", "is", "are", "was", "my",
            "me", "i", "a", "an", "of", "to", "in", "on", "it", "do", "does", "can", "show", "tell", "about", "with",
            "this", "that", "today", "any", "there", "still", "should", "look", "at", "next", "be");
    static final int MAX_HISTORY = 6;

    private final SearchService search;
    private final OutcomeEngine engine;
    private final StitchService stitch;
    private final ActivityFeed activity;
    private final AssistProperties props;
    private final ObjectMapper mapper = new ObjectMapper();
    private volatile AnthropicClient client;

    public AssistService(SearchService search, OutcomeEngine engine, StitchService stitch, ActivityFeed activity,
                         AssistProperties props) {
        this.search = search;
        this.engine = engine;
        this.stitch = stitch;
        this.activity = activity;
        this.props = props;
    }

    public Map<String, Object> ask(Question q) {
        String question = q.question() == null ? "" : q.question().trim();
        Facts facts = facts(question, q.groupUnit(), q.cobDate());
        List<Map<String, Object>> actions = actions(facts);
        Map<String, Object> out = new LinkedHashMap<>();
        String answer = null;
        String note = null;
        if (props.modelEnabled()) {
            try {
                answer = callModel(question, q.history(), facts);
                out.put("mode", "claude");
            } catch (Declined e) {
                note = "The model declined this question; this answer comes from the hub's facts.";
            } catch (RateLimitException e) {
                note = "The model is busy; this answer comes from the hub's facts.";
            } catch (AnthropicServiceException e) {
                log.warn("assistant model call failed: {} {}", e.statusCode(), e.getMessage());
                note = "The model could not be reached; this answer comes from the hub's facts.";
            } catch (AnthropicException e) {
                log.warn("assistant model call failed: {}", e.getMessage());
                note = "The model could not be reached; this answer comes from the hub's facts.";
            }
        }
        if (answer == null) {
            answer = grounded(question, facts);
            out.put("mode", "grounded");
        }
        out.put("answer", answer);
        if (note != null) out.put("note", note);
        out.put("actions", actions);
        out.put("sources", facts.hits.stream().limit(8).toList());
        return out;
    }

    // ---------------------------------------------------------------- facts

    Facts facts(String question, String groupUnit, String cobDate) {
        Map<String, SearchHit> hits = new LinkedHashMap<>();
        for (SearchHit h : search.search(question, groupUnit, cobDate)) hits.put(h.kind() + ":" + h.id(), h);
        for (String word : keywords(question)) {
            for (SearchHit h : search.search(word, groupUnit, cobDate)) hits.putIfAbsent(h.kind() + ":" + h.id(), h);
            if (hits.size() >= 20) break;
        }
        List<Map<String, Object>> outcomes = new ArrayList<>();
        for (OutcomeView v : engine.views()) {
            if (cobDate != null && !cobDate.isBlank() && v.cobDate() != null && !cobDate.equals(v.cobDate().toString())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("outcomeId", v.outcomeId());
            m.put("name", v.name());
            m.put("region", v.region());
            m.put("status", String.valueOf(v.status()));
            m.put("percent", v.percent());
            m.put("atRisk", v.atRisk());
            m.put("breached", v.breached());
            if (v.lastMessage() != null) m.put("lastMessage", v.lastMessage());
            outcomes.add(m);
            if (outcomes.size() >= 20) break;
        }
        List<Map<String, Object>> blocked = new ArrayList<>();
        for (Map<String, Object> row : stitch.instances(groupUnit, cobDate, null, null)) {
            String status = String.valueOf(row.get("status"));
            if (!Set.of("BLOCKED", "DELAYED", "ESCALATED").contains(status)) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            for (String k : List.of("instanceId", "kitId", "sliceKey", "region", "status", "namedBlocker", "question")) {
                if (row.get(k) != null) m.put(k, row.get(k));
            }
            blocked.add(m);
            if (blocked.size() >= 10) break;
        }
        List<Map<String, Object>> recent = activity.recent(null, null, 6).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            for (String k : List.of("at", "actor", "action", "summary", "outcomeId", "instanceId")) {
                if (a.get(k) != null) m.put(k, a.get(k));
            }
            return m;
        }).toList();
        return new Facts(new ArrayList<>(hits.values()), outcomes, blocked, recent, groupUnit, cobDate);
    }

    static List<String> keywords(String question) {
        Set<String> out = new LinkedHashSet<>();
        for (String w : question.split("[^A-Za-z0-9_|-]+")) {
            String lw = w.toLowerCase(Locale.ROOT);
            if (lw.length() >= 3 && !STOP.contains(lw)) out.add(w);
        }
        return out.stream().limit(6).toList();
    }

    /** Buttons under the answer: open what the facts point at. Built here, never by the model. */
    static List<Map<String, Object>> actions(Facts f) {
        Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        for (Map<String, Object> b : f.blocked) {
            String id = String.valueOf(b.get("instanceId"));
            out.putIfAbsent("/instance/" + enc(id), action("Open " + b.get("sliceKey") + " (" + b.get("status") + ")",
                    "/instance/" + enc(id), Map.of("type", "ofx.instance", "id", Map.of("instanceId", id))));
            if (out.size() >= 2) break;
        }
        for (SearchHit h : f.hits) {
            if (out.size() >= 5) break;
            String label = switch (h.kind()) {
                case "instance" -> "Open " + h.title();
                case "outcome" -> "Report: " + h.title();
                default -> "Show " + h.title();
            };
            out.putIfAbsent(h.route(), action(label, h.route(), null));
        }
        for (Map<String, Object> o : f.outcomes) {
            if (out.size() >= 6) break;
            if ("BLOCKED".equals(o.get("status")) || Boolean.TRUE.equals(o.get("breached"))) {
                String id = String.valueOf(o.get("outcomeId"));
                out.putIfAbsent("desk:" + id, action("Open a desk for " + o.get("name"), "/desks?outcome=" + enc(id), null));
            }
        }
        return new ArrayList<>(out.values());
    }

    private static Map<String, Object> action(String label, String route, Map<String, Object> context) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("route", route);
        if (context != null) m.put("context", context);
        return m;
    }

    // ---------------------------------------------------------------- answers

    /** Without a model: a short answer composed from the same facts. */
    static String grounded(String question, Facts f) {
        StringBuilder sb = new StringBuilder();
        Map<String, Long> byStatus = f.outcomes.stream()
                .collect(Collectors.groupingBy(o -> String.valueOf(o.get("status")), LinkedHashMap::new, Collectors.counting()));
        if (!f.outcomes.isEmpty()) {
            sb.append(f.outcomes.size()).append(f.outcomes.size() == 1 ? " outcome" : " outcomes")
                    .append(f.cobDate == null || f.cobDate.isBlank() ? "" : " for " + f.cobDate).append(": ")
                    .append(byStatus.entrySet().stream().map(e -> e.getValue() + " " + e.getKey().toLowerCase(Locale.ROOT).replace('_', ' '))
                            .collect(Collectors.joining(", "))).append(". ");
        }
        long late = f.outcomes.stream().filter(o -> Boolean.TRUE.equals(o.get("breached")) || Boolean.TRUE.equals(o.get("atRisk"))).count();
        if (late > 0) sb.append(late).append(late == 1 ? " is" : " are").append(" at risk or past SLA. ");
        if (!f.blocked.isEmpty()) {
            sb.append(f.blocked.size() == 1 ? "Needs attention: " : f.blocked.size() + " instances need attention: ");
            sb.append(f.blocked.stream().limit(3).map(b -> b.get("sliceKey") + " " + String.valueOf(b.get("region"))
                    + " is " + b.get("status") + (b.get("namedBlocker") != null ? " on " + b.get("namedBlocker") : ""))
                    .collect(Collectors.joining("; "))).append(". ");
        } else {
            sb.append("Nothing in your scope is blocked. ");
        }
        if (!f.hits.isEmpty()) {
            sb.append("Matches for “").append(question.length() > 60 ? question.substring(0, 60) + "…" : question)
                    .append("”: ").append(f.hits.stream().limit(3).map(SearchHit::title).collect(Collectors.joining(", "))).append('.');
        } else if (!question.isBlank()) {
            sb.append("Nothing else matched your words; try an instance id, a book or an outcome name.");
        }
        return sb.toString().trim();
    }

    private String callModel(String question, List<Turn> history, Facts facts) {
        MessageCreateParams.Builder b = MessageCreateParams.builder()
                .model(props.model())
                .maxTokens(props.maxTokens())
                .system(SYSTEM)
                .outputConfig(OutputConfig.builder().effort(OutputConfig.Effort.of(props.effort())).build());
        if (props.fallbacks()) {
            b.putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
                    .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
        }
        // Earlier turns alternate user / assistant; the facts ride on the new question only.
        String expect = "user";
        for (Turn t : tail(history)) {
            if (t == null || t.text() == null || !expect.equals(t.role())) continue;
            String text = t.text().length() > 1000 ? t.text().substring(0, 1000) : t.text();
            if ("user".equals(expect)) b.addUserMessage(text); else b.addAssistantMessage(text);
            expect = "user".equals(expect) ? "assistant" : "user";
        }
        if ("assistant".equals(expect)) b.addAssistantMessage("(no answer)");
        b.addUserMessage("<facts>" + json(facts.forModel()) + "</facts>\n\nQuestion: " + question);

        Message response = client().messages().create(b.build());
        if (response.stopReason().map(StopReason.REFUSAL::equals).orElse(false)) throw new Declined();
        String text = response.content().stream().flatMap(c -> c.text().stream()).map(t -> t.text())
                .collect(Collectors.joining("\n")).trim();
        if (text.isEmpty()) throw new Declined();
        return text;
    }

    private static List<Turn> tail(List<Turn> history) {
        if (history == null || history.isEmpty()) return List.of();
        return history.subList(Math.max(0, history.size() - MAX_HISTORY), history.size());
    }

    private AnthropicClient client() {
        AnthropicClient c = client;
        if (c == null) {
            synchronized (this) {
                if (client == null) {
                    client = AnthropicOkHttpClient.builder().apiKey(props.apiKey()).timeout(Duration.ofSeconds(90)).maxRetries(2).build();
                }
                c = client;
            }
        }
        return c;
    }

    private String json(Object o) {
        try {
            return mapper.writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    static final class Declined extends RuntimeException {
    }

    record Facts(List<SearchHit> hits, List<Map<String, Object>> outcomes, List<Map<String, Object>> blocked,
                 List<Map<String, Object>> recent, String groupUnit, String cobDate) {
        Map<String, Object> forModel() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("scope", Map.of("groupUnit", String.valueOf(groupUnit), "cobDate", String.valueOf(cobDate)));
            m.put("outcomes", outcomes);
            m.put("needsAttention", blocked);
            m.put("matches", hits.stream().limit(12).map(h -> Map.of("kind", h.kind(), "id", h.id(), "title", h.title(),
                    "detail", String.valueOf(h.detail()))).toList());
            m.put("recentActivity", recent);
            return m;
        }
    }

    public record Turn(String role, String text) {
    }

    public record Question(String question, String groupUnit, String cobDate, String path, List<Turn> history) {
    }
}
