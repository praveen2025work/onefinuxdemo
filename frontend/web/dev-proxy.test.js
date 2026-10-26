import assert from 'node:assert/strict';
import { test } from 'node:test';
import { javaDevProxies } from './dev-proxy.js';

function captureProxyReqHandler(configure, name = 'proxyReq') {
  let handler;
  configure({
    on(event, fn) {
      if (event === name) handler = fn;
    },
  });
  return handler;
}

test('Drive /sim proxy does not forward the browser Origin to the simulator', () => {
  const handler = captureProxyReqHandler(javaDevProxies()['/sim'].configure);
  assert.equal(typeof handler, 'function');
  const removed = [];
  handler({ removeHeader(name) { removed.push(name); } });
  assert.deepEqual(removed, ['origin']);
});

test('Board /api proxy does not forward the browser Origin to the hub', () => {
  const handler = captureProxyReqHandler(javaDevProxies()['/api'].configure);
  const removed = [];
  handler({ removeHeader(name) { removed.push(name); } });
  assert.deepEqual(removed, ['origin']);
});

test('Live /api/ws upgrade is proxied and does not forward the browser Origin', () => {
  const api = javaDevProxies()['/api'];
  assert.equal(api.ws, true);
  const handler = captureProxyReqHandler(api.configure, 'proxyReqWs');
  assert.equal(typeof handler, 'function');
  const removed = [];
  handler({ removeHeader(name) { removed.push(name); } });
  assert.deepEqual(removed, ['origin']);
});
