import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../store.jsx';
import Icon, { BrandMark } from './Icon.jsx';
import DatePicker from './DatePicker.jsx';
import ThemeMenu from './ThemeMenu.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import ShellSearch from './ShellSearch.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import AssistantPanel from './AssistantPanel.jsx';
import FeedbackDialog from './FeedbackDialog.jsx';
import { telemetry, trackOpen } from '../ux/track.js';
import EmbedShell from '../workspace/EmbedShell.jsx';
import { filterNav } from '../views.js';
import { NAV } from '../nav.js';
import { EMBED } from '../embed.js';
import { useInstallPrompt } from '../pwa.js';
import { PageChromeProvider, usePageChrome } from '../chrome/PageChrome.jsx';
import { resolveTopTitle } from '../chrome/pageChrome.js';


export default function Layout({ children }) {
  if (EMBED) return <EmbedShell>{children}</EmbedShell>;
  return <PageChromeProvider><Shell>{children}</Shell></PageChromeProvider>;
}

function Shell({ children }) {
  const { context, filters, setFilters, instances, unread, live, liveStatus, desktopAlerts, allowDesktopAlerts, view,
    notifPanelOpen, toggleNotifPanel, setNotifPanelOpen, refreshAll } = useApp();
  const nav = filterNav(NAV, view);
  // STEPS left panel: hidden by default so the page gets the full width; a tab on the left edge opens it
  // over the content, and an outside click, Escape or a navigation closes it again.
  const [railOpen, setRailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [assist, setAssist] = useState({ open: false, seed: null });
  const [feedback, setFeedback] = useState({ open: false, category: null });
  const location = useLocation();
  const navigate = useNavigate();
  const { canInstall, standalone, install } = useInstallPrompt();
  const { chrome } = usePageChrome();
  const page = resolveTopTitle(chrome, location.pathname);

  useEffect(() => { setRailOpen(false); }, [location.pathname]);
  useEffect(() => { trackOpen(location.pathname); }, [location.pathname]);
  useEffect(() => { telemetry.setTeam(filters.groupUnit); }, [filters.groupUnit]);
  // Any screen can open the assistant (with a question) or the feedback dialog through ux/bus.js.
  useEffect(() => {
    const onAssist = (e) => { setNotifPanelOpen(false); setSettingsOpen(false); setAssist({ open: true, seed: e.detail?.question ? { question: e.detail.question } : null }); };
    const onFeedback = (e) => setFeedback({ open: true, category: e.detail?.category || null });
    window.addEventListener('ofx-assist', onAssist);
    window.addEventListener('ofx-feedback', onFeedback);
    return () => { window.removeEventListener('ofx-assist', onAssist); window.removeEventListener('ofx-feedback', onFeedback); };
  }, [setNotifPanelOpen]);
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

  function openSettings() {
    setNotifPanelOpen(false);
    setAssist((a) => ({ ...a, open: false }));
    setSettingsOpen(true);
  }

  function toggleAssist() {
    setNotifPanelOpen(false);
    setSettingsOpen(false);
    setAssist((a) => ({ open: !a.open, seed: null }));
  }

  const railItems = nav.flatMap((section) => section.items);
  const bottomPref = ['/', '/board', '/finance', '/desks', '/reports'];
  const bottomPicked = bottomPref.map((to) => railItems.find((it) => it.to === to)).filter(Boolean);
  const bottomItems = bottomPicked.length >= 3 ? bottomPicked.slice(0, 5) : railItems.slice(0, 5);

  return (
    <div className={'app' + (railOpen ? ' rail-open' : '') + (notifPanelOpen || assist.open || settingsOpen ? ' notif-open' : '')}>
      <div className="rail-scrim" onClick={() => setRailOpen(false)} aria-hidden={!railOpen} />
      {!railOpen && (
        <button type="button" className="rail-tab" onClick={() => setRailOpen(true)} title="Open menu" aria-label="Open menu">
          <Icon name="right" size={15} />
        </button>
      )}
      <aside className="rail" aria-hidden={!railOpen} inert={railOpen ? undefined : ''}>
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
        {/* One compact row: brand + page label + fold counts + search on the left; business date and icons on the right. */}
        <header className="topbar">
          <button className="rail-toggle solo" onClick={toggleRail} title="Open menu" aria-label="Open menu">
            <Icon name="menu" size={16} />
          </button>
          <div className="brand top-brand" title={`One Finance · UAT · ${live ? `live over ${liveStatus.transport === 'ws' ? 'WebSocket' : 'SSE'} (${liveStatus.role})` : 'reconnecting…'}`}>
            <BrandMark size={32} />
            <span className="brand-copy">
              <b className="txt">One Finance</b>
              <span className="env"><span className={'live-dot' + (live ? '' : ' off')} />UAT</span>
            </span>
          </div>
          {page && (
            <div className="tb-page" title={[page.title, page.context].filter(Boolean).join(' · ')}>
              {page.icon && <span className="tb-page-ico" aria-hidden><Icon name={page.icon} size={15} /></span>}
              <h1 className="tb-page-title">{page.title}</h1>
            </div>
          )}
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
          <ShellSearch />
          <div className="spacer" />
          <div className="tb-date" aria-label="Business date">
            <DatePicker value={filters.cobDate} cobDates={context?.cobDates} onChange={(v) => setFilters({ cobDate: v })} />
          </div>
          <div className="tb-icons">
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
            <button type="button" className={'tb-icon' + (assist.open ? ' on' : '')} onClick={toggleAssist}
              title="Assistant — ask about your close" aria-label="Assistant" aria-expanded={assist.open}>
              <Icon name="spark" size={16} />
            </button>
            <ThemeMenu />
            <button className={'tb-icon' + (notifPanelOpen ? ' on' : '')} onClick={() => { setSettingsOpen(false); setAssist((a) => ({ ...a, open: false })); toggleNotifPanel(); }} title="Notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={notifPanelOpen}>
              <Icon name="bell" size={16} />
              {unread > 0 && <span className="dot-n">{unread > 99 ? '99+' : unread}</span>}
            </button>
            <button className="tb-icon" onClick={onRefresh} title="Refresh data" aria-label="Refresh data">
              <Icon name="refresh" size={16} className={spinning ? 'spin-ic' : ''} />
            </button>
            <button type="button" className={'tb-icon' + (settingsOpen ? ' on' : '')} onClick={openSettings}
              title="Settings — group unit, region and view" aria-label="Settings" aria-expanded={settingsOpen}>
              <Icon name="config" size={16} />
            </button>
            <ProfileMenu onOpenSettings={openSettings} />
          </div>
        </header>

        <div className="main-row">
          <main className="body"><div className="wrap">{children}</div></main>
          <NotificationsPanel />
          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <AssistantPanel open={assist.open} seed={assist.seed} onClose={() => setAssist((a) => ({ ...a, open: false }))} />
        </div>
        <FeedbackDialog open={feedback.open} initialCategory={feedback.category} onClose={() => setFeedback({ open: false, category: null })} />
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
