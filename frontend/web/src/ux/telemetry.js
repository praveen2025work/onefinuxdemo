// Usage telemetry: what people open and use, sent in small batches to the hub (/api/ux/events). Pure: the sender is
// injected, so node --test can drive it. track.js wires the console's instance.

export const EVENT_TYPES = ['APP_OPEN', 'VIEW_OPEN', 'COMPONENT_USE', 'SEARCH', 'ASSIST', 'EXPOSURE', 'CONVERSION', 'FEEDBACK'];

/** A route as a stable key: ids become :id so usage groups by screen, not by record. */
export function routeKey(pathname = '/') {
  const p = String(pathname).split('?')[0].replace(/\/+$/, '') || '/';
  if (p.startsWith('/instance/')) return '/instance/:id';
  if (/^\/reports\/[^/]+\/[^/]+\/[^/]+$/.test(p)) return '/reports/:outcome/:cob/:region';
  if (/^\/reports\/[^/]+$/.test(p)) return '/reports/:outcome';
  if (p.startsWith('/widget/')) return '/widget/:app';
  return p;
}

const TEXT = /^[\p{L}\p{N} _.:/|?=&%#,()'+@-]{1,120}$/u;

function clip(v) {
  if (v == null || v === '') return undefined;
  const s = String(v).slice(0, 120);
  return TEXT.test(s) ? s : s.replace(/[^\p{L}\p{N} _.:/|?=&%#,()'+@-]/gu, ' ').trim() || undefined;
}

/**
 * A batching queue. `send(batch, keepalive)` posts; events wait up to `delayMs` or until `max` are queued. A failed
 * send drops the batch rather than retrying forever: telemetry never blocks or slows the console.
 */
export function createTelemetry({ send, max = 20, delayMs = 4000, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let queue = [];
  let timer = null;
  let team = null;
  let enabled = true;

  function flush(keepalive = false) {
    if (timer) { cancel(timer); timer = null; }
    if (!queue.length || !send) return Promise.resolve(0);
    const batch = queue.slice(0, 50);
    queue = queue.slice(50);
    return Promise.resolve(send(batch, keepalive)).then(() => batch.length, () => 0);
  }

  function track(type, { app, component, variant, detail } = {}) {
    if (!enabled || !EVENT_TYPES.includes(type)) return null;
    const ev = { type, app: clip(app), component: clip(component), variant: clip(variant), team: clip(team) || undefined };
    if (detail !== undefined) ev.detail = detail;
    queue.push(ev);
    if (queue.length >= max) flush();
    else if (!timer) timer = schedule(() => { timer = null; flush(); }, delayMs);
    return ev;
  }

  return {
    track,
    flush,
    setTeam(t) { team = t || null; },
    setEnabled(on) { enabled = Boolean(on); if (!enabled) queue = []; },
    pending: () => queue.length,
  };
}
