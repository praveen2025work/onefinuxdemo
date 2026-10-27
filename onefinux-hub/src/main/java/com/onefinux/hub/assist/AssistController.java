package com.onefinux.hub.assist;

import com.onefinux.hub.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** The assistant panel's backend. Rate-limited per user; questions are capped at 500 characters. */
@RestController
public class AssistController {

    static final int MAX_QUESTION = 500;
    static final int PER_MINUTE = 20;

    private final AssistService service;
    private final AssistProperties props;
    private final CurrentUser currentUser;
    private final Clock clock;
    private final Map<String, long[]> rate = new ConcurrentHashMap<>();

    public AssistController(AssistService service, AssistProperties props, CurrentUser currentUser, Clock clock) {
        this.service = service;
        this.props = props;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    @GetMapping("/api/assist")
    public Map<String, Object> status() {
        return Map.of("mode", props.modelEnabled() ? "claude" : "grounded");
    }

    @PostMapping("/api/assist")
    public Map<String, Object> ask(@RequestBody AssistService.Question q) {
        if (q == null || q.question() == null || q.question().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ask a question");
        if (q.question().length() > MAX_QUESTION) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "questions are limited to " + MAX_QUESTION + " characters");
        String who = currentUser.actor();
        if ("anonymous".equals(who)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "sign in first");
        long minute = clock.millis() / 60_000;
        long[] slot = rate.compute(who, (k, v) -> v == null || v[0] != minute ? new long[]{minute, 0} : v);
        synchronized (slot) {
            if (++slot[1] > PER_MINUTE) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "a few questions a minute, please");
        }
        return service.ask(q);
    }
}
