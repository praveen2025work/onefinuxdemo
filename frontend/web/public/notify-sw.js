self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const n = event.data;
  if (!n || n.type !== 'ofx-notify') return;
  event.waitUntil(self.registration.showNotification(n.title || 'One Finance', {
    body: n.message || '',
    tag: n.tag || 'one-finance',
    requireInteraction: false,
    data: { href: n.href || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(href);
  })());
});
