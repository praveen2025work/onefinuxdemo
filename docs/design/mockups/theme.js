/* Apply theme before first paint. Query string wins so a review link can force it:
   index.html?theme=light  |  index.html?theme=dark */
(function () {
  var KEY = 'ofx-theme';
  var q = '';
  try { q = new URLSearchParams(location.search).get('theme') || ''; } catch (e) {}
  var stored = '';
  try { stored = localStorage.getItem(KEY) || ''; } catch (e) {}
  var t = (q === 'light' || q === 'dark') ? q : (stored === 'light' || stored === 'dark' ? stored : 'dark');
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
})();
