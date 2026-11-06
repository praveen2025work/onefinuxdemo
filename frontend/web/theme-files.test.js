import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
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

const read = (p) => fs.readFileSync(p, 'utf8');
const webDir = path.dirname(fileURLToPath(import.meta.url));

test('type is Barclays Effra first, with the self-hosted Source Sans 3 in its place, in every skin', () => {
  const tokens = read(path.join(themeDir, 'onefinux-tokens.css'));
  const stacks = [...tokens.matchAll(/--ofx-font:\s*([^;]+);/g)].map((m) => m[1]);
  assert.equal(stacks.length, 1, 'one --ofx-font for every skin');
  assert.match(stacks[0], /^"Barclays Effra", "Effra", "Source Sans 3",/);
  assert.match(read(path.join(webDir, 'src/theme/fonts.css')), /font-family: "Source Sans 3";[\s\S]*?source-sans-3-latin-wght-normal\.woff2/);
});

test('font weights come from the --ofx-fw-* tokens, and none is heavier than 600', () => {
  const files = [path.join(themeDir, 'onefinux-tokens.css'), path.join(themeDir, 'onefinux-wijmo.css'), path.join(webDir, 'src/styles.css')];
  for (const file of files) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    const literal = css.match(/font-weight:\s*\d+|font:\s*\d{3}\b/g) || [];
    assert.deepEqual(literal, [], `${path.basename(file)} uses a literal weight`);
  }
  const weights = [...read(files[0]).matchAll(/--ofx-fw-[a-z]+:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(weights.length >= 4 && Math.max(...weights) <= 600, `weights ${weights}`);
});
