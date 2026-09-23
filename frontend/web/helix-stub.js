/** Same-origin Helix embed stub for local Vite when the simulator jar is stale. Not a rebuilt FOBO product. */

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function empty(value, fallback) {
  return value == null || String(value).trim() === '' ? fallback : String(value);
}

export function helixStubHtml(query) {
  const q = query instanceof URLSearchParams ? query : new URLSearchParams(query || '');
  const theme = String(q.get('theme') || 'ofx').includes('light') ? 'light' : 'dark';
  const groupUnitId = esc(empty(q.get('groupUnitId'), 'REV-ACC'));
  const outcomeId = esc(empty(q.get('outcomeId'), 'FOBO'));
  const cobDate = esc(empty(q.get('cobDate'), '—'));
  const region = esc(empty(q.get('region'), '—'));
  const runId = esc(empty(q.get('runId'), 'pending'));
  return `<!doctype html>
<html lang="en" data-ofx-embedded="1" data-theme="${theme}">
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
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--stroke); }
    .ok { color: var(--ok); } .fail { color: var(--fail); }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="k">Helix · embedded</div>
  <h1>FOBO recon</h1>
  <p class="mono">${groupUnitId} · ${outcomeId} · COB ${cobDate} · ${region} · run ${runId}</p>
  <table>
    <thead><tr><th>Break</th><th>Book</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="mono">BK-4410</td><td>MB012</td><td>8,420</td><td class="ok">cleared</td></tr>
      <tr><td class="mono">BK-4420</td><td>MB014</td><td>12,450,000</td><td class="fail">material</td></tr>
    </tbody>
  </table>
  <p class="k" style="margin-top:16px">Partner screen. No second masthead.</p>
</body>
</html>`;
}

export function helixStubPlugin() {
  return {
    name: 'helix-screen-stub',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url || '';
        const pathname = raw.split('?')[0];
        if (pathname !== '/sim/screens/helix') return next();
        const query = new URLSearchParams(raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Security-Policy', 'frame-ancestors *');
        res.end(helixStubHtml(query));
      });
    },
  };
}
