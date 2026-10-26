import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capIds, filterNotifications, mergeNotifications, notificationKind, relativeTime, unreadCount } from './notifyState.js';

const n = (id, extra = {}) => ({ id, createdAt: '2026-09-12T10:00:00Z', title: 'T' + id, message: '', ...extra });

test('notificationKind maps hub severity and transition onto STEPS types', () => {
  assert.equal(notificationKind({ severity: 'CRITICAL' }), 'rejection');
  assert.equal(notificationKind({ transition: 'blocked' }), 'rejection');
  assert.equal(notificationKind({ severity: 'WARN' }), 'alert');
  assert.equal(notificationKind({ transition: 'SLA_AT_RISK' }), 'alert');
  assert.equal(notificationKind({ transition: 'READY' }), 'approval');
  assert.equal(notificationKind({}), 'info');
});

test('mergeNotifications prefers the hub copy and sorts newest first', () => {
  const hub = [n('1', { title: 'hub', createdAt: '2026-09-12T09:00:00Z' }), n('2', { createdAt: '2026-09-12T11:00:00Z' })];
  const extras = [n('1', { title: 'live' }), n('ext-3', { createdAt: '2026-09-12T10:30:00Z' }), { title: 'no id' }];
  const merged = mergeNotifications(hub, extras);
  assert.deepEqual(merged.map((x) => x.id), ['2', 'ext-3', '1']);
  assert.equal(merged[2].title, 'hub');
  assert.equal(mergeNotifications(hub, extras, 1).length, 1);
});

test('unread count and the capped read set', () => {
  assert.equal(unreadCount([n('1'), n('2'), n('3')], new Set(['2'])), 2);
  assert.deepEqual([...capIds(['a', 'b', 'c', 'd'], 2)], ['c', 'd']);
});

test('filterNotifications by tab and query', () => {
  const list = [n('1', { severity: 'CRITICAL', title: 'FOBO blocked' }), n('2', { severity: 'WARN', outcomeName: 'Trial balance' }), n('3')];
  const readIds = new Set(['3']);
  assert.deepEqual(filterNotifications(list, { tab: 'unread', readIds }).map((x) => x.id), ['1', '2']);
  assert.deepEqual(filterNotifications(list, { tab: 'alert' }).map((x) => x.id), ['2']);
  assert.deepEqual(filterNotifications(list, { query: 'TRIAL' }).map((x) => x.id), ['2']);
  assert.deepEqual(filterNotifications(list, { tab: 'rejection', query: 'fobo' }).map((x) => x.id), ['1']);
});

test('relativeTime', () => {
  const now = Date.parse('2026-09-12T12:00:00Z');
  assert.equal(relativeTime('2026-09-12T11:59:48Z', now), '12s ago');
  assert.equal(relativeTime('2026-09-12T11:56:00Z', now), '4m ago');
  assert.equal(relativeTime('2026-09-12T09:00:00Z', now), '3h ago');
  assert.match(relativeTime('2026-09-01T09:00:00Z', now), /^01 Sep/); // 'Sep' or 'Sept' depending on ICU
  assert.equal(relativeTime('nope', now), '');
});
