// A chatbot another team runs, framed in the console (assistant panel tab, desk widget). Pure helpers for the host
// side of the contract; node --test drives them.
//
// Host → bot (postMessage to the bot's origin)
//   { type: 'ofx.theme',   theme: 'light'|'dark', skin: 'steps'|'ofx' }        on load and on every theme change
//   { type: 'ofx.context', scope: { groupUnit, cobDate, region }, page, user } on load, scope or page change
// Bot → host (accepted only from the configured origin and from that frame)
//   { type: 'ofx.chat.ready' }                         the bot is listening; the host answers with theme + context
//   { type: 'ofx.chat.open',  route: '/instance/…' }   open a console route (same-origin path only)
//   { type: 'ofx.chat.share', context: { type: 'ofx.instance', … } }  share a context with linked screens (FDC3)
// The iframe URL carries the same at start: ?ofx-embed=1&theme=&skin=&groupUnit=&cobDate=&region=

const SHARE_TYPE = /^ofx\.[a-z][a-zA-Z.]{0,40}$/;

/** The bot's origin: configured, or derived from its URL (a same-origin path means the console's own origin). */
export function chatOrigin(chatbot, pageOrigin) {
  if (chatbot?.origin) return String(chatbot.origin).replace(/\/$/, '');
  try { return new URL(chatbot?.url || '', pageOrigin).origin; } catch { return null; }
}

/** The iframe src: the bot URL with the embed flag, the theme and the user's scope. */
export function chatSrc(chatbot, { theme = 'light', skin = 'steps', scope = {}, pageOrigin } = {}) {
  if (!chatbot?.url) return null;
  let u;
  try { u = new URL(chatbot.url, pageOrigin); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.searchParams.set('ofx-embed', '1');
  u.searchParams.set('theme', theme);
  u.searchParams.set('skin', skin);
  for (const k of ['groupUnit', 'cobDate', 'region']) if (scope[k]) u.searchParams.set(k, scope[k]);
  return u.origin === pageOrigin ? u.pathname + u.search : u.toString();
}

/** A route the bot may open: a console path, never another site or a script URL. */
export function safeChatRoute(route) {
  return typeof route === 'string' && route.startsWith('/') && !route.startsWith('//') && !route.includes('\\') && route.length <= 300 ? route : null;
}

/**
 * Check a message event against the contract. Returns { kind: 'ready' | 'open' | 'share', … } or null when the
 * message is not from the configured bot, not from its frame, or not a request the host honours.
 */
export function readChatMessage(event, { origin, frameWindow }) {
  if (!event || !origin || event.origin !== origin) return null;
  if (frameWindow && event.source !== frameWindow) return null;
  const d = event.data;
  if (!d || typeof d !== 'object' || typeof d.type !== 'string') return null;
  if (d.type === 'ofx.chat.ready') return { kind: 'ready' };
  if (d.type === 'ofx.chat.open') {
    const route = safeChatRoute(d.route);
    return route ? { kind: 'open', route } : null;
  }
  if (d.type === 'ofx.chat.share' && d.context && typeof d.context === 'object' && SHARE_TYPE.test(String(d.context.type || ''))) {
    return { kind: 'share', context: d.context };
  }
  return null;
}

/** What the host tells the bot about the user's place in the console. */
export function contextMessage({ groupUnit, cobDate, region } = {}, page, user) {
  return { type: 'ofx.context', scope: { groupUnit: groupUnit || null, cobDate: cobDate || null, region: region || null }, page: page || null, user: user || null };
}
