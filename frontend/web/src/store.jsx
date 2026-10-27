import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { useLiveStatus, useStream } from './useStream';
import { isLiveLeader } from './live/liveLink.js';
import { persistView, readStoredView, viewById } from './views.js';
import { desktopNotifyPermission, enableDesktopNotifications, pushMonitorNotification, registerNotifyWorker } from './notifyDesktop.js';
import { HIDDEN_KEY, READ_KEY, capIds, idOf, mergeNotifications, unreadCount } from './lib/notifyState.js';
import { EMBED, embedScope } from './embed.js';
import { onSystem, postSystem } from './workspace/interop.js';
import { applyTheme, currentThemeId } from './theme.js';
import { entitledGroupUnit } from './lib/entitledGroupUnit.js';

const Ctx = createContext(null);

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

function readIds(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : new Set(JSON.parse(raw).map(String));
  } catch {
    return null;
  }
}

function writeIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify([...capIds(ids)])); } catch { /* private window */ }
}

export function AppProvider({ children }) {
  const [context, setContext] = useState(null);
  const [filters, setFiltersState] = useState(() => ({ groupUnit: 'REV-ACC', cobDate: '', region: '', status: '', ...(EMBED ? embedScope() : {}) }));
  const [instances, setInstances] = useState([]);
  const [hubNotifications, setHubNotifications] = useState([]);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [read, setRead] = useState(() => readIds(READ_KEY) || new Set());
  const [hidden, setHidden] = useState(() => readIds(HIDDEN_KEY) || new Set());
  const firstRun = useRef(readIds(READ_KEY) == null);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [desktopAlerts, setDesktopAlerts] = useState(desktopNotifyPermission);
  const [viewId, setViewId] = useState(readStoredView);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [themeId, setThemeId] = useState(currentThemeId);
  const liveStatus = useLiveStatus();

  const loadContext = useCallback(async () => {
    const c = await api.context();
    setContext(c);
    setFiltersState((f) => ({
      ...f,
      groupUnit: entitledGroupUnit(f.groupUnit, c.groupUnits),
      cobDate: f.cobDate || c.cobDates?.[0] || '',
    }));
  }, []);

  const refreshInstances = useCallback(async (f) => {
    const use = f || filters;
    const rows = await api.instances({
      groupUnit: use.groupUnit, cobDate: use.cobDate, region: use.region, status: use.status,
    });
    setInstances(rows);
    setLastUpdated(new Date());
  }, [filters]);

  const refreshNotifications = useCallback(async () => {
    const rows = await api.notifications(100);
    setHubNotifications(rows);
    // First visit on this browser: what is already in the inbox counts as read, so the bell shows news only.
    if (firstRun.current) {
      firstRun.current = false;
      setRead((prev) => {
        const next = new Set(prev);
        rows.forEach((n) => next.add(idOf(n)));
        writeIds(READ_KEY, next);
        return next;
      });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshInstances(), refreshNotifications()]);
    setLastUpdated(new Date());
  }, [refreshInstances, refreshNotifications]);

  useEffect(() => { loadContext().catch(() => {}); refreshNotifications().catch(() => {}); }, [loadContext, refreshNotifications]);
  useEffect(() => { if (context) refreshInstances().catch(() => {}); }, [filters, context]); // eslint-disable-line

  useEffect(() => {
    if (EMBED) return;
    registerNotifyWorker().then(() => setDesktopAlerts(desktopNotifyPermission()));
  }, []);

  useStream({
    hello: () => { refreshInstances().catch(() => {}); refreshNotifications().catch(() => {}); },
    outcome: () => { refreshInstances().catch(() => {}); },
    event: () => { refreshInstances().catch(() => {}); },
    reset: () => { setLiveNotifications([]); refreshInstances().catch(() => {}); refreshNotifications().catch(() => {}); },
    kit: () => { refreshInstances().catch(() => {}); },
    notification: (n) => {
      if (n && idOf(n)) setLiveNotifications((prev) => mergeNotifications([], [n, ...prev], 100));
      refreshNotifications().catch(() => {});
      // One socket, one card: only the document that owns the live link raises the desktop card.
      if (!EMBED && isLiveLeader()) pushMonitorNotification({ ...n, at: Date.now() });
    },
  });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('toast') !== 'demo') return undefined;
    enableDesktopNotifications().then((p) => {
      setDesktopAlerts(p);
      pushMonitorNotification({
        title: 'FOBO is READY',
        message: 'Helix can run for GLOBAL / today.',
        severity: 'SUCCESS',
        transition: 'READY',
        at: Date.now(),
      });
    });
    return undefined;
  }, []);

  const allowDesktopAlerts = useCallback(async () => {
    const p = await enableDesktopNotifications();
    setDesktopAlerts(p);
    if (p === 'granted') {
      pushMonitorNotification({
        title: 'Desktop alerts are on',
        message: 'READY and BLOCKED will appear as cards on your desktop.',
        severity: 'SUCCESS',
        at: Date.now(),
      });
    }
    return p;
  }, []);

  const notifications = useMemo(
    () => mergeNotifications(hubNotifications, liveNotifications).filter((n) => !hidden.has(idOf(n))),
    [hubNotifications, liveNotifications, hidden],
  );
  const unread = useMemo(() => unreadCount(notifications, read), [notifications, read]);

  const isRead = useCallback((n) => read.has(idOf(n)), [read]);
  const markRead = useCallback((n) => {
    setRead((prev) => {
      const next = new Set(prev);
      if (n == null) notifications.forEach((x) => next.add(idOf(x)));
      else next.add(typeof n === 'object' ? idOf(n) : String(n));
      writeIds(READ_KEY, next);
      return next;
    });
  }, [notifications]);
  const markAllRead = useCallback(() => markRead(null), [markRead]);
  const dismissNotification = useCallback((n) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(typeof n === 'object' ? idOf(n) : String(n));
      writeIds(HIDDEN_KEY, next);
      return next;
    });
  }, []);
  const toggleNotifPanel = useCallback(() => setNotifPanelOpen((o) => !o), []);

  // Installed PWA: unread count on the app icon (Rainbow / Teams style). Shell only.
  useEffect(() => {
    if (EMBED || typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
    const p = unread > 0 ? navigator.setAppBadge(unread) : navigator.clearAppBadge();
    p?.catch?.(() => {});
  }, [unread]);

  const setFilters = useCallback((patch) => setFiltersState((f) => ({ ...f, ...patch })), []);

  // The shell owns scope; Workspace views follow it. A view never pushes scope back up.
  useEffect(() => {
    if (EMBED) return;
    postSystem({ kind: 'scope', scope: { groupUnit: filters.groupUnit, cobDate: filters.cobDate, region: filters.region } });
  }, [filters.groupUnit, filters.cobDate, filters.region]);
  useEffect(() => {
    if (!EMBED) return undefined;
    return onSystem((msg) => {
      if (msg.kind === 'scope' && msg.scope) setFilters(msg.scope);
    });
  }, [setFilters]);

  // Theme changed in another document (storage event in theme.js) — keep the picker in step.
  useEffect(() => {
    const on = (e) => setThemeId(e.detail?.id || currentThemeId());
    window.addEventListener('ofx-theme', on);
    return () => window.removeEventListener('ofx-theme', on);
  }, []);
  const setTheme = useCallback((id) => setThemeId(applyTheme(id)), []);

  const setView = useCallback((id) => setViewId(persistView(id)), []);
  const view = viewById(viewId);
  const live = liveStatus.live;

  const value = useMemo(() => ({
    context, filters, setFilters, instances, notifications, unread, live, liveStatus, desktopAlerts, allowDesktopAlerts,
    refreshInstances, refreshNotifications, refreshAll, lastUpdated, markRead, markAllRead, isRead, dismissNotification,
    notifPanelOpen, setNotifPanelOpen, toggleNotifPanel, view, setView, themeId, setTheme,
  }), [context, filters, setFilters, instances, notifications, unread, live, liveStatus, desktopAlerts, allowDesktopAlerts,
    refreshInstances, refreshNotifications, refreshAll, lastUpdated, markRead, markAllRead, isRead, dismissNotification,
    notifPanelOpen, toggleNotifPanel, view, setView, themeId, setTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
