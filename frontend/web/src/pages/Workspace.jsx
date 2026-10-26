import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { PageTitle } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import Select from '../components/Select.jsx';
import Modal from '../components/Modal.jsx';
import ChannelPicker from '../workspace/ChannelPicker.jsx';
import { WIDGETS } from '../workspace/widgets.jsx';
import { Control } from '@mescius/wijmo';
import { BUILTIN_APPS, appById, appForPath, appOrigin, makeCustomApp, viewSrc } from '../workspace/apps.js';
import { channelById, isValidContext, routeForContext } from '../workspace/channels.js';
import { BUILTIN_INTENTS, setWorkspaceHost } from '../workspace/fdc3.js';
import { subscribeLive } from '../live/liveLink.js';
import {
  LAYOUTS, WS_KEY, addView, createWorkspace, currentWorkspace, deleteWorkspace, loadState, moveView, newId,
  patchView, removeView, renameWorkspace, resizePair, setActive, setLayout, splitShares, switchWorkspace, toggleMaximized,
} from '../workspace/layout.js';
import { broadcastContext, onAnyContext, onSystem, postSystem } from '../workspace/interop.js';
import { partnerThemeParams } from '../lib/themes.js';
import { useInstallPrompt } from '../pwa.js';

const APPS_KEY = 'ofx-ws-apps';
// Live (WebSocket) events a partner frame may subscribe to through ofx-interop.js.
const PARTNER_LIVE_EVENTS = ['notification', 'outcome', 'event', 'context'];
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
 * Workspace — the OpenFin / Rainbow idea inside One Finance: several screens hosted in one UI, laid out as
 * grid, columns, rows or tabs, saved as named workspaces, torn out into their own windows and docked back.
 * Views on the same colour channel share context (pick a row in one, the others follow). Console screens run
 * as the same SPA in chrome-less iframes; partner web apps run sandboxed and join channels over postMessage.
 * All views share the shell's single live link (WebSocket), so a hub notification reaches every screen once.
 */
export default function Workspace() {
  const { filters, themeId, liveStatus } = useApp();
  const [state, setState] = useState(() => {
    try { return loadState(localStorage.getItem(WS_KEY)); } catch { return loadState(null); }
  });
  const [customApps, setCustomApps] = useState(loadCustomApps);
  const [launcher, setLauncher] = useState(false);
  const [naming, setNaming] = useState(null); // { mode: 'new' | 'copy' | 'rename', value }
  const [flash, setFlash] = useState({});
  const [dragId, setDragId] = useState(null);
  const [reloadTick, setReloadTick] = useState({});
  const [splits, setSplits] = useState([]);
  const [resizing, setResizing] = useState(false);
  const areaRef = useRef(null);
  const sectionRefs = useRef(new Map()); // viewId -> section element (splitter geometry)
  const { canInstall, standalone, install } = useInstallPrompt();

  const apps = useMemo(() => [...BUILTIN_APPS, ...customApps], [customApps]);
  const ws = currentWorkspace(state);
  const pageOrigin = window.location.origin;

  const wsRef = useRef(ws);
  wsRef.current = ws;
  const appsRef = useRef(apps);
  appsRef.current = apps;
  const frames = useRef(new Map()); // viewId -> iframe element
  const lastContext = useRef({}); // channel -> last context (FDC3: a channel keeps its current context)
  const domOrder = useRef(new Map()); // viewId -> first-seen index: DOM order never changes, so iframes never reload

  useEffect(() => {
    try { localStorage.setItem(WS_KEY, JSON.stringify(state)); } catch { /* quota / private window */ }
  }, [state]);
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
        const next = data.channel == null ? null : channelById(data.channel)?.id;
        if (data.channel == null || next) setChannel(view, next ?? null);
      } else if (data.type === 'ofx.subscribe' && typeof data.channel === 'string' && APP_CHANNEL.test(data.channel)) {
        if (!appSubs.current.has(view.id)) appSubs.current.set(view.id, new Set());
        appSubs.current.get(view.id).add(data.channel);
        const ctx = lastContext.current[data.channel];
        if (ctx) postToWeb(view, { type: 'ofx.context', channel: data.channel, context: ctx, source: 'replay' });
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
    const linked = ws.views.find((v) => v.channel)?.channel || null;
    setState((s) => addView(s, { id: newId(), appId: app.appId, title: app.title, channel: app.linkable ? linked : null }));
    setLauncher(false);
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
  const sized = ['columns', 'rows'].includes(ws.layout) && !ws.maximized;
  const tracks = ws.views.map((v) => `minmax(${ws.layout === 'columns' ? 240 : 160}px, ${v.size || 1}fr)`).join(' ');
  const sizedTracks = sized ? (ws.layout === 'columns' ? { gridTemplateColumns: tracks } : { gridTemplateRows: tracks }) : undefined;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Multi-screen container · installable app</div>
          <PageTitle icon="window">Workspace
            <InfoHint title="One UI, many screens" width={340}>
              Launch console screens, widgets and partner web apps side by side. Give views the same <b>link colour</b> and they
              share context: pick a row in the board and the instance viewer, grid and partner frame follow. Tear a view out into
              its own window and <b>Dock</b> it back. Every view rides the shell’s one WebSocket.
            </InfoHint>
          </PageTitle>
          <p className="sub">{ws.views.length} view{ws.views.length === 1 ? '' : 's'} · {usedChannels.length ? `linked on ${usedChannels.map((c) => channelById(c)?.label).join(', ')}` : 'no links yet'} · live over {liveStatus.live ? liveStatus.transport : '—'}</p>
        </div>
        <div className="ph-actions">
          {canInstall && !standalone && <button className="btn ghost" onClick={install}><Icon name="install" size={15} /> Install app</button>}
          <button className="btn" onClick={() => setLauncher(true)}><Icon name="plus" size={15} /> Launch app</button>
        </div>
      </div>

      <div className="ws-bar panel">
        <Select variant="header" caption="Workspace" icon="window" value={ws.id} minWidth={200}
          onChange={(id) => setState((s) => switchWorkspace(s, id))}
          options={state.workspaces.map((w) => ({ value: w.id, label: w.name }))} />
        <div className="ws-btns">
          <button className="btn ghost sm" onClick={() => setNaming({ mode: 'new', value: '' })}><Icon name="plus" size={13} /> New</button>
          <button className="btn ghost sm" onClick={() => setNaming({ mode: 'copy', value: ws.name + ' copy' })}><Icon name="save" size={13} /> Save as</button>
          <button className="btn ghost sm" onClick={() => setNaming({ mode: 'rename', value: ws.name })}><Icon name="config" size={13} /> Rename</button>
          <button className="btn ghost sm" onClick={() => setState((s) => deleteWorkspace(s))} disabled={state.workspaces.length <= 1}><Icon name="trash" size={13} /> Delete</button>
        </div>
        <div className="spacer" />
        <div className="seg">
          {LAYOUTS.map((l) => (
            <button key={l.id} className={ws.layout === l.id ? 'on' : ''} onClick={() => setState((s) => setLayout(s, l.id))} title={l.label + ' layout'}>
              <Icon name={l.icon} size={13} /> {l.label}
            </button>
          ))}
        </div>
      </div>

      {ws.layout === 'tabs' && ws.views.length > 0 && (
        <div className="ws-tabs" role="tablist">
          {ws.views.map((v) => {
            const chan = channelById(v.channel);
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
          <b>This workspace is empty</b>
          <span className="muted">Launch console screens, widgets or any web app and link them by colour.</span>
          <button className="btn" onClick={() => setLauncher(true)}><Icon name="plus" size={15} /> Launch app</button>
        </div></div>
      ) : (
        <div ref={areaRef} className={'ws-area ' + ws.layout + (ws.maximized ? ' has-max' : '') + (resizing ? ' resizing' : '')}
          style={sizedTracks}>
          {ordered.map((v) => {
            const app = appById(apps, v.appId);
            const chan = channelById(v.channel);
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
                  {app?.linkable && <ChannelPicker value={v.channel} onChange={(c) => setChannel(v, c)} compact />}
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
                  {app?.kind === 'widget' && WIDGETS[app.appId] && (() => { const W = WIDGETS[app.appId]; return <W view={v} titles={titles} />; })()}
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

      {naming && (
        <Modal title={naming.mode === 'rename' ? 'Rename workspace' : naming.mode === 'copy' ? 'Save workspace as' : 'New workspace'}
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
