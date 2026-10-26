// Notification inbox helpers (STEPS NotificationsPanel / NotificationsCenter behaviour on hub data).
// Read and dismissed state is per browser — the hub inbox stays the single record. Pure: node --test loads it.

export const READ_KEY = 'ofx-notif-read';
export const HIDDEN_KEY = 'ofx-notif-hidden';
export const MAX_IDS = 500;

/** STEPS types: approval (green), rejection (red), alert (amber), info (blue). */
export function notificationKind(n = {}) {
  const sev = String(n.severity || '').toUpperCase();
  const tr = String(n.transition || '').toUpperCase();
  if (sev === 'CRITICAL' || tr === 'BLOCKED' || tr === 'FAILED') return 'rejection';
  if (sev === 'WARN' || tr.includes('RISK') || tr.includes('BREACH') || tr === 'DELAYED') return 'alert';
  if (sev === 'SUCCESS' || tr === 'READY' || tr === 'COMPLETED' || tr === 'CLEARED') return 'approval';
  return 'info';
}

export const KIND_LABEL = { approval: 'Approval', rejection: 'Rejection', alert: 'Alert', info: 'Information' };

export function idOf(n) {
  return String(n?.id ?? '');
}

function time(n) {
  const t = new Date(n?.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Hub inbox ∪ notifications seen live but not (yet) in the inbox (e.g. an external socket). Newest first. */
export function mergeNotifications(hubRows = [], extras = [], limit = 200) {
  const byId = new Map();
  for (const n of extras) if (n && idOf(n)) byId.set(idOf(n), n);
  for (const n of hubRows) if (n && idOf(n)) byId.set(idOf(n), n);
  return [...byId.values()].sort((a, b) => time(b) - time(a)).slice(0, limit);
}

export function unreadCount(list = [], readIds = new Set()) {
  return list.reduce((count, n) => count + (readIds.has(idOf(n)) ? 0 : 1), 0);
}

/** Keep the newest ids only so localStorage never grows without bound. */
export function capIds(ids, max = MAX_IDS) {
  const arr = [...ids];
  return new Set(arr.slice(Math.max(0, arr.length - max)));
}

/** Notifications page filter: tab = all | unread | approval | rejection | alert | info; query matches title/message/outcome. */
export function filterNotifications(list = [], { tab = 'all', query = '', readIds = new Set() } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return list.filter((n) => {
    if (tab === 'unread' && readIds.has(idOf(n))) return false;
    if (tab !== 'all' && tab !== 'unread' && notificationKind(n) !== tab) return false;
    if (!q) return true;
    return [n.title, n.message, n.outcomeName, n.outcomeKey, n.transition]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });
}

/** "12s ago", "4m ago", "3h ago", else a short date. */
export function relativeTime(at, now = Date.now()) {
  const t = new Date(at).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
