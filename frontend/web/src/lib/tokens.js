// Read the design standard (frontend/theme/onefinux-tokens.css) as data: each skin and mode resolved to its --ofx-*
// palette, plus WCAG contrast helpers. Used by tokens.test.js (contrast and completeness gates) and by the
// Design standard page (/standards) to list the palette. Pure functions; no DOM.

export const SKINS = ['barclays', 'steps', 'ofx'];
export const MODES = ['light', 'dark'];

/** Top-level rule blocks of a CSS text: [{ selectors: [...], body }]. Comments removed; nested @media skipped. */
export function ruleBlocks(css) {
  const text = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const prelude = text.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth) { if (text[j] === '{') depth += 1; else if (text[j] === '}') depth -= 1; j += 1; }
    if (!prelude.startsWith('@')) out.push({ selectors: prelude.split(',').map((s) => s.trim().replace(/\s+/g, ' ')), body: text.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/** --name: value declarations of a block body. */
export function declarations(body) {
  const out = {};
  for (const m of String(body).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[m[1]] = m[2].trim();
  return out;
}

/** The selectors that paint <html data-skin=skin data-theme=mode>, in cascade order (lowest specificity first). */
function selectorsFor(skin, mode) {
  const s = [':root', `html[data-skin="${skin}"]`];
  if (mode === 'dark') s.push(`html[data-skin="${skin}"][data-theme="dark"]`);
  if (mode === 'light') s.push(`html[data-skin="${skin}"][data-theme="light"]`);
  return s;
}

/** The --ofx-* palette for one skin and mode, var() references resolved where they point at another token. */
export function palette(css, skin, mode) {
  const blocks = ruleBlocks(css);
  const wanted = selectorsFor(skin, mode);
  const vars = {};
  for (const sel of wanted) {
    for (const b of blocks) if (b.selectors.includes(sel)) Object.assign(vars, declarations(b.body));
  }
  const resolve = (v, depth = 0) => {
    const m = /^var\((--[a-z0-9-]+)\)$/.exec(String(v));
    return m && depth < 8 && vars[m[1]] != null ? resolve(vars[m[1]], depth + 1) : v;
  };
  return Object.fromEntries(Object.entries(vars).filter(([k]) => k.startsWith('--ofx-')).map(([k, v]) => [k, resolve(v)]));
}

const hexRgb = (h) => {
  const s = String(h).trim().replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

export const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v).trim());

function luminance(hex) {
  const [r, g, b] = hexRgb(hex).map((c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio of two #hex colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** color-mix(in srgb, a p%, b) for #hex colours. */
export function mix(a, b, p) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v * p + B[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
}
