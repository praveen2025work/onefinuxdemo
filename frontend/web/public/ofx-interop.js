/*
 * One Finance interop client for partner screens framed in the Workspace (FDC3-shaped, postMessage).
 *
 *   <script src="https://<one-finance-host>/ofx-interop.js"></script>
 *   ofx.connect().then(({ channel, context }) => { ... });
 *   ofx.addContextListener('ofx.instance', (ctx) => openBreak(ctx.id));
 *   ofx.broadcast({ type: 'ofx.instance', id: 'FOBO|2026-09-12|EMEA|R-2031' });
 *   ofx.raiseIntent('ViewInstance', { type: 'ofx.instance', id: '…' });
 *
 * The host only accepts messages from the origin it framed, and this client only accepts messages from the
 * host origin (document.referrer, or connect({ hostOrigin })). Nothing is ever posted to '*'.
 * Context types: ofx.instance { id }, ofx.outcome { outcomeId, cobDate, region }, ofx.tile { tileId },
 * ofx.scope { groupUnit, cobDate, region }; any other { type } is relayed untouched.
 */
(function (global) {
  'use strict';

  var hostOrigin = null;
  var state = { channel: null, context: null, scope: null, connected: false };
  var contextListeners = [];
  var channelListeners = [];
  var scopeListeners = [];
  var waiting = [];

  function referrerOrigin() {
    try { return document.referrer ? new URL(document.referrer).origin : null; } catch (e) { return null; }
  }

  function post(message) {
    if (!hostOrigin || global.parent === global) return false;
    global.parent.postMessage(message, hostOrigin);
    return true;
  }

  function emit(list, a, b) {
    list.slice().forEach(function (fn) { try { fn(a, b); } catch (e) { console.error(e); } });
  }

  function onMessage(e) {
    if (e.source !== global.parent || e.origin !== hostOrigin) return;
    var data = e.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
    if (data.type === 'ofx.channel') {
      state.channel = data.channel || null;
      if (data.scope) state.scope = data.scope;
      if (!state.connected) {
        state.connected = true;
        waiting.splice(0).forEach(function (resolve) { resolve({ channel: state.channel, context: data.context || null, scope: state.scope }); });
      }
      emit(channelListeners, state.channel);
      if (data.context) deliver(data.context);
    } else if (data.type === 'ofx.context' && data.context && typeof data.context.type === 'string') {
      deliver(data.context);
    } else if (data.type === 'ofx.scope' && data.scope) {
      state.scope = data.scope;
      emit(scopeListeners, data.scope);
    }
  }

  function deliver(context) {
    state.context = context;
    contextListeners.slice().forEach(function (l) {
      if (!l.type || l.type === context.type) { try { l.fn(context); } catch (err) { console.error(err); } }
    });
  }

  var ofx = {
    /** Handshake with the host. Resolves with { channel, context, scope }. */
    connect: function (options) {
      hostOrigin = (options && options.hostOrigin) || hostOrigin || referrerOrigin();
      if (!hostOrigin) return Promise.reject(new Error('ofx-interop: pass connect({ hostOrigin }) — no referrer to infer it from.'));
      global.removeEventListener('message', onMessage);
      global.addEventListener('message', onMessage);
      return new Promise(function (resolve) {
        if (state.connected) { resolve({ channel: state.channel, context: state.context, scope: state.scope }); return; }
        waiting.push(resolve);
        post({ type: 'ofx.ready' });
      });
    },
    /** Share a context on this view's link channel. Ignored by the host while the view is unlinked. */
    broadcast: function (context) {
      if (!context || typeof context.type !== 'string') throw new Error('ofx-interop: a context needs a string type');
      return post({ type: 'ofx.context.broadcast', context: context });
    },
    /** handler(context) for contexts of `type` (or every type when type is null) shared on the channel. */
    addContextListener: function (type, handler) {
      var entry = { type: type || null, fn: handler };
      contextListeners.push(entry);
      return { unsubscribe: function () { var i = contextListeners.indexOf(entry); if (i >= 0) contextListeners.splice(i, 1); } };
    },
    /** Ask the host to act on a context, e.g. ViewInstance opens or focuses an Instance view. */
    raiseIntent: function (intent, context) {
      return post({ type: 'ofx.intent', intent: intent, context: context });
    },
    onChannelChanged: function (handler) { channelListeners.push(handler); },
    onScope: function (handler) { scopeListeners.push(handler); },
    getCurrentChannel: function () { return state.channel; },
    getCurrentContext: function () { return state.context; },
    getScope: function () { return state.scope; },
  };

  global.ofx = ofx;
})(window);
