#!/usr/bin/env node
/**
 * UI parity audit: measure One Finance, MITR AI and STEPS v3 (or any app in parity.config.json) in a real browser
 * and compare them with the reference app (STEPS v3).
 *
 *   npm run parity                         every app in the config, theme from the config
 *   npm run parity -- --theme steps-light  another skin-mode (each app's "themes" entry says how to select it)
 *   npm run parity -- --apps ofx,mitr      a subset (the reference is always measured)
 *   npm run parity -- --out ../../parity-report --report-only   never exit non-zero
 *
 * Needs the apps running (README "Run it"; STEPS and MITR AI from their repos). Writes report.md, report.json and
 * one screenshot per page to --out (default parity-report/, git-ignored).
 *
 * What it checks
 *   - Type scale: share of rendered characters whose size is a STEPS step (parity/scale.js), per page.
 *   - Body size: the size most text is set in.
 *   - Roles: app title, header, nav item, buttons, fields, tabs, cards, card titles, grid header and cells, page:
 *     the metrics named in config.rules, compared with the reference app's.
 *   - Font: the platform font Chromium actually rendered (CDP CSS.getPlatformFontsForNode), not just the CSS list.
 *   - Embedded mode: framed by a trusted host, the app sets the html attributes, links the host's tokens and hides
 *     its own chrome.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { MIN_CONFORMANCE, compareRole, conformance, dominantSize } from './scale.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'parity.config.json'), 'utf8'));

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : dflt; };
const out = path.resolve(arg('out', path.join(here, '..', 'parity-report')));
const reportOnly = argv.includes('--report-only');
const themeKey = arg('theme', `${cfg.theme.skin}-${cfg.theme.mode}`);
const only = arg('apps', null);
const appIds = Object.keys(cfg.apps).filter((id) => !only || id === cfg.reference || only.split(',').includes(id));
const baseUrl = (id) => (process.env[`PARITY_${id.toUpperCase()}_URL`] || cfg.apps[id].url).replace(/\/$/, '');

fs.mkdirSync(path.join(out, 'shots'), { recursive: true });

/** Character-weighted font-size histogram of what is on screen; grid text counted apart. Runs in the page. */
function histogramInPage() {
  const hist = {};
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\s+/g, '');
    if (!t) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,svg,[aria-hidden="true"]')) continue;
    // Wijmo's evaluation-licence banner (dev builds without a key) is not the app's own text.
    if (el.closest('a[href*="mescius"], a[href*="grapecity"]') || /^Wijmo Evaluation Version/.test(t)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const k = cs.fontSize;
    const e = (hist[k] = hist[k] || { chars: 0, grid: 0 });
    e.chars += t.length;
    // Data grids keep the grid size (--ofx-grid-fs): Wijmo controls, and HTML tables styled as grids (.ofx-tbl).
    if (el.closest('.wj-control, table')) e.grid += t.length;
  }
  return hist;
}

/**
 * Up to 12 elements per role selector, with their metrics; each text element is marked for the font probe.
 * The runner keeps the most common look per role, so one odd element (a chip that borrows a class) does not
 * stand in for the whole app.
 */
function rolesInPage(roles) {
  const found = {};
  let seq = 0;
  const sized = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const textHolder = (e) => {
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.textContent.trim() && n.parentElement && !n.parentElement.closest('svg')) return n.parentElement;
    return e;
  };
  for (const [role, selector] of Object.entries(roles)) {
    let els = [];
    try {
      els = role === 'page'
        ? [Array.from(document.querySelectorAll('p, td, li, span, div')).find((x) => sized(x) && Array.from(x.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim().length >= 20)) || document.body]
        : Array.from(document.querySelectorAll(selector)).filter(sized).slice(0, 12);
    } catch { els = []; }
    found[role] = els.map((el) => {
      const box = role === 'page' ? document.body : el;
      const txt = textHolder(el);
      const b = getComputedStyle(box);
      const t = getComputedStyle(role === 'page' ? document.body : txt);
      const r = box.getBoundingClientRect();
      const id = `p${++seq}`;
      txt.setAttribute('data-parity-probe', id);
      return {
        probe: id,
        text: (txt.innerText || txt.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        height: Math.round(r.height),
        borderRadius: b.borderTopLeftRadius,
        borderTopWidth: b.borderTopWidth,
        borderTopColor: b.borderTopColor,
        backgroundColor: b.backgroundColor,
        boxShadow: b.boxShadow,
        fontSize: getComputedStyle(txt).fontSize,
        fontWeight: getComputedStyle(txt).fontWeight,
        lineHeight: getComputedStyle(txt).lineHeight,
        fontFamily: t.fontFamily,
        color: t.color,
      };
    });
  }
  return found;
}

async function platformFont(cdp, probe) {
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-parity-probe="${probe}"]` });
    if (!nodeId) return null;
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts && fonts.length ? familyOnly(fonts.sort((a, b) => b.glyphCount - a.glyphCount)[0].familyName) : null;
  } catch { return null; }
}

async function themedContext(browser, appId) {
  const theme = (cfg.apps[appId].themes || {})[themeKey] || {};
  const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: 1 });
  if (theme.localStorage) {
    await ctx.addInitScript((entries) => {
      try { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); } catch { /* opaque origin */ }
    }, theme.localStorage);
  }
  return { ctx, query: theme.query || '' };
}

const withQuery = (url, q) => (q ? url + (url.includes('?') ? '&' : '?') + q : url);

async function measureApp(browser, appId) {
  const app = cfg.apps[appId];
  const { ctx, query } = await themedContext(browser, appId);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const result = { label: app.label, url: baseUrl(appId), pages: [], roles: {}, variants: {} };
  const tally = {};
  for (const p of app.pages) {
    const url = withQuery(baseUrl(appId) + p, query);
    const errors = [];
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
    } catch (e) { errors.push(String(e.message).split('\n')[0]); }
    await page.waitForTimeout(1200);
    const shot = `shots/${appId}${p.replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '') || '-home'}.png`;
    await page.screenshot({ path: path.join(out, shot) }).catch(() => {});
    const hist = await page.evaluate(histogramInPage).catch(() => ({}));
    const roles = await page.evaluate(rolesInPage, app.roles).catch(() => ({}));
    for (const [role, list] of Object.entries(roles)) {
      const rule = cfg.rules[role] || { props: [] };
      for (const m of list) {
        const key = signature(m, rule);
        const seen = (tally[role] = tally[role] || {});
        if (!seen[key]) {
          m.platformFont = await platformFont(cdp, m.probe);
          m.page = p;
          seen[key] = { count: 0, sample: m };
        }
        seen[key].count += 1;
      }
    }
    const c = conformance(hist);
    result.pages.push({ path: p, shot, errors, conformance: c.ratio, chars: c.total, body: dominantSize(hist), off: c.off.slice(0, 6) });
  }
  // The look a role has most often across the app's pages stands for the app; the others are listed as variants.
  for (const [role, seen] of Object.entries(tally)) {
    const ranked = Object.values(seen).sort((a, b) => b.count - a.count);
    result.roles[role] = { ...ranked[0].sample, seen: ranked[0].count };
    result.variants[role] = ranked.slice(1, 4).map((v) => ({ count: v.count, page: v.sample.page, text: v.sample.text, height: v.sample.height, fontSize: v.sample.fontSize, fontWeight: v.sample.fontWeight }));
  }
  await ctx.close();
  return result;
}

/** What makes two elements of a role look the same: the metrics the rule compares. */
function signature(m, rule) {
  return JSON.stringify((rule.props || []).filter((p) => p !== 'platformFont').map((p) => m[p]));
}

/** "Inter SemiBold" and "Inter" are one family: drop the face name the platform adds. */
function familyOnly(name) {
  return String(name || '').replace(/\s+(Thin|ExtraLight|Extra Light|Light|Regular|Book|Medium|SemiBold|Semi Bold|DemiBold|Bold|ExtraBold|Extra Bold|Black|Heavy|Italic|Oblique)+$/gi, '').trim();
}

async function checkEmbedded(browser, e) {
  const { ctx, query } = await themedContext(browser, e.app);
  const page = await ctx.newPage();
  const host = baseUrl(e.host) + '/';
  const url = withQuery(baseUrl(e.app) + e.path, '');
  const checks = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000, referer: host });
    await page.waitForTimeout(1500);
    const got = await page.evaluate((exp) => {
      const html = document.documentElement;
      const attrs = Object.fromEntries(Object.keys(exp.attrs || {}).map((k) => [k, html.getAttribute(k)]));
      const absent = (exp.absent || []).map((sel) => {
        const el = document.querySelector(sel);
        const shown = !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
        return { sel, shown };
      });
      const sheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.href);
      return { attrs, absent, sheets };
    }, e.expect);
    for (const [k, v] of Object.entries(e.expect.attrs || {})) checks.push({ check: `html[${k}="${v}"]`, ok: got.attrs[k] === v, got: got.attrs[k] });
    for (const a of got.absent) checks.push({ check: `own chrome hidden: ${a.sel}`, ok: !a.shown, got: a.shown ? 'visible' : 'hidden' });
    if (e.expect.stylesheet) {
      const hit = got.sheets.find((h) => h.startsWith(baseUrl(e.host)) && h.includes(e.expect.stylesheet));
      checks.push({ check: `links host ${e.expect.stylesheet}`, ok: !!hit, got: hit || got.sheets.filter((h) => /theme|ofx/.test(h)).join(', ') || 'none' });
    }
    const c = conformance(await page.evaluate(histogramInPage));
    checks.push({ check: `type scale ≥ ${MIN_CONFORMANCE * 100}%`, ok: c.ratio >= MIN_CONFORMANCE, got: `${(c.ratio * 100).toFixed(1)}%` });
    const shot = `shots/embedded-${e.app}-${e.path.split('?')[0].replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}.png`;
    await page.screenshot({ path: path.join(out, shot) });
    await ctx.close();
    return { label: e.label, url, host, shot, checks };
  } catch (err) {
    await ctx.close();
    return { label: e.label, url, host, checks: [{ check: 'page loads', ok: false, got: String(err.message).split('\n')[0] }] };
  }
}

const pct = (r) => `${(r * 100).toFixed(1)}%`;
const mark = (ok) => (ok ? '✅' : '❌');

function render(report) {
  const ref = report.apps[cfg.reference];
  const others = appIds.filter((id) => id !== cfg.reference);
  const L = [];
  L.push(`# UI parity report`, '', `Measured ${report.at} · theme \`${report.theme}\` · reference **${ref.label}** (${ref.url})`, '');
  L.push('## Summary', '', '| App | Type scale (worst page) | Body text | Roles matching STEPS | Embedded checks |', '|---|---|---|---|---|');
  for (const id of appIds) {
    const a = report.apps[id];
    const worst = a.pages.reduce((m, p) => (p.chars && p.conformance < m.conformance ? p : m), { conformance: 1, path: '—' });
    const bodies = [...new Set(a.pages.map((p) => p.body).filter(Boolean))].join(', ');
    const cmp = report.comparisons[id] || [];
    const ok = cmp.filter((c) => c.ok).length;
    const emb = report.embedded.filter((e) => cfg.embedded.find((x) => x.label === e.label)?.app === id);
    const embOk = emb.flatMap((e) => e.checks).filter((c) => c.ok).length;
    const embAll = emb.flatMap((e) => e.checks).length;
    L.push(`| ${a.label} | ${mark(worst.conformance >= MIN_CONFORMANCE)} ${pct(worst.conformance)} (${worst.path}) | ${bodies} | ${id === cfg.reference ? 'reference' : `${ok}/${cmp.length}`} | ${embAll ? `${embOk}/${embAll}` : '—'} |`);
  }
  L.push('', '## Roles compared with STEPS', '', `| Role | Metric | ${ref.label} | ${others.map((id) => report.apps[id].label).join(' | ')} |`, `|---|---|---|${others.map(() => '---').join('|')}|`);
  for (const [role, rule] of Object.entries(cfg.rules)) {
    for (const prop of rule.props) {
      const r = ref.roles[role];
      const cells = others.map((id) => {
        const g = report.apps[id].roles[role];
        if (!g) return '— not found';
        const c = (report.comparisons[id] || []).find((x) => x.role === role && x.prop === prop);
        return `${c ? mark(c.ok) : ''} ${g[prop] ?? ''}`;
      });
      const note = prop === 'height' && rule.pairs ? ` (STEPS sizes ${rule.pairs.map(([h, f]) => `${h}px/${f}px`).join(', ')})` : prop === 'height' && rule.heights ? ` (STEPS uses ${rule.heights.join('/')})` : '';
      L.push(`| ${role} | ${prop}${note} | ${r ? r[prop] ?? '' : '— not found'} | ${cells.join(' | ')} |`);
    }
  }
  L.push('', '## Type scale by page', '', `Allowed sizes: STEPS steps ${'10, 11, 12, 14, 16, 18, 20, 24, 30, 36'}px (13px only inside Wijmo grids). Pass: ≥ ${MIN_CONFORMANCE * 100}% of characters.`, '', '| App | Page | On scale | Body | Off-scale (chars → snap to) | Screenshot |', '|---|---|---|---|---|---|');
  for (const id of appIds) {
    for (const p of report.apps[id].pages) {
      const off = p.off.map((o) => `${o.size} (${o.chars}) → ${o.snapTo}px`).join(', ') || '—';
      L.push(`| ${report.apps[id].label} | \`${p.path}\` | ${mark(p.conformance >= MIN_CONFORMANCE)} ${pct(p.conformance)} | ${p.body || '—'} | ${off} | [png](${p.shot}) |${p.errors.length ? ' ⚠ ' + p.errors[0] : ''}`);
    }
  }
  if (report.embedded.length) {
    L.push('', '## Embedded mode (framed by One Finance)', '');
    for (const e of report.embedded) {
      L.push(`### ${e.label}`, '', `\`${e.url}\` framed from \`${e.host}\`${e.shot ? ` · [screenshot](${e.shot})` : ''}`, '', '| Check | Result |', '|---|---|');
      for (const c of e.checks) L.push(`| ${c.check} | ${mark(c.ok)} ${c.got ?? ''} |`);
      L.push('');
    }
  }
  return L.join('\n') + '\n';
}

const browser = await chromium.launch();
const report = { at: new Date().toISOString(), theme: themeKey, reference: cfg.reference, apps: {}, comparisons: {}, embedded: [] };
for (const id of appIds) {
  process.stdout.write(`measuring ${cfg.apps[id].label} …\n`);
  report.apps[id] = await measureApp(browser, id);
}
for (const id of appIds.filter((x) => x !== cfg.reference)) {
  report.comparisons[id] = Object.entries(cfg.rules).flatMap(([role, rule]) =>
    compareRole(report.apps[cfg.reference].roles[role], report.apps[id].roles[role], rule).map((c) => ({ role, ...c })));
}
for (const e of cfg.embedded.filter((x) => appIds.includes(x.app))) {
  process.stdout.write(`checking ${e.label} …\n`);
  report.embedded.push(await checkEmbedded(browser, e));
}
await browser.close();

fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(out, 'report.md'), render(report));

const failures = [
  ...appIds.flatMap((id) => report.apps[id].pages.filter((p) => p.chars && p.conformance < MIN_CONFORMANCE).map((p) => `${id}${p.path} type scale ${pct(p.conformance)}`)),
  ...Object.entries(report.comparisons).flatMap(([id, cs]) => cs.filter((c) => !c.ok).map((c) => `${id} ${c.role}.${c.prop}: ${c.got} (STEPS ${c.ref})`)),
  ...report.embedded.flatMap((e) => e.checks.filter((c) => !c.ok).map((c) => `${e.label}: ${c.check} (${c.got})`)),
];
console.log(`\nreport: ${path.join(out, 'report.md')}`);
console.log(failures.length ? `${failures.length} difference(s):\n  ${failures.join('\n  ')}` : 'all apps match the reference');
process.exit(failures.length && !reportOnly ? 1 : 0);
