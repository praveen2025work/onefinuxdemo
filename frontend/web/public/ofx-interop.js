/*
 * One Finance interop client for partner screens framed in the Workspace.
 *
 * Gives a framed app the standard FDC3 2.0 Desktop Agent API (window.fdc3 — what OpenFin / io.Connect provide),
 * so screen-to-screen code written for a desktop container runs unchanged inside One Finance:
 *
 *   <script src="https://<one-finance-host>/ofx-interop.js"></script>
 *   window.addEventListener('fdc3Ready', async () => {
 *     await fdc3.addContextListener('ofx.instance', (ctx) => openBreak(ctx.id));
 *     await fdc3.broadcast({ type: 'ofx.instance', id: 'FOBO|2026-09-12|EMEA|R-2031' });
 *     await fdc3.raiseIntent('ViewInstance', { type: 'ofx.instance', id: '…' });
 *     const desk = await fdc3.getOrCreateChannel('fobo-desk');   // app channel
 *   });
 *   ofx.addLiveListener('notification', (n) => …);   // hub WebSocket events, relayed by the host
 *
 * Security: the host only accepts messages from the origin it framed; this client only accepts messages from the
 * host origin (document.referrer, or ofx.connect({ hostOrigin })). Nothing is ever posted to '*'.
 * Context types: ofx.instance { id }, ofx.outcome { outcomeId, cobDate, region }, ofx.tile { tileId },
 * ofx.scope { groupUnit, cobDate, region }; any FDC3 type ({ type: 'fdc3.instrument', … }) is relayed untouched.
 */
(function (global) {
  'use strict';

  var USER_CHANNELS = [
    { id: 'red', name: 'Red', color: '#ef4444' }, { id: 'orange', name: 'Orange', color: '#f97316' },
    { id: 'yellow', name: 'Yellow', color: '#eab308' }, { id: 'green', name: 'Green', color: '#22c55e' },
    { id: 'blue', name: 'Blue', color: '#3b82f6' }, { id: 'purple', name: 'Purple', color: '#a855f7' },
  ];
  var hostOrigin = null;
  var state = { channel: null, scope: null, connected: false, lastContext: {} };
  var contextListeners = []; // { channel: null (current user channel) | 'app:x', type, fn }
  var channelListeners = [];
  var scopeListeners = [];
  var liveListeners = {}; // name -> [fn]
  var intentHandlers = {}; // intent -> fn
  var pendingRaises = {}; // raiseId -> { resolve, reject, timer, intent }
  var waiting = [];
  var seq = 0;

  function referrerOrigin() {
    try { return document.referrer ? new URL(document.referrer).origin : null; } catch (e) { return null; }
  }

  function post(message) {
    if (!hostOrigin || global.parent === global) return false;
    global.parent.postMessage(message, hostOrigin);
    return true;
  }

  function fdc3Error(name) {
    var e = new Error(name);
    e.name = name;
    return e;
  }

  function validContext(ctx) {
    return ctx && typeof ctx === 'object' && typeof ctx.type === 'string' && ctx.type.length > 0;
  }

  function each(list, a, b) {
    list.slice().forEach(function (fn) { try { fn(a, b); } catch (err) { console.error(err); } });
  }

  function deliver(channel, context, source) {
    state.lastContext[channel] = context;
    contextListeners.slice().forEach(function (l) {
      var target = l.channel || state.channel;
      if (target !== channel) return;
      if (l.type && l.type !== context.type) return;
      try { l.fn(context, { source: { instanceId: source || null } }); } catch (err) { console.error(err); }
    });
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
        global.dispatchEvent(new Event('fdc3Ready'));
      }
      each(channelListeners, state.channel);
      if (data.context && state.channel) deliver(state.channel, data.context, 'replay');
    } else if (data.type === 'ofx.context' && validContext(data.context) && typeof data.channel === 'string') {
      deliver(data.channel, data.context, data.source);
    } else if (data.type === 'ofx.scope' && data.scope) {
      state.scope = data.scope;
      each(scopeListeners, data.scope);
    } else if (data.type === 'ofx.theme' && (data.theme === 'light' || data.theme === 'dark')) {
      // The host switched theme: repaint from the same tokens (html[data-theme] / html[data-skin]).
      document.documentElement.setAttribute('data-theme', data.theme);
      if (data.skin === 'steps' || data.skin === 'ofx') document.documentElement.setAttribute('data-skin', data.skin);
      global.dispatchEvent(new CustomEvent('ofx-theme', { detail: { theme: data.theme, skin: data.skin } }));
    } else if (data.type === 'ofx.live' && typeof data.name === 'string') {
      each(liveListeners[data.name] || [], data.data);
    } else if (data.type === 'ofx.intent.deliver' && typeof data.intent === 'string') {
      var handler = intentHandlers[data.intent];
      Promise.resolve(handler ? handler(data.context, { source: { instanceId: data.source || null } }) : undefined)
        .then(function (result) { post({ type: 'ofx.intent.result', raiseId: data.raiseId, result: result === undefined ? null : result }); })
        .catch(function (err) { post({ type: 'ofx.intent.result', raiseId: data.raiseId, error: String((err && err.message) || err) }); });
    } else if (data.type === 'ofx.intent.result' && pendingRaises[data.raiseId]) {
      var p = pendingRaises[data.raiseId];
      delete pendingRaises[data.raiseId];
      clearTimeout(p.timer);
      if (data.error) p.reject(fdc3Error(data.error));
      else p.resolve({ source: data.target || {}, intent: p.intent, version: '2.0', getResult: function () { return Promise.resolve(data.result === null ? undefined : data.result); } });
    }
  }

  function userChannel(c) {
    return channelObject(c.id, 'user', { name: c.name, color: c.color, glyph: '●' });
  }

  function channelObject(id, type, displayMetadata) {
    var appChannel = type === 'app';
    return {
      id: id,
      type: type,
      displayMetadata: displayMetadata,
      broadcast: function (context) {
        if (!validContext(context)) return Promise.reject(fdc3Error('MalformedContext'));
        post({ type: 'ofx.context.broadcast', context: context, channel: appChannel ? id : undefined });
        return Promise.resolve();
      },
      getCurrentContext: function (contextType) {
        var ctx = state.lastContext[id] || null;
        return Promise.resolve(ctx && (!contextType || ctx.type === contextType) ? ctx : null);
      },
      addContextListener: function (contextType, handler) {
        var fn = typeof contextType === 'function' ? contextType : handler;
        var entry = { channel: id, type: typeof contextType === 'function' ? null : contextType, fn: fn };
        contextListeners.push(entry);
        if (appChannel) post({ type: 'ofx.subscribe', channel: id });
        return Promise.resolve({ unsubscribe: function () { remove(contextListeners, entry); } });
      },
    };
  }

  function remove(list, item) {
    var i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
  }

  var fdc3 = {
    getInfo: function () {
      return Promise.resolve({ fdc3Version: '2.0', provider: 'One Finance', providerVersion: '1.0',
        optionalFeatures: { OriginatingAppMetadata: true, UserChannelMembershipAPIs: true } });
    },
    broadcast: function (context) {
      if (!validContext(context)) return Promise.reject(fdc3Error('MalformedContext'));
      post({ type: 'ofx.context.broadcast', context: context });
      return Promise.resolve();
    },
    addContextListener: function (contextType, handler) {
      var fn = typeof contextType === 'function' ? contextType : handler;
      var entry = { channel: null, type: typeof contextType === 'function' ? null : contextType, fn: fn };
      contextListeners.push(entry);
      return Promise.resolve({ unsubscribe: function () { remove(contextListeners, entry); } });
    },
    getUserChannels: function () { return Promise.resolve(USER_CHANNELS.map(userChannel)); },
    getSystemChannels: function () { return Promise.resolve(USER_CHANNELS.map(userChannel)); },
    joinUserChannel: function (channelId) {
      if (!USER_CHANNELS.some(function (c) { return c.id === channelId; })) return Promise.reject(fdc3Error('NoChannelFound'));
      post({ type: 'ofx.join', channel: channelId });
      return Promise.resolve();
    },
    joinChannel: function (channelId) { return fdc3.joinUserChannel(channelId); },
    getCurrentChannel: function () {
      var c = USER_CHANNELS.filter(function (x) { return x.id === state.channel; })[0];
      return Promise.resolve(c ? userChannel(c) : null);
    },
    leaveCurrentChannel: function () {
      post({ type: 'ofx.join', channel: null });
      return Promise.resolve();
    },
    getOrCreateChannel: function (channelId) {
      if (!channelId || typeof channelId !== 'string') return Promise.reject(fdc3Error('CreationFailed'));
      return Promise.resolve(channelObject('app:' + channelId.toLowerCase(), 'app', { name: channelId }));
    },
    raiseIntent: function (intent, context) {
      if (!validContext(context)) return Promise.reject(fdc3Error('MalformedContext'));
      var raiseId = 'r' + (seq += 1) + '-' + Date.now().toString(36);
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { delete pendingRaises[raiseId]; reject(fdc3Error('ResolverTimeout')); }, 6000);
        pendingRaises[raiseId] = { resolve: resolve, reject: reject, timer: timer, intent: intent };
        if (!post({ type: 'ofx.intent', intent: intent, context: context, raiseId: raiseId })) {
          clearTimeout(timer);
          delete pendingRaises[raiseId];
          reject(fdc3Error('NoAppsFound'));
        }
      });
    },
    addIntentListener: function (intent, handler) {
      intentHandlers[intent] = handler;
      post({ type: 'ofx.intent.listen', intent: intent });
      return Promise.resolve({ unsubscribe: function () { if (intentHandlers[intent] === handler) delete intentHandlers[intent]; } });
    },
  };

  var ofx = {
    /** Handshake with the host. Resolves with { channel, context, scope } and fires `fdc3Ready`. */
    connect: function (options) {
      hostOrigin = (options && options.hostOrigin) || hostOrigin || referrerOrigin();
      if (!hostOrigin) return Promise.reject(new Error('ofx-interop: pass connect({ hostOrigin }) — no referrer to infer it from.'));
      global.removeEventListener('message', onMessage);
      global.addEventListener('message', onMessage);
      return new Promise(function (resolve) {
        if (state.connected) { resolve({ channel: state.channel, context: state.lastContext[state.channel] || null, scope: state.scope }); return; }
        waiting.push(resolve);
        post({ type: 'ofx.ready' });
      });
    },
    /** Hub WebSocket events relayed by the host: notification | outcome | event | context. */
    addLiveListener: function (name, handler) {
      (liveListeners[name] = liveListeners[name] || []).push(handler);
      post({ type: 'ofx.live.subscribe', names: Object.keys(liveListeners) });
      return { unsubscribe: function () { remove(liveListeners[name] || [], handler); } };
    },
    broadcast: function (context) { return fdc3.broadcast(context); },
    addContextListener: function (type, handler) {
      var entry = { channel: null, type: type || null, fn: handler };
      contextListeners.push(entry);
      return { unsubscribe: function () { remove(contextListeners, entry); } };
    },
    raiseIntent: function (intent, context) { return fdc3.raiseIntent(intent, context); },
    onChannelChanged: function (handler) { channelListeners.push(handler); },
    onScope: function (handler) { scopeListeners.push(handler); },
    getCurrentChannel: function () { return state.channel; },
    getCurrentContext: function () { return state.lastContext[state.channel] || null; },
    getScope: function () { return state.scope; },
  };

  global.ofx = ofx;
  if (!global.fdc3) global.fdc3 = fdc3;
  // Connect as soon as the page is framed; apps can still call ofx.connect({ hostOrigin }) explicitly.
  if (global.parent !== global && referrerOrigin()) ofx.connect().catch(function () {});
})(window);
