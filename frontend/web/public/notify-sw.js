const ICON = '/notify-icon.png';
const BADGE = '/notify-badge.png';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
