// Pure helpers for the live channel. No window / DOM here so node --test can load them.

/** Hub event names carried on /api/ws and /api/stream. */
export const LIVE_EVENTS = ['hello', 'event', 'outcome', 'notification', 'reset', 'kit', 'propagation'];

const TYPE_SEVERITY = {
  approval: 'SUCCESS',
  success: 'SUCCESS',
  rejection: 'CRITICAL',
  error: 'CRITICAL',
  critical: 'CRITICAL',
  alert: 'WARN',
  warning: 'WARN',
  warn: 'WARN',
  info: 'INFO',
};

/** Parse one WebSocket frame {"type": name, "data": payload}. Returns null for anything else. */
export function parseFrame(text) {
  let msg;
  try {
    msg = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string' || !msg.type) return null;
  return { name: msg.type, data: msg.data ?? null };
}

/** ws:// or wss:// for a same-origin path, following the page scheme. */
export function socketUrl(path, location) {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${path}`;
}

/** Reconnect delay: 1s, 2s, 4s … capped at 15s. */
export function backoffMs(attempt) {
  const n = Math.max(0, Number(attempt) || 0);
  return Math.min(15_000, 1000 * 2 ** Math.min(n, 4));
}

/**
 * An external notification socket (VITE_NOTIF_WS_URL — same idea as STEPS NEXT_PUBLIC_NOTIF_WS_URL) may send
 * STEPS-shaped payloads ({type: approval|rejection|info|alert, title, message, timestamp}) or plain text.
 * Fold either into the hub notification shape the console already renders.
 */
export function normalizeExternalNotification(payload, now = Date.now()) {
  const body = payload && typeof payload === 'object' ? payload : { message: String(payload ?? '') };
  const rawSeverity = String(body.severity || body.type || 'info').toLowerCase();
  const severity = TYPE_SEVERITY[rawSeverity] || (['INFO', 'SUCCESS', 'WARN', 'CRITICAL'].includes(String(body.severity)) ? body.severity : 'INFO');
  const at = body.timestamp || body.createdAt;
  const createdAt = at && !Number.isNaN(new Date(at).getTime()) ? new Date(at).toISOString() : new Date(now).toISOString();
  const sender = body.sender && typeof body.sender === 'object' ? body.sender.name : body.sender;
  return {
    id: 'ext-' + String(body.id ?? now),
    createdAt,
    severity,
    transition: 'EXTERNAL',
    outcomeKey: body.workflowId || body.applicationId || body.outcomeKey || null,
    outcomeName: body.outcomeName || sender || 'External feed',
    title: String(body.title || 'Notification'),
    message: body.message == null ? '' : String(body.message),
    source: 'external',
  };
}
