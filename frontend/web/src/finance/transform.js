// Blueprint → tiles. A JavaScript port of STEPS lib/generic-transformer.ts, plus two additions the hub data
// needs: `computed` fields on a data source (pct:a/b) and `aggregate: 'count'` on a slide mapping.
// Pure functions: node --test loads this file.
//
// Data shapes per chart type (consumed by TileContent.jsx):
//   bar / line / area : { name, [series.field]: number }
//   pie               : { name, [valueField]: number }
//   grid              : row objects (rowTransform applied)
//   progress          : { name, value: number 0–100 }
//   status            : { name, value: string, status: success|warning|error|info }

export const CHART = {
  bar: 'bar', line: 'line', area: 'area', pie: 'pie', grid: 'grid', progress: 'progress', status: 'status', text: 'text',
};

/** Apply a data source's `computed` map, e.g. { completionPct: 'pct:completedKeys/totalKeys' }. */
export function applyComputed(rows, computed) {
  if (!computed || !Array.isArray(rows)) return rows;
  return rows.map((row) => {
    const out = { ...row };
    for (const [field, expr] of Object.entries(computed)) {
      const m = /^pct:(\w+)\/(\w+)$/.exec(String(expr));
      if (m) {
        const num = Number(row[m[1]]);
        const den = Number(row[m[2]]);
        out[field] = den > 0 && Number.isFinite(num) ? Math.round((num / den) * 100) : 0;
      }
    }
    return out;
  });
}

/** "match=>result|*=>default" on one field value. */
export function applyRowTransform(transforms, field, value) {
  if (!transforms || !transforms[field]) return String(value ?? '');
  const str = String(value ?? '');
  for (const rule of transforms[field].split('|')) {
    const [match, result] = rule.split('=>');
    if (result === undefined) continue;
    if (match === '*' || match === str) return result;
  }
  return str;
}

/**
 * Status rule expressions: always | allEqual:X | someEqual:X | someNotEqual:X | lastGte:N | lastLt:N
 */
export function evaluateExpression(expr, field, data) {
  if (expr === 'always') return true;
  const [op, ...rest] = String(expr).split(':');
  const val = rest.join(':');
  const last = data[data.length - 1];
  switch (op) {
    case 'allEqual': return data.every((r) => String(r?.[field]) === val);
    case 'someNotEqual': return data.some((r) => String(r?.[field]) !== val);
    case 'someEqual': return data.some((r) => String(r?.[field]) === val);
    case 'lastGte': return last != null && Number(last[field]) >= Number(val);
    case 'lastLt': return last != null && Number(last[field]) < Number(val);
    default: return false;
  }
}

export function deriveStatus(rule, data) {
  if (!rule) return 'info';
  if (!data.length) return rule.default || 'info';
  if (rule.errorWhen && evaluateExpression(rule.errorWhen, rule.field, data)) return 'error';
  if (rule.warningWhen && evaluateExpression(rule.warningWhen, rule.field, data)) return 'warning';
  if (rule.successWhen && evaluateExpression(rule.successWhen, rule.field, data)) return 'success';
  return rule.default || 'info';
}

export function deriveAlert(rule, data) {
  if (!rule?.alertWhen || !data.length) return false;
  return evaluateExpression(rule.alertWhen, rule.field, data);
}

function statusValue(row, field) {
  if (!field) return '';
  const val = row[field];
  const unit = row.unit;
  if (unit == null) return String(val ?? '');
  if (unit === '$M') return `$${val}M`;
  if (unit === '$B') return `$${val}B`;
  if (unit === '%') return `${val}%`;
  return `${val}${unit}`;
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(row?.[field] ?? '—');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

function bucketPie(rows, valueField) {
  const buckets = ['Equities', 'Fixed Income', 'Commodities', 'FX'];
  const total = rows.reduce((s, r) => s + Math.abs(Number(r.actual ?? r[valueField] ?? 0)), 0) || 1;
  return buckets.map((name, i) => ({
    name,
    [valueField]: Math.round((Math.abs(Number(rows[i % rows.length]?.actual ?? rows[i % rows.length]?.[valueField] ?? 0)) / total) * 100),
  }));
}

function buildSlide(def, rows) {
  const m = def.mapping || { nameField: 'name', series: [] };
  const valueField = m.series?.[0]?.field || 'value';
  let data;
  let series;
  switch (def.chartType) {
    case CHART.status:
      data = rows.map((row) => {
        const raw = row[valueField];
        const transformed = applyRowTransform(m.rowTransform, valueField, raw);
        const status = transformed !== String(raw ?? '') ? transformed : (row.status || 'info');
        return { name: row[m.nameField], value: statusValue(row, valueField), status };
      });
      break;
    case CHART.grid:
      data = m.rowTransform
        ? rows.map((row) => {
          const out = { ...row };
          for (const field of Object.keys(m.rowTransform)) if (field in out) out[field] = applyRowTransform(m.rowTransform, field, out[field]);
          return out;
        })
        : rows;
      break;
    case CHART.progress:
      data = rows.map((row) => ({ name: row[m.nameField], value: Number.isFinite(Number(row[valueField])) ? Number(row[valueField]) : 0 }));
      break;
    case CHART.pie:
      if (m.aggregate === 'count') data = countBy(rows, m.nameField);
      else if (m.nameField === '_derived_bucket') data = bucketPie(rows, valueField);
      else data = rows.map((row) => ({ name: row[m.nameField], [valueField]: Number(row[valueField]) || 0 }));
      series = [{ key: m.aggregate === 'count' ? 'value' : valueField, name: m.series?.[0]?.label }];
      break;
    case CHART.bar:
    case CHART.line:
    case CHART.area:
      if (m.aggregate === 'count') {
        data = countBy(rows, m.nameField);
        series = [{ key: 'value', name: m.series?.[0]?.label || 'Count', color: m.series?.[0]?.color }];
      } else {
        data = rows.map((row) => {
          const point = { name: row[m.nameField] };
          for (const s of m.series || []) point[s.field] = Number(row[s.field]);
          return point;
        });
        series = (m.series || []).map((s) => ({ key: s.field, name: s.label || s.field, color: s.color }));
      }
      break;
    default:
      data = rows;
  }
  return { id: def.id, title: def.title, chartType: def.chartType, source: def.source, columns: def.columns, data, series };
}

function statusRows(tileDef, raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    for (const slide of tileDef.slides) if (slide.dataKey && Array.isArray(raw[slide.dataKey])) return raw[slide.dataKey];
    for (const key of ['indicators', 'metrics', 'data', 'items', 'rows']) if (Array.isArray(raw[key])) return raw[key];
  }
  return [];
}

/** One tile from its blueprint definition and the raw response of its data source. */
export function transformTile(tileDef, raw, now = new Date()) {
  const array = Array.isArray(raw) ? raw : [];
  const obj = !Array.isArray(raw) && raw && typeof raw === 'object' ? raw : null;
  const rowsForStatus = statusRows(tileDef, raw);
  const slides = tileDef.slides.map((def) => {
    let rows;
    if (Array.isArray(def.staticData) && def.staticData.length) rows = def.staticData;
    else if (def.dataKey && obj) rows = Array.isArray(obj[def.dataKey]) ? obj[def.dataKey] : array;
    else rows = array;
    const limit = def.mapping?.rowLimit;
    if (limit) rows = limit < 0 ? rows.slice(limit) : rows.slice(0, limit);
    return buildSlide(def, rows);
  });
  return {
    id: tileDef.id,
    title: tileDef.title,
    description: tileDef.description,
    group: tileDef.group || 'finance',
    ...(typeof tileDef.gridSpecId === 'string' && tileDef.gridSpecId ? { gridSpecId: tileDef.gridSpecId } : {}),
    status: deriveStatus(tileDef.statusRule, rowsForStatus),
    alert: deriveAlert(tileDef.statusRule, rowsForStatus),
    lastUpdated: now.toLocaleTimeString('en-GB'),
    slides,
  };
}

/** "{{cobDate}}" → value from the runtime context. */
export function resolveTemplate(template, context) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (context[key] == null ? '' : String(context[key])));
}

/** Tabs filter tiles: tileIds 'all' | [ids] | { group }. */
export function tilesForTab(tab, tiles) {
  if (!tab || tab.tileIds === 'all') return tiles;
  if (Array.isArray(tab.tileIds)) return tiles.filter((t) => tab.tileIds.includes(t.id));
  if (tab.tileIds && tab.tileIds.group) return tiles.filter((t) => t.group === tab.tileIds.group);
  return tiles;
}

/** Least-squares line through the last points, projected `ahead` steps. Advisory only — never readiness. */
export function linearForecast(values, ahead = 5) {
  const ys = values.map(Number).filter(Number.isFinite);
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, next: [] };
  const xs = ys.map((_, i) => i);
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const next = Array.from({ length: ahead }, (_, k) => +(intercept + slope * (n + k)).toFixed(2));
  return { slope: +slope.toFixed(4), intercept: +intercept.toFixed(2), next };
}
