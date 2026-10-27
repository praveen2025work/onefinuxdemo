package com.onefinux.sim;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stands in for the reconciliation system that owns the break register. One Finance shows it as an editable grid;
 * approved edits arrive at {@code /sim/grids/breaks/apply} from the hub (after maker-checker) and change these rows.
 * {@code /sim/search} is this partner's own search, which the console's header search includes.
 */
@RestController
public class BreakRegisterController {

    static final Set<String> EDITABLE = Set.of("owner", "status", "comment", "dueDate");

    private final Map<String, Map<String, Object>> rows = new ConcurrentHashMap<>();

    public BreakRegisterController() {
        reset();
    }

    final void reset() {
        rows.clear();
        put("BK-4410", "MB012", 8420, "CLEARED", "Alex", "Timing — cleared on T+1", "2026-09-12");
        put("BK-4420", "MB014", 12450000, "OPEN", "Priya", "Motif rejected ledger; adjust pending", "2026-09-13");
        put("BK-4431", "MB014", 310500, "INVESTIGATING", "Alex", "FX rate mismatch", "2026-09-14");
        put("BK-4502", "MB021", 92000, "DISPUTED", "Sam", "Counterparty disputes fee", "2026-09-15");
        put("BK-4519", "MB003", 1500, "OPEN", "", "", "2026-09-16");
    }

    private void put(String id, String book, long amount, String status, String owner, String comment, String due) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("breakId", id);
        r.put("book", book);
        r.put("amount", amount);
        r.put("status", status);
        r.put("owner", owner);
        r.put("comment", comment);
        r.put("dueDate", due);
        rows.put(id, r);
    }

    @GetMapping("/sim/grids/breaks")
    public Map<String, Object> list() {
        List<Map<String, Object>> out = new ArrayList<>(rows.values());
        out.sort((a, b) -> String.valueOf(a.get("breakId")).compareTo(String.valueOf(b.get("breakId"))));
        return Map.of("title", "Break register", "rows", out);
    }

    /** Apply an approved change set. Only editable columns on known rows change; anything else is refused whole. */
    @PostMapping("/sim/grids/breaks/apply")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> apply(@RequestBody Map<String, Object> body) {
        List<Map<String, Object>> changes = (List<Map<String, Object>>) body.getOrDefault("changes", List.of());
        for (Map<String, Object> c : changes) {
            if (!rows.containsKey(String.valueOf(c.get("key"))) || !EDITABLE.contains(String.valueOf(c.get("column")))) {
                return ResponseEntity.unprocessableEntity().body(Map.of("error", "cannot change " + c.get("key") + "." + c.get("column")));
            }
        }
        for (Map<String, Object> c : changes) {
            rows.get(String.valueOf(c.get("key"))).put(String.valueOf(c.get("column")), c.get("after"));
        }
        return ResponseEntity.ok(Map.of("applied", changes.size(), "changeSet", String.valueOf(body.get("changeSet"))));
    }

    @PostMapping("/sim/grids/breaks/reset")
    public Map<String, Object> resetRows() {
        reset();
        return Map.of("rows", rows.size());
    }

    /** Partner search: breaks by id, book, owner, status or comment. Same hit shape as the hub's /api/search. */
    @GetMapping("/sim/search")
    public Map<String, Object> search(@RequestParam String q) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        List<Map<String, Object>> hits = new ArrayList<>();
        if (needle.length() >= 2) {
            for (Map<String, Object> r : rows.values()) {
                String hay = (r.get("breakId") + " " + r.get("book") + " " + r.get("owner") + " " + r.get("status") + " "
                        + r.get("comment")).toLowerCase(Locale.ROOT);
                if (hay.contains(needle)) {
                    hits.add(Map.of("kind", "break", "id", r.get("breakId"),
                            "title", r.get("breakId") + " · " + r.get("book"),
                            "detail", r.get("status") + " · " + r.get("amount") + (String.valueOf(r.get("owner")).isBlank() ? "" : " · " + r.get("owner")),
                            "route", "/grids?spec=break-register&focus=" + r.get("breakId")));
                }
            }
        }
        return Map.of("hits", hits);
    }
}
