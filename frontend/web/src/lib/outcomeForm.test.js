import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EXAMPLE, formToDefinition, definitionToForm } from './outcomeForm.js';

test('formToDefinition keeps optional grids with from params', () => {
  const def = formToDefinition({
    ...EXAMPLE,
    grids: [{
      id: 'investigation',
      title: 'Investigation',
      endpoint: '/sim/grids/investigation',
      method: 'GET',
      params: [
        { name: 'cobDate', from: 'cobDate', value: '' },
        { name: 'book', from: '', value: 'MB012' },
      ],
    }],
  });
  assert.equal(def.grids.length, 1);
  assert.equal(def.grids[0].endpoint, '/sim/grids/investigation');
  assert.deepEqual(def.grids[0].params, [
    { name: 'cobDate', from: 'cobDate' },
    { name: 'book', value: 'MB012' },
  ]);
});

test('formToDefinition drops grids without id or endpoint', () => {
  const def = formToDefinition({
    ...EXAMPLE,
    grids: [{ id: '', title: 'x', endpoint: '/sim/grids/x', method: 'GET', params: [] }],
  });
  assert.equal(def.grids.length, 0);
});

test('definitionToForm round-trips FOBO-shaped grids', () => {
  const form = definitionToForm({
    id: 'FOBO_HELIX',
    name: 'FOBO',
    question: 'Can I execute this rec?',
    regions: ['GLOBAL'],
    ownerGroup: 'FOBO',
    sla: { withinMinutes: 5 },
    dependencies: [{ eventType: 'MASTERBOOK_READY', sourceSystem: 'MOTIF', expectedCount: 1, label: 'Books' }],
    onReady: { action: 'HTTP_COMMAND', target: 'helix', completionEvent: 'HELIX_ANALYSIS_COMPLETE', actionLabel: 'Helix' },
    grids: [{
      id: 'investigation',
      title: 'Investigation',
      endpoint: '/sim/grids/investigation',
      method: 'GET',
      params: [{ name: 'cobDate', from: 'cobDate' }],
    }],
  });
  assert.equal(form.actionMode, 'command');
  assert.equal(form.grids[0].id, 'investigation');
  const back = formToDefinition(form);
  assert.equal(back.id, 'FOBO_HELIX');
  assert.equal(back.grids[0].params[0].from, 'cobDate');
});
