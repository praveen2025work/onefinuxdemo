import { useEffect, useState, useCallback, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Loading, PageTitle, formatAmount } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import GenericGrid from '../components/GenericGrid.jsx';
import PartnerFrame from '../components/PartnerFrame.jsx';
import OutcomeGrids from '../components/OutcomeGrids.jsx';
import { outcomeForSurface } from '../lib/outcomeForSurface.js';

const labelOf = (verb) => verb.split(/[_\s]+/).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
const RICH = ['SIGN_OFF', 'POST', 'ESCALATE', 'ADJUST', 'COUNTERSIGN'];

function partnerViewLabel(renderer) {
  const token = String(renderer || 'Partner').split(/[_\s]+/)[0];
  return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()} partner view`;
}

export default function InstanceDetail() {
  const { id } = useParams();
  const instanceId = decodeURIComponent(id);
  const { refreshInstances, instances } = useApp();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openRef, setOpenRef] = useState(null);
  const [step, setStep] = useState(null);
  const [stepBusy, setStepBusy] = useState(false);
  const [defs, setDefs] = useState([]);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const listedStatus = instances.find((row) => row.instanceId === instanceId)?.status;

  const load = useCallback(async () => {
    setError(null);
    try { return await api.instance(instanceId).then((d) => { setDetail(d); return d; }); }
    catch (e) { setError(e.message); return null; }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    outcomesApi.definitions().then((rows) => { if (alive) setDefs(rows); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Board/SSE already refresh the instance list. Follow that status here so Adjust's Motif echo
  // flips this page to READY without a manual reload.
  useEffect(() => {
    if (!listedStatus || !detail) return;
    if (detail.instance.status === listedStatus) return;
    load();
  }, [listedStatus, detail, load]);

  async function waitForStatus(wanted, attempts = 20) {
    for (let i = 0; i < attempts; i += 1) {
      const next = await load();
      if (next && wanted.includes(next.instance.status)) return next;
      await new Promise((res) => setTimeout(res, 400));
    }
    return null;
  }

  async function loadStep(ref, { toggle = true } = {}) {
    if (!ref) return;
    if (toggle && openRef === ref) {
      setOpenRef(null);
      setStep(null);
      return;
    }
    setOpenRef(ref);
    setStepBusy(true);
    if ((detail?.destinations || []).some((d) => d.destId === ref)) setPartnerOpen(false);
    try { setStep(await api.stepView(instanceId, ref)); }
    catch (e) { setStep({ kind: 'NONE', ref, title: ref, error: e.message, columns: [], rows: [] }); }
    finally { setStepBusy(false); }
  }

  function closeStage() {
    setOpenRef(null);
    setStep(null);
  }

  function showStep(payload, ctx, { large = false } = {}) {
    if (!payload) return null;
    if (payload.kind === 'IFRAME') {
      return (
        <PartnerFrame
          url={payload.embedUrl}
          title={payload.title || 'Partner screen'}
          context={ctx}
          variant={large ? 'primary' : undefined}
        />
      );
    }
    if (payload.kind === 'GRID') {
      return (
        <>
          {payload.error && <p className="muted" style={{ margin: '0 0 8px' }}>{String(payload.error)}</p>}
          <GenericGrid
            columns={payload.columns}
            rows={payload.rows}
            query={payload.query}
            empty={payload.query ? 'No rows for this query.' : 'No events for this feed yet.'}
          />
        </>
      );
    }
    return <p className="muted" style={{ margin: 0 }}>{payload.error || 'No report for this step yet.'}</p>;
  }

  async function act(kind) {
    setBusy(true); setBanner(null);
    try {
      if (kind === 'signoff') { await api.signoff(instanceId); setBanner({ cls: 'ok', text: 'Owner signed — waiting on GLA countersign (SIGNED).' }); }
      if (kind === 'countersign') { await api.action(instanceId, 'COUNTERSIGN'); setBanner({ cls: 'ok', text: 'Countersigned — instance CLEARED.' }); }
      if (kind === 'post') { const r = await api.post(instanceId); setBanner({ cls: 'ok', text: `Posted to MOTIF via FAS — command_run ${r.runId}, echo required before CLEARED.` }); }
      if (kind === 'adjust') {
        const r = await api.action(instanceId, 'ADJUST');
        setBanner({ cls: 'ok', text: `Adjust commanded to Motif — run ${r.runId}. Waiting for the echo.` });
        const echoed = await waitForStatus(['READY', 'SIGNED', 'CLEARED']);
        if (echoed) setBanner({ cls: 'ok', text: `Adjust commanded to Motif — run ${r.runId}. Fold is ${echoed.instance.status}.` });
        await loadStep('FAS_MOTIF', { toggle: false });
      }
      if (kind === 'escalate') { const r = await api.escalate(instanceId, 'Manual escalation from console'); setBanner({ cls: 'warn', text: `Escalation ${r.escalationId} raised to RTB.` }); }
      if (kind.startsWith('generic:')) { const verb = kind.slice(8); await api.action(instanceId, verb); setBanner({ cls: 'ok', text: `${labelOf(verb)} recorded — workflow fact WORKFLOW_${verb} published.` }); }
      if (kind !== 'adjust') await load();
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
  const why = isSigned
    ? `Owner ${i.signedBy || 'signed'}. Countersign as a different actor (GLA).`
    : (isBlocked || i.status === 'NOT_YET' || i.status === 'DELAYED') && actions.includes('SIGN_OFF')
      ? `Sign off needs READY. This instance is ${i.status}${isBlocked && i.namedBlocker ? ` on ${i.namedBlocker}` : ''}.`
      : null;
  const embedContext = {
    groupUnitId: i.groupUnitId,
    productId: i.kitId,
    outcomeId: i.instanceId,
    cobDate: i.cobDate,
    region: i.region,
    runId: i.runId,
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
  };
  const outcomeDef = outcomeForSurface(defs, { kitId: i.kitId });
  const hasGrids = Array.isArray(outcomeDef?.grids) && outcomeDef.grids.length > 0;
  const openDest = (detail.destinations || []).find((d) => d.destId === openRef);
  const destOpen = Boolean(openDest);
  const destSurface = (d) => (d.surface === 'IFRAME' ? 'iframe' : (d.echoOk === 'Y' ? '✓ echoed' : d.actionType));
  const gridContext = {
    cobDate: i.cobDate,
    region: i.region,
    groupUnitId: i.groupUnitId,
    kitId: i.kitId,
    instanceId: i.instanceId,
    sliceKey: i.sliceKey,
    account: i.account,
    journalId: i.journalId,
    amount: i.amount,
    fsLine: i.fsLine,
    runId: i.runId,
    status: i.status,
    namedBlocker: i.namedBlocker,
  };

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

      {destOpen ? (
        <>
          <div className="fold-glance">
            <span className="fold-glance-label">Readiness</span>
            {detail.keys.map((k) => (
              <span key={k.sourceId + k.sourceKey} className="fold-chip">
                <span className="mono">{k.sourceId}</span>
                <StatusPill status={k.keyStatus} />
              </span>
            ))}
            <button type="button" className="btn ghost sm fold-glance-close" onClick={closeStage}>
              <Icon name="x" size={14} /> Close
            </button>
          </div>
          <div className="panel stage-panel">
            <div className="panel-hd">
              <h2>{openDest.displayName || openDest.destId}</h2>
              <span className="hint">{(step?.kind || openDest.surface || 'step').toLowerCase()} · {openDest.destId}</span>
              <button type="button" className="btn ghost sm" onClick={closeStage}>
                <Icon name="x" size={14} /> Close
              </button>
            </div>
            <div className="panel-bd stack">
              <div className="dest-tabs" role="tablist" aria-label="Destinations">
                {detail.destinations.map((d) => {
                  const on = openRef === d.destId;
                  return (
                    <button
                      key={d.destId}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      className={'dest-tab' + (on ? ' on' : '')}
                      onClick={() => loadStep(d.destId, { toggle: false })}
                    >
                      <span className="chip">step {d.stepOrder}</span>
                      {d.displayName || d.destId}
                    </button>
                  );
                })}
              </div>
              {stepBusy ? <Loading what="Step report…" /> : showStep(step, embedContext, { large: true })}
            </div>
          </div>
        </>
      ) : (
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
            <div className="panel-hd"><h2>Readiness fold</h2><span className="hint">click a feed for history</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Source</th><th>Key</th><th>Status</th><th>Required</th><th /></tr></thead>
                <tbody>
                  {detail.keys.map((k) => {
                    const open = openRef === k.sourceId;
                    return (
                      <Fragment key={k.sourceId + k.sourceKey}>
                        <tr key={k.sourceId + k.sourceKey} className={'fold-row' + (open ? ' on' : '')}
                          onClick={() => loadStep(k.sourceId)}>
                          <td><span className="lead mono">{k.sourceId}</span><div className="sec">{k.sourceName}</div></td>
                          <td className="mono">{k.sourceKey}</td>
                          <td><StatusPill status={k.keyStatus} /></td>
                          <td>{k.required === 'Y' ? 'Yes' : 'No'}</td>
                          <td className="cell-act"><Icon name="down" size={14} className={'sel2-chev' + (open ? ' flip' : '')} /></td>
                        </tr>
                        {open && (
                          <tr key={k.sourceId + '-hist'}>
                            <td colSpan={5} className="fold-hist">
                              <p className="fold-cap">{stepBusy ? 'Loading…' : (step?.title || k.sourceId)}</p>
                              {stepBusy ? <Loading what="Feed history…" /> : showStep(step, embedContext)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Destinations</h2><span className="hint">step surface</span></div>
            <div className="panel-bd stack">
              {detail.destinations.map((d) => (
                <button
                  key={d.destId}
                  type="button"
                  className="row fold-row dest-open"
                  onClick={() => loadStep(d.destId, { toggle: false })}
                >
                  <span className="chip">step {d.stepOrder}</span>
                  <b>{d.displayName || d.destId}</b>
                  <span className="mono sec">{d.destId}</span>
                  <span className="muted" style={{ marginLeft: 'auto' }}>{destSurface(d)}</span>
                  <Icon name="open" size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {(i.embedUrl || hasGrids) && (
        <div className="view-toggles wrapflex">
          {i.embedUrl && !destOpen && (
            <button
              type="button"
              className={'btn' + (partnerOpen ? '' : ' ghost')}
              onClick={() => setPartnerOpen((open) => !open)}
            >
              <Icon name="open" size={15} /> {partnerViewLabel(i.renderer)}
            </button>
          )}
          {hasGrids && (
            <button
              type="button"
              className={'btn' + (gridOpen ? '' : ' ghost')}
              onClick={() => setGridOpen((open) => !open)}
            >
              <Icon name="grid" size={15} /> Grid view
            </button>
          )}
        </div>
      )}

      {partnerOpen && i.embedUrl && (
        <div className="panel">
          <div className="panel-hd">
            <h2>{i.renderer || 'Partner surface'}</h2>
            <span className="hint">kit_embed · this app · {i.embedUrl}</span>
          </div>
          <div className="panel-bd stack">
            <div className="wrapflex">
              <span className="chip">{i.renderer}</span>
              <span className="mono sec">run {i.runId || 'pending'}</span>
              {i.signedBy && <span className="mono sec">signed by {i.signedBy}</span>}
            </div>
            <PartnerFrame
              url={i.embedUrl}
              title={i.renderer || 'Partner screen'}
              context={embedContext}
              variant="primary"
            />
          </div>
        </div>
      )}

      {gridOpen && hasGrids && (
        <OutcomeGrids definition={outcomeDef} context={gridContext} heading="Lineage grids" />
      )}
    </>
  );
}
