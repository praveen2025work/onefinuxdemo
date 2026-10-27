import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import Select from '../components/Select.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { BUILTIN_SPECS } from '../grid/specs.js';
import { encodeJson, normalizeSpec, paramContext } from '../grid/spec.js';
import { proposeSpec } from '../grid/propose.js';
import { loadMySpecs, loadOutcomeSpecs, loadUnitSpecs, saveMySpecs, saveUnitSpecs } from '../grid/useGridSpec.js';
import { subscribeLive } from '../live/liveLink.js';
import { loadRemote, newer, remoteSaver } from '../ux/prefs.js';
import { uxApi } from '../api.js';
import { trackUse } from '../ux/track.js';

const SNIPPETS = [
  { id: 'iframe', label: 'Embed (iframe)', hint: 'Any app: themed, live, picks posted to your page as ofx.grid.select' },
  { id: 'element', label: 'Web component', hint: 'Angular, React, .NET Razor or plain HTML: <ofx-grid>' },
  { id: 'react', label: 'In One Finance', hint: 'A console screen or widget' },
];

const SCOPE_PARAMS = [
  { name: 'groupUnit', from: 'groupUnit' },
  { name: 'cobDate', from: 'cobDate' },
  { name: 'region', from: 'region' },
];

function snippet(kind, spec, ref, origin) {
  const specAttr = ref || JSON.stringify(spec).replace(/'/g, '&#39;');
  if (kind === 'iframe') {
    const q = ref ? `spec=${encodeURIComponent(ref)}` : `def=${encodeJson(spec)}`;
    return `<iframe src="${origin}/widget/grid?ofx-embed=1&theme=light&${q}"\n        title="${spec.title}" style="width:100%;height:480px;border:0"></iframe>`;
  }
  if (kind === 'element') {
    return [
      `<link rel="stylesheet" href="${origin}/lib/onefinux-grid.css">`,
      `<script src="${origin}/lib/onefinux-grid.js"></script>`,
      '',
      `<ofx-grid base="${origin}" spec='${specAttr}'`,
      `          context='{"groupUnit":"REV-ACC","cobDate":"2026-09-12"}'></ofx-grid>`,
      '<script>',
      "  document.querySelector('ofx-grid').addEventListener('ofx-select', (e) => console.log(e.detail.row, e.detail.context));",
      '</script>',
    ].join('\n');
  }
  return [
    "import SpecGrid from '../grid/SpecGrid.jsx';",
    ref ? "import { builtinSpec } from '../grid/specs.js';" : `const spec = ${JSON.stringify(spec, null, 2)};`,
    "import { paramContext } from '../grid/spec.js';",
    "import { subscribeLive } from '../live/liveLink.js';",
    "import { broadcastContext } from '../workspace/interop.js';",
    '',
    `<SpecGrid spec={${ref ? `builtinSpec('${ref}')` : 'spec'}} context={paramContext(filters)} subscribe={subscribeLive}`,
    '  onShare={(ctx) => broadcastContext(ctx)} />',
  ].join('\n');
}

/** Spec id used when adding a unit template to a desk / embed. */
function unitRef(spec) {
  return spec?.templateId ? `unit:${spec.templateId}` : `unit:${spec?.id}`;
}

/**
 * Grid library: Platform · My unit · Mine. Pick a GridSpec, edit JSON, preview, save, share with the unit,
 * propose one from a bound source, put it on a desk, or copy the embed snippet.
 */
export default function GridLibrary() {
  const { filters } = useApp();
  const navigate = useNavigate();
  const [outcomeSpecs, setOutcomeSpecs] = useState([]);
  const [mine, setMine] = useState(loadMySpecs);
  const [unit, setUnit] = useState(loadUnitSpecs);
  const [selected, setSelected] = useState({ group: 'platform', id: 'instances' });
  const [draft, setDraft] = useState(() => JSON.stringify(BUILTIN_SPECS[0], null, 2));
  const [preview, setPreview] = useState(BUILTIN_SPECS[0]);
  const [kind, setKind] = useState('iframe');
  const [copied, setCopied] = useState(null);
  const [msg, setMsg] = useState(null);
  const [proposeOpen, setProposeOpen] = useState(false);

  const [params] = useSearchParams();
  const saveRemote = useMemo(() => remoteSaver('grids'), []);
  useEffect(() => { loadOutcomeSpecs().then(setOutcomeSpecs); }, []);

  useEffect(() => {
    loadRemote('grids').then((remote) => {
      const local = { savedAt: Number(localStorage.getItem('ofx-my-grids-at')) || 0, state: loadMySpecs() };
      if (remote && Array.isArray(remote.state) && newer(local, remote) === 'remote') { setMine(remote.state); saveMySpecs(remote.state); }
    });
  }, []);

  // Unit catalogue from the hub (entitled group unit only).
  useEffect(() => {
    const team = filters.groupUnit;
    if (!team) { setUnit([]); saveUnitSpecs([]); return undefined; }
    let alive = true;
    uxApi.gridCatalogue(team).then((res) => {
      if (!alive) return;
      const specs = (res?.unit || []).map((t) => {
        const json = t.json && typeof t.json === 'object' ? t.json : {};
        return { ...json, id: json.id || t.id, title: json.title || t.name, templateId: t.id, origin: 'unit' };
      }).filter((s) => s.id);
      setUnit(specs);
      saveUnitSpecs(specs);
    }).catch(() => { if (alive) setUnit(loadUnitSpecs()); });
    return () => { alive = false; };
  }, [filters.groupUnit]);

  useEffect(() => {
    const want = params.get('spec');
    if (!want) return;
    const platform = [...BUILTIN_SPECS, ...outcomeSpecs];
    const found = platform.find((x) => x.id === want)
      || unit.find((x) => x.id === want || unitRef(x) === want || `unit:${x.templateId}` === want)
      || mine.find((x) => x.id === want || `my:${x.id}` === want);
    if (found) {
      const group = BUILTIN_SPECS.includes(found) || outcomeSpecs.includes(found) ? 'platform'
        : unit.includes(found) ? 'unit' : 'my';
      choose(group, found);
    }
  }, [params, outcomeSpecs.length, unit.length, mine.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function persistMine(next) {
    setMine(next);
    saveMySpecs(next);
    try { localStorage.setItem('ofx-my-grids-at', String(Date.now())); } catch { /* private window */ }
    saveRemote(next);
  }

  const platformSpecs = useMemo(() => [...BUILTIN_SPECS, ...outcomeSpecs], [outcomeSpecs]);
  const groups = [
    { id: 'platform', label: 'Platform', hint: 'built-in and outcome grids', specs: platformSpecs },
    { id: 'unit', label: 'My unit', hint: filters.groupUnit ? `shared with ${filters.groupUnit}` : 'pick a group unit', specs: unit },
    { id: 'my', label: 'Mine', hint: 'saved for you on every browser', specs: mine },
  ];
  const current = groups.find((g) => g.id === selected.group)?.specs.find((s) => s.id === selected.id) || null;

  function choose(group, spec) {
    setSelected({ group, id: spec.id });
    setDraft(JSON.stringify(spec, null, 2));
    setPreview(spec);
    setMsg(null);
  }

  const parsed = useMemo(() => {
    try { return { obj: JSON.parse(draft) }; } catch (e) { return { error: e.message }; }
  }, [draft]);
  const check = parsed.obj ? normalizeSpec(parsed.obj) : { spec: null, errors: draft ? [`Not valid JSON: ${parsed.error}`] : [] };
  const edited = Boolean(current) && draft !== JSON.stringify(current, null, 2);
  const ref = !edited && current
    ? (selected.group === 'platform' ? current.id
      : selected.group === 'unit' ? unitRef(current)
        : `my:${current.id}`)
    : null;
  const shown = preview || current;

  function save() {
    if (!check.spec) return;
    const spec = parsed.obj;
    const next = [...mine.filter((s) => s.id !== spec.id), spec];
    persistMine(next);
    setSelected({ group: 'my', id: spec.id });
    setMsg({ cls: 'ok', text: `Saved “${spec.title || spec.id}” under Mine.` });
    trackUse('grid.save');
  }

  async function shareWithUnit() {
    if (!check.spec || !filters.groupUnit) return;
    const spec = parsed.obj;
    try {
      const res = await uxApi.shareTemplate({
        team: filters.groupUnit, kind: 'grid', name: spec.title || spec.id, json: spec,
      });
      trackUse('grid.share');
      const shared = { ...spec, templateId: res.id, origin: 'unit' };
      const next = [...unit.filter((s) => s.id !== spec.id), shared];
      setUnit(next);
      saveUnitSpecs(next);
      setSelected({ group: 'unit', id: spec.id });
      setMsg({ cls: 'ok', text: `Shared with ${filters.groupUnit}. Teammates see it under My unit.` });
    } catch (e) {
      setMsg({ cls: 'fail', text: e.message || 'Share failed' });
    }
  }

  function remove() {
    const next = mine.filter((s) => s.id !== selected.id);
    persistMine(next);
    choose('platform', BUILTIN_SPECS[0]);
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(kind); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  }

  function addToDesk() {
    if (ref) { navigate(`/desks?grid=${encodeURIComponent(ref)}`); return; }
    if (!check.spec) return;
    save();
    navigate(`/desks?grid=${encodeURIComponent('my:' + parsed.obj.id)}`);
  }

  function applyProposal(spec) {
    setProposeOpen(false);
    setSelected({ group: 'none', id: '' });
    setDraft(JSON.stringify(spec, null, 2));
    setPreview(spec);
    setMsg({ cls: 'ok', text: 'Proposed from the sample. Preview, then Save as my grid or Share with unit.' });
    trackUse('grid.propose');
  }

  return (
    <>
      <PageHeader icon="grid" title="Grid library" context="Platform · My unit · Mine · one GridSpec for every team"
        infoTitle="One grid, configured" infoWidth={400}
        info={<>
          Every read-only grid here is a <b>GridSpec</b>: JSON for the source, columns, lenses, live refresh and what a
          row pick shares. <b>Platform</b> is what One Finance ships; <b>My unit</b> is shared with the group unit;
          <b> Mine</b> follows you via /api/prefs/grids. Propose one from a bound source (sample stays in the browser),
          put it on a desk, or embed it as an iframe / <span className="mono">&lt;ofx-grid&gt;</span>.
        </>}
        summary={`${BUILTIN_SPECS.length} platform · ${outcomeSpecs.length} outcomes · ${unit.length} unit · ${mine.length} mine`}>
        <button className="btn ghost" onClick={() => setProposeOpen(true)}>
          <Icon name="spark" size={15} /> Propose from source
        </button>
        <button className="btn ghost" onClick={() => { setSelected({ group: 'none', id: '' }); setDraft(JSON.stringify(BUILTIN_SPECS.find((s) => s.id === 'sample-breaks'), null, 2).replace('"sample-breaks"', '"my-grid"')); setPreview(null); }}>
          <Icon name="plus" size={15} /> New grid
        </button>
      </PageHeader>

      {msg && <div className={'banner ' + (msg.cls || '')} role="status">{msg.text}</div>}

      <div className="gl">
        <aside className="panel gl-list">
          {groups.map((g) => (
            <div key={g.id} className="gl-sec">
              <div className="menu-lbl">{g.label} <span className="muted">· {g.hint}</span></div>
              {g.specs.length === 0 && <div className="sec gl-none">None yet.</div>}
              {g.specs.map((s) => (
                <button key={`${g.id}-${s.templateId || s.id}`} type="button" className={'gl-item' + (selected.group === g.id && selected.id === s.id ? ' on' : '')}
                  onClick={() => choose(g.id, s)} title={s.description || s.id}>
                  <b>{s.title || s.id}</b>
                  <span className="mono">{g.id === 'my' ? `my:${s.id}` : g.id === 'unit' ? unitRef(s) : s.id}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="gl-main">
          <div className="panel">
            <div className="panel-hd"><h2>{shown?.title || 'Preview'}</h2><span className="hint">{shown?.description || 'live preview'}</span></div>
            <div className="panel-bd">
              {shown
                ? <SpecGrid key={JSON.stringify(shown).length + (shown.id || '')} spec={shown} context={paramContext(filters)} subscribe={subscribeLive} height={340} />
                : <div className="empty sm">Apply a spec to preview it.</div>}
            </div>
          </div>

          <div className="gl-edit">
            <div className="panel">
              <div className="panel-hd"><h2>Spec</h2><span className="hint">JSON · see the info icon for the fields</span></div>
              <div className="panel-bd stack">
                <textarea className="inp mono gl-json" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
                  aria-label="Grid spec JSON" />
                {check.errors.length > 0 && (
                  <ul className="gl-errors">{check.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                )}
                <div className="row wrapflex">
                  <button className="btn" disabled={!check.spec} onClick={() => setPreview(parsed.obj)}><Icon name="play" size={14} /> Preview</button>
                  <button className="btn ghost" disabled={!check.spec} onClick={save}><Icon name="save" size={14} /> Save as my grid</button>
                  <button className="btn ghost" disabled={!check.spec || !filters.groupUnit} onClick={shareWithUnit}
                    title={filters.groupUnit ? `Share with ${filters.groupUnit}` : 'Pick a group unit first'}>
                    <Icon name="share" size={14} /> Share with unit
                  </button>
                  <button className="btn ghost" disabled={!ref && !check.spec} onClick={addToDesk}>
                    <Icon name="window" size={14} /> Add to current desk
                  </button>
                  {selected.group === 'my' && <button className="btn ghost" onClick={remove}><Icon name="trash" size={14} /> Delete</button>}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-hd"><h2>Use it elsewhere</h2><span className="hint">{SNIPPETS.find((s) => s.id === kind)?.hint}</span></div>
              <div className="panel-bd stack">
                <div className="seg sm">
                  {SNIPPETS.map((s) => <button key={s.id} className={kind === s.id ? 'on' : ''} onClick={() => setKind(s.id)}>{s.label}</button>)}
                </div>
                {check.spec
                  ? <pre className="gl-snippet">{snippet(kind, parsed.obj, ref, window.location.origin)}</pre>
                  : <div className="empty sm">Fix the spec to get a snippet.</div>}
                <div className="row">
                  <button className="btn ghost sm" disabled={!check.spec} onClick={() => copy(snippet(kind, parsed.obj, ref, window.location.origin))}>
                    <Icon name="checks" size={13} /> {copied === kind ? 'Copied' : 'Copy'}
                  </button>
                  {kind === 'element' && <span className="sec">The bundle is built with the console (<span className="mono">/lib/onefinux-grid.js</span>).</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {proposeOpen && <ProposeModal filters={filters} onClose={() => setProposeOpen(false)} onApply={applyProposal} />}
    </>
  );
}

/** Bind a source, paste sample rows, infer columns / pivot / chart, confirm into the editor. */
function ProposeModal({ filters, onClose, onApply }) {
  const [id, setId] = useState('my-source-grid');
  const [title, setTitle] = useState('My source grid');
  const [endpoint, setEndpoint] = useState('/api/stitch/instances');
  const [sample, setSample] = useState('[\n  {"sliceKey":"MB014","region":"EMEA","status":"READY","amount":1200}\n]');
  const [bindScope, setBindScope] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const endpoints = [
    { value: '/api/stitch/instances', label: 'Stitch instances' },
    { value: '/api/outcomes', label: 'Engine outcomes' },
    { value: '/api/notifications', label: 'Notifications' },
    { value: '/api/activity', label: 'Activity' },
    { value: '/api/stitch/monitor/events', label: 'Event tape' },
  ];

  async function fetchSample() {
    setBusy(true); setError(null);
    try {
      const ctx = paramContext(filters);
      const q = new URLSearchParams();
      if (bindScope) {
        if (ctx.groupUnit) q.set('groupUnit', ctx.groupUnit);
        if (ctx.cobDate) q.set('cobDate', ctx.cobDate);
        if (ctx.region) q.set('region', ctx.region);
      }
      const url = endpoint + (q.toString() ? `?${q}` : '');
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const body = await res.json();
      const rows = Array.isArray(body) ? body : (body.rows || body.items || body.data || []);
      setSample(JSON.stringify((rows || []).slice(0, 25), null, 2));
    } catch (e) {
      setError(e.message || 'Fetch failed');
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    let rows;
    try { rows = JSON.parse(sample); } catch (e) { setError(`Sample JSON: ${e.message}`); return; }
    if (!Array.isArray(rows)) { setError('Sample must be a JSON array of row objects'); return; }
    const { spec, errors } = proposeSpec({
      id, title, endpoint,
      params: bindScope ? SCOPE_PARAMS : [],
      rows,
      live: endpoint.includes('notification') ? ['notification']
        : endpoint.includes('activity') ? ['activity']
          : endpoint.includes('outcome') ? ['outcome']
            : ['outcome', 'kit', 'reset'],
    });
    if (!spec) { setError(errors.join('; ')); return; }
    onApply(spec);
  }

  return (
    <Modal title="Propose a GridSpec" subtitle="Sample rows stay in this browser — nothing is posted to the hub"
      onClose={onClose} width={560}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={confirm}><Icon name="spark" size={14} /> Propose</button>
      </>}>
      <div className="stack">
        <div className="field"><label>Id</label>
          <input className="inp mono" value={id} onChange={(e) => setId(e.target.value)} /></div>
        <div className="field"><label>Title</label>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="field"><label>Source endpoint</label>
          <Select value={endpoint} onChange={setEndpoint} options={endpoints} /></div>
        <div className="field"><label>Or type a path</label>
          <input className="inp mono" value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
            placeholder="/api/…" /></div>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={bindScope} onChange={(e) => setBindScope(e.target.checked)} />
          Bind group unit, COB date and region
        </label>
        <div className="row">
          <button className="btn ghost sm" disabled={busy || !endpoint} onClick={fetchSample}>
            <Icon name="refresh" size={13} className={busy ? 'spin-ic' : ''} /> {busy ? 'Fetching…' : 'Fetch sample'}
          </button>
          <span className="sec">or paste rows below</span>
        </div>
        <div className="field"><label>Sample rows (JSON array)</label>
          <textarea className="inp mono gl-json" style={{ minHeight: 160 }} value={sample}
            onChange={(e) => setSample(e.target.value)} spellCheck={false} /></div>
        {error && <div className="banner fail" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}
