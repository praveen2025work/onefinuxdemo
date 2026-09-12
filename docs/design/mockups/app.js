/* Mockup interactions only: tabs, segmented filters, and the sign-off /
   post confirmation on a ready outcome. No data, no business rules here. */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') { fn(); } else { document.addEventListener('DOMContentLoaded', fn); }
  }

  ready(function () {
    // Theme toggle — shared across every mockup topbar
    var bar = document.querySelector('.topbar');
    if (bar && !bar.querySelector('[data-theme-toggle]')) {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var btn = document.createElement('button');
      btn.className = 'tb-btn';
      btn.setAttribute('data-theme-toggle', '');
      btn.setAttribute('type', 'button');
      btn.title = 'Switch theme';
      function paint(t) {
        btn.innerHTML = t === 'light'
          ? '<svg class="i i-14"><use href="#i-moon"></use></svg>Dark'
          : '<svg class="i i-14"><use href="#i-sun"></use></svg>Light';
        btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      }
      paint(cur);
      btn.addEventListener('click', function () {
        var next = (document.documentElement.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.style.colorScheme = next;
        try { localStorage.setItem('ofx-theme', next); } catch (e) {}
        var url = new URL(location.href);
        url.searchParams.set('theme', next);
        history.replaceState({}, '', url);
        paint(next);
      });
      var env = bar.querySelector('.env');
      if (env) { bar.insertBefore(btn, env); } else { bar.appendChild(btn); }
    }

    // Tabs: [role=tablist] > .tab[aria-controls] toggles .tabpane
    document.querySelectorAll('[role="tablist"]').forEach(function (list) {
      list.addEventListener('click', function (e) {
        var tab = e.target.closest('.tab');
        if (!tab || !tab.getAttribute('aria-controls')) return;
        list.querySelectorAll('.tab').forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          var pane = document.getElementById(t.getAttribute('aria-controls'));
          if (pane) { pane.hidden = !on; }
        });
      });
    });

    // Segmented controls are single-select
    document.querySelectorAll('.seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        seg.querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
      });
    });

    // Sign off / post: show the workflow fact the write would produce
    document.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        var out = document.getElementById('act-result');
        if (!out) return;
        var stamp = '12 Sep 2026 19:42:11 UTC';
        var facts = {
          signoff: {
            cls: 'ok', icon: 'i-check', title: 'Signed off — workflow fact recorded',
            body: 'ONEFINUX.OUTCOME_SIGNED_OFF on instance FOBO|2026-09-12|APAC|R-1042 by alex.r · ' + stamp
          },
          post: {
            cls: 'ok', icon: 'i-check', title: 'Posted to MOTIF via FAS',
            body: 'command_run created for FAS_MOTIF · echo of run_id RUN-A37C required before CLEARED · ' + stamp
          },
          escalate: {
            cls: 'warn', icon: 'i-alert', title: 'Escalation raised to RTB',
            body: 'escalation kind=HUMAN on instance FOBO|2026-09-12|EMEA|R-2031 · queued for platform.support'
          }
        };
        var f = facts[act];
        if (!f) return;
        out.className = 'banner ' + f.cls;
        out.innerHTML = '<svg class="i i-18"><use href="#' + f.icon + '"></use></svg>' +
          '<div><b>' + f.title + '</b><span class="mono-sm">' + f.body + '</span></div>';
        out.hidden = false;
        if (act === 'signoff') {
          btn.textContent = 'Signed off';
          btn.setAttribute('disabled', '');
        }
      });
    });
  });
})();
