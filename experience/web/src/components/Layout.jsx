import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../store.jsx';
import Icon, { BrandMark } from './Icon.jsx';
import Select from './Select.jsx';

const NAV = [
  { grp: 'Console', items: [
    { to: '/', label: 'Home', icon: 'home', end: true },
    { to: '/board', label: 'Outcome board', icon: 'board' },
    { to: '/outcomes', label: 'My outcomes', icon: 'cards', badge: 'assigned' },
  ] },
  { grp: 'Operate', items: [
    { to: '/operations', label: 'Operations', icon: 'ops', badge: 'esc' },
  ] },
  { grp: 'Explore', items: [
    { to: '/analyst', label: 'Analyst explorer', icon: 'grid' },
  ] },
  { grp: 'Build', items: [
    { to: '/onboarding', label: 'Onboarding', icon: 'build' },
    { to: '/configuration', label: 'Configuration', icon: 'config' },
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ofx-rail') === '1');
  const navigate = useNavigate();

  function toggleRail() {
    setCollapsed((c) => { localStorage.setItem('ofx-rail', c ? '0' : '1'); return !c; });
  }

  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const esc = instances.reduce((n, i) => n + (i.openEscalations || 0), 0);
  const regions = context?.regions || [];
  const groupUnits = context?.groupUnits || [];

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <aside className="rail">
        <div className="rail-top">
          <div className="brand">
            <BrandMark size={collapsed ? 30 : 32} />
            <div className="txt"><b>One Finance UX</b><span>Outcome platform</span></div>
          </div>
          <button className="rail-toggle" onClick={toggleRail} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
            <Icon name="chevron" size={16} className={collapsed ? 'flip' : ''} />
          </button>
        </div>
        <nav className="rail-nav">
          {NAV.map((section) => (
            <div key={section.grp} className="nav-sec">
              <div className="nav-grp">{section.grp}</div>
              {section.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} title={it.label}
                  className={({ isActive }) => 'nav-a' + (isActive ? ' on' : '')}>
                  <Icon name={it.icon} size={18} />
                  <span className="txt">{it.label}</span>
                  {it.badge === 'assigned' && instances.length > 0 && <span className="tag">{instances.length}</span>}
                  {it.badge === 'esc' && esc > 0 && <span className="tag fail">{esc}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="rail-user">
          <div className="avatar">PK</div>
          <div className="who txt"><b>Praveen Kumar</b><span>product:FOBO · {filters.region || 'all regions'}</span></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="rail-toggle solo" onClick={toggleRail} title="Toggle menu"><Icon name="chevron" size={16} className={collapsed ? 'flip' : ''} /></button>
          <Select variant="header" caption="Group unit" value={filters.groupUnit}
            onChange={(v) => setFilters({ groupUnit: v })}
            options={groupUnits.length ? groupUnits.map((g) => ({ value: g.groupUnitId, label: g.name }))
              : [{ value: filters.groupUnit, label: filters.groupUnit }]} />
          <div className="spacer" />
          <label className="tb-btn cal" title="Business date (COB)">
            <Icon name="calendar" size={15} />
            <input type="date" value={filters.cobDate || ''} onChange={(e) => setFilters({ cobDate: e.target.value })} />
          </label>
          <Select variant="plain" value={filters.region} onChange={(v) => setFilters({ region: v })}
            options={[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
          <div className="bell-wrap">
            <button className="tb-icon" onClick={() => { setBellOpen((o) => !o); markRead(); }} title="Notifications">
              <Icon name="bell" size={18} />
              {unread > 0 && <span className="dot-n">{unread}</span>}
            </button>
            {bellOpen && (
              <div className="bell-menu">
                <div className="hd">Notifications <span className="muted">{notifications.length}</span></div>
                {notifications.length === 0 && <div className="empty">No notifications yet</div>}
                {notifications.map((n) => (
                  <div key={n.id} className={'noti ' + n.severity}
                    onClick={() => { if (n.instanceId) { navigate('/instance/' + encodeURIComponent(n.instanceId)); setBellOpen(false); } }}
                    style={{ cursor: n.instanceId ? 'pointer' : 'default' }}>
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
          <button className="tb-icon" onClick={toggleTheme} title="Toggle theme"><span className="theme-dot" /></button>
          <span className="live-pill"><span className={'live-dot' + (live ? '' : ' off')} />{live ? 'live' : 'offline'}</span>
          <span className="env">UAT</span>
        </header>

        <div className="ctxbar">
          <span className="ctx"><span className="k">group_unit</span><span className="v">{filters.groupUnit}</span></span>
          <span className="ctx"><span className="k">cob</span><span className="v">{filters.cobDate || '—'}</span></span>
          <span className="ctx"><span className="k">region</span><span className="v">{filters.region || 'ALL'}</span></span>
          <span className="ctx"><span className="k">instances</span><span className="v">{instances.length}</span></span>
          <span className="ctx"><span className="k">ready</span><span className="v ok">{ready}</span></span>
          <span className="ctx"><span className="k">blocked</span><span className="v fail">{blocked}</span></span>
          <span className="ctx"><span className="k">escalations</span><span className="v">{esc}</span></span>
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
