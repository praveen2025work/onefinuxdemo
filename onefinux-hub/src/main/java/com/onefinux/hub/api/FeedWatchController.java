package com.onefinux.hub.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.onefinux.hub.event.EventContractValidator;
import com.onefinux.hub.event.FeedWatchService;
import com.onefinux.hub.event.IngestResult;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/** Feed-watch inbox: drop a file, scan the folder, inspect paths. Same ingest as POST /api/events. */
@RestController
@RequestMapping("/api/feeds")
public class FeedWatchController {

    private final FeedWatchService watch;

    public FeedWatchController(FeedWatchService watch) {
        this.watch = watch;
    }

    @GetMapping("/watch")
    public Map<String, Object> status() {
        return watch.status();
    }

    @PostMapping("/watch/scan")
    public Map<String, Object> scan() {
        int accepted = watch.scan();
        Map<String, Object> body = new java.util.LinkedHashMap<>(watch.status());
        body.put("accepted", accepted);
        return body;
    }

    @PostMapping("/drop")
    public ResponseEntity<IngestResult> drop(@RequestBody JsonNode body) throws IOException {
        IngestResult result = watch.drop(body);
        HttpStatus status = "REJECTED".equals(result.result()) ? HttpStatus.BAD_REQUEST
                : result.isDuplicate() ? HttpStatus.OK : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status)
                .header("X-Onefinux-Contract", EventContractValidator.FEED_CONTRACT)
                .body(result);
    }
}
