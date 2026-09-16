package com.onefinux.sim;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Partner-shaped grid payloads for kit-configured step views. Not a rebuilt Motif or Helix screen.
 */
@RestController
@RequestMapping("/sim/grids")
public class GridScreenController {

    @GetMapping("/{name}")
    public ResponseEntity<Map<String, Object>> grid(@PathVariable String name,
                                                    @RequestParam(required = false) String cobDate,
                                                    @RequestParam(required = false) String region,
                                                    @RequestParam(required = false) String groupUnitId,
                                                    @RequestParam(required = false) String account,
                                                    @RequestParam(required = false) String journalId,
                                                    @RequestParam(required = false) String status) {
        String key = name == null ? "" : name.trim().toLowerCase();
        return switch (key) {
            case "investigation" -> ResponseEntity.ok(investigation(cobDate, region, groupUnitId, account, journalId));
            case "close" -> ResponseEntity.ok(close(cobDate, region, groupUnitId, status));
            default -> ResponseEntity.notFound().build();
        };
    }

    private static Map<String, Object> investigation(String cobDate, String region, String groupUnitId,
                                                     String account, String journalId) {
        String acc = blank(account, "410000");
        String journal = blank(journalId, "JE-8801");
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(row("Balance", acc, journal, "12,450,000", "OPEN", "FS line Net interest income"));
        rows.add(row("Reconciliation break", "BK-4420", journal, "12,450,000", "MATERIAL", "Helix break vs Motif MB014"));
        rows.add(row("Related transaction", "TR-9901", "CATS", "12,450,000", "COMPLETED", "Front-office trade for this journal"));
        rows.add(row("P&L explanation", "NII", acc, "12,450,000", "EXPLAINED", "Move sits on net interest income"));
        rows.add(row("Processing history", "MB014", "MOTIF", "12,450,000", "FAILED", "LEDGER_REJECTED then awaiting adjust echo"));
        rows.add(row("Adjustment", blank(journal, "JE-8801"), "FAS", "12,450,000", "COMMAND", "Command Motif; books stay in Motif"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("title", "Investigation");
        out.put("columns", List.of(
                col("kind", "Kind"),
                col("id", "Id"),
                col("source", "Source"),
                col("amount", "Amount"),
                col("status", "Status"),
                col("note", "Note")));
        out.put("rows", rows);
        out.put("context", Map.of(
                "cobDate", blank(cobDate, "—"),
                "region", blank(region, "—"),
                "groupUnitId", blank(groupUnitId, "REV-ACC"),
                "account", acc,
                "journalId", journal));
        return out;
    }

    private static Map<String, Object> close(String cobDate, String region, String groupUnitId, String status) {
        String fold = blank(status, "BLOCKED");
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(row("Reconciliation", "BK-4420", "MBR", "1 of 2", fold.equals("CLEARED") ? "COMPLETE" : "OPEN",
                "Material break still open until Motif posts"));
        rows.add(row("Exception", "MB014", "MOTIF", "12,450,000", fold.equals("CLEARED") ? "CLEARED" : "OPEN",
                "Named blocker on the stitch fold"));
        rows.add(row("Adjustment", "FAS_MOTIF", "FAS", "run pending", fold.equals("BLOCKED") ? "NOT_STARTED" : "COMMANDED",
                "Adjust is a kit verb; Motif remains the book"));
        rows.add(row("Control", "dual-sign", "One Finance", "maker/checker", "REQUIRED",
                "SIGN_OFF then COUNTERSIGN by a different actor"));
        rows.add(row("Substantiation", "evidence", "workspace", "—", "READY",
                "Comments and evidence stay on this case view"));
        rows.add(row("Sign-off", blank(groupUnitId, "REV-ACC"), "GLA", fold, fold.equals("CLEARED") ? "SIGNED" : "NOT_READY",
                "Final approval only after READY"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("title", "Close and sign-off");
        out.put("columns", List.of(
                col("kind", "Control"),
                col("id", "Id"),
                col("source", "Owner"),
                col("amount", "Measure"),
                col("status", "Status"),
                col("note", "Note")));
        out.put("rows", rows);
        out.put("context", Map.of(
                "cobDate", blank(cobDate, "—"),
                "region", blank(region, "—"),
                "groupUnitId", blank(groupUnitId, "REV-ACC"),
                "status", fold));
        return out;
    }

    private static Map<String, Object> row(String kind, String id, String source, String amount, String status, String note) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kind", kind);
        m.put("id", id);
        m.put("source", source);
        m.put("amount", amount);
        m.put("status", status);
        m.put("note", note);
        return m;
    }

    private static Map<String, Object> col(String key, String label) {
        return Map.of("key", key, "label", label);
    }

    private static String blank(String v, String fallback) {
        return v == null || v.isBlank() ? fallback : v;
    }
}
