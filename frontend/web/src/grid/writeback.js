// Tabular write-back for a GridSpec. A spec's `edit` block names the row key, the editable columns and their rules,
// whether a second person must approve (maker-checker), and the hub target that owns the data. Edits go to the hub
// as one change set (/api/writeback/<spec id>); the hub audits, routes for approval and applies. Pure.

const FIELD = /^[A-Za-z_][A-Za-z0-9_.]{0,63}$/;
const TARGET = /^[A-Za-z0-9_-]{1,40}$/;
export const EDIT_TYPES = ['text', 'number', 'date', 'option'];

/**
 * {key, columns: [{key, type, options, required, min, max, maxLength, pattern}], approval, target} → a clean edit
 * block, or null with errors. approval defaults to maker-checker: an edit is applied only after someone else
 * approves it, unless the spec says "none".
 */
export function normalizeEdit(raw, errors = []) {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) { errors.push('edit must be an object'); return null; }
  if (typeof raw.key !== 'string' || !FIELD.test(raw.key)) { errors.push('edit.key names the row key field'); return null; }
  const columns = (Array.isArray(raw.columns) ? raw.columns : [])
    .map((c) => (typeof c === 'string' ? { key: c } : c))
    .filter((c) => c && typeof c.key === 'string' && FIELD.test(c.key) && c.key !== raw.key)
    .map((c) => {
      const type = EDIT_TYPES.includes(c.type) ? c.type : Array.isArray(c.options) ? 'option' : 'text';
      const rule = { key: c.key, type };
      if (type === 'option') rule.options = (Array.isArray(c.options) ? c.options : []).filter((o) => typeof o === 'string' && o.length <= 60).slice(0, 50);
      if (c.required) rule.required = true;
      if (type === 'number' && Number.isFinite(c.min)) rule.min = c.min;
      if (type === 'number' && Number.isFinite(c.max)) rule.max = c.max;
      rule.maxLength = Number.isFinite(c.maxLength) ? Math.min(400, Math.max(1, c.maxLength)) : 400;
      if (typeof c.pattern === 'string' && c.pattern.length <= 120) {
        try { new RegExp(c.pattern); rule.pattern = c.pattern; } catch { errors.push(`edit.columns.${c.key}.pattern is not a valid pattern`); }
      }
      return rule;
    });
  if (!columns.length) { errors.push('edit.columns lists at least one editable column'); return null; }
  return {
    key: raw.key,
    columns,
    approval: raw.approval === 'none' ? 'none' : 'maker-checker',
    ...(typeof raw.target === 'string' && TARGET.test(raw.target) ? { target: raw.target } : {}),
  };
}

/** Why a value is not allowed in a cell, or null when it is. */
export function validateCell(rule, value) {
  if (!rule) return 'this column is not editable';
  const empty = value == null || value === '';
  if (empty) return rule.required ? 'a value is required' : null;
  const s = String(value);
  if (s.length > rule.maxLength) return `at most ${rule.maxLength} characters`;
  if (rule.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'a number is required';
    if (rule.min != null && n < rule.min) return `at least ${rule.min}`;
    if (rule.max != null && n > rule.max) return `at most ${rule.max}`;
  }
  if (rule.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'a date as YYYY-MM-DD';
  if (rule.type === 'option' && rule.options.length && !rule.options.includes(s)) return `one of ${rule.options.join(', ')}`;
  if (rule.pattern && !new RegExp(rule.pattern).test(s)) return 'not in the expected format';
  return null;
}

/** Record one cell edit in the dirty map ({rowKey: {column: {before, after}}}). Editing back to the original drops it. */
export function recordEdit(dirty, rowKey, column, before, after) {
  const next = { ...dirty };
  const row = { ...(next[rowKey] || {}) };
  const original = row[column] ? row[column].before : before;
  if (String(original ?? '') === String(after ?? '')) delete row[column];
  else row[column] = { before: original ?? null, after: after ?? null };
  if (Object.keys(row).length) next[rowKey] = row; else delete next[rowKey];
  return next;
}

/** The dirty map as the hub's change list. */
export function changesOf(dirty) {
  return Object.entries(dirty).flatMap(([key, cols]) => Object.entries(cols).map(([column, v]) => ({ key, column, before: v.before, after: v.after })));
}

/** Rows with applied values laid over them ({rowKey: {column: value}} from the hub). */
export function applyOverlay(rows, overlay, key) {
  if (!overlay || !key || !Object.keys(overlay).length) return rows;
  return rows.map((r) => (overlay[r[key]] ? { ...r, ...overlay[r[key]] } : r));
}
