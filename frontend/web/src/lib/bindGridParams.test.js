import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindGridParams, gridRequestUrl } from './bindGridParams.js';

const context = {
  cobDate: '2026-09-12',
  region: 'EMEA',
  groupUnitId: 'REV-ACC',
  account: '410000',
  journalId: 'JE-8801',
  status: 'BLOCKED',
};

test('bindGridParams copies context fields named in from', () => {
  const params = bindGridParams([
    { name: 'cobDate', from: 'cobDate' },
    { name: 'region', from: 'region' },
    { name: 'groupUnitId', from: 'groupUnitId' },
  ], context);
  assert.deepEqual(params, {
    cobDate: '2026-09-12',
    region: 'EMEA',
    groupUnitId: 'REV-ACC',
  });
});

test('bindGridParams uses literal value when set', () => {
  const params = bindGridParams([
    { name: 'status', from: 'status', value: 'READY' },
    { name: 'account', from: 'account' },
  ], context);
  assert.equal(params.status, 'READY');
  assert.equal(params.account, '410000');
});

test('bindGridParams omits empty context values', () => {
  const params = bindGridParams([
    { name: 'region', from: 'region' },
    { name: 'runId', from: 'runId' },
  ], { region: '', runId: null });
  assert.deepEqual(params, {});
});

test('gridRequestUrl appends bound params on GET', () => {
  const req = gridRequestUrl('/sim/grids/investigation', 'GET', {
    cobDate: '2026-09-12',
    account: '410000',
  });
  assert.equal(req.method, 'GET');
  assert.equal(req.url, '/sim/grids/investigation?cobDate=2026-09-12&account=410000');
  assert.equal(req.params.account, '410000');
});
