import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill } from '../components/bits.jsx';

const COLUMNS = [
  { key: 'occurredAt', label: 'Time', fmt: (v) => (v || '').slice(0, 19) },
  { key: 'sourceSystem', label: 'Source', mono: true },
  { key: 'eventType', label: 'Type' },
  { key: 'sourceKey', label: 'Key', mono: true },
  { key: 'status', label: 'Status', pill: true },
  { key: 'cobDate', label: 'COB', mono: true },
  { key: 'region', label: 'Region' },
  { key: 'instanceId', label: 'Instance', mono: true },
  { key: 'ingestOffset', label: 'Offset', mono: true },
];
const DEFAULT_COLS = ['occurredAt', 'sourceSystem', 'eventType', 'sourceKey', 'status', 'region'];

export default function Analyst() {
  const { context, filters: appFilters } = useApp();
  const [sources, setSources] = useState([]);
  const [views, setViews] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [sort, setSort] = useState({ key: 'occurredAt', dir: -1 });
  const [f, setF] = useState({ source: '', cobDate: '', region: '', status: '' });
  const groupUnit = appFilters.groupUnit;

  const loadMeta = useCallback(async () => {
    const [ds, vs] = await Promise.all([api.datasets(groupUnit).catch(() => []), api.views(groupUnit).catch(() => [])]);
    setSources([...new Set(ds.map((d) => d.sourceId))]);
    setViews(vs);
  }, [groupUnit]);

  const run = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.explore({ groupUnit, ...f })); }
    finally { setLoading(false); }
  }, [groupUnit, f]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { run(); }, [run]);

  const sorted = useMemo(() => {
    const c = sort.key;
    return [...rows].sort((a, b) => ((a[c] ?? '') < (b[c] ?? '') ? -1 : 1) * sort.dir);
  }, [rows, sort]);

  function toggleCol(key) {
    setCols((cs) => (cs.includes(key) ? cs.filter((k) => k !== key) : [...cs, key]));
  }

  async function saveView() {
    const name = prompt('Name this view');
    if (!name) return;
    await api.saveView({ groupUnitId: groupUnit, widget: 'GRID', fieldMap: { name, columns: cols, filters: f } });
    await loadMeta();
  }

  function loadView(v) {
    let fm = {};
    try { fm = JSON.parse(v.fieldMapJson); } catch { /* ignore */ }
    if (Array.isArray(fm.columns)) setCols(fm.columns);
    if (fm.filters) setF({ source: '', cobDate: '', region: '', status: '', ...fm.filters });
  }

  async function removeView(id) {
    await api.deleteView(id);
    await loadMeta();
  }

  const shown = COLUMNS.filter((c) => cols.includes(c.key));

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Analyst explorer · {groupUnit}</div>
          <h1>Explore bound data sources</h1>
          <p className="sub">A configurable grid over the origins already bound to this unit (CATS, MOTIF, MBR). Filter, choose columns, and save the view. The explorer cannot register a new source — that stays config.</p>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" onClick={run}>↻ Run</button>
          <button className="btn" onClick={saveView}>💾 Save view</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-bd">
          <div className="wrapflex">
            <label className="tb-btn"><select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="">All sources</option>{sources.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="tb-btn"><select value={f.cobDate} onChange={(e) => setF({ ...f, cobDate: e.target.value })}><option value="">All COB</option>{(context?.cobDates || []).map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="tb-btn"><select value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}><option value="">All regions</option>{(context?.regions || []).map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="tb-btn"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Any status</option>{['COMPLETED', 'FAILED', 'REVOKED', 'STARTED'].map((s) => <option key={s}>{s}</option>)}</select></label>
            <span className="muted">{loading ? 'running…' : `${rows.length} rows`}</span>
          </div>
          <div className="wrapflex" style={{ marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 12 }}>Columns:</span>
            {COLUMNS.map((c) => (
              <label key={c.key} className="chip" style={{ cursor: 'pointer', opacity: cols.includes(c.key) ? 1 : 0.45 }}>
                <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggleCol(c.key)} style={{ marginRight: 5 }} />{c.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-hd"><h2>Facts</h2><span className="hint">GET /api/stitch/explore</span></div>
          <div className="panel-bd tight">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>{shown.map((c) => (
                  <th key={c.key} style={{ cursor: 'pointer' }} onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}>
                    {c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}</tr></thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.eventId}>
                      {shown.map((c) => (
                        <td key={c.key} className={c.mono ? 'mono' : ''}>
                          {c.pill ? <StatusPill status={r[c.key]} /> : (c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? '—'))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {sorted.length === 0 && <tr><td colSpan={shown.length} className="empty">No facts. Drive the FOBO demo, or widen the filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hd"><h2>Saved views</h2><span className="hint">analyst_view_def</span></div>
          <div className="panel-bd stack">
            {views.length === 0 && <div className="muted">No saved views. Configure the grid and hit “Save view”.</div>}
            {views.map((v) => {
              let name = v.viewId;
              try { name = JSON.parse(v.fieldMapJson).name || v.viewId; } catch { /* ignore */ }
              return (
                <div key={v.viewId} className="row">
                  <span className="chip">{v.widget}</span>
                  <button className="btn ghost sm" onClick={() => loadView(v)}>{name}</button>
                  <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => removeView(v.viewId)}>✕</button>
                </div>
              );
            })}
          </div>
          <div className="panel-ft">Views are stored server-side and scoped to a CEES report. Swap the grid for licensed Wijmo — same view JSON.</div>
        </div>
      </div>
    </>
  );
}
