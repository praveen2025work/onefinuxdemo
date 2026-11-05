// The One Finance design standard as data, for the Design standard page (/standards) and its tests. Every token and
// .ofx-* class named here must exist in frontend/theme/onefinux-tokens.css (standards.test.js checks it), so what a
// team copies from the page is what the standard ships.

export const PALETTE_GROUPS = [
  { title: 'Surfaces', tokens: [
    ['--ofx-page', 'Page background'],
    ['--ofx-card', 'Cards, panels, the header, the side panel'],
    ['--ofx-surface-2', 'Grid header band, hover, wells'],
    ['--ofx-line', '1px borders and dividers'],
    ['--ofx-line-2', 'Stronger borders, chips'],
  ] },
  { title: 'Text', tokens: [
    ['--ofx-ink', 'Body text and titles'],
    ['--ofx-ink-2', 'Secondary text, labels of KPIs'],
    ['--ofx-ink-3', 'Placeholders, captions'],
  ] },
  { title: 'Interactive', tokens: [
    ['--ofx-accent', 'Buttons, links, active nav, focus, selection'],
    ['--ofx-accent-2', 'Hover and pressed; info text'],
    ['--ofx-on-accent', 'Text on an accent fill'],
  ] },
  { title: 'Status', tokens: [
    ['--ofx-ok', 'READY, COMPLETED, CLEARED'],
    ['--ofx-warn', 'WAITING, at risk, HOLD (text)'],
    ['--ofx-fail', 'BLOCKED, FAILED'],
    ['--ofx-gold', 'Warning fills, highlights (never text)'],
  ] },
  { title: 'Brand', tokens: [
    ['--ofx-navy', 'Midnight: dark surfaces, hero bands'],
    ['--ofx-sky', 'Sky: the brand mark only (never text or buttons)'],
  ] },
  { title: 'Chart series', tokens: [
    ['--ofx-chart-1', 'Series 1'], ['--ofx-chart-2', 'Series 2'], ['--ofx-chart-3', 'Series 3'],
    ['--ofx-chart-4', 'Series 4'], ['--ofx-chart-5', 'Series 5'], ['--ofx-chart-6', 'Series 6'],
  ] },
];

/** Tokens whose text use is checked for contrast on the page. */
export const TEXT_TOKENS = new Set(['--ofx-ink', '--ofx-ink-2', '--ofx-ink-3', '--ofx-accent', '--ofx-accent-2', '--ofx-ok', '--ofx-warn', '--ofx-fail']);

export const TYPE_STEPS = [
  { token: '--ofx-text-3xl', px: 30, weight: 600, use: 'Hero numbers', sample: '1,248' },
  { token: '--ofx-text-2xl', px: 24, weight: 700, use: 'Page titles, KPI values', sample: 'Can I produce the 15C3 report?' },
  { token: '--ofx-text-xl', px: 20, weight: 700, use: 'Dialog titles, the brand name', sample: 'Sign off FOBO investigation' },
  { token: '--ofx-text-lg', px: 18, weight: 700, use: 'The app title in the header', sample: "Today's close" },
  { token: '--ofx-text-base', px: 16, weight: 600, use: 'Card and section titles', sample: 'Every outcome instance for this unit' },
  { token: '--ofx-text-sm', px: 14, weight: 400, use: 'Body text, fields, labels, nav, tabs', sample: 'MOTIF MB014 failed; the outcome is blocked until it completes.' },
  { token: '--ofx-text-xs', px: 12, weight: 400, use: 'Meta, captions, compact buttons, grid headers', sample: 'Updated 09:41 · source Motif' },
  { token: '--ofx-text-2xs', px: 11, weight: 600, use: 'Badges, eyebrows, row actions', sample: 'BLOCKED' },
  { token: '--ofx-text-micro', px: 10, weight: 600, use: 'Counters on dense rows', sample: '12' },
];

export const SHELL_TOKENS = [
  ['--ofx-header-h', '64px', 'The app header: one row (STEPS DashboardLayout)'],
  ['--ofx-sidebar-w', '256px', 'The side panel when open'],
  ['--ofx-nav-h', '36px', 'Nav items: 14px / 500, the active one filled with the accent'],
  ['--ofx-page-px', '16px', 'Page gutters'],
  ['--ofx-gap', '16px', 'Between cards in a row or a grid'],
  ['--ofx-section-gap', '24px', 'Between page sections (STEPS space-y-6)'],
  ['--ofx-card-p', '24px', 'Card padding (STEPS p-6)'],
  ['--ofx-rail-w', '340px', 'The facts rail of a detail page'],
  ['--ofx-ctl-h', '32px', 'Compact controls: toolbars, filters, card and grid tools (STEPS Button sm)'],
  ['--ofx-ctl-h-lg', '36px', 'Default buttons: forms, dialogs, page actions (STEPS Button)'],
  ['--ofx-field-h', '36px', 'Form inputs and selects (STEPS Input, SelectTrigger)'],
  ['--ofx-grid-row-h', '33px', 'Wijmo grid rows and header; 13px cells, 12px / 600 header'],
];

const LIST = `<div class="ofx-page">
  <div class="ofx-page-header">
    <div class="ofx-page-heading">
      <h1 class="ofx-title-page">Breaks</h1>
      <p class="ofx-desc">Open breaks for REV-ACC on the business date.</p>
    </div>
    <div class="ofx-page-actions">
      <button class="ofx-btn ofx-btn-2" type="button">Export</button>
      <button class="ofx-btn" type="button">Assign</button>
    </div>
  </div>
  <div class="ofx-toolbar">
    <select class="ofx-select" aria-label="Region"><option>All regions</option><option>EMEA</option></select>
    <input class="ofx-input" placeholder="Search breaks" aria-label="Search breaks">
    <span class="ofx-spacer"></span>
    <span class="ofx-meta">3 of 128 breaks</span>
  </div>
  <div class="ofx-card">
    <!-- Read-only rows are a GridSpec in the standard Wijmo grid: <ofx-grid spec="breaks"></ofx-grid> -->
    <table class="ofx-tbl">
      <thead><tr><th>Break</th><th>Owner</th><th>Status</th><th class="ofx-num">Amount</th></tr></thead>
      <tbody>
        <tr><td class="ofx-mono">BK-4410</td><td>Alex Smith</td><td><span class="ofx-pill ofx-pill-fail">BLOCKED</span></td><td class="ofx-num">12,450,000</td></tr>
        <tr><td class="ofx-mono">BK-4420</td><td>Sam Lee</td><td><span class="ofx-pill ofx-pill-warn">WAITING</span></td><td class="ofx-num">840,120</td></tr>
        <tr><td class="ofx-mono">BK-4431</td><td>Jo Patel</td><td><span class="ofx-pill ofx-pill-ok">CLEARED</span></td><td class="ofx-num">2,310</td></tr>
      </tbody>
    </table>
  </div>
</div>`;

const DASHBOARD = `<div class="ofx-page">
  <div class="ofx-page-header">
    <div class="ofx-page-heading">
      <h1 class="ofx-title-page">Today's close</h1>
      <p class="ofx-desc">Readiness of every outcome for the unit.</p>
    </div>
    <div class="ofx-page-actions"><button class="ofx-btn ofx-btn-2" type="button">Share</button></div>
  </div>
  <div class="ofx-kpis">
    <div class="ofx-kpi ofx-ok"><span class="ofx-kpi-label">Ready</span><span class="ofx-kpi-value">12</span><span class="ofx-kpi-help">of 15 outcomes</span></div>
    <div class="ofx-kpi ofx-fail"><span class="ofx-kpi-label">Blocked</span><span class="ofx-kpi-value">2</span><span class="ofx-kpi-help">named keys hold them</span></div>
    <div class="ofx-kpi ofx-warn"><span class="ofx-kpi-label">Delayed</span><span class="ofx-kpi-value">1</span><span class="ofx-kpi-help">inside tolerance</span></div>
    <div class="ofx-kpi ofx-info"><span class="ofx-kpi-label">Escalations</span><span class="ofx-kpi-value">3</span><span class="ofx-kpi-help">owned by RTB</span></div>
  </div>
  <div class="ofx-grid-12">
    <section class="ofx-card ofx-col-8"><div class="ofx-card-hd">Readiness by outcome</div><div class="ofx-card-bd ofx-desc">A Chart over the same rows as the grid.</div></section>
    <section class="ofx-card ofx-col-4"><div class="ofx-card-hd">Activity</div><div class="ofx-card-bd ofx-desc">Sign-offs, posts and escalations as they happen.</div></section>
  </div>
</div>`;

const DETAIL = `<div class="ofx-page">
  <div class="ofx-page-header">
    <div class="ofx-page-heading">
      <h1 class="ofx-title-page">R-2031 · EMEA FOBO</h1>
      <p class="ofx-desc">Blocked on MOTIF MB014 FAILED.</p>
    </div>
    <div class="ofx-page-actions">
      <button class="ofx-btn ofx-btn-2" type="button">Escalate</button>
      <button class="ofx-btn" type="button" disabled>Sign off</button>
    </div>
  </div>
  <div class="ofx-split">
    <section class="ofx-card"><div class="ofx-card-hd">Readiness keys</div><div class="ofx-card-bd ofx-desc">The keys the fold counts, with their status.</div></section>
    <aside class="ofx-card"><div class="ofx-card-hd">Facts</div><div class="ofx-card-bd"><p class="ofx-meta">Owner: FOBO Controllers</p><p class="ofx-meta">SLA: 18:00 London</p></div></aside>
  </div>
</div>`;

const FORM = `<div class="ofx-page">
  <div class="ofx-page-header">
    <div class="ofx-page-heading">
      <h1 class="ofx-title-page">New outcome</h1>
      <p class="ofx-desc">The question, its feeds and what happens when it is ready.</p>
    </div>
  </div>
  <section class="ofx-card">
    <div class="ofx-card-hd">Question</div>
    <div class="ofx-card-bd">
      <form class="ofx-form">
        <div class="ofx-form-grid">
          <label class="ofx-field"><span class="ofx-label">Name</span><input class="ofx-input" value="Month-end close"></label>
          <label class="ofx-field"><span class="ofx-label">Region</span><select class="ofx-select"><option>GLOBAL</option></select></label>
          <label class="ofx-field ofx-wide"><span class="ofx-label">Question</span><input class="ofx-input" value="Can I close the month?"></label>
        </div>
        <div class="ofx-form-actions">
          <button class="ofx-btn ofx-btn-lg ofx-btn-2" type="button">Cancel</button>
          <button class="ofx-btn ofx-btn-lg" type="button">Create outcome</button>
        </div>
      </form>
    </div>
  </section>
</div>`;

const WORKLOAD = `<!-- Framed in One Finance: <html data-ofx-embedded="1" data-skin="barclays" data-theme="light">.
     The host's header names the page, so .ofx-page-heading hides itself; the page keeps its tools. -->
<div class="ofx-page">
  <div class="ofx-page-header">
    <div class="ofx-page-heading"><h1 class="ofx-title-page">Rec Factory</h1></div>
    <div class="ofx-page-actions"><button class="ofx-btn" type="button">Run match</button></div>
  </div>
  <div class="ofx-card"><div class="ofx-card-bd ofx-desc">The team's own screen, in the standard look, inside a desk view.</div></div>
</div>`;

export const TEMPLATES = [
  { id: 'list', title: 'List', use: 'Find and act on rows: filters in a toolbar over one grid.', html: LIST },
  { id: 'dashboard', title: 'Dashboard', use: 'Status at a glance: KPI tiles, then cards on the 12-column grid.', html: DASHBOARD },
  { id: 'detail', title: 'Detail', use: 'One record: its content beside a 340px facts rail.', html: DETAIL },
  { id: 'form', title: 'Form', use: 'Create or change something: labelled 36px fields in two columns, actions bottom right.', html: FORM },
  { id: 'workload', title: 'Workload (framed)', use: "A team's screen inside a One Finance desk: the same page, without its heading.", html: WORKLOAD },
];

export const EMBED_QUERY = [
  ['ofx-embed', '1', 'Turn on embedded mode (only for an allow-listed host origin)'],
  ['theme', 'light | dark', 'Mode: set html[data-theme]'],
  ['skin', 'barclays | steps | ofx', 'Palette: set html[data-skin] (any short lower-case name; unknown ones paint as Barclays)'],
  ['groupUnit, cobDate, region', 'REV-ACC, 2026-09-12, EMEA', 'The user\'s scope in the console'],
  ['ofxView, outcomeId, runId', 'desk view, outcome …', 'Where the frame sits; outcome desks link on outcome:<id>'],
];

export const EMBED_MESSAGES = [
  ['host → app', 'ofx.theme { theme, skin }', 'Repaint: the host switched theme'],
  ['host → app', 'ofx.scope / ofx.context', 'The business date, unit and region changed'],
  ['app ↔ host', 'FDC3 2.0 (window.fdc3 from /ofx-interop.js)', 'Share a pick with linked screens; raise ViewInstance, ViewBreak …'],
  ['app → host', 'ofx.activity { action, summary }', 'Tell every desk on the outcome what this screen did'],
  ['chatbot → host', 'ofx.chat.ready / ofx.chat.open / ofx.chat.share', 'The chat contract (MITR AI)'],
];

export const CHECKLIST = [
  'Link /theme/onefinux-tokens.css (and onefinux-wijmo.css with Wijmo) from the One Finance host, or keep a synced copy (npm run sync:ofx-theme) for standalone use. Never edit a copy.',
  'Set <html data-skin data-theme> from the skin= and theme= the host sends; follow ofx.theme messages. Barclays is the default.',
  'Framed (ofx-embed=1 from an allow-listed origin): set data-ofx-embedded="1" and draw no masthead or side panel; keep the page tools.',
  'Build every screen from one of the five page templates (.ofx-page …) or your framework\'s equivalent of them.',
  'Text sizes are the STEPS steps only: 10, 11, 12, 14, 16, 18, 20, 24, 30px (13px only inside a data grid). No text-[13px].',
  'Colours come from --ofx-* tokens only; no hex in components. Tailwind 3 apps add onefinux-tailwind-preset.cjs so blue / slate / gray follow the brand.',
  'Controls: compact 32px (toolbars, filters) or default 36px (forms, dialogs) — STEPS Button sm and default; 10px corners; 14px typed text.',
  'Read-only data is the standard Wijmo grid: a GridSpec, <ofx-grid> or onefinux-wijmo.css over your own FlexGrid.',
  'Screen-to-screen links are FDC3 (window.fdc3), never a private postMessage protocol.',
  'Allow the One Finance origin in frame-ancestors and only that origin in your embed allow-list; the user\'s SSO, not a service account.',
  'Run the parity audit (frontend/web: npm run parity) against your running app before you ship.',
];
