import assert from 'node:assert/strict';
import { test } from 'node:test';
import { destsPublishSurface, stepViewFromDetail } from './stepViewFromDetail.js';

const staleDetail = {
  instance: {
    instanceId: 'FOBO|2026-09-12|APAC|R-1042',
    kitId: 'FOBO',
    renderer: 'HELIX_RECON',
    embedUrl: 'https://helix.example/fobo',
  },
  destinations: [
    { destId: 'HELIX', displayName: 'Helix FOBO', actionType: 'COMMAND', stepOrder: 1 },
    { destId: 'FAS_MOTIF', displayName: 'FAS post to MOTIF', actionType: 'COMMAND', stepOrder: 2 },
    { destId: 'PNL_AGENT', displayName: 'P&L Agent notify', actionType: 'NOTIFY', stepOrder: 3 },
  ],
  events: [
    { sourceSystem: 'HELIX', eventType: 'HELIX_ANALYSIS_COMPLETE', status: 'COMPLETED', sourceKey: 'RUN-A37C', occurredAt: 't1', attributesJson: '{}' },
    { sourceSystem: 'MOTIF', eventType: 'LEDGER_POSTED', status: 'COMPLETED', sourceKey: 'MB012', occurredAt: 't2', attributesJson: '{"journalId":"JE-8801"}' },
    { sourceSystem: 'CATS', eventType: 'TRADE_BOOKED', status: 'COMPLETED', sourceKey: 'TR-8812', occurredAt: 't3', attributesJson: '{"account":"410000"}' },
  ],
};

test('stale hub destinations do not publish surface', () => {
  assert.equal(destsPublishSurface(staleDetail), false);
});

test('HELIX dest without surface is IFRAME of the local Helix stub, not a 404', () => {
  const out = stepViewFromDetail(staleDetail, 'HELIX');
  assert.equal(out.kind, 'IFRAME');
  assert.equal(out.title, 'Helix FOBO');
  assert.equal(out.embedUrl, '/sim/screens/helix');
});

test('FAS_MOTIF dest without reportSourceId matches MOTIF events via dest id', () => {
  const out = stepViewFromDetail(staleDetail, 'FAS_MOTIF');
  assert.equal(out.kind, 'GRID');
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].journalId, 'JE-8801');
});

test('source feed CATS is GRID of that feed', () => {
  const out = stepViewFromDetail(staleDetail, 'CATS');
  assert.equal(out.kind, 'GRID');
  assert.equal(out.rows[0].account, '410000');
});

test('IFRAME dest uses kit embed url', () => {
  const detail = {
    instance: { embedUrl: '/sim/screens/helix', allowedOrigin: 'http://localhost:7091' },
    destinations: [{ destId: 'HELIX', displayName: 'Helix FOBO', surface: 'IFRAME' }],
    events: [],
  };
  assert.equal(destsPublishSurface(detail), true);
  const out = stepViewFromDetail(detail, 'HELIX');
  assert.equal(out.kind, 'IFRAME');
  assert.equal(out.embedUrl, '/sim/screens/helix');
});

test('unknown ref is NONE, not an error string', () => {
  const out = stepViewFromDetail(staleDetail, 'NOPE');
  assert.equal(out.kind, 'NONE');
  assert.deepEqual(out.rows, []);
});
