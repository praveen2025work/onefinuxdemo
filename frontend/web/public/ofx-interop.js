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
 * Embedded mode for any stack (Angular, .NET Razor, Java templates, plain HTML) — list the One Finance origins that may
 * frame the page:
 *   <script src="https://<one-finance-host>/ofx-interop.js" data-ofx-hosts="https://onefinance.bank.com"></script>
 * Framed by one of them with ?ofx-embed=1, the page gets <html data-ofx-embedded="1" data-skin data-theme>, the host's
 * design standard is linked (/theme/onefinux-tokens.css; add data-ofx-wijmo for the Wijmo skin), elements marked
 * data-ofx-chrome hide (the host draws the masthead) and the theme follows the host. A reload inside the frame keeps
 * the mode. Without data-ofx-hosts nothing changes. ofx.getEmbed() says what was applied.
 *
 * Security: the host only accepts messages from the origin it framed; this client only accepts messages from the
 * host origin (document.referrer, or ofx.connect({ hostOrigin })) — with data-ofx-hosts, only a listed one. Nothing is
 * ever posted to '*'.
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
  var SKIN = /^[a-z][a-z0-9-]{0,20}$/;
  var EMBED_NAME = 'ofx-embedded|';
  var script = document.currentScript;
  var embed = { embedded: false, hostOrigin: null, theme: null, skin: null };

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
      if (typeof data.skin === 'string' && SKIN.test(data.skin)) document.documentElement.setAttribute('data-skin', data.skin);
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
      if (c) return Promise.resolve(userChannel(c));
      // An outcome desk channel: shared with that outcome's screens in every browser.
      return Promise.resolve(/^outcome:/.test(state.channel || '') ? channelObject(state.channel, 'app', { name: state.channel }) : null);
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
    /**
     * Tell every desk on this outcome, in every browser, about an action this screen took in its own system:
     *   ofx.activity({ action: 'ASSIGNED', summary: 'BK-4420 assigned to Alex', instanceId })
     * The host adds the desk's outcome and posts it to the hub as the signed-in user (live event `activity`).
     */
    activity: function (a) {
      if (!a || !/^[A-Z][A-Z0-9_]{0,39}$/.test(a.action || '') || !a.summary) return false;
      post({ type: 'ofx.activity', action: a.action, summary: String(a.summary).slice(0, 280), instanceId: a.instanceId || null });
      return true;
    },
    /** Hub WebSocket events relayed by the host: notification | outcome | event | context | activity. */
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
    /** { embedded, hostOrigin, theme, skin }: what embedded mode applied to this page (see data-ofx-hosts above). */
    getEmbed: function () { return embed; },
  };

  /** The One Finance origins listed on the script tag (data-ofx-hosts, comma separated). */
  function allowedHosts() {
    var raw = script && script.getAttribute ? script.getAttribute('data-ofx-hosts') : null;
    if (!raw) return [];
    return String(raw).split(',').map(function (h) { return h.trim().replace(/\/+$/, ''); })
      .filter(function (h) { return /^https?:\/\/[^/\s]+$/.test(h); });
  }

  function linkOnce(href) {
    if (document.querySelector('link[data-ofx="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-ofx', href);
    document.head.appendChild(link);
  }

  /** Embedded when flagged (?ofx-embed=1, or remembered in window.name) and framed by a listed host. */
  function readEmbed(hosts) {
    if (!hosts.length || global.parent === global) return null;
    var q = new URLSearchParams(global.location.search);
    var name = String(global.name || '');
    var remembered = name.indexOf(EMBED_NAME) === 0 ? name.slice(EMBED_NAME.length) : null;
    if (q.get('ofx-embed') !== '1' && !remembered) return null;
    var host = [referrerOrigin(), remembered].filter(function (o) { return o && hosts.indexOf(o) >= 0; })[0];
    if (!host) return null;
    var theme = q.get('theme') === 'dark' ? 'dark' : q.get('theme') === 'light' ? 'light' : null;
    return { hostOrigin: host, theme: theme, skin: SKIN.test(q.get('skin') || '') ? q.get('skin') : null };
  }

  function applyEmbed(info) {
    var html = document.documentElement;
    html.setAttribute('data-ofx-embedded', '1');
    if (info.skin || !html.getAttribute('data-skin')) html.setAttribute('data-skin', info.skin || 'barclays');
    if (info.theme) html.setAttribute('data-theme', info.theme);
    linkOnce(info.hostOrigin + '/theme/onefinux-tokens.css');
    if (script && script.hasAttribute && script.hasAttribute('data-ofx-wijmo')) linkOnce(info.hostOrigin + '/theme/onefinux-wijmo.css');
    try { global.name = EMBED_NAME + info.hostOrigin; } catch (e) { /* sandboxed frame */ }
    embed = { embedded: true, hostOrigin: info.hostOrigin, theme: info.theme, skin: html.getAttribute('data-skin') };
    hostOrigin = hostOrigin || info.hostOrigin;
  }

  global.ofx = ofx;
  if (!global.fdc3) global.fdc3 = fdc3;
  var hosts = allowedHosts();
  var info = readEmbed(hosts);
  if (info) applyEmbed(info);
  // Connect as soon as the page is framed (by a listed host when data-ofx-hosts is set); apps can still call
  // ofx.connect({ hostOrigin }) explicitly.
  var framer = referrerOrigin();
  if (global.parent !== global && (embed.embedded || (framer && (!hosts.length || hosts.indexOf(framer) >= 0)))) ofx.connect().catch(function () {});
})(window);
