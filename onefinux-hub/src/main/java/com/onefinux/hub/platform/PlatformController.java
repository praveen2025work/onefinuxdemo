package com.onefinux.hub.platform;

import com.onefinux.hub.calendar.CloseCalendar;
import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.notification.ChannelProperties;
import com.onefinux.hub.notification.NotificationChannel;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.SecurityProperties;
import com.onefinux.hub.stitch.StitchRepository;
import com.onefinux.hub.ux.UxProperties;
import com.onefinux.hub.writeback.WritebackProperties;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * The platform's settings as rows, for the read-only Platform settings screen: role structure, close calendar,
 * outcome SLAs, notification channels, action and write-back targets, search providers and experiments. Values
 * come from configuration; secrets (passwords, keys, tokens) are never returned. Needs the PLATFORM_VIEW verb.
 */
@RestController
@RequestMapping("/api/platform")
public class PlatformController {

    static final String VERB = "PLATFORM_VIEW";

    private final CurrentUser currentUser;
    private final StitchRepository audit;
    private final SecurityProperties security;
    private final CloseCalendar calendar;
    private final OutcomeEngine engine;
    private final OneFinUxProperties hub;
    private final List<NotificationChannel> channels;
    private final ChannelProperties channelConfig;
    private final UxProperties ux;
    private final WritebackProperties writeback;

    public PlatformController(CurrentUser currentUser, StitchRepository audit, SecurityProperties security,
                              CloseCalendar calendar, OutcomeEngine engine, OneFinUxProperties hub,
                              List<NotificationChannel> channels, ChannelProperties channelConfig, UxProperties ux,
                              WritebackProperties writeback) {
        this.currentUser = currentUser;
        this.audit = audit;
        this.security = security;
        this.calendar = calendar;
        this.engine = engine;
        this.hub = hub;
        this.channels = channels;
        this.channelConfig = channelConfig;
        this.ux = ux;
        this.writeback = writeback;
    }

    @GetMapping("/settings")
    public Map<String, Object> settings() {
        if (!currentUser.entitlements().canAct(VERB)) {
            audit.insertAudit(currentUser.actor(), VERB, "platform.settings", "DENY", "{\"reason\":\"role does not allow " + VERB + "\"}");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow " + VERB);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("zone", hub.zone());
        out.put("roles", roles());
        out.put("calendar", calendar.describe());
        out.put("stitchDelays", calendar.stitchDelays());
        out.put("outcomes", outcomes());
        out.put("channels", channels());
        out.put("actionTargets", targets(hub.actionTargets(), t -> t.url()));
        out.put("writebackTargets", targets(writeback.targets(), t -> t.url()));
        out.put("searchProviders", ux.searchProviders().stream()
                .map(p -> row("id", p.id(), "label", p.label(), "url", p.url())).toList());
        out.put("experiments", ux.experiments().stream()
                .map(e -> row("id", e.id(), "description", e.description(), "variants", String.join(", ", e.variants()),
                        "enabled", e.enabled(), "conversion", e.conversion())).toList());
        return out;
    }

    private List<Map<String, Object>> roles() {
        List<Map<String, Object>> rows = new ArrayList<>();
        new TreeMap<>(security.roleActions()).forEach((role, verbs) -> verbs.forEach(verb -> rows.add(row("role", role, "verb", verb))));
        return rows;
    }

    private List<Map<String, Object>> outcomes() {
        return engine.definitions().stream().map(this::outcome).toList();
    }

    private Map<String, Object> outcome(OutcomeDefinition d) {
        var sla = d.sla();
        String rule;
        if (sla == null) {
            rule = "none";
        } else if (sla.withinMinutes() != null) {
            rule = sla.withinMinutes() + " min after the first input";
        } else if (sla.cutoff() != null && !sla.cutoff().isBlank()) {
            int offset = sla.dayOffset() == null ? 0 : sla.dayOffset();
            rule = sla.cutoff() + (offset == 0 ? " on the COB" : " on COB + " + offset + " business day" + (offset == 1 ? "" : "s"));
        } else {
            rule = "none";
        }
        String regions = String.join(", ", d.regions());
        String zones = String.join(", ", d.regions().stream().map(r -> calendar.zone(r).getId()).distinct().toList());
        return row("outcomeId", d.id(), "name", d.name(), "regions", regions, "owner", d.ownerGroup(), "deadline", rule,
                "zone", zones, "onReady", d.onReady() == null ? "NOTIFY_ONLY" : d.onReady().action());
    }

    private List<Map<String, Object>> channels() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (NotificationChannel c : channels) {
            String detail = switch (c.name()) {
                case "email" -> "from " + channelConfig.email().from() + ", " + channelConfig.email().audiences().size()
                        + " audiences, at or above " + channelConfig.email().minSeverity();
                case "servicenow" -> String.valueOf(channelConfig.servicenow().url()) + " · " + channelConfig.servicenow().table()
                        + " on " + String.join(", ", channelConfig.servicenow().transitions());
                default -> "";
            };
            rows.add(row("channel", c.name(), "enabled", c.enabled(), "detail", detail));
        }
        return rows;
    }

    private static <T> List<Map<String, Object>> targets(Map<String, T> targets, java.util.function.Function<T, String> url) {
        return new TreeMap<>(targets).entrySet().stream().map(e -> row("id", e.getKey(), "url", url.apply(e.getValue()))).toList();
    }

    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(String.valueOf(kv[i]), kv[i + 1]);
        }
        return m;
    }
}
