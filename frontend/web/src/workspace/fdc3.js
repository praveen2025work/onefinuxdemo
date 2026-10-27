import { EMBED, EMBED_VIEW_ID } from '../embed.js';
import { subscribeLive } from '../live/liveLink.js';
import { CHANNELS, CONTEXT_TYPES, channelById, isValidContext, routeForContext } from './channels.js';
import {
  CLIENT_ID, broadcastContext, deliverRemoteContext, interopSelf, lastContextOn, onAnyContext, onSystem, postSystem,
  setOwnChannel, setSharedRelay,
} from './interop.js';
import { isSharedChannel } from './desks.js';
import { interopApi } from '../api.js';

/**
 * window.fdc3 for every One Finance screen — the FDC3 2.0 Desktop Agent API that OpenFin, io.Connect and
 * Finsemble implement, so screen-to-screen code is the industry standard, not a One Finance dialect.
 *
 *   await fdc3.joinUserChannel('blue');
 *   await fdc3.broadcast({ type: 'ofx.instance', id });
 *   await fdc3.addContextListener('ofx.instance', (ctx) => open(ctx.id));
 *   await fdc3.raiseIntent('ViewInstance', { type: 'ofx.instance', id });
 *   const ch = await fdc3.getOrCreateChannel('fobo-desk'); ch.broadcast(ctx);
 *
 * Transport: the interop bus (BroadcastChannel) between console documents; the Workspace host relays to
 * cross-origin partner frames (ofx-interop.js gives them the same window.fdc3). The hub can also push a
 * context or raise an intent over the WebSocket — it arrives here like any other broadcast.
 */

export const FDC3_VERSION = '2.0';
export const BUILTIN_INTENTS = { ViewInstance: CONTEXT_TYPES.instance, ViewReport: CONTEXT_TYPES.outcome };
const RAISE_TIMEOUT_MS = 6000;

let navigateFn = null;
let workspaceHost = false;
const intentHandlers = new Map(); // intent -> Set(handler)
const pendingRaises = new Map(); // raiseId -> { resolve, reject, timer }

/** The router's navigate, so a built-in intent can open a route in this document. */
export function setFdc3Navigator(fn) {
  navigateFn = fn;
}

/** The Workspace page mounts as the intent resolver for its views. */
export function setWorkspaceHost(on) {
  workspaceHost = Boolean(on);
}

function fdc3Error(name) {
  const e = new Error(name);
  e.name = name;
  return e;
}

function listener(off) {
  return { unsubscribe: off };
}

function contextMeta(msg) {
  return { source: { appId: msg.remote ? 'onefinux-hub' : 'onefinux', instanceId: msg.source } };
}

function channelApi(id, type, displayMetadata) {
  return {
    id,
    type,
    displayMetadata,
    broadcast: async (context) => {
      if (!isValidContext(context)) throw fdc3Error('MalformedContext');
      broadcastContext(context, { channel: id });
    },
    getCurrentContext: async (contextType = null) => lastContextOn(id, contextType),
    addContextListener: async (contextType, handler) => {
      const [t, fn] = typeof contextType === 'function' ? [null, contextType] : [contextType, handler];
      return listener(onAnyContext((msg) => {
        if (msg.channel !== id || msg.source === interopSelf().viewId) return;
        if (!t || msg.context.type === t) fn(msg.context, contextMeta(msg));
      }));
    },
  };
}

function userChannel(c) {
  return channelApi(c.id, 'user', { name: c.label, color: c.color, glyph: '●' });
}

function announceChannel(channel) {
  if (EMBED) postSystem({ kind: 'channel-changed', viewId: EMBED_VIEW_ID, channel });
}

/** Built-in intents in a document with no Workspace host: open the route here. */
function resolveLocally(intent, context) {
  if (!BUILTIN_INTENTS[intent] || !navigateFn) return null;
  const route = routeForContext(context);
  if (!route) return null;
  navigateFn(route);
  return { source: { appId: intent === 'ViewInstance' ? 'instance' : 'reports', instanceId: interopSelf().viewId }, intent, version: FDC3_VERSION, getResult: async () => undefined };
}

export function createDesktopAgent() {
  const self = () => interopSelf();
  return {
    async getInfo() {
      return {
        fdc3Version: FDC3_VERSION,
        provider: 'One Finance',
        providerVersion: '1.0',
        optionalFeatures: { OriginatingAppMetadata: true, UserChannelMembershipAPIs: true },
        appMetadata: { appId: 'onefinux', instanceId: self().viewId },
      };
    },
    async broadcast(context) {
      if (!isValidContext(context)) throw fdc3Error('MalformedContext');
      broadcastContext(context); // no-op while not on a channel, as the standard says
    },
    async addContextListener(contextType, handler) {
      const [t, fn] = typeof contextType === 'function' ? [null, contextType] : [contextType, handler];
      return listener(onAnyContext((msg) => {
        const me = self();
        if (!me.channel || msg.channel !== me.channel || msg.source === me.viewId) return;
        if (!t || msg.context.type === t) fn(msg.context, contextMeta(msg));
      }));
    },
    async getUserChannels() { return CHANNELS.map(userChannel); },
    async getSystemChannels() { return CHANNELS.map(userChannel); },
    async joinUserChannel(channelId) {
      if (!channelById(channelId)) throw fdc3Error('NoChannelFound');
      setOwnChannel(channelId);
      announceChannel(channelId);
    },
    async joinChannel(channelId) { return this.joinUserChannel(channelId); },
    async getCurrentChannel() {
      const id = self().channel;
      const c = channelById(id);
      if (c) return userChannel(c);
      // An outcome desk channel: shared with that outcome's screens in every browser.
      return isSharedChannel(id) ? channelApi(id, 'app', { name: id }) : null;
    },
    async leaveCurrentChannel() {
      setOwnChannel(null);
      announceChannel(null);
    },
    async getOrCreateChannel(channelId) {
      if (!channelId || typeof channelId !== 'string') throw fdc3Error('CreationFailed');
      return channelApi('app:' + channelId, 'app', { name: channelId });
    },
    async raiseIntent(intent, context) {
      if (!isValidContext(context)) throw fdc3Error('MalformedContext');
      if (!EMBED && !workspaceHost) {
        const local = resolveLocally(intent, context);
        if (local) return local;
        throw fdc3Error('NoAppsFound');
      }
      const raiseId = self().viewId + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pendingRaises.delete(raiseId); reject(fdc3Error('ResolverTimeout')); }, RAISE_TIMEOUT_MS);
        pendingRaises.set(raiseId, { resolve, reject, timer, intent });
        postSystem({ kind: 'intent', intent, context, source: self().viewId, raiseId });
      });
    },
    async addIntentListener(intent, handler) {
      if (!intentHandlers.has(intent)) intentHandlers.set(intent, new Set());
      intentHandlers.get(intent).add(handler);
      postSystem({ kind: 'intent-listener', viewId: self().viewId, intent });
      return listener(() => intentHandlers.get(intent)?.delete(handler));
    },
    async findIntent(intent) {
      if (!BUILTIN_INTENTS[intent] && !intentHandlers.has(intent)) throw fdc3Error('NoAppsFound');
      return { intent: { name: intent, displayName: intent }, apps: [{ appId: intent === 'ViewReport' ? 'reports' : 'instance' }] };
    },
    async findIntentsByContext(context) {
      if (!isValidContext(context)) throw fdc3Error('MalformedContext');
      return Object.entries(BUILTIN_INTENTS).filter(([, type]) => type === context.type)
        .map(([name]) => ({ intent: { name, displayName: name }, apps: [{ appId: name === 'ViewReport' ? 'reports' : 'instance' }] }));
    },
    async open(app, context) {
      const appId = typeof app === 'string' ? app : app?.appId;
      if (!appId) throw fdc3Error('AppNotFound');
      postSystem({ kind: 'open', appId, context: isValidContext(context) ? context : undefined, source: self().viewId });
      return { appId };
    },
  };
}

let installed = false;

/** Install window.fdc3 once per document, wire hub pushes and intent delivery, and fire `fdc3Ready`. */
export function installFdc3() {
  if (installed || typeof window === 'undefined') return window?.fdc3;
  installed = true;
  const agent = createDesktopAgent();
  window.fdc3 = agent;

  // Outcome desk channels reach other browsers through the hub (it stamps who shared it).
  setSharedRelay((msg) => interopApi.context(msg.channel, msg.context, 'console', { origin: CLIENT_ID, id: msg.id }).catch(() => {}));

  // The hub pushed a context over the WebSocket: deliver it here like a broadcast on that channel.
  subscribeLive((name, data) => {
    if (name === 'context' && data && typeof data === 'object') deliverRemoteContext({ ...data, source: data.source || 'hub' });
  });

  onSystem((msg) => {
    if (msg.kind === 'intent-deliver' && msg.viewId === interopSelf().viewId) {
      const handlers = [...(intentHandlers.get(msg.intent) || [])];
      Promise.resolve(handlers[0] ? handlers[0](msg.context, { source: { instanceId: msg.source } }) : undefined)
        .then((result) => postSystem({ kind: 'intent-result', raiseId: msg.raiseId, target: { appId: 'onefinux', instanceId: interopSelf().viewId }, result: result ?? null }))
        .catch((err) => postSystem({ kind: 'intent-result', raiseId: msg.raiseId, error: String(err?.message || err) }));
    } else if (msg.kind === 'intent-result' && pendingRaises.has(msg.raiseId)) {
      const p = pendingRaises.get(msg.raiseId);
      pendingRaises.delete(msg.raiseId);
      clearTimeout(p.timer);
      if (msg.error) p.reject(fdc3Error(msg.error));
      else p.resolve({ source: msg.target || { appId: 'onefinux' }, intent: p.intent, version: FDC3_VERSION, getResult: async () => msg.result ?? undefined });
    }
  });

  window.dispatchEvent(new Event('fdc3Ready'));
  return agent;
}
