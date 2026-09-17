import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { listActors, setActor, currentActor, actorLabel } from '../api';
import Icon, { BrandMark } from './Icon.jsx';
import Select from './Select.jsx';
import DatePicker from './DatePicker.jsx';
import { VIEWS, filterNav } from '../views.js';

const NAV = [
  { grp: 'Console', items: [
    { to: '/', label: 'Home', short: 'Home', icon: 'home', end: true },
    { to: '/board', label: 'Outcome board', short: 'Board', icon: 'board' },
    { to: '/outcomes', label: 'My outcomes', short: 'Outcomes', icon: 'cards', badge: 'assigned' },
    { to: '/reports', label: 'Reports', short: 'Reports', icon: 'report' },
  ] },
  { grp: 'Operate', items: [
    { to: '/operations', label: 'Operations', short: 'Ops', icon: 'ops', badge: 'esc' },
  ] },
  { grp: 'Observe', items: [
    { to: '/monitoring', label: 'Monitoring', short: 'Monitor', icon: 'activity' },
  ] },
  { grp: 'Build', items: [
    { to: '/onboarding', label: 'Onboarding', short: 'Onboard', icon: 'build' },
    { to: '/configuration', label: 'Configuration', short: 'Config', icon: 'config' },
  ] },
  { grp: 'Testing', items: [
    { to: '/drive', label: 'Drive scenarios', short: 'Drive', icon: 'bolt' },
  ] },
  { grp: 'Guide', items: [
    { to: '/product', label: 'Product', short: 'Product', icon: 'book' },
    { to: '/architecture', label: 'Architecture', short: 'Arch', icon: 'compass' },
    { to: '/guide', label: 'Developer guide', short: 'Guide', icon: 'code' },
    { to: '/lifecycle', label: 'Event lifecycle', short: 'Lifecycle', icon: 'inbox' },
  ] },
];

export default function Layout({ children }) {
  const { context, filters, setFilters, instances, notifications, unread, live, desktopAlerts, allowDesktopAlerts, markRead, view, setView, refreshInstances } = useApp();
  const nav = filterNav(NAV, view);
  const [bellOpen, setBellOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ofx-rail') === '1');
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'));
  const [actor, setActorState] = useState(() => currentActor());
  const [actors, setActors] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const bellRef = useRef(null);

  // Close the notifications panel on outside click, Escape, or window blur so it never stays stuck open.
  useEffect(() => {
    if (!bellOpen) return undefined;
    function onDoc(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setBellOpen(false); }
    const close = () => setBellOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  }, [bellOpen]);

  useEffect(() => { listActors().then(setActors).catch(() => setActors([])); }, []);

  useEffect(() => { setBellOpen(false); setDrawer(false); }, [location.pathname]);

  async function onActor(user) {
    await setActor(user);
    setActorState(user);
    refreshInstances();
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ofx-theme', next);
    setTheme(next);
  }

  function toggleRail() {
    if (window.matchMedia('(max-width: 820px)').matches) {
      setDrawer((d) => !d);
      return;
    }
    setCollapsed((c) => { localStorage.setItem('ofx-rail', c ? '0' : '1'); return !c; });
  }

  useEffect(() => {
    if (!drawer) return undefined;
    function onKey(e) { if (e.key === 'Escape') setDrawer(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const esc = instances.reduce((n, i) => n + (i.openEscalations || 0), 0);
  const regions = context?.regions || [];
  const groupUnits = context?.groupUnits || [];

  const railItems = nav.flatMap((section) => section.items);
  const bottomPref = ['/', '/board', '/reports', '/product', '/guide'];
  const bottomPicked = bottomPref.map((to) => railItems.find((it) => it.to === to)).filter(Boolean);
  const bottomItems = bottomPicked.length >= 3 ? bottomPicked.slice(0, 5) : railItems.slice(0, 5);

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (drawer ? ' drawer-open' : '')}>
      <div className="rail-scrim" onClick={() => setDrawer(false)} aria-hidden={!drawer} />
      <aside className="rail">
        <div className="rail-top">
          <div className="brand">
            <BrandMark size={collapsed ? 30 : 32} />
            <div className="txt"><b>One Finance</b><span>Outcome platform</span></div>
          </div>
          <button className="rail-toggle" onClick={toggleRail} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
            <Icon name="chevron" size={16} className={collapsed ? 'flip' : ''} />
          </button>
        </div>
        <nav className="rail-nav">
          {nav.map((section) => (
            <div key={section.grp} className={'nav-sec' + (section.grp === 'Guide' ? ' nav-guide' : '')}>
              <div className="nav-grp">{section.grp}</div>
              {section.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} title={it.label}
                  className={({ isActive }) => 'nav-a' + (isActive ? ' on' : '')}>
                  <Icon name={it.icon} size={19} />
                  <span className="txt">{it.label}</span>
                  {it.badge === 'assigned' && instances.length > 0 && <span className="tag">{instances.length}</span>}
                  {it.badge === 'esc' && esc > 0 && <span className="tag fail">{esc}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="rail-user">
          <div className="avatar">{(actorLabel(actor) || 'PK').slice(0, 2).toUpperCase()}</div>
          <div className="who txt"><b>{actorLabel(actor)}</b><span>{actor} · {filters.region || 'all regions'}</span></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="rail-toggle solo" onClick={toggleRail} title="Open menu" aria-label="Open menu">
            <Icon name="menu" size={16} />
          </button>
          <div className="brand top-brand">
            <BrandMark size={28} />
            <div className="txt"><b>One Finance</b><span>Outcome platform</span></div>
          </div>
          <Select variant="header" caption="Group unit" value={filters.groupUnit}
            onChange={(v) => setFilters({ groupUnit: v })}
            options={groupUnits.length ? groupUnits.map((g) => ({ value: g.groupUnitId, label: g.name }))
              : [{ value: filters.groupUnit, label: filters.groupUnit }]} />
          <div className="spacer" />
          <div className="tb-filters">
            <DatePicker value={filters.cobDate} cobDates={context?.cobDates}
              onChange={(v) => setFilters({ cobDate: v })} />
            <Select variant="plain" value={filters.region} onChange={(v) => setFilters({ region: v })}
              options={[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
            <Select variant="header" caption="View" icon={view.icon || 'grid'} value={view.id} onChange={setView}
              title="Filters the left rail for this session. Not entitlement."
              options={VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
            <Select variant="header" caption="Act as" icon="cards" value={actor} onChange={onActor}
              title="Demo identity for dual sign-off. Mints a Bearer token."
              options={(actors.length ? actors : [{ user: actor }]).map((u) => ({
                value: u.user || u,
                label: actorLabel(u.user || u),
              }))} />
          </div>
          {desktopAlerts === 'denied' && (
            <span className="desk-chip blocked" title="Allow One Finance in the browser site settings to restore desktop cards">
              Alerts blocked
            </span>
          )}
          {desktopAlerts !== 'granted' && desktopAlerts !== 'unsupported' && desktopAlerts !== 'denied' && (
            <button className="desk-chip" type="button" onClick={allowDesktopAlerts}
              title="Show READY and BLOCKED as desktop cards, outside this window">
              Desktop alerts
            </button>
          )}
          <div className="bell-wrap" ref={bellRef}>
            <button className="tb-icon" onClick={() => { setBellOpen((o) => !o); markRead(); }} title="Notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={bellOpen}>
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
          <button className="tb-icon" onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
          </button>
          <span className="live-pill"><span className={'live-dot' + (live ? '' : ' off')} />{live ? 'live' : 'offline'}</span>
          <span className="env">UAT</span>
        </header>

        <div className="ctxbar" aria-label="Current scope">
          <div className="ctx-grp">
            <span className="ctx"><span className="k">group_unit</span><span className="v">{filters.groupUnit}</span></span>
            <span className="ctx"><span className="k">cob</span><span className="v">{filters.cobDate || '—'}</span></span>
            <span className="ctx"><span className="k">region</span><span className="v">{filters.region || 'ALL'}</span></span>
            <span className="ctx"><span className="k">view</span><span className="v">{view.label}</span></span>
          </div>
          <div className="ctx-grp">
            <span className="ctx"><span className="k">instances</span><span className="v">{instances.length}</span></span>
            <span className="ctx"><i className={'ctx-dot' + (ready ? ' ok' : '')} /><span className="k">ready</span><span className="v">{ready}</span></span>
            <span className="ctx"><i className={'ctx-dot' + (blocked ? ' fail' : '')} /><span className="k">blocked</span><span className="v">{blocked}</span></span>
            <span className="ctx"><i className={'ctx-dot' + (esc ? ' warn' : '')} /><span className="k">escalations</span><span className="v">{esc}</span></span>
          </div>
        </div>

        <main className="body"><div className="wrap">{children}</div></main>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {bottomItems.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            <Icon name={it.icon} size={20} />
            <span>{it.short || it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
