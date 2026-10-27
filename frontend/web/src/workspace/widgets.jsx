import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import DataView from '../components/DataView.jsx';
import { useApp } from '../store.jsx';
import { recentLive, subscribeLive } from '../live/liveLink.js';
import { useLiveStatus } from '../useStream.js';
import { channelById, contextLabel, instanceContext, isValidContext } from './channels.js';
import { broadcastContext, onAnyContext } from './interop.js';
import { channelInfo, cleanSubject, feedItem, matchesSubject, mergeFeed } from './desks.js';
import { activityApi } from '../api.js';
import SpecGrid from '../grid/SpecGrid.jsx';
import ChatFrame from '../chat/ChatFrame.jsx';
import { uxConfig } from '../ux/experiments.js';
import { paramContext } from '../grid/spec.js';
import { useGridSpec } from '../grid/useGridSpec.js';
import { EMBED, framedByOtherOrigin } from '../embed.js';

/** The origin of the page that frames this document, when it is another app (not the console itself). */
function embedderOrigin() {
  if (!EMBED || window.parent === window) return null;
  try {
    const origin = new URL(document.referrer).origin;
    return origin !== window.location.origin ? origin : null;
  } catch {
    return null;
  }
}

const FEED_TONE = { notification: 'warn', outcome: 'info', event: 'plain', kit: 'bo', reset: 'fail', propagation: 'ok', hello: 'ok' };

function summarize(name, d) {
  if (!d || typeof d !== 'object') return String(d ?? '');
  if (name === 'notification') return `${d.title || 'Notification'} — ${d.message || ''}`;
  if (name === 'outcome') return [d.name || d.key, d.status, d.region, d.cobDate].filter(Boolean).join(' · ');
  if (name === 'event') return [d.sourceSystem, d.eventType, d.sourceKey, d.status].filter(Boolean).join(' · ');
  if (name === 'hello') return `connected · ${d.transport || ''} · ${d.clients ?? '?'} client(s)`;
  if (name === 'kit') return [d.kitId, d.action || d.change].filter(Boolean).join(' · ') || 'kit changed';
  if (name === 'propagation') return [d.subscriber, d.status, d.eventId].filter(Boolean).join(' · ');
  return JSON.stringify(d).slice(0, 140);
}

/** Every hub event as it lands on the socket. The WebSocket, on screen. */
export function LiveFeed() {
  const status = useLiveStatus();
  const [rows, setRows] = useState(() => recentLive().events.slice(0, 80));
  const [paused, setPaused] = useState(false);
  const [only, setOnly] = useState('all');

  useEffect(() => subscribeLive((name, data) => {
    if (paused) return;
    setRows((prev) => [{ id: Date.now() + Math.random(), name, data, at: Date.now() }, ...prev].slice(0, 80));
  }), [paused]);

  const counts = rows.reduce((acc, r) => { acc[r.name] = (acc[r.name] || 0) + 1; return acc; }, {});
  const shown = only === 'all' ? rows : rows.filter((r) => r.name === only);

  return (
    <div className="wg">
      <div className="wg-bar">
        <span className="live-pill"><span className={'live-dot' + (status.live ? '' : ' off')} />
          {status.live ? `${status.transport === 'ws' ? 'WebSocket' : 'SSE'} · ${status.role}` : 'reconnecting'}</span>
        <div className="seg sm">
          {['all', 'notification', 'outcome', 'event'].map((k) => (
            <button key={k} className={only === k ? 'on' : ''} onClick={() => setOnly(k)}>{k}{k !== 'all' && counts[k] ? ` ${counts[k]}` : ''}</button>
          ))}
        </div>
        <div className="spacer" />
        <button type="button" className="btn ghost sm" onClick={() => setPaused((p) => !p)}>
          <Icon name={paused ? 'play' : 'clock'} size={12} /> {paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="feed">
        {shown.length === 0 && <div className="empty sm">Waiting for the hub… drive a scenario or send a test notification from Drive.</div>}
        {shown.map((r) => (
          <div key={r.id} className="feed-row">
            <span className="mono feed-t">{new Date(r.at).toLocaleTimeString('en-GB')}</span>
            <span className={'pill ' + (FEED_TONE[r.name] || 'plain')}>{r.name}</span>
            <span className="feed-s">{summarize(r.name, r.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const INSTANCE_COLUMNS = [
  { binding: 'kitId', header: 'Kit', width: 110 },
  { binding: 'sliceKey', header: 'Instance', width: 100 },
  { binding: 'region', header: 'Region', width: 80 },
  { binding: 'status', header: 'Status', width: 110, pill: true },
  { binding: 'readiness', header: 'Keys', width: 70, align: 'right' },
  { binding: 'namedBlocker', header: 'Blocker', minWidth: 140 },
  { binding: 'amount', header: 'Amount', width: 120, format: 'n0', align: 'right' },
  { binding: 'openEscalations', header: 'Esc.', width: 60, align: 'right' },
];

/** Wijmo FlexGrid of the unit. Selecting a row shares it on the view's link channel. */
export function InstanceGrid({ view }) {
  const { instances, filters } = useApp();
  const [shared, setShared] = useState(null);
  const rows = useMemo(() => instances.map((i) => ({
    ...i,
    readiness: `${i.completedKeys}/${i.totalKeys}`,
    amount: i.amount == null || i.amount === '' ? null : Number(i.amount),
  })), [instances]);
  const chan = channelById(view?.channel);

  function onSelect(item) {
    if (!item?.instanceId) return;
    if (broadcastContext(instanceContext(item), { channel: view?.channel, source: view?.id })) setShared(item.sliceKey);
  }

  return (
    <div className="wg">
      <div className="wg-note">
        {chan
          ? <>Select a row to share it on <i className="chan-dot" style={{ background: chan.color }} /> <b>{chan.label}</b>{shared ? <> · last shared <span className="mono">{shared}</span></> : null}</>
          : 'Not linked — pick a colour in the view header to drive other views.'}
      </div>
      <div className="wg-grid">
        <DataView rows={rows} columns={INSTANCE_COLUMNS} height="100%" onSelect={onSelect}
          title={`${filters.groupUnit} · ${filters.cobDate || '—'}`} exportName={`instances-${filters.cobDate || 'cob'}`}
          pivot={{ rowFields: ['region'], columnFields: ['status'], valueFields: ['amount'] }} chart={{ x: 'status', y: 'amount' }} />
      </div>
    </div>
  );
}

/** What views on this colour are sharing, newest first, plus a way to share a hand-written context. */
export function ContextInspector({ view, titles = {} }) {
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState('{\n  "type": "ofx.scope",\n  "region": "EMEA"\n}');
  const [err, setErr] = useState(null);
  const chan = channelById(view?.channel);

  useEffect(() => onAnyContext((msg) => {
    if (!view?.channel || msg.channel !== view.channel) return;
    setHistory((prev) => [{ ...msg, rid: msg.at + ':' + Math.random() }, ...prev].slice(0, 40));
  }), [view?.channel]);

  function share() {
    let ctx;
    try { ctx = JSON.parse(draft); } catch { setErr('Not valid JSON.'); return; }
    if (!isValidContext(ctx)) { setErr('A context needs a string "type".'); return; }
    setErr(null);
    if (!broadcastContext(ctx, { channel: view?.channel, source: view?.id })) setErr('Link this view to a colour first.');
  }

  const current = history[0];
  return (
    <div className="wg">
      <div className="wg-note">
        {chan ? <>Listening on <i className="chan-dot" style={{ background: chan.color }} /> <b>{chan.label}</b></> : 'Not linked — pick a colour to listen.'}
      </div>
      <div className="ctxi">
        <div className="ctxi-cur">
          <div className="menu-lbl">Current context</div>
          {current ? (
            <>
              <div className="row"><span className="chip">{current.context.type}</span><b>{contextLabel(current.context)}</b></div>
              <pre className="ctxi-json">{JSON.stringify(current.context, null, 2)}</pre>
              <div className="sec">from {titles[current.source] || current.source} · {new Date(current.at).toLocaleTimeString('en-GB')}</div>
            </>
          ) : <div className="empty sm">Nothing shared on this channel yet.</div>}
        </div>
        <div className="ctxi-hist">
          <div className="menu-lbl">History</div>
          {history.slice(1).map((h) => (
            <div key={h.rid} className="ctxi-row">
              <span className="mono feed-t">{new Date(h.at).toLocaleTimeString('en-GB')}</span>
              <span className="chip">{h.context.type}</span>
              <span className="feed-s">{contextLabel(h.context)}</span>
            </div>
          ))}
        </div>
        <div className="ctxi-send">
          <div className="menu-lbl">Share a context</div>
          <textarea className="inp mono" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
          <div className="row">
            <button type="button" className="btn sm" onClick={share} disabled={!chan}><Icon name="send" size={12} /> Broadcast</button>
            {err && <span className="sec" style={{ color: 'var(--fail)' }}>{err}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Any read-only grid, from a GridSpec (view.config.spec: a built-in id, outcome:<id>:<grid>, my:<id>, or an inline
 * spec; view.config.filter narrows it). Refetches on hub pushes; a row pick is shared on the view's channel.
 */
export function GridWidget({ view }) {
  const { filters } = useApp();
  const ref = view?.config?.spec || 'instances';
  const { spec, error, loading } = useGridSpec(ref, view?.config?.filter ? { filter: view.config.filter } : null);
  const chan = channelInfo(view?.channel, view?.config?.subject);
  const [shared, setShared] = useState(null);

  function share(ctx) {
    if (broadcastContext(ctx, { channel: view?.channel, source: view?.id })) setShared(contextLabel(ctx));
  }

  // Another team's app framing this grid hears each pick (posted to its origin only).
  function tellEmbedder(row) {
    const origin = embedderOrigin();
    if (!origin) return;
    const plain = Object.fromEntries(Object.entries(row || {}).filter(([k]) => !k.startsWith('_')));
    window.parent.postMessage({ type: 'ofx.grid.select', spec: spec?.id, row: plain }, origin);
  }

  return (
    <div className="wg">
      {spec?.share && (
        <div className="wg-note">
          {chan
            ? <>Pick a row to share it on <i className="chan-dot" style={{ background: chan.color }} /> <b>{chan.label}</b>
              {chan.shared ? ' — every browser on this outcome' : ''}{shared ? <> · shared <span className="mono">{shared}</span></> : null}</>
            : 'Not linked — pick a channel in the view header to drive other views.'}
        </div>
      )}
      <div className="wg-grid">
        {spec
          ? <SpecGrid spec={spec} context={paramContext(filters)} subscribe={subscribeLive} onShare={share}
            onSelect={embedderOrigin() ? tellEmbedder : undefined} height="100%" writeback={!framedByOtherOrigin()} />
          : <div className="empty sm">{loading ? 'Loading grid…' : error}</div>}
      </div>
    </div>
  );
}

const VERB_LABEL = { SIGN_OFF: 'signed off', COUNTERSIGN: 'countersigned', POST: 'posted', ADJUST: 'adjusted', ESCALATE: 'escalated',
  OVERRIDE: 'overrode', RERUN: 're-ran', NOTE: 'noted', SHARED: 'shared' };

function initials(name) {
  const parts = String(name || '?').replace(/[^A-Za-z. ]/g, ' ').split(/[\s.]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * Everything happening on this desk's outcome, from every screen, tab and browser: actions (sign-off, post, override,
 * re-run, partner actions) as the hub pushes them, notifications, and contexts shared on the desk's channel. A note
 * typed here reaches every desk on the same outcome.
 */
export function ActivityWidget({ view, desk }) {
  const subject = cleanSubject(view?.config?.subject || desk?.subject);
  const { notifications } = useApp();
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const subjectKey = subject ? `${subject.kind}:${subject.id}` : 'all';
  const keys = subject ? (subject.kind === 'outcome' ? { outcomeId: subject.id } : { kitId: subject.id }) : {};

  useEffect(() => {
    let alive = true;
    activityApi.recent({ ...keys, limit: 60 })
      .then((rows) => { if (alive) setItems((prev) => [...prev, ...rows.map((r) => feedItem('activity', r))]); })
      .catch(() => {});
    return () => { alive = false; };
  }, [subjectKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => subscribeLive((name, data) => {
    if (name === 'activity' && matchesSubject(subject, data)) setItems((prev) => [feedItem('activity', data), ...prev].slice(0, 150));
    if (name === 'reset') setItems([]);
  }), [subjectKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => onAnyContext((msg) => {
    if (!view?.channel || msg.channel !== view.channel || msg.source === view.id) return;
    setItems((prev) => [feedItem('context', msg), ...prev].slice(0, 150));
  }), [view?.channel, view?.id]);

  const feed = useMemo(() => mergeFeed([
    ...items,
    ...notifications.filter((n) => matchesSubject(subject, n)).map((n) => feedItem('notification', n)),
  ], 120), [items, notifications, subjectKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(e) {
    e.preventDefault();
    const summary = note.trim();
    if (!summary || !subject) return;
    setBusy(true);
    setErr(null);
    try {
      await activityApi.post({ action: 'NOTE', summary, ...keys, source: 'desk' });
      setNote('');
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wg">
      <div className="wg-note">
        {subject ? <>Actions on <b>{subject.name}</b> from every screen, tab and browser — live over the hub</> : 'Actions on every outcome — live over the hub'}
      </div>
      <div className="feed act-feed">
        {feed.length === 0 && <div className="empty sm">Nothing yet. Sign off, post or escalate an instance, or post a note below.</div>}
        {feed.map((it) => (
          <div key={it.id} className={'act-row ' + it.kind}>
            <span className="avatar xs" title={it.actor || 'One Finance'}>{it.actor ? initials(it.actor) : <Icon name="bell" size={10} />}</span>
            <div className="act-main">
              <div className="act-line">
                {it.actor && <b>{it.actor}</b>}
                <span className={'pill ' + it.tone}>{VERB_LABEL[it.verb] || String(it.verb || '').toLowerCase().replace(/_/g, ' ')}</span>
                {it.remote && <span className="chip" title="Shared from another browser">other browser</span>}
                <span className="mono feed-t">{new Date(it.at).toLocaleTimeString('en-GB')}</span>
              </div>
              <div className="act-text">{it.text}</div>
            </div>
          </div>
        ))}
      </div>
      {subject && (
        <form className="act-compose" onSubmit={post}>
          <input className="inp" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)}
            placeholder={`Note to everyone on ${subject.name}…`} aria-label="Post a note to this outcome" />
          <button type="submit" className="btn sm" disabled={busy || !note.trim()}><Icon name="send" size={12} /> Post</button>
        </form>
      )}
      {err && <div className="sec" style={{ color: 'var(--fail)', padding: '0 10px 8px' }}>{err}</div>}
    </div>
  );
}

/** The configured chatbot (onefinux.ux.chatbot) in a desk view. */
function ChatWidget() {
  const [chatbot, setChatbot] = useState(undefined);
  useEffect(() => { uxConfig().then((c) => setChatbot(c?.chatbot || null)); }, []);
  if (chatbot === undefined) return <div className="empty sm">Loading…</div>;
  if (!chatbot) return <div className="empty sm">No chatbot is configured (onefinux.ux.chatbot.url on the hub).</div>;
  return <div className="wg wg-chat"><ChatFrame chatbot={chatbot} /></div>;
}

export const WIDGETS = {
  'live-feed': LiveFeed,
  'instance-grid': InstanceGrid,
  context: ContextInspector,
  grid: GridWidget,
  activity: ActivityWidget,
  chat: ChatWidget,
};
