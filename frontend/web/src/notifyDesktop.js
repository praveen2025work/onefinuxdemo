/**
 * Desktop cards *outside* the browser (Windows Action Center / macOS Notification
 * Center — same place Outlook and GitLab put them, with an X).
 * The One Finance tab must stay loaded so SSE can fire.
 */

let registration = null;

function originUrl(path) {
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
}

export function desktopNotifyPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function registerNotifyWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    registration = await navigator.serviceWorker.register('/notify-sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    registration = null;
    return null;
  }
}

export async function enableDesktopNotifications() {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  await registerNotifyWorker();
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function formatDesktopCard(n = {}) {
  const title = String(n.title || 'One Finance').trim();
  const detail = String(n.message || '').trim();
  const meta = ['One Finance', n.outcomeName, n.transition && String(n.transition).replaceAll('_', ' ')]
      .filter(Boolean);
  const body = detail ? `${meta.join(' · ')}\n${detail}` : meta.join(' · ');
  const severity = n.severity || 'INFO';
  return {
    title,
    body,
    tag: `ofx-${n.id || n.at || Date.now()}`,
    href: n.instanceId ? `/instance/${encodeURIComponent(n.instanceId)}` : '/board',
    sticky: severity === 'CRITICAL' || severity === 'WARN',
    severity,
  };
}

export function pushMonitorNotification(n) {
  const card = formatDesktopCard(n);
  const opts = {
    body: card.body,
    icon: originUrl('/notify-icon.png'),
    badge: originUrl('/notify-badge.png'),
    tag: card.tag,
    data: { href: card.href },
    renotify: true,
    requireInteraction: card.sticky,
    timestamp: Date.now(),
    silent: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  if (registration) {
    registration.showNotification(card.title, opts).catch(() => postToWorker(card));
    return;
  }
  if (navigator.serviceWorker?.controller) {
    postToWorker(card);
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const note = new Notification(card.title, opts);
      note.onclick = () => { window.focus(); note.close(); };
    } catch { /* platform block */ }
  }
}

function postToWorker(card) {
  navigator.serviceWorker.controller?.postMessage({ type: 'ofx-notify', ...card });
}
