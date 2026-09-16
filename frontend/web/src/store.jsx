import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useStream } from './useStream';
import { persistView, readStoredView, viewById } from './views.js';
import { desktopNotifyPermission, enableDesktopNotifications, pushMonitorNotification } from './notifyDesktop.js';

const Ctx = createContext(null);

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}

export function AppProvider({ children }) {
  const [context, setContext] = useState(null);
  const [filters, setFiltersState] = useState({ groupUnit: 'REV-ACC', cobDate: '', region: '', status: '' });
  const [instances, setInstances] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState(false);
  const [desktopAlerts, setDesktopAlerts] = useState(desktopNotifyPermission);
  const [viewId, setViewId] = useState(readStoredView);

  const loadContext = useCallback(async () => {
    const c = await api.context();
    setContext(c);
    setFiltersState((f) => ({
      ...f,
      groupUnit: f.groupUnit || c.groupUnits?.[0]?.groupUnitId || '',
      cobDate: f.cobDate || c.cobDates?.[0] || '',
    }));
  }, []);

  const refreshInstances = useCallback(async (f) => {
    const use = f || filters;
    const rows = await api.instances({
      groupUnit: use.groupUnit, cobDate: use.cobDate, region: use.region, status: use.status,
    });
    setInstances(rows);
  }, [filters]);

  const refreshNotifications = useCallback(async () => {
    const rows = await api.notifications(50);
    setNotifications(rows);
  }, []);

  useEffect(() => { loadContext(); refreshNotifications(); }, [loadContext, refreshNotifications]);
  useEffect(() => { if (context) refreshInstances(); }, [filters, context]); // eslint-disable-line

  useEffect(() => {
    enableDesktopNotifications().then(setDesktopAlerts);
  }, []);

  useStream({
    hello: () => setLive(true),
    outcome: () => { refreshInstances(); },
    event: () => { refreshInstances(); },
    reset: () => { refreshInstances(); refreshNotifications(); },
    kit: () => { refreshInstances(); },
    notification: (n) => {
      setUnread((u) => u + 1);
      refreshNotifications();
      pushMonitorNotification({ ...n, at: Date.now() });
    },
    error: () => setLive(false),
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
        title: 'Desktop alerts on',
        message: 'READY / BLOCKED cards will appear outside the browser.',
        at: Date.now(),
      });
    }
    return p;
  }, []);

  const setFilters = useCallback((patch) => setFiltersState((f) => ({ ...f, ...patch })), []);
  const markRead = useCallback(() => setUnread(0), []);
  const setView = useCallback((id) => setViewId(persistView(id)), []);
  const view = viewById(viewId);

  const value = useMemo(() => ({
    context, filters, setFilters, instances, notifications, unread, live, desktopAlerts, allowDesktopAlerts,
    refreshInstances, refreshNotifications, markRead, view, setView,
  }), [context, filters, setFilters, instances, notifications, unread, live, desktopAlerts, allowDesktopAlerts,
    refreshInstances, refreshNotifications, markRead, view, setView]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
