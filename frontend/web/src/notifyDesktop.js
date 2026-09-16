/**
 * Optional OS card (Chrome/Edge Action Center) — same corner and X as Outlook/GitLab
 * desktop notifications. In-page cards always show; this fires when the user has
 * allowed notifications so a card still appears if another window is focused.
 */
export function pushMonitorNotification(n) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'denied') return;
  const fire = () => {
    try {
      const note = new Notification(n.title || 'One Finance', {
        body: n.message || n.transition || '',
        tag: `ofx-${n.id || n.at || Date.now()}`,
      });
      note.onclick = () => {
        window.focus();
        note.close();
      };
    } catch {
      /* private mode / missing icon — in-page card still shows */
    }
  };
  if (Notification.permission === 'granted') {
    fire();
    return;
  }
  Notification.requestPermission().then((p) => {
    if (p === 'granted') fire();
  });
}
