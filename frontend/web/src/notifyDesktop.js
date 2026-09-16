/**
 * Desktop cards *outside* the browser (Windows Action Center / macOS Notification
 * Center — same place Outlook and GitLab put them, with an X).
 * The One Finance tab must stay loaded so SSE can fire. Closing the browser
 * cannot deliver a page or desktop card from this POC.
 */

let registration = null;

export async function enableDesktopNotifications() {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  try {
    registration = await navigator.serviceWorker.register('/notify-sw.js');
    await navigator.serviceWorker.ready;
  } catch {
    registration = null;
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function desktopNotifyPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function pushMonitorNotification(n) {
  const title = n.title || 'One Finance';
  const message = n.message || n.transition || '';
  const tag = `ofx-${n.id || n.at || Date.now()}`;
  const href = n.instanceId ? `/instance/${encodeURIComponent(n.instanceId)}` : '/';

  if (registration) {
    registration.showNotification(title, { body: message, tag, data: { href } }).catch(() => {
      postToWorker({ type: 'ofx-notify', title, message, tag, href });
    });
    return;
  }
  if (navigator.serviceWorker?.controller) {
    postToWorker({ type: 'ofx-notify', title, message, tag, href });
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const note = new Notification(title, { body: message, tag });
      note.onclick = () => { window.focus(); note.close(); };
    } catch { /* permission or platform block */ }
  }
}

function postToWorker(payload) {
  navigator.serviceWorker.controller?.postMessage(payload);
}
