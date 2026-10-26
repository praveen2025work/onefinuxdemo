// Workspace model: named workspaces (OpenFin "snapshots"), each a layout plus a list of views.
// Every function is pure and returns a new state, so the reducer is easy to test and to persist.
//
// state     = { current: workspaceId, workspaces: [workspace] }
// workspace = { id, name, layout: 'grid'|'columns'|'rows'|'tabs', views: [view], active, maximized }
// view      = { id, appId, title, channel, wide?, size?, path? }
//             `path` overrides a route app's start page; `size` is the view's share (fr) in columns / rows layouts

export const WS_KEY = 'ofx-workspaces';
export const LAYOUTS = [
  { id: 'grid', label: 'Grid', icon: 'grid' },
  { id: 'columns', label: 'Columns', icon: 'columns' },
  { id: 'rows', label: 'Rows', icon: 'rows' },
  { id: 'tabs', label: 'Tabs', icon: 'tabs' },
];
const LAYOUT_IDS = new Set(LAYOUTS.map((l) => l.id));
const MAX_VIEWS = 12;

const MIN_SIZE = 0.15;
const MAX_SIZE = 20;

/** A view's share of a columns / rows layout, in fr. */
export function clampSize(size) {
  const n = Number(size);
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n * 1000) / 1000)) : 1;
}

let seq = 0;
export function newId(prefix = 'v') {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function view(appId, title, channel = null, extra = {}) {
  return { id: newId(), appId, title, channel, wide: false, size: 1, ...extra };
}

export function seedState() {
  const close = {
    id: 'ws-close',
    name: 'Close control',
    layout: 'grid',
    views: [
      view('board', 'Outcome board', 'blue'),
      view('instance', 'Instance detail', 'blue'),
      view('live-feed', 'Live feed'),
      view('helix', 'Helix FOBO (partner)', 'blue'),
    ],
    active: null,
    maximized: null,
  };
  const finance = {
    id: 'ws-finance',
    name: 'Finance desk',
    layout: 'grid',
    views: [
      view('finance', 'Finance dashboard', 'green', { wide: true }),
      view('instance-grid', 'Instance grid (Wijmo)', 'green'),
      view('context', 'Context inspector', 'green'),
      view('partner-demo', 'Partner interop demo', 'green'),
    ],
    active: null,
    maximized: null,
  };
  return { current: close.id, workspaces: [close, finance] };
}

function cleanView(v) {
  if (!v || typeof v !== 'object' || typeof v.id !== 'string' || typeof v.appId !== 'string') return null;
  return {
    id: v.id,
    appId: v.appId,
    title: String(v.title || v.appId).slice(0, 80),
    channel: typeof v.channel === 'string' ? v.channel : null,
    wide: Boolean(v.wide),
    size: clampSize(v.size),
    ...(typeof v.path === 'string' && v.path.startsWith('/') && !v.path.startsWith('//') ? { path: v.path } : {}),
  };
}

/** Parse persisted JSON defensively; anything malformed falls back to the seed. */
export function loadState(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return seedState();
  }
  if (!parsed || !Array.isArray(parsed.workspaces) || parsed.workspaces.length === 0) return seedState();
  const workspaces = parsed.workspaces
    .filter((w) => w && typeof w.id === 'string')
    .map((w) => {
      const views = (Array.isArray(w.views) ? w.views : []).map(cleanView).filter(Boolean).slice(0, MAX_VIEWS);
      const ids = new Set(views.map((v) => v.id));
      return {
        id: w.id,
        name: String(w.name || 'Workspace').slice(0, 60),
        layout: LAYOUT_IDS.has(w.layout) ? w.layout : 'grid',
        views,
        active: ids.has(w.active) ? w.active : null,
        maximized: ids.has(w.maximized) ? w.maximized : null,
      };
    });
  if (workspaces.length === 0) return seedState();
  const current = workspaces.some((w) => w.id === parsed.current) ? parsed.current : workspaces[0].id;
  return { current, workspaces };
}

export function currentWorkspace(state) {
  return state.workspaces.find((w) => w.id === state.current) || state.workspaces[0];
}

function updateCurrent(state, fn) {
  return { ...state, workspaces: state.workspaces.map((w) => (w.id === state.current ? fn(w) : w)) };
}

export function addView(state, v) {
  const ws = currentWorkspace(state);
  if (ws.views.length >= MAX_VIEWS) return state;
  if (ws.views.some((x) => x.id === v.id)) return state;
  const clean = cleanView(v);
  if (!clean) return state;
  return updateCurrent(state, (w) => ({ ...w, views: [...w.views, clean], active: clean.id }));
}

export function removeView(state, viewId) {
  return updateCurrent(state, (w) => {
    const views = w.views.filter((v) => v.id !== viewId);
    return {
      ...w,
      views,
      active: w.active === viewId ? (views[0]?.id ?? null) : w.active,
      maximized: w.maximized === viewId ? null : w.maximized,
    };
  });
}

/** Drag `fromId` onto `toId`: it takes that slot and the rest shift. */
export function moveView(state, fromId, toId) {
  if (fromId === toId) return state;
  return updateCurrent(state, (w) => {
    const from = w.views.findIndex((v) => v.id === fromId);
    const to = w.views.findIndex((v) => v.id === toId);
    if (from < 0 || to < 0) return w;
    const views = w.views.slice();
    const [moved] = views.splice(from, 1);
    views.splice(to, 0, moved);
    return { ...w, views };
  });
}

export function patchView(state, viewId, patch) {
  return updateCurrent(state, (w) => ({
    ...w,
    views: w.views.map((v) => (v.id === viewId ? cleanView({ ...v, ...patch }) || v : v)),
  }));
}

/** A splitter moved between two neighbours: set both shares at once (their sum is preserved by the caller). */
export function resizePair(state, aId, aSize, bId, bSize) {
  return updateCurrent(state, (w) => ({
    ...w,
    views: w.views.map((v) => {
      if (v.id === aId) return { ...v, size: clampSize(aSize) };
      if (v.id === bId) return { ...v, size: clampSize(bSize) };
      return v;
    }),
  }));
}

/** New shares for a splitter drag: `deltaPx` moves the boundary between views of `aPx` and `bPx` pixels. */
export function splitShares(aSize, bSize, aPx, bPx, deltaPx, minPx = 160) {
  const totalPx = aPx + bPx;
  const totalFr = aSize + bSize;
  if (totalPx <= 0 || totalFr <= 0) return [aSize, bSize];
  const lo = Math.min(minPx, totalPx / 2);
  const nextA = Math.min(totalPx - lo, Math.max(lo, aPx + deltaPx));
  const a = (totalFr * nextA) / totalPx;
  return [a, totalFr - a];
}

export function setLayout(state, layout) {
  if (!LAYOUT_IDS.has(layout)) return state;
  return updateCurrent(state, (w) => ({ ...w, layout, maximized: null }));
}

export function setActive(state, viewId) {
  return updateCurrent(state, (w) => ({ ...w, active: viewId }));
}

export function toggleMaximized(state, viewId) {
  return updateCurrent(state, (w) => ({ ...w, maximized: w.maximized === viewId ? null : viewId }));
}

export function switchWorkspace(state, id) {
  return state.workspaces.some((w) => w.id === id) ? { ...state, current: id } : state;
}

/** New empty workspace, or a copy of the current one ("Save as"). Copies get fresh view ids. */
export function createWorkspace(state, name, { copyCurrent = false } = {}) {
  const base = copyCurrent ? currentWorkspace(state) : null;
  const ws = {
    id: newId('ws-'),
    name: String(name || 'Workspace').trim().slice(0, 60) || 'Workspace',
    layout: base ? base.layout : 'grid',
    views: base ? base.views.map((v) => ({ ...v, id: newId() })) : [],
    active: null,
    maximized: null,
  };
  return { current: ws.id, workspaces: [...state.workspaces, ws] };
}

export function renameWorkspace(state, name) {
  const clean = String(name || '').trim().slice(0, 60);
  if (!clean) return state;
  return updateCurrent(state, (w) => ({ ...w, name: clean }));
}

export function deleteWorkspace(state) {
  if (state.workspaces.length <= 1) return state;
  const workspaces = state.workspaces.filter((w) => w.id !== state.current);
  return { current: workspaces[0].id, workspaces };
}

/** Views on a channel, optionally excluding one (the sender). */
export function viewsOnChannel(workspace, channel, exceptId = null) {
  if (!channel) return [];
  return workspace.views.filter((v) => v.channel === channel && v.id !== exceptId);
}
