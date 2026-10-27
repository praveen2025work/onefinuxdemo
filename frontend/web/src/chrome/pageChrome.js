import { NAV } from '../nav.js';

export const EMPTY_CHROME = { title: null, icon: null, context: null };

/** Best nav item for a path (exact end routes win; otherwise the longest matching prefix). */
export function navForPath(pathname) {
  let best = null;
  let bestLen = -1;
  for (const section of NAV) {
    for (const it of section.items) {
      if (it.end) {
        if (pathname === it.to && it.to.length >= bestLen) { best = it; bestLen = it.to.length; }
      } else if ((pathname === it.to || pathname.startsWith(`${it.to}/`)) && it.to.length > bestLen) {
        best = it;
        bestLen = it.to.length;
      }
    }
  }
  return best;
}

/** Title shown in the top bar: the screen's lifted label, else the nav label for this path. */
export function resolveTopTitle(chrome, pathname) {
  if (chrome?.title) {
    return { title: chrome.title, icon: chrome.icon, context: chrome.context };
  }
  const nav = navForPath(pathname);
  if (!nav) return null;
  return { title: nav.label, icon: nav.icon, context: null };
}
