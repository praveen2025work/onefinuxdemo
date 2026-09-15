import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { api, outcomesApi } from '../api';
import { StatusPill, Meter, Prediction, PageTitle, Stat } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { viewIncludes } from '../views.js';
import { hasPrediction } from '../eta.js';

export default function Home() {
  const { instances, filters, view, context } = useApp();
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
          <p className="sub">Ready rows, a named blocker, and whether the clock still holds. Product and Architecture sit in the left rail.</p>
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
            {namedBlocker.question ? ` — ${namedBlocker.question}` : ''}
            {namedBlocker.question && /[.!?]$/.test(namedBlocker.question) ? '' : '.'}
            {' '}
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
      </section>

      <div className="stats">
        <Stat tone="ok" icon="check" label="Ready to action" value={ready} foot={`signed-off: ${cleared}`} />
        <Stat tone="fail" icon="shield" label="Blocked" value={blocked} foot="named key holds the fold" />
        <Stat tone="warn" icon="clock" label="Delayed" value={instances.filter((i) => i.status === 'DELAYED').length} foot="inside tolerance" />
        <Stat icon="alert" label="Escalations open" value={esc} foot="owned by RTB" />
        <Stat tone="info" icon="layers" label="Instances in scope" value={instances.length} foot={filters.groupUnit} />
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
            <div className="panel-hd"><h2><Icon name="layers" size={16} /> Every outcome instance for this unit today <InfoHint title="Fail-closed entitlements" width={300}>Unentitled instances are not greyed out — they return 404 and never reach this list.</InfoHint></h2><span className="hint">outcome_instance ⨝ product_kit</span></div>
            <div className="panel-bd tight">
              <div className="tbl-wrap">
                <table className="tbl cards-sm">
                  <thead><tr><th>Kit / question</th><th>Instance</th><th>Readiness</th><th>Status</th><th>Run</th><th className="num">Esc.</th><th /></tr></thead>
                  <tbody>
                    {instances.map((i) => (
                      <tr key={i.instanceId}>
                        <td className="cell-lead"><span className="lead">{i.kitId}</span><div className="sec">{i.question}</div></td>
                        <td data-label="Instance"><span className="mono lead">{i.sliceKey}</span><div className="sec mono nowrap">{i.region} · {i.cobDate}</div></td>
                        <td className="cell-wide" data-label="Readiness"><Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} /></td>
                        <td data-label="Status"><StatusPill status={i.status} /></td>
                        <td className="mono nowrap" data-label="Run">{i.runId || '—'}</td>
                        <td className="num" data-label="Escalations">{i.openEscalations}</td>
                        <td className="cell-act"><button className="btn ghost sm" onClick={() => navigate('/instance/' + encodeURIComponent(i.instanceId))}><Icon name="open" size={13} /> Open</button></td>
                      </tr>
                    ))}
                    {instances.length === 0 && <tr><td colSpan={7} className="empty">No instances for this COB / region.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
                      ? <>No live facts yet. Open Drive in the left rail to run a scenario.</>
                      : <>No live facts yet. Top bar View → Developer (or All) to reach Drive.</>}
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
