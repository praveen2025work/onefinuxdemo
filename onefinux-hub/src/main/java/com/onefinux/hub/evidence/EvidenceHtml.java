package com.onefinux.hub.evidence;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The printable form of an evidence pack. Styles are the shared partner classes from
 * {@code /theme/onefinux-tokens.css}, so the document carries no colours of its own.
 */
final class EvidenceHtml {

    private static final List<String[]> SECTIONS = List.of(
            new String[] {"readiness", "Readiness", "The inputs this outcome waits on, and their state when the pack was taken."},
            new String[] {"facts", "Facts", "Every business fact the hub received for this outcome, oldest first."},
            new String[] {"decisions", "Decisions and actions", "Who did what (sign-off, countersign, post, amend, exports, refusals)."},
            new String[] {"commands", "Downstream commands", "What was commanded at destinations and whether completion echoed the run."},
            new String[] {"escalations", "Escalations", "Delays and breaches raised on this outcome."},
            new String[] {"notifications", "Notifications", "Who was told, and when."});

    private EvidenceHtml() {
    }

    @SuppressWarnings("unchecked")
    static String render(Map<String, Object> pack) {
        Map<String, Object> content = (Map<String, Object>) pack.getOrDefault("content", Map.of());
        Map<String, Object> subject = (Map<String, Object>) content.getOrDefault("subject", Map.of());
        Map<String, Object> digest = (Map<String, Object>) pack.getOrDefault("digest", Map.of());

        StringBuilder html = new StringBuilder(8192);
        html.append("<!doctype html><html lang=\"en\" data-skin=\"steps\"><head><meta charset=\"utf-8\">")
                .append("<title>Evidence pack · ").append(esc(pack.get("subjectId"))).append("</title>")
                .append("<link rel=\"stylesheet\" href=\"/theme/onefinux-tokens.css\">")
                .append("<style>body{margin:0}main{max-width:1100px;margin:0 auto;padding:24px;display:grid;gap:16px}")
                .append("h1{font-weight:var(--ofx-fw-medium);font-size:22px;margin:4px 0}")
                .append("dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0}dt{color:var(--ofx-ink-2)}dd{margin:0}")
                .append(".ofx-tbl td{vertical-align:top;overflow-wrap:anywhere}")
                .append("@media print{.ofx-card{break-inside:avoid;box-shadow:none}}</style></head>")
                .append("<body class=\"ofx-app\"><main>");

        html.append("<header><div class=\"ofx-eyebrow\">Close evidence pack · ").append(esc(pack.get("kind"))).append("</div>")
                .append("<h1>").append(esc(pack.get("question"))).append("</h1>")
                .append("<div class=\"ofx-muted ofx-mono\">").append(esc(pack.get("subjectId"))).append("</div></header>");

        html.append("<section class=\"ofx-card\"><div class=\"ofx-card-hd\">Subject</div><div class=\"ofx-card-bd\"><dl>");
        subject.forEach((k, v) -> html.append("<dt>").append(esc(k)).append("</dt><dd>").append(esc(v)).append("</dd>"));
        html.append("</dl></div></section>");

        for (String[] section : SECTIONS) {
            Object rows = content.get(section[0]);
            if (rows instanceof List<?> list) {
                table(html, section[1], section[2], (List<Object>) list);
            }
        }
        if (content.get("report") instanceof Map<?, ?> report) {
            html.append("<section class=\"ofx-card\"><div class=\"ofx-card-hd\">Report</div><div class=\"ofx-card-bd\"><dl>");
            report.forEach((k, v) -> html.append("<dt>").append(esc(k)).append("</dt><dd>").append(esc(v)).append("</dd>"));
            html.append("</dl></div></section>");
        }

        html.append("<section class=\"ofx-card\"><div class=\"ofx-card-hd\">Integrity</div><div class=\"ofx-card-bd\"><dl>")
                .append("<dt>Generated</dt><dd>").append(esc(pack.get("generatedAt"))).append(" (").append(esc(pack.get("zone"))).append(")</dd>")
                .append("<dt>By</dt><dd>").append(esc(pack.get("generatedBy"))).append("</dd>")
                .append("<dt>Format</dt><dd class=\"ofx-mono\">").append(esc(pack.get("format"))).append("</dd>")
                .append("<dt>").append(esc(digest.get("algorithm"))).append("</dt><dd class=\"ofx-mono\">").append(esc(digest.get("value"))).append("</dd>")
                .append("</dl><p class=\"ofx-muted\">The digest covers ").append(esc(digest.get("covers")))
                .append(" in the JSON form of this pack. POST the JSON to /api/evidence/verify to check it.</p></div></section>");

        return html.append("</main></body></html>").toString();
    }

    private static void table(StringBuilder html, String title, String help, List<Object> rows) {
        html.append("<section class=\"ofx-card\"><div class=\"ofx-card-hd\">").append(esc(title))
                .append(" <span class=\"ofx-muted\">(").append(rows.size()).append(")</span></div><div class=\"ofx-card-bd\">")
                .append("<p class=\"ofx-muted\" style=\"margin-top:0\">").append(esc(help)).append("</p>");
        if (rows.isEmpty()) {
            html.append("<p class=\"ofx-muted\">None recorded.</p></div></section>");
            return;
        }
        Set<String> columns = new LinkedHashSet<>();
        for (Object row : rows) {
            if (row instanceof Map<?, ?> map) {
                map.keySet().forEach(k -> columns.add(String.valueOf(k)));
            }
        }
        html.append("<table class=\"ofx-tbl\"><thead><tr>");
        columns.forEach(c -> html.append("<th scope=\"col\">").append(esc(c)).append("</th>"));
        html.append("</tr></thead><tbody>");
        for (Object row : rows) {
            Map<?, ?> map = row instanceof Map<?, ?> m ? m : Map.of();
            html.append("<tr>");
            columns.forEach(c -> html.append("<td>").append(esc(map.get(c))).append("</td>"));
            html.append("</tr>");
        }
        html.append("</tbody></table></div></section>");
    }

    static String esc(Object value) {
        if (value == null) {
            return "";
        }
        String s = value instanceof Collection<?> c ? String.join(", ", c.stream().map(String::valueOf).toList()) : String.valueOf(value);
        StringBuilder out = new StringBuilder(s.length());
        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '&' -> out.append("&amp;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(ch);
            }
        }
        return out.toString();
    }
}
