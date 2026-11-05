// UI parity rules shared by the audit runner (parity/run.mjs) and its unit tests. Pure functions, no browser.
//
// The reference is STEPS v3: its text sits on the Tailwind scale (text-xs 12, text-sm 14, text-base 16, text-lg 18,
// text-xl 20, text-2xl 24, text-3xl 30) plus the 10px / 11px badge sizes it uses. One Finance, MITR AI and every
// partner screen paint text from the same steps (--ofx-text-* in frontend/theme/onefinux-tokens.css).

/** Every font size (px) a screen may render. */
export const TYPE_SCALE = [10, 11, 12, 14, 16, 18, 20, 24, 30, 36];

/** Grid cells keep the grid standard (--ofx-grid-fs); allowed only inside a data grid (Wijmo, or a table styled as one). */
export const GRID_SIZES = [13];

/** Share of rendered characters that must sit on the scale for a page to pass. */
export const MIN_CONFORMANCE = 0.98;

const px = (v) => (typeof v === 'number' ? v : parseFloat(String(v)));

/** True when a computed font size is a scale step (half-pixel tolerance for sub-pixel rounding). */
export function onScale(size, { inGrid = false } = {}) {
  const n = px(size);
  if (!Number.isFinite(n)) return false;
  const allowed = inGrid ? TYPE_SCALE.concat(GRID_SIZES) : TYPE_SCALE;
  return allowed.some((s) => Math.abs(s - n) < 0.26);
}

/** The scale step a size should move to (ties go up, towards STEPS' 14px body text). */
export function snap(size) {
  const n = px(size);
  let best = TYPE_SCALE[0];
  for (const s of TYPE_SCALE) if (Math.abs(s - n) < Math.abs(best - n) || (Math.abs(s - n) === Math.abs(best - n) && s > best)) best = s;
  return best;
}

/**
 * Character-weighted histogram → conformance summary.
 * hist: { "14px": { chars, grid } } where grid counts the characters rendered inside a Wijmo control.
 */
export function conformance(hist) {
  let total = 0;
  let good = 0;
  const off = [];
  for (const [size, { chars = 0, grid = 0 } = {}] of Object.entries(hist || {})) {
    total += chars;
    const plain = chars - grid;
    const ok = (onScale(size) ? plain : 0) + (onScale(size, { inGrid: true }) ? grid : 0);
    good += ok;
    if (ok < chars) off.push({ size, chars: chars - ok, snapTo: snap(size) });
  }
  off.sort((a, b) => b.chars - a.chars);
  return { total, ratio: total ? good / total : 1, off };
}

/** The size most text is set in (the body size of the page). */
export function dominantSize(hist) {
  let best = null;
  for (const [size, { chars = 0 } = {}] of Object.entries(hist || {})) if (!best || chars > best.chars) best = { size, chars };
  return best ? best.size : null;
}

/** Normalise a computed colour so rgb()/rgba()/color(srgb …) compare equal. */
export function normColor(c) {
  const s = String(c || '').trim();
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [m[1], m[2], m[3]].map((v) => Math.round(parseFloat(v))).join(',') + (a < 1 ? `/${Math.round(a * 100) / 100}` : '');
  }
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(s);
  if (m) {
    const a = m[4] == null ? 1 : parseFloat(m[4]);
    return [m[1], m[2], m[3]].map((v) => Math.round(parseFloat(v) * 255)).join(',') + (a < 1 ? `/${Math.round(a * 100) / 100}` : '');
  }
  return s;
}

/** First family of a font-family list, unquoted and lower-case. */
export function firstFamily(list) {
  return String(list || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
}

/**
 * Compare one role's measured metrics with the reference's.
 * rule: { props: [...], heights?: [32, 36], pairs?: [[36, 14], [32, 12]] }
 *   heights lists the sizes STEPS itself uses for that control; pairs lists STEPS' (height px, text px) sizes for
 *   it (Button default h-9 text-sm, sm h-8 text-xs …), so height and text size must match one STEPS size together.
 * Returns [{ prop, ref, got, ok }].
 */
export function compareRole(ref, got, rule = {}) {
  const out = [];
  if (!ref || !got) return out;
  const pairOk = Array.isArray(rule.pairs) && rule.pairs.some(([h, fs]) => Math.abs(px(got.height) - h) <= 1 && Math.abs(px(got.fontSize) - fs) <= 0.5);
  for (const prop of rule.props || []) {
    const a = ref[prop];
    const b = got[prop];
    let ok;
    if ((prop === 'height' || prop === 'fontSize') && Array.isArray(rule.pairs)) ok = pairOk;
    else if (prop === 'height' && Array.isArray(rule.heights)) ok = rule.heights.some((h) => Math.abs(px(b) - h) <= 1);
    else if (/color/i.test(prop)) ok = normColor(a) === normColor(b);
    else if (prop === 'borderRadius' && px(a) >= 100 && px(b) >= 100) ok = true; // both fully round (a pill)
    else if (prop === 'platformFont' || prop === 'fontFamily') ok = String(a || '').toLowerCase() === String(b || '').toLowerCase();
    else if (Number.isFinite(px(a)) && Number.isFinite(px(b))) ok = Math.abs(px(a) - px(b)) <= (prop === 'height' ? 1 : 0.26);
    else ok = String(a) === String(b);
    out.push({ prop, ref: a, got: b, ok });
  }
  return out;
}
