import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILTIN_APPS, STEPS_URL, appById, appForPath, appOrigin, makeCustomApp, normalizeWebUrl, viewSrc } from './apps.js';

const ORIGIN = 'http://localhost:7091';

test('the directory has unique ids and STEPS as a linkable web app', () => {
  const ids = BUILTIN_APPS.map((a) => a.appId);
  assert.equal(new Set(ids).size, ids.length);
  const steps = appById(BUILTIN_APPS, 'steps');
  assert.equal(steps.kind, 'web');
  assert.equal(steps.linkable, true);
  assert.equal(steps.url, STEPS_URL);
  assert.match(STEPS_URL, /ofx-embed=1/);
});

test('normalizeWebUrl frames http(s) and same-origin paths only', () => {
  assert.deepEqual(normalizeWebUrl('/partner-demo.html?x=1', ORIGIN), { ok: true, url: '/partner-demo.html?x=1', origin: ORIGIN });
  assert.deepEqual(normalizeWebUrl('helix.bank.example/fobo', ORIGIN), { ok: true, url: 'https://helix.bank.example/fobo', origin: 'https://helix.bank.example' });
  assert.equal(normalizeWebUrl(`${ORIGIN}/sim/screens/helix`, ORIGIN).url, '/sim/screens/helix');
  for (const bad of ['', 'javascript:alert(1)', 'data:text/html,hi', '//evil.example', 'ftp://files.example', 'https://u:p@x.example']) {
    assert.equal(normalizeWebUrl(bad, ORIGIN).ok, false, bad);
  }
});

test('makeCustomApp builds a web app or throws the reason', () => {
  const app = makeCustomApp({ title: 'Recon desk', url: 'https://recon.example/app' }, ORIGIN, 36 ** 3);
  assert.equal(app.appId, 'web-recon-desk-1000');
  assert.equal(app.kind, 'web');
  assert.equal(app.desc, 'https://recon.example');
  assert.throws(() => makeCustomApp({ url: 'javascript:void 0' }, ORIGIN), /http\(s\)/);
});

test('appForPath finds the app a docked window belongs to', () => {
  assert.equal(appForPath(BUILTIN_APPS, '/widget/live-feed').appId, 'live-feed');
  assert.equal(appForPath(BUILTIN_APPS, '/instance/R-1?ofx-embed=1').appId, 'instance');
  assert.equal(appForPath(BUILTIN_APPS, '/finance').appId, 'finance');
  assert.equal(appForPath(BUILTIN_APPS, '/nowhere'), null);
  assert.equal(appForPath(BUILTIN_APPS, 'board'), null);
});

test('appOrigin is where a web app lives, the page origin otherwise', () => {
  assert.equal(appOrigin(appById(BUILTIN_APPS, 'steps'), ORIGIN), new URL(STEPS_URL).origin);
  assert.equal(appOrigin(appById(BUILTIN_APPS, 'partner-demo'), ORIGIN), ORIGIN);
  assert.equal(appOrigin(appById(BUILTIN_APPS, 'board'), ORIGIN), ORIGIN);
});

test('viewSrc embeds a console route with view id, channel and scope', () => {
  const src = viewSrc({ id: 'v1', title: 'Board', channel: 'blue' }, appById(BUILTIN_APPS, 'board'),
    { scope: { groupUnit: 'REV-ACC', cobDate: '2026-09-12' }, pageOrigin: ORIGIN });
  const url = new URL(src, ORIGIN);
  assert.equal(url.pathname, '/board');
  assert.equal(url.searchParams.get('ofx-embed'), '1');
  assert.equal(url.searchParams.get('ofx-view'), 'v1');
  assert.equal(url.searchParams.get('ofx-channel'), 'blue');
  assert.equal(url.searchParams.get('groupUnit'), 'REV-ACC');
  assert.equal(url.searchParams.has('region'), false);
});

test('viewSrc gives a web app the embed contract, theme included', () => {
  const steps = viewSrc({ id: 'v9' }, appById(BUILTIN_APPS, 'steps'),
    { scope: { groupUnit: 'REV-ACC', cobDate: '2026-09-12' }, theme: { theme: 'light', skin: 'steps' }, pageOrigin: ORIGIN });
  const url = new URL(steps);
  assert.equal(url.origin, new URL(STEPS_URL).origin);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    'ofx-embed': '1', groupUnitId: 'REV-ACC', cobDate: '2026-09-12', ofxView: 'v9', theme: 'light', skin: 'steps',
  });
  assert.match(viewSrc({ id: 'v2' }, appById(BUILTIN_APPS, 'helix'), { pageOrigin: ORIGIN }), /^\/sim\/screens\/helix\?ofxView=v2$/);
});
