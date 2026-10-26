import { FRAMED } from '../embed.js';
import { LIVE_EVENTS, backoffMs, normalizeExternalNotification, parseFrame, socketUrl } from './normalize.js';

/**
 * One live connection per browser, shared by every One Finance tab, Workspace view and torn-out window.
 *
 * - The leader (elected with the Web Locks API) opens WebSocket /api/ws; after three failed handshakes it
 *   falls back to SSE /api/stream. Same named events either way.
 * - The leader re-publishes each event on BroadcastChannel('ofx-live'); every other same-origin document
 *   listens there instead of opening its own socket (browsers cap HTTP/1.1 at six connections per host).
 * - A Workspace iframe never leads: its host does. Close the leader tab and the next tab takes the lock.
 * - Optional VITE_NOTIF_WS_URL: a second, external socket whose messages arrive as `notification`.
 *
 * The browser never touches a bus. This is the hub's push channel, nothing more.
 */

const BUS = 'ofx-live';
const LOCK = 'ofx-live-leader';
const RECENT_MAX = 120;

const listeners = new Set();
const statusListeners = new Set();
const recent = [];
const counts = {};

let status = { live: false, transport: null, role: 'starting', since: null, lastAt: null };
let started = false;
let leader = false;
let bus = null;

let ws = null;
let es = null;
let attempts = 0;
let wsFailures = 0;
let useSse = false;
let retryTimer = null;

export function startLive() {
  if (started) return;
  started = true;
  const canShare = typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks?.request;
  if (!canShare) {
    becomeLeader();
    return;
  }
  bus = new BroadcastChannel(BUS);
  bus.onmessage = (e) => onBus(e.data);
  setStatus({ role: 'follower' });
  bus.postMessage({ kind: 'status?' });
  if (FRAMED) return;
  // Hold the lock for the life of this document; the promise never settles.
  navigator.locks.request(LOCK, () => {
    becomeLeader();
    return new Promise(() => {});
  }).catch(() => becomeLeader());
}

export function subscribeLive(fn) {
  startLive();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onLiveStatus(fn) {
  startLive();
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

export function liveStatus() {
  return status;
}

/** True when this document owns the socket. Only the leader raises desktop cards, so one event = one card. */
export function isLiveLeader() {
  return leader;
}

/** Last events seen by this document (newest first) and per-type counts, for the live feed widget. */
export function recentLive() {
  return { events: recent.slice(), counts: { ...counts } };
}

function record(name, data) {
  const at = Date.now();
  recent.unshift({ id: at + '-' + Math.random().toString(36).slice(2, 7), name, data, at });
  if (recent.length > RECENT_MAX) recent.length = RECENT_MAX;
  counts[name] = (counts[name] || 0) + 1;
  status = { ...status, lastAt: at };
}

function dispatch(name, data, fromBus = false) {
  record(name, data);
  listeners.forEach((fn) => {
    try {
      fn(name, data);
    } catch (err) {
      console.error('live listener failed', name, err); // eslint-disable-line no-console
    }
  });
  if (leader && bus && !fromBus) bus.postMessage({ kind: 'event', name, data });
}

function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((fn) => fn(status));
  if (leader && bus) bus.postMessage({ kind: 'status', status });
}

function onBus(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.kind === 'status?') {
    if (leader) bus.postMessage({ kind: 'status', status });
    return;
  }
  if (leader) return;
  if (msg.kind === 'event' && typeof msg.name === 'string') dispatch(msg.name, msg.data, true);
  else if (msg.kind === 'status' && msg.status) setStatus({ ...msg.status, role: 'follower' });
}

function becomeLeader() {
  if (leader) return;
  leader = true;
  setStatus({ role: 'leader' });
  connect();
  const external = import.meta.env?.VITE_NOTIF_WS_URL;
  if (external) connectExternal(external);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !status.live) connect();
  });
}

function schedule() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, backoffMs(attempts));
  attempts += 1;
}

function connect() {
  clearTimeout(retryTimer);
  if (useSse) {
    connectSse();
    return;
  }
  if (ws && ws.readyState <= 1) return;
  let opened = false;
  try {
    ws = new WebSocket(socketUrl('/api/ws', window.location));
  } catch {
    wsFailures = 3;
    useSse = true;
    connectSse();
    return;
  }
  ws.onopen = () => {
    opened = true;
    attempts = 0;
    wsFailures = 0;
    setStatus({ live: true, transport: 'ws', since: Date.now() });
  };
  ws.onmessage = (e) => {
    const frame = parseFrame(e.data);
    if (frame && frame.name !== 'pong') dispatch(frame.name, frame.data);
  };
  ws.onclose = () => {
    ws = null;
    if (status.live) setStatus({ live: false });
    if (!opened) wsFailures += 1;
    if (wsFailures >= 3) useSse = true;
    schedule();
  };
  ws.onerror = () => { /* onclose follows and schedules the retry */ };
}

function connectSse() {
  if (es && es.readyState !== EventSource.CLOSED) return;
  es = new EventSource('/api/stream');
  LIVE_EVENTS.forEach((name) => {
    es.addEventListener(name, (e) => {
      let data = null;
      try { data = JSON.parse(e.data); } catch { data = e.data; }
      dispatch(name, data);
    });
  });
  es.onopen = () => {
    attempts = 0;
    setStatus({ live: true, transport: 'sse', since: Date.now() });
  };
  es.onerror = () => {
    es.close();
    es = null;
    if (status.live) setStatus({ live: false });
    schedule();
  };
}

function connectExternal(url) {
  let tries = 0;
  const open = () => {
    let sock;
    try {
      sock = new WebSocket(url);
    } catch {
      return;
    }
    sock.onopen = () => { tries = 0; };
    sock.onmessage = (e) => {
      let body;
      try { body = JSON.parse(e.data); } catch { body = e.data; }
      dispatch('notification', normalizeExternalNotification(body));
    };
    sock.onclose = () => { setTimeout(open, backoffMs(tries++)); };
  };
  open();
}
