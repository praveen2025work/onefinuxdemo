/**
 * Browser/OS card only when this tab is still loaded but not visible (another
 * window or tab is in front). While the One Finance tab is active, the in-page
 * card is enough — we do not prompt for notification permission on the page.
 */
export function pushMonitorNotification(n) {
  if (typeof Notification === 'undefined') return;
  if (!document.hidden) return;
  if (Notification.permission !== 'granted') return;
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
    /* in-page card still shows when the tab is focused again */
  }
}
