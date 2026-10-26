import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import Icon, { BrandMark } from './Icon.jsx';
import Select from './Select.jsx';
import DatePicker from './DatePicker.jsx';
import ThemeMenu from './ThemeMenu.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import EmbedShell from '../workspace/EmbedShell.jsx';
import { VIEWS, filterNav } from '../views.js';
import { EMBED } from '../embed.js';
import { useInstallPrompt } from '../pwa.js';

const NAV = [
  { grp: 'Console', items: [
    { to: '/', label: 'Home', short: 'Home', icon: 'home', end: true },
    { to: '/board', label: 'Outcome board', short: 'Board', icon: 'board' },
    { to: '/outcomes', label: 'My outcomes', short: 'Outcomes', icon: 'cards', badge: 'assigned' },
    { to: '/finance', label: 'Finance dashboard', short: 'Finance', icon: 'dollar' },
    { to: '/reports', label: 'Reports', short: 'Reports', icon: 'report' },
  ] },
  { grp: 'Workspace', items: [
    { to: '/workspace', label: 'Workspace', short: 'Workspace', icon: 'window' },
    { to: '/notifications', label: 'Notifications', short: 'Alerts', icon: 'bell', badge: 'unread' },
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

const EXTRA_TITLES = [
  ['/instance/', 'Instance detail'],
  ['/reports/', 'Report'],
];

function pageTitle(pathname) {
  for (const section of NAV) {
    const hit = section.items.find((it) => (it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + '/')));
    if (hit) return hit.label;
  }
  const extra = EXTRA_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return extra ? extra[1] : 'One Finance';
}

export default function Layout({ children }) {
  if (EMBED) return <EmbedShell>{children}</EmbedShell>;
  return <Shell>{children}</Shell>;
}

function Shell({ children }) {
  const { context, filters, setFilters, instances, unread, live, liveStatus, desktopAlerts, allowDesktopAlerts, view, setView,
    notifPanelOpen, toggleNotifPanel, setNotifPanelOpen, refreshAll } = useApp();
  const nav = filterNav(NAV, view);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ofx-rail') === '1');
  const [drawer, setDrawer] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const location = useLocation();
  const { canInstall, standalone, install } = useInstallPrompt();

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => { if (location.pathname === '/notifications') setNotifPanelOpen(false); }, [location.pathname, setNotifPanelOpen]);

  function toggleRail() {
    if (window.matchMedia('(max-width: 820px)').matches) {
      setDrawer((d) => !d);
      return;
    }
    setCollapsed((c) => { localStorage.setItem('ofx-rail', c ? '0' : '1'); return !c; });
  }

  async function onRefresh() {
    setSpinning(true);
    try { await refreshAll(); } finally { setSpinning(false); }
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
  const bottomPref = ['/', '/board', '/finance', '/workspace', '/reports'];
  const bottomPicked = bottomPref.map((to) => railItems.find((it) => it.to === to)).filter(Boolean);
  const bottomItems = bottomPicked.length >= 3 ? bottomPicked.slice(0, 5) : railItems.slice(0, 5);

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '') + (drawer ? ' drawer-open' : '') + (notifPanelOpen ? ' notif-open' : '')}>
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
                  {it.badge === 'unread' && unread > 0 && <span className="tag fail">{unread}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
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
          <h1 className="tb-title">{pageTitle(location.pathname)}</h1>
          <DatePicker caption="Business date" value={filters.cobDate} cobDates={context?.cobDates}
            onChange={(v) => setFilters({ cobDate: v })} />
          <Select variant="header" caption="Group unit" value={filters.groupUnit}
            onChange={(v) => setFilters({ groupUnit: v })}
            options={groupUnits.length ? groupUnits.map((g) => ({ value: g.groupUnitId, label: g.name }))
              : [{ value: filters.groupUnit, label: filters.groupUnit }]} />
          <div className="spacer" />
          <div className="tb-filters">
            <Select variant="plain" value={filters.region} onChange={(v) => setFilters({ region: v })}
              options={[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
            <Select variant="header" caption="View" icon={view.icon || 'grid'} value={view.id} onChange={setView}
              title="Filters the left rail for this session. Not entitlement."
              options={VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
          </div>
          {canInstall && !standalone && (
            <button className="desk-chip" type="button" onClick={install} title="Install One Finance as a desktop app (PWA)">
              <Icon name="install" size={13} /> Install app
            </button>
          )}
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
          <ThemeMenu />
          <span className="tb-sep" aria-hidden />
          <button className={'tb-icon' + (notifPanelOpen ? ' on' : '')} onClick={toggleNotifPanel} title="Notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={notifPanelOpen}>
            <Icon name="bell" size={18} />
            {unread > 0 && <span className="dot-n">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button className="tb-icon" onClick={onRefresh} title="Refresh data" aria-label="Refresh data">
            <Icon name="refresh" size={16} className={spinning ? 'spin-ic' : ''} />
          </button>
          <ProfileMenu />
          <span className="live-pill" title={live ? `Live over ${liveStatus.transport === 'ws' ? 'WebSocket' : 'SSE'} (${liveStatus.role})` : 'Reconnecting…'}>
            <span className={'live-dot' + (live ? '' : ' off')} />{live ? `live · ${liveStatus.transport}` : 'offline'}
          </span>
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

        <div className="main-row">
          <main className="body"><div className="wrap">{children}</div></main>
          <NotificationsPanel />
        </div>
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
