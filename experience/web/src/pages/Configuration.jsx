import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Select from '../components/Select.jsx';
import InfoHint from '../components/InfoHint.jsx';

function slaText(sla) {
  if (!sla) return '—';
  if (sla.withinMinutes) return `within ${sla.withinMinutes} min of first event`;
  if (sla.cutoff) return `${sla.cutoff}${sla.dayOffset ? ` (COB+${sla.dayOffset})` : ''}`;
  return '—';
}

export default function Configuration() {
  const { filters, context } = useApp();
  const [kits, setKits] = useState(null);
  const [groupUnits, setGroupUnits] = useState([]);
  const [defs, setDefs] = useState([]);
  const [views, setViews] = useState([]);
  const [sel, setSel] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    const [k, gu] = await Promise.all([api.kits(), api.groupUnits().catch(() => [])]);
    setKits(k);
    setGroupUnits(gu);
    if (k.length && !sel) setSel(k[0].kitId);
  }, [sel]);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const loadOutcomes = useCallback(async () => {
    const [d, v] = await Promise.all([
      outcomesApi.definitions().catch(() => []),
      outcomesApi.all().catch(() => []),
    ]);
    setDefs(d);
    setViews(v);
  }, []);
  useEffect(() => { loadOutcomes(); }, [loadOutcomes]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try { setDetail(await api.kit(id)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadDetail(sel); }, [sel, loadDetail]);

  if (!kits) return <Loading what="Loading configuration…" />;

  const gu = groupUnits.find((g) => g.groupUnitId === filters.groupUnit);
  const kit = detail?.kit;
  const embed = detail?.embed && Object.keys(detail.embed).length ? detail.embed : null;

  const totalFeeds = defs.reduce((n, o) => n + (o.dependencies || []).length, 0);
  const totalKeys = defs.reduce((n, o) => n + (o.dependencies || []).reduce((m, d) => m + (d.expectedCount || 0), 0), 0);

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Configuration · live registry</div>
          <h1 className="ph-title">Configuration
            <InfoHint title="Configuration governs; Onboarding creates" width={360}>This is the live registry: inspect and govern every business outcome the platform folds — its question, entitlement, SLA, input feeds and on-ready contract — plus the console kit bindings. To create a new outcome, use <b>Onboarding</b>.</InfoHint>
          </h1>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/onboarding"><Icon name="build" size={15} /> Onboard new</Link>
          <button className="btn ghost" onClick={() => { loadCatalog(); loadOutcomes(); }}>↻ Refresh</button>
        </div>
      </div>

      <div className="banner plain" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div><b>Configuration inspects &amp; governs; Onboarding creates.</b>
          <span className="mono-sm">Below is the full anatomy of every live outcome — question, owner, entitlement, SLA, feeds and on-ready action. New outcomes are defined on the Onboarding screen.</span></div>
      </div>

      <div className="cfg-grid">
        <section className="panel span2">
          <div className="panel-hd">
            <h2>Business outcomes <InfoHint title="Anatomy of an outcome" width={340}>Each outcome is a kit of data: a business question, the input feeds it depends on (with how many keys are expected), an SLA, an entitlement (regions) and what to do when every feed is complete. This is what the engine folds — no code per product.</InfoHint></h2>
            <span className="hint">{defs.length} outcomes · {totalFeeds} feeds · {totalKeys} keys</span>
          </div>
          <div className="panel-bd stack">
            {defs.map((o) => {
              const total = (o.dependencies || []).reduce((n, d) => n + (d.expectedCount || 0), 0);
              const live = views.filter((v) => v.outcomeId === o.id);
              const command = o.onReady && o.onReady.action;
              return (
                <div key={o.id} className="odef">
                  <div className="odef-hd">
                    <div>
                      <span className="mono lead">{o.id}</span>
                      <h3>{o.name}</h3>
                      <p className="q">{o.question}</p>
                    </div>
                    <div className="odef-tags">
                      <span className="chip">{o.ownerGroup}</span>
                      {(o.regions || []).map((r) => <span key={r} className="chip">{r}</span>)}
                    </div>
                  </div>

                  <div className="odef-live">
                    <span className="k">Live now</span>
                    {live.length === 0 && <span className="muted">no instance for this COB yet</span>}
                    {live.map((v) => (
                      <span key={v.key} className="odef-inst"><StatusPill status={v.status} /> <span className="mono-sm">{v.region} · {v.completed}/{v.expected}{v.stage ? ` · ${v.stage}` : ''}</span></span>
                    ))}
                  </div>

                  <div className="odef-meta">
                    <div className="kv"><span className="k">Entitlement</span><span className="v">{(o.regions || []).join(', ') || 'GLOBAL'}</span></div>
                    <div className="kv"><span className="k">SLA</span><span className="v">{slaText(o.sla)}</span></div>
                    <div className="kv"><span className="k">On ready</span><span className="v">{command ? <span className="chip ok-chip">Command {o.onReady.target}</span> : <span className="chip">Notify only</span>}</span></div>
                    {command && <div className="kv"><span className="k">Action</span><span className="v">{o.onReady.actionLabel || o.onReady.action}</span></div>}
                    {command && <div className="kv"><span className="k">Completion event</span><span className="v mono">{o.onReady.completionEvent}</span></div>}
                    <div className="kv"><span className="k">Inputs</span><span className="v">{(o.dependencies || []).length} feeds · {total} keys expected</span></div>
                  </div>

                  <div className="cfg-sub">Input feeds <span className="muted">(the dependencies that must complete before ready)</span></div>
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
                </div>
              );
            })}
            {defs.length === 0 && <div className="empty">No outcome definitions. Create one on the <Link to="/onboarding">Onboarding</Link> screen.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-hd"><h2>Group unit <InfoHint title="Group unit" width={280}>Switch group unit from the header — every panel re-scopes to it.</InfoHint></h2><span className="hint">group_unit</span></div>
          <div className="panel-bd stack">
            <div className="kv"><span className="k">Group unit</span><span className="v mono">{filters.groupUnit}</span></div>
            <div className="kv"><span className="k">Name</span><span className="v">{gu?.name || '—'}</span></div>
            <div className="kv"><span className="k">Regions</span><span className="v">{(context?.regions || []).join(', ') || '—'}</span></div>
            <div className="kv"><span className="k">Live outcomes</span><span className="v">{defs.length}</span></div>
            <div className="kv"><span className="k">Console kits</span><span className="v">{kits.length}</span></div>
            <div className="kv"><span className="k">COB dates</span><span className="v mono">{(context?.cobDates || []).length}</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-hd"><h2>Console kits <InfoHint title="Kit bindings" width={300}>Separate from the outcome fold: these bind a console kit to its sources, destinations and embedded partner view (how the FOBO console renders).</InfoHint></h2><span className="hint">product_kit</span></div>
          <div className="panel-bd stack">
            <Select variant="block" icon="grid" value={sel} onChange={setSel}
              options={kits.map((k) => ({ value: k.kitId, label: `${k.kitId} · ${k.renderer}` }))} />
            <div className="kit-list">
              {kits.map((k) => (
                <button key={k.kitId} className={'kit-row' + (k.kitId === sel ? ' on' : '')} onClick={() => setSel(k.kitId)}>
                  <span className="mono lead">{k.kitId}</span>
                  <StatusPill status={k.status === 'LIVE' ? 'READY' : k.status} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel span2">
          <div className="panel-hd">
            <h2>{loading ? 'Loading…' : (kit ? `Kit binding · ${kit.kitId}` : 'Kit binding')}</h2>
            <span className="hint">product_kit · kit_source · kit_destination · kit_embed</span>
          </div>
          <div className="panel-bd">
            {kit && (
              <>
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
                      <thead><tr><th>Step</th><th>Destination</th><th>Action</th></tr></thead>
                      <tbody>
                        {(detail.destinations || []).map((d) => (
                          <tr key={d.destId}>
                            <td className="mono">{d.stepOrder}</td>
                            <td className="mono lead">{d.destId}<div className="sec">{d.displayName}</div></td>
                            <td><span className="chip">{d.actionType}</span></td>
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
              </>
            )}
            {!kit && !loading && <div className="empty">Select a kit to inspect its binding.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
