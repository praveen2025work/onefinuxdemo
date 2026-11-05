import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, SKINS, contrast, isHex, mix, palette, ruleBlocks } from './tokens.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(here, '../../../theme/onefinux-tokens.css'), 'utf8');
const wijmo = fs.readFileSync(path.resolve(here, '../../../theme/onefinux-wijmo.css'), 'utf8');

const AA = 4.5;
const PALETTE = ['--ofx-page', '--ofx-card', '--ofx-surface-2', '--ofx-surface-3', '--ofx-line', '--ofx-line-2', '--ofx-ink', '--ofx-ink-2',
  '--ofx-ink-3', '--ofx-accent', '--ofx-accent-2', '--ofx-on-accent', '--ofx-ok', '--ofx-warn', '--ofx-fail', '--ofx-gold', '--ofx-navy',
  '--ofx-sky', '--ofx-nav-on', '--ofx-chart-1', '--ofx-chart-2', '--ofx-chart-3', '--ofx-chart-4', '--ofx-chart-5', '--ofx-chart-6'];

test('Barclays is the default skin: bare :root paints Royal Blue on the Barclays neutrals', () => {
  const p = palette(css, 'barclays', 'light');
  assert.equal(p['--ofx-accent'], '#006de3');
  assert.equal(p['--ofx-page'], '#f6f6f6');
  assert.equal(p['--ofx-navy'], '#1a2142');
  assert.equal(p['--ofx-sky'], '#00aeef');
  const root = ruleBlocks(css).find((b) => b.selectors.includes(':root') && b.selectors.includes('html[data-skin="barclays"]'));
  assert.ok(root, 'the default block is shared by :root and html[data-skin="barclays"]');
});

test('every skin and mode defines the whole palette as #hex', () => {
  for (const skin of SKINS) {
    for (const mode of MODES) {
      const p = palette(css, skin, mode);
      for (const k of PALETTE) assert.ok(isHex(p[k]), `${skin}/${mode} ${k} = ${p[k]}`);
    }
  }
});

test('text tokens meet WCAG AA (4.5:1) on cards, the page and their own tints in every skin and mode', () => {
  const failures = [];
  for (const skin of SKINS) {
    for (const mode of MODES) {
      const p = palette(css, skin, mode);
      const card = p['--ofx-card'];
      const page = p['--ofx-page'];
      const check = (label, fg, bg) => { const r = contrast(fg, bg); if (r < AA) failures.push(`${skin}/${mode} ${label} ${fg} on ${bg} = ${r.toFixed(2)}`); };
      for (const k of ['--ofx-ink', '--ofx-ink-2', '--ofx-ink-3']) { check(k, p[k], card); check(k + ' (page)', p[k], page); check(k + ' (surface-2)', p[k], p['--ofx-surface-2']); }
      for (const k of ['--ofx-accent', '--ofx-ok', '--ofx-warn', '--ofx-fail']) { check(k, p[k], card); check(k + ' (page)', p[k], page); }
      // Pills and badges: the status colour as text on its own 12% tint (--ofx-*-bg).
      for (const k of ['--ofx-ok', '--ofx-warn', '--ofx-fail']) check(`${k} on its tint`, p[k], mix(p[k], card, 0.12));
      check('--ofx-info on its tint', p['--ofx-accent-2'], mix(p['--ofx-accent'], card, 0.12));
      check('--ofx-on-accent on --ofx-accent', p['--ofx-on-accent'], p['--ofx-accent']);
      check('--ofx-rail-muted on the rail', p['--ofx-rail-muted'], p['--ofx-rail']);
    }
  }
  assert.deepEqual(failures, []);
});

test('font sizes in the standard come from the type scale tokens', () => {
  const literal = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/font(?:-size)?\s*:\s*([^;]+);/g)]
    .map((m) => m[1]).filter((v) => /\b\d+(\.\d+)?px\b/.test(v.replace(/\/\s*\d+(\.\d+)?px/, '')));
  assert.deepEqual(literal, [], 'use --ofx-text-* (or --ofx-ctl-fs / --ofx-grid-fs) instead of a px size');
  for (const [k, v] of [['--ofx-text-xs', '12px'], ['--ofx-text-sm', '14px'], ['--ofx-text-base', '16px'], ['--ofx-text-lg', '18px'], ['--ofx-text-2xl', '24px']]) {
    assert.match(css, new RegExp(`${k}: ${v};`), `${k} is the STEPS step ${v}`);
  }
});

test('Barclays Tailwind ramps: Royal Blue is blue-600, triplets only under the barclays skin', () => {
  const block = ruleBlocks(css).find((b) => b.selectors.length === 1 && b.selectors[0] === 'html[data-skin="barclays"]' && /--ofx-tw-blue-600/.test(b.body));
  assert.ok(block, 'the ramps live in their own html[data-skin="barclays"] block');
  assert.match(block.body, /--ofx-tw-blue-600: 0 109 227;/);
  assert.match(block.body, /--ofx-tw-blue-950: 26 33 66;/);
  for (const b of ruleBlocks(css)) if (b.selectors.includes(':root')) assert.doesNotMatch(b.body, /--ofx-tw-/, 'ramps never sit on :root (a Tailwind app on another skin keeps its own palette)');
});

test('the shadcn bridge serves framed and standalone apps, Barclays by default', () => {
  const bridge = ruleBlocks(css).find((b) => b.selectors.includes('html[data-ofx-vars="shadcn"]'));
  assert.ok(bridge && bridge.selectors.includes('html[data-ofx-embedded="1"]'));
  assert.match(bridge.body, /--primary: 211\.2 100% 44\.5%;/, 'Royal Blue');
  assert.ok(ruleBlocks(css).some((b) => b.selectors.includes('html[data-ofx-vars="shadcn"][data-skin="steps"]')), 'STEPS Banking Blue stays selectable');
});

test('solid surfaces only and the Wijmo skin reads tokens', () => {
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /backdrop-filter|radial-gradient/);
  assert.doesNotMatch(wijmo.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-f]{6}\b/i, 'no hard-coded colour in the grid skin');
});
