// A-B experiments: the hub assigns each user a stable variant (/api/ux/config). A screen reads its variant with
// useVariant(id); the first render logs an exposure, and convert(id) logs success. Both feed /usage results.
import { useEffect, useState } from 'react';
import { uxApi } from '../api.js';
import { track } from './track.js';

let config = null;
const exposed = new Set();

/** The hub's UX config (search providers, experiment assignments), fetched once per page load. */
export function uxConfig() {
  if (!config) config = uxApi.config().catch(() => ({ searchProviders: [], assignments: {} }));
  return config;
}

export function resetUxConfig() { config = null; exposed.clear(); }

export function useVariant(id, fallback = null) {
  const [variant, setVariant] = useState(fallback);
  useEffect(() => {
    let alive = true;
    uxConfig().then((c) => {
      const v = c?.assignments?.[id] ?? fallback;
      if (!alive) return;
      setVariant(v);
      if (v && !exposed.has(id)) {
        exposed.add(id);
        track('EXPOSURE', { app: window.location.pathname, component: id, variant: v });
      }
    });
    return () => { alive = false; };
  }, [id, fallback]);
  return variant;
}

export function convert(id) {
  uxConfig().then((c) => {
    const v = c?.assignments?.[id];
    if (v) track('CONVERSION', { app: window.location.pathname, component: id, variant: v });
  });
}
