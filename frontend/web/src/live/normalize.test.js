import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIVE_EVENTS, backoffMs, normalizeExternalNotification, parseFrame, socketUrl } from './normalize.js';

test('the live channel carries screen links (context, intent) as well as hub events', () => {
  for (const name of ['notification', 'outcome', 'event', 'context', 'intent']) assert.ok(LIVE_EVENTS.includes(name), name);
});

test('parseFrame reads {type, data} frames only', () => {
  assert.deepEqual(parseFrame('{"type":"context","data":{"channel":"blue"}}'), { name: 'context', data: { channel: 'blue' } });
  assert.deepEqual(parseFrame({ type: 'hello' }), { name: 'hello', data: null });
  assert.equal(parseFrame('not json'), null);
  assert.equal(parseFrame('{"data":1}'), null);
  assert.equal(parseFrame('{"type":""}'), null);
});

test('socketUrl follows the page scheme', () => {
  assert.equal(socketUrl('/api/ws', { protocol: 'https:', host: 'onefin.bank' }), 'wss://onefin.bank/api/ws');
  assert.equal(socketUrl('/api/ws', { protocol: 'http:', host: 'localhost:7091' }), 'ws://localhost:7091/api/ws');
});

test('backoffMs doubles up to 15s', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9, -1].map(backoffMs), [1000, 2000, 4000, 8000, 15000, 15000, 1000]);
});

test('normalizeExternalNotification folds STEPS payloads and plain text into hub notifications', () => {
  const now = Date.parse('2026-09-12T10:00:00Z');
  const steps = normalizeExternalNotification({ id: 7, type: 'rejection', title: 'Rejected', message: 'Sign-off rejected',
    timestamp: '2026-09-12T09:30:00Z', workflowId: 'WF-1', sender: { name: 'STEPS' } }, now);
  assert.deepEqual(steps, {
    id: 'ext-7', createdAt: '2026-09-12T09:30:00.000Z', severity: 'CRITICAL', transition: 'EXTERNAL', outcomeKey: 'WF-1',
    outcomeName: 'STEPS', title: 'Rejected', message: 'Sign-off rejected', source: 'external',
  });
  const text = normalizeExternalNotification('Feed restarted', now);
  assert.equal(text.severity, 'INFO');
  assert.equal(text.message, 'Feed restarted');
  assert.equal(text.createdAt, '2026-09-12T10:00:00.000Z');
  assert.equal(normalizeExternalNotification({ severity: 'WARN', timestamp: 'garbage' }, now).severity, 'WARN');
});
