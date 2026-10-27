import assert from 'node:assert/strict';
import { test } from 'node:test';
import { entitledGroupUnit } from './entitledGroupUnit.js';

const units = [
  { groupUnitId: 'MARKETS', name: 'Markets' },
  { groupUnitId: 'REV-ACC', name: 'Revenue Accounting' },
];

test('AC-ENT-02 keeps a stored unit that is still entitled', () => {
  assert.equal(entitledGroupUnit('REV-ACC', units), 'REV-ACC');
});

test('AC-ENT-02 replaces a stored unit the caller cannot see', () => {
  assert.equal(entitledGroupUnit('REV-ACC', [units[0]]), 'MARKETS');
});

test('empty catalogue yields an empty id', () => {
  assert.equal(entitledGroupUnit('REV-ACC', []), '');
});
