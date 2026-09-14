// One thin client for the whole stitch API. Every screen reads through here; nothing invents an id.
const BASE = '/api/stitch';

async function get(path, params) {
  const qs = params ? '?' + new URLSearchParams(clean(params)).toString() : '';
  const res = await fetch(BASE + path + qs);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
}

async function send(method, path, params, body) {
  const qs = params ? '?' + new URLSearchParams(clean(params)).toString() : '';
  const res = await fetch(BASE + path + qs, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
  datasets: (groupUnit) => get('/datasets', { groupUnit }),
  explore: (f) => get('/explore', f),
  views: (groupUnit) => get('/views', { groupUnit }),
  saveView: (body) => send('POST', '/views', null, body),
  deleteView: (id) => send('DELETE', `/views/${encodeURIComponent(id)}`),
  reset: () => send('POST', '/reset'),
  monitorOverview: () => get('/monitor/overview'),
  outbox: (status) => get('/monitor/outbox', { status }),
  routes: () => get('/monitor/routes'),
  retryOutbox: (id) => send('POST', `/monitor/outbox/${encodeURIComponent(id)}/retry`),
  tape: (limit = 40) => get('/monitor/events', { limit }),
  audit: (limit = 60) => get('/monitor/audit', { limit }),
};

// The propagated facts land in the simulator's sink (an "other system"), reachable via the /sim proxy.
export async function fetchSink() {
  const res = await fetch('/sim/sink');
  if (!res.ok) throw new Error(`${res.status} on /sim/sink`);
  return res.json();
}

// The business-outcome engine ("Can I produce the 15C3 report?") lives under /api/outcomes, separate
// from the stitch fold. Reports read the outcome flow and open the generated artifact from here.
export const outcomesApi = {
  all: async () => {
    const res = await fetch('/api/outcomes');
    if (!res.ok) throw new Error(`${res.status} on /api/outcomes`);
    return res.json();
  },
  definitions: async () => {
    const res = await fetch('/api/outcomes/definitions');
    if (!res.ok) throw new Error(`${res.status} on /api/outcomes/definitions`);
    return res.json();
  },
  register: async (definition, cobDate) => {
    const qs = cobDate ? `?cobDate=${cobDate}` : '';
    const res = await fetch(`/api/outcomes/definitions${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(definition),
    });
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
  report: async (outcomeId, cobDate, region) => {
    const res = await fetch(`/api/outcomes/${encodeURIComponent(outcomeId)}/${cobDate}/${encodeURIComponent(region)}/report`);
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); detail = j.detail || j.message || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },
};

// Kick a simulator scenario (e.g. the 15C3 feeds) through the /sim proxy.
export async function runScenario(name, params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/sim/scenarios/${name}${qs}`, { method: 'POST' });
  if (!res.ok) throw new Error(`${res.status} on /sim/scenarios/${name}`);
  return res.json();
}

// Cancel any scenario events the simulator still has scheduled (the drip of a running scenario).
export const cancelScenarios = () => runScenario('cancel');
