const ICON = '/notify-icon.png';
const BADGE = '/notify-badge.png';

// One service worker per scope, so this one also makes One Finance an installable app (PWA):
// it keeps the app shell for offline start. /api and /sim are never cached — readiness is always live.
const SHELL = 'ofx-shell-v2';
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/app-icon-light.png', '/app-icon-dark.png', '/app-icon-192.png', '/app-icon-512.png', ICON, BADGE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => { /* first install offline: notifications still work */ })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ofx-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/sim')) return;
  // SPA routes (no file extension): network first, cached shell when offline. A static page such as
  // /partner-demo.html is also a navigation (iframes) but is not the shell, so it is never stored as one.
  if (req.mode === 'navigate' && !/\.[a-z0-9]+$/i.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put('/index.html', res.clone())).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || caches.match('/'))),
    );
    return;
  }
  // Hashed build assets are immutable: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone())).catch(() => {});
        return res;
      })),
    );
  }
});

self.addEventListener('message', (event) => {
  const n = event.data;
  if (!n || n.type !== 'ofx-notify') return;
  event.waitUntil(showCard(n));
});

function showCard(n) {
  return self.registration.showNotification(n.title || 'One Finance', {
    body: n.body || n.message || '',
    icon: n.icon || ICON,
    badge: n.badge || BADGE,
    tag: n.tag || 'one-finance',
    renotify: true,
    requireInteraction: !!n.sticky,
    silent: false,
    timestamp: Date.now(),
    data: { href: n.href || '/' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  event.notification.close();
  if (action === 'dismiss') return;
  const href = event.notification.data?.href || '/';
  event.waitUntil(focusOrOpen(href));
});

async function focusOrOpen(href) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    if ('focus' in client) {
      await client.focus();
      if (href && 'navigate' in client) {
        try { await client.navigate(href); } catch { /* ignore */ }
      }
      return;
    }
  }
  if (self.clients.openWindow) await self.clients.openWindow(href);
}
