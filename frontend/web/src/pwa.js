import { useEffect, useState } from 'react';

/**
 * Installable app (PWA) — the "desktop app from a URL" idea behind OpenFin / Rainbow web.
 * manifest.webmanifest + the service worker (notify-sw.js, which also caches the app shell) make the
 * console installable; Chrome / Edge fire `beforeinstallprompt`, which we keep for the Install button.
 */

let deferred = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: window-controls-overlay)').matches
    || window.navigator.standalone === true;
}

export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  emit();
  e.prompt();
  try {
    const choice = await e.userChoice;
    return choice?.outcome || 'dismissed';
  } catch {
    return 'dismissed';
  }
}

/** { canInstall, standalone, install } */
export function useInstallPrompt() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return { canInstall: Boolean(deferred), standalone: isStandalone(), install: promptInstall };
}
