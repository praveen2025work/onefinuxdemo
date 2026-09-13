import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../store.jsx';

const NAV = [
  { grp: 'Console', items: [
    { to: '/', label: 'Home', end: true },
    { to: '/board', label: 'Outcome board' },
    { to: '/outcomes', label: 'My outcomes', badge: 'assigned' },
  ] },
  { grp: 'Operate', items: [
    { to: '/operations', label: 'Operations', badge: 'esc' },
  ] },
  { grp: 'Explore', items: [
    { to: '/analyst', label: 'Analyst explorer' },
  ] },
  { grp: 'Build', items: [
    { to: '/onboarding', label: 'Onboarding' },
  ] },
];

function toggleTheme() {
  const el = document.documentElement;
  const next = el.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  el.setAttribute('data-theme', next);
  localStorage.setItem('ofx-theme', next);
}

export default function Layout({ children }) {
  const { context, filters, setFilters, instances, notifications, unread, live, toast, markRead } = useApp();
  const [bellOpen, setBellOpen] = useState(false);
  const navigate = useNavigate();

  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const esc = instances.reduce((n, i) => n + (i.openEscalations || 0), 0);
  const regions = context?.regions || [];
  const cobDates = context?.cobDates || [];
  const gu = context?.groupUnits?.find((g) => g.groupUnitId === filters.groupUnit);

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <div className="mark">1F</div>
          <div className="txt"><b>One Finance UX</b><span>Outcome platform</span></div>
        </div>
        <button className="scope">
          <div><span className="lbl">Group unit</span><span className="val">{gu?.name || filters.groupUnit || '—'}</span></div>
          <span>▾</span>
        </button>
        <nav>
          {NAV.map((section) => (
            <div key={section.grp}>
              <div className="nav-grp">{section.grp}</div>
              {section.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => 'nav-a' + (isActive ? ' on' : '')}>
                  <span className="txt">{it.label}</span>
                  {it.badge === 'assigned' && <span className="tag">{instances.length}</span>}
                  {it.badge === 'esc' && esc > 0 && <span className="tag fail">{esc}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="rail-user">
          <div className="avatar">PK</div>
          <div className="who"><b>Praveen Kumar</b><span>product:FOBO · {filters.region || 'all regions'}</span></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumb"><span className="live-dot" title="SSE" /> One Finance UX</div>
          <div className="spacer" />
          <label className="tb-btn" title="Business date (COB)">
            🗓
            <select value={filters.cobDate} onChange={(e) => setFilters({ cobDate: e.target.value })}>
              {cobDates.map((d) => <option key={d} value={d}>COB {d}</option>)}
            </select>
          </label>
          <label className="tb-btn" title="Region">
            <select value={filters.region} onChange={(e) => setFilters({ region: e.target.value })}>
              <option value="">All regions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <div className="bell-wrap">
            <button className="tb-btn" onClick={() => { setBellOpen((o) => !o); markRead(); }} title="Notifications">
              🔔{unread > 0 && <span className="dot-n">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="bell-menu">
                <div className="hd">Notifications <span className="muted">{notifications.length}</span></div>
                {notifications.length === 0 && <div className="empty">No notifications yet</div>}
                {notifications.map((n) => (
                  <div key={n.id} className={'noti ' + n.severity} onClick={() => { if (n.instanceId) { navigate('/instance/' + encodeURIComponent(n.instanceId)); setBellOpen(false); } }} style={{ cursor: n.instanceId ? 'pointer' : 'default' }}>
                    <div className="bar" />
                    <div>
                      <div className="ttl">{n.title}</div>
                      <div className="msg">{n.message}</div>
                      <div className="tm">{n.transition} · {n.createdAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="tb-btn" onClick={toggleTheme} title="Toggle theme">◐</button>
          <span className="env">UAT</span>
        </header>

        <div className="ctxbar">
          <span className="ctx"><span className="k">group_unit</span><span className="v">{filters.groupUnit}</span></span>
          <span className="ctx"><span className="k">cob</span><span className="v">{filters.cobDate || '—'}</span></span>
          <span className="ctx"><span className="k">region</span><span className="v">{filters.region || 'ALL'}</span></span>
          <span className="ctx"><span className="k">instances</span><span className="v">{instances.length}</span></span>
          <span className="ctx"><span className="k">ready</span><span className="v ok">{ready}</span></span>
          <span className="ctx"><span className="k">blocked</span><span className="v fail">{blocked}</span></span>
          <span className="ctx"><span className="k">live</span><span className="v">{live ? 'SSE connected' : 'offline'}</span></span>
        </div>

        <main className="body"><div className="wrap">{children}</div></main>
      </div>

      {toast && (
        <div className={'toast ' + toast.severity}>
          <div className="ttl">{toast.title}</div>
          {toast.message && <div className="msg">{toast.message}</div>}
        </div>
      )}
    </div>
  );
}
