import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { StatusPill, Loading } from '../components/bits.jsx';

export default function Operations() {
  const [rtb, setRtb] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => setRtb(await api.rtb()), []);
  useEffect(() => { load(); }, [load]);

  async function replay(id) {
    setBusy(id);
    try { await api.replay(id); await load(); } finally { setBusy(null); }
  }

  if (!rtb) return <Loading what="Loading operations…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Run-the-bank support</div>
          <h1>Operations console</h1>
          <p className="sub">Escalations, feed watermarks and dead letters. Replay is dual-control. RTB never signs off a break or publishes a kit.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>Escalations</h2><span className="hint">escalation</span></div>
        <div className="panel-bd tight">
          <table className="tbl">
            <thead><tr><th>Escalation</th><th>Instance</th><th>Kind</th><th>Opened</th><th>Status</th></tr></thead>
            <tbody>
              {rtb.escalations.map((e) => (
                <tr key={e.escalationId}>
                  <td className="mono lead">{e.escalationId}</td>
                  <td className="mono sec">{e.sliceKey} · {e.region}</td>
                  <td><span className="chip">{e.kind}</span></td>
                  <td className="sec mono">{(e.openedAt || '').slice(0, 19)}</td>
                  <td><StatusPill status={e.status} /></td>
                </tr>
              ))}
              {rtb.escalations.length === 0 && <tr><td colSpan={5} className="empty">No escalations.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-hd"><h2>Dead letters</h2><span className="hint">dead_letter</span></div>
          <div className="panel-bd tight">
            <table className="tbl">
              <thead><tr><th>Id</th><th>Source</th><th>Reason</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rtb.deadLetters.map((d) => (
                  <tr key={d.deadLetterId}>
                    <td className="mono lead">{d.deadLetterId}</td>
                    <td><span className="chip">{d.sourceId}</span><div className="sec mono">{d.ingestOffset}</div></td>
                    <td className="sec">{d.reason}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td>{d.status === 'HOLD' && <button className="btn ghost sm" disabled={busy === d.deadLetterId} onClick={() => replay(d.deadLetterId)}>Replay</button>}</td>
                  </tr>
                ))}
                {rtb.deadLetters.length === 0 && <tr><td colSpan={5} className="empty">No dead letters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-hd"><h2>Feed watermarks</h2><span className="hint">feed_watermark</span></div>
          <div className="panel-bd tight">
            <table className="tbl">
              <thead><tr><th>Source</th><th>Partition</th><th>Offset</th><th className="num">Lag (s)</th></tr></thead>
              <tbody>
                {rtb.watermarks.map((w) => (
                  <tr key={w.sourceId + w.partitionId}>
                    <td className="mono lead">{w.sourceId}</td>
                    <td className="mono">{w.partitionId}</td>
                    <td className="mono sec">{w.lastOffset}</td>
                    <td className="num">{w.lagSeconds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
