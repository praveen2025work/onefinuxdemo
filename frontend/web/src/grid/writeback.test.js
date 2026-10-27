import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyOverlay, changesOf, normalizeEdit, recordEdit, validateCell } from './writeback.js';
import { normalizeSpec } from './spec.js';
import { builtinSpec } from './specs.js';

test('normalizeEdit keeps known rules and defaults to maker-checker', () => {
  const errors = [];
  const e = normalizeEdit({ key: 'breakId', columns: ['owner', { key: 'status', options: ['OPEN', 'CLEARED'], required: true }, { key: 'breakId' }, { key: 'amount', type: 'number', min: 0 }], target: 'breaks' }, errors);
  assert.deepEqual(errors, []);
  assert.equal(e.approval, 'maker-checker');
  assert.deepEqual(e.columns.map((c) => c.key), ['owner', 'status', 'amount']);
  assert.equal(e.columns[1].type, 'option');
  assert.equal(e.target, 'breaks');
  assert.equal(normalizeEdit({ key: 'id', columns: [], approval: 'none' }, errors), null);
  assert.equal(normalizeEdit(null), null);
  assert.equal(normalizeEdit({ key: 'id', columns: ['x'], target: 'http://evil' }).target, undefined);
});

test('validateCell enforces type, range, options and required', () => {
  assert.equal(validateCell({ type: 'number', min: 0, maxLength: 400 }, '-1'), 'at least 0');
  assert.equal(validateCell({ type: 'number', maxLength: 400 }, 'abc'), 'a number is required');
  assert.equal(validateCell({ type: 'date', maxLength: 400 }, '12/09/2026'), 'a date as YYYY-MM-DD');
  assert.match(validateCell({ type: 'option', options: ['OPEN'], maxLength: 400 }, 'SHUT'), /one of OPEN/);
  assert.equal(validateCell({ type: 'text', required: true, maxLength: 400 }, ''), 'a value is required');
  assert.equal(validateCell({ type: 'text', maxLength: 5 }, 'toolong'), 'at most 5 characters');
  assert.equal(validateCell({ type: 'text', maxLength: 400 }, 'ok'), null);
  assert.equal(validateCell(undefined, 'x'), 'this column is not editable');
});

test('recordEdit keeps the first before value and drops edits back to the original', () => {
  let d = recordEdit({}, 'BK-1', 'owner', 'Alex', 'Priya');
  d = recordEdit(d, 'BK-1', 'owner', 'Priya', 'Sam');
  assert.deepEqual(changesOf(d), [{ key: 'BK-1', column: 'owner', before: 'Alex', after: 'Sam' }]);
  d = recordEdit(d, 'BK-1', 'owner', 'Sam', 'Alex');
  assert.deepEqual(d, {});
});

test('applied values overlay rows by key, and the break register spec is editable', () => {
  const rows = applyOverlay([{ breakId: 'BK-1', owner: '' }, { breakId: 'BK-2', owner: 'Sam' }], { 'BK-1': { owner: 'Priya' } }, 'breakId');
  assert.deepEqual(rows.map((r) => r.owner), ['Priya', 'Sam']);
  const { spec, errors } = normalizeSpec(builtinSpec('break-register'));
  assert.deepEqual(errors, []);
  assert.equal(spec.edit.key, 'breakId');
  assert.equal(spec.edit.target, 'breaks');
});
