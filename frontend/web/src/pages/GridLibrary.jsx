import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { BUILTIN_SPECS } from '../grid/specs.js';
import { encodeJson, normalizeSpec, paramContext } from '../grid/spec.js';
import { loadMySpecs, loadOutcomeSpecs, saveMySpecs } from '../grid/useGridSpec.js';
import { subscribeLive } from '../live/liveLink.js';

const SNIPPETS = [
  { id: 'iframe', label: 'Embed (iframe)', hint: 'Any app: themed, live, picks posted to your page as ofx.grid.select' },
  { id: 'element', label: 'Web component', hint: 'Angular, React, .NET Razor or plain HTML: <ofx-grid>' },
  { id: 'react', label: 'In One Finance', hint: 'A console screen or widget' },
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

/**
 * Grid library: every read-only grid One Finance can show, as config. Pick one, change its JSON (columns, types,
 * filter, lenses, live refresh, what a pick shares), preview it live, save it as yours, put it on a desk, or copy the
 * snippet another team needs to embed it — an iframe, or the <ofx-grid> web component.
 */
export default function GridLibrary() {
  const { filters } = useApp();
  const navigate = useNavigate();
  const [outcomeSpecs, setOutcomeSpecs] = useState([]);
  const [mine, setMine] = useState(loadMySpecs);
  const [selected, setSelected] = useState({ group: 'builtin', id: 'instances' });
  const [draft, setDraft] = useState(() => JSON.stringify(BUILTIN_SPECS[0], null, 2));
  const [preview, setPreview] = useState(BUILTIN_SPECS[0]);
  const [kind, setKind] = useState('iframe');
  const [copied, setCopied] = useState(null);

  useEffect(() => { loadOutcomeSpecs().then(setOutcomeSpecs); }, []);

  const groups = [
    { id: 'builtin', label: 'Built-in', hint: 'data One Finance serves', specs: BUILTIN_SPECS },
    { id: 'outcome', label: 'From outcomes', hint: 'each outcome definition’s grids', specs: outcomeSpecs },
    { id: 'my', label: 'My grids', hint: 'saved in this browser', specs: mine },
  ];
  const current = groups.find((g) => g.id === selected.group)?.specs.find((s) => s.id === selected.id) || null;

  /** Picking a grid (even the one already picked) loads it into the editor and the preview. */
  function choose(group, spec) {
    setSelected({ group, id: spec.id });
    setDraft(JSON.stringify(spec, null, 2));
    setPreview(spec);
  }

  const parsed = useMemo(() => {
    try { return { obj: JSON.parse(draft) }; } catch (e) { return { error: e.message }; }
  }, [draft]);
  const check = parsed.obj ? normalizeSpec(parsed.obj) : { spec: null, errors: draft ? [`Not valid JSON: ${parsed.error}`] : [] };
  const edited = Boolean(current) && draft !== JSON.stringify(current, null, 2);
  // An unchanged built-in or outcome grid is referenced by id; anything else travels as the spec itself.
  const ref = !edited && current && selected.group !== 'my' ? current.id : null;
  const shown = preview || current;

  function save() {
    if (!check.spec) return;
    const spec = parsed.obj;
    const next = [...mine.filter((s) => s.id !== spec.id), spec];
    setMine(next);
    saveMySpecs(next);
    setSelected({ group: 'my', id: spec.id });
  }

  function remove() {
    const next = mine.filter((s) => s.id !== selected.id);
    setMine(next);
    saveMySpecs(next);
    choose('builtin', BUILTIN_SPECS[0]);
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(kind); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  }

  // Put it on a desk: built-in / outcome grids by id; an edited spec is saved as yours first and referenced as my:<id>.
  function addToDesk() {
    if (ref) { navigate(`/desks?grid=${encodeURIComponent(ref)}`); return; }
    if (!check.spec) return;
    save();
    navigate(`/desks?grid=${encodeURIComponent('my:' + parsed.obj.id)}`);
  }

  return (
    <>
      <PageHeader icon="grid" title="Grid library" context="Read-only data as config · one grid for every team"
        infoTitle="One grid, configured" infoWidth={380}
        info={<>
          Every read-only grid here is a <b>GridSpec</b>: JSON that says where rows come from (an endpoint with params bound to
          the business date, group unit and region, or inline rows), the columns and their types, the filter, which lenses
          (grid, pivot, chart) to offer, which hub pushes refresh it live, and what a row pick shares with linked screens.
          Edit one, preview it, save it as yours, put it on a desk — or embed it in another app as an iframe or the
          <span className="mono"> &lt;ofx-grid&gt;</span> web component.
        </>}
        summary={`${BUILTIN_SPECS.length} built-in · ${outcomeSpecs.length} from outcomes · ${mine.length} yours`}>
        <button className="btn ghost" onClick={() => { setSelected({ group: 'none', id: '' }); setDraft(JSON.stringify(BUILTIN_SPECS.find((s) => s.id === 'sample-breaks'), null, 2).replace('"sample-breaks"', '"my-grid"')); setPreview(null); }}>
          <Icon name="plus" size={15} /> New grid
        </button>
      </PageHeader>

      <div className="gl">
        <aside className="panel gl-list">
          {groups.map((g) => (
            <div key={g.id} className="gl-sec">
              <div className="menu-lbl">{g.label} <span className="muted">· {g.hint}</span></div>
              {g.specs.length === 0 && <div className="sec gl-none">None yet.</div>}
              {g.specs.map((s) => (
                <button key={s.id} type="button" className={'gl-item' + (selected.group === g.id && selected.id === s.id ? ' on' : '')}
                  onClick={() => choose(g.id, s)} title={s.description || s.id}>
                  <b>{s.title || s.id}</b>
                  <span className="mono">{g.id === 'my' ? `my:${s.id}` : s.id}</span>
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
    </>
  );
}
