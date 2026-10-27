// Finance dashboards are blueprints: dataSources, tiles, tabs. Platform ships one (or more); a unit shares
// more via team templates (kind: finance). The same shell renders every id — no per-dashboard React page.

import { financeBlueprint } from './blueprint.js';
import { uxApi } from '../api.js';

/** Built-in dashboards every entitled user can open. */
export const PLATFORM_DASHBOARDS = [financeBlueprint];

/** Normalize a template or raw object into a dashboard blueprint the shell can render. */
export function normalizeDashboard(raw, fallbackId = 'custom') {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : fallbackId;
  const dataSources = Array.isArray(raw.dataSources) ? raw.dataSources : [];
  const tiles = Array.isArray(raw.tiles) ? raw.tiles : [];
  const tabs = Array.isArray(raw.tabs) && raw.tabs.length
    ? raw.tabs
    : [{ id: 'overview', label: 'Overview', tileIds: 'all' }];
  if (!tiles.length) return null;
  return {
    id,
    name: typeof raw.name === 'string' && raw.name ? raw.name : id,
    description: typeof raw.description === 'string' ? raw.description : '',
    dataSources,
    tiles,
    tabs,
    defaults: raw.defaults && typeof raw.defaults === 'object'
      ? raw.defaults
      : { columns: 3, viewMode: 'tile', refreshInterval: 60_000 },
    origin: raw.origin || 'unit',
    templateId: raw.templateId || null,
  };
}

/** Unit-shared finance dashboards for a group unit (empty when the hub is unreachable or the unit has none). */
export async function loadUnitDashboards(team) {
  if (!team) return [];
  try {
    const list = await uxApi.templates(team, 'finance');
    return (Array.isArray(list) ? list : [])
      .map((t) => normalizeDashboard(
        { ...(t.json && typeof t.json === 'object' ? t.json : {}), origin: 'unit', templateId: t.id, name: t.name || t.json?.name },
        t.id,
      ))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Every dashboard the picker shows: platform first, then the unit's. */
export function catalogue(unitDashboards = []) {
  const platform = PLATFORM_DASHBOARDS.map((d) => ({ ...d, origin: 'platform' }));
  const seen = new Set(platform.map((d) => d.id));
  const unit = [];
  for (const d of unitDashboards) {
    if (!d?.id || seen.has(d.id)) continue;
    seen.add(d.id);
    unit.push(d);
  }
  return [...platform, ...unit];
}

/** Resolve a dashboard id from the catalogue. Missing id → platform default; unknown id → null. */
export function resolveDashboard(id, unitDashboards = []) {
  const all = catalogue(unitDashboards);
  if (!id) return all[0] || null;
  return all.find((d) => d.id === id) || null;
}
