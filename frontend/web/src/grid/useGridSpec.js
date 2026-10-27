import { useEffect, useState } from 'react';
import { outcomesApi } from '../api.js';
import { builtinSpec, outcomeGridSpecs } from './specs.js';

export const MY_SPECS_KEY = 'ofx-grid-specs';
export const UNIT_SPECS_KEY = 'ofx-unit-grid-specs';
let definitions = null; // one fetch of the outcome definitions per page

/** Grids this browser saved from the grid library (`my:<id>`). */
export function loadMySpecs() {
  try {
    const list = JSON.parse(localStorage.getItem(MY_SPECS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s && typeof s.id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveMySpecs(list) {
  try { localStorage.setItem(MY_SPECS_KEY, JSON.stringify(list)); } catch { /* quota / private window */ }
}

/** Unit-shared GridSpecs cached from /api/grids (`unit:<templateId>` or the spec id). */
export function loadUnitSpecs() {
  try {
    const list = JSON.parse(localStorage.getItem(UNIT_SPECS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s && typeof s.id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveUnitSpecs(list) {
  try { localStorage.setItem(UNIT_SPECS_KEY, JSON.stringify(list)); } catch { /* quota / private window */ }
}

/** Every outcome definition's lineage grids, as specs. */
export function loadOutcomeSpecs() {
  if (!definitions) definitions = outcomesApi.definitions().then(outcomeGridSpecs).catch(() => { definitions = null; return []; });
  return definitions;
}

/**
 * Resolve a spec reference: an inline spec object, a built-in id (`instances`), an outcome grid
 * (`outcome:FOBO_HELIX:investigation`), a unit-shared grid (`unit:<id>`) or a saved grid (`my:<id>`).
 * `overrides` (e.g. a desk view's filter) win.
 */
export function useGridSpec(ref, overrides = null) {
  const key = typeof ref === 'string' ? ref : JSON.stringify(ref ?? null);
  const [state, setState] = useState({ spec: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    const done = (spec, error = null) => { if (alive) setState({ spec, loading: false, error }); };
    if (ref && typeof ref === 'object') done(ref);
    else if (typeof ref !== 'string' || !ref) done(null, 'No grid spec chosen.');
    else if (builtinSpec(ref)) done(builtinSpec(ref));
    else if (ref.startsWith('my:')) {
      const mine = loadMySpecs().find((s) => s.id === ref.slice(3) || s.id === ref);
      done(mine || null, mine ? null : `No saved grid “${ref.slice(3)}” in this browser.`);
    } else if (ref.startsWith('unit:')) {
      const id = ref.slice(5);
      const unit = loadUnitSpecs().find((s) => s.id === id || s.templateId === id || s.id === ref);
      done(unit || null, unit ? null : `No unit grid “${id}”. Open /grids while entitled to the unit.`);
    } else if (ref.startsWith('outcome:')) {
      setState((s) => ({ ...s, loading: true }));
      loadOutcomeSpecs().then((list) => {
        const found = list.find((s) => s.id === ref);
        done(found || null, found ? null : `No outcome grid “${ref}”.`);
      });
    } else {
      const unit = loadUnitSpecs().find((s) => s.id === ref);
      if (unit) done(unit);
      else done(null, `Unknown grid “${ref}”.`);
    }
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const spec = state.spec && overrides ? { ...state.spec, ...overrides, filter: { ...(state.spec.filter || {}), ...(overrides.filter || {}) } } : state.spec;
  return { ...state, spec };
}
