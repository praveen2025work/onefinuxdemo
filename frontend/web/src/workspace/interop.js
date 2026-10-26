import { EMBED, EMBED_CHANNEL, EMBED_VIEW_ID } from '../embed.js';
import { isValidContext } from './channels.js';

/**
 * Interop bus between Workspace views (OpenFin / FDC3 style), over BroadcastChannel('ofx-interop').
 * Same-origin views (console routes in iframes, torn-out windows, native widgets in the host) all talk here.
 * Cross-origin partner iframes cannot join a BroadcastChannel; the Workspace host relays for them with
 * postMessage and checks each frame's origin (see Workspace.jsx and public/ofx-interop.js).
 *
 * Messages:
 *   { kind: 'context', channel, context, source }   — a view shared context on a colour channel
 *   { kind: 'join', viewId, channel }                — host moves a view onto a channel (null = unlink)
 *   { kind: 'scope', scope }                         — host scope (group unit / COB / region) for every view
 *   { kind: 'navigate', viewId, path }               — host asks one view to open a route
 *   { kind: 'view-hello', viewId }                   — a view booted; host answers with join + scope
 *   { kind: 'dock', viewId, appId, url, title, channel } — a torn-out window asks to come back into the grid
 *   { kind: 'intent', intent, context, source, raiseId } — raise an intent; the host resolves it
 *   { kind: 'intent-listener', viewId, intent }      — a view handles an intent (fdc3.addIntentListener)
 *   { kind: 'intent-deliver', viewId, intent, context, raiseId } — host hands an intent to its handler
 *   { kind: 'intent-result', raiseId, target, result, error }    — the outcome, back to the raiser
 *   { kind: 'channel-changed', viewId, channel }     — a view joined / left a channel itself (fdc3.joinUserChannel)
 *
 * Contexts the hub pushes over the WebSocket (event `context`) reach every document through its own live link
 * and are delivered locally with deliverRemoteContext — never re-posted, so each document sees them once.
 * Channel ids: user (colour) channels by name; app channels as 'app:<name>' (fdc3.getOrCreateChannel).
 */

const BUS = 'ofx-interop';

const self = {
  viewId: EMBED_VIEW_ID || 'shell-' + Math.random().toString(36).slice(2, 8),
  channel: EMBED ? EMBED_CHANNEL : null,
};

const contextListeners = new Set();
const systemListeners = new Set();
const channelListeners = new Set();
const lastContext = new Map(); // channel -> last context seen by this document
let bus = null;

function ensureBus() {
  if (bus || typeof BroadcastChannel === 'undefined') return bus;
  bus = new BroadcastChannel(BUS);
  bus.onmessage = (e) => receive(e.data, false);
  return bus;
}

function receive(msg, local) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.kind === 'context') {
    if (!isValidContext(msg.context) || typeof msg.channel !== 'string') return;
    lastContext.set(msg.channel, msg.context);
    contextListeners.forEach((fn) => fn(msg, local));
    return;
  }
  if (msg.kind === 'join' && msg.viewId === self.viewId) setOwnChannel(msg.channel || null);
  systemListeners.forEach((fn) => fn(msg, local));
}

export function interopSelf() {
  ensureBus();
  return { ...self };
}

export function setOwnChannel(channel) {
  self.channel = channel || null;
  channelListeners.forEach((fn) => fn(self.channel));
}

export function onOwnChannel(fn) {
  ensureBus();
  channelListeners.add(fn);
  fn(self.channel);
  return () => channelListeners.delete(fn);
}

/** Share a context on this view's channel. Returns false when the view is not linked. */
export function broadcastContext(context, { channel = self.channel, source = self.viewId } = {}) {
  if (!channel || !isValidContext(context)) return false;
  const msg = { kind: 'context', channel, context, source, at: Date.now() };
  ensureBus()?.postMessage(msg);
  receive(msg, true);
  return true;
}

/**
 * Every context on the bus. `fn(msg, local)`; filter on msg.channel / msg.source yourself.
 * `local` is true for a context this document broadcast.
 */
export function onAnyContext(fn) {
  ensureBus();
  contextListeners.add(fn);
  return () => contextListeners.delete(fn);
}

/** Contexts on this view's current channel that another view sent. */
export function onLinkedContext(fn) {
  return onAnyContext((msg) => {
    if (msg.source === self.viewId || !self.channel || msg.channel !== self.channel) return;
    fn(msg.context, msg);
  });
}

/** A system message to every other document, and to this document's own listeners. */
export function postSystem(msg) {
  if (!msg || typeof msg !== 'object' || msg.kind === 'context') return;
  ensureBus()?.postMessage(msg);
  receive(msg, true);
}

/** The last context this document saw on a channel (FDC3 Channel.getCurrentContext). */
export function lastContextOn(channel, type = null) {
  const ctx = lastContext.get(channel);
  if (!ctx) return null;
  return !type || ctx.type === type ? ctx : null;
}

/** A context the hub pushed over the WebSocket. Delivered to this document only (each document gets the push). */
export function deliverRemoteContext({ channel, context, source = 'hub', at = Date.now() }) {
  if (!channel || !isValidContext(context)) return false;
  receive({ kind: 'context', channel, context, source, at, remote: true }, false);
  return true;
}

export function onSystem(fn) {
  ensureBus();
  systemListeners.add(fn);
  return () => systemListeners.delete(fn);
}
