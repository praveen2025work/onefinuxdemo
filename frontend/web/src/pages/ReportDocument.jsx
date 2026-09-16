import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { outcomesApi } from '../api';
import { Loading, Meter, PageTitle, StatusPill } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';

function isHttp(uri) {
  return typeof uri === 'string' && /^https?:\/\//i.test(uri);
}

export default function ReportDocument() {
  const { outcomeId, cobDate, region } = useParams();
  const [outcome, setOutcome] = useState(null);
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    outcomesApi.one(outcomeId, cobDate, region)
      .then(async (view) => {
        if (!alive) return;
        setOutcome(view);
        if (view.report) {
          try {
            const report = await outcomesApi.report(view.outcomeId, view.cobDate, view.region);
            if (alive) setDoc(report);
          } catch (e) {
            if (alive) setDoc(null);
          }
        }
      })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [outcomeId, cobDate, region]);

  if (err) {
    return (
      <div className="empty">
        Could not open this report. <span className="mono-sm">{err}</span>
        {' · '}<Link to="/reports">Back to Reports</Link>
      </div>
    );
  }
  if (!outcome) return <Loading what="Opening report…" />;

  const artifact = doc || outcome.report;
  const uri = artifact?.uri;
  const ready = outcome.stage === 'AVAILABLE' || outcome.stage === 'GENERATED';

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Report · {outcome.region} · COB {outcome.cobDate}</div>
          <PageTitle icon="report">{outcome.name}
            <InfoHint title="The produced report">This is the artifact the destination published — Axiom pack, Helix analysis, or the engine result. Reports is the index; this page is the document.</InfoHint>
          </PageTitle>
          <p className="sub">{outcome.question}</p>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/reports"><Icon name="report" size={15} /> All reports</Link>
          {isHttp(uri) && (
            <a className="btn" href={uri} target="_blank" rel="noreferrer">
              <Icon name="open" size={15} /> Open source report
            </a>
          )}
        </div>
      </div>

      {!ready && (
        <div className="banner warn">
          <div>
            <b>Not produced yet</b>
            <span> Stage is {outcome.stage}. The link stays so you can watch this COB; the document fills in when the destination reports back.</span>
          </div>
        </div>
      )}

      <div className="split">
        <div>
          <div className="panel">
            <div className="panel-hd">
              <h2>Report</h2>
              <StatusPill status={outcome.status} />
            </div>
            <div className="panel-bd">
              <div className="rdoc-grid">
                <div><span className="k">Report id</span><span className="v mono">{artifact?.reportId || '—'}</span></div>
                <div><span className="k">Catalog</span><span className="v mono">{artifact?.catalogId || '—'}</span></div>
                <div><span className="k">Rows</span><span className="v">{artifact?.rowCount != null ? (artifact.rowCount.toLocaleString?.() || artifact.rowCount) : '—'}</span></div>
                <div><span className="k">Owner</span><span className="v">{outcome.ownerGroup}</span></div>
                <div><span className="k">COB</span><span className="v mono">{outcome.cobDate}</span></div>
                <div><span className="k">Region</span><span className="v">{outcome.region}</span></div>
                <div><span className="k">Stage</span><span className="v">{outcome.stage}</span></div>
                <div><span className="k">Run</span><span className="v mono">{outcome.actionRunId || '—'}</span></div>
                <div className="wide">
                  <span className="k">Locator</span>
                  {isHttp(uri)
                    ? <a className="v mono-sm" href={uri} target="_blank" rel="noreferrer">{uri}</a>
                    : <span className="v mono-sm">{uri || window.location.pathname}</span>}
                </div>
              </div>
              {(doc?.summary || outcome.resultSummary) && (
                <p className="rdoc-sum">{doc?.summary || outcome.resultSummary}</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2>Feeds that built it</h2><span className="hint">{outcome.completed}/{outcome.expected}</span></div>
            <div className="panel-bd tight">
              <div className="rdoc-tbl">
                <div className="rdoc-th"><span>Feed</span><span>Source</span><span className="num">Inputs</span></div>
                {outcome.dependencies.map((f) => (
                  <div key={f.eventType} className="rdoc-tr">
                    <span>{f.label}</span>
                    <span><span className="chip">{f.sourceSystem}</span></span>
                    <span className="num mono">{f.completed}/{f.expected}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Readiness</h2></div>
            <div className="panel-bd">
              <Meter completed={outcome.completed} total={outcome.expected} blocked={outcome.status === 'BLOCKED'} />
              <p className="muted" style={{ margin: '12px 0 0' }}>{outcome.lastMessage || 'No further message.'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
