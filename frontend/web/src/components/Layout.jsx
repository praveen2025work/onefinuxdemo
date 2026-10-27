import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  { grp: 'Collaborate', items: [
    { to: '/desks', label: 'Desks', short: 'Desks', icon: 'window' },
    { to: '/notifications', label: 'Notifications', short: 'Alerts', icon: 'bell', badge: 'unread' },
    { to: '/grids', label: 'Grid library', short: 'Grids', icon: 'grid' },
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
  if (EMBED) return <EmbedShell>{children}</EmbedShell>;
  return <Shell>{children}</Shell>;
}

function Shell({ children }) {
  const { context, filters, setFilters, instances, unread, live, liveStatus, desktopAlerts, allowDesktopAlerts, view, setView,
    notifPanelOpen, toggleNotifPanel, setNotifPanelOpen, refreshAll } = useApp();
  const nav = filterNav(NAV, view);
  // STEPS left panel: hidden by default so the page gets the full width; a tab on the left edge opens it
  // over the content, and an outside click, Escape or a navigation closes it again.
  const [railOpen, setRailOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { canInstall, standalone, install } = useInstallPrompt();

  useEffect(() => { setRailOpen(false); }, [location.pathname]);
  useEffect(() => { if (location.pathname === '/notifications') setNotifPanelOpen(false); }, [location.pathname, setNotifPanelOpen]);

  function toggleRail() {
    setRailOpen((o) => !o);
  }

  function openBoard(status) {
    setFilters({ status });
    navigate('/board');
  }

  async function onRefresh() {
    setSpinning(true);
    try { await refreshAll(); } finally { setSpinning(false); }
  }

  useEffect(() => {
    if (!railOpen) return undefined;
    function onKey(e) { if (e.key === 'Escape') setRailOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [railOpen]);

  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const esc = instances.reduce((n, i) => n + (i.openEscalations || 0), 0);
  const regions = context?.regions || [];
  const groupUnits = context?.groupUnits || [];

  const railItems = nav.flatMap((section) => section.items);
  const bottomPref = ['/', '/board', '/finance', '/desks', '/reports'];
  const bottomPicked = bottomPref.map((to) => railItems.find((it) => it.to === to)).filter(Boolean);
  const bottomItems = bottomPicked.length >= 3 ? bottomPicked.slice(0, 5) : railItems.slice(0, 5);

  return (
    <div className={'app' + (railOpen ? ' rail-open' : '') + (notifPanelOpen ? ' notif-open' : '')}>
      <div className="rail-scrim" onClick={() => setRailOpen(false)} aria-hidden={!railOpen} />
      {!railOpen && (
        <button type="button" className="rail-tab" onClick={() => setRailOpen(true)} title="Open menu" aria-label="Open menu">
          <Icon name="right" size={15} />
        </button>
      )}
      <aside className="rail" aria-hidden={!railOpen}>
        <div className="rail-top">
          <div className="brand">
            <BrandMark size={32} />
            <div className="txt"><b>One Finance</b><span>Outcome platform</span></div>
          </div>
          <button className="rail-toggle" onClick={() => setRailOpen(false)} title="Close menu" aria-label="Close menu">
            <Icon name="chevron" size={16} />
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
        {/* One compact row: scope (the stitch keys) and fold counts on the left, icons on the right. Details live in
            tooltips and menus, so the page keeps its height for content. */}
        <header className="topbar">
          <button className="rail-toggle solo" onClick={toggleRail} title="Open menu" aria-label="Open menu">
            <Icon name="menu" size={16} />
          </button>
          <div className="brand top-brand" title="One Finance · Outcome platform">
            <BrandMark size={26} />
            <b className="txt">One Finance</b>
          </div>
          <div className="tb-scope" aria-label="Current scope">
            <DatePicker value={filters.cobDate} cobDates={context?.cobDates} onChange={(v) => setFilters({ cobDate: v })} />
            <Select variant="header" icon="tower" title="Group unit" value={filters.groupUnit}
              onChange={(v) => setFilters({ groupUnit: v })}
              options={groupUnits.length ? groupUnits.map((g) => ({ value: g.groupUnitId, label: g.name }))
                : [{ value: filters.groupUnit, label: filters.groupUnit }]} />
            <Select variant="header" icon="globe" title="Region" value={filters.region} onChange={(v) => setFilters({ region: v })}
              options={[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
            <div className="tb-counts" role="group" aria-label={`${instances.length} instances`}>
              <button type="button" className={'tb-count' + (ready ? ' ok' : '')} onClick={() => openBoard('READY')}
                title={`${ready} ready of ${instances.length} instances — open on the board`}>
                <i className="ctx-dot" />{ready}<span className="tb-count-k">ready</span>
              </button>
              <button type="button" className={'tb-count' + (blocked ? ' fail' : '')} onClick={() => openBoard('BLOCKED')}
                title={`${blocked} blocked — open on the board`}>
                <i className="ctx-dot" />{blocked}<span className="tb-count-k">blocked</span>
              </button>
              <button type="button" className={'tb-count' + (esc ? ' warn' : '')} onClick={() => navigate('/operations')}
                title={`${esc} open escalations — open Operations`}>
                <i className="ctx-dot" />{esc}<span className="tb-count-k">esc</span>
              </button>
            </div>
          </div>
          <div className="spacer" />
          <div className="tb-icons">
            <Select variant="icon" icon={view.icon || 'grid'} value={view.id} onChange={setView}
              title={`View: ${view.label} — filters the menu for this session. Not entitlement.`}
              options={VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
            {canInstall && !standalone && (
              <button className="tb-icon" type="button" onClick={install} title="Install One Finance as a desktop app (PWA)" aria-label="Install app">
                <Icon name="install" size={16} />
              </button>
            )}
            {desktopAlerts === 'denied' && (
              <span className="tb-icon muted-ic" role="img" title="Desktop alerts blocked — allow One Finance in the browser site settings to restore desktop cards"
                aria-label="Desktop alerts blocked">
                <Icon name="bell" size={16} /><i className="tb-slash" aria-hidden />
              </span>
            )}
            {desktopAlerts !== 'granted' && desktopAlerts !== 'unsupported' && desktopAlerts !== 'denied' && (
              <button className="tb-icon" type="button" onClick={allowDesktopAlerts} aria-label="Desktop alerts"
                title="Desktop alerts: show READY and BLOCKED as desktop cards, outside this window">
                <Icon name="message" size={16} />
              </button>
            )}
            <ThemeMenu />
            <button className={'tb-icon' + (notifPanelOpen ? ' on' : '')} onClick={toggleNotifPanel} title="Notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={notifPanelOpen}>
              <Icon name="bell" size={17} />
              {unread > 0 && <span className="dot-n">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <button className="tb-icon" onClick={onRefresh} title="Refresh data" aria-label="Refresh data">
              <Icon name="refresh" size={16} className={spinning ? 'spin-ic' : ''} />
            </button>
            <ProfileMenu />
            <span className="env" title={`UAT · ${live ? `live over ${liveStatus.transport === 'ws' ? 'WebSocket' : 'SSE'} (${liveStatus.role})` : 'reconnecting…'}`}>
              <span className={'live-dot' + (live ? '' : ' off')} />UAT
            </span>
          </div>
        </header>

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
