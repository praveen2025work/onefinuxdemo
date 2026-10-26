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
 *   { kind: 'intent', intent, context, source }      — raise an intent (e.g. ViewInstance) for the host
 */

const BUS = 'ofx-interop';

const self = {
  viewId: EMBED_VIEW_ID || 'shell-' + Math.random().toString(36).slice(2, 8),
  channel: EMBED ? EMBED_CHANNEL : null,
};

const contextListeners = new Set();
const systemListeners = new Set();
const channelListeners = new Set();
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
    if (!isValidContext(msg.context)) return;
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

export function postSystem(msg) {
  if (!msg || typeof msg !== 'object' || msg.kind === 'context') return;
  ensureBus()?.postMessage(msg);
}

export function onSystem(fn) {
  ensureBus();
  systemListeners.add(fn);
  return () => systemListeners.delete(fn);
}
