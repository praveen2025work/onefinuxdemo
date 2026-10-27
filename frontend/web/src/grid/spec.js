// GridSpec: a read-only grid described as data. One JSON object says where the rows come from, which columns to
// show and how, which lenses (grid / pivot / chart) to offer, when to refresh on a hub push, and what a row pick
// shares with linked screens. The same spec drives a console screen, a desk's Grid view, the embeddable
// /widget/grid page and the <ofx-grid> web component other teams use. Pure: node --test loads this file.
//
// spec = {
//   id, title, description?,
//   source: { endpoint, method?, params?: [{ name, from?, value? }], rowsPath?, rows? },
//           (an outcome definition's `grids` entry — endpoint / method / params at the top level — is accepted too)
//   columns?: [{ key, label?, type?, width?, format?, align?, wrap?, tones?: { VALUE: tone } }],
//   filter?: { field: value | [values] },        keep only matching rows
//   views?: ['grid', 'pivot', 'chart'], defaultView?, pivot?: { rowFields, columnFields, valueFields },
//   chart?: { x, y, op, type },
//   live?: ['outcome', 'event', 'notification', 'activity', 'kit', 'reset'],   refetch on these hub pushes
//   refreshSeconds?: n,                           poll instead (min 10) where the hub cannot push
//   share?: { type, fields: { contextField: rowField } },                       a row pick → FDC3 context
//   height?: number | 'auto', maxHeight?, rowHeight?, exportName?
// }

import { normalizeEdit } from './writeback.js';
import { bindGridParams, gridRequestUrl } from '../lib/bindGridParams.js';

export const COLUMN_TYPES = ['text', 'number', 'money', 'percent', 'date', 'datetime', 'status', 'chip', 'mono', 'bool'];
export const VIEW_IDS = ['grid', 'pivot', 'chart'];
export const LIVE_IDS = ['outcome', 'event', 'notification', 'activity', 'kit', 'reset'];
export const TONES = ['ok', 'warn', 'fail', 'info', 'plain', 'bo'];

const ID = /^[A-Za-z0-9_.:-]{1,80}$/;
const FIELD = /^[A-Za-z_$][A-Za-z0-9_$.]{0,63}$/;
const MAX_STATIC_ROWS = 5000;
const STATUS_KEY = /(^|_)(status|state|severity|stage|kind|transition)$/i;

function isObj(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function scalar(v) {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
}

function safeEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) return false;
  const e = endpoint.trim();
  if (e.startsWith('/')) return !e.startsWith('//');
  return /^https?:\/\/[^\s]+$/i.test(e);
}

function cleanColumn(c, errors, i) {
  if (!isObj(c) || typeof c.key !== 'string' || !FIELD.test(c.key)) {
    errors.push(`columns[${i}] needs a key (a field name)`);
    return null;
  }
  const type = COLUMN_TYPES.includes(c.type) ? c.type : 'text';
  if (c.type && type !== c.type) errors.push(`columns[${i}].type "${c.type}" is not one of ${COLUMN_TYPES.join(', ')}`);
  const out = { key: c.key, label: typeof c.label === 'string' ? c.label.slice(0, 60) : c.key, type };
  if (Number.isFinite(c.width)) out.width = Math.min(800, Math.max(40, c.width));
  if (typeof c.format === 'string' && c.format.length <= 24) out.format = c.format;
  if (['left', 'right', 'center'].includes(c.align)) out.align = c.align;
  if (c.wrap) out.wrap = true;
  if (isObj(c.tones)) {
    out.tones = Object.fromEntries(Object.entries(c.tones).filter(([, t]) => TONES.includes(t)));
  }
  return out;
}

/** Validate and fill defaults. Returns { spec, errors }; spec is null only when nothing usable is left. */
export function normalizeSpec(raw) {
  const errors = [];
  if (!isObj(raw)) return { spec: null, errors: ['a grid spec is a JSON object'] };
  const id = typeof raw.id === 'string' && ID.test(raw.id) ? raw.id : null;
  if (!id) errors.push('id is required (letters, digits, _ . : -)');

  const src = isObj(raw.source) ? raw.source : raw.endpoint ? { endpoint: raw.endpoint, method: raw.method, params: raw.params } : null;
  let source = null;
  if (src && Array.isArray(src.rows)) {
    source = { rows: src.rows.filter(isObj).slice(0, MAX_STATIC_ROWS) };
  } else if (src && safeEndpoint(src.endpoint)) {
    source = {
      endpoint: src.endpoint.trim(),
      method: String(src.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET',
      params: Array.isArray(src.params) ? src.params.filter((p) => isObj(p) && typeof p.name === 'string' && p.name) : [],
      ...(typeof src.rowsPath === 'string' && FIELD.test(src.rowsPath) ? { rowsPath: src.rowsPath } : {}),
    };
  } else {
    errors.push(src?.endpoint ? 'source.endpoint must be a same-origin path or an http(s) URL' : 'source needs an endpoint or rows');
  }
  if (!id || !source) return { spec: null, errors };

  const columns = Array.isArray(raw.columns) ? raw.columns.map((c, i) => cleanColumn(c, errors, i)).filter(Boolean) : null;
  const views = Array.isArray(raw.views) ? raw.views.filter((v) => VIEW_IDS.includes(v)) : VIEW_IDS;
  const live = Array.isArray(raw.live) ? raw.live.filter((v) => LIVE_IDS.includes(v)) : [];
  const filter = isObj(raw.filter)
    ? Object.fromEntries(Object.entries(raw.filter).filter(([k, v]) => FIELD.test(k) && (scalar(v) || (Array.isArray(v) && v.every(scalar)))))
    : null;
  const share = isObj(raw.share) && typeof raw.share.type === 'string' && raw.share.type && raw.share.type.length <= 80 && isObj(raw.share.fields)
    ? { type: raw.share.type, fields: Object.fromEntries(Object.entries(raw.share.fields).filter(([k, v]) => FIELD.test(k) && typeof v === 'string' && FIELD.test(v))) }
    : null;

  const spec = {
    id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 80) : id,
    ...(typeof raw.description === 'string' ? { description: raw.description.slice(0, 300) } : {}),
    source,
    columns: columns && columns.length ? columns : null,
    filter: filter && Object.keys(filter).length ? filter : null,
    views: views.length ? views : ['grid'],
    defaultView: views.includes(raw.defaultView) ? raw.defaultView : (views[0] || 'grid'),
    pivot: isObj(raw.pivot) ? raw.pivot : {},
    chart: isObj(raw.chart) ? raw.chart : {},
    live,
    refreshSeconds: Number.isFinite(raw.refreshSeconds) ? Math.min(3600, Math.max(10, raw.refreshSeconds)) : null,
    share,
    height: raw.height === 'auto' || raw.height === '100%' ? raw.height : Number.isFinite(raw.height) ? Math.min(2000, Math.max(120, raw.height)) : 'auto',
    maxHeight: Number.isFinite(raw.maxHeight) ? Math.min(2000, Math.max(160, raw.maxHeight)) : 520,
    rowHeight: Number.isFinite(raw.rowHeight) ? Math.min(80, Math.max(26, raw.rowHeight)) : 34,
    exportName: typeof raw.exportName === 'string' && ID.test(raw.exportName) ? raw.exportName : id.replace(/[:]/g, '-'),
    edit: normalizeEdit(raw.edit, errors),
  };
  return { spec, errors };
}

/** The values `params[].from` binds to: the console scope plus anything the host adds. */
export function paramContext(scope = {}, extra = {}) {
  return { groupUnit: scope.groupUnit, groupUnitId: scope.groupUnit, cobDate: scope.cobDate, region: scope.region, ...extra };
}

/** The request for a spec in a scope, or null for static rows. */
export function requestFor(spec, context = {}) {
  if (!spec?.source?.endpoint) return null;
  return gridRequestUrl(spec.source.endpoint, spec.source.method, bindGridParams(spec.source.params, context));
}

function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

/** Keep the rows whose fields match every filter entry (a value, or any of a list of values). */
export function applyFilter(rows, filter) {
  if (!filter) return rows;
  const entries = Object.entries(filter);
  return rows.filter((r) => entries.every(([k, want]) => {
    const v = pick(r, k);
    return Array.isArray(want) ? want.some((w) => String(w) === String(v)) : String(want) === String(v);
  }));
}

/** The rows in a response: an array, `rowsPath`, or the usual `rows` / `items` / `data` keys; then the filter. */
export function rowsFrom(payload, spec) {
  let rows = [];
  if (Array.isArray(payload)) rows = payload;
  else if (spec?.source?.rowsPath) rows = pick(payload, spec.source.rowsPath) || [];
  else if (isObj(payload)) rows = payload.rows || payload.items || payload.data || [];
  rows = Array.isArray(rows) ? rows.filter(isObj) : [];
  return applyFilter(rows, spec?.filter);
}

function inferType(key) {
  return STATUS_KEY.test(key) ? 'status' : 'text';
}

/**
 * DataGrid columns for a spec. Spec columns win; else the columns a response declares ([{ key, label }], the
 * outcome.grids contract); else null and the grid generates columns from the rows.
 */
export function gridColumns(spec, payloadColumns = null) {
  const source = spec?.columns
    || (Array.isArray(payloadColumns) && payloadColumns.length
      ? payloadColumns.filter((c) => isObj(c) && typeof c.key === 'string').map((c) => ({ key: c.key, label: c.label || c.key, type: inferType(c.key) }))
      : null);
  if (!source) return null;
  return source.map((c) => {
    const col = { binding: c.key, header: c.label || c.key };
    if (c.width) col.width = c.width;
    if (c.align) col.align = c.align;
    if (c.wrap) col.wrap = true;
    switch (c.type) {
      case 'number': Object.assign(col, { format: c.format || 'n0', align: c.align || 'right' }); break;
      case 'money': Object.assign(col, { format: c.format || 'n2', align: c.align || 'right', mono: true }); break;
      case 'percent': Object.assign(col, { format: c.format || 'n0', align: c.align || 'right', suffix: '%' }); break;
      case 'date': Object.assign(col, { format: c.format || 'yyyy-MM-dd', mono: true }); break;
      case 'datetime': Object.assign(col, { format: c.format || 'yyyy-MM-dd HH:mm', mono: true }); break;
      case 'status': col.pill = true; break;
      case 'chip': col.chip = true; break;
      case 'mono': col.mono = true; break;
      default: if (c.format) col.format = c.format;
    }
    if (c.tones && Object.keys(c.tones).length) {
      const tones = c.tones;
      col.tone = (value) => tones[value] || null;
    }
    return col;
  });
}

/** Turn date / datetime strings into Dates so the grid formats and sorts them as dates. */
export function coerceRows(rows, spec) {
  const dated = (spec?.columns || []).filter((c) => c.type === 'date' || c.type === 'datetime').map((c) => c.key);
  if (!dated.length) return rows;
  return rows.map((r) => {
    const out = { ...r };
    for (const k of dated) {
      if (typeof out[k] === 'string' && out[k]) {
        const d = new Date(out[k]);
        if (!Number.isNaN(d.getTime())) out[k] = d;
      }
    }
    return out;
  });
}

/** The FDC3 context a picked row shares, or null when the spec shares nothing. */
export function shareContext(spec, row) {
  if (!spec?.share || !row) return null;
  const ctx = { type: spec.share.type };
  for (const [field, from] of Object.entries(spec.share.fields)) {
    const v = pick(row, from);
    if (v != null && v !== '') ctx[field] = v instanceof Date ? v.toISOString() : v;
  }
  return Object.keys(ctx).length > 1 ? ctx : null;
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** A spec (or any small JSON object, like a view's config) as a URL-safe string: /widget/grid?def=…, <ofx-grid def>. */
export function encodeJson(value) {
  return toBase64Url(JSON.stringify(value));
}

/** Back to an object, or null for anything that is not an encoded JSON object. */
export function decodeJson(text) {
  if (typeof text !== 'string' || !text || text.length > 40_000) return null;
  try {
    const obj = JSON.parse(fromBase64Url(text));
    return isObj(obj) ? obj : null;
  } catch {
    return null;
  }
}
