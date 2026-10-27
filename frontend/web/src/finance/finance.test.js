import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financeBlueprint } from './blueprint.js';
import { MOCK_DATASETS, mockDataset, seeded } from './mockData.js';
import {
  applyComputed, applyRowTransform, deriveAlert, deriveStatus, evaluateExpression, linearForecast, resolveTemplate,
  tilesForTab, transformTile,
} from './transform.js';

test('applyComputed derives pct fields safely', () => {
  assert.deepEqual(applyComputed([{ done: 3, total: 4 }, { done: 1, total: 0 }], { pct: 'pct:done/total' }), [
    { done: 3, total: 4, pct: 75 }, { done: 1, total: 0, pct: 0 },
  ]);
  const rows = [{ a: 1 }];
  assert.equal(applyComputed(rows, null), rows);
});

test('applyRowTransform maps values with a default', () => {
  const t = { status: 'Available=>success|Delayed=>warning|*=>error' };
  assert.equal(applyRowTransform(t, 'status', 'Delayed'), 'warning');
  assert.equal(applyRowTransform(t, 'status', 'Down'), 'error');
  assert.equal(applyRowTransform(t, 'other', 5), '5');
});

test('status rules', () => {
  const data = [{ s: 'OK', v: 10 }, { s: 'LATE', v: 3 }];
  assert.equal(evaluateExpression('someNotEqual:OK', 's', data), true);
  assert.equal(evaluateExpression('allEqual:OK', 's', data), false);
  assert.equal(evaluateExpression('lastLt:5', 'v', data), true);
  assert.equal(evaluateExpression('bogus:1', 'v', data), false);
  const rule = { field: 's', errorWhen: 'someEqual:FAIL', warningWhen: 'someEqual:LATE', successWhen: 'always', alertWhen: 'someEqual:LATE' };
  assert.equal(deriveStatus(rule, data), 'warning');
  assert.equal(deriveStatus(rule, [{ s: 'OK' }]), 'success');
  assert.equal(deriveStatus({ ...rule, default: 'info' }, []), 'info');
  assert.equal(deriveAlert(rule, data), true);
});

test('resolveTemplate, tilesForTab, linearForecast', () => {
  assert.equal(resolveTemplate('{{groupUnit}}/{{cobDate}}/{{missing}}', { groupUnit: 'REV-ACC', cobDate: '2026-09-12' }), 'REV-ACC/2026-09-12/');
  const tiles = [{ id: 'a', group: 'live' }, { id: 'b', group: 'finance' }];
  assert.deepEqual(tilesForTab({ tileIds: ['b'] }, tiles).map((t) => t.id), ['b']);
  assert.deepEqual(tilesForTab({ tileIds: { group: 'live' } }, tiles).map((t) => t.id), ['a']);
  assert.equal(tilesForTab({ tileIds: 'all' }, tiles), tiles);
  assert.deepEqual(linearForecast([1, 2, 3], 2), { slope: 1, intercept: 1, next: [4, 5] });
  assert.deepEqual(linearForecast([7]).next, []);
});

test('mock datasets are seeded by COB date', () => {
  const a = seeded('x');
  const b = seeded('x');
  assert.equal(a(), b());
  assert.deepEqual(mockDataset('pnl-daily', { cobDate: '2026-09-12' }), mockDataset('pnl-daily', { cobDate: '2026-09-12' }));
  assert.throws(() => mockDataset('nope'), /Unknown mock dataset/);
});

test('the blueprint is consistent: sources exist, mock data exists, every tile renders', () => {
  const sources = new Map(financeBlueprint.dataSources.map((ds) => [ds.id, ds]));
  const tileIds = new Set(financeBlueprint.tiles.map((t) => t.id));
  assert.equal(tileIds.size, financeBlueprint.tiles.length);
  for (const tab of financeBlueprint.tabs) {
    if (Array.isArray(tab.tileIds)) for (const id of tab.tileIds) assert.ok(tileIds.has(id), `${tab.id} → ${id}`);
  }
  for (const def of financeBlueprint.tiles) {
    const ds = sources.get(def.dataSourceId);
    assert.ok(ds, `${def.id} → ${def.dataSourceId}`);
    const raw = ds.endpoint.startsWith('mock:') ? mockDataset(ds.endpoint.slice(5), { cobDate: '2026-09-12' }) : [];
    if (ds.endpoint.startsWith('mock:')) assert.ok(MOCK_DATASETS[ds.endpoint.slice(5)]);
    const tile = transformTile(def, raw, new Date('2026-09-12T10:00:00Z'));
    assert.equal(tile.id, def.id);
    assert.ok(['success', 'warning', 'error', 'info'].includes(tile.status), `${def.id}: ${tile.status}`);
    assert.equal(tile.slides.length, def.slides.length);
    tile.slides.forEach((slide) => assert.ok(Array.isArray(slide.data), `${def.id}/${slide.id}`));
  }
});

test('tile ids match STEPS, so an ofx.tile link opens the same tile in both dashboards', () => {
  const ids = new Set(financeBlueprint.tiles.map((t) => t.id));
  for (const id of ['data-availability', 'fobo-review', 'pnl-analysis', 'fx-exposure', 'liquidity-status',
    'regulatory-reporting', 'risk-metrics', 'settlement-status', 'collateral-management']) assert.ok(ids.has(id), id);
});

test('transformTile preserves gridSpecId for the detail pane', async () => {
  const { transformTile } = await import('./transform.js');
  const def = financeBlueprint.tiles.find((t) => t.id === 'outcome-readiness');
  const tile = transformTile(def, [], new Date('2026-09-12T10:00:00Z'));
  assert.equal(tile.gridSpecId, 'instances');
  const plain = transformTile(financeBlueprint.tiles.find((t) => t.id === 'pnl-analysis'), [], new Date());
  assert.equal(plain.gridSpecId, undefined);
});
