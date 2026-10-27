// Propose a GridSpec from a bound source sample. Pure: runs in the browser (and under node --test);
// sample rows never leave the console. Infers column types, a sensible pivot and a chart default.

import { fieldKinds } from '../lib/aggregate.js';

const STATUS_KEY = /(^|_)(status|state|severity|stage|kind|transition)$/i;
const MONEY_KEY = /(amount|balance|pnl|exposure|notional|value|price|cost|fee|call)/i;
const PCT_KEY = /(pct|percent|ratio|hedge|completion)$/i;
const DATE_KEY = /(^|_)(date|at|time|timestamp|deadline|cob|updated|created)(_|$)/i;
const CHIP_KEY = /(^|_)(kit|region|currency|feed|severity)([A-Z_]|$)/i;
const MONO_KEY = /(^|_)(id|key|code|ref|slice)([A-Z_]|$)/i;
const BOOL_KEY = /^(is|has|can)[A-Z_]|(_flag|_yn)$/i;
const ID = /^[A-Za-z0-9_.:-]{1,80}$/;
const FIELD = /^[A-Za-z_$][A-Za-z0-9_$.]{0,63}$/;

function labelOf(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);
}

function samplesFor(rows, key, limit = 40) {
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const v = row[key];
    if (v == null || v === '') continue;
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

/** Infer a GridSpec column type from the field name and a few sample values. */
export function inferColumnType(key, sampleValues = []) {
  if (STATUS_KEY.test(key)) return 'status';
  if (BOOL_KEY.test(key) || sampleValues.every((v) => typeof v === 'boolean')) return 'bool';
  if (MONEY_KEY.test(key)) return 'money';
  if (PCT_KEY.test(key)) return 'percent';
  if (DATE_KEY.test(key) || sampleValues.some((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))) return 'date';
  if (CHIP_KEY.test(key)) return 'chip';
  if (MONO_KEY.test(key)) return 'mono';
  if (sampleValues.length && sampleValues.every((v) => typeof v === 'number' && Number.isFinite(v))) return 'number';
  return 'text';
}

/** Columns for a GridSpec from sample rows (first non-private fields seen). */
export function proposeColumns(rows = [], limit = 50) {
  const seen = new Set();
  const columns = [];
  for (const row of rows.slice(0, limit)) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      if (key.startsWith('_') || seen.has(key) || !FIELD.test(key)) continue;
      seen.add(key);
      const type = inferColumnType(key, samplesFor(rows, key));
      const col = { key, label: labelOf(key), type };
      if (type === 'money' || type === 'number' || type === 'percent') col.width = type === 'money' ? 130 : 80;
      if (type === 'status' || type === 'chip' || type === 'mono' || type === 'date') col.width = type === 'date' ? 110 : 100;
      columns.push(col);
    }
  }
  return columns;
}

/** A default pivot from inferred column kinds. */
export function proposePivot(columns = []) {
  const dims = columns.filter((c) => ['text', 'chip', 'status', 'mono'].includes(c.type)).map((c) => c.key);
  const vals = columns.filter((c) => ['number', 'money', 'percent'].includes(c.type)).map((c) => c.key);
  if (!dims.length && !vals.length) return null;
  return {
    rowFields: dims.slice(0, 1),
    columnFields: dims.slice(1, 2),
    valueFields: vals.slice(0, 1),
  };
}

/** A default chart from inferred column kinds. */
export function proposeChart(columns = []) {
  const dims = columns.filter((c) => ['text', 'chip', 'status', 'mono'].includes(c.type)).map((c) => c.key);
  const vals = columns.filter((c) => ['number', 'money', 'percent'].includes(c.type)).map((c) => c.key);
  if (dims[0] && vals[0]) return { x: dims[0], y: vals[0], op: 'sum', type: 'column' };
  if (dims[0]) return { x: dims[0], op: 'count', type: 'column' };
  return null;
}

/**
 * Build a GridSpec draft from a source binding and optional sample rows.
 * Returns { spec, errors }. The caller confirms and saves; nothing is posted to the hub.
 */
export function proposeSpec({
  id, title, description, endpoint, method = 'GET', params = [], rows = [], live = [],
} = {}) {
  const errors = [];
  if (typeof id !== 'string' || !ID.test(id)) errors.push('id is required (letters, digits, _ . : -)');
  if (typeof endpoint !== 'string' || !endpoint.trim() || endpoint.trim().startsWith('//')) {
    errors.push('endpoint must be a same-origin path or an http(s) URL');
  }
  const sample = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : [];
  const columns = proposeColumns(sample);
  if (!columns.length && sample.length === 0) errors.push('paste or fetch a few sample rows so columns can be inferred');
  if (errors.length) return { spec: null, errors };

  const kinds = fieldKinds(sample);
  const pivot = proposePivot(columns);
  const chart = proposeChart(columns);
  const statusCol = columns.find((c) => c.type === 'status');

  const spec = {
    id,
    title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : id,
    description: typeof description === 'string' ? description.slice(0, 240) : undefined,
    source: {
      endpoint: endpoint.trim(),
      method: String(method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET',
      params: Array.isArray(params) ? params : [],
    },
    columns: columns.length ? columns : undefined,
    views: ['grid', 'pivot', 'chart'],
    ...(pivot ? { pivot } : {}),
    ...(chart ? { chart } : {}),
    ...(Array.isArray(live) && live.length ? { live: live.filter(Boolean) } : {}),
  };
  if (statusCol && kinds.text.includes(statusCol.key)) {
    spec.chart = spec.chart || { x: statusCol.key, op: 'count', type: 'column' };
  }
  if (!spec.description) delete spec.description;
  if (!spec.columns) delete spec.columns;
  return { spec, errors: [] };
}
