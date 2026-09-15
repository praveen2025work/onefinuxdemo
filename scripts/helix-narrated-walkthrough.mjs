import fs from 'fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.OFX_BASE || 'http://127.0.0.1:5173';
const CDP = process.env.OFX_CDP || 'http://127.0.0.1:9567';
const READY = '/tmp/ofx-tour-ready';
const GO = '/tmp/ofx-rec-go';
const TIMELINE = '/tmp/ofx-voice/timeline.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CSS = `
#ofx-chapter {
  position: fixed; left: 228px; bottom: 28px; z-index: 2147483646; pointer-events: none;
  background: rgba(67,56,202,.92); color: #f8fafc;
  font: 600 13px/1.2 Inter, sans-serif; padding: 7px 12px; border-radius: 9px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .35);
}
.ofx-spot {
  outline: 2px solid #818cf8 !important;
  outline-offset: 4px;
  border-radius: 10px !important;
}
`;

const beats = JSON.parse(fs.readFileSync('/tmp/ofx-voice/beats.json', 'utf8'));
const dur = Object.fromEntries(beats.map((b) => [b.id, b.duration]));
let t0 = Date.now();
const timeline = [];

function mark(id) {
  const at = (Date.now() - t0) / 1000;
  timeline.push({ id, at: Math.round(at * 1000) / 1000 });
  console.log('BEAT', id, at.toFixed(2));
}

async function connect() {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('5173')) || pages[pages.length - 1];
  await page.bringToFront();
  return page;
}

async function inject(page) {
  await page.evaluate((css) => {
    let s = document.getElementById('ofx-demo-css');
    if (!s) {
      s = document.createElement('style');
      s.id = 'ofx-demo-css';
      document.head.appendChild(s);
    }
    s.textContent = css;
  }, CSS);
}

async function chapter(page, text) {
  await inject(page);
  await page.evaluate((text) => {
    let el = document.getElementById('ofx-chapter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ofx-chapter';
      document.body.appendChild(el);
    }
    el.textContent = text;
  }, text);
}

async function spot(page, sel) {
  await page.evaluate((sel) => {
    document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
    const el = sel && document.querySelector(sel);
    if (el) {
      el.classList.add('ofx-spot');
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, sel);
}

async function maximize(page) {
  const client = await page.createCDPSession();
  try { await client.send('Emulation.clearDeviceMetricsOverride'); } catch { /* ignore */ }
  const { windowId } = await client.send('Browser.getWindowForTarget');
  await client.send('Browser.setWindowBounds', {
    windowId,
    bounds: { left: 0, top: 0, width: 1920, height: 1200, windowState: 'normal' },
  });
  await sleep(200);
  await client.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
  await sleep(300);
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.rail-nav, .app', { timeout: 20000 });
  await page.evaluate(() => {
    try {
      localStorage.setItem('ofx-view', 'all');
      localStorage.setItem('ofx-theme', 'dark');
      localStorage.setItem('ofx-rail', '0');
    } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await inject(page);
  await sleep(400);
}

async function rail(page, href) {
  const ok = await page.evaluate((h) => {
    const a = document.querySelector(`.rail-nav a[href="${h}"]`);
    if (a) { a.click(); return true; }
    return false;
  }, href);
  if (!ok) await go(page, href === '/' ? '/' : href);
  await sleep(700);
  await inject(page);
}

async function clickText(page, selector, re) {
  await page.evaluate((sel, pattern) => {
    const rx = new RegExp(pattern, 'i');
    [...document.querySelectorAll(sel)].find((n) => rx.test(n.innerText || ''))?.click();
  }, selector, re);
  await sleep(500);
}

async function hold(id, extraMs) {
  const ms = Math.round(dur[id] * 1000) + (extraMs || 0);
  await sleep(ms);
}

const page = await connect();
await maximize(page);
await go(page, '/?theme=dark');
for (let i = 0; i < 15; i += 1) {
  const cob = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.ctx')];
    const g = rows.find((r) => /cob/i.test(r.innerText));
    return g?.querySelector('.v')?.textContent || '';
  });
  if (cob && cob !== '—') break;
  await sleep(300);
}

try { fs.unlinkSync(GO); } catch { /* ignore */ }
fs.writeFileSync(READY, String(Date.now()));
const waitGoUntil = Date.now() + 25000;
while (!fs.existsSync(GO) && Date.now() < waitGoUntil) await sleep(120);
t0 = Date.now();
await sleep(250);

/* 1 Home */
mark('home');
await chapter(page, 'Group unit · today');
await spot(page, '.topbar > .sel2.header');
await sleep(3500);
await page.click('.topbar > .sel2.header .sel2-trig').catch(() => {});
await sleep(1800);
await clickText(page, '.sel2-opt', 'Revenue Accounting|REV-ACC');
await sleep(400);
await page.click('.tb-btn.cal').catch(() => {});
await sleep(900);
await page.evaluate(() => document.querySelector('.dp-day.today')?.click());
await sleep(400);
await spot(page, '.ctxbar');
await hold('home', 11000);

/* 2 Onboarding */
await rail(page, '/onboarding');
mark('onboard');
await chapter(page, 'Onboard an outcome');
await spot(page, 'form.panel');
await hold('onboard', 9000);

/* 3 Configuration Helix */
await rail(page, '/configuration');
mark('config');
await chapter(page, 'FOBO / Helix contract');
await clickText(page, '.cfg-item', 'FOBO|investigation');
await sleep(600);
await spot(page, '.cfg-detail');
await hold('config', 10000);

/* 4 Drive */
await rail(page, '/drive');
mark('drive');
await chapter(page, 'Drive the day');
await spot(page, '.dcard');
await clickText(page, '.dcard button', 'Reset');
await sleep(1800);
await page.evaluate(() => {
  const card = [...document.querySelectorAll('.dcard')].find((c) => /FOBO \/ Helix/i.test(c.querySelector('h3')?.innerText || ''));
  card?.classList.add('ofx-spot');
  card?.querySelector('button')?.click();
});
await hold('drive', 8000);

/* 5 Reports — stay until GENERATED */
await rail(page, '/reports');
mark('reports');
await chapter(page, 'Reports · live fold');
const reportsMin = Date.now() + Math.round(dur.reports * 1000) + 8000;
let generated = false;
while (Date.now() < reportsMin + 55000 && !generated) {
  generated = await page.evaluate(() => {
    document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
    const card = [...document.querySelectorAll('.rcard')].find((c) => /FOBO investigation/i.test(c.innerText));
    if (card) card.classList.add('ofx-spot');
    const cta = card?.querySelector('.rcard-cta')?.innerText || '';
    return /\bGENERATED\b/.test(cta) || /\bAVAILABLE\b/.test(cta);
  });
  if (generated) break;
  await sleep(1200);
}
console.log('GENERATED', generated);
await sleep(generated ? 14000 : 5000);

/* 6 Tape */
await rail(page, '/monitoring');
mark('tape');
await chapter(page, 'Monitoring · the tape');
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((n) => /tape|event|outbox|propagat/i.test(n.innerText));
  h?.closest('.panel')?.scrollIntoView({ block: 'start', behavior: 'instant' });
});
await sleep(400);
await spot(page, '.panel');
await hold('tape', 11000);

await page.evaluate(() => {
  document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
  document.getElementById('ofx-chapter')?.remove();
});
timeline.push({ id: 'end', at: Math.round((Date.now() - t0) / 10) / 100 });
fs.writeFileSync(TIMELINE, JSON.stringify({ startedAt: t0, beats: timeline }, null, 2));
console.log('TOUR_DONE', JSON.stringify(timeline));
await sleep(800);
process.exit(0);
