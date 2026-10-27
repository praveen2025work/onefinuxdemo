import { encodeJson } from '../grid/spec.js';

// App directory for desks (the OpenFin "apps.json" / FDC3 App Directory idea). Pure data + helpers.
//
// kind:
//   route  — a console screen, rendered as the same SPA in an iframe with ?ofx-embed=1 (no chrome)
//   widget — a light native view drawn by the host itself (live feed, Wijmo instance grid, context inspector)
//   web    — any web app in a sandboxed iframe; a partner joins link channels via postMessage (ofx-interop.js)

// STEPS framed in embedded mode (?ofx-embed=1: no masthead, theme from the host, FDC3 links). Point
// VITE_STEPS_URL at the deployed STEPS for a real host.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const STEPS_URL = ENV.VITE_STEPS_URL || 'http://localhost:3000/finance?ofx-embed=1';

export const BUILTIN_APPS = [
  { appId: 'board', title: 'Outcome board', icon: 'board', kind: 'route', path: '/board', linkable: true,
    desc: 'Unit traffic lights. Click a row to share that instance on the link channel.' },
  { appId: 'instance', title: 'Instance detail', icon: 'eye', kind: 'route', path: '/instance', linkable: true,
    desc: 'Follows the instance picked by any view on the same colour.' },
  { appId: 'finance', title: 'Finance dashboards', icon: 'dollar', kind: 'route', path: '/finance', linkable: true,
    desc: 'Platform and unit blueprints. Click a tile to share it on the channel.' },
  { appId: 'outcomes', title: 'My outcomes', icon: 'cards', kind: 'route', path: '/outcomes', linkable: true,
    desc: 'Controller worklist.' },
  { appId: 'reports', title: 'Reports', icon: 'report', kind: 'route', path: '/reports', linkable: false,
    desc: 'Engine outcomes and report packs.' },
  { appId: 'operations', title: 'Operations', icon: 'ops', kind: 'route', path: '/operations', linkable: false,
    desc: 'Escalations, dead letters, dual-control replay.' },
  { appId: 'monitoring', title: 'Monitoring', icon: 'activity', kind: 'route', path: '/monitoring', linkable: false,
    desc: 'Received → persisted → propagated → audited.' },
  { appId: 'notifications', title: 'Notifications', icon: 'bell', kind: 'route', path: '/notifications', linkable: false,
    desc: 'The inbox, pushed live over the WebSocket.' },
  { appId: 'live-feed', title: 'Live feed', icon: 'ops', kind: 'widget', linkable: false,
    desc: 'Every hub event as it arrives on /api/ws — the socket, on screen.' },
  { appId: 'instance-grid', title: 'Instance grid (Wijmo)', icon: 'grid', kind: 'widget', linkable: true,
    desc: 'Wijmo FlexGrid of the unit with filters. Select a row to drive linked views.' },
  { appId: 'context', title: 'Context inspector', icon: 'link', kind: 'widget', linkable: true,
    desc: 'Shows what views on its colour are sharing.' },
  { appId: 'activity', title: 'Outcome activity', icon: 'history', kind: 'widget', linkable: true,
    desc: 'Who did what on the desk’s outcome — from every screen, tab and browser, live over the hub. Post a note to all.' },
  { appId: 'chat', title: 'Chat', icon: 'message', kind: 'widget', linkable: false,
    desc: 'The team chatbot (configured on the hub), styled like the console; it can open screens and share picks.' },
  { appId: 'grid', title: 'Grid (from a spec)', icon: 'grid', kind: 'widget', linkable: true,
    desc: 'Any read-only grid described as config — pick a spec in the grid library. A row pick is shared.' },
  { appId: 'helix', title: 'Helix FOBO (partner)', icon: 'tower', kind: 'web', url: '/sim/screens/helix', linkable: true,
    desc: 'Partner screen framed, not rebuilt. Context arrives on the query.' },
  { appId: 'partner-demo', title: 'Partner interop demo', icon: 'globe', kind: 'web', url: '/partner-demo.html', linkable: true,
    desc: 'A partner page that joins link channels with ofx-interop.js (postMessage).' },
  { appId: 'steps', title: 'STEPS (workflow & finance)', icon: 'layers', kind: 'web', url: STEPS_URL, linkable: true,
    desc: 'The STEPS app in embedded mode: same theme, FDC3 links to the other views on the desk.' },
];

const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob|about):/i;

/**
 * Validate a URL a user wants to frame. Same-origin paths ("/x") and http(s) only.
 * Returns { ok, url, origin } or { ok: false, error }.
 */
export function normalizeWebUrl(input, pageOrigin) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, error: 'Enter a URL.' };
  if (BLOCKED_SCHEMES.test(raw)) return { ok: false, error: 'Only http(s) URLs or same-origin paths can be framed.' };
  if (raw.startsWith('//')) return { ok: false, error: 'Use a full https:// URL.' };
  let parsed;
  try {
    parsed = raw.startsWith('/') ? new URL(raw, pageOrigin) : new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'https://' + raw);
  } catch {
    return { ok: false, error: 'That is not a valid URL.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only http(s) URLs or same-origin paths can be framed.' };
  }
  if (parsed.username || parsed.password) return { ok: false, error: 'Remove credentials from the URL.' };
  const sameOrigin = parsed.origin === pageOrigin;
  return { ok: true, url: sameOrigin ? parsed.pathname + parsed.search + parsed.hash : parsed.href, origin: parsed.origin };
}

function slug(text) {
  return String(text || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'app';
}

/** A user-added web app. Throws on a bad URL so the form can show the reason. */
export function makeCustomApp({ title, url }, pageOrigin, now = Date.now()) {
  const res = normalizeWebUrl(url, pageOrigin);
  if (!res.ok) throw new Error(res.error);
  const name = String(title || '').trim() || new URL(res.url, pageOrigin).host || 'Web app';
  return {
    appId: `web-${slug(name)}-${now.toString(36)}`,
    title: name.slice(0, 60),
    icon: 'globe',
    kind: 'web',
    url: res.url,
    linkable: true,
    custom: true,
    desc: res.origin === pageOrigin ? 'Same-origin page' : res.origin,
  };
}

/** The app a docked window belongs to, from its path: /widget/<id> or the longest matching route prefix. */
export function appForPath(apps, path) {
  const clean = String(path || '').split('?')[0];
  if (!clean.startsWith('/')) return null;
  if (clean.startsWith('/widget/')) {
    const id = decodeURIComponent(clean.slice('/widget/'.length).split('/')[0]);
    return apps.find((a) => a.kind === 'widget' && a.appId === id) || null;
  }
  const routes = apps.filter((a) => a.kind === 'route' && a.path !== '/' && (clean === a.path || clean.startsWith(a.path + '/')));
  routes.sort((a, b) => b.path.length - a.path.length);
  return routes[0] || apps.find((a) => a.kind === 'route' && a.path === clean) || null;
}

export function appById(apps, appId) {
  return apps.find((a) => a.appId === appId) || null;
}

/** Origin a framed web app lives on (postMessage target + the origin its messages must come from). */
export function appOrigin(app, pageOrigin) {
  if (!app || app.kind !== 'web') return pageOrigin;
  try {
    return new URL(app.url, pageOrigin).origin;
  } catch {
    return null;
  }
}

/**
 * The iframe / window URL for a view.
 * route: same SPA, chrome-less, told its view id, channel and scope.
 * web:   the partner URL plus the embed context contract (groupUnitId, cobDate, region, theme, ofxView).
 */
export function viewSrc(view, app, { scope = {}, theme = {}, pageOrigin }) {
  if (!app) return null;
  if (app.kind === 'route' || app.kind === 'widget') {
    const base = app.kind === 'widget' ? `/widget/${encodeURIComponent(app.appId)}` : (view.path || app.path);
    const [path, query = ''] = base.split('?');
    const qs = new URLSearchParams(query);
    qs.set('ofx-embed', '1');
    qs.set('ofx-view', view.id);
    if (view.channel) qs.set('ofx-channel', view.channel);
    qs.set('ofx-title', view.title || app.title);
    if (app.kind === 'widget' && view.config) qs.set('ofx-config', encodeJson(view.config));
    for (const [k, v] of Object.entries({ groupUnit: scope.groupUnit, cobDate: scope.cobDate, region: scope.region })) {
      if (v) qs.set(k, v);
    }
    return `${path}?${qs.toString()}`;
  }
  const url = new URL(app.url, pageOrigin);
  const ctx = { groupUnitId: scope.groupUnit, cobDate: scope.cobDate, region: scope.region, ofxView: view.id, ...theme };
  Object.entries(ctx).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, String(v)); });
  return url.origin === pageOrigin ? url.pathname + url.search + url.hash : url.href;
}
