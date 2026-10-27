// Demo chatbot for the One Finance chat contract (see frontend/web/src/chat/chatHost.js and docs/design/chatbot.md).
// A real bot does the same three things: style itself from /theme/onefinux-tokens.css, listen for ofx.theme and
// ofx.context from the console, and post ofx.chat.ready / ofx.chat.open / ofx.chat.share back to it.
(function () {
  var params = new URLSearchParams(location.search);
  var root = document.documentElement;
  var hostOrigin = (function () { try { return new URL(document.referrer).origin; } catch (e) { return location.origin; } })();
  var scope = { groupUnit: params.get('groupUnit'), cobDate: params.get('cobDate'), region: params.get('region') };
  var list = document.getElementById('list');
  var empty = document.getElementById('empty');

  function setTheme(theme, skin) {
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    if (skin === 'steps' || skin === 'ofx') root.setAttribute('data-skin', skin);
  }
  if (params.get('ofx-embed') === '1') root.setAttribute('data-ofx-embedded', '1');
  setTheme(params.get('theme'), params.get('skin'));

  function toHost(msg) { if (window.parent !== window) window.parent.postMessage(msg, hostOrigin); }

  function scopeText() {
    return [scope.groupUnit, scope.cobDate, scope.region || 'all regions'].filter(Boolean).join(' · ') || 'no scope yet';
  }
  function showScope() { var s = document.getElementById('scope'); if (s) s.textContent = 'Your scope: ' + scopeText(); }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function say(role, text, actions) {
    if (empty) { empty.remove(); empty = null; }
    var m = el('div', 'ofx-chat-msg ' + (role === 'user' ? 'ofx-chat-user' : 'ofx-chat-bot'));
    m.appendChild(el('div', null, text));
    if (actions && actions.length) {
      var row = el('div', 'ofx-chat-actions');
      actions.forEach(function (a) {
        var b = el('button', 'ofx-chat-action', a.label);
        b.type = 'button';
        b.addEventListener('click', function () { toHost(a.msg); });
        row.appendChild(b);
      });
      m.appendChild(row);
    }
    list.appendChild(m);
    list.scrollTop = list.scrollHeight;
  }

  var R2031 = 'FOBO|2026-09-12|EMEA|R-2031';
  function answer(q) {
    var t = q.toLowerCase();
    if (t.indexOf('2031') >= 0 || t.indexOf('block') >= 0) {
      return say('bot', 'R-2031 (EMEA) is blocked on Motif MB014: the ledger post was rejected. RTB owns the escalation; the controller signs off once Motif posts.', [
        { label: 'Open R-2031', msg: { type: 'ofx.chat.open', route: '/instance/' + encodeURIComponent(R2031) } },
        { label: 'Share with linked screens', msg: { type: 'ofx.chat.share', context: { type: 'ofx.instance', id: R2031, kitId: 'FOBO', region: 'EMEA' } } },
      ]);
    }
    if (t.indexOf('board') >= 0) return say('bot', 'The board shows every instance in your unit with its readiness.', [{ label: 'Open the board', msg: { type: 'ofx.chat.open', route: '/board' } }]);
    if (t.indexOf('scope') >= 0) return say('bot', 'The console says you are looking at ' + scopeText() + '.');
    say('bot', 'I am the demo bot. Try asking why R-2031 is blocked, or to show the board.');
  }

  document.getElementById('compose').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('input');
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    say('user', q);
    setTimeout(function () { answer(q); }, 250);
  });
  document.querySelectorAll('[data-ask]').forEach(function (b) {
    b.addEventListener('click', function () { var q = b.getAttribute('data-ask'); say('user', q); setTimeout(function () { answer(q); }, 250); });
  });

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || e.origin !== hostOrigin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'ofx.theme') setTheme(e.data.theme, e.data.skin);
    if (e.data.type === 'ofx.context' && e.data.scope) { scope = e.data.scope; showScope(); }
  });

  showScope();
  toHost({ type: 'ofx.chat.ready' });
})();
