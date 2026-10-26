import { useCallback, useEffect, useRef, useState } from 'react';
import { applyComputed, resolveTemplate, transformTile } from './transform.js';
import { mockDataset } from './mockData.js';
import { useStream } from '../useStream.js';

const TOKEN_KEY = 'ofx-token';

async function fetchSource(ds, ctx, signal) {
  let raw;
  if (ds.endpoint.startsWith('mock:')) {
    raw = mockDataset(ds.endpoint.slice(5), ctx);
  } else {
    const url = new URL(ds.endpoint, window.location.origin);
    Object.entries(ds.params || {}).forEach(([k, tpl]) => {
      const v = resolveTemplate(tpl, ctx);
      if (v) url.searchParams.set(k, v);
    });
    const headers = {};
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(url.pathname + url.search, { headers, signal });
    if (!res.ok) throw new Error(`${ds.name}: ${res.status}`);
    raw = await res.json();
    if (ds.responseKey && raw && typeof raw === 'object' && !Array.isArray(raw)) raw = raw[ds.responseKey];
  }
  return Array.isArray(raw) ? applyComputed(raw, ds.computed) : raw;
}

/**
 * STEPS useDashboardTiles on One Finance: every data source the blueprint uses is fetched in parallel,
 * each tile is built by the transformer, the board refreshes on an interval, and — the One Finance part —
 * tiles on live sources refresh the moment the hub pushes outcome / event / notification over the socket.
 */
export function useDashboardTiles(blueprint, { groupUnit, cobDate, region }) {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [pulse, setPulse] = useState(0);
  const cache = useRef(new Map());
  const abort = useRef(null);
  const liveAbort = useRef(null);
  const debounce = useRef(null);

  const load = useCallback(async ({ liveOnly = false } = {}) => {
    // A live nudge never cancels a full load in flight (it would leave the demo tiles empty).
    const slot = liveOnly ? liveAbort : abort;
    slot.current?.abort();
    const ctrl = new AbortController();
    slot.current = ctrl;
    const ctx = { groupUnit, cobDate, region };
    const used = new Set(blueprint.tiles.map((t) => t.dataSourceId));
    const sources = blueprint.dataSources.filter((ds) => used.has(ds.id) && (!liveOnly || ds.live));
    if (!liveOnly) setLoading(true);
    const results = await Promise.allSettled(sources.map((ds) => fetchSource(ds, ctx, ctrl.signal)));
    if (ctrl.signal.aborted) return;
    const errs = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') cache.current.set(sources[i].id, r.value);
      else errs[sources[i].id] = r.reason?.message || 'failed';
    });
    const now = new Date();
    setTiles(blueprint.tiles.map((def) => transformTile(def, cache.current.get(def.dataSourceId) ?? [], now)));
    setErrors((prev) => (liveOnly ? { ...prev, ...errs } : errs));
    setLastRefreshed(now);
    setLoading(false);
    if (liveOnly) setPulse((p) => p + 1);
  }, [blueprint, groupUnit, cobDate, region]);

  useEffect(() => {
    load();
    const interval = blueprint.defaults?.refreshInterval || 60_000;
    const t = setInterval(() => load(), interval);
    return () => { clearInterval(t); abort.current?.abort(); liveAbort.current?.abort(); };
  }, [load, blueprint]);

  const liveRefresh = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ liveOnly: true }), 500);
  }, [load]);
  useEffect(() => () => clearTimeout(debounce.current), []);

  useStream({ outcome: liveRefresh, event: liveRefresh, notification: liveRefresh, reset: () => load() });

  return { tiles, loading, errors, lastRefreshed, pulse, refresh: load };
}
