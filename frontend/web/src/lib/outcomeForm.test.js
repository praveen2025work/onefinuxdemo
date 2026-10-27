import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLANK_FEED, EXAMPLE, OUTCOME_STEPS, firstIncompleteStep, formToDefinition, definitionToForm, stepErrors } from './outcomeForm.js';

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

test('the six outcome steps run outcome → feeds → SLA → when ready → grids → review', () => {
  assert.deepEqual(OUTCOME_STEPS.map((s) => s.id), ['outcome', 'feeds', 'sla', 'ready', 'grids', 'review']);
});

test('stepErrors names what blocks each step', () => {
  for (const s of OUTCOME_STEPS) assert.deepEqual(stepErrors(EXAMPLE, s.id), [], s.id);
  assert.equal(stepErrors({ ...EXAMPLE, id: 'mec close' }, 'outcome').length, 1);
  assert.equal(stepErrors({ ...EXAMPLE, name: ' ', question: '' }, 'outcome').length, 2);
  assert.match(stepErrors({ ...EXAMPLE, feeds: [{ ...BLANK_FEED }] }, 'feeds')[0], /at least one input feed/);
  assert.match(stepErrors({ ...EXAMPLE, feeds: [EXAMPLE.feeds[0], EXAMPLE.feeds[0]] }, 'feeds')[0], /once/);
  assert.match(stepErrors({ ...EXAMPLE, slaMode: 'cutoff', cutoff: '7.30' }, 'sla')[0], /HH:MM/);
  assert.equal(stepErrors({ ...EXAMPLE, actionMode: 'command' }, 'ready').length, 2);
  assert.match(stepErrors({ ...EXAMPLE, grids: [{ id: 'g', title: '', endpoint: ' ', params: [] }] }, 'grids')[0], /endpoint/);
  assert.deepEqual(stepErrors({ ...EXAMPLE, grids: [{ id: '', title: '', endpoint: '/sim/grids/', params: [] }] }, 'grids'), []);
});

test('review collects every step and firstIncompleteStep points at the first gap', () => {
  assert.equal(firstIncompleteStep(EXAMPLE), OUTCOME_STEPS.length - 1);
  assert.equal(firstIncompleteStep({ ...EXAMPLE, feeds: [{ ...BLANK_FEED }] }), 1);
  assert.equal(stepErrors({ ...EXAMPLE, name: '', feeds: [{ ...BLANK_FEED }] }, 'review').length, 2);
});
