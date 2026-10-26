import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import DataView from '../components/DataView.jsx';
import { useApp } from '../store.jsx';
import { recentLive, subscribeLive } from '../live/liveLink.js';
import { useLiveStatus } from '../useStream.js';
import { channelById, contextLabel, instanceContext, isValidContext } from './channels.js';
import { broadcastContext, onAnyContext } from './interop.js';

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

export const WIDGETS = {
  'live-feed': LiveFeed,
  'instance-grid': InstanceGrid,
  context: ContextInspector,
};
