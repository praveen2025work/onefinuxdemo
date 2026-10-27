import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferColumnType, proposeColumns, proposeChart, proposePivot, proposeSpec } from './propose.js';

test('inferColumnType uses name and samples', () => {
  assert.equal(inferColumnType('status', ['OPEN']), 'status');
  assert.equal(inferColumnType('amount', [12.5]), 'money');
  assert.equal(inferColumnType('completionPct', [80]), 'percent');
  assert.equal(inferColumnType('cobDate', ['2026-09-12']), 'date');
  assert.equal(inferColumnType('kitId', ['FOBO']), 'chip');
  assert.equal(inferColumnType('sliceKey', ['MB014']), 'mono');
  assert.equal(inferColumnType('count', [1, 2, 3]), 'number');
  assert.equal(inferColumnType('name', ['a']), 'text');
});

test('proposeColumns skips private keys and labels camelCase', () => {
  const cols = proposeColumns([
    { _skip: 1, sliceKey: 'A', status: 'OPEN', amount: 10, region: 'EMEA' },
    { sliceKey: 'B', status: 'READY', amount: 20, region: 'APAC' },
  ]);
  assert.deepEqual(cols.map((c) => c.key), ['sliceKey', 'status', 'amount', 'region']);
  assert.equal(cols.find((c) => c.key === 'sliceKey').label, 'Slice Key');
  assert.equal(cols.find((c) => c.key === 'amount').type, 'money');
  assert.equal(cols.find((c) => c.key === 'status').type, 'status');
});

test('proposePivot and proposeChart pick dims and values', () => {
  const cols = proposeColumns([{ region: 'EMEA', status: 'OPEN', amount: 10 }]);
  const pivot = proposePivot(cols);
  assert.ok(pivot.rowFields.includes('region') || pivot.rowFields.includes('status'));
  assert.deepEqual(pivot.valueFields, ['amount']);
  const chart = proposeChart(cols);
  assert.equal(chart.y, 'amount');
  assert.ok(chart.x);
});

test('proposeSpec builds a confirmable GridSpec and refuses bad input', () => {
  const bad = proposeSpec({ id: '', endpoint: '/api/x' });
  assert.equal(bad.spec, null);
  assert.ok(bad.errors.length >= 1);

  const { spec, errors } = proposeSpec({
    id: 'my-breaks',
    title: 'Breaks',
    endpoint: '/api/sim/breaks',
    params: [{ name: 'groupUnit', from: 'groupUnit' }],
    rows: [
      { id: 'BK-1', book: 'MB014', amount: 100, status: 'OPEN' },
      { id: 'BK-2', book: 'MB015', amount: 50, status: 'CLEARED' },
    ],
    live: ['notification'],
  });
  assert.deepEqual(errors, []);
  assert.equal(spec.id, 'my-breaks');
  assert.equal(spec.source.endpoint, '/api/sim/breaks');
  assert.equal(spec.source.params[0].name, 'groupUnit');
  assert.ok(spec.columns.some((c) => c.key === 'amount' && c.type === 'money'));
  assert.ok(spec.pivot);
  assert.ok(spec.chart);
  assert.deepEqual(spec.live, ['notification']);
  assert.deepEqual(spec.views, ['grid', 'pivot', 'chart']);
});
