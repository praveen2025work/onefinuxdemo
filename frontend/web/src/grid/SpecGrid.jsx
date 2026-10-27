import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DataView from '../components/DataView.jsx';
import Icon from '../components/Icon.jsx';
import { coerceRows, gridColumns, normalizeSpec, requestFor, rowsFrom, shareContext } from './spec.js';
import { applyOverlay, changesOf, recordEdit, validateCell } from './writeback.js';
import { writebackApi } from '../api.js';
import { trackUse } from '../ux/track.js';

const TOKEN_KEY = 'ofx-token';

/**
 * fetch for a spec request, JSON in and out. The console's bearer token goes only to the console's own origin: a spec
 * (which can arrive in a link) that points at another host never receives it.
 */
export async function defaultFetch(req, baseUrl = '') {
  const headers = { Accept: 'application/json' };
  const url = baseUrl && req.url.startsWith('/') ? baseUrl.replace(/\/$/, '') + req.url : req.url;
  let sameOrigin = false;
  try { sameOrigin = new URL(url, window.location.href).origin === window.location.origin; } catch { /* bad URL: no token */ }
  if (sameOrigin) {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) headers.Authorization = 'Bearer ' + token;
    } catch { /* no storage */ }
  }
  const init = { method: req.method, headers };
  if (req.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(req.params);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} on ${req.url.split('?')[0]}`);
  return res.json();
}

/**
 * A read-only grid from a GridSpec (see spec.js): rows from the spec's source, the standard DataView lenses, a
 * refetch when the hub pushes one of `spec.live` (or every `refreshSeconds`), and a user's row pick handed to
 * `onShare` as an FDC3 context. `subscribe(fn)` delivers hub pushes: the console passes its live link.
 */
export default function SpecGrid({ spec: rawSpec, context = {}, subscribe, onShare, onSelect, height, title, baseUrl = '',
  fetcher = defaultFetch, writeback = true }) {
  const specKey = JSON.stringify(rawSpec ?? null);
  const { spec, errors } = useMemo(() => normalizeSpec(rawSpec), [specKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const req = spec ? requestFor(spec, context) : null;
  // Write-back (spec.edit): only inside the console — an embed on another origin has no session to submit with.
  const editSpec = spec?.edit && writeback && !baseUrl ? spec.edit : null;
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState({});
  const [overlay, setOverlay] = useState({});
  const [pending, setPending] = useState([]);
  const [wbMsg, setWbMsg] = useState(null);
  const [wbBusy, setWbBusy] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const reqKey = req ? `${req.method} ${req.url} ${JSON.stringify(req.params)}` : 'static';

  useEffect(() => {
    if (!spec || !req) { setPayload(null); setError(null); return undefined; }
    let alive = true;
    setLoading(true);
    fetcher(req, baseUrl)
      .then((data) => { if (alive) { setPayload(data); setError(null); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [specKey, reqKey, tick, baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hub pushes: a burst of events becomes one refetch.
  useEffect(() => {
    if (!spec?.live?.length || !subscribe || !req) return undefined;
    let timer = null;
    const off = subscribe((name) => {
      if (!spec.live.includes(name) || Object.keys(dirtyRef.current).length) return;
      clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 250);
    });
    return () => { clearTimeout(timer); if (typeof off === 'function') off(); };
  }, [specKey, subscribe, Boolean(req)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!spec?.refreshSeconds || !req) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), spec.refreshSeconds * 1000);
    return () => clearInterval(t);
  }, [specKey, Boolean(req)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWriteback = useCallback(() => {
    if (!editSpec) return;
    writebackApi.overlay(spec.id).then(setOverlay).catch(() => {});
    writebackApi.list({ grid: spec.id, status: 'PENDING' }).then(setPending).catch(() => setPending([]));
  }, [specKey, Boolean(editSpec)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadWriteback(); }, [loadWriteback, tick]);

  const rows = useMemo(() => {
    if (!spec) return [];
    const raw = spec.source.rows ? rowsFrom(spec.source.rows, spec) : rowsFrom(payload, spec);
    const coerced = coerceRows(raw, spec);
    return editSpec ? applyOverlay(coerced, overlay, editSpec.key) : coerced;
  }, [spec, payload, overlay]); // eslint-disable-line react-hooks/exhaustive-deps
  const columns = useMemo(() => (spec ? gridColumns(spec, payload && !Array.isArray(payload) ? payload.columns : null) : null), [spec, payload]);

  if (!spec) {
    return (
      <div className="dg-empty static">
        <Icon name="warning" size={16} /> This grid spec cannot be used: {errors.join('; ')}
      </div>
    );
  }

  const pick = onSelect || onShare ? (row) => {
    onSelect?.(row);
    const ctx = shareContext(spec, row);
    if (ctx) onShare?.(ctx, row);
  } : undefined;

  const rules = editSpec ? Object.fromEntries(editSpec.columns.map((r) => [r.key, r])) : null;
  const rowKey = (item) => String(item?.[editSpec.key] ?? '');
  const edit = editing && rules ? {
    columns: rules,
    validate: (item, binding, value) => validateCell(rules[binding], value),
    onEdit: (item, binding, before, after) => setDirty((d) => recordEdit(d, rowKey(item), binding, before, after)),
    isDirty: (item, binding) => Boolean(dirty[rowKey(item)]?.[binding]),
    version: JSON.stringify(dirty),
  } : undefined;
  const changes = changesOf(dirty);

  function discard() {
    setDirty({});
    setEditing(false);
    setWbMsg(null);
    setTick((t) => t + 1); // the grid edited the row objects in place; refetch the originals
  }

  async function submit() {
    if (!changes.length) return;
    setWbBusy(true);
    setWbMsg(null);
    try {
      const scope = Object.fromEntries(['groupUnit', 'cobDate', 'region', 'outcomeId', 'kitId'].filter((k) => context[k]).map((k) => [k, context[k]]));
      const r = await writebackApi.submit(spec.id, { title: spec.title, approval: editSpec.approval, target: editSpec.target, context: scope, changes });
      trackUse('grid.writeback.submit', undefined, { grid: spec.id, changes: changes.length });
      setWbMsg({ cls: 'ok', text: r.status === 'PENDING'
        ? `${changes.length} change${changes.length === 1 ? '' : 's'} sent for approval (${r.id}). Someone else approves before it is applied.`
        : `${changes.length} change${changes.length === 1 ? '' : 's'} applied (${r.id}).` });
      setDirty({});
      setEditing(false);
      setTick((t) => t + 1);
    } catch (e) {
      setWbMsg({ cls: 'fail', text: e.message });
    } finally {
      setWbBusy(false);
    }
  }

  async function decide(set, approve) {
    setWbMsg(null);
    try {
      const r = approve ? await writebackApi.approve(set.id) : await writebackApi.reject(set.id);
      trackUse(approve ? 'grid.writeback.approve' : 'grid.writeback.reject', undefined, { grid: spec.id });
      setWbMsg({ cls: 'ok', text: `${set.id} ${r.status === 'APPLIED' ? `applied${r.how ? ' — ' + r.how : ''}` : r.status.toLowerCase()}.` });
      setTick((t) => t + 1);
    } catch (e) {
      setWbMsg({ cls: 'fail', text: e.message });
    }
  }

  const editTools = editSpec ? (
    <>
      {pending.length > 0 && !editing && <span className="pill warn" title="Change sets waiting for a second person">{pending.length} awaiting approval</span>}
      {editing ? (
        <>
          <button type="button" className="btn sm" onClick={submit} disabled={!changes.length || wbBusy}
            title={editSpec.approval === 'none' ? 'Apply these changes' : 'Send these changes for approval'}>
            <Icon name="send" size={13} /> {wbBusy ? 'Sending…' : `Submit ${changes.length || ''}`.trim()}
          </button>
          <button type="button" className="btn ghost sm" onClick={discard}>Discard</button>
        </>
      ) : (
        <button type="button" className="btn ghost sm" onClick={() => { setEditing(true); setWbMsg(null); trackUse('grid.writeback.edit', undefined, { grid: spec.id }); }}
          title={`Edit ${editSpec.columns.map((c) => c.key).join(', ')}${editSpec.approval === 'none' ? '' : ' — a second person approves'}`}>
          <Icon name="wrench" size={13} /> Edit
        </button>
      )}
    </>
  ) : null;

  const below = editSpec && (wbMsg || editing || pending.length > 0) ? (
    <div className="wb">
      {editing && <div className="wb-hint"><Icon name="info" size={13} /> Double-click a highlighted cell to change it. {editSpec.approval === 'none' ? 'Changes apply when you submit.' : 'A second person approves before the change reaches the owning system.'}</div>}
      {wbMsg && <div className={'wb-msg ' + wbMsg.cls} role="status">{wbMsg.text}</div>}
      {pending.map((set) => (
        <div key={set.id} className="wb-set">
          <div className="wb-set-hd">
            <b className="mono">{set.id}</b>
            <span className="sec">{set.changes.length} change{set.changes.length === 1 ? '' : 's'} by {set.maker} · {String(set.createdAt || '').slice(0, 16)}</span>
            <span className="spacer" />
            <button type="button" className="btn sm" onClick={() => decide(set, true)}><Icon name="check" size={13} /> Approve</button>
            <button type="button" className="btn ghost sm" onClick={() => decide(set, false)}>Reject</button>
          </div>
          <ul className="wb-changes">
            {set.changes.slice(0, 8).map((c) => (
              <li key={c.key + c.column}><span className="mono">{c.key}</span> · {c.column}: <s>{String(c.before ?? '—') || '—'}</s> → <b>{String(c.after ?? '—') || '—'}</b></li>
            ))}
            {set.changes.length > 8 && <li className="sec">and {set.changes.length - 8} more</li>}
          </ul>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <DataView rows={rows} columns={columns} views={editing ? ['grid'] : spec.views} defaultView={editing ? 'grid' : spec.defaultView}
      height={height ?? spec.height} maxHeight={spec.maxHeight} rowHeight={spec.rowHeight}
      title={title ?? spec.title} exportName={spec.exportName} pivot={spec.pivot} chart={spec.chart}
      empty={error || (loading ? 'Loading…' : 'No rows.')} onSelect={pick} edit={edit} below={below}
      actions={(req || editTools) ? (
        <>
          {editTools}
          {req && (
            <button type="button" className="btn ghost sm" onClick={() => setTick((t) => t + 1)} title="Refetch the rows" disabled={changes.length > 0}>
              <Icon name="refresh" size={13} className={loading ? 'spin-ic' : ''} />
            </button>
          )}
        </>
      ) : null} />
  );
}
