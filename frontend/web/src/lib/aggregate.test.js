import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateBy, fieldKinds, plainRows, resolvePivotField } from './aggregate.js';

const rows = [
  { region: 'EMEA', status: 'READY', amount: 10, _color: 'x' },
  { region: 'APAC', status: 'BLOCKED', amount: 5 },
  { region: 'EMEA', status: 'BLOCKED', amount: 20 },
  { region: null, status: 'READY', amount: 'n/a' },
];

test('fieldKinds splits measures from dimensions and skips private fields', () => {
  assert.deepEqual(fieldKinds(rows), { numeric: ['amount'], text: ['region', 'status'] });
  assert.deepEqual(fieldKinds([]), { numeric: [], text: [] });
});

test('aggregateBy sums, averages, counts in first-seen order', () => {
  assert.deepEqual(aggregateBy(rows, 'region', 'amount'), [
    { name: 'EMEA', value: 30 }, { name: 'APAC', value: 5 }, { name: '—', value: 0 },
  ]);
  assert.deepEqual(aggregateBy(rows, 'region', 'amount', 'avg')[0], { name: 'EMEA', value: 15 });
  assert.deepEqual(aggregateBy(rows, 'region', 'amount', 'min')[0], { name: 'EMEA', value: 10 });
  assert.deepEqual(aggregateBy(rows, 'region', 'amount', 'max')[0], { name: 'EMEA', value: 20 });
  assert.deepEqual(aggregateBy(rows, 'status'), [{ name: 'READY', value: 2 }, { name: 'BLOCKED', value: 2 }]);
  assert.deepEqual(aggregateBy(rows, 'status', 'amount', 'count'), [{ name: 'READY', value: 1 }, { name: 'BLOCKED', value: 2 }]);
});

test('plainRows drops private fields and non-objects', () => {
  assert.deepEqual(plainRows([rows[0], null, 'x']), [{ region: 'EMEA', status: 'READY', amount: 10 }]);
});

test('resolvePivotField matches a binding or the Wijmo header', () => {
  const fields = [
    { binding: 'region', header: 'Region', key: 'Region' },
    { binding: 'sliceKey', header: 'Slice Key', key: 'Slice Key' },
    { binding: 'amount', header: 'Amount', key: 'Amount' },
  ];
  assert.equal(resolvePivotField(fields, 'region'), fields[0]);
  assert.equal(resolvePivotField(fields, 'Region'), fields[0]);
  assert.equal(resolvePivotField(fields, 'sliceKey'), fields[1]);
  assert.equal(resolvePivotField(fields, 'Slice Key'), fields[1]);
  assert.equal(resolvePivotField(fields, 'missing'), null);
  assert.equal(resolvePivotField(undefined, 'region'), null);
});
