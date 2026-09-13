import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading } from '../components/bits.jsx';
import Select from '../components/Select.jsx';
import InfoHint from '../components/InfoHint.jsx';

export default function Configuration() {
  const { filters, context } = useApp();
  const [kits, setKits] = useState(null);
  const [groupUnits, setGroupUnits] = useState([]);
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

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Configuration · group unit</div>
          <h1 className="ph-title">Configuration
            <InfoHint title="Configuration" width={340}>Everything the platform runs on is data. Inspect the group unit, its product kits, and the sources, destinations and embed each kit is stitched to — no code, no <span className="mono">if (product)</span>.</InfoHint>
          </h1>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" onClick={loadCatalog}>↻ Refresh</button>
        </div>
      </div>

      <div className="cfg-grid">
        <section className="panel">
          <div className="panel-hd"><h2>Group unit <InfoHint title="Group unit" width={280}>Switch group unit from the header — every panel below re-scopes to it.</InfoHint></h2><span className="hint">group_unit</span></div>
          <div className="panel-bd stack">
            <div className="kv"><span className="k">Group unit</span><span className="v mono">{filters.groupUnit}</span></div>
            <div className="kv"><span className="k">Name</span><span className="v">{gu?.name || '—'}</span></div>
            <div className="kv"><span className="k">Regions</span><span className="v">{(context?.regions || []).join(', ') || '—'}</span></div>
            <div className="kv"><span className="k">Live kits</span><span className="v">{kits.length}</span></div>
            <div className="kv"><span className="k">COB dates</span><span className="v mono">{(context?.cobDates || []).length}</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-hd"><h2>Product kits</h2><span className="hint">product_kit</span></div>
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
            <h2>{loading ? 'Loading…' : (kit ? kit.kitId : 'Kit')}</h2>
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
            {!kit && !loading && <div className="empty">Select a kit to inspect its configuration.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
