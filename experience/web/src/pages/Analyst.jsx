import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill } from '../components/bits.jsx';
import Select from '../components/Select.jsx';
import { PromptModal, ConfirmModal } from '../components/Modal.jsx';
import InfoHint from '../components/InfoHint.jsx';

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
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
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

  async function confirmSave(name) {
    await api.saveView({ groupUnitId: groupUnit, widget: 'GRID', fieldMap: { name, columns: cols, filters: f } });
    setSaving(false);
    await loadMeta();
  }

  function loadView(v) {
    let fm = {};
    try { fm = JSON.parse(v.fieldMapJson); } catch { /* ignore */ }
    if (Array.isArray(fm.columns)) setCols(fm.columns);
    if (fm.filters) setF({ source: '', cobDate: '', region: '', status: '', ...fm.filters });
  }

  async function confirmRemove() {
    await api.deleteView(removing.viewId);
    setRemoving(null);
    await loadMeta();
  }

  const shown = COLUMNS.filter((c) => cols.includes(c.key));

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Analyst explorer · {groupUnit}</div>
          <h1 className="ph-title">Explore bound data sources
            <InfoHint title="Analyst explorer" width={340}>A configurable grid over the origins already bound to this unit (CATS, MOTIF, MBR). Filter, choose columns, and save the view. The explorer cannot register a new source — that stays config.</InfoHint>
          </h1>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" onClick={run}>↻ Run</button>
          <button className="btn" onClick={() => setSaving(true)}>💾 Save view</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-bd">
          <div className="wrapflex">
            <Select variant="plain" icon="grid" value={f.source} onChange={(v) => setF({ ...f, source: v })} minWidth={150}
              options={[{ value: '', label: 'All sources' }, ...sources.map((s) => ({ value: s, label: s }))]} />
            <Select variant="plain" icon="calendar" value={f.cobDate} onChange={(v) => setF({ ...f, cobDate: v })} minWidth={150}
              options={[{ value: '', label: 'All COB' }, ...(context?.cobDates || []).map((d) => ({ value: d, label: d }))]} />
            <Select variant="plain" value={f.region} onChange={(v) => setF({ ...f, region: v })} minWidth={140}
              options={[{ value: '', label: 'All regions' }, ...(context?.regions || []).map((r) => ({ value: r, label: r }))]} />
            <Select variant="plain" value={f.status} onChange={(v) => setF({ ...f, status: v })} minWidth={140}
              options={[{ value: '', label: 'Any status' }, ...['COMPLETED', 'FAILED', 'REVOKED', 'STARTED'].map((s) => ({ value: s, label: s }))]} />
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
          <div className="panel-hd"><h2>Saved views <InfoHint title="Saved views" width={300} align="right">Views are stored server-side and scoped to a CEES report. Swap the grid for licensed Wijmo — same view JSON.</InfoHint></h2><span className="hint">analyst_view_def</span></div>
          <div className="panel-bd stack">
            {views.length === 0 && <div className="muted">No saved views. Configure the grid and hit “Save view”.</div>}
            {views.map((v) => {
              let name = v.viewId;
              try { name = JSON.parse(v.fieldMapJson).name || v.viewId; } catch { /* ignore */ }
              return (
                <div key={v.viewId} className="row">
                  <span className="chip">{v.widget}</span>
                  <button className="btn ghost sm" onClick={() => loadView(v)}>{name}</button>
                  <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setRemoving({ viewId: v.viewId, name })}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {saving && (
        <PromptModal title="Save this view" subtitle={`${cols.length} columns · scoped to ${groupUnit}`}
          label="View name" placeholder="e.g. FOBO blockers — EMEA" confirmText="Save view"
          onCancel={() => setSaving(false)} onConfirm={confirmSave} />
      )}
      {removing && (
        <ConfirmModal title="Delete saved view" danger confirmText="Delete"
          body={`Remove “${removing.name}”? This only deletes the saved view definition, not any facts.`}
          onCancel={() => setRemoving(null)} onConfirm={confirmRemove} />
      )}
    </>
  );
}
