import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creatableOption, filterOptions, isChosen, selectionText, toggleValue } from './selectModel.js';

const OPTIONS = [
  { value: 'EMEA', label: 'EMEA' },
  { value: 'APAC', label: 'Asia Pacific' },
  { value: '', label: 'All regions' },
];

test('filterOptions matches a label or a value and ignores case', () => {
  assert.deepEqual(filterOptions(OPTIONS, 'asia').map((o) => o.value), ['APAC']);
  assert.deepEqual(filterOptions(OPTIONS, 'emea').map((o) => o.value), ['EMEA']);
  assert.equal(filterOptions(OPTIONS, '   ').length, 3);
});

test('selectionText names one value or every chosen value', () => {
  assert.equal(selectionText(OPTIONS, 'EMEA', { placeholder: 'Region' }), 'EMEA');
  assert.equal(selectionText(OPTIONS, '', { placeholder: 'Region' }), 'All regions');
  assert.equal(selectionText(OPTIONS, 'missing', { placeholder: 'Region' }), 'Region');
  assert.equal(selectionText(OPTIONS, [], { multiple: true, placeholder: 'Regions' }), 'Regions');
  assert.equal(selectionText(OPTIONS, ['EMEA', 'APAC', 'UK'], { multiple: true }), 'EMEA, Asia Pacific, UK');
});

test('toggleValue adds and removes without dropping the others', () => {
  assert.deepEqual(toggleValue(['EMEA'], 'APAC'), ['EMEA', 'APAC']);
  assert.deepEqual(toggleValue(['EMEA', 'APAC'], 'EMEA'), ['APAC']);
  assert.equal(isChosen(['APAC'], 'APAC', true), true);
  assert.equal(isChosen('EMEA', 'EMEA', false), true);
  assert.equal(isChosen('EMEA', 'APAC', false), false);
});

test('creatableOption offers a new value and hides when it already exists', () => {
  assert.equal(creatableOption(OPTIONS, '  '), null);
  assert.equal(creatableOption(OPTIONS, 'emea'), null);
  assert.deepEqual(creatableOption(OPTIONS, 'LATAM'), { value: 'LATAM', label: 'Add LATAM', create: true });
});
