import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading, PageTitle } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';

function slaText(sla) {
  if (!sla) return '—';
  if (sla.withinMinutes) return `within ${sla.withinMinutes} min of first event`;
  if (sla.cutoff) return `${sla.cutoff}${sla.dayOffset ? ` (COB+${sla.dayOffset})` : ''}`;
  return '—';
}

const RANK = { COMPLETED: 6, READY: 5, ACTION_RUNNING: 4, IN_PROGRESS: 3, BLOCKED: 2, NOT_STARTED: 1 };
function repStatus(views) {
  if (!views.length) return 'NOT_STARTED';
  return views.reduce((best, v) => (RANK[v.status] || 0) > (RANK[best] || 0) ? v.status : best, views[0].status);
}

export default function Configuration() {
  const { filters, context } = useApp();
  const [kits, setKits] = useState(null);
  const [groupUnits, setGroupUnits] = useState([]);
  const [defs, setDefs] = useState([]);
  const [defsReady, setDefsReady] = useState(false);
  const [views, setViews] = useState([]);
  const [sel, setSel] = useState(null); // { type: 'outcome' | 'kit', id }
  const [kitDetail, setKitDetail] = useState(null);
  const [loadingKit, setLoadingKit] = useState(false);

  const loadCatalog = useCallback(async () => {
    const [k, gu] = await Promise.all([api.kits(), api.groupUnits().catch(() => [])]);
    setKits(k);
    setGroupUnits(gu);
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const loadOutcomes = useCallback(async () => {
    const [d, v] = await Promise.all([
      outcomesApi.definitions().catch(() => []),
      outcomesApi.all().catch(() => []),
    ]);
    setDefs(d);
    setViews(v);
    setDefsReady(true);
  }, []);
  useEffect(() => { loadOutcomes(); }, [loadOutcomes]);

  // Default selection once both catalogs land: first outcome (grids live there), else first kit.
  useEffect(() => {
    if (sel) return;
    if (!kits || !defsReady) return;
    if (defs.length) setSel({ type: 'outcome', id: defs[0].id });
    else if (kits.length) setSel({ type: 'kit', id: kits[0].kitId });
  }, [defs, kits, sel, defsReady]);

  // Load kit binding only when a kit is selected.
  useEffect(() => {
    if (!sel || sel.type !== 'kit') { setKitDetail(null); return; }
    let alive = true;
    setLoadingKit(true);
    api.kit(sel.id).then((d) => { if (alive) setKitDetail(d); }).finally(() => { if (alive) setLoadingKit(false); });
    return () => { alive = false; };
  }, [sel]);

  const viewsByOutcome = useMemo(() => {
    const m = {};
    for (const v of views) (m[v.outcomeId] = m[v.outcomeId] || []).push(v);
    return m;
  }, [views]);

  if (!kits) return <Loading what="Loading configuration…" />;

  const gu = groupUnits.find((g) => g.groupUnitId === filters.groupUnit);
  const selOutcome = sel && sel.type === 'outcome' ? defs.find((o) => o.id === sel.id) : null;
  const kit = kitDetail?.kit;
  const embed = kitDetail?.embed && Object.keys(kitDetail.embed).length ? kitDetail.embed : null;
  const refresh = () => { loadCatalog(); loadOutcomes(); if (sel?.type === 'kit') api.kit(sel.id).then(setKitDetail); };

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Configuration · live registry</div>
          <PageTitle icon="config">Configuration
            <InfoHint title="Configuration governs; Onboarding creates" width={360}>Pick a business outcome (or a console kit) on the left to inspect its full anatomy on the right — question, entitlement, SLA, input feeds and on-ready contract. To <b>create</b> a new outcome, use <b>Onboarding</b>.</InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/onboarding"><Icon name="build" size={15} /> Onboard new</Link>
          <button className="btn ghost" onClick={refresh}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
      </div>

      <div className="cfg-steps">
        <span className="cfg-step"><span className="n">1</span> Pick an outcome or kit</span>
        <Icon name="chevron" size={14} className="flip" />
        <span className="cfg-step"><span className="n">2</span> Inspect its configuration &amp; live state</span>
        <Icon name="chevron" size={14} className="flip" />
        <span className="cfg-step muted"><span className="n">+</span> Need a new one? <Link to="/onboarding">Onboard</Link></span>
      </div>

      <div className="cfg-flow">
        {/* ---- master rail ---- */}
        <aside className="cfg-rail">
          <section className="panel">
            <div className="panel-hd"><h2>Business outcomes</h2><span className="hint">{defs.length}</span></div>
            <div className="panel-bd">
              <div className="cfg-list">
                {defs.map((o) => {
                  const on = sel?.type === 'outcome' && sel.id === o.id;
                  return (
                    <button key={o.id} className={'cfg-item' + (on ? ' on' : '')} onClick={() => setSel({ type: 'outcome', id: o.id })}>
                      <span className="ci-main">
                        <span className="ci-name">{o.name}</span>
                        <span className="mono sec">{o.id}</span>
                      </span>
                      <StatusPill status={repStatus(viewsByOutcome[o.id] || [])} />
                    </button>
                  );
                })}
                {defs.length === 0 && <div className="empty sm">None yet. <Link to="/onboarding">Onboard one →</Link></div>}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-hd"><h2>Console kits <InfoHint title="Kit bindings" width={300}>Separate from the outcome fold: these bind a console kit to its sources, destinations and embedded partner view (how the FOBO console renders).</InfoHint></h2><span className="hint">{kits.length}</span></div>
            <div className="panel-bd">
              <div className="cfg-list">
                {kits.map((k) => {
                  const on = sel?.type === 'kit' && sel.id === k.kitId;
                  return (
                    <button key={k.kitId} className={'cfg-item' + (on ? ' on' : '')} onClick={() => setSel({ type: 'kit', id: k.kitId })}>
                      <span className="ci-main">
                        <span className="ci-name">{k.kitId}</span>
                        <span className="mono sec">{k.renderer}</span>
                      </span>
                      <StatusPill status={k.status === 'LIVE' ? 'READY' : k.status} />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-hd"><h2>Group unit</h2><span className="hint">scope</span></div>
            <div className="panel-bd stack">
              <div className="kv"><span className="k">Group unit</span><span className="v mono">{filters.groupUnit}</span></div>
              <div className="kv"><span className="k">Name</span><span className="v">{gu?.name || '—'}</span></div>
              <div className="kv"><span className="k">Regions</span><span className="v">{(context?.regions || []).join(', ') || '—'}</span></div>
              <div className="kv"><span className="k">COB dates</span><span className="v mono">{(context?.cobDates || []).length}</span></div>
            </div>
          </section>
        </aside>

        {/* ---- detail pane ---- */}
        <section className="panel cfg-detail">
          {selOutcome ? <OutcomeDetail o={selOutcome} live={viewsByOutcome[selOutcome.id] || []} />
            : sel?.type === 'kit' ? <KitDetail loading={loadingKit} kit={kit} detail={kitDetail} embed={embed} />
              : <div className="panel-bd"><div className="empty">Select an outcome or kit to inspect.</div></div>}
        </section>
      </div>
    </>
  );
}

function OutcomeDetail({ o, live }) {
  const total = (o.dependencies || []).reduce((n, d) => n + (d.expectedCount || 0), 0);
  const command = o.onReady && o.onReady.action;
  return (
    <>
      <div className="panel-hd">
        <h2>Business outcome</h2>
        <span className="hint">outcome_definition</span>
      </div>
      <div className="panel-bd">
        <div className="det-head">
          <div>
            <span className="mono lead">{o.id}</span>
            <h3 className="det-name">{o.name}</h3>
            <p className="q">{o.question}</p>
          </div>
          <div className="odef-tags">
            <span className="chip">{o.ownerGroup}</span>
            {(o.regions || []).map((r) => <span key={r} className="chip">{r}</span>)}
          </div>
        </div>

        <div className="cfg-sub">Live now <span className="muted">(instances for the selected scope/COB)</span></div>
        <div className="det-live">
          {live.length === 0 && <span className="muted">No instance for this COB yet — post its feeds from the Drive screen to fold it.</span>}
          {live.map((v) => (
            <span key={v.key} className="det-inst"><StatusPill status={v.status} /> <span className="mono-sm">{v.region} · {v.completed}/{v.expected}{v.stage ? ` · ${v.stage}` : ''}</span></span>
          ))}
        </div>

        <div className="cfg-sub" style={{ marginTop: 14 }}>Contract</div>
        <div className="odef-meta">
          <div className="kv"><span className="k">Entitlement</span><span className="v">{(o.regions || []).join(', ') || 'GLOBAL'}</span></div>
          <div className="kv"><span className="k">SLA</span><span className="v">{slaText(o.sla)}</span></div>
          <div className="kv"><span className="k">On ready</span><span className="v">{command ? <span className="chip ok-chip">Command · {o.onReady.target}</span> : <span className="chip">Notify only</span>}</span></div>
          {command && <div className="kv"><span className="k">Action</span><span className="v">{o.onReady.actionLabel || o.onReady.action}</span></div>}
          {command && <div className="kv"><span className="k">Completion event</span><span className="v mono">{o.onReady.completionEvent}</span></div>}
          <div className="kv"><span className="k">Inputs</span><span className="v">{(o.dependencies || []).length} feeds · {total} keys expected</span></div>
        </div>

        <div className="cfg-sub" style={{ marginTop: 14 }}>Input feeds <span className="muted">(dependencies that must complete before ready)</span></div>
        <table className="tbl">
          <thead><tr><th>Feed</th><th>Event type</th><th>Source system</th><th className="num">Expected keys</th></tr></thead>
          <tbody>
            {(o.dependencies || []).map((d) => (
              <tr key={d.eventType}>
                <td className="lead">{d.label}</td>
                <td className="mono">{d.eventType}</td>
                <td><span className="chip">{d.sourceSystem || 'any'}</span></td>
                <td className="num mono">{d.expectedCount}</td>
              </tr>
            ))}
            {(o.dependencies || []).length === 0 && <tr><td colSpan={4} className="empty">No feeds declared.</td></tr>}
          </tbody>
        </table>

        <div className="cfg-sub" style={{ marginTop: 14 }}>Grids <span className="muted">(console fetches these endpoints; hub does not proxy)</span></div>
        <table className="tbl">
          <thead><tr><th>Grid</th><th>Endpoint</th><th>Method</th><th>Parameters</th></tr></thead>
          <tbody>
            {(o.grids || []).map((g) => (
              <tr key={g.id}>
                <td className="lead">{g.title || g.id}<div className="sec mono">{g.id}</div></td>
                <td className="mono">{g.endpoint}</td>
                <td><span className="chip">{g.method || 'GET'}</span></td>
                <td className="sec">{(g.params || []).map((p) => p.name + (p.from ? '←' + p.from : (p.value != null ? '=' + p.value : ''))).join(' · ') || '—'}</td>
              </tr>
            ))}
            {(o.grids || []).length === 0 && <tr><td colSpan={4} className="empty">No grids on this outcome. Workspaces stays empty for this id.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KitDetail({ loading, kit, detail, embed }) {
  if (loading) return <div className="panel-bd"><Loading what="Loading kit binding…" /></div>;
  if (!kit) return <div className="panel-bd"><div className="empty">Select a kit to inspect its binding.</div></div>;
  return (
    <>
      <div className="panel-hd">
        <h2>Console kit · {kit.kitId}</h2>
        <span className="hint">product_kit · kit_source · kit_destination</span>
      </div>
      <div className="panel-bd">
        <div className="cfg-meta">
          <div className="kv"><span className="k">Question</span><span className="v">{kit.question}</span></div>
          <div className="kv"><span className="k">Renderer</span><span className="v"><span className="chip">{kit.renderer}</span></span></div>
          <div className="kv"><span className="k">User actions</span><span className="v mono">{kit.userActions}</span></div>
          <div className="kv"><span className="k">Domain</span><span className="v">{kit.domain}</span></div>
          <div className="kv"><span className="k">CEES product</span><span className="v mono">{kit.ceesProduct}</span></div>
          <div className="kv"><span className="k">SLA cutoff</span><span className="v mono">{kit.slaCutoff || '—'}</span></div>
          <div className="kv"><span className="k">Status</span><span className="v"><StatusPill status={kit.status === 'LIVE' ? 'READY' : kit.status} /></span></div>
          <div className="kv"><span className="k">Version</span><span className="v mono">v{kit.version}</span></div>
        </div>

        <div className="split" style={{ marginTop: 6 }}>
          <div>
            <div className="cfg-sub">Sources <span className="muted">({(detail.sources || []).length})</span></div>
            <table className="tbl">
              <thead><tr><th>Source</th><th>Ingest</th><th>Required</th></tr></thead>
              <tbody>
                {(detail.sources || []).map((s) => (
                  <tr key={s.sourceId}>
                    <td className="mono lead">{s.sourceId}<div className="sec">{s.displayName}</div></td>
                    <td><span className="pill info">{s.ingestMode}</span></td>
                    <td>{s.required ? <span className="pill ok">required</span> : <span className="muted">optional</span>}</td>
                  </tr>
                ))}
                {(detail.sources || []).length === 0 && <tr><td colSpan={3} className="empty">No sources bound.</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <div className="cfg-sub">Destinations <span className="muted">({(detail.destinations || []).length})</span></div>
            <table className="tbl">
              <thead><tr><th>Step</th><th>Destination</th><th>Surface</th></tr></thead>
              <tbody>
                {(detail.destinations || []).map((d) => (
                  <tr key={d.destId}>
                    <td className="mono">{d.stepOrder}</td>
                    <td className="mono lead">{d.destId}<div className="sec">{d.displayName}</div></td>
                    <td><span className="chip">{d.surface || d.actionType}</span></td>
                  </tr>
                ))}
                {(detail.destinations || []).length === 0 && <tr><td colSpan={3} className="empty">No destinations bound.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cfg-sub" style={{ marginTop: 14 }}>Embed</div>
        {embed ? (
          <div className="embed-card">
            <div className="kv"><span className="k">URL</span><span className="v mono">{embed.embedUrl}</span></div>
            <div className="kv"><span className="k">Allowed origin</span><span className="v mono">{embed.allowedOrigin}</span></div>
            <div className="kv"><span className="k">Chrome</span><span className="v"><span className="chip">{embed.chrome}</span></span></div>
          </div>
        ) : <div className="muted">No embed configured for this kit.</div>}
      </div>
    </>
  );
}
