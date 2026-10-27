import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financeBlueprint } from './blueprint.js';
import { catalogue, normalizeDashboard, resolveDashboard } from './dashboards.js';

test('platform catalogue always includes the finance blueprint', () => {
  const list = catalogue([]);
  assert.equal(list[0].id, 'finance');
  assert.equal(list[0].origin, 'platform');
  assert.ok(list[0].tiles.length > 0);
});

test('unit dashboards append without duplicating platform ids', () => {
  const unit = [
    normalizeDashboard({ id: 'finance', name: 'Hijack', tiles: [{ id: 'x' }] }),
    normalizeDashboard({ id: 'liq', name: 'Liquidity', tiles: [{ id: 't1' }], tabs: [{ id: 'o', label: 'O', tileIds: 'all' }] }),
  ];
  const list = catalogue(unit.filter(Boolean));
  assert.equal(list.filter((d) => d.id === 'finance').length, 1);
  assert.equal(list[0].name, financeBlueprint.name);
  assert.ok(list.some((d) => d.id === 'liq' && d.origin === 'unit'));
});

test('normalizeDashboard refuses empty tiles and fills defaults', () => {
  assert.equal(normalizeDashboard({ id: 'x', tiles: [] }), null);
  const d = normalizeDashboard({ id: 'liq', tiles: [{ id: 't1' }] });
  assert.equal(d.tabs[0].id, 'overview');
  assert.equal(d.defaults.columns, 3);
});

test('resolveDashboard resolves known ids and refuses unknown ones', () => {
  assert.equal(resolveDashboard(null, []).id, 'finance');
  assert.equal(resolveDashboard('finance', []).id, 'finance');
  assert.equal(resolveDashboard('nope', []), null);
});

test('live tiles declare gridSpecId for the catalogue', () => {
  const byId = Object.fromEntries(financeBlueprint.tiles.map((t) => [t.id, t]));
  assert.equal(byId['outcome-readiness'].gridSpecId, 'instances');
  assert.equal(byId['report-readiness'].gridSpecId, 'outcomes');
  assert.equal(byId.alerts.gridSpecId, 'notifications');
});
