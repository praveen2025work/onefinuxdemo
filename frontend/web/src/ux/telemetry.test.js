import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTelemetry, routeKey } from './telemetry.js';
import { newer } from './prefs.js';
import { canDo, itemsForDesk } from './access.js';

test('routeKey groups record pages by screen', () => {
  assert.equal(routeKey('/instance/FOBO%7C2026'), '/instance/:id');
  assert.equal(routeKey('/reports/FOBO_HELIX'), '/reports/:outcome');
  assert.equal(routeKey('/reports/FOBO_HELIX/2026-09-12/EMEA'), '/reports/:outcome/:cob/:region');
  assert.equal(routeKey('/board/'), '/board');
  assert.equal(routeKey(''), '/');
});

test('telemetry batches, tags the team, ignores unknown types and survives a failed send', async () => {
  const sent = [];
  let fire = null;
  const t = createTelemetry({ send: (b) => { sent.push(b); return Promise.resolve(); }, max: 3, schedule: (fn) => { fire = fn; return 1; }, cancel: () => {} });
  t.setTeam('REV-ACC');
  assert.equal(t.track('NOPE', {}), null);
  t.track('APP_OPEN', { app: '/board' });
  t.track('COMPONENT_USE', { app: '/grids', component: 'lens.pivot', detail: { x: 1 } });
  assert.equal(sent.length, 0);
  t.track('SEARCH', { component: 'instance' });
  await Promise.resolve();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].length, 3);
  assert.equal(sent[0][0].team, 'REV-ACC');
  assert.deepEqual(sent[0][1].detail, { x: 1 });
  t.track('APP_OPEN', { app: '<script>x' });
  assert.equal(t.pending(), 1);
  fire();
  await Promise.resolve();
  assert.equal(sent[1][0].app, 'script x');

  const failing = createTelemetry({ send: () => Promise.reject(new Error('down')), max: 1 });
  failing.track('APP_OPEN', { app: '/' });
  assert.equal(await failing.flush(), 0);
});

test('prefs: the copy saved later wins, a missing copy loses', () => {
  assert.equal(newer({ savedAt: 1, state: {} }, { savedAt: 2, state: {} }), 'remote');
  assert.equal(newer({ savedAt: 3, state: {} }, { savedAt: 2, state: {} }), 'local');
  assert.equal(newer({ savedAt: 3, state: {} }, null), 'local');
  assert.equal(newer({ savedAt: 0, state: null }, { savedAt: 1, state: { a: 1 } }), 'remote');
});

test('itemsForDesk asks only for what is missing', () => {
  const desk = { subject: { kind: 'kit', id: 'kit-fobo' } };
  assert.deepEqual(itemsForDesk(desk, { groupUnit: 'REV-ACC', role: 'CONTROLLER' }), [
    { kind: 'GROUP_UNIT', value: 'REV-ACC' }, { kind: 'CEES', value: 'product:FOBO' }, { kind: 'ROLE', value: 'CONTROLLER' }]);
  assert.deepEqual(itemsForDesk(desk, { groupUnit: 'REV-ACC', held: { groupUnits: ['REV-ACC'], ceesProducts: ['product:FOBO'] } }), []);
  assert.deepEqual(itemsForDesk(null, { groupUnit: 'MARKETS', held: { groupUnits: ['*'] } }), []);
  assert.equal(canDo({ actions: ['*'] }, 'ACCESS_APPROVE'), true);
  assert.equal(canDo({ actions: ['SIGN_OFF'] }, 'ACCESS_APPROVE'), false);
});
