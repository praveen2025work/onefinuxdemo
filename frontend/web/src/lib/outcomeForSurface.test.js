import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outcomeForSurface } from './outcomeForSurface.js';

const defs = [
  { id: 'REPORT_15C3', grids: [] },
  { id: 'FOBO_HELIX', grids: [{ id: 'investigation', endpoint: '/sim/grids/investigation' }] },
  { id: 'PNL_REPORTING', grids: [] },
];

test('outcomeForSurface matches report document by outcome id', () => {
  const hit = outcomeForSurface(defs, { outcomeId: 'FOBO_HELIX' });
  assert.equal(hit.id, 'FOBO_HELIX');
  assert.equal(hit.grids[0].id, 'investigation');
});

test('outcomeForSurface matches stitch kit FOBO to FOBO_HELIX by kit prefix', () => {
  const hit = outcomeForSurface(defs, { kitId: 'FOBO' });
  assert.equal(hit.id, 'FOBO_HELIX');
});

test('outcomeForSurface prefers exact kit id when present', () => {
  const withExact = [...defs, { id: 'FOBO', grids: [{ id: 'own' }] }];
  const hit = outcomeForSurface(withExact, { kitId: 'FOBO' });
  assert.equal(hit.id, 'FOBO');
});

test('outcomeForSurface returns null when nothing matches', () => {
  assert.equal(outcomeForSurface(defs, { kitId: 'NOPE' }), null);
});
