import fs from 'fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.OFX_BASE || 'http://127.0.0.1:5173';
const CDP = process.env.OFX_CDP || 'http://127.0.0.1:9567';
const READY = '/tmp/ofx-tour-ready';
const GO = '/tmp/ofx-rec-go';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CSS = `
#ofx-chapter {
  position: fixed; left: 228px; bottom: 108px; z-index: 2147483646; pointer-events: none;
  background: linear-gradient(90deg, #4338ca, #6366f1);
  color: #f8fafc; font: 650 14px/1.2 Inter, Sora, sans-serif;
  padding: 8px 14px; letter-spacing: .01em; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .35); max-width: min(560px, calc(100vw - 260px));
}
#ofx-chapter span { opacity: .82; font-weight: 500; margin-left: 8px; }
#ofx-caption {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
  z-index: 2147483647; pointer-events: none;
  background: #0b1020; color: #eef2ff;
  border: 1px solid #818cf8; border-left: 5px solid #818cf8;
  border-radius: 12px; padding: 12px 18px 12px 16px;
  font: 600 17px/1.35 Inter, "Segoe UI", sans-serif;
  max-width: min(860px, calc(100vw - 28px)); text-align: left;
  box-shadow: 0 14px 36px rgba(2, 6, 23, .55);
}
#ofx-caption small {
  display: block; margin-top: 5px; font-weight: 500; font-size: 13.5px; color: #c7d2fe;
}
.ofx-spot {
  outline: 3px solid #818cf8 !important;
  outline-offset: 5px;
  border-radius: 10px !important;
  position: relative;
  z-index: 30;
  box-shadow: 0 0 0 6px rgba(129,140,248,.24), 0 0 0 9999px rgba(8,11,24,.38) !important;
}
`;

async function connect() {
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('5173')) || pages[pages.length - 1];
  await page.bringToFront();
  return { browser, page };
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

async function maximizeDesktop(page) {
  const client = await page.createCDPSession();
  try { await client.send('Emulation.clearDeviceMetricsOverride'); } catch { /* ignore */ }
  try { await client.send('Emulation.setTouchEmulationEnabled', { enabled: false }); } catch { /* ignore */ }
  const { windowId } = await client.send('Browser.getWindowForTarget');
  await client.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await sleep(200);
  await client.send('Browser.setWindowBounds', {
    windowId,
    bounds: { left: 0, top: 0, width: 1920, height: 1200, windowState: 'normal' },
  });
  await sleep(200);
  await client.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'maximized' } });
  await sleep(400);
  console.log('DESKTOP', await page.evaluate(() => [window.innerWidth, window.innerHeight]));
  return client;
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.rail-nav, .ph-title, .app', { timeout: 20000 });
  await page.evaluate(() => {
    try {
      localStorage.setItem('ofx-view', 'all');
      localStorage.setItem('ofx-theme', 'dark');
      localStorage.setItem('ofx-rail', '0');
    } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await inject(page);
  await sleep(700);
}

async function chapter(page, title, sub) {
  await inject(page);
  await page.evaluate((title, sub) => {
    let el = document.getElementById('ofx-chapter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ofx-chapter';
      document.body.appendChild(el);
    }
    el.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
  }, title, sub || '');
}

async function clearSpot(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
    document.getElementById('ofx-caption')?.remove();
  });
}

async function highlight(page, selector, title, sub, ms) {
  await inject(page);
  const found = await page.evaluate((sel, title, sub) => {
    document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
    document.getElementById('ofx-caption')?.remove();
    let el = null;
    if (sel) {
      for (const part of sel.split(',')) {
        const s = part.trim();
        if (!s) continue;
        el = document.querySelector(s);
        if (el) break;
      }
    }
    if (el) {
      el.classList.add('ofx-spot');
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    const cap = document.createElement('div');
    cap.id = 'ofx-caption';
    cap.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
    document.body.appendChild(cap);
    return !!el;
  }, selector, title, sub);
  console.log('HL', found ? 'ok' : 'miss', selector, title);
  if (found) {
    try {
      const handle = await page.$(selector.split(',')[0].trim());
      const box = handle && await handle.boundingBox();
      if (box) await page.mouse.move(box.x + Math.min(box.width / 2, 80), box.y + Math.min(box.height / 2, 24), { steps: 8 });
    } catch { /* ignore */ }
  }
  await sleep(ms);
  return found;
}

async function highlightText(page, selector, re, title, sub, ms) {
  await inject(page);
  const found = await page.evaluate((sel, pattern, title, sub) => {
    document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
    document.getElementById('ofx-caption')?.remove();
    const rx = new RegExp(pattern, 'i');
    const el = [...document.querySelectorAll(sel)].find((n) => rx.test(n.innerText || ''));
    if (el) {
      el.classList.add('ofx-spot');
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    const cap = document.createElement('div');
    cap.id = 'ofx-caption';
    cap.innerHTML = `<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}`;
    document.body.appendChild(cap);
    return !!el;
  }, selector, re, title, sub);
  console.log('HLX', found ? 'ok' : 'miss', selector, re, title);
  await sleep(ms);
  return found;
}

async function clickText(page, selector, re) {
  await page.evaluate((sel, pattern) => {
    const rx = new RegExp(pattern, 'i');
    const el = [...document.querySelectorAll(sel)].find((n) => rx.test(n.innerText || ''));
    el?.click();
  }, selector, re);
  await sleep(600);
}

async function rail(page, href) {
  await clearSpot(page);
  const clicked = await page.evaluate((h) => {
    const a = document.querySelector(`.rail-nav a[href="${h}"]`);
    if (a) { a.click(); return true; }
    return false;
  }, href);
  if (!clicked) await go(page, href === '/' ? '/' : href);
  await sleep(900);
  await inject(page);
}

async function waitContext(page) {
  for (let i = 0; i < 20; i += 1) {
    const cob = await page.evaluate(() => document.querySelector('.ctx .v')?.textContent || '');
    const group = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.ctx')];
      const g = rows.find((r) => /group_unit/i.test(r.innerText));
      return g?.querySelector('.v')?.textContent || '';
    });
    if (group && group !== '—' && cob && cob !== '—') return;
    await sleep(400);
  }
}

const { browser, page } = await connect();
await page.evaluate(() => {
  try {
    localStorage.setItem('ofx-view', 'all');
    localStorage.setItem('ofx-theme', 'dark');
    localStorage.setItem('ofx-rail', '0');
  } catch { /* ignore */ }
  document.documentElement.setAttribute('data-theme', 'dark');
});
await maximizeDesktop(page);
await go(page, '/?theme=dark');
await waitContext(page);
await chapter(page, '1 · Group unit', 'Scope the close');
await inject(page);
console.log('READY', page.url());

try { fs.unlinkSync(GO); } catch { /* ignore */ }
fs.writeFileSync(READY, String(Date.now()));
const waitGoUntil = Date.now() + 30000;
while (!fs.existsSync(GO) && Date.now() < waitGoUntil) await sleep(150);
await sleep(400);

/* ───────── 1. Home + group unit ───────── */
await highlight(page, '.brand', 'One Finance UX console', 'The product UI is this Vite app on port 5173. Hub 7070 is API only — do not open it as the product.', 5000);
await highlight(page, '.rail-nav', 'Left rail — every screen', 'Console (Home, Board, Outcomes, Reports), Guide, Operate, Observe, Build, Testing. View filters this list; it is not entitlement.', 6500);
await highlight(page, '.rail-nav .nav-sec:first-child', 'Console — where work is done', 'Home is the control tower. Board is traffic lights. My outcomes is the doer list. Reports is where Helix lands.', 6000);
await highlight(page, '.topbar > .sel2.header', 'Group unit — the onboarding boundary', 'REV-ACC (Revenue Accounting) is the seeded unit. The close is always scoped to one group unit. There is no create form — units are registry data.', 7000);

await page.click('.topbar > .sel2.header .sel2-trig');
await sleep(500);
await highlight(page, '.sel2-menu, .topbar > .sel2.header', 'Pick the unit for this session', 'Only Revenue Accounting is seeded. CEES resource is groupUnit:REV-ACC. Header writes the same row Configuration shows.', 6500);
await clickText(page, '.sel2-opt', 'Revenue Accounting|REV-ACC');
await sleep(400);

await highlight(page, '.tb-btn.cal, .dp', 'COB date — Helix uses today', 'Engine Helix stamps LocalDate.now(America/New_York). If this still says 12 Sep 2026 you are on the stitch rec day, not the Helix run.', 6500);
await page.click('.tb-btn.cal');
await sleep(500);
await highlight(page, '.dp-pop, .dp', 'Calendar — choose today', 'Today is highlighted. Quick chips at the bottom are COBs that already have data. Helix engine = today. FOBO stitch recs = 12 Sep 2026.', 5500);
const clickedToday = await page.evaluate(() => {
  const today = document.querySelector('.dp-day.today');
  if (today) { today.click(); return 'day'; }
  const quick = [...document.querySelectorAll('.dp-quick')].find((b) => /today/i.test(b.innerText));
  if (quick) { quick.click(); return 'quick'; }
  return null;
});
console.log('COB_TODAY', clickedToday);
await sleep(500);

await highlight(page, '.tb-filters .sel2.plain', 'Region — leave as all regions', 'Helix FOBO_HELIX folds GLOBAL. Do not filter to APAC/EMEA or Reports will look empty.', 5000);
await highlight(page, '.tb-filters .sel2.header', 'View — All screens', 'Developer/All keep Drive and Onboarding on the rail. Controller, BU head and RTB hide testing screens on purpose.', 5500);
await page.click('.tb-filters .sel2.header .sel2-trig');
await sleep(400);
await highlight(page, '.sel2-menu, .tb-filters .sel2.header', 'Five session views', 'All screens · Developer · Controller · BU head · RTB. A view hides the rail. It is not CEES entitlement.', 5500);
await clickText(page, '.sel2-opt', 'All screens');
await sleep(300);

await highlight(page, '.live-pill, .env', 'Live tape + environment', 'Green live means SSE from the hub is connected. UAT is the demo environment chip.', 4500);
await highlight(page, '.ctxbar', 'Scope bar — group_unit · cob · region · view', 'Everything below this bar is filtered to REV-ACC and the COB you just set. Instances / ready / blocked / escalations sit on the right.', 6500);
await highlight(page, '.ph, .story', 'Home — today’s close for this unit', 'Ready rows, named blockers, predicted ready. Home never injects facts. You will Drive Helix from Testing → Drive scenarios.', 6500);
await highlight(page, '.stats', 'Unit KPIs include the group unit', 'Instances in scope foot the group unit id. This is the same REV-ACC you picked in the header.', 5000);

/* ───────── 2. Configuration group unit ───────── */
await chapter(page, '1 · Group unit', 'Inspect the registry');
await rail(page, '/configuration');
await chapter(page, '1 · Group unit', 'Inspect the registry');
await highlight(page, '.ph', 'Configuration governs — it does not create', 'Pick an outcome or kit on the left. To create a new outcome, use Onboarding. Group unit is scope, not a form.', 5500);
await highlight(page, '.cfg-steps', 'Three steps on this screen', '1 pick · 2 inspect live state · + onboard a new one if you need it.', 4500);
await highlightText(page, '.cfg-rail .panel', 'Group unit', 'Group unit panel — REV-ACC', 'Name, regions and COB dates for the header unit. This is the seeded tenant. New units are schema/registry data, not a console wizard.', 7500);
await highlight(page, '.cfg-rail .cfg-list', 'Business outcomes already live', 'FOBO investigation (FOBO_HELIX), 15C3, PnL. Helix is the first row’s on-ready destination — we will open it after we create a new outcome.', 6000);

/* ───────── 3. Onboard outcome ───────── */
await chapter(page, '2 · Onboard an outcome', 'Create as data, not a new app');
await rail(page, '/onboarding');
await chapter(page, '2 · Onboard an outcome', 'Create as data, not a new app');
await highlight(page, '.ph', 'Onboarding creates a business outcome', 'Question + feeds + SLA + on-ready. Submit is POST /api/outcomes/definitions. No Java type. No new screen.', 6000);
await highlight(page, '.banner.plain, .banner', 'Creates vs governs', 'Onboarding writes the kit. Configuration inspects it. Helix and 15C3 were seeded the same way.', 5000);
await highlight(page, 'form.panel', 'Define the outcome', 'Worked example is Month-end close (MEC_CLOSE) — deliberately not one of the seeded three, so you see a fourth product appear as data.', 5500);

await highlight(page, 'form .ob-row2 .field:nth-child(1)', 'Outcome id', 'Stable key, uppercase. This is FOBO_HELIX / REPORT_15C3 / PNL_REPORTING for the seeded products.', 4500);
await highlight(page, 'form .ob-row2 .field:nth-child(2)', 'Name', 'The label people see on Board and Reports.', 3500);
await highlight(page, 'form .field:nth-of-type(2), form input[value="Can I close the books?"]', 'Business question', 'Every outcome answers one plain question. Helix’s question is “Can I execute FOBO analysis?”', 5000);

const qSel = await page.evaluate(() => {
  const inp = [...document.querySelectorAll('form input')].find((i) => /close the books/i.test(i.value));
  if (inp) { inp.setAttribute('data-ofx', 'q'); return true; }
  return false;
});
if (qSel) await highlight(page, '[data-ofx=q]', 'Business question', 'Helix’s question is “Can I execute FOBO analysis?”. Month-end close asks “Can I close the books?”', 4500);

await highlight(page, 'form .ob-row2:nth-of-type(2) .field:nth-child(1), form input[value="Financial Control"]', 'Owner group', 'Who owns the milestone. Financial Control for this example. FOBO investigation is owned by the FOBO desk.', 4000);
await highlight(page, 'form .ob-row2:nth-of-type(2) .field:nth-child(2), form input[value="GLOBAL"]', 'Regions', 'Comma-separated entitlement. GLOBAL for this example and for FOBO_HELIX.', 4000);

await highlight(page, 'form .seg', 'SLA — two shapes', 'Window from first event (Helix is 5 minutes) or a business cut-off. Toggle both so you see every control.', 5000);
await clickText(page, 'form .seg button', 'Business cut-off');
await sleep(400);
await highlight(page, 'form .ob-inline, form .field', 'Cut-off clock', 'Clock time on COB plus N days. Used when the bank has a hard publish time.', 4500);
await clickText(page, 'form .seg button', 'Window from first event');
await sleep(400);
await highlight(page, 'form .ob-inline', 'Helix-style window', 'FOBO_HELIX is ready within 5 minutes of the first MASTERBOOK_READY. Same control you see here.', 5000);

await highlight(page, 'form .ob-feeds', 'Input feeds — the dependency mechanism', 'READY only when every feed has all expected keys. A failed key is named and blocks. Helix has one feed: 300 × MASTERBOOK_READY from Motif.', 7500);
await highlight(page, 'form .ob-feed:nth-child(2)', 'Feed 1 — SAP journals', 'Label, event type, source system, expected count. Sources are picked from origins the platform already reads.', 5000);
await highlight(page, 'form .ob-feed:nth-child(3)', 'Feed 2 — Cost-centre sign-off', 'Second feed, same shape. Add as many as the question needs.', 4000);
await clickText(page, 'form .btn.ghost.sm, form button', 'Add feed');
await sleep(400);
await highlight(page, 'form .ob-feed:last-of-type, form .ob-feeds', 'Add feed', 'A new blank row. Remove with the ×. We will leave the example at two feeds and submit.', 4000);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('form .ob-x')];
  btns[btns.length - 1]?.click();
});
await sleep(300);

await highlightText(page, 'form .field', 'When every feed is complete', 'On-ready action', 'Notify-only signals the milestone. Command an engine is what Helix uses: HTTP_COMMAND + target + completion event.', 5500);
await clickText(page, 'form .seg button', 'Command an engine');
await sleep(500);
await highlight(page, 'form .ob-row3', 'Command fields — this is the Helix contract', 'Target helix · completion HELIX_ANALYSIS_COMPLETE · action label. The hub POSTs the engine and waits for that event. No polling.', 7500);

await page.evaluate(() => {
  const fields = [...document.querySelectorAll('form .ob-row3 .field input')];
  const set = (inp, v) => {
    if (!inp) return;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto.set.call(inp, v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set(fields[0], 'helix');
  set(fields[1], 'HELIX_ANALYSIS_COMPLETE');
  set(fields[2], 'Run Helix analysis');
});
await sleep(800);
await highlight(page, 'form .ob-row3', 'Filled like FOBO_HELIX', 'Target helix, completion HELIX_ANALYSIS_COMPLETE, label Run Helix analysis. Month-end close will stay notify-only so we do not command Helix twice.', 6500);
await clickText(page, 'form .seg button', 'Notify only');
await sleep(400);

await highlight(page, 'form .ob-actions', 'Onboard outcome', 'POST the definition. It goes live on Configuration, Board and Reports for this COB immediately.', 4500);

const outcomeId = await page.evaluate(() => {
  const taken = [...document.querySelectorAll('table.tbl .mono.lead')].map((n) => n.textContent.trim());
  let id = 'MEC_CLOSE';
  if (taken.includes(id)) id = 'MEC_WALK';
  const inp = document.querySelector('form input.mono');
  if (inp) {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto.set.call(inp, id);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return id;
});
console.log('OUTCOME_ID', outcomeId);
await sleep(300);
await highlight(page, 'form .ob-row2 .field:nth-child(1)', `Id ${outcomeId}`, 'Unique so a second demo does not collide. Submit next.', 3500);

await page.click('form .ob-actions .btn:not(.ghost)');
await sleep(1800);
await highlight(page, 'form .banner, form .panel-bd > .banner', 'Outcome is live', 'It now folds on Board and Reports. Open those links, or inspect it on Configuration.', 6500);
await highlightText(page, '.panel', 'Live business outcomes', 'Live outcomes table', 'Seeded three plus the one you just created. A new product is a row of data.', 5500);
await highlightText(page, '.panel', 'Sources you can read', 'Sources you can read from', 'CATS, Motif, MBR, SAP… Feeds must reference an origin. Configuration cannot invent a source.', 5000);

/* ───────── 4. Configuration Helix contract ───────── */
await chapter(page, '2 · Outcome contract', 'FOBO_HELIX on Configuration');
await rail(page, '/configuration');
await chapter(page, '2 · Outcome contract', 'FOBO_HELIX on Configuration');
await clickText(page, '.cfg-item', 'FOBO|investigation|HELIX');
await sleep(600);
await highlightText(page, '.cfg-item', 'FOBO|investigation', 'Pick FOBO investigation', 'This is outcome id FOBO_HELIX. Status pill is live fold state for the header COB.', 5000);
await highlight(page, '.cfg-detail .det-head, .cfg-detail', 'Question + owner + region', '“Can I execute FOBO analysis?” Owner and GLOBAL chip. Same shape as the form you just submitted.', 6000);
await highlight(page, '.cfg-detail .det-live, .det-live', 'Live now for this COB', 'Region · completed/expected · stage. Empty means Drive has not posted feeds yet for this date.', 5000);
await highlight(page, '.cfg-detail .odef-meta', 'Contract — on-ready is Command · helix', 'Entitlement GLOBAL. SLA within 5 min. On ready HTTP_COMMAND target helix. Completion event HELIX_ANALYSIS_COMPLETE. 1 feed · 300 keys.', 8000);
await highlight(page, '.cfg-detail table.tbl', 'Input feed — Motif master books', 'Event MASTERBOOK_READY · source MOTIF · expected 300. That is the only thing Helix waits on.', 6500);
await highlightText(page, '.cfg-rail .panel', 'Group unit', 'Same group unit still in scope', 'REV-ACC did not change. Outcomes fold inside this unit.', 4500);

/* ───────── 5. Product Helix story ───────── */
await chapter(page, '3 · Helix use case', 'What the hub actually does');
await rail(page, '/product');
await chapter(page, '3 · Helix use case', 'What the hub actually does');
await highlight(page, '.ph', 'Product — two models, one backbone', 'Outcome engine (question + feeds + command) and stitch kit (human console). Helix is a destination, not a Home button.', 5500);
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2, h3')].find((n) => /When the hub calls Helix|How a FOBO rec/i.test(n.innerText));
  h?.closest('.panel')?.scrollIntoView({ block: 'start', behavior: 'instant' });
});
await sleep(400);
await highlightText(page, '.panel, h2', 'How a FOBO rec', 'Two Helix stories — do not mix them', 'Left: stitch rec a controller signs (Board, COB 12 Sep 2026). Right: engine Helix the hub calls (Reports, COB today).', 7000);
await highlightText(page, '.oc, h3', 'When the hub calls Helix', 'Engine path — Reports', 'Motif 300 MASTERBOOK_READY → FOBO_HELIX READY → POST /helix/analysis → HELIX_ANALYSIS_COMPLETE → GENERATED. Watch Reports.', 8000);
await rail(page, '/guide');
await chapter(page, '3 · Helix use case', 'What the hub actually does');
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((n) => /Run Helix in real time/i.test(n.innerText));
  h?.closest('.panel')?.scrollIntoView({ block: 'center', behavior: 'instant' });
});
await sleep(400);
await highlightText(page, '.panel', 'Run Helix in real time', 'Lead walkthrough in the console', 'Do not mix COBs. FOBO / Helix = today. FOBO stitch = 12 Sep 2026. Drive is the only injector.', 7000);

/* ───────── 6. Drive ───────── */
await chapter(page, '3 · Helix use case', 'Drive is the only injector');
await rail(page, '/drive');
await chapter(page, '3 · Helix use case', 'Drive is the only injector');
await highlight(page, '.ph', 'Drive scenarios', 'Home, Board and Reports stay view-only. Reset first, then Drive FOBO / Helix, then watch Reports.', 5500);
await highlight(page, '.banner.info, .banner', 'These buttons inject events', 'Simulator POSTs facts to the hub. Same shape as Motif on a bus in the bank.', 4500);
await highlightText(page, '.dcard', 'Reset platform', 'Reset — clean slate', 'Purges stitch instances and engine outcomes, then re-seeds. Helix is currently GENERATED from an earlier run — Reset so we can watch it climb.', 6500);
await clickText(page, '.dcard button', 'Reset');
await sleep(2200);
await highlightText(page, '.dcard', 'Reset platform', 'Reset complete', 'Engine outcomes are NOT_STARTED again. Custom onboarded definitions are kept.', 4500);

await highlightText(page, '.dcard', 'FOBO / Helix', 'FOBO / Helix card', 'Motif sends 300 MASTERBOOK_READY (COB = today, NY). At 300 the hub POSTs Helix. Helix later publishes HELIX_ANALYSIS_COMPLETE. Header date must be today.', 7500);
await page.evaluate(() => {
  const card = [...document.querySelectorAll('.dcard')].find((c) => /FOBO \/ Helix/i.test(c.querySelector('h3')?.innerText || ''));
  card?.querySelector('button')?.click();
});
await sleep(2500);
await highlightText(page, '.dcard', 'FOBO / Helix', 'Scenario accepted', '300 events over ~45 seconds. Next screen is Reports — not Home. Nobody clicks Helix on the control tower.', 5000);

/* ───────── 7. Reports live ───────── */
await chapter(page, '4 · Reports / outcomes', 'Watch FOBO investigation live');
await rail(page, '/reports');
await chapter(page, '4 · Reports / outcomes', 'Watch FOBO investigation live');
await highlight(page, '.ph', 'Reports — engine stages', 'Feeds in → Ready → Processing → Generated → Available. Every feed is an event. The browser never polls Helix.', 5500);

async function markHelixCard() {
  return page.evaluate(() => {
    document.querySelectorAll('[data-ofx-helix]').forEach((n) => n.removeAttribute('data-ofx-helix'));
    const card = [...document.querySelectorAll('.rcard')].find((c) => /FOBO investigation|execute FOBO analysis/i.test(c.innerText));
    if (card) { card.setAttribute('data-ofx-helix', '1'); return true; }
    return false;
  });
}

await markHelixCard();
await highlight(page, '[data-ofx-helix], .rcard', 'FOBO investigation row', 'This is FOBO_HELIX for today’s COB. Question, region, stage pill, five-step flow, Motif feed meter, last message.', 6000);

const watchUntil = Date.now() + 85000;
let lastCap = '';
let done = false;
while (Date.now() < watchUntil && !done) {
  await markHelixCard();
  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-ofx-helix]') || [...document.querySelectorAll('.rcard')].find((c) => /FOBO investigation/i.test(c.innerText));
    if (!card) return { found: false };
    const ft = card.querySelector('.rcard-ft')?.innerText || '';
    const meter = card.querySelector('.rfeed')?.innerText || '';
    const cta = (card.querySelector('.rcard-cta')?.innerText || '').replace(/\s+/g, ' ').trim();
    const active = (card.querySelector('.rstep.active .rlbl')?.innerText || '').trim();
    let stage = 'FEEDS';
    if (/\bAVAILABLE\b/.test(cta)) stage = 'AVAILABLE';
    else if (/\bGENERATED\b/.test(cta)) stage = 'GENERATED';
    else if (/\bPROCESSING\b/.test(cta)) stage = 'PROCESSING';
    else if (/\bBLOCKED\b/.test(cta)) stage = 'BLOCKED';
    else if (/\bNOT_STARTED\b/.test(cta)) stage = 'NOT_STARTED';
    else if (/\bFEEDS\b/.test(cta) || /feeds in/i.test(active)) stage = 'FEEDS';
    else if (/\bREADY\b/.test(cta)) stage = 'READY';
    const m = meter.match(/(\d+)\s*\/\s*(\d+)/);
    return { found: true, stage, ft, meter, cta, done: m ? Number(m[1]) : 0, total: m ? Number(m[2]) : 300 };
  });
  console.log('HELIX', JSON.stringify(info));
  let title = `FOBO investigation — ${info.done || 0}/${info.total || 300} Motif books`;
  let sub = `${info.ft || 'Feeds arriving'} · stage FEEDS. Helix is not called until 300/300.`;
  if (info.stage === 'NOT_STARTED') {
    title = 'Waiting for the first Motif book';
    sub = 'Stage NOT_STARTED. The drip is scheduled — first MASTERBOOK_READY is about to land.';
  } else if (info.stage === 'READY') {
    title = '300/300 — READY';
    sub = 'Fold is complete. On-ready HTTP_COMMAND fires. Hub POSTs /helix/analysis with a run id.';
  } else if (info.stage === 'PROCESSING') {
    title = 'PROCESSING — Helix is running';
    sub = 'Helix returned 202 ACCEPTED and works ~6 seconds, then publishes HELIX_ANALYSIS_COMPLETE with that runId.';
  } else if (info.stage === 'GENERATED' || info.stage === 'AVAILABLE') {
    title = 'GENERATED — Helix finished';
    sub = info.ft || 'Result is on this row. No one polled. Watch Monitoring for the completion fact.';
  } else if (info.stage === 'BLOCKED') {
    title = 'Blocked — a named key failed';
    sub = info.ft || 'A failed Motif book would be named here. Escalate; do not invent a fix.';
  }
  const bucket = info.stage === 'FEEDS' ? Math.floor((info.done || 0) / 50) : 0;
  const capKey = `${info.stage}|${bucket}|${title}`;
  if (capKey !== lastCap) {
    await highlight(page, '[data-ofx-helix], .rcard', title, sub, 0);
    lastCap = capKey;
  }
  if (info.stage === 'GENERATED' || info.stage === 'AVAILABLE') {
    done = true;
    await highlight(page, '[data-ofx-helix] .rflow, [data-ofx-helix]', 'Five-step flow is complete', 'Feeds in (done) · Ready (done) · Processing (done) · Generated (active). Available is for packs you can open, like 15C3.', 7000);
    await highlight(page, '[data-ofx-helix] .rfeeds, [data-ofx-helix]', 'Motif feed 300/300', 'The only Helix dependency. Green when complete. This is how a user sees the outcome fold.', 5500);
    await highlight(page, '[data-ofx-helix] .rcard-ft, [data-ofx-helix]', 'Result on the row', info.ft || 'Helix analysed 300 books. The message is the outcome, not a separate Helix screen.', 6500);
    await highlight(page, '[data-ofx-helix] .pred, [data-ofx-helix]', 'Clock vs SLA', 'Predicted ready is advisory. It never sits on the Ready / Blocked fold. SLA for Helix is 5 minutes from first event.', 5000);
    break;
  }
  await sleep(1500);
}
if (!done) {
  console.log('HELIX_TIMEOUT');
  await highlight(page, '[data-ofx-helix], .rcard', 'Still folding — check the meter', 'If this is stuck, header COB may not be today, or Reset was skipped. Drive again from /drive.', 6000);
}

await highlightText(page, '.rcard', 'Month-end|15C3|PnL|MEC', 'Other outcomes on the same Reports list', 'The outcome you onboarded and 15C3 / PnL sit here too. Each row is a question with a stage. Open 15C3 when AVAILABLE to View report.', 6000);

/* ───────── 8. My outcomes + Board ───────── */
await chapter(page, '4 · Reports / outcomes', 'My outcomes and the board');
await rail(page, '/outcomes');
await chapter(page, '4 · Reports / outcomes', 'My outcomes and the board');
await highlight(page, '.ph', 'My outcomes — doer worklist', 'Stitch instances for this group unit / COB. Engine Helix is on Reports; stitch recs (R-1042 / R-2031) land here after FOBO stitch on the other COB.', 6500);
await highlight(page, '.grid, .oc, .empty', 'Assigned rows or empty', 'Empty on today’s Helix COB is expected — stitch recs use 12 Sep 2026. Open a card to sign off (ready) or see the named key (blocked).', 6500);

await rail(page, '/board');
await chapter(page, '4 · Reports / outcomes', 'Board traffic lights');
await highlight(page, '.ph', 'Outcome board — CIO / MD', 'Traffic lights for the header group unit + COB. No book grid. No engine internals. Helix engine status is Reports; stitch recs are these rows.', 6000);
await highlight(page, '.panel, .board, .wrap', 'Same REV-ACC scope', 'Board header repeats group unit · COB · region. Change the header date to 12 Sep 2026 after a FOBO stitch Drive to see R-1042 READY and R-2031 BLOCKED.', 7000);

/* ───────── 9. Monitoring ───────── */
await chapter(page, '4 · Reports / outcomes', 'Monitoring — the tape');
await rail(page, '/monitoring');
await chapter(page, '4 · Reports / outcomes', 'Monitoring — the tape');
await highlight(page, '.ph', 'Monitoring — received, persisted, propagated, audited', 'The browser never talks to Kafka. This is the fact tape for the Helix run you just drove.', 5500);
await highlight(page, '.stats, .g5, .g4', 'Counters', 'Events in, outbox, routes. MASTERBOOK_READY × 300 plus HELIX_ANALYSIS_COMPLETE should be on the tape.', 5000);
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((n) => /tape|event/i.test(n.innerText));
  h?.closest('.panel')?.scrollIntoView({ block: 'start', behavior: 'instant' });
});
await sleep(400);
await highlightText(page, '.panel', 'tape|Event|Recent', 'Event tape', 'Scroll for MASTERBOOK_READY then HELIX_ANALYSIS_COMPLETE. That completion fact is what moved Reports from PROCESSING to GENERATED.', 8000);

await rail(page, '/reports');
await chapter(page, 'Done', 'Group unit → outcome → Drive Helix → Reports');
await markHelixCard();
await highlight(page, '[data-ofx-helix], .rcard', 'Where the user sees Helix outcomes', 'Reports, not Home. Group unit REV-ACC in the header. COB today. Outcome FOBO_HELIX generated from Motif facts + a Helix command.', 8000);

await page.evaluate(() => {
  document.querySelectorAll('.ofx-spot').forEach((el) => el.classList.remove('ofx-spot'));
  document.getElementById('ofx-caption')?.remove();
});
await sleep(1500);
console.log('TOUR_DONE');
process.exit(0);
