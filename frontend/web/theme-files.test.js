import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_FILES, sharedThemePlugin, themeFileFor } from './theme-files.js';

const themeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../theme');

test('only the published theme files are served under /theme', () => {
  assert.equal(themeFileFor('/theme/onefinux-tokens.css'), 'onefinux-tokens.css');
  assert.equal(themeFileFor('/theme/onefinux-wijmo.css?v=2'), 'onefinux-wijmo.css');
  assert.equal(themeFileFor('/theme/../vite.config.js'), null);
  assert.equal(themeFileFor('/theme/other.css'), null);
  assert.equal(themeFileFor('/board'), null);
});

test('a build emits both theme files into dist/theme', () => {
  const emitted = [];
  sharedThemePlugin(themeDir).generateBundle.call({ emitFile: (f) => emitted.push(f) });
  assert.deepEqual(emitted.map((f) => f.fileName), THEME_FILES.map((f) => `theme/${f}`));
  assert.match(emitted[0].source, /--ofx-accent/);
  assert.match(emitted[1].source, /\.wj-flexgrid/);
});

test('the dev middleware answers /theme/onefinux-tokens.css with CSS', () => {
  let handler;
  sharedThemePlugin(themeDir).configureServer({ middlewares: { use: (fn) => { handler = fn; } } });
  const headers = {};
  let body = '';
  handler({ url: '/theme/onefinux-tokens.css' }, { setHeader: (k, v) => { headers[k] = v; }, end: (b) => { body = String(b); } }, () => assert.fail('next called'));
  assert.equal(headers['Content-Type'], 'text/css; charset=utf-8');
  assert.match(body, /html\[data-skin="steps"\]/);
});
