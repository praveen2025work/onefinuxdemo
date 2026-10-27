import { THEME_KEY, appIconForMode, resolveTheme, themeById } from './lib/themes.js';

export { THEMES } from './lib/themes.js';

function store(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* private window */ }
}

function stored() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

/** Paint html[data-theme] + html[data-skin] and the PWA title-bar colour. */
export function applyTheme(id, { persist = true } = {}) {
  const t = themeById(id);
  const html = document.documentElement;
  html.setAttribute('data-theme', t.mode);
  html.setAttribute('data-skin', t.skin);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.chrome);
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) {
    icon.type = 'image/png';
    icon.href = appIconForMode(t.mode);
  }
  if (persist) store(t.id);
  window.dispatchEvent(new CustomEvent('ofx-theme', { detail: t }));
  return t.id;
}

export function currentThemeId() {
  return resolveTheme(null, stored());
}

/** Boot: ?theme= wins (and is remembered), then the stored theme, then the default. */
export function bootTheme() {
  const forced = new URLSearchParams(window.location.search).get('theme');
  const id = resolveTheme(forced, stored());
  applyTheme(id, { persist: Boolean(forced) });
  // Another tab, a Workspace view or a torn-out window changed the theme: follow it.
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue) applyTheme(e.newValue, { persist: false });
  });
  return id;
}
