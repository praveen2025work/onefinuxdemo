// Helpers behind the standard DataView (grid / pivot / chart). Pure: node --test loads this file.

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Split the fields of `rows` into numeric and text (dimensions), by the first non-empty value seen. */
export function fieldKinds(rows = [], limit = 50) {
  const kinds = new Map();
  for (const row of rows.slice(0, limit)) {
    if (!row || typeof row !== 'object') continue;
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('_') || value == null || value === '' || kinds.has(key)) continue;
      if (isNumber(value)) kinds.set(key, 'number');
      else if (typeof value === 'string' || typeof value === 'boolean') kinds.set(key, 'text');
    }
  }
  const numeric = [];
  const text = [];
  kinds.forEach((kind, key) => (kind === 'number' ? numeric : text).push(key));
  return { numeric, text };
}

/**
 * Group rows by `category` and aggregate `value` (sum | avg | min | max | count). Without a value field the
 * aggregate is a count. Result: [{ name, value }] in first-seen order, which keeps time series in order.
 */
export function aggregateBy(rows = [], category, value, op = 'sum') {
  const groups = new Map();
  for (const row of rows) {
    const key = row?.[category] == null || row[category] === '' ? '—' : String(row[category]);
    if (!groups.has(key)) groups.set(key, []);
    const v = value ? Number(row?.[value]) : 1;
    if (Number.isFinite(v)) groups.get(key).push(v);
  }
  const reduce = (vals) => {
    if (!value || op === 'count') return vals.length;
    if (!vals.length) return 0;
    if (op === 'avg') return vals.reduce((a, b) => a + b, 0) / vals.length;
    if (op === 'min') return Math.min(...vals);
    if (op === 'max') return Math.max(...vals);
    return vals.reduce((a, b) => a + b, 0);
  };
  return [...groups.entries()].map(([name, vals]) => ({ name, value: Math.round(reduce(vals) * 100) / 100 }));
}

/**
 * Find the Wijmo pivot field for a GridSpec name.
 * PivotField.key is the header ("Region", "Slice Key"), while specs and row objects use the binding
 * ("region", "sliceKey"). Either form is accepted.
 */
export function resolvePivotField(fields, name) {
  if (!fields || name == null || name === '') return null;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field && (field.binding === name || field.header === name || field.key === name)) return field;
  }
  return null;
}

/** Rows a grid can export or chart: plain objects only, private (_x) fields dropped. */
export function plainRows(rows = []) {
  return rows.filter((r) => r && typeof r === 'object').map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) if (!k.startsWith('_')) out[k] = v;
    return out;
  });
}
