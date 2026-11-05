import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

// public/ofx-interop.js run in a minimal fake browser: embedded mode for any stack (data-ofx-hosts).
const src = fs.readFileSync(new URL('./public/ofx-interop.js', import.meta.url), 'utf8');
const HOST = 'https://onefinance.bank.example';

function load({ search = '', referrer = '', name = '', hosts = null, wijmo = false, framed = true, skin = null } = {}) {
  const attrs = skin ? { 'data-skin': skin } : {};
  const links = [];
  const posted = [];
  const element = () => {
    const a = {};
    return { setAttribute: (k, v) => { a[k] = String(v); }, getAttribute: (k) => a[k] ?? null, set rel(v) { a.rel = v; }, set href(v) { a.href = v; }, get href() { return a.href; } };
  };
  const document = {
    referrer,
    currentScript: { getAttribute: (k) => (k === 'data-ofx-hosts' ? hosts : null), hasAttribute: (k) => k === 'data-ofx-wijmo' && wijmo },
    documentElement: { setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => attrs[k] ?? null, hasAttribute: (k) => k in attrs },
    querySelector: (sel) => links.find((l) => sel.includes(`"${l.getAttribute('data-ofx')}"`)) || null,
    createElement: element,
    head: { appendChild: (l) => links.push(l) },
  };
  const win = {
    document, location: { search }, name, URL, URLSearchParams, Promise, setTimeout, clearTimeout, console,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  };
  win.window = win;
  win.parent = framed ? { postMessage: (message, origin) => posted.push({ message, origin }) } : win;
  vm.createContext(win);
  vm.runInContext(src, win);
  return { win, attrs, links: links.map((l) => l.href), posted };
}

test('a listed One Finance host turns embedded mode on: attributes, host tokens, theme, remembered host', () => {
  const { win, attrs, links, posted } = load({ search: '?ofx-embed=1&theme=dark&skin=barclays', referrer: `${HOST}/desks`, hosts: `${HOST}/`, wijmo: true });
  assert.equal(attrs['data-ofx-embedded'], '1');
  assert.equal(attrs['data-skin'], 'barclays');
  assert.equal(attrs['data-theme'], 'dark');
  assert.deepEqual(links, [`${HOST}/theme/onefinux-tokens.css`, `${HOST}/theme/onefinux-wijmo.css`]);
  assert.equal(win.name, `ofx-embedded|${HOST}`);
  assert.deepEqual(JSON.parse(JSON.stringify(win.ofx.getEmbed())), { embedded: true, hostOrigin: HOST, theme: 'dark', skin: 'barclays' });
  assert.deepEqual(posted.map((p) => [p.message.type, p.origin]), [['ofx.ready', HOST]]);
});

test('a framer that is not listed gets nothing: no embedded mode, no handshake', () => {
  const { attrs, links, posted } = load({ search: '?ofx-embed=1&skin=barclays', referrer: 'https://evil.example/x', hosts: HOST });
  assert.equal(attrs['data-ofx-embedded'], undefined);
  assert.deepEqual(links, []);
  assert.deepEqual(posted, []);
});

test('without data-ofx-hosts the SDK behaves as before: FDC3 handshake with the framer, no styling', () => {
  const { attrs, posted } = load({ search: '?ofx-embed=1', referrer: `${HOST}/desks` });
  assert.equal(attrs['data-ofx-embedded'], undefined);
  assert.deepEqual(posted.map((p) => p.origin), [HOST]);
});

test('a reload inside the frame keeps embedded mode through window.name', () => {
  const { attrs, links } = load({ search: '', referrer: 'https://team-app.bank.example/page', name: `ofx-embedded|${HOST}`, hosts: HOST });
  assert.equal(attrs['data-ofx-embedded'], '1');
  assert.equal(attrs['data-skin'], 'barclays', 'the standard when no skin is given');
  assert.deepEqual(links, [`${HOST}/theme/onefinux-tokens.css`]);
});

test('a malformed skin is ignored; an app that set its own skin keeps it', () => {
  assert.equal(load({ search: '?ofx-embed=1&skin=%3Cb%3E', referrer: `${HOST}/`, hosts: HOST }).attrs['data-skin'], 'barclays');
  assert.equal(load({ search: '?ofx-embed=1', referrer: `${HOST}/`, hosts: HOST, skin: 'steps' }).attrs['data-skin'], 'steps');
  assert.equal(load({ search: '?ofx-embed=1', referrer: `${HOST}/`, hosts: HOST, framed: false }).attrs['data-ofx-embedded'], undefined, 'not framed');
});
