import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fetchSink } from '../api';
import { useStream } from '../useStream';
import { Loading, PageTitle, Stat } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import DataGrid from '../components/DataGrid.jsx';

const OUTBOX_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'FAILED', label: 'Failed' },
];

const OUTBOX_TONE = { DISPATCHED: 'ok', PENDING: 'warn', FAILED: 'fail' };

function clock(ts) {
  if (!ts) return '—';
  const s = String(ts).replace('T', ' ');
  return s.length >= 19 ? s.slice(0, 19) : s;
}

function eventTone(status) {
  if (status === 'FAILED' || status === 'REJECTED') return 'fail';
  if (status === 'COMPLETED' || status === 'POSTED' || status === 'CLEARED') return 'ok';
  return 'info';
}

export default function Monitoring() {
  const [overview, setOverview] = useState(null);
  const [outbox, setOutbox] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [tape, setTape] = useState([]);
  const [audit, setAudit] = useState([]);
  const [sink, setSink] = useState({ count: 0, received: [] });
  const [outFilter, setOutFilter] = useState('');
  const [busy, setBusy] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const [ov, ob, rt, tp, ad] = await Promise.all([
      api.monitorOverview(), api.outbox(outFilter || undefined), api.routes(), api.tape(40), api.audit(60),
    ]);
    setOverview(ov);
    setOutbox(ob);
    setRoutes(rt);
    setTape(tp);
    setAudit(ad);
    try { setSink(await fetchSink()); } catch { /* sink offline — leave last snapshot */ }
  }, [outFilter]);

  useEffect(() => { load(); }, [load]);

  // Steady 3s poll so counters and the sink panel stay fresh even between SSE nudges.
  useEffect(() => {
    timer.current = setInterval(load, 3000);
    return () => clearInterval(timer.current);
  }, [load]);

  // Live nudges: any new fact or propagation dispatch refreshes immediately.
  useStream({
    event: () => load(),
    propagation: () => load(),
    outcome: () => load(),
    reset: () => load(),
  });

  async function retry(id) {
    setBusy(id);
    try { await api.retryOutbox(id); await load(); } finally { setBusy(null); }
  }

  if (!overview) return <Loading what="Loading monitoring…" />;

  const ev = overview.events || {};
  const ob = overview.outbox || {};
  const byStatus = ev.byStatus || [];
  const bySource = ev.bySource || [];
  const subscribers = overview.subscribers || [];
  const routeRows = routes.map((r) => ({ ...r, matches: `${r.eventType || '*'} · ${r.sourceId || '*'}` }));

  // The standard grid for every list on this screen: filter, sort, search and CSV come with it.
  const outboxColumns = [
    { binding: 'eventId', header: 'Event', minWidth: 170, mono: true },
    { binding: 'eventType', header: 'Type', minWidth: 140 },
    { binding: 'subscriber', header: 'Subscriber', width: 140, chip: true },
    { binding: 'routeId', header: 'Route', width: 130, mono: true },
    { binding: 'attempts', header: 'Try', width: 60, align: 'right' },
    { binding: 'status', header: 'Status', width: 120, pill: true, tone: (v) => OUTBOX_TONE[v] },
    { binding: 'lastError', header: 'Last error', minWidth: 140 },
    { binding: null, header: '', width: 84, sortable: false, template: (o) => (o.status === 'FAILED'
      ? <button className="btn ghost sm" disabled={busy === o.outboxId} onClick={() => retry(o.outboxId)}>Retry</button>
      : null) },
  ];
  const tapeColumns = [
    { binding: 'receivedAt', header: 'Received', width: 170, mono: true, template: (e) => <span className="mono sec">{clock(e.receivedAt)}</span> },
    { binding: 'sourceSystem', header: 'Source', width: 120, chip: true },
    { binding: 'eventType', header: 'Event', minWidth: 160 },
    { binding: 'sourceKey', header: 'Key', minWidth: 120, mono: true },
    { binding: 'status', header: 'Status', width: 120, pill: true, tone: eventTone },
  ];
  const routeColumns = [
    { binding: 'subscriber', header: 'Subscriber', minWidth: 140, template: (r) => (
      <div className="cell-2l"><span className="lead">{r.subscriber}</span><span className="sec">{r.description}</span></div>) },
    { binding: 'matches', header: 'Matches', minWidth: 140, mono: true },
    { binding: 'delivered', header: 'Delivered', width: 92, align: 'right' },
  ];
  const sinkColumns = [
    { binding: 'receivedAt', header: 'Received', width: 160, template: (r) => <span className="mono sec">{clock(r.receivedAt)}</span> },
    { binding: 'subscriber', header: 'System', width: 120, chip: true },
    { binding: 'eventType', header: 'Event', minWidth: 140 },
    { binding: 'sourceKey', header: 'Key', minWidth: 100, mono: true },
  ];
  const sourceColumns = [
    { binding: 'sourceSystem', header: 'Source', minWidth: 120, chip: true },
    { binding: 'n', header: 'Events', width: 80, align: 'right' },
    { binding: 'lastReceivedAt', header: 'Last', minWidth: 150, template: (x) => <span className="mono sec">{clock(x.lastReceivedAt)}</span> },
  ];
  const auditColumns = [
    { binding: 'at', header: 'When', width: 170, template: (a) => <span className="mono sec">{clock(a.at)}</span> },
    { binding: 'actor', header: 'Actor', width: 140, mono: true },
    { binding: 'action', header: 'Action', width: 150, chip: true },
    { binding: 'resource', header: 'Resource', minWidth: 160, mono: true },
    { binding: 'decision', header: 'Decision', width: 100, pill: true, tone: (v) => (v === 'OK' ? 'ok' : v === 'DENY' ? 'fail' : 'plain') },
    { binding: 'detailJson', header: 'Detail', minWidth: 200, mono: true },
  ];

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Observability</div>
          <PageTitle icon="activity">Monitoring &amp; propagation
            <InfoHint title="Received · persisted · propagated · audited">
              Every fact the hub receives is stored append-only in the event store, then fanned out to other
              systems through a transactional outbox (at-least-once, subscribers de-dupe on event id). This
              screen shows what arrived, how it persisted, where it was propagated, and the audit trail of
              human commands.
            </InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" onClick={() => load()}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
      </div>

      <div className="stats">
        <Stat tone="info" icon="inbox" label="Events received" value={ev.total ?? 0} foot="persisted to event store" />
        <Stat tone="ok" icon="share" label="Propagated" value={ob.dispatched ?? 0} foot="delivered to subscribers" />
        <Stat tone="warn" icon="clock" label="Outbox pending" value={ob.pending ?? 0} foot="awaiting relay" />
        <Stat tone="fail" icon="alert" label="Outbox failed" value={ob.failed ?? 0} foot="needs retry" />
        <Stat tone="fail" icon="warning" label="Dead letters" value={overview.deadLetters ?? 0} foot="held for RTB replay" />
      </div>

      <div className="split">
        <div>
          <div className="panel">
            <div className="panel-hd">
              <h2>Propagation outbox
                <InfoHint title="Transactional outbox">One row per fact × matching route. The relay POSTs each PENDING row to the subscriber over HTTP, marks it DISPATCHED, and broadcasts a live update. FAILED rows can be requeued.</InfoHint>
              </h2>
              <div className="seg">
                {OUTBOX_FILTERS.map((f) => (
                  <button key={f.value} className={outFilter === f.value ? 'on' : ''} onClick={() => setOutFilter(f.value)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="panel-bd">
              <DataGrid rows={outbox} columns={outboxColumns} height="auto" maxHeight={400} exportName="outbox"
                empty="No propagation yet. Drive the FOBO demo to fan out facts." />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>Live event tape
                <InfoHint title="Received events">The append-only event store, newest first. This is the immutable record of every business fact received from source systems.</InfoHint>
              </h2>
              <span className="hint">event_store</span>
            </div>
            <div className="panel-bd">
              <DataGrid rows={tape} columns={tapeColumns} height="auto" maxHeight={420} exportName="event-tape" empty="No events received yet." />
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd">
              <h2>Routes
                <InfoHint title="Fan-out registry">Admin-governed rules. A route with no event type or source is a wildcard (every fact). Delivered counts every outbox row the route has produced.</InfoHint>
              </h2>
              <span className="hint">{routes.length} · {subscribers.length} systems</span>
            </div>
            <div className="panel-bd">
              <DataGrid rows={routeRows} columns={routeColumns} height="auto" maxHeight={320} rowHeight={50} toolbar={false} empty="No routes." />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>Other systems received
                <InfoHint title="Downstream sink">The simulator stands in for downstream systems (archive, Finance Store, P&amp;L feed). Each row is a fact it accepted over a real HTTP hop from the hub's relay.</InfoHint>
              </h2>
              <span className="hint">{sink.count} received</span>
            </div>
            <div className="panel-bd">
              <DataGrid rows={sink.received || []} columns={sinkColumns} height="auto" maxHeight={320} toolbar={false} empty="No downstream deliveries yet." />
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>By source
                <InfoHint title="Ingest by origin">Volume received per source system, with the most recent arrival.</InfoHint>
              </h2>
            </div>
            <div className="panel-bd">
              <DataGrid rows={bySource} columns={sourceColumns} height="auto" maxHeight={280} toolbar={false} empty="No events yet." />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-hd">
          <h2>Audit log
            <InfoHint title="Who did what, when">Append-only record of human commands — sign-off, publish, escalate, kit registration, saved views, replays. Each row captures the actor, action, target, decision and detail.</InfoHint>
          </h2>
          <span className="hint">audit_log</span>
        </div>
        <div className="panel-bd">
          <DataGrid rows={audit} columns={auditColumns} height="auto" maxHeight={460} exportName="audit-log"
            empty="No commands recorded yet. Sign off or escalate an outcome to populate the trail." />
        </div>
      </div>
    </>
  );
}
