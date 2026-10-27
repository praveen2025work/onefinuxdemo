import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHeader, Stat } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { KIND_ICON } from '../components/NotificationsPanel.jsx';
import { KIND_LABEL, filterNotifications, idOf, notificationKind, relativeTime } from '../lib/notifyState.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'approval', label: 'Approvals' },
  { id: 'rejection', label: 'Rejections' },
  { id: 'alert', label: 'Alerts' },
  { id: 'info', label: 'Information' },
];

/** STEPS NotificationsCenter on the hub inbox: tabs, search, expand, mark read, dismiss. */
export default function Notifications() {
  const { notifications, unread, isRead, markRead, markAllRead, dismissNotification, refreshNotifications, liveStatus } = useApp();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus');
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(() => focus || null);
  const appliedFocusRef = useRef(null);

  useEffect(() => {
    if (!focus || appliedFocusRef.current === focus) return;
    if (notifications.some((n) => idOf(n) === focus)) {
      appliedFocusRef.current = focus;
      setOpen(focus);
    }
  }, [focus, notifications]);

  const readIds = useMemo(() => new Set(notifications.filter((n) => isRead(n)).map(idOf)), [notifications, isRead]);
  const rows = filterNotifications(notifications, { tab, query, readIds });
  const byKind = notifications.reduce((acc, n) => { const k = notificationKind(n); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  return (
    <>
      <PageHeader icon="bell" title="Notifications" infoTitle="One inbox, many channels"
        context={`Inbox · pushed live over ${liveStatus.transport === 'sse' ? 'SSE' : 'WebSocket'}`}
        info={<>
          The hub persists each notifiable outcome transition once, then fans it out: this inbox (pushed over
          <span className="mono"> /api/ws</span>), desktop cards, e-mail and webhooks. Read and dismissed state is
          kept in this browser — the hub record never changes.
        </>}>
        <button className="btn ghost" onClick={() => refreshNotifications().catch(() => {})}><Icon name="refresh" size={15} /> Refresh</button>
        <button className="btn" onClick={markAllRead} disabled={!unread}><Icon name="checks" size={15} /> Mark all read</button>
      </PageHeader>

      <div className="stats">
        <Stat tone="info" icon="bell" label="Unread" value={unread} />
        <Stat tone="ok" icon="okcircle" label="Approvals" value={byKind.approval || 0} />
        <Stat tone="fail" icon="failcircle" label="Rejections" value={byKind.rejection || 0} />
        <Stat tone="warn" icon="warning" label="Alerts" value={byKind.alert || 0} />
      </div>

      <div className="panel">
        <div className="panel-hd notif-tools">
          <div className="seg">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <label className="search-inp">
            <Icon name="search" size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, message, outcome…" aria-label="Search notifications" />
          </label>
        </div>
        <div className="panel-bd notif-list">
          {rows.length === 0 && <div className="empty">No notifications match.</div>}
          {rows.map((n) => {
            const kind = notificationKind(n);
            const unreadRow = !isRead(n);
            const expanded = open === idOf(n);
            return (
              <article key={n.id} className={'notif-card ' + kind + (unreadRow ? ' unread' : '')}>
                <span className="np-ico"><Icon name={KIND_ICON[kind]} size={18} /></span>
                <div className="notif-main">
                  <div className="notif-top">
                    <h4>{n.title}</h4>
                    <span className={'pill ' + ({ approval: 'ok', rejection: 'fail', alert: 'warn', info: 'info' })[kind]}>{KIND_LABEL[kind]}</span>
                    {unreadRow && <i className="np-dot" aria-label="Unread" />}
                    <span className="notif-time" title={new Date(n.createdAt).toLocaleString('en-GB')}>{relativeTime(n.createdAt)}</span>
                  </div>
                  <div className="notif-who">
                    <span className="avatar xs">{String(n.outcomeName || 'OF').slice(0, 2).toUpperCase()}</span>
                    <span>{n.outcomeName || 'One Finance'}</span>
                    {n.transition && <span className="chip">{String(n.transition).replaceAll('_', ' ')}</span>}
                    {n.channels && <span className="sec">via {n.channels}</span>}
                    {n.source === 'external' && <span className="chip">external socket</span>}
                  </div>
                  <p className={'notif-msg' + (expanded ? ' open' : '')}>{n.message}</p>
                </div>
                <div className="notif-acts">
                  <button className="np-ic" title={expanded ? 'Collapse' : 'Expand'}
                    onClick={() => { setOpen(expanded ? null : idOf(n)); if (unreadRow) markRead(n); }}>
                    <Icon name="eye" size={15} />
                  </button>
                  {unreadRow && (
                    <button className="np-ic" title="Mark as read" onClick={() => markRead(n)}><Icon name="check" size={15} /></button>
                  )}
                  <button className="np-ic" title="Dismiss in this browser" onClick={() => dismissNotification(n)}><Icon name="trash" size={15} /></button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
