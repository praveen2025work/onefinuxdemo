import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE_GROUPS, SHELL_TOKENS, TEMPLATES, TYPE_STEPS } from './standards.js';
import { SKINS, palette } from './tokens.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(here, '../../../theme/onefinux-tokens.css'), 'utf8');

test('every palette token on the page is defined in every skin', () => {
  for (const skin of SKINS) {
    const p = palette(css, skin, 'light');
    for (const g of PALETTE_GROUPS) for (const [token] of g.tokens) assert.ok(p[token], `${skin}: ${token}`);
  }
});

test('type steps and shell metrics on the page are the values in the standard', () => {
  for (const s of TYPE_STEPS) assert.match(css, new RegExp(`${s.token}: ${s.px}px;`), s.token);
  for (const [token, value] of SHELL_TOKENS) assert.match(css, new RegExp(`${token}: ${value};`), token);
});

test('every .ofx-* class a page template uses exists in the standard', () => {
  const defined = new Set([...css.matchAll(/\.(ofx-[a-z0-9-]+)/g)].map((m) => m[1]));
  for (const t of TEMPLATES) {
    const used = [...t.html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('ofx-'));
    assert.ok(used.length > 3, `${t.id} uses the kit`);
    for (const c of used) assert.ok(defined.has(c), `${t.id}: .${c} is not in onefinux-tokens.css`);
  }
});

test('templates carry no colour or font size of their own', () => {
  for (const t of TEMPLATES) {
    assert.doesNotMatch(t.html, /style=|#[0-9a-f]{3,6}\b|\d+px/i, t.id);
  }
});
