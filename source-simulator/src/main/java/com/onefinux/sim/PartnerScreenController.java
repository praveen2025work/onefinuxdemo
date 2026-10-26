package com.onefinux.sim;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin partner stubs so the console can iframe a screen in-app. Not a rebuilt Helix product.
 * The stub paints from the shared design standard (/theme/onefinux-tokens.css on the console origin) and follows
 * its link channel through /ofx-interop.js (FDC3), like any partner screen.
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
                                        @RequestParam(defaultValue = "light") String theme,
                                        @RequestParam(defaultValue = "steps") String skin) {
        String html = """
                <!doctype html>
                <html lang="en" data-ofx-embedded="1" data-theme="%s" data-skin="%s">
                <head>
                  <meta charset="utf-8"/>
                  <title>Helix FOBO</title>
                  <link rel="stylesheet" href="/theme/onefinux-tokens.css"/>
                  <style>
                  body { margin: 0; padding: 14px 16px; background: transparent; color: var(--ofx-ink, #0f172a);
                  font-family: var(--ofx-font, system-ui, sans-serif); font-size: 13px; }
                  .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ofx-ink-2, #64748b); }
                  h1 { font-size: 16px; margin: 4px 0 10px; font-weight: 650; }
                  table { width: 100%%; border-collapse: collapse; }
                  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--ofx-ink-2, #64748b);
                  background: var(--ofx-surface-2, #f1f5f9); padding: 8px; border-bottom: 1px solid var(--ofx-line, #e2e8f0); }
                  td { padding: 8px; border-bottom: 1px solid var(--ofx-line, #e2e8f0); }
                  tr.on td { background: var(--ofx-info-bg, #eff6ff); }
                  .ok { color: var(--ofx-ok, #059669); } .fail { color: var(--ofx-fail, #dc2626); }
                  .mono { font-family: var(--ofx-mono, ui-monospace, monospace); font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="k">Helix · embedded <span id="link"></span></div>
                  <h1>FOBO recon</h1>
                  <p class="mono">%s · %s · COB %s · %s · run %s</p>
                  <table>
                    <thead><tr><th>Break</th><th>Book</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr data-instance="R-1042"><td class="mono">BK-4410</td><td>MB012</td><td>8,420</td><td class="ok">cleared</td></tr>
                      <tr data-instance="R-2031"><td class="mono">BK-4420</td><td>MB014</td><td>12,450,000</td><td class="fail">material</td></tr>
                    </tbody>
                  </table>
                  <p class="k" style="margin-top:14px">Partner screen. No second masthead. Follows its link channel (FDC3).</p>
                  <script src="/ofx-interop.js"></script>
                  <script>
                    window.addEventListener('fdc3Ready', function () {
                      var link = document.getElementById('link');
                      function mark(ctx) {
                        var id = String(ctx.id || '');
                        document.querySelectorAll('tbody tr').forEach(function (tr) { tr.classList.toggle('on', id.indexOf(tr.dataset.instance) >= 0); });
                      }
                      fdc3.addContextListener('ofx.instance', mark);
                      fdc3.getCurrentChannel().then(function (c) { link.textContent = c ? '· linked ' + c.displayMetadata.name : ''; });
                      ofx.onChannelChanged(function (ch) { link.textContent = ch ? '· linked ' + ch : ''; });
                    });
                  </script>
                </body>
                </html>
                """.formatted(
                esc(theme.contains("dark") ? "dark" : "light"),
                esc("ofx".equals(skin) ? "ofx" : "steps"),
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
