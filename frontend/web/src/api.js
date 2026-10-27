// One thin client for the whole stitch API. Every screen reads through here; nothing invents an id.
const BASE = '/api/stitch';
const TOKEN_KEY = 'ofx-token';
const ACTOR_KEY = 'ofx-actor';

export function currentActor() {
  return sessionStorage.getItem(ACTOR_KEY) || 'praveen.kumar';
}

export function actorLabel(user) {
  return ({
    'praveen.kumar': 'Praveen Kumar',
    'alice.revacc': 'Alice · owner',
    'gla.reviewer': 'GLA reviewer',
    'bob.markets': 'Bob · markets',
    auditor: 'Auditor',
  })[user] || user;
}

function authHeaders(extra) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = extra ? { ...extra } : {};
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

export async function listActors() {
  const res = await fetch('/api/auth/users');
  if (!res.ok) throw new Error(`${res.status} on /api/auth/users`);
  return res.json();
}

export async function setActor(user) {
  if (!user || user === 'praveen.kumar') {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.setItem(ACTOR_KEY, 'praveen.kumar');
    return { subject: 'praveen.kumar' };
  }
  const res = await fetch('/api/auth/dev-token?user=' + encodeURIComponent(user), { method: 'POST' });
  if (!res.ok) throw new Error(`${res.status} on /api/auth/dev-token`);
  const data = await res.json();
  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  sessionStorage.setItem(ACTOR_KEY, data.subject);
  return data;
}

export function searchAll({ q, groupUnit, cobDate }) {
  const qs = new URLSearchParams({ q });
  if (groupUnit) qs.set('groupUnit', groupUnit);
  if (cobDate) qs.set('cobDate', cobDate);
  return fetch('/api/search?' + qs.toString(), { headers: authHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} on /api/search`);
      return res.json();
    });
}

// Monitoring polls; a call that takes longer than this is abandoned so a slow hub never piles requests up.
const MONITOR_WAIT = { timeoutMs: 10000 };

async function get(path, params, opts = {}) {
  const qs = params ? '?' + new URLSearchParams(clean(params)).toString() : '';
  const ctrl = opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined;
  const res = await fetch(BASE + path + qs, { headers: authHeaders(), signal: ctrl });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
}

async function send(method, path, params, body) {
  const qs = params ? '?' + new URLSearchParams(clean(params)).toString() : '';
  const res = await fetch(BASE + path + qs, {
    method,
    headers: authHeaders(body ? { 'Content-Type': 'application/json' } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const api = {
  context: () => get('/context'),
  groupUnits: () => get('/group-units'),
  instances: (f) => get('/instances', f),
  instance: (id) => get('/instance', { id }),
  instanceEvents: (id) => get('/instance/events', { id }),
  stepView: (id, ref) => get('/instance/step-view', { id, ref }, { timeoutMs: 8000 }),
  signoff: (id, user) => send('POST', '/instance/signoff', { id }, { user }),
  post: (id) => send('POST', '/instance/post', { id }),
  escalate: (id, reason) => send('POST', '/instance/escalate', { id }, { reason }),
  action: (id, action, body) => send('POST', '/instance/action', { id, action }, body || {}),
  notifications: (limit = 50) => get('/notifications', { limit }),
  rtb: () => get('/rtb'),
  replay: (id) => send('POST', `/deadletters/${encodeURIComponent(id)}/replay`),
  sources: () => get('/sources'),
  destinations: () => get('/destinations'),
  kits: () => get('/kits'),
  kit: (id) => get('/kit', { id }),
  registerKit: (body) => send('POST', '/kits', null, body),
  reset: () => send('POST', '/reset'),
  monitorOverview: () => get('/monitor/overview', undefined, MONITOR_WAIT),
  outbox: (status) => get('/monitor/outbox', { status }, MONITOR_WAIT),
  routes: () => get('/monitor/routes', undefined, MONITOR_WAIT),
  retryOutbox: (id) => send('POST', `/monitor/outbox/${encodeURIComponent(id)}/retry`),
  tape: (limit = 40) => get('/monitor/events', { limit }, MONITOR_WAIT),
  audit: (limit = 60) => get('/monitor/audit', { limit }, MONITOR_WAIT),
};

// The propagated facts land in the simulator's sink (an "other system"), reachable via the /sim proxy.
export async function fetchSink() {
  const res = await fetch('/sim/sink', { signal: AbortSignal.timeout(MONITOR_WAIT.timeoutMs) });
  if (!res.ok) throw new Error(`${res.status} on /sim/sink`);
  return res.json();
}

// The business-outcome engine ("Can I produce the 15C3 report?") lives under /api/outcomes, separate
// from the stitch fold. Reports read the outcome flow and open the generated artifact from here.
export const outcomesApi = {
  all: async () => {
    const res = await fetch('/api/outcomes', { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/outcomes`);
    return res.json();
  },
  definitions: async () => {
    const res = await fetch('/api/outcomes/definitions', { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/outcomes/definitions`);
    return res.json();
  },
  register: async (definition, cobDate) => {
    const qs = cobDate ? `?cobDate=${cobDate}` : '';
    const res = await fetch(`/api/outcomes/definitions${qs}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(definition),
    });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
  update: async (definition) => {
    const res = await fetch(`/api/outcomes/definitions/${encodeURIComponent(definition.id)}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(definition),
    });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
  one: async (outcomeId, cobDate, region) => {
    const res = await fetch(`/api/outcomes/${encodeURIComponent(outcomeId)}/${cobDate}/${encodeURIComponent(region)}`, { headers: authHeaders() });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
  report: async (outcomeId, cobDate, region) => {
    const res = await fetch(`/api/outcomes/${encodeURIComponent(outcomeId)}/${cobDate}/${encodeURIComponent(region)}/report`, { headers: authHeaders() });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
  reset: async () => {
    const res = await fetch('/api/admin/reset', { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/admin/reset`);
    return res.json();
  },
};

/** Wipe stitch instances and engine outcomes so a Helix / 15C3 Drive starts from a clean fold. */
export async function resetPlatform() {
  const stitch = await api.reset();
  const engine = await outcomesApi.reset();
  return {
    story: 'Stitch instances and engine outcomes re-seeded',
    stitch,
    engine,
  };
}

// Kick a simulator scenario (e.g. the 15C3 feeds) through the /sim proxy.
export async function runScenario(name, params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/sim/scenarios/${name}${qs}`, { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status} on /sim/scenarios/${name}`);
  return res.json();
}

// Cancel any scenario events the simulator still has scheduled (the drip of a running scenario).
export const cancelScenarios = () => runScenario('cancel');

export async function dropFeed(body) {
  const res = await fetch('/api/feeds/drop', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status} on /api/feeds/drop`;
    try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export const lifecycleApi = {
  walk: async (id) => {
    const qs = id ? '?id=' + encodeURIComponent(id) : '';
    const res = await fetch('/api/events/lifecycle' + qs, { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/events/lifecycle`);
    return res.json();
  },
  tape: async () => {
    const res = await fetch('/api/events/lifecycle/tape', { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/events/lifecycle/tape`);
    return res.json();
  },
  watch: async () => {
    const res = await fetch('/api/feeds/watch', { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/feeds/watch`);
    return res.json();
  },
};

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status} on ${path}`;
    try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

// Server-side screen links and notifications, pushed to every open console over the WebSocket.
export const interopApi = {
  /** Share an FDC3 context on a link channel (colour, app:<name> or outcome:<id>) from the hub. */
  context: (channel, context, source = 'drive', { origin, id } = {}) => postJson('/api/interop/context', { channel, context, source, origin, id }),
  /** Raise an intent (ViewInstance, ViewBreak, …) for the Workspace resolver on every console. */
  intent: (intent, context, source = 'drive') => postJson('/api/interop/intent', { intent, context, source }),
  /** A platform announcement into the inbox, the notification panel and desktop cards. */
  announce: (title, message, severity = 'INFO') => postJson('/api/admin/announce', { title, message, severity }),
};

// Who did what on a business outcome. The hub pushes each activity to every console (live event `activity`).
export const activityApi = {
  /** Recent activity for one outcome (outcomeId) or kit (kitId); newest first. */
  recent: async ({ outcomeId, kitId, limit = 50 } = {}) => {
    const qs = new URLSearchParams(clean({ outcomeId, kitId, limit }));
    const res = await fetch(`/api/activity?${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status} on /api/activity`);
    return res.json();
  },
  /** Tell every desk on this outcome about an action (a note, or an action a partner screen took). */
  post: (body) => postJson('/api/interop/activity', body),
};

/** JSON to and from the hub with the session's token. Errors carry the hub's detail text. */
export async function hubJson(path, { method = 'GET', body, params, keepalive } = {}) {
  const qs = params ? '?' + new URLSearchParams(clean(params)).toString() : '';
  const res = await fetch(path + qs, {
    method,
    keepalive,
    headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `${res.status} on ${path}`;
    try { const j = await res.json(); detail = j.detail || j.message || j.error || detail; } catch { /* ignore */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// One UX platform: assistant, usage, experiments, preferences, team templates, write-back, access, session.
export const uxApi = {
  config: () => hubJson('/api/ux/config'),
  events: (batch, keepalive) => hubJson('/api/ux/events', { method: 'POST', body: batch, keepalive }),
  usage: (params) => hubJson('/api/ux/usage', { params }),
  feedback: () => hubJson('/api/ux/feedback'),
  experimentResults: () => hubJson('/api/ux/experiments/results'),
  recommendations: (team) => hubJson('/api/ux/recommendations', { params: { team } }),
  pref: (key) => hubJson(`/api/prefs/${key}`),
  savePref: (key, value) => hubJson(`/api/prefs/${key}`, { method: 'PUT', body: value }),
  templates: (team, kind) => hubJson('/api/templates', { params: { team, kind } }),
  shareTemplate: (body) => hubJson('/api/templates', { method: 'POST', body }),
  removeTemplate: (id) => hubJson(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** Unit-shared GridSpecs + this user's saved grids for the catalogue (/grids). */
  gridCatalogue: (groupUnit) => hubJson('/api/grids', { params: { groupUnit } }),
};

export const assistApi = {
  status: () => hubJson('/api/assist'),
  ask: (body) => hubJson('/api/assist', { method: 'POST', body }),
};

export const writebackApi = {
  submit: (gridId, body) => hubJson(`/api/writeback/${encodeURIComponent(gridId)}`, { method: 'POST', body }),
  list: (params) => hubJson('/api/writeback', { params }),
  overlay: (gridId) => hubJson(`/api/writeback/${encodeURIComponent(gridId)}/overlay`),
  approve: (id) => hubJson(`/api/writeback/sets/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
  reject: (id, reason) => hubJson(`/api/writeback/sets/${encodeURIComponent(id)}/reject`, { method: 'POST', params: { reason } }),
};

export const accessApi = {
  session: () => hubJson('/api/auth/session'),
  me: () => hubJson('/api/access/me'),
  users: () => hubJson('/api/access/users'),
  requests: (status) => hubJson('/api/access/requests', { params: { status } }),
  request: (body) => hubJson('/api/access/requests', { method: 'POST', body }),
  decide: (id, decision) => hubJson(`/api/access/requests/${encodeURIComponent(id)}/${decision}`, { method: 'POST' }),
  review: () => hubJson('/api/access/review'),
  reviewOne: (grantId, keep) => hubJson(`/api/access/review/${grantId}`, { method: 'POST', params: { keep } }),
  restore: (subject) => hubJson(`/api/access/users/${encodeURIComponent(subject)}/restore`, { method: 'POST' }),
  sweep: () => hubJson('/api/access/sweep', { method: 'POST' }),
};

/** Store an access token from sign-in (SSO) as the session's identity. */
export function setSessionToken(token, subject) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY);
  if (subject) sessionStorage.setItem(ACTOR_KEY, subject); else sessionStorage.removeItem(ACTOR_KEY);
}
