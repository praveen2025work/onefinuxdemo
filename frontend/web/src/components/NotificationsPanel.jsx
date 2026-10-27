import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../store.jsx';
import { notificationKind, relativeTime } from '../lib/notifyState.js';

export const KIND_ICON = { approval: 'okcircle', rejection: 'failcircle', alert: 'warning', info: 'message' };

/**
 * STEPS slide-in notifications panel. It sits beside the page (the page narrows) rather than over it,
 * below the header and scope ribbon. Live: the hub pushes each notification over the WebSocket.
 * This is the inbox, not a toast stack — desktop cards stay outside the browser (notifyDesktop.js).
 */
export default function NotificationsPanel() {
  const { notifications, unread, isRead, markRead, markAllRead, refreshNotifications, notifPanelOpen, setNotifPanelOpen } = useApp();
  const navigate = useNavigate();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!notifPanelOpen) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    function onKey(e) { if (e.key === 'Escape') setNotifPanelOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => { clearInterval(t); document.removeEventListener('keydown', onKey); };
  }, [notifPanelOpen, setNotifPanelOpen]);

  function open(n) {
    markRead(n);
    if (n.instanceId) navigate('/instance/' + encodeURIComponent(n.instanceId));
  }

  return (
    <aside className={'npanel' + (notifPanelOpen ? ' open' : '')} aria-label="Notifications" aria-hidden={!notifPanelOpen} inert={notifPanelOpen ? undefined : ''}>
      <div className="np-inner">
        <div className="np-hd">
          <div className="np-ttl">
            <h3>Notifications</h3>
            <span className="np-badge">{notifications.length}</span>
            {unread > 0 && <span className="np-badge accent">{unread} unread</span>}
          </div>
          <div className="np-tools">
            <button type="button" className="np-ic" onClick={() => refreshNotifications().catch(() => {})} title="Refresh notifications">
              <Icon name="refresh" size={15} />
            </button>
            <button type="button" className="np-ic" onClick={() => setNotifPanelOpen(false)} title="Close">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        <div className="np-list">
          {notifications.length === 0 && (
            <div className="np-empty">
              <Icon name="bell" size={28} />
              <p>No notifications</p>
              <button type="button" className="btn ghost sm" onClick={() => refreshNotifications().catch(() => {})}>Refresh</button>
            </div>
          )}
          {notifications.map((n) => {
            const kind = notificationKind(n);
            const unreadRow = !isRead(n);
            return (
              <div key={n.id} className={'np-item ' + kind + (unreadRow ? ' unread' : '')}
                role="button" tabIndex={0} onClick={() => open(n)}
                onKeyDown={(e) => { if (e.key === 'Enter') open(n); }}>
                <span className="np-ico"><Icon name={KIND_ICON[kind]} size={16} /></span>
                <div className="np-body">
                  <div className="np-row">
                    <p className="np-t">{n.title}{unreadRow && <i className="np-dot" aria-label="Unread" />}</p>
                    <span className="np-time" title={new Date(n.createdAt).toLocaleString('en-GB')}>{relativeTime(n.createdAt)}</span>
                  </div>
                  <p className="np-msg">{n.message}</p>
                  <div className="np-meta">
                    <span className="mono">{[n.outcomeName, n.transition && String(n.transition).replaceAll('_', ' ')].filter(Boolean).join(' · ')}</span>
                    {unreadRow && (
                      <button type="button" className="np-mark" onClick={(e) => { e.stopPropagation(); markRead(n); }}>
                        <Icon name="check" size={12} /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="np-ft">
          <button type="button" className="btn ghost" onClick={markAllRead} disabled={unread === 0}>Mark all as read</button>
          <button type="button" className="btn" onClick={() => { navigate('/notifications'); setNotifPanelOpen(false); }}>View all notifications</button>
        </div>
      </div>
    </aside>
  );
}
