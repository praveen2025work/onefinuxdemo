import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blocks, scopeGridCss, scopeSelector } from './grid-css.js';

test('blocks splits top-level rules and nested at-rules, without comments', () => {
  const b = blocks('/* x */ .a { color: red; } @media (max-width: 9px) { .b { top: 0 } } @import url(x.css);');
  assert.deepEqual(b.map((r) => r.prelude), ['.a', '@media (max-width: 9px)']);
  assert.match(b[1].body, /\.b \{ top: 0 \}/);
});

test('scopeSelector keeps grid component rules, scoped; drops the shell', () => {
  assert.equal(scopeSelector('.dg-bar .sec', 'ofx-grid'), 'ofx-grid .dg-bar .sec');
  assert.equal(scopeSelector('.seg button.on', 'ofx-grid'), 'ofx-grid .seg button.on');
  assert.equal(scopeSelector('[data-skin="steps"] .btn', 'ofx-grid'), 'ofx-grid[data-skin="steps"] .btn');
  assert.equal(scopeSelector('html[data-theme="dark"] .pill.ok', 'ofx-grid'), 'ofx-grid[data-theme="dark"] .pill.ok');
  assert.equal(scopeSelector('.sel2-menu', 'ofx-grid'), '.sel2-menu', 'the dropdown renders into <body>');
  assert.equal(scopeSelector('.nav-a .tag', 'ofx-grid'), null);
  assert.equal(scopeSelector('.panel .btn', 'ofx-grid'), null);
  assert.equal(scopeSelector('body', 'ofx-grid'), null);
  assert.equal(scopeSelector('.on', 'ofx-grid'), null, 'a state class alone is not a grid rule');
});

test('scopeGridCss turns the console aliases into element variables and keeps only grid rules', () => {
  const out = scopeGridCss(`
    :root { --surface: var(--ofx-card); }
    body { margin: 0; }
    .topbar { height: 48px; }
    .btn, .nav-a { padding: 8px; }
    @media (max-width: 820px) { .seg { overflow-x: auto; } .rail { display: none; } }
    @keyframes spin360 { to { transform: rotate(360deg); } }
    @keyframes pulse { to { opacity: 0; } }
  `);
  assert.match(out, /ofx-grid, \.sel2-menu \{ --surface: var\(--ofx-card\); \}/);
  assert.match(out, /ofx-grid \.btn \{ padding: 8px; \}/);
  assert.match(out, /@media \(max-width: 820px\) \{\nofx-grid \.seg \{ overflow-x: auto; \}\n\}/);
  assert.match(out, /@keyframes spin360/);
  assert.doesNotMatch(out, /topbar|nav-a|rail|pulse|margin: 0/);
});
