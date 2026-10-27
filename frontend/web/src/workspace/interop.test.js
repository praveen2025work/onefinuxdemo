import assert from 'node:assert/strict';
import { test } from 'node:test';

// interop.js reads where it runs (embed.js) at load: a top-level console document.
globalThis.window = { location: { search: '', origin: 'http://localhost:7091' }, name: '' };
globalThis.window.parent = globalThis.window;
// No cross-document bus in this test (Node's BroadcastChannel would also keep the process alive).
globalThis.BroadcastChannel = undefined;
const { CLIENT_ID, broadcastContext, deliverRemoteContext, onAnyContext, setSharedRelay } = await import('./interop.js');

const ctx = { type: 'ofx.instance', id: 'R-2031' };

test('a broadcast on an outcome channel is handed to the shared relay once; colours stay in this browser', () => {
  const relayed = [];
  setSharedRelay((msg) => relayed.push(msg));
  assert.equal(broadcastContext(ctx, { channel: 'outcome:kit-fobo', source: 'v1' }), true);
  assert.equal(broadcastContext(ctx, { channel: 'blue', source: 'v1' }), true);
  assert.equal(relayed.length, 1);
  assert.equal(relayed[0].channel, 'outcome:kit-fobo');
  assert.ok(relayed[0].id.startsWith(CLIENT_ID + ':'));
  assert.equal(broadcastContext(ctx, { channel: null }), false);
  setSharedRelay(null);
});

test('the hub echo of our own broadcast and repeated messages are dropped; other browsers are delivered once', () => {
  const seen = [];
  const off = onAnyContext((msg) => seen.push(msg));
  assert.equal(deliverRemoteContext({ channel: 'outcome:kit-fobo', context: ctx, origin: CLIENT_ID, id: CLIENT_ID + ':1' }), false);
  assert.equal(deliverRemoteContext({ channel: 'outcome:kit-fobo', context: ctx, origin: 'cother-browser', id: 'cother-browser:7', by: 'alex', at: '2026-09-12T10:00:00Z' }), true);
  assert.equal(deliverRemoteContext({ channel: 'outcome:kit-fobo', context: ctx, origin: 'cother-browser', id: 'cother-browser:7' }), false);
  assert.equal(deliverRemoteContext({ channel: 'outcome:kit-fobo', context: { id: 'no type' }, origin: 'cother-browser' }), false);
  off();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].remote, true);
  assert.equal(seen[0].by, 'alex');
  assert.equal(seen[0].at, Date.parse('2026-09-12T10:00:00Z'));
});
