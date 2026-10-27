import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Select from '../components/Select.jsx';
import Modal from '../components/Modal.jsx';
import ChannelPicker from '../workspace/ChannelPicker.jsx';
import { WIDGETS } from '../workspace/widgets.jsx';
import { Control } from '@mescius/wijmo';
import { BUILTIN_APPS, appById, appForPath, appOrigin, makeCustomApp, viewSrc } from '../workspace/apps.js';
import { channelById, isValidContext, routeForContext } from '../workspace/channels.js';
import { channelInfo, cleanSubject, deskChannel, deskSubjects, deskTemplate, matchesSubject } from '../workspace/desks.js';
import { activityApi, api, outcomesApi } from '../api.js';
import { decodeJson } from '../grid/spec.js';
import { builtinSpec } from '../grid/specs.js';
import { loadMySpecs } from '../grid/useGridSpec.js';
import { BUILTIN_INTENTS, setWorkspaceHost } from '../workspace/fdc3.js';
import { subscribeLive } from '../live/liveLink.js';
import {
  LAYOUTS, WS_KEY, addView, createWorkspace, currentWorkspace, deleteWorkspace, deskFor, loadState, moveView, newId,
  patchView, removeView, renameWorkspace, resizePair, setActive, setLayout, splitShares, switchWorkspace, toggleMaximized,
} from '../workspace/layout.js';
import { broadcastContext, onAnyContext, onSystem, postSystem } from '../workspace/interop.js';
import { partnerThemeParams } from '../lib/themes.js';

const APPS_KEY = 'ofx-ws-apps';
// Live (WebSocket) events a partner frame may subscribe to through ofx-interop.js.
const PARTNER_LIVE_EVENTS = ['notification', 'outcome', 'event', 'context', 'activity'];
const APP_CHANNEL = /^app:[a-z0-9:_-]{1,48}$/;
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads';

function loadCustomApps() {
  try {
    const list = JSON.parse(localStorage.getItem(APPS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((a) => a && a.kind === 'web' && typeof a.url === 'string' && a.custom) : [];
  } catch {
    return [];
  }
}

/**
 * Desks — the OpenFin / Rainbow idea inside One Finance, organised around business outcomes. A desk hosts several
 * screens in one UI (console screens, widgets, STEPS and partner frames), laid out as grid, columns, rows or tabs,
 * saved by name, torn out into their own windows and docked back. A desk is bound to a business outcome or free.
 * Views on the same colour share context in this browser; views on an outcome desk's channel share it with that
 * outcome's desks in every browser (the hub relays it). Actions on the outcome arrive live as `activity`, so a
 * sign-off on one screen shows on every desk for that outcome; other desks count what they missed.
 */
export default function Desks() {
  const { filters, themeId } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState(() => {
    try { return loadState(localStorage.getItem(WS_KEY)); } catch { return loadState(null); }
  });
  const [customApps, setCustomApps] = useState(loadCustomApps);
  const [launcher, setLauncher] = useState(false);
  const [naming, setNaming] = useState(null); // { mode: 'copy' | 'rename', value }
  const [creating, setCreating] = useState(false);
  const [unread, setUnread] = useState({}); // deskId -> activity on its outcome while another desk was open
  const [flash, setFlash] = useState({});
  const [dragId, setDragId] = useState(null);
  const [reloadTick, setReloadTick] = useState({});
  const [splits, setSplits] = useState([]);
  const [resizing, setResizing] = useState(false);
  const areaRef = useRef(null);
  const sectionRefs = useRef(new Map()); // viewId -> section element (splitter geometry)

  const apps = useMemo(() => [...BUILTIN_APPS, ...customApps], [customApps]);
  const ws = currentWorkspace(state);
  const pageOrigin = window.location.origin;
  const subject = cleanSubject(ws.subject);
  const deskChan = subject ? { ...channelInfo(deskChannel(subject), subject), subject } : null;

  const wsRef = useRef(ws);
  wsRef.current = ws;
  const stateRef = useRef(state);
  stateRef.current = state;
  const appsRef = useRef(apps);
  appsRef.current = apps;
  const frames = useRef(new Map()); // viewId -> iframe element
  const lastContext = useRef({}); // channel -> last context (FDC3: a channel keeps its current context)
  const domOrder = useRef(new Map()); // viewId -> first-seen index: DOM order never changes, so iframes never reload

  useEffect(() => {
    try { localStorage.setItem(WS_KEY, JSON.stringify(state)); } catch { /* quota / private window */ }
  }, [state]);

  // /desks?outcome=outcome:FOBO_HELIX&name=… (from Reports and the Board): open that outcome's desk, or build it.
  const handledLink = useRef(null);
  useEffect(() => {
    // Act on a link once (React may run this effect twice in development before the URL is cleared).
    const link = searchParams.toString();
    if (!link || handledLink.current === link) return;
    handledLink.current = link;
    const grid = searchParams.get('grid');
    if (grid) {
      // From the grid library: a spec id, or `def:<encoded spec>` for an edited one.
      const spec = grid.startsWith('def:') ? decodeJson(grid.slice(4)) : grid;
      navigate('/desks', { replace: true });
      if (spec) {
        const linked = deskChannel(wsRef.current.subject) || null;
        const title = typeof spec === 'string'
          ? builtinSpec(spec)?.title || loadMySpecs().find((m) => `my:${m.id}` === spec)?.title || spec
          : spec.title || 'Grid';
        setState((s) => addView(s, { id: newId(), appId: 'grid', title, channel: linked,
          config: { spec, ...(wsRef.current.subject ? { subject: wsRef.current.subject } : {}) } }));
      }
      return;
    }
    const ref = searchParams.get('outcome');
    if (!ref) return;
    const [kind, ...rest] = ref.split(':');
    const wanted = cleanSubject({ kind, id: rest.join(':'), name: searchParams.get('name') || rest.join(':') });
    navigate('/desks', { replace: true });
    if (!wanted) return;
    const existing = deskFor(state, wanted);
    if (existing) { setState((s) => switchWorkspace(s, existing.id)); return; }
    openOutcomeDesk(wanted);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Activity on another desk's outcome while this one is open: count it on that desk.
  useEffect(() => subscribeLive((name, data) => {
    if (name !== 'activity' || !data) return;
    const current = wsRef.current;
    setUnread((u) => {
      const next = { ...u };
      stateRef.current.workspaces.forEach((w) => {
        if (w.id !== current.id && w.subject && matchesSubject(w.subject, data)) next[w.id] = (next[w.id] || 0) + 1;
      });
      return next;
    });
  }), []);
  useEffect(() => { setUnread((u) => (u[ws.id] ? { ...u, [ws.id]: 0 } : u)); }, [ws.id]);
  useEffect(() => {
    try { localStorage.setItem(APPS_KEY, JSON.stringify(customApps)); } catch { /* ignore */ }
  }, [customApps]);

  // A Wijmo control laid out while hidden (tabs, maximise) measures zero; re-measure when views show.
  useEffect(() => {
    const t = setTimeout(() => { if (areaRef.current) Control.invalidateAll(areaRef.current); }, 30);
    return () => clearTimeout(t);
  }, [ws.layout, ws.active, ws.maximized, ws.views.length]);

  const titles = useMemo(() => Object.fromEntries(ws.views.map((v) => [v.id, v.title])), [ws.views]);

  const pulse = useCallback((ids) => {
    if (!ids.length) return;
    setFlash((f) => ({ ...f, ...Object.fromEntries(ids.map((id) => [id, Date.now()])) }));
    setTimeout(() => setFlash((f) => {
      const next = { ...f };
      ids.forEach((id) => { if (Date.now() - (next[id] || 0) >= 650) delete next[id]; });
      return next;
    }), 700);
  }, []);

  const postToWeb = useCallback((view, message) => {
    const app = appById(appsRef.current, view.appId);
    const frame = frames.current.get(view.id);
    const origin = appOrigin(app, pageOrigin);
    if (!frame?.contentWindow || !origin) return;
    try { frame.contentWindow.postMessage(message, origin); } catch { /* frame navigated elsewhere */ }
  }, [pageOrigin]);

  // Registries the host keeps for the FDC3 standard: who handles which intent (fdc3.addIntentListener in a view,
  // or ofx-interop.js in a partner frame), which partner frames asked for which live events / app channels, and
  // who raised each intent still in flight.
  const intentListeners = useRef(new Map()); // intent -> Set(viewId)
  const liveSubs = useRef(new Map()); // viewId -> Set(live event name)   (partner frames)
  const appSubs = useRef(new Map()); // viewId -> Set('app:<name>')      (partner frames)
  const raisers = useRef(new Map()); // raiseId -> { viewId, web, partnerRaiseId }

  const findView = (id) => wsRef.current.views.find((v) => v.id === id);
  const isWeb = useCallback((id) => {
    const v = wsRef.current.views.find((x) => x.id === id);
    return appById(appsRef.current, v?.appId)?.kind === 'web';
  }, []);

  // Relay every context to the partner frames on that channel (a colour, or an app channel they subscribed to);
  // light up the views that received it.
  useEffect(() => onAnyContext((msg) => {
    lastContext.current[msg.channel] = msg.context;
    const receivers = wsRef.current.views.filter((v) => v.id !== msg.source
      && (v.channel === msg.channel || appSubs.current.get(v.id)?.has(msg.channel)));
    receivers.forEach((v) => {
      if (appById(appsRef.current, v.appId)?.kind === 'web') postToWeb(v, { type: 'ofx.context', channel: msg.channel, context: msg.context, source: msg.source });
    });
    pulse(receivers.map((v) => v.id));
  }), [postToWeb, pulse]);

  function replyToRaiser(raiseId, payload) {
    if (!raiseId) return;
    const raiser = raisers.current.get(raiseId);
    raisers.current.delete(raiseId);
    if (raiser?.web) {
      const v = findView(raiser.viewId);
      if (v) postToWeb(v, { type: 'ofx.intent.result', raiseId: raiser.partnerRaiseId, ...payload });
    } else {
      postSystem({ kind: 'intent-result', raiseId, ...payload });
    }
  }

  // The intent resolver: a view that listens for the intent (same colour first), else the built-in viewer for
  // ViewInstance / ViewReport, else NoAppsFound. The hub can raise intents too, over the WebSocket.
  function handleIntent(msg) {
    const { intent, context, source, raiseId } = msg;
    if (typeof intent !== 'string' || !isValidContext(context)) {
      replyToRaiser(raiseId, { error: 'MalformedContext' });
      return;
    }
    const current = wsRef.current;
    const sourceView = current.views.find((v) => v.id === source);
    const handlers = [...(intentListeners.current.get(intent) || [])].filter((id) => id !== source && current.views.some((v) => v.id === id));
    if (handlers.length) {
      const target = handlers.find((id) => sourceView?.channel && findView(id)?.channel === sourceView.channel) || handlers[0];
      if (isWeb(target)) postToWeb(findView(target), { type: 'ofx.intent.deliver', intent, context, raiseId, source });
      else postSystem({ kind: 'intent-deliver', viewId: target, intent, context, raiseId, source });
      setState((s) => setActive(s, target));
      pulse([target]);
      return;
    }
    const route = BUILTIN_INTENTS[intent] ? routeForContext(context) : null;
    if (route) {
      const viewerApp = intent === 'ViewReport' ? 'reports' : 'instance';
      const viewer = current.views.find((v) => v.appId === viewerApp);
      if (viewer) {
        postSystem({ kind: 'navigate', viewId: viewer.id, path: route });
        setState((s) => setActive(s, viewer.id));
        pulse([viewer.id]);
        replyToRaiser(raiseId, { target: { appId: viewerApp, instanceId: viewer.id } });
      } else {
        const id = newId();
        setState((s) => addView(s, { id, appId: viewerApp, title: viewerApp === 'reports' ? 'Report' : 'Instance detail',
          channel: sourceView?.channel || null, path: route }));
        replyToRaiser(raiseId, { target: { appId: viewerApp, instanceId: id } });
      }
      return;
    }
    replyToRaiser(raiseId, { error: 'NoAppsFound' });
  }

  function openApp(appId, context, sourceId) {
    const app = appById(appsRef.current, appId);
    if (!app) return;
    const route = app.kind === 'route' && isValidContext(context) ? routeForContext(context) : null;
    const path = route && route.startsWith(app.path + '/') ? route : undefined;
    setState((s) => addView(s, { id: newId(), appId: app.appId, title: app.title, channel: app.linkable ? (findView(sourceId)?.channel || null) : null, path }));
  }

  // The Workspace is the intent resolver while it is open (window.fdc3.raiseIntent in this document routes here).
  useEffect(() => { setWorkspaceHost(true); return () => setWorkspaceHost(false); }, []);

  // Same-origin views: hello, dock, intents, intent handlers and results, channel changes, fdc3.open.
  useEffect(() => onSystem((msg) => {
    const current = wsRef.current;
    if (msg.kind === 'view-hello') {
      const v = current.views.find((x) => x.id === msg.viewId);
      if (v) postSystem({ kind: 'join', viewId: v.id, channel: v.channel, context: v.channel ? lastContext.current[v.channel] : undefined });
    } else if (msg.kind === 'dock' && typeof msg.viewId === 'string') {
      const app = appForPath(appsRef.current, msg.path);
      if (!app) return;
      setState((s) => addView(s, { id: msg.viewId, appId: app.appId, title: msg.title || app.title, channel: msg.channel || null,
        ...(app.kind === 'route' && msg.path ? { path: msg.path } : {}) }));
    } else if (msg.kind === 'intent') {
      if (msg.raiseId) raisers.current.set(msg.raiseId, { viewId: msg.source, web: false });
      handleIntent(msg);
    } else if (msg.kind === 'intent-listener' && typeof msg.intent === 'string' && typeof msg.viewId === 'string') {
      if (!intentListeners.current.has(msg.intent)) intentListeners.current.set(msg.intent, new Set());
      intentListeners.current.get(msg.intent).add(msg.viewId);
    } else if (msg.kind === 'intent-result' && raisers.current.has(msg.raiseId)) {
      const raiser = raisers.current.get(msg.raiseId);
      raisers.current.delete(msg.raiseId);
      if (raiser.web) {
        const v = findView(raiser.viewId);
        if (v) postToWeb(v, { type: 'ofx.intent.result', raiseId: raiser.partnerRaiseId, target: msg.target, result: msg.result, error: msg.error });
      }
    } else if (msg.kind === 'channel-changed' && current.views.some((v) => v.id === msg.viewId)) {
      setState((s) => patchView(s, msg.viewId, { channel: msg.channel || null }));
    } else if (msg.kind === 'open' && typeof msg.appId === 'string') {
      openApp(msg.appId, msg.context, msg.source);
    }
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket: the hub raised an intent; and partner frames that subscribed get live events relayed.
  useEffect(() => subscribeLive((name, data) => {
    if (name === 'intent' && data && typeof data === 'object') {
      handleIntent({ intent: data.intent, context: data.context, source: data.source || 'hub' });
      return;
    }
    if (!PARTNER_LIVE_EVENTS.includes(name)) return;
    wsRef.current.views.forEach((v) => {
      if (liveSubs.current.get(v.id)?.has(name) && isWeb(v.id)) postToWeb(v, { type: 'ofx.live', name, data });
    });
  }), [postToWeb, isWeb]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-origin partner frames: only messages from a frame we host, from the origin we framed.
  useEffect(() => {
    function onMessage(e) {
      const data = e.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string' || !data.type.startsWith('ofx.')) return;
      const view = wsRef.current.views.find((v) => frames.current.get(v.id)?.contentWindow === e.source);
      if (!view) return;
      const app = appById(appsRef.current, view.appId);
      if (!app || app.kind !== 'web' || appOrigin(app, pageOrigin) !== e.origin) return;
      if (data.type === 'ofx.ready') {
        postToWeb(view, { type: 'ofx.channel', channel: view.channel, context: view.channel ? lastContext.current[view.channel] ?? null : null,
          scope: { groupUnit: filters.groupUnit, cobDate: filters.cobDate, region: filters.region } });
      } else if (data.type === 'ofx.context.broadcast' && isValidContext(data.context)) {
        const channel = typeof data.channel === 'string' && APP_CHANNEL.test(data.channel) ? data.channel : view.channel;
        if (channel) broadcastContext(data.context, { channel, source: view.id });
      } else if (data.type === 'ofx.intent' && typeof data.intent === 'string') {
        const raiseId = typeof data.raiseId === 'string' ? `${view.id}:${data.raiseId}` : undefined;
        if (raiseId) raisers.current.set(raiseId, { viewId: view.id, web: true, partnerRaiseId: data.raiseId });
        handleIntent({ intent: data.intent, context: data.context, source: view.id, raiseId });
      } else if (data.type === 'ofx.intent.listen' && typeof data.intent === 'string') {
        if (!intentListeners.current.has(data.intent)) intentListeners.current.set(data.intent, new Set());
        intentListeners.current.get(data.intent).add(view.id);
      } else if (data.type === 'ofx.intent.result' && typeof data.raiseId === 'string' && raisers.current.has(data.raiseId)) {
        const raiser = raisers.current.get(data.raiseId);
        raisers.current.delete(data.raiseId);
        const payload = { target: { appId: app.appId, instanceId: view.id }, result: data.result ?? null, error: data.error };
        if (raiser.web) {
          const rv = findView(raiser.viewId);
          if (rv) postToWeb(rv, { type: 'ofx.intent.result', raiseId: raiser.partnerRaiseId, ...payload });
        } else {
          postSystem({ kind: 'intent-result', raiseId: data.raiseId, ...payload });
        }
      } else if (data.type === 'ofx.join') {
        const own = cleanSubject(wsRef.current.subject);
        const next = data.channel == null ? null
          : channelById(data.channel)?.id || (own && data.channel === deskChannel(own) ? data.channel : undefined);
        if (data.channel == null || next) setChannel(view, next ?? null);
      } else if (data.type === 'ofx.subscribe' && typeof data.channel === 'string' && APP_CHANNEL.test(data.channel)) {
        if (!appSubs.current.has(view.id)) appSubs.current.set(view.id, new Set());
        appSubs.current.get(view.id).add(data.channel);
        const ctx = lastContext.current[data.channel];
        if (ctx) postToWeb(view, { type: 'ofx.context', channel: data.channel, context: ctx, source: 'replay' });
      } else if (data.type === 'ofx.activity' && typeof data.action === 'string' && typeof data.summary === 'string') {
        // A partner screen acted in its own system: every desk on this outcome, in every browser, hears it.
        const own = cleanSubject(wsRef.current.subject);
        if (own) {
          activityApi.post({ action: data.action, summary: data.summary.slice(0, 280), source: app.appId.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) || 'partner',
            ...(own.kind === 'outcome' ? { outcomeId: own.id } : { kitId: own.id }),
            ...(typeof data.instanceId === 'string' ? { instanceId: data.instanceId } : {}) }).catch(() => {});
        }
      } else if (data.type === 'ofx.live.subscribe' && Array.isArray(data.names)) {
        liveSubs.current.set(view.id, new Set(data.names.filter((n) => PARTNER_LIVE_EVENTS.includes(n))));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pageOrigin, postToWeb, filters.groupUnit, filters.cobDate, filters.region]); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme changes reach partner frames (console views follow through the storage event): same look everywhere.
  useEffect(() => {
    wsRef.current.views.forEach((v) => {
      if (appById(appsRef.current, v.appId)?.kind === 'web') postToWeb(v, { type: 'ofx.theme', ...partnerThemeParams(themeId) });
    });
  }, [themeId, postToWeb]);

  // Scope changes reach partner frames too (console views follow it through the store).
  useEffect(() => {
    wsRef.current.views.forEach((v) => {
      if (appById(appsRef.current, v.appId)?.kind === 'web') {
        postToWeb(v, { type: 'ofx.scope', scope: { groupUnit: filters.groupUnit, cobDate: filters.cobDate, region: filters.region } });
      }
    });
  }, [filters.groupUnit, filters.cobDate, filters.region, postToWeb]);

  function setChannel(view, channel) {
    setState((s) => patchView(s, view.id, { channel }));
    const app = appById(appsRef.current, view.appId);
    const context = channel ? lastContext.current[channel] : undefined;
    if (app?.kind === 'route') postSystem({ kind: 'join', viewId: view.id, channel, context });
    if (app?.kind === 'web') postToWeb(view, { type: 'ofx.channel', channel, context: context ?? null });
  }

  function launch(app) {
    // On an outcome desk new views join the desk's shared channel; elsewhere the first colour in use.
    const linked = deskChan?.id || ws.views.find((v) => v.channel)?.channel || null;
    setState((s) => addView(s, { id: newId(), appId: app.appId, title: app.title, channel: app.linkable ? linked : null,
      ...(app.kind === 'widget' && subject ? { config: { subject } } : {}) }));
    setLauncher(false);
  }

  /** Build a desk for a business outcome from its template (lineage grids come from the outcome definition). */
  async function openOutcomeDesk(target) {
    let grids = [];
    if (target.kind === 'outcome') {
      try { grids = (await outcomesApi.definitions()).find((d) => d.id === target.id)?.grids || []; } catch { /* no grids */ }
    }
    const template = deskTemplate(target, { grids });
    if (template) setState((s) => createWorkspace(s, template.name, { template }));
    setCreating(false);
  }

  function popOut(view) {
    const app = appById(apps, view.appId);
    if (!app) return;
    if (app.kind === 'web') {
      window.open(viewSrc(view, app, { scope: filters, theme: partnerThemeParams(themeId), pageOrigin }), '_blank', 'noopener');
      return;
    }
    let path = view.path;
    const frame = frames.current.get(view.id);
    try {
      if (frame?.contentWindow) path = frame.contentWindow.location.pathname;
    } catch { /* not same-origin */ }
    const src = viewSrc({ ...view, path }, app, { scope: filters, pageOrigin });
    const win = window.open(src, 'ofx-view:' + view.id, 'popup=yes,width=1180,height=780');
    if (win) setState((s) => removeView(s, view.id));
  }

  // Splitters (OpenFin-style layouts): one handle between neighbours in columns / rows; dragging moves their shares.
  const measureSplits = useCallback(() => {
    const area = areaRef.current;
    const w = wsRef.current;
    if (!area || !['columns', 'rows'].includes(w.layout) || w.maximized || w.views.length < 2) { setSplits([]); return; }
    const box = area.getBoundingClientRect();
    const horizontal = w.layout === 'columns';
    const out = [];
    for (let i = 0; i < w.views.length - 1; i += 1) {
      const a = sectionRefs.current.get(w.views[i].id);
      const b = sectionRefs.current.get(w.views[i + 1].id);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      out.push({
        a: w.views[i].id,
        b: w.views[i + 1].id,
        pos: horizontal ? (ra.right + rb.left) / 2 - box.left + area.scrollLeft : (ra.bottom + rb.top) / 2 - box.top + area.scrollTop,
      });
    }
    setSplits(out);
  }, []);

  useLayoutEffect(() => { measureSplits(); }, [measureSplits, ws.layout, ws.maximized, ws.views]);
  useEffect(() => {
    window.addEventListener('resize', measureSplits);
    return () => window.removeEventListener('resize', measureSplits);
  }, [measureSplits]);

  function startResize(e, split) {
    const a = sectionRefs.current.get(split.a);
    const b = sectionRefs.current.get(split.b);
    const va = findView(split.a);
    const vb = findView(split.b);
    if (!a || !b || !va || !vb) return;
    e.preventDefault();
    const horizontal = wsRef.current.layout === 'columns';
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const aPx = horizontal ? ra.width : ra.height;
    const bPx = horizontal ? rb.width : rb.height;
    const start = horizontal ? e.clientX : e.clientY;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setResizing(true);
    const move = (ev) => {
      const [na, nb] = splitShares(va.size || 1, vb.size || 1, aPx, bPx, (horizontal ? ev.clientX : ev.clientY) - start, horizontal ? 240 : 160);
      setState((st) => resizePair(st, split.a, na, split.b, nb));
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      setResizing(false);
      requestAnimationFrame(measureSplits);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function reload(view) {
    setReloadTick((t) => ({ ...t, [view.id]: (t[view.id] || 0) + 1 }));
  }

  function submitName() {
    if (!naming) return;
    const value = naming.value.trim();
    if (!value) { setNaming(null); return; }
    if (naming.mode === 'rename') setState((s) => renameWorkspace(s, value));
    else setState((s) => createWorkspace(s, value, { copyCurrent: naming.mode === 'copy' }));
    setNaming(null);
  }

  ws.views.forEach((v) => { if (!domOrder.current.has(v.id)) domOrder.current.set(v.id, domOrder.current.size); });
  const ordered = ws.views.slice().sort((a, b) => domOrder.current.get(a.id) - domOrder.current.get(b.id));
  const position = Object.fromEntries(ws.views.map((v, i) => [v.id, i]));
  const activeId = ws.active && ws.views.some((v) => v.id === ws.active) ? ws.active : ws.views[0]?.id;
  const usedChannels = [...new Set(ws.views.map((v) => v.channel).filter(Boolean))];
  const chanOf = (id) => channelInfo(id, subject);
  const sized = ['columns', 'rows'].includes(ws.layout) && !ws.maximized;
  const tracks = ws.views.map((v) => `minmax(${ws.layout === 'columns' ? 240 : 160}px, ${v.size || 1}fr)`).join(' ');
  const sizedTracks = sized ? (ws.layout === 'columns' ? { gridTemplateColumns: tracks } : { gridTemplateRows: tracks }) : undefined;

  return (
    <>
      <PageHeader icon="window" title="Desks" context="Outcome desks · multi-screen · installable app"
        infoTitle="One desk per business outcome" infoWidth={360}
        info={<>
          A <b>desk</b> hosts screens side by side: console screens, widgets, STEPS and partner web apps. Build one for a
          business outcome and its views link on the <b>desk channel</b>: a pick or an action on one screen reaches that
          outcome’s screens in every tab and every browser, through the hub (WebSocket, SSE fallback). Colours link views in
          this browser only. Tear a view out into its own window and <b>Dock</b> it back.
        </>}
        summary={[
          subject ? `${subject.kind === 'kit' ? 'Kit' : 'Outcome'} desk · ${subject.name}` : 'Free desk',
          `${ws.views.length} view${ws.views.length === 1 ? '' : 's'}`,
          usedChannels.length ? `linked on ${usedChannels.map((c) => chanOf(c)?.label).filter(Boolean).join(', ')}` : '',
        ].filter(Boolean).join(' · ')}>
        <Select variant="header" icon={subject ? 'tower' : 'window'} value={ws.id} minWidth={190} title="Switch desk"
          onChange={(id) => setState((s) => switchWorkspace(s, id))}
          options={state.workspaces.map((w) => ({ value: w.id,
            label: `${w.name}${w.subject ? ' ◆' : ''}${unread[w.id] ? ` · ${unread[w.id]} new` : ''}` }))} />
        <div className="ws-btns">
          <button className="tb-icon" title="New desk — for a business outcome, or blank" aria-label="New desk"
            onClick={() => setCreating(true)}><Icon name="plus" size={15} /></button>
          <button className="tb-icon" title="Save as a new desk" aria-label="Save desk as"
            onClick={() => setNaming({ mode: 'copy', value: ws.name + ' copy' })}><Icon name="save" size={15} /></button>
          <button className="tb-icon" title="Rename desk" aria-label="Rename desk"
            onClick={() => setNaming({ mode: 'rename', value: ws.name })}><Icon name="config" size={15} /></button>
          <button className="tb-icon" title="Delete desk" aria-label="Delete desk"
            onClick={() => setState((s) => deleteWorkspace(s))} disabled={state.workspaces.length <= 1}><Icon name="trash" size={15} /></button>
          {Object.entries(unread).some(([id, n]) => n && id !== ws.id) && (
            <span className="pill warn" title="Activity on other desks’ outcomes while you were here">
              {Object.entries(unread).filter(([id]) => id !== ws.id).reduce((n, [, c]) => n + c, 0)} new elsewhere
            </span>
          )}
        </div>
        <div className="seg" role="group" aria-label="Layout">
          {LAYOUTS.map((l) => (
            <button key={l.id} className={ws.layout === l.id ? 'on' : ''} onClick={() => setState((s) => setLayout(s, l.id))}
              title={l.label + ' layout'} aria-label={l.label + ' layout'}>
              <Icon name={l.icon} size={13} /> <span className="ws-lbl">{l.label}</span>
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => setLauncher(true)}><Icon name="plus" size={15} /> Launch app</button>
      </PageHeader>

      {ws.layout === 'tabs' && ws.views.length > 0 && (
        <div className="ws-tabs" role="tablist">
          {ws.views.map((v) => {
            const chan = chanOf(v.channel);
            return (
              <button key={v.id} role="tab" aria-selected={v.id === activeId} className={'ws-tab' + (v.id === activeId ? ' on' : '')}
                onClick={() => setState((s) => setActive(s, v.id))}>
                {chan && <i className="chan-dot" style={{ background: chan.color }} />}
                <Icon name={appById(apps, v.appId)?.icon || 'grid'} size={13} /> {v.title}
              </button>
            );
          })}
        </div>
      )}

      {ws.views.length === 0 ? (
        <div className="panel"><div className="panel-bd ws-empty">
          <Icon name="window" size={30} />
          <b>This desk is empty</b>
          <span className="muted">Launch console screens, widgets or any web app, and link them on the desk channel or by colour.</span>
          <button className="btn" onClick={() => setLauncher(true)}><Icon name="plus" size={15} /> Launch app</button>
        </div></div>
      ) : (
        <div ref={areaRef} className={'ws-area ' + ws.layout + (ws.maximized ? ' has-max' : '') + (resizing ? ' resizing' : '')}
          style={sizedTracks}>
          {ordered.map((v) => {
            const app = appById(apps, v.appId);
            const chan = chanOf(v.channel);
            const hidden = (ws.layout === 'tabs' && v.id !== activeId) || (ws.maximized && ws.maximized !== v.id);
            return (
              <section key={v.id} ref={(el) => { if (el) sectionRefs.current.set(v.id, el); else sectionRefs.current.delete(v.id); }} className={'wsv' + (v.wide ? ' wide' : '') + (ws.maximized === v.id ? ' max' : '') + (hidden ? ' hidden' : '') + (flash[v.id] ? ' flash' : '') + (dragId === v.id ? ' dragging' : '')}
                style={{ order: position[v.id], '--chan': chan?.color || 'transparent' }}
                onDragOver={(e) => { if (dragId && dragId !== v.id) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (dragId) setState((s) => moveView(s, dragId, v.id)); setDragId(null); }}
                onMouseDown={() => { if (ws.active !== v.id) setState((s) => setActive(s, v.id)); }}>
                <header className="wsv-hd" draggable={ws.layout !== 'tabs'}
                  onDragStart={(e) => { setDragId(v.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', v.id); }}
                  onDragEnd={() => setDragId(null)}
                  onDoubleClick={() => setState((s) => toggleMaximized(s, v.id))}>
                  {ws.layout !== 'tabs' && <span className="wsv-grip" title="Drag to move"><Icon name="grip" size={13} /></span>}
                  <Icon name={app?.icon || 'grid'} size={14} />
                  <span className="wsv-title" title={v.title}>{v.title}</span>
                  <span className="wsv-kind">{app?.kind === 'web' ? 'web' : app?.kind === 'widget' ? 'widget' : 'screen'}</span>
                  <span className="spacer" />
                  {app?.linkable && <ChannelPicker value={v.channel} onChange={(c) => setChannel(v, c)} compact desk={deskChan} />}
                  {app && app.kind !== 'widget' && (
                    <button className="wsv-btn" title="Reload view" onClick={() => reload(v)}><Icon name="refresh" size={13} /></button>
                  )}
                  <button className="wsv-btn" title={app?.kind === 'web' ? 'Open in a new tab' : 'Tear out into its own window'} onClick={() => popOut(v)}>
                    <Icon name="external" size={13} />
                  </button>
                  {ws.layout === 'grid' && !ws.maximized && (
                    <button className="wsv-btn" title={v.wide ? 'Normal width' : 'Span two columns'} onClick={() => setState((s) => patchView(s, v.id, { wide: !v.wide }))}>
                      <Icon name="columns" size={13} />
                    </button>
                  )}
                  <button className="wsv-btn" title={ws.maximized === v.id ? 'Restore' : 'Maximise'} onClick={() => setState((s) => toggleMaximized(s, v.id))}>
                    <Icon name={ws.maximized === v.id ? 'minimize' : 'maximize'} size={13} />
                  </button>
                  <button className="wsv-btn" title="Close view" onClick={() => { frames.current.delete(v.id); setState((s) => removeView(s, v.id)); }}>
                    <Icon name="x" size={13} />
                  </button>
                </header>
                <div className="wsv-bd">
                  {!app && <div className="empty sm">This app is no longer in the directory.</div>}
                  {app?.kind === 'widget' && WIDGETS[app.appId] && (() => { const W = WIDGETS[app.appId]; return <W view={v} titles={titles} desk={ws} />; })()}
                  {app && app.kind !== 'widget' && (
                    <ViewFrame key={v.id + ':' + (reloadTick[v.id] || 0)} view={v} app={app}
                      src={viewSrc(v, app, { scope: filters, theme: partnerThemeParams(themeId), pageOrigin })}
                      onFrame={(el) => { if (el) frames.current.set(v.id, el); }} />
                  )}
                </div>
              </section>
            );
          })}
          {splits.map((sp) => (
            <div key={sp.a + '|' + sp.b} className={'ws-split ' + (ws.layout === 'columns' ? 'col' : 'row')} role="separator"
              aria-orientation={ws.layout === 'columns' ? 'vertical' : 'horizontal'} title="Drag to resize"
              style={ws.layout === 'columns' ? { left: sp.pos } : { top: sp.pos }}
              onPointerDown={(e) => startResize(e, sp)} />
          ))}
        </div>
      )}

      {launcher && (
        <AppDirectory apps={apps} onLaunch={launch} onClose={() => setLauncher(false)}
          onAdd={(app) => { setCustomApps((list) => [...list, app]); launch(app); }}
          onRemove={(appId) => setCustomApps((list) => list.filter((a) => a.appId !== appId))}
          pageOrigin={pageOrigin} />
      )}

      {creating && (
        <NewDesk state={state} onOutcome={openOutcomeDesk} onClose={() => setCreating(false)}
          onBlank={(name) => { setState((s) => createWorkspace(s, name)); setCreating(false); }}
          onOpen={(id) => { setState((s) => switchWorkspace(s, id)); setCreating(false); }} />
      )}

      {naming && (
        <Modal title={naming.mode === 'rename' ? 'Rename desk' : 'Save desk as'}
          subtitle={naming.mode === 'copy' ? 'Copies the current layout, views and link colours.' : undefined}
          onClose={() => setNaming(null)}
          footer={<><button className="btn ghost" onClick={() => setNaming(null)}>Cancel</button><button className="btn" onClick={submitName}>Save</button></>}>
          <div className="field">
            <label htmlFor="ws-name">Name</label>
            <input id="ws-name" className="inp" autoFocus maxLength={60} value={naming.value}
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }} />
          </div>
        </Modal>
      )}
    </>
  );
}

/** One framed view. The src is fixed at mount: scope and channel flow over the bus, not by reloading. */
function ViewFrame({ view, app, src, onFrame }) {
  const [initialSrc] = useState(src);
  const props = app.kind === 'web'
    ? { sandbox: SANDBOX, referrerPolicy: 'strict-origin-when-cross-origin', allow: 'clipboard-write; fullscreen' }
    : { name: 'ofx-view:' + view.id };
  return <iframe ref={onFrame} title={view.title} src={initialSrc} {...props} />;
}

/** New desk: pick a business outcome (engine outcome or kit) to get its template, or start blank. */
function NewDesk({ state, onOutcome, onBlank, onOpen, onClose }) {
  const [subjects, setSubjects] = useState(null);
  const [name, setName] = useState('');
  useEffect(() => {
    Promise.allSettled([outcomesApi.all(), api.kits()]).then(([o, k]) => {
      setSubjects(deskSubjects(o.status === 'fulfilled' ? o.value : [], k.status === 'fulfilled' ? k.value : []));
    });
  }, []);
  return (
    <Modal title="New desk" subtitle="One desk per business outcome — or a blank desk for anything" onClose={onClose} width={720}>
      <div className="appdir-sec">
        <div className="menu-lbl">For a business outcome <span className="muted">· views link on the outcome’s channel across browsers</span></div>
        {!subjects && <div className="empty sm">Loading outcomes…</div>}
        {subjects && subjects.length === 0 && <div className="empty sm">The hub lists no outcomes yet.</div>}
        <div className="appdir">
          {(subjects || []).map((s) => {
            const existing = deskFor(state, s);
            return (
              <div key={s.kind + s.id} className="appdir-card" role="button" tabIndex={0}
                onClick={() => (existing ? onOpen(existing.id) : onOutcome(s))}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (existing) onOpen(existing.id); else onOutcome(s); } }}>
                <span className="ph-ico"><Icon name={s.kind === 'kit' ? 'cards' : 'report'} size={16} /></span>
                <div className="appdir-txt">
                  <b>{s.name}</b>
                  <span>{s.question || s.id}{s.owner ? ` · ${s.owner}` : ''}</span>
                </div>
                <span className="chip">{existing ? 'open' : s.kind}</span>
              </div>
            );
          })}
        </div>
      </div>
      <form className="appdir-add" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onBlank(name.trim()); }}>
        <div className="menu-lbl">Blank desk <span className="muted">· any screens, frames and widgets; link them by colour</span></div>
        <div className="appdir-form">
          <input className="inp" placeholder="Desk name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Desk name" />
          <button className="btn" type="submit" disabled={!name.trim()}><Icon name="plus" size={14} /> Create</button>
        </div>
      </form>
    </Modal>
  );
}

function AppDirectory({ apps, onLaunch, onAdd, onRemove, onClose, pageOrigin }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const groups = [
    { kind: 'route', label: 'Console screens', hint: 'The console itself, chrome-less, in a view' },
    { kind: 'widget', label: 'Widgets', hint: 'Light native views' },
    { kind: 'web', label: 'Web apps', hint: 'Sandboxed iframes; partners link over postMessage' },
  ];

  function add(e) {
    e.preventDefault();
    try {
      onAdd(makeCustomApp({ title, url }, pageOrigin));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Launch app" subtitle="App directory — screens, widgets and framed web apps" onClose={onClose} width={760}>
      {groups.map((g) => (
        <div key={g.kind} className="appdir-sec">
          <div className="menu-lbl">{g.label} <span className="muted">· {g.hint}</span></div>
          <div className="appdir">
            {apps.filter((a) => a.kind === g.kind).map((a) => (
              <div key={a.appId} className="appdir-card" role="button" tabIndex={0} onClick={() => onLaunch(a)}
                onKeyDown={(e) => { if (e.key === 'Enter') onLaunch(a); }}>
                <span className="ph-ico"><Icon name={a.icon} size={16} /></span>
                <div className="appdir-txt">
                  <b>{a.title}</b>
                  <span>{a.desc}</span>
                </div>
                {a.custom && (
                  <button type="button" className="np-ic" title="Remove from directory"
                    onClick={(e) => { e.stopPropagation(); onRemove(a.appId); }}><Icon name="trash" size={13} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <form className="appdir-add" onSubmit={add}>
        <div className="menu-lbl">Add a web app <span className="muted">· any http(s) URL or same-origin path; sites that forbid framing stay blank</span></div>
        <div className="appdir-form">
          <input className="inp" placeholder="Title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} aria-label="App title" />
          <input className="inp" placeholder="https://partner.example/screen" value={url} onChange={(e) => { setUrl(e.target.value); setError(null); }} aria-label="App URL" />
          <button className="btn" type="submit"><Icon name="plus" size={14} /> Add &amp; launch</button>
        </div>
        {error && <p className="sec" style={{ color: 'var(--fail)', margin: '6px 0 0' }}>{error}</p>}
      </form>
    </Modal>
  );
}
