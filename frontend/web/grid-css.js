// The <ofx-grid> library's stylesheet, generated from the console's own CSS so there is one source of truth.
// Rules that style the grid components (DataGrid, DataView, Chart, PivotView, Select) are scoped under `ofx-grid`,
// so nothing leaks into the host page; the dropdown menu (rendered into <body>) keeps its namespaced sel2-* classes;
// page-level rules (html, body, the shell) are dropped. Wijmo's CSS and the One Finance tokens are prepended.

import fs from 'node:fs';
import path from 'node:path';

// Classes the grid components render, plus the state / tone classes they combine with.
const GRID_CLASSES = new Set([
  'btn', 'ghost', 'sm', 'on', 'cell-mono', 'datagrid', 'dataview', 'fill', 'icn', 'mono', 'muted', 'sec', 'seg', 'spacer',
  'spin-ic', 'static', 'search-inp', 'wijmo-host', 'tile-empty', 'flip', 'open', 'pill', 'chip',
  'ok', 'warn', 'fail', 'info', 'plain', 'bo',
]);
const GRID_PREFIXES = ['dg-', 'pivot', 'sel2', 'wj-'];
const PORTAL_CLASSES = ['sel2-menu', 'sel2-opt', 'sel2-empty'];
const KEEP_KEYFRAMES = new Set(['spin360', 'fade']);

function gridClass(name) {
  return GRID_CLASSES.has(name) || GRID_PREFIXES.some((p) => name.startsWith(p));
}

/** Split a CSS text into top-level blocks: { prelude, body } (body without the outer braces). */
export function blocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let depth = 0;
  let start = 0;
  let open = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) open = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        out.push({ prelude: text.slice(start, open).trim(), body: text.slice(open + 1, i) });
        start = i + 1;
      }
    } else if (ch === ';' && depth === 0) {
      start = i + 1; // a top-level statement such as @import: dropped
    }
  }
  return out;
}

function splitSelectors(prelude) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of prelude) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** One selector, scoped; or null when it does not style the grid components. */
export function scopeSelector(selector, scope) {
  const classes = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  if (!classes.length || !classes.every(gridClass) || !classes.some((c) => !['on', 'open', 'flip', 'ok', 'warn', 'fail', 'info', 'plain', 'bo', 'sm', 'ghost', 'fill', 'static'].includes(c))) return null;
  if (/^(html|body|:root|\*)\b/.test(selector) && !/^html\[/.test(selector)) return null;
  // Skin / theme variants: the console sets these on <html>; on a host page the element carries them.
  const themed = selector.match(/^(?:html)?((?:\[[^\]]+\])+)\s+(.*)$/);
  if (themed) return `${scope}${themed[1]} ${themed[2]}`;
  const first = selector.split(/[\s>+~]/)[0];
  if (PORTAL_CLASSES.some((c) => first.includes('.' + c))) return selector;
  return `${scope} ${selector}`;
}

function scopeRules(css, scope) {
  const out = [];
  for (const { prelude, body } of blocks(css)) {
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
      const inner = scopeRules(body, scope);
      if (inner) out.push(`${prelude} {\n${inner}\n}`);
    } else if (prelude.startsWith('@keyframes')) {
      if (KEEP_KEYFRAMES.has(prelude.split(/\s+/)[1])) out.push(`${prelude} {${body}}`);
    } else if (prelude === ':root') {
      // The console's aliases (--surface: var(--ofx-card), …), on the element and on the dropdown in <body>.
      out.push(`${scope}, .sel2-menu {${body}}`);
    } else if (!prelude.startsWith('@')) {
      const kept = splitSelectors(prelude).map((s) => scopeSelector(s, scope)).filter(Boolean);
      if (kept.length) out.push(`${kept.join(',\n')} {${body}}`);
    }
  }
  return out.join('\n');
}

/** The console stylesheet reduced to the grid components, scoped under `scope`. */
export function scopeGridCss(css, { scope = 'ofx-grid' } = {}) {
  const base = `${scope} { display: block; font-family: var(--ofx-font); font-size: 13px; color: var(--ink); }\n`
    + `${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: border-box; }\n`;
  return base + scopeRules(css, scope);
}

/** Vite plugin for the library build: emits onefinux-grid.css next to onefinux-grid.js. */
export function gridCssPlugin({ webRoot, themeDir }) {
  const read = (p) => fs.readFileSync(p, 'utf8');
  return {
    name: 'ofx-grid-css',
    generateBundle() {
      const source = [
        '/* One Finance grid (<ofx-grid>): Wijmo, the design tokens, the shared Wijmo skin, and the grid components. */',
        read(path.resolve(webRoot, 'node_modules/@mescius/wijmo.styles/wijmo.css')),
        read(path.resolve(themeDir, 'onefinux-tokens.css')),
        read(path.resolve(themeDir, 'onefinux-wijmo.css')),
        scopeGridCss(read(path.resolve(webRoot, 'src/styles.css'))),
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'onefinux-grid.css', source });
    },
  };
}
