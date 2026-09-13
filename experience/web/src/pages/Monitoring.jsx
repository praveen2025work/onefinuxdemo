import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fetchSink } from '../api';
import { useStream } from '../useStream';
import { Loading } from '../components/bits.jsx';
import InfoHint from '../components/InfoHint.jsx';

const OUTBOX_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'FAILED', label: 'Failed' },
];

const OUTBOX_TONE = { DISPATCHED: 'ok', PENDING: 'warn', FAILED: 'fail' };

function Pill({ status, tone }) {
  return <span className={'pill ' + (tone || 'plain')}><span className="dot" />{status}</span>;
}

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

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Observability</div>
          <h1 className="ph-title">Monitoring &amp; propagation
            <InfoHint title="Received · persisted · propagated · audited">
              Every fact the hub receives is stored append-only in the event store, then fanned out to other
              systems through a transactional outbox (at-least-once, subscribers de-dupe on event id). This
              screen shows what arrived, how it persisted, where it was propagated, and the audit trail of
              human commands.
            </InfoHint>
          </h1>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" onClick={() => load()}>↻ Refresh</button>
        </div>
      </div>

      <div className="grid g5" style={{ marginBottom: 16 }}>
        <div className="stat info"><div className="lbl">Events received</div><div className="num">{ev.total ?? 0}</div><div className="foot">persisted to event store</div></div>
        <div className="stat ok"><div className="lbl">Propagated</div><div className="num">{ob.dispatched ?? 0}</div><div className="foot">delivered to subscribers</div></div>
        <div className="stat warn"><div className="lbl">Outbox pending</div><div className="num">{ob.pending ?? 0}</div><div className="foot">awaiting relay</div></div>
        <div className={'stat' + ((ob.failed ?? 0) > 0 ? ' fail' : '')}><div className="lbl">Outbox failed</div><div className="num">{ob.failed ?? 0}</div><div className="foot">needs retry</div></div>
        <div className={'stat' + ((overview.deadLetters ?? 0) > 0 ? ' fail' : '')}><div className="lbl">Dead letters</div><div className="num">{overview.deadLetters ?? 0}</div><div className="foot">held for RTB replay</div></div>
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
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Event</th><th>Subscriber</th><th>Route</th><th className="num">Try</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {outbox.map((o) => (
                    <tr key={o.outboxId}>
                      <td><div className="mono lead">{o.eventId}</div><div className="sec mono">{o.eventType}{o.sourceId ? ' · ' + o.sourceId : ''}</div></td>
                      <td><span className="chip">{o.subscriber}</span></td>
                      <td className="sec mono">{o.routeId}</td>
                      <td className="num">{o.attempts}</td>
                      <td><Pill status={o.status} tone={OUTBOX_TONE[o.status]} />{o.lastError && <div className="sec" style={{ color: 'var(--fail)' }}>{o.lastError}</div>}</td>
                      <td>{o.status === 'FAILED' && <button className="btn ghost sm" disabled={busy === o.outboxId} onClick={() => retry(o.outboxId)}>Retry</button>}</td>
                    </tr>
                  ))}
                  {outbox.length === 0 && <tr><td colSpan={6} className="empty">No propagation yet. Drive the FOBO demo to fan out facts.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>Live event tape
                <InfoHint title="Received events">The append-only event store, newest first. This is the immutable record of every business fact received from source systems.</InfoHint>
              </h2>
              <span className="hint">event_store</span>
            </div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Received</th><th>Source</th><th>Event</th><th>Key</th><th>Status</th></tr></thead>
                <tbody>
                  {tape.map((e) => (
                    <tr key={e.eventId}>
                      <td className="sec mono">{clock(e.receivedAt)}</td>
                      <td><span className="chip">{e.sourceSystem}</span></td>
                      <td className="sec">{e.eventType}</td>
                      <td className="mono sec">{e.sourceKey}</td>
                      <td><Pill status={e.status} tone={eventTone(e.status)} /></td>
                    </tr>
                  ))}
                  {tape.length === 0 && <tr><td colSpan={5} className="empty">No events received yet.</td></tr>}
                </tbody>
              </table>
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
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Subscriber</th><th>Matches</th><th className="num">Delivered</th></tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.routeId}>
                      <td><div className="lead">{r.subscriber}</div><div className="sec">{r.description}</div></td>
                      <td className="sec mono">{(r.eventType || '*')}{r.sourceId ? ' · ' + r.sourceId : ' · *'}</td>
                      <td className="num">{r.delivered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>Other systems received
                <InfoHint title="Downstream sink">The simulator stands in for downstream systems (archive, Finance Store, P&amp;L feed). Each row is a fact it accepted over a real HTTP hop from the hub's relay.</InfoHint>
              </h2>
              <span className="hint">{sink.count} received</span>
            </div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Received</th><th>System</th><th>Event</th></tr></thead>
                <tbody>
                  {(sink.received || []).slice(0, 12).map((r) => (
                    <tr key={r.subscriber + r.id}>
                      <td className="sec mono">{clock(r.receivedAt)}</td>
                      <td><span className="chip">{r.subscriber}</span></td>
                      <td className="sec">{r.eventType}<div className="sec mono">{r.sourceKey}</div></td>
                    </tr>
                  ))}
                  {(sink.received || []).length === 0 && <tr><td colSpan={3} className="empty">No downstream deliveries yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-hd">
              <h2>By source
                <InfoHint title="Ingest by origin">Volume received per source system, with the most recent arrival.</InfoHint>
              </h2>
            </div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Source</th><th className="num">Events</th><th>Last</th></tr></thead>
                <tbody>
                  {bySource.map((s) => (
                    <tr key={s.sourceSystem}>
                      <td><span className="chip">{s.sourceSystem}</span></td>
                      <td className="num">{s.n}</td>
                      <td className="sec mono">{clock(s.lastReceivedAt)}</td>
                    </tr>
                  ))}
                  {bySource.length === 0 && <tr><td colSpan={3} className="empty">No events yet.</td></tr>}
                </tbody>
              </table>
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
        <div className="panel-bd tight">
          <table className="tbl">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th><th>Decision</th><th>Detail</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="sec mono">{clock(a.at)}</td>
                  <td className="mono">{a.actor}</td>
                  <td><span className="chip">{a.action}</span></td>
                  <td className="mono sec">{a.resource || '—'}</td>
                  <td>{a.decision ? <Pill status={a.decision} tone={a.decision === 'OK' ? 'ok' : a.decision === 'DENY' ? 'fail' : 'plain'} /> : '—'}</td>
                  <td className="sec mono" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detailJson || ''}</td>
                </tr>
              ))}
              {audit.length === 0 && <tr><td colSpan={6} className="empty">No commands recorded yet. Sign off or escalate an outcome to populate the trail.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
