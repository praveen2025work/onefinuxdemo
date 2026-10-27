package com.onefinux.hub.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Screen links from the server side. A back-end event (or an RTB operator) can share an FDC3 context on a link
 * channel, or raise an intent, and every open console receives it over the WebSocket ({@code context} /
 * {@code intent} events) — linked screens then follow exactly as if another screen had broadcast it.
 *
 * <p>Outcome channels ({@code outcome:<id>}) are how desks on the same business outcome share context across
 * browsers: a console broadcasts locally, posts here with its {@code origin} (browser id) and message {@code id},
 * and every other browser delivers it; the sender drops its own echo by origin. {@code by} is the authenticated
 * principal, never a client-supplied name.
 *
 * <p>Same trust level as {@code /api/admin/announce} in this POC; production puts it behind an entitlement.
 * The hub only relays: it never interprets a context, and nothing here touches readiness.
 */
@RestController
public class InteropController {

    static final Pattern CHANNEL = Pattern.compile("^[a-z][a-z0-9:_-]{0,48}$");
    static final Pattern INTENT = Pattern.compile("^[A-Za-z][A-Za-z0-9]{0,63}$");
    static final Pattern LABEL = Pattern.compile("^[A-Za-z0-9._-]{1,40}$");
    static final Pattern ORIGIN = Pattern.compile("^[A-Za-z0-9-]{6,64}$");
    static final Pattern MESSAGE_ID = Pattern.compile("^[A-Za-z0-9:._-]{1,80}$");
    static final int MAX_CONTEXT_CHARS = 16 * 1024;

    private final StreamHub stream;
    private final ObjectMapper json;
    private final Clock clock;
    private final CurrentUser currentUser;

    public InteropController(StreamHub stream, ObjectMapper json, Clock clock) {
        this(stream, json, clock, null);
    }

    @Autowired
    public InteropController(StreamHub stream, ObjectMapper json, Clock clock, CurrentUser currentUser) {
        this.stream = stream;
        this.json = json;
        this.clock = clock;
        this.currentUser = currentUser;
    }

    /** Share a context on a channel: a colour ({@code blue}) or an app channel ({@code app:fobo-desk}). */
    @PostMapping("/api/interop/context")
    public Map<String, Object> context(@RequestBody ContextPush body) {
        if (body == null || body.channel() == null || !CHANNEL.matcher(body.channel()).matches()) {
            throw bad("channel must be a colour, app:<name> or outcome:<id> (lower-case, max 49 chars)");
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("channel", body.channel());
        payload.put("context", checkedContext(body.context()));
        payload.put("source", source(body.source()));
        payload.put("at", clock.instant().toString());
        if (body.origin() != null && ORIGIN.matcher(body.origin()).matches()) payload.put("origin", body.origin());
        if (body.id() != null && MESSAGE_ID.matcher(body.id()).matches()) payload.put("id", body.id());
        if (currentUser != null) payload.put("by", currentUser.actor());
        stream.broadcast("context", payload);
        return Map.of("pushed", true, "channel", body.channel(), "clients", stream.clients());
    }

    /** Raise an intent (e.g. ViewInstance) for the Workspace to resolve on every open console. */
    @PostMapping("/api/interop/intent")
    public Map<String, Object> intent(@RequestBody IntentPush body) {
        if (body == null || body.intent() == null || !INTENT.matcher(body.intent()).matches()) {
            throw bad("intent must be a name such as ViewInstance");
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("intent", body.intent());
        payload.put("context", checkedContext(body.context()));
        payload.put("source", source(body.source()));
        payload.put("at", clock.instant().toString());
        stream.broadcast("intent", payload);
        return Map.of("raised", true, "intent", body.intent(), "clients", stream.clients());
    }

    private Map<String, Object> checkedContext(Map<String, Object> context) {
        if (context == null || !(context.get("type") instanceof String type) || type.isBlank() || type.length() > 80) {
            throw bad("context needs a string type (max 80 chars)");
        }
        try {
            if (json.writeValueAsString(context).length() > MAX_CONTEXT_CHARS) {
                throw bad("context is larger than 16 KB");
            }
        } catch (JsonProcessingException e) {
            throw bad("context is not serialisable");
        }
        return context;
    }

    private static String source(String label) {
        return label != null && LABEL.matcher(label).matches() ? "hub:" + label : "hub";
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    public record ContextPush(String channel, Map<String, Object> context, String source, String origin, String id) {
        public ContextPush(String channel, Map<String, Object> context, String source) {
            this(channel, context, source, null, null);
        }
    }

    public record IntentPush(String intent, Map<String, Object> context, String source) {
    }
}
