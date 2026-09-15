import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { api, outcomesApi } from '../api';
import { StatusPill, Meter, Prediction, PageTitle } from '../components/bits.jsx';
import Icon, { iconForRoute } from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { VIEWS, viewIncludes } from '../views.js';
import { hasPrediction } from '../eta.js';

export default function Home() {
  const { instances, filters, refreshInstances, view, setView, context } = useApp();
  const [events, setEvents] = useState([]);
  const [engineOutcomes, setEngineOutcomes] = useState([]);
  const navigate = useNavigate();

  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const cleared = instances.filter((i) => i.status === 'CLEARED').length;
  const esc = instances.reduce((n, i) => n + (i.openEscalations || 0), 0);

  async function loadActivity() {
    const all = await Promise.all(instances.map((i) => api.instanceEvents(i.instanceId).catch(() => [])));
    const merged = all.flat().sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)).slice(0, 8);
    setEvents(merged);
  }
  useEffect(() => { if (instances.length) loadActivity(); }, [instances]); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    async function loadEngine() {
      try {
        const rows = await outcomesApi.all();
        if (alive) setEngineOutcomes(rows);
      } catch { /* hub offline */ }
    }
    loadEngine();
    const t = setInterval(loadEngine, 2000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const predicted = engineOutcomes.filter((o) => hasPrediction(o) || o.atRisk || o.breached);
  const unitName = context?.groupUnits?.find((g) => g.groupUnitId === filters.groupUnit)?.name || filters.groupUnit;
  const namedBlocker = instances.find((i) => i.status === 'BLOCKED');
  const storyRows = [...instances]
    .sort((a, b) => {
      const rank = (s) => (s === 'BLOCKED' ? 0 : s === 'READY' ? 1 : 2);
      return rank(a.status) - rank(b.status);
    })
    .slice(0, 4);

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">{unitName} · close of business {filters.cobDate}</div>
          <PageTitle icon="tower">Today’s close
            <InfoHint title="Outcome control tower">One shell for every group unit. Events are facts, outcomes are the stitch, and heavy screens stay with the teams that own them — we frame them.</InfoHint>
          </PageTitle>
          <p className="sub">The fold is the work: ready rows, a named blocker, and whether the clock still holds. Guides live in the left rail — Product, Architecture, Developer guide.</p>
        </div>
        <div className="ph-actions">
          <Link className="btn" to="/board"><Icon name="board" size={15} /> Open board</Link>
          <Link className="btn ghost" to="/product"><Icon name="book" size={15} /> Product story</Link>
          <Link className="btn ghost" to="/architecture"><Icon name="compass" size={15} /> Architecture</Link>
          <Link className="btn ghost" to="/guide"><Icon name="code" size={15} /> Developer guide</Link>
          <button className="btn ghost" onClick={() => refreshInstances()}><Icon name="refresh" size={15} /> Refresh fold</button>
        </div>
      </div>

      <section className="story" aria-label="Close of business">
        <p className="story-kicker">What the team is looking at</p>
        {namedBlocker ? (
          <p className="story-lead">
            {ready} report{ready === 1 ? '' : 's'} can go.{' '}
            <strong>{namedBlocker.region} {namedBlocker.kitId}</strong>
            {' '}is still blocked on{' '}
            <strong>{namedBlocker.namedBlocker}</strong>
            {namedBlocker.question ? ` — ${namedBlocker.question}` : ''}.{' '}
            <Link to={'/instance/' + encodeURIComponent(namedBlocker.instanceId)}>Open that row</Link>
            {' · '}
            <Link to="/board">All desks</Link>
          </p>
        ) : (
          <p className="story-lead">
            {ready
              ? `${ready} report${ready === 1 ? '' : 's'} ready to go.`
              : instances.length
                ? 'Nothing is ready yet — the fold is still waiting on required keys.'
                : 'No rows on the board yet for this COB and region.'}{' '}
            <Link to="/board">Open the board</Link>
          </p>
        )}
        {storyRows.length > 0 && (
          <div className="story-rows">
            {storyRows.map((row) => {
              const tone = row.status === 'BLOCKED' ? 'fail' : row.status === 'READY' || row.status === 'CLEARED' ? 'ok' : row.status === 'DELAYED' ? 'warn' : '';
              return (
                <Link
                  key={row.instanceId}
                  className={'story-row ' + (tone || 'wait')}
                  to={'/instance/' + encodeURIComponent(row.instanceId)}
                >
                  <span className={'pill ' + tone}>{row.status}</span>
                  <div>
                    <b>{row.region} · {row.kitId}</b>
                    <div className="sec">{row.namedBlocker || row.question}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <p className="story-walk">
          Walk the story: <Link to="/product">Product</Link>
          {' · '}
          <Link to="/architecture">Architecture</Link>
          {' · '}
          <Link to="/guide">Developer guide</Link>
        </p>
      </section>

      <div className="grid g5" style={{ marginBottom: 16 }}>
        <div className="stat ok"><span className="stat-ico"><Icon name="check" size={18} /></span><div className="lbl">Ready to action</div><div className="num">{ready}</div><div className="foot">signed-off: {cleared}</div></div>
        <div className="stat fail"><span className="stat-ico"><Icon name="shield" size={18} /></span><div className="lbl">Blocked</div><div className="num">{blocked}</div><div className="foot">named key holds the fold</div></div>
        <div className="stat warn"><span className="stat-ico"><Icon name="clock" size={18} /></span><div className="lbl">Delayed</div><div className="num">{instances.filter((i) => i.status === 'DELAYED').length}</div><div className="foot">inside tolerance</div></div>
        <div className="stat"><span className="stat-ico"><Icon name="alert" size={18} /></span><div className="lbl">Escalations open</div><div className="num">{esc}</div><div className="foot">owned by RTB</div></div>
        <div className="stat info"><span className="stat-ico"><Icon name="layers" size={18} /></span><div className="lbl">Instances in scope</div><div className="num">{instances.length}</div><div className="foot">{filters.groupUnit}</div></div>
      </div>

      {predicted.length > 0 && (
        <div className="panel">
          <div className="panel-hd">
            <h2><Icon name="clock" size={16} /> Predicted ready
              <InfoHint title="From historic events" width={300}>
                Each ETA is projected from facts that already arrived this COB, blended with the median ready time of prior COBs. Advisory only — it never changes Ready / Blocked.
              </InfoHint>
            </h2>
            <span className="hint">advisory · not on the fold</span>
          </div>
          <div className="panel-bd pred-list">
            {predicted.map((o) => (
              <div key={o.key} className="pred-row">
                <div>
                  <div className="lead">{o.name}</div>
                  <div className="sec">{o.region} · COB {o.cobDate} · {o.completed}/{o.expected} feeds</div>
                </div>
                <Prediction outcome={o} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="split">
        <div>
          <div className="panel">
            <div className="panel-hd"><h2><Icon name="play" size={16} /> Pick up where this view starts</h2><span className="hint">{view.who}</span></div>
            <div className="panel-bd">
              <div className="grid g2">
                {view.starts.map((r) => (
                  <Link key={r.to} to={r.to} className="oc">
                    <div className="oc-hd">
                      <span className={'oc-ico ' + r.cls}><Icon name={iconForRoute(r.to)} size={15} /></span>
                      <span className={'pill ' + r.cls}>{r.tag}</span>
                    </div>
                    <h3>{r.title}</h3>
                    <p className="q">{r.q}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2><Icon name="layers" size={16} /> Every outcome instance for this unit today <InfoHint title="Fail-closed entitlements" width={300}>Unentitled instances are not greyed out — they return 404 and never reach this list.</InfoHint></h2><span className="hint">outcome_instance ⨝ product_kit</span></div>
            <div className="panel-bd tight">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Kit / question</th><th>Instance</th><th>Readiness</th><th>Status</th><th>Run</th><th className="num">Esc.</th><th /></tr></thead>
                  <tbody>
                    {instances.map((i) => (
                      <tr key={i.instanceId}>
                        <td><span className="lead">{i.kitId}</span><div className="sec">{i.question}</div></td>
                        <td className="mono" style={{ fontSize: 12 }}>{i.instanceId}</td>
                        <td><Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} /></td>
                        <td><StatusPill status={i.status} /></td>
                        <td className="mono">{i.runId || '—'}</td>
                        <td className="num">{i.openEscalations}</td>
                        <td><button className="btn ghost sm" onClick={() => navigate('/instance/' + encodeURIComponent(i.instanceId))}><Icon name="open" size={13} /> Open</button></td>
                      </tr>
                    ))}
                    {instances.length === 0 && <tr><td colSpan={7} className="empty">No instances for this COB / region.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <details className="panel view-opt">
            <summary>
              <Icon name="eye" size={16} />
              <span>
                <span className="kicker">Optional</span>
                <strong>Opt in to one view</strong>
                <span className="sec">{view.id === 'all' ? 'Everyone sees the same close. Pick a job if you want a thinner rail.' : `On: ${view.label}.`}</span>
              </span>
            </summary>
            <div className="panel-bd">
              <p className="muted" style={{ marginTop: 0 }}>
                Same live data. A view only hides nav and these start cards — it is not entitlement.{' '}
                <Link to="/product">Product</Link>
                {' · '}
                <Link to="/architecture">Architecture</Link>
                {' · '}
                <Link to="/guide">Developer guide</Link>
              </p>
              <div className="grid g3 view-picks">
                {VIEWS.map((v) => (
                  <button key={v.id} type="button" className={'oc' + (view.id === v.id ? ' on' : '')} onClick={() => setView(v.id)}>
                    <div className="oc-hd">
                      <span className={'oc-ico ' + v.cls}><Icon name={v.icon} size={15} /></span>
                      <span className={'pill ' + v.cls}>{v.tag}</span>
                    </div>
                    <h3>{v.label}</h3>
                    <p className="q">{v.job}</p>
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>

        <div>
          <div className="panel accent">
            <div className="panel-hd"><h2><Icon name="activity" size={16} /> Activity</h2><span className="hint">live · SSE</span></div>
            <div className="panel-bd">
              <div className="tl">
                {events.map((e) => (
                  <div key={e.eventId} className={'tl-i ' + (e.status === 'FAILED' ? 'fail' : e.status === 'COMPLETED' ? 'ok' : 'info')}>
                    <div className="t">{(e.occurredAt || '').slice(11, 19)}</div>
                    <div className="h">{e.sourceSystem} {e.sourceKey} {e.status}</div>
                    <div className="d">{e.eventType} · {e.ingestOffset || e.region}</div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="empty">
                    {viewIncludes(view, '/drive')
                      ? <>No live facts yet. Open the <Link to="/drive">Drive screen</Link> to run a scenario.</>
                      : <>No live facts yet. Switch View to Developer (or All) and drive a scenario — Drive is not on this view.</>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-hd"><h2><Icon name="shield" size={16} /> Platform rules in force</h2></div>
            <div className="panel-bd stack">
              <p className="muted" style={{ margin: 0 }}>Readiness counts <b>distinct</b> keys. A FAILED required key blocks; REVOKED withdraws a completion.</p>
              <p className="muted" style={{ margin: 0 }}>Downstream completions must echo <span className="mono">run_id</span> or the outcome never clears.</p>
              <p className="muted" style={{ margin: 0 }}>Agent commentary is advisory. It is never on the readiness fold.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
