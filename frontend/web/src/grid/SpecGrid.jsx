import { useEffect, useMemo, useState } from 'react';
import DataView from '../components/DataView.jsx';
import Icon from '../components/Icon.jsx';
import { coerceRows, gridColumns, normalizeSpec, requestFor, rowsFrom, shareContext } from './spec.js';

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
  fetcher = defaultFetch }) {
  const specKey = JSON.stringify(rawSpec ?? null);
  const { spec, errors } = useMemo(() => normalizeSpec(rawSpec), [specKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const req = spec ? requestFor(spec, context) : null;
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
      if (!spec.live.includes(name)) return;
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

  const rows = useMemo(() => {
    if (!spec) return [];
    const raw = spec.source.rows ? rowsFrom(spec.source.rows, spec) : rowsFrom(payload, spec);
    return coerceRows(raw, spec);
  }, [spec, payload]);
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

  return (
    <DataView rows={rows} columns={columns} views={spec.views} defaultView={spec.defaultView}
      height={height ?? spec.height} maxHeight={spec.maxHeight} rowHeight={spec.rowHeight}
      title={title ?? spec.title} exportName={spec.exportName} pivot={spec.pivot} chart={spec.chart}
      empty={error || (loading ? 'Loading…' : 'No rows.')} onSelect={pick}
      actions={req ? (
        <button type="button" className="btn ghost sm" onClick={() => setTick((t) => t + 1)} title="Refetch the rows">
          <Icon name="refresh" size={13} className={loading ? 'spin-ic' : ''} />
        </button>
      ) : null} />
  );
}
