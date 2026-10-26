import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHANNELS, channelById, contextLabel, followRoute, instanceContext, isValidContext, routeForContext } from './channels.js';

const instance = { type: 'ofx.instance', id: 'FOBO|2026-09-12|EMEA|R-2031', kitId: 'FOBO', region: 'EMEA' };

test('six FDC3 user channels, looked up by id', () => {
  assert.deepEqual(CHANNELS.map((c) => c.id), ['red', 'orange', 'yellow', 'green', 'blue', 'purple']);
  assert.equal(channelById('blue').label, 'Blue');
  assert.equal(channelById('pink'), null);
});

test('isValidContext wants a small plain object with a string type', () => {
  assert.equal(isValidContext(instance), true);
  assert.equal(isValidContext(null), false);
  assert.equal(isValidContext([{ type: 'x' }]), false);
  assert.equal(isValidContext({ id: 'no type' }), false);
  assert.equal(isValidContext({ type: 'x'.repeat(81) }), false);
  assert.equal(isValidContext({ type: 'big', blob: 'x'.repeat(17_000) }), false);
});

test('instanceContext shares a console row', () => {
  assert.deepEqual(instanceContext({ instanceId: 'R-1', kitId: 'FOBO', region: 'APAC', status: 'READY', question: 'Can I?' }), {
    type: 'ofx.instance', id: 'R-1', kitId: 'FOBO', region: 'APAC', status: 'READY', name: 'Can I?',
  });
});

test('routeForContext opens instances and reports, encoded', () => {
  assert.equal(routeForContext(instance), '/instance/FOBO%7C2026-09-12%7CEMEA%7CR-2031');
  assert.equal(routeForContext({ type: 'ofx.outcome', outcomeId: 'TB', cobDate: '2026-09-12', region: 'EMEA' }), '/reports/TB/2026-09-12/EMEA');
  assert.equal(routeForContext({ type: 'ofx.outcome', outcomeId: 'TB' }), null);
  assert.equal(routeForContext({ type: 'ofx.tile', tileId: 'fx-exposure' }), null);
});

test('followRoute moves only viewers of the same kind, and not to where they already are', () => {
  const route = routeForContext(instance);
  assert.equal(followRoute('/instance', instance), route);
  assert.equal(followRoute(route, instance), null);
  assert.equal(followRoute('/board', instance), null);
  const outcome = { type: 'ofx.outcome', outcomeId: 'TB', cobDate: '2026-09-12', region: 'EMEA' };
  assert.equal(followRoute('/reports/OTHER/2026-09-12/EMEA', outcome), '/reports/TB/2026-09-12/EMEA');
  assert.equal(followRoute('/instance', outcome), null);
});

test('contextLabel names each context type', () => {
  assert.equal(contextLabel(instance), 'FOBO · EMEA · FOBO|2026-09-12|EMEA|R-2031');
  assert.equal(contextLabel({ type: 'ofx.tile', tileId: 'fx-exposure', status: 'warning' }), 'fx-exposure · warning');
  assert.equal(contextLabel({ type: 'ofx.scope', groupUnit: 'REV-ACC', cobDate: '2026-09-12' }), 'REV-ACC · 2026-09-12 · ALL');
  assert.equal(contextLabel({ type: 'fdc3.instrument', name: 'VOD LN' }), 'VOD LN');
  assert.equal(contextLabel(null), '—');
});
