import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import DataGrid from '../components/DataGrid.jsx';
import { useApp } from '../store.jsx';
import { THEMES } from '../lib/themes.js';
import { contrast, isHex, palette } from '../lib/tokens.js';
import { CHECKLIST, EMBED_MESSAGES, EMBED_QUERY, PALETTE_GROUPS, SHELL_TOKENS, TEMPLATES, TEXT_TOKENS, TYPE_STEPS } from '../lib/standards.js';
import tokensCss from '@theme/onefinux-tokens.css?raw';

// The design standard every team builds to, on one page: the live palette of the theme you are in, the STEPS type
// scale, the controls and the five page templates as copyable HTML, the layout grid, the data grid, and the embed
// contract. Everything is drawn from frontend/theme/onefinux-tokens.css itself, so the page cannot drift from it.

const TABS = [
  { id: 'palette', label: 'Palette', icon: 'palette' },
  { id: 'type', label: 'Type', icon: 'book' },
  { id: 'controls', label: 'Controls', icon: 'checks' },
  { id: 'pages', label: 'Page templates', icon: 'window' },
  { id: 'layout', label: 'Layout', icon: 'columns' },
  { id: 'grid', label: 'Data grid', icon: 'grid' },
  { id: 'embed', label: 'Embedding', icon: 'link' },
  { id: 'checklist', label: 'Checklist', icon: 'check' },
];

const COMPARE = ['--ofx-page', '--ofx-card', '--ofx-ink', '--ofx-accent', '--ofx-ok', '--ofx-warn', '--ofx-fail', '--ofx-navy'];

/** The current theme's token values, read from the page (they follow the theme switch). */
function useLiveTokens(themeId) {
  const [values, setValues] = useState({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const all = PALETTE_GROUPS.flatMap((g) => g.tokens.map(([t]) => t));
    setValues(Object.fromEntries(all.map((t) => [t, cs.getPropertyValue(t).trim()])));
  }, [themeId]);
  return values;
}

function Swatch({ token, use, value, card }) {
  const ratio = TEXT_TOKENS.has(token) && isHex(value) && isHex(card) ? contrast(value, card) : null;
  return (
    <div className="std-swatch">
      <span className="std-chip" style={{ background: `var(${token})` }} />
      <div className="std-swatch-txt">
        <code className="mono">{token}</code>
        <span className="std-val">{value || '—'}{ratio ? ` · ${ratio.toFixed(1)}:1 on cards` : ''}</span>
        <span className="muted">{use}</span>
      </div>
    </div>
  );
}

function PaletteTab({ themeId }) {
  const live = useLiveTokens(themeId);
  const skins = useMemo(() => THEMES.map((t) => ({ ...t, p: palette(tokensCss, t.skin, t.mode) })), []);
  return (
    <>
      {PALETTE_GROUPS.map((g) => (
        <section key={g.title} className="panel">
          <div className="panel-hd"><h2>{g.title}</h2><span className="hint">{THEMES.find((t) => t.id === themeId)?.label}</span></div>
          <div className="panel-bd std-swatches">
            {g.tokens.map(([token, use]) => <Swatch key={token} token={token} use={use} value={live[token]} card={live['--ofx-card']} />)}
          </div>
        </section>
      ))}
      <section className="panel">
        <div className="panel-hd"><h2>Every theme, side by side</h2><span className="hint">from onefinux-tokens.css</span></div>
        <div className="panel-bd tight">
          <table className="tbl std-compare">
            <thead><tr><th>Token</th>{skins.map((t) => <th key={t.id}>{t.label}</th>)}</tr></thead>
            <tbody>
              {COMPARE.map((token) => (
                <tr key={token}>
                  <td className="mono">{token}</td>
                  {skins.map((t) => (
                    <td key={t.id}><span className="std-mini" style={{ background: t.p[token] }} /> <span className="mono">{t.p[token]}</span></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TypeTab() {
  return (
    <section className="panel">
      <div className="panel-hd"><h2>Type scale — the STEPS v3 steps</h2><span className="hint">nothing in between: no 13px, 12.5px or 15px</span></div>
      <div className="panel-bd tight">
        <table className="tbl std-type">
          <thead><tr><th>Token</th><th className="num">Size</th><th>Use for</th><th>Sample</th></tr></thead>
          <tbody>
            {TYPE_STEPS.map((s) => (
              <tr key={s.token}>
                <td className="mono">{s.token}</td>
                <td className="num">{s.px}px</td>
                <td>{s.use}</td>
                <td><span style={{ fontSize: `var(${s.token})`, fontWeight: s.weight, lineHeight: 1.25 }}>{s.sample}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Demo({ cls, children }) {
  return (
    <div className="std-demo">
      <div className="std-demo-box">{children}</div>
      <code className="mono">{cls}</code>
    </div>
  );
}

function ControlsTab() {
  return (
    <>
      <section className="panel">
        <div className="panel-hd"><h2>Buttons</h2><span className="hint">compact 32px for tools · default 36px for forms and dialogs</span></div>
        <div className="panel-bd std-demos">
          <Demo cls=".ofx-btn"><button type="button" className="ofx-btn">Assign</button></Demo>
          <Demo cls=".ofx-btn.ofx-btn-2"><button type="button" className="ofx-btn ofx-btn-2">Export</button></Demo>
          <Demo cls=".ofx-btn.ofx-btn-ghost"><button type="button" className="ofx-btn ofx-btn-ghost">Cancel</button></Demo>
          <Demo cls=".ofx-btn.ofx-btn-danger"><button type="button" className="ofx-btn ofx-btn-danger">Revoke</button></Demo>
          <Demo cls=".ofx-btn.ofx-btn-lg"><button type="button" className="ofx-btn ofx-btn-lg">Create outcome</button></Demo>
          <Demo cls=".ofx-btn.ofx-btn-xs"><button type="button" className="ofx-btn ofx-btn-xs ofx-btn-2">Re-run</button></Demo>
          <Demo cls=".ofx-btn:disabled"><button type="button" className="ofx-btn" disabled>Sign off</button></Demo>
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Fields</h2><span className="hint">14px typed text · 32px in a toolbar, 36px in a form</span></div>
        <div className="panel-bd std-demos">
          <Demo cls=".ofx-input"><input className="ofx-input" placeholder="Search breaks" aria-label="Search breaks (example)" /></Demo>
          <Demo cls=".ofx-select"><select className="ofx-select" aria-label="Region (example)"><option>All regions</option></select></Demo>
          <Demo cls=".ofx-form .ofx-field">
            <form className="ofx-form std-mini-form" onSubmit={(e) => e.preventDefault()}>
              <label className="ofx-field"><span className="ofx-label">Owner</span><input className="ofx-input" defaultValue="Alex Smith" /></label>
            </form>
          </Demo>
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Status, badges and tabs</h2><span className="hint">the platform vocabulary: NOT_YET, BLOCKED, READY, CLEARED, DELAYED</span></div>
        <div className="panel-bd std-demos">
          <Demo cls=".ofx-pill.ofx-pill-ok"><span className="ofx-pill ofx-pill-ok">READY</span></Demo>
          <Demo cls=".ofx-pill.ofx-pill-warn"><span className="ofx-pill ofx-pill-warn">DELAYED</span></Demo>
          <Demo cls=".ofx-pill.ofx-pill-fail"><span className="ofx-pill ofx-pill-fail">BLOCKED</span></Demo>
          <Demo cls=".ofx-pill.ofx-pill-info"><span className="ofx-pill ofx-pill-info">NOT_YET</span></Demo>
          <Demo cls=".ofx-badge"><span className="ofx-badge">New</span></Demo>
          <Demo cls=".ofx-badge.ofx-badge-outline"><span className="ofx-badge ofx-badge-outline">Rates</span></Demo>
          <Demo cls=".ofx-tabs > .ofx-tab">
            <div className="ofx-tabs" role="tablist" aria-label="Tabs (example)">
              <button type="button" role="tab" aria-selected="true" className="ofx-tab">Overview</button>
              <button type="button" role="tab" aria-selected="false" className="ofx-tab">Analysis</button>
            </div>
          </Demo>
        </div>
      </section>
    </>
  );
}

function Template({ t }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(t.html); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard denied */ }
  };
  return (
    <section className="panel">
      <div className="panel-hd">
        <h2>{t.title}</h2>
        <button type="button" className="btn ghost sm" onClick={copy}><Icon name={copied ? 'check' : 'code'} size={13} /> {copied ? 'Copied' : 'Copy HTML'}</button>
      </div>
      <div className="panel-bd">
        <p className="std-use">{t.use}</p>
        {/* The snippet itself, rendered: what a team copies is exactly what they see. Inert: it is a picture. */}
        <div className="std-preview" inert="" dangerouslySetInnerHTML={{ __html: t.html }} />
        <details className="std-code"><summary>HTML</summary><pre className="gl-snippet">{t.html}</pre></details>
      </div>
    </section>
  );
}

function LayoutTab() {
  const spans = [12, 8, 4, 6, 6, 4, 4, 4, 3, 3, 3, 3];
  return (
    <>
      <section className="panel">
        <div className="panel-hd"><h2>12-column grid</h2><span className="hint">.ofx-grid-12 · .ofx-col-1 … 12 · 6 columns under 1024px, 1 under 640px</span></div>
        <div className="panel-bd">
          <div className="ofx-grid-12">
            {spans.map((n, i) => <div key={i} className={`ofx-col-${n} std-col`}>.ofx-col-{n}</div>)}
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Shell and spacing</h2><span className="hint">the STEPS v3 metrics, as tokens</span></div>
        <div className="panel-bd tight">
          <table className="tbl">
            <thead><tr><th>Token</th><th className="num">Value</th><th>Rule</th></tr></thead>
            <tbody>{SHELL_TOKENS.map(([t, v, rule]) => <tr key={t}><td className="mono">{t}</td><td className="num">{v}</td><td>{rule}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const GRID_ROWS = [
  { id: 'BK-4410', owner: 'Alex Smith', status: 'BLOCKED', amount: 12450000, region: 'EMEA', age: 3 },
  { id: 'BK-4420', owner: 'Sam Lee', status: 'WAITING', amount: 840120, region: 'APAC', age: 1 },
  { id: 'BK-4431', owner: 'Jo Patel', status: 'CLEARED', amount: 2310, region: 'AMER', age: 0 },
  { id: 'BK-4437', owner: 'Ana Ruiz', status: 'WAITING', amount: 61200, region: 'EMEA', age: 2 },
  { id: 'BK-4442', owner: 'Kai Chen', status: 'CLEARED', amount: 991000, region: 'APAC', age: 5 },
];
const GRID_COLUMNS = [
  { binding: 'id', header: 'Break', width: 110 },
  { binding: 'owner', header: 'Owner', width: '*' },
  { binding: 'region', header: 'Region', width: 100 },
  { binding: 'status', header: 'Status', width: 120 },
  { binding: 'amount', header: 'Amount', width: 140, format: 'n0', align: 'right' },
  { binding: 'age', header: 'Age (days)', width: 110, align: 'right' },
];

function GridTab() {
  return (
    <>
      <section className="panel">
        <div className="panel-hd"><h2>The standard grid</h2><span className="hint">Wijmo FlexGrid + onefinux-wijmo.css: 33px rows, 13px cells, 12px / 600 header</span></div>
        <div className="panel-bd tight">
          <DataGrid rows={GRID_ROWS} columns={GRID_COLUMNS} height={240} exportName="standard-grid" title="Breaks (example)" />
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Three ways to use it</h2></div>
        <div className="panel-bd std-ways">
          <div><b>Describe it</b><p className="muted">A GridSpec (JSON: source, columns, lenses) in the grid library. One Finance renders it; nothing to build.</p></div>
          <div><b>Embed it</b><p className="muted"><code className="mono">{'<ofx-grid spec="…">'}</code> from <code className="mono">/lib/onefinux-grid.js</code> in Angular, React, Razor or HTML; or <code className="mono">/widget/grid?ofx-embed=1&amp;spec=…</code> in an iframe.</p></div>
          <div><b>Skin your own</b><p className="muted">Your FlexGrid with <code className="mono">/theme/onefinux-wijmo.css</code> after wijmo.css: the same look in every skin and mode.</p></div>
        </div>
      </section>
    </>
  );
}

function EmbedTab() {
  const origin = window.location.origin;
  const partner = `<!doctype html>
<html data-skin="barclays" data-theme="light">
<head>
  <link rel="stylesheet" href="${origin}/theme/onefinux-tokens.css">
  <link rel="stylesheet" href="${origin}/theme/onefinux-wijmo.css">  <!-- with Wijmo -->
  <!-- data-ofx-hosts: the One Finance origins allowed to frame this page. Framed by one of them with ?ofx-embed=1,
       the SDK sets data-ofx-embedded / data-skin / data-theme, links the host's tokens and follows theme changes. -->
  <script src="${origin}/ofx-interop.js" data-ofx-hosts="${origin}"></script>
</head>
<body class="ofx-app">
  <header class="ofx-header" data-ofx-chrome>…your masthead: hidden when framed…</header>
  <main class="ofx-page">…a page template…</main>
</body>
</html>`;
  return (
    <>
      <section className="panel">
        <div className="panel-hd"><h2>What the host sends</h2><span className="hint">on the iframe URL</span></div>
        <div className="panel-bd tight">
          <table className="tbl"><thead><tr><th>Query</th><th>Example</th><th>Meaning</th></tr></thead>
            <tbody>{EMBED_QUERY.map(([q, ex, m]) => <tr key={q}><td className="mono">{q}</td><td className="mono">{ex}</td><td>{m}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Messages</h2><span className="hint">postMessage to and from the host origin only</span></div>
        <div className="panel-bd tight">
          <table className="tbl"><thead><tr><th>Direction</th><th>Message</th><th>When</th></tr></thead>
            <tbody>{EMBED_MESSAGES.map(([d, msg, w]) => <tr key={msg}><td>{d}</td><td className="mono">{msg}</td><td>{w}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-hd"><h2>Any stack in three lines</h2><span className="hint">Angular, .NET Razor, Java templates or plain HTML</span></div>
        <div className="panel-bd"><pre className="gl-snippet">{partner}</pre></div>
      </section>
    </>
  );
}

function ChecklistTab() {
  return (
    <section className="panel">
      <div className="panel-hd"><h2>Before your screen joins One Finance</h2><span className="hint">review against this list</span></div>
      <div className="panel-bd">
        <ol className="std-check">{CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ol>
      </div>
    </section>
  );
}

export default function Standards() {
  const { themeId, setTheme } = useApp();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'palette');
  const pick = (id) => {
    setTab(id);
    const u = new URL(window.location.href);
    u.searchParams.set('tab', id);
    window.history.replaceState(null, '', u.pathname + u.search);
  };
  return (
    <div className="std">
      <PageHeader icon="palette" title="Design standard"
        info="One look for every screen in One Finance, STEPS, MITR AI and partner apps: Barclays brand colours on the STEPS v3 structure. Everything here is read from frontend/theme/onefinux-tokens.css, which framed apps link from this host.">
        <div className="seg" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={t.id === themeId ? 'on' : ''} aria-pressed={t.id === themeId} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>
        <a className="btn ghost" href="/theme/onefinux-tokens.css" target="_blank" rel="noreferrer"><Icon name="download" size={13} /> tokens.css</a>
      </PageHeader>
      <div className="tabs-bar" role="tablist" aria-label="Design standard">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={'tab' + (t.id === tab ? ' on' : '')} onClick={() => pick(t.id)}>
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === 'palette' && <PaletteTab themeId={themeId} />}
        {tab === 'type' && <TypeTab />}
        {tab === 'controls' && <ControlsTab />}
        {tab === 'pages' && TEMPLATES.map((t) => <Template key={t.id} t={t} />)}
        {tab === 'layout' && <LayoutTab />}
        {tab === 'grid' && <GridTab />}
        {tab === 'embed' && <EmbedTab />}
        {tab === 'checklist' && <ChecklistTab />}
      </div>
    </div>
  );
}
