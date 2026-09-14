import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { useStream } from './useStream';
import { persistView, readStoredView, viewById } from './views.js';

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
  const [toast, setToast] = useState(null);
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

  useStream({
    hello: () => setLive(true),
    outcome: () => { refreshInstances(); },
    event: () => { refreshInstances(); },
    reset: () => { refreshInstances(); refreshNotifications(); },
    kit: () => { refreshInstances(); },
    notification: (n) => {
      setUnread((u) => u + 1);
      refreshNotifications();
      setToast({ ...n, at: Date.now() });
    },
    error: () => setLive(false),
  });

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(t);
  }, [toast]);

  const setFilters = useCallback((patch) => setFiltersState((f) => ({ ...f, ...patch })), []);
  const markRead = useCallback(() => setUnread(0), []);
  const setView = useCallback((id) => setViewId(persistView(id)), []);
  const view = viewById(viewId);

  const value = useMemo(() => ({
    context, filters, setFilters, instances, notifications, unread, live, toast,
    refreshInstances, refreshNotifications, markRead, view, setView,
  }), [context, filters, setFilters, instances, notifications, unread, live, toast, refreshInstances, refreshNotifications, markRead, view, setView]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
