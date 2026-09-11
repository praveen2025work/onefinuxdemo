package com.onefinux.hub.api;

import com.onefinux.hub.stream.StreamHub;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Live feed for the UX: named SSE events "event", "outcome", "notification", "reset". */
@RestController
public class StreamController {

    private final StreamHub stream;

    public StreamController(StreamHub stream) {
        this.stream = stream;
    }

    @GetMapping(path = "/api/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return stream.subscribe();
    }
}
