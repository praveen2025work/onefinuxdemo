import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dropFeed, lifecycleApi } from '../api';
import { PageTitle } from '../components/bits.jsx';
import GuideNav from '../components/GuideNav.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';

const API_EXAMPLE = {
  eventId: 'CATS-TR-8812-20260912',
  eventType: 'TRADE_BOOKED',
  sourceSystem: 'CATS',
  sourceKey: 'TR-8812',
  cobDate: '2026-09-12',
  region: 'APAC',
  status: 'COMPLETED',
  occurredAt: '2026-09-12T20:14:03Z',
  attributes: { instanceId: 'FOBO|2026-09-12|APAC|R-1042' },
};

const FEED_EXAMPLE = {
  specversion: '1.0',
  id: 'MOTIF-MB014-20260912',
  source: 'motif',
  type: 'onefinux.fact.v1',
  time: '2026-09-12T20:14:03Z',
  datacontenttype: 'application/json',
  data: {
    eventType: 'LEDGER_REJECTED',
    sourceSystem: 'MOTIF',
    sourceKey: 'MB014',
    cobDate: '2026-09-12',
    region: 'EMEA',
    status: 'FAILED',
    attributes: { instanceId: 'FOBO|2026-09-12|EMEA|R-2031' },
  },
};

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

export default function Lifecycle() {
  const [walk, setWalk] = useState(null);
  const [tape, setTape] = useState([]);
  const [watch, setWatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async (id) => {
    const [w, t, s] = await Promise.all([
      lifecycleApi.walk(id),
      lifecycleApi.tape(),
      lifecycleApi.watch(),
    ]);
    setWalk(w);
    setTape(t);
    setWatch(s);
  }, []);

  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  async function onDrop() {
    setBusy(true);
    setErr(null);
    try {
      await dropFeed(FEED_EXAMPLE);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const steps = walk?.steps || [];
  const request = walk?.request;
  const saved = walk?.saved;
  const next = walk?.next;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Event start to end</div>
          <PageTitle icon="inbox">Event lifecycle
            <InfoHint title="Why this page">Questions land here: what request did we receive, how did we save it, and what state did it move. API POST and feed-folder files share one ingest.</InfoHint>
          </PageTitle>
          <p className="sub">Two contracts, one fold. POST /api/events uses inbound-event-v1. A JSON file in the inbox uses feed-event-v1 (or the same inbound body). Both append event_store then recompute stitch / engine state.</p>
        </div>
        <GuideNav />
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-hd"><h2>API contract · inbound-event-v1</h2><span className="pill info">POST /api/events</span></div>
          <div className="panel-bd">
            <p className="muted" style={{ marginTop: 0 }}>Required: eventType, sourceSystem, sourceKey, cobDate, region, status. Optional: eventId, occurredAt, attributes.</p>
            <pre className="life-json">{pretty(API_EXAMPLE)}</pre>
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h2>Feed contract · feed-event-v1</h2><span className="pill bo">inbox/*.json</span></div>
          <div className="panel-bd">
            <p className="muted" style={{ marginTop: 0 }}>CloudEvents 1.0. <span className="mono">data</span> is the same business payload. The watcher unwraps it and calls the same ingest as HTTP.</p>
            <pre className="life-json">{pretty(FEED_EXAMPLE)}</pre>
          </div>
        </div>
      </div>

      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div>
          <b>Drop a feed file</b>
          <span className="mono-sm"> Writes Motif LEDGER_REJECTED into {watch?.inbox || 'data/feeds/inbox'}, scans, then refreshes this walk. Same path as a producer copying a file.</span>
        </div>
        <button className="btn" disabled={busy} onClick={onDrop}>{busy ? 'Dropping…' : 'Drop feed file'}</button>
      </div>
      {err && <div className="banner fail" style={{ marginBottom: 16 }}>{err}</div>}

      <ol className="life-steps">
        {steps.map((s, i) => (
          <li key={s.id} className="life-step">
            <span className="life-n">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="panel-hd"><h2>Request we received</h2><span className={'pill ' + (walk?.channel === 'FEED' ? 'bo' : 'info')}>{walk?.channel || '—'}</span></div>
          <div className="panel-bd">
            {request ? <pre className="life-json">{pretty(request)}</pre> : <p className="muted">No event stored yet. Drive a scenario or drop a feed file.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h2>How it is saved</h2><span className="pill plain">{saved?.table || 'event_store'}</span></div>
          <div className="panel-bd">
            {saved ? (
              <dl className="life-dl">
                <dt>eventId</dt><dd className="mono">{saved.eventId}</dd>
                <dt>receivedAt</dt><dd className="mono">{saved.receivedAt}</dd>
                <dt>business id</dt><dd className="mono">{saved.businessIdType} / {saved.businessId}</dd>
                <dt>COB / region</dt><dd className="mono">{saved.cobDate} · {saved.region}</dd>
                <dt>status</dt><dd><span className={'pill ' + (saved.status === 'FAILED' ? 'fail' : 'ok')}>{saved.status}</span></dd>
              </dl>
            ) : <p className="muted">Nothing in event_store for this walk.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-hd"><h2>Next state</h2></div>
          <div className="panel-bd">
            <p style={{ marginTop: 0 }}>{next || '—'}</p>
            {walk?.stitch && (
              <p className="muted">Stitch instance <Link className="mono" to={'/instance/' + encodeURIComponent(walk.stitch.instanceId)}>{walk.stitch.instanceId}</Link> · {walk.stitch.status}</p>
            )}
            {Array.isArray(walk?.engine) && walk.engine.length > 0 && (
              <ul className="muted">
                {walk.engine.map((e) => (
                  <li key={e.outcomeId}>{e.outcomeId} · stage {e.stage} · {e.percent}%</li>
                ))}
              </ul>
            )}
            <p className="muted" style={{ marginBottom: 0 }}>Follow it on <Link to="/board">Board</Link> or <Link to="/reports">Reports</Link>.</p>
          </div>
        </div>
      </div>

      {tape.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-hd"><h2>Recent facts</h2><span className="hint">Pick one to walk</span></div>
          <div className="panel-bd" style={{ padding: 0 }}>
            <table className="life-tape">
              <thead>
                <tr><th>Channel</th><th>Type</th><th>Source</th><th>Key</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tape.map((row) => (
                  <tr key={row.eventId} className={walk?.eventId === row.eventId ? 'on' : ''}
                    onClick={() => load(row.eventId)}>
                    <td className="mono">{row.channel}</td>
                    <td className="mono">{row.eventType}</td>
                    <td className="mono">{row.sourceSystem}</td>
                    <td className="mono">{row.sourceKey}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
