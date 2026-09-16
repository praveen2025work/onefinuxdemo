import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading, PageTitle, formatAmount } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';

const labelOf = (verb) => verb.split(/[_\s]+/).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
const RICH = ['SIGN_OFF', 'POST', 'ESCALATE', 'ADJUST', 'COUNTERSIGN'];

export default function InstanceDetail() {
  const { id } = useParams();
  const instanceId = decodeURIComponent(id);
  const { refreshInstances } = useApp();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setDetail(await api.instance(instanceId)); }
    catch (e) { setError(e.message); }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  async function act(kind) {
    setBusy(true); setBanner(null);
    try {
      if (kind === 'signoff') { await api.signoff(instanceId); setBanner({ cls: 'ok', text: 'Owner signed — waiting on GLA countersign (SIGNED).' }); }
      if (kind === 'countersign') { await api.action(instanceId, 'COUNTERSIGN'); setBanner({ cls: 'ok', text: 'Countersigned — instance CLEARED.' }); }
      if (kind === 'post') { const r = await api.post(instanceId); setBanner({ cls: 'ok', text: `Posted to MOTIF via FAS — command_run ${r.runId}, echo required before CLEARED.` }); }
      if (kind === 'adjust') { const r = await api.action(instanceId, 'ADJUST'); setBanner({ cls: 'ok', text: `Adjust commanded to Motif — run ${r.runId}. Echo flips the failed key.` }); }
      if (kind === 'escalate') { const r = await api.escalate(instanceId, 'Manual escalation from console'); setBanner({ cls: 'warn', text: `Escalation ${r.escalationId} raised to RTB.` }); }
      if (kind.startsWith('generic:')) { const verb = kind.slice(8); await api.action(instanceId, verb); setBanner({ cls: 'ok', text: `${labelOf(verb)} recorded — workflow fact WORKFLOW_${verb} published.` }); }
      await load();
      await refreshInstances();
    } catch (e) {
      setBanner({ cls: 'fail', text: e.message });
    } finally { setBusy(false); }
  }

  if (error) return <div className="panel"><div className="panel-bd"><div className="banner fail"><div><b>404 — not found</b><span className="mono-sm">{instanceId}</span></div></div><p className="muted">Entitlement is fail-closed: an unentitled or unknown instance returns 404, never 403. <Link to="/">Back to home</Link>.</p></div></div>;
  if (!detail) return <Loading what="Loading instance…" />;

  const i = detail.instance;
  const isReady = i.status === 'READY';
  const isBlocked = i.status === 'BLOCKED';
  const isSigned = i.status === 'SIGNED';
  const actions = (i.userActions || '').split(',').map((s) => s.trim()).filter(Boolean);
  const dual = actions.includes('COUNTERSIGN');
  const canAdjust = actions.includes('ADJUST') && (isBlocked || isReady);
  const amount = formatAmount(i.amount);
  const hasItem = i.account || i.journalId || amount || i.fsLine;
  const why = !isReady && actions.includes('SIGN_OFF') && !isSigned
    ? `Sign off needs READY. This instance is ${i.status}${isBlocked && i.namedBlocker ? ` on ${i.namedBlocker}` : ''}.`
    : isSigned
      ? `Owner ${i.signedBy || 'signed'}. Countersign as a different actor (GLA).`
      : null;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">{i.groupUnitId} · {i.kitId} · COB {i.cobDate} · {i.region}</div>
          <PageTitle icon="cards">{i.sliceKey} <StatusPill status={i.status} /></PageTitle>
          <p className="sub">{i.question}</p>
        </div>
        <div className="ph-side">
        <div className="ph-actions">
          {actions.includes('ADJUST') && <button className="btn" disabled={busy || !canAdjust} onClick={() => act('adjust')}><Icon name="refresh" size={15} /> Adjust</button>}
          {actions.includes('SIGN_OFF') && <button className="btn" disabled={busy || !isReady} onClick={() => act('signoff')}><Icon name="check" size={15} /> Sign off</button>}
          {actions.includes('COUNTERSIGN') && <button className="btn" disabled={busy || !isSigned} onClick={() => act('countersign')}><Icon name="check" size={15} /> Countersign</button>}
          {actions.includes('POST') && <button className="btn ghost" disabled={busy || !isReady} onClick={() => act('post')}><Icon name="share" size={15} /> Post to MOTIF</button>}
          {actions.filter((a) => a && !RICH.includes(a)).map((a) => (
            <button key={a} className="btn ghost" disabled={busy} onClick={() => act('generic:' + a)}>{labelOf(a)}</button>
          ))}
          <button className="btn ghost" disabled={busy} onClick={() => act('escalate')}><Icon name="alert" size={15} /> Escalate</button>
        </div>
        {why && <p className="act-why"><Icon name="info" size={13} /> {why}</p>}
        </div>
      </div>

      {banner && <div className={'banner ' + banner.cls} style={{ marginBottom: 16 }}><div><b>{banner.text}</b></div></div>}
      {isBlocked && <div className="banner fail" style={{ marginBottom: 16 }}><div><b>Blocked — {i.namedBlocker}</b><span className="mono-sm">A FAILED required key holds the fold. Adjust or revoke it to proceed.</span></div></div>}
      {dual && isSigned && <div className="banner info" style={{ marginBottom: 16 }}><div><b>Awaiting GLA countersign</b><span className="mono-sm">Act as a different user than {i.signedBy}.</span></div></div>}

      <div className="split">
        <div>
          {hasItem && (
            <div className="panel">
              <div className="panel-hd"><h2>Accounting item</h2><span className="hint">event attributes on the instance</span></div>
              <div className="panel-bd stack">
                <div className="row"><span className="muted">Account</span><span className="mono">{i.account || '—'}</span></div>
                <div className="row"><span className="muted">Journal</span><span className="mono">{i.journalId || '—'}</span></div>
                <div className="row"><span className="muted">Amount</span><span className="mono money">{amount || '—'}</span></div>
                <div className="row"><span className="muted">FS line</span><span>{i.fsLine || '—'}</span></div>
              </div>
            </div>
          )}
          <div className="panel">
            <div className="panel-hd"><h2>Readiness fold</h2><span className="hint">distinct (instance, source, key)</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Source</th><th>Key</th><th>Status</th><th>Required</th><th>Last event</th></tr></thead>
                <tbody>
                  {detail.keys.map((k) => (
                    <tr key={k.sourceId + k.sourceKey}>
                      <td><span className="lead mono">{k.sourceId}</span><div className="sec">{k.sourceName}</div></td>
                      <td className="mono">{k.sourceKey}</td>
                      <td><StatusPill status={k.keyStatus} /></td>
                      <td>{k.required === 'Y' ? 'Yes' : 'No'}</td>
                      <td className="mono sec">{k.lastEventId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2>Facts for this instance</h2><span className="hint">event_store</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Time</th><th>Source</th><th>Type</th><th>Key</th><th>Status</th><th>Offset</th></tr></thead>
                <tbody>
                  {detail.events.map((e) => (
                    <tr key={e.eventId}>
                      <td className="mono sec">{(e.occurredAt || '').slice(11, 19)}</td>
                      <td className="mono">{e.sourceSystem}</td>
                      <td className="sec">{e.eventType}</td>
                      <td className="mono">{e.sourceKey}</td>
                      <td><StatusPill status={e.status} /></td>
                      <td className="mono sec">{e.ingestOffset || '—'}</td>
                    </tr>
                  ))}
                  {detail.events.length === 0 && <tr><td colSpan={6} className="empty">No facts yet — drive the simulator.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Destinations</h2><span className="hint">kit_destination</span></div>
            <div className="panel-bd stack">
              {detail.destinations.map((d) => (
                <div key={d.destId} className="row">
                  <span className="chip">step {d.stepOrder}</span>
                  <b>{d.destId}</b>
                  <span className="muted" style={{ marginLeft: 'auto' }}>{d.echoOk === 'Y' ? '✓ echoed' : d.actionType}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-hd"><h2>Partner surface</h2><span className="hint">kit_embed</span></div>
            <div className="panel-bd stack">
              <div className="row"><span className="muted">renderer</span><span className="chip">{i.renderer}</span></div>
              <div className="row"><span className="muted">run</span><span className="mono">{i.runId || 'pending'}</span></div>
              {i.signedBy && <div className="row"><span className="muted">signed by</span><span className="mono">{i.signedBy}</span></div>}
              <div className="wrapflex"><a className="btn ghost sm" href={i.embedUrl} target="_blank" rel="noreferrer"><Icon name="open" size={13} /> Open partner screen</a><span className="mono sec">{i.embedUrl}</span></div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Heavy screens stay with the owner and are framed with the shared theme — not cloned here.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
