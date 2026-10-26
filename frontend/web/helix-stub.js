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
  const theme = String(q.get('theme') || 'light').includes('dark') ? 'dark' : 'light';
  const skin = q.get('skin') === 'ofx' ? 'ofx' : 'steps';
  const groupUnitId = esc(empty(q.get('groupUnitId'), 'REV-ACC'));
  const outcomeId = esc(empty(q.get('outcomeId'), 'FOBO'));
  const cobDate = esc(empty(q.get('cobDate'), '—'));
  const region = esc(empty(q.get('region'), '—'));
  const runId = esc(empty(q.get('runId'), 'pending'));
  // Same design standard as every screen: the shared tokens file, then the link channel through ofx-interop.js.
  return `<!doctype html>
<html lang="en" data-ofx-embedded="1" data-theme="${theme}" data-skin="${skin}">
<head>
  <meta charset="utf-8"/>
  <title>Helix FOBO</title>
  <link rel="stylesheet" href="/theme/onefinux-tokens.css"/>
  <style>
    body { margin: 0; padding: 14px 16px; background: transparent; color: var(--ofx-ink, #0f172a);
      font-family: var(--ofx-font, system-ui, sans-serif); font-size: 13px; }
    .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ofx-ink-2, #64748b); }
    h1 { font-size: 16px; margin: 4px 0 10px; font-weight: 650; }
    table { width: 100%; border-collapse: collapse; }
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
  <p class="mono">${groupUnitId} · ${outcomeId} · COB ${cobDate} · ${region} · run ${runId}</p>
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
