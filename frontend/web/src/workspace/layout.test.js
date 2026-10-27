import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addView, clampSize, createWorkspace, currentWorkspace, deleteWorkspace, deskFor, gridColumns, loadState, moveView, patchView,
  removeView, resizePair, seedState, setLayout, splitShares, toggleMaximized, viewsOnChannel,
} from './layout.js';

const view = (id, extra = {}) => ({ id, appId: 'board', title: id, channel: null, ...extra });
const withViews = (views) => ({ current: 'w', workspaces: [{ id: 'w', name: 'W', layout: 'grid', views, active: null, maximized: null }] });

test('seedState opens Close control, a Finance desk and an outcome desk for the FOBO kit', () => {
  const s = seedState();
  assert.equal(s.current, 'ws-close');
  assert.deepEqual(s.workspaces.map((w) => w.name), ['Close control', 'Finance', 'FOBO rec']);
  const close = currentWorkspace(s);
  assert.deepEqual(close.views.filter((v) => v.channel === 'blue').map((v) => v.appId), ['board', 'instance', 'helix']);
  assert.ok(close.views.every((v) => v.size === 1));
  const fobo = s.workspaces[2];
  assert.deepEqual(fobo.subject, { kind: 'kit', id: 'FOBO', name: 'FOBO rec', question: 'Can I execute this rec?' });
  assert.deepEqual(fobo.views.map((v) => v.appId), ['activity', 'grid', 'instance', 'board']);
  assert.ok(fobo.views.filter((v) => v.appId !== 'board').every((v) => v.channel === 'outcome:kit-fobo'));
});

test('a desk keeps its outcome and its views keep a small config', () => {
  const s = loadState(JSON.stringify({
    current: 'd',
    workspaces: [{ id: 'd', name: 'D', subject: { kind: 'outcome', id: 'FOBO_HELIX', name: 'FOBO investigation' }, views: [
      { id: 'g', appId: 'grid', config: { spec: 'outcomes', filter: { outcomeId: 'FOBO_HELIX' } } },
      { id: 'h', appId: 'grid', config: { blob: 'x'.repeat(5000) } },
    ] }, { id: 'e', name: 'E', subject: { kind: 'planet', id: 'X' }, views: [] }],
  }));
  assert.equal(currentWorkspace(s).subject.id, 'FOBO_HELIX');
  assert.deepEqual(currentWorkspace(s).views[0].config, { spec: 'outcomes', filter: { outcomeId: 'FOBO_HELIX' } });
  assert.equal(currentWorkspace(s).views[1].config, undefined);
  assert.equal(s.workspaces[1].subject, undefined);
});

test('createWorkspace builds an outcome desk from a template; deskFor finds it', () => {
  const template = { name: 'PnL reporting', subject: { kind: 'outcome', id: 'PNL_REPORTING', name: 'PnL reporting' }, layout: 'columns',
    views: [{ appId: 'activity', title: 'Activity', channel: 'outcome:pnl_reporting' }] };
  const s = createWorkspace(withViews([]), null, { template });
  const desk = currentWorkspace(s);
  assert.equal(desk.name, 'PnL reporting');
  assert.equal(desk.layout, 'columns');
  assert.equal(desk.views[0].channel, 'outcome:pnl_reporting');
  assert.ok(desk.views[0].id);
  assert.equal(deskFor(s, { kind: 'outcome', id: 'pnl_reporting' })?.id, desk.id);
  assert.equal(deskFor(s, { kind: 'kit', id: 'PNL_REPORTING' }), null);
});

test('loadState falls back to the seed for junk and cleans what it keeps', () => {
  assert.equal(loadState('{not json').current, 'ws-close');
  assert.equal(loadState(JSON.stringify({ workspaces: [] })).current, 'ws-close');
  const s = loadState(JSON.stringify({
    current: 'gone',
    workspaces: [{
      id: 'a', name: 'A', layout: 'mosaic', active: 'missing', maximized: 'v1',
      views: [
        { id: 'v1', appId: 'board', size: 0.01, path: '//evil.example/x' },
        { id: 'v2', appId: 'instance', size: 99, path: '/instance/R-1?x=1', channel: 7 },
        { appId: 'no-id' },
      ],
    }],
  }));
  const w = currentWorkspace(s);
  assert.equal(s.current, 'a');
  assert.equal(w.layout, 'grid');
  assert.equal(w.active, null);
  assert.equal(w.maximized, 'v1');
  assert.deepEqual(w.views.map((v) => [v.id, v.size, v.path ?? null, v.channel]), [
    ['v1', 0.15, null, null],
    ['v2', 20, '/instance/R-1?x=1', null],
  ]);
});

test('clampSize keeps a share inside 0.15–20 fr and defaults to 1', () => {
  assert.equal(clampSize(undefined), 1);
  assert.equal(clampSize(-2), 1);
  assert.equal(clampSize(1.23456), 1.235);
  assert.equal(clampSize(0.05), 0.15);
});

test('addView activates the new view, ignores duplicates and stops at 12', () => {
  let s = withViews([view('a')]);
  s = addView(s, view('b'));
  assert.equal(currentWorkspace(s).active, 'b');
  assert.equal(addView(s, view('b')), s);
  for (let i = 0; i < 20; i += 1) s = addView(s, view('x' + i));
  assert.equal(currentWorkspace(s).views.length, 12);
});

test('removeView moves focus and clears a maximized view', () => {
  let s = withViews([view('a'), view('b')]);
  s = toggleMaximized(addView(s, view('c')), 'c');
  s = removeView(s, 'c');
  const w = currentWorkspace(s);
  assert.equal(w.active, 'a');
  assert.equal(w.maximized, null);
});

test('moveView drops a view onto another slot', () => {
  const s = moveView(withViews([view('a'), view('b'), view('c')]), 'c', 'a');
  assert.deepEqual(currentWorkspace(s).views.map((v) => v.id), ['c', 'a', 'b']);
});

test('patchView re-cleans the view', () => {
  const s = patchView(withViews([view('a')]), 'a', { channel: 'green', size: 0 });
  assert.deepEqual(currentWorkspace(s).views[0], { id: 'a', appId: 'board', title: 'a', channel: 'green', wide: false, size: 1 });
});

test('splitShares moves the boundary by pixels and keeps the pair total', () => {
  assert.deepEqual(splitShares(1, 1, 500, 500, 100), [1.2, 0.8]);
  const [a, b] = splitShares(1, 1, 500, 500, 2000);
  assert.equal(a, 2 * 840 / 1000);
  assert.ok(Math.abs(a + b - 2) < 1e-9);
  assert.deepEqual(splitShares(1, 1, 0, 0, 50), [1, 1]);
});

test('resizePair sets both neighbours, clamped', () => {
  const s = resizePair(withViews([view('a'), view('b'), view('c', { size: 2 })]), 'a', 1.6, 'b', 0.01);
  assert.deepEqual(currentWorkspace(s).views.map((v) => v.size), [1.6, 0.15, 2]);
});

test('setLayout accepts known layouts only', () => {
  const s = withViews([view('a')]);
  assert.equal(currentWorkspace(setLayout(s, 'columns')).layout, 'columns');
  assert.equal(setLayout(s, 'mosaic'), s);
});

test('createWorkspace copies with fresh view ids; the last workspace cannot be deleted', () => {
  const s = withViews([view('a', { channel: 'blue' })]);
  const copy = createWorkspace(s, '  Month end  ', { copyCurrent: true });
  const w = currentWorkspace(copy);
  assert.equal(w.name, 'Month end');
  assert.equal(w.views[0].channel, 'blue');
  assert.notEqual(w.views[0].id, 'a');
  assert.equal(deleteWorkspace(s), s);
  assert.equal(deleteWorkspace(copy).current, 'w');
});

test('viewsOnChannel lists the other views on a colour', () => {
  const w = currentWorkspace(withViews([view('a', { channel: 'blue' }), view('b', { channel: 'blue' }), view('c', { channel: 'red' })]));
  assert.deepEqual(viewsOnChannel(w, 'blue', 'a').map((v) => v.id), ['b']);
  assert.deepEqual(viewsOnChannel(w, null), []);
});

test('gridColumns keeps the grid square and every column at least the minimum width', () => {
  assert.equal(gridColumns(1, 1600), 1);
  assert.equal(gridColumns(2, 1600), 2);
  assert.equal(gridColumns(3, 1600), 3);
  assert.equal(gridColumns(4, 1600), 2);
  assert.equal(gridColumns(4, 1900), 2);
  assert.equal(gridColumns(6, 1600), 3);
  assert.equal(gridColumns(3, 1000), 2);
  assert.equal(gridColumns(4, 700), 1);
  assert.equal(gridColumns(0, 0), 1);
});
