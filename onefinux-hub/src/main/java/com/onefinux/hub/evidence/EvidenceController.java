package com.onefinux.hub.evidence;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/** Close evidence packs: JSON (with digest) by default, {@code format=html} for the printable document. */
@RestController
@RequestMapping("/api/evidence")
public class EvidenceController {

    private final EvidenceService evidence;

    public EvidenceController(EvidenceService evidence) {
        this.evidence = evidence;
    }

    @GetMapping("/instance")
    public ResponseEntity<?> instance(@RequestParam String id, @RequestParam(defaultValue = "json") String format) {
        return respond(evidence.forInstance(id), format);
    }

    @GetMapping("/outcome/{outcomeId}/{cobDate}/{region}")
    public ResponseEntity<?> outcome(@PathVariable String outcomeId, @PathVariable LocalDate cobDate,
                                     @PathVariable String region, @RequestParam(defaultValue = "json") String format) {
        return respond(evidence.forOutcome(outcomeId, cobDate, region), format);
    }

    @PostMapping(value = "/verify", consumes = MediaType.ALL_VALUE)
    public Map<String, Object> verify(@RequestBody String pack) {
        return evidence.verify(pack);
    }

    private static ResponseEntity<?> respond(Map<String, Object> pack, String format) {
        String name = "evidence-" + String.valueOf(pack.get("subjectId")).replaceAll("[^A-Za-z0-9._-]+", "_");
        if ("html".equalsIgnoreCase(format)) {
            return ResponseEntity.ok()
                    .contentType(new MediaType(MediaType.TEXT_HTML, java.nio.charset.StandardCharsets.UTF_8))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name + ".html\"")
                    .body(EvidenceHtml.render(pack));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + ".json\"")
                .body(pack);
    }
}
