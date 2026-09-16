package com.onefinux.sim;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin partner stubs so the console can iframe a screen in-app. Not a rebuilt Helix product.
 */
@RestController
@RequestMapping("/sim/screens")
public class PartnerScreenController {

    @GetMapping(value = "/helix", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> helix(@RequestParam(defaultValue = "") String outcomeId,
                                        @RequestParam(defaultValue = "") String groupUnitId,
                                        @RequestParam(defaultValue = "") String cobDate,
                                        @RequestParam(defaultValue = "") String region,
                                        @RequestParam(defaultValue = "") String runId,
                                        @RequestParam(defaultValue = "ofx") String theme) {
        String html = """
                <!doctype html>
                <html lang="en" data-ofx-embedded="1" data-theme="%s">
                <head>
                  <meta charset="utf-8"/>
                  <title>Helix FOBO</title>
                  <style>
                    :root { color-scheme: light; font-family: Inter, system-ui, sans-serif;
                      --ink:#0f172a; --muted:#64748b; --stroke:#e2e8f0; --ok:#059669; --fail:#dc2626;
                      --raised:#f8fafc; --accent:#4f46e5; }
                    html[data-theme="dark"] { color-scheme: dark; --ink:#e6e8ee; --muted:#9aa3c2;
                      --stroke:#2e3958; --raised:#161d33; --accent:#818cf8; }
                    body { margin: 0; padding: 16px; color: var(--ink); background: transparent; }
                    .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
                    h1 { font-size: 16px; margin: 4px 0 12px; font-weight: 650; }
                    table { width: 100%%; border-collapse: collapse; font-size: 13px; }
                    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--stroke); }
                    .pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--raised); }
                    .ok { color: var(--ok); } .fail { color: var(--fail); }
                    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="k">Helix · embedded</div>
                  <h1>FOBO recon</h1>
                  <p class="mono">%s · %s · COB %s · %s · run %s</p>
                  <table>
                    <thead><tr><th>Break</th><th>Book</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr><td class="mono">BK-4410</td><td>MB012</td><td>8,420</td><td class="ok">cleared</td></tr>
                      <tr><td class="mono">BK-4420</td><td>MB014</td><td>12,450,000</td><td class="fail">material</td></tr>
                    </tbody>
                  </table>
                  <p class="k" style="margin-top:16px">Partner screen. No second masthead.</p>
                </body>
                </html>
                """.formatted(
                esc(theme.contains("light") ? "light" : "dark"),
                esc(empty(groupUnitId, "REV-ACC")),
                esc(empty(outcomeId, "FOBO")),
                esc(empty(cobDate, "—")),
                esc(empty(region, "—")),
                esc(empty(runId, "pending")));
        return ResponseEntity.ok()
                .header("Content-Security-Policy", "frame-ancestors *")
                .body(html);
    }

    private static String empty(String v, String fallback) {
        return v == null || v.isBlank() ? fallback : v;
    }

    private static String esc(String v) {
        return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
