import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatOrigin, chatSrc, contextMessage, readChatMessage, safeChatRoute } from './chatHost.js';

const PAGE = 'http://localhost:7091';

test('the frame URL carries the embed flag, theme and scope', () => {
  assert.equal(chatSrc({ url: '/chatbot-demo.html' }, { theme: 'dark', skin: 'steps', scope: { groupUnit: 'REV-ACC', cobDate: '2026-09-12' }, pageOrigin: PAGE }),
    '/chatbot-demo.html?ofx-embed=1&theme=dark&skin=steps&groupUnit=REV-ACC&cobDate=2026-09-12');
  assert.match(chatSrc({ url: 'https://chat.bank.local/bot' }, { pageOrigin: PAGE }), /^https:\/\/chat\.bank\.local\/bot\?ofx-embed=1&theme=light&skin=steps$/);
  assert.equal(chatSrc({ url: 'javascript:alert(1)' }, { pageOrigin: PAGE }), null);
  assert.equal(chatSrc(null, { pageOrigin: PAGE }), null);
});

test('the origin is configured or derived from the URL', () => {
  assert.equal(chatOrigin({ url: '/chatbot-demo.html' }, PAGE), PAGE);
  assert.equal(chatOrigin({ url: 'https://chat.bank.local/bot' }, PAGE), 'https://chat.bank.local');
  assert.equal(chatOrigin({ url: 'https://cdn.bank.local/bot', origin: 'https://chat.bank.local/' }, PAGE), 'https://chat.bank.local');
});

test('only the bot, from its frame, may ask to open a console route or share a context', () => {
  const frame = {};
  const ev = (data, origin = PAGE, source = frame) => ({ origin, source, data });
  const opts = { origin: PAGE, frameWindow: frame };
  assert.deepEqual(readChatMessage(ev({ type: 'ofx.chat.ready' }), opts), { kind: 'ready' });
  assert.deepEqual(readChatMessage(ev({ type: 'ofx.chat.open', route: '/board' }), opts), { kind: 'open', route: '/board' });
  assert.equal(readChatMessage(ev({ type: 'ofx.chat.open', route: 'https://evil.example' }), opts), null);
  assert.equal(readChatMessage(ev({ type: 'ofx.chat.open', route: '//evil.example' }), opts), null);
  assert.equal(readChatMessage(ev({ type: 'ofx.chat.open', route: '/board' }, 'https://evil.example'), opts), null);
  assert.equal(readChatMessage(ev({ type: 'ofx.chat.open', route: '/board' }, PAGE, {}), opts), null);
  assert.deepEqual(readChatMessage(ev({ type: 'ofx.chat.share', context: { type: 'ofx.instance', id: 'R-2031' } }), opts).kind, 'share');
  assert.equal(readChatMessage(ev({ type: 'ofx.chat.share', context: { type: 'evil' } }), opts), null);
  assert.equal(readChatMessage(ev('hello'), opts), null);
  assert.equal(safeChatRoute('/a\\b'), null);
});

test('the context message names the scope', () => {
  assert.deepEqual(contextMessage({ groupUnit: 'REV-ACC' }, '/board', 'alice'),
    { type: 'ofx.context', scope: { groupUnit: 'REV-ACC', cobDate: null, region: null }, page: '/board', user: 'alice' });
});
