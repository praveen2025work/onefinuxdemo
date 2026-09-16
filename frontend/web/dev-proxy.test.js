import assert from 'node:assert/strict';
import { test } from 'node:test';
import { javaDevProxies } from './dev-proxy.js';

function captureProxyReqHandler(configure) {
  let handler;
  configure({
    on(event, fn) {
      if (event === 'proxyReq') handler = fn;
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
