import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Meter, Loading, Prediction, PageTitle } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { viewIncludes } from '../views.js';

const STEPS = [
  { key: 'FEEDS', label: 'Feeds in', hint: 'Sources publishing', icon: 'inbox' },
  { key: 'READY', label: 'Ready', hint: 'All feeds complete', icon: 'play' },
  { key: 'PROCESSING', label: 'Processing', hint: 'Report generating', icon: 'spark' },
  { key: 'GENERATED', label: 'Generated', hint: 'Report produced', icon: 'report' },
  { key: 'AVAILABLE', label: 'Available', hint: 'Ready to view', icon: 'eye' },
];

const REACHED = {
  NOT_STARTED: 0, FEEDS: 0, BLOCKED: 0, READY: 1, PROCESSING: 2, FAILED: 2, GENERATED: 3, AVAILABLE: 5,
};

const DENSITY = [
  { id: 'normal', label: 'Normal', icon: 'cards' },
  { id: 'compact', label: 'Compact', icon: 'menu' },
  { id: 'table', label: 'Table', icon: 'grid' },
];

function stepState(stage, i) {
  if (stage === 'BLOCKED' && i === 0) return 'error';
  if (stage === 'FAILED' && i === 2) return 'error';
  const reached = REACHED[stage] ?? 0;
  if (i < reached) return 'done';
  if (i === reached) return 'active';
  return 'todo';
}

function reportHref(o) {
  return `/reports/${encodeURIComponent(o.outcomeId)}/${o.cobDate}/${encodeURIComponent(o.region)}`;
}

function canOpen(o) {
  return Boolean(o.report) || o.stage === 'AVAILABLE' || o.stage === 'GENERATED';
}

function OpenReport({ outcome, compact }) {
  if (!canOpen(outcome)) {
    return <span className="pill plain"><span className="dot" />{outcome.stage}</span>;
  }
  return (
    <Link className={compact ? 'btn ghost sm' : 'btn'} to={reportHref(outcome)}>
      <Icon name="open" size={15} /> Open report
    </Link>
  );
}

function Flow({ stage, compact }) {
  return (
    <div className={'rflow' + (compact ? ' compact' : '')}>
      {STEPS.map((s, i) => {
        const st = stepState(stage, i);
        return (
          <div key={s.key} className={'rstep ' + st}>
            <div className="rdot">{st === 'done' ? <Icon name="check" size={13} /> : <Icon name={s.icon} size={13} />}</div>
            <div className="rmeta">
              <div className="rlbl">{s.label}</div>
              {!compact && <div className="rhint">{s.hint}</div>}
            </div>
            {i < STEPS.length - 1 && <div className="rbar" />}
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ outcome, compact }) {
  const available = canOpen(outcome);
  return (
    <div className={'rcard panel' + (compact ? ' compact' : '')}>
      <div className="rcard-hd">
        <div>
          <div className="row">
            <StatusPill status={outcome.status} />
            <span className="chip">{outcome.region}</span>
            <span className="chip">COB {outcome.cobDate}</span>
            {outcome.atRisk && <span className="chip warn-chip">at risk</span>}
            {outcome.breached && <span className="chip warn-chip">SLA breached</span>}
          </div>
          <h3><Link className="rpt-name" to={reportHref(outcome)}>{outcome.name}</Link></h3>
          {!compact && <p className="q">{outcome.question}</p>}
        </div>
        <div className="rcard-cta">
          <OpenReport outcome={outcome} compact={compact} />
        </div>
      </div>

      <Flow stage={outcome.stage} compact={compact} />
      {!compact && <Prediction outcome={outcome} />}

      {!compact && (
        <div className="rfeeds">
          {outcome.dependencies.map((d) => (
            <div key={d.eventType} className={'rfeed' + (d.completed >= d.expected ? ' ok' : '') + (d.failedKeys?.length ? ' bad' : '')}>
              <div className="rfeed-hd">
                <span className="rfeed-lbl">{d.label}</span>
                <span className="chip">{d.sourceSystem}</span>
              </div>
              <Meter completed={d.completed} total={d.expected} blocked={d.failedKeys?.length > 0} />
            </div>
          ))}
        </div>
      )}

      <div className="rcard-ft">
        {available && outcome.report
          ? <span className="mono-sm">{outcome.report.reportId} · {outcome.report.rowCount?.toLocaleString?.() || outcome.report.rowCount} rows · {outcome.report.catalogId}</span>
          : <span className="muted">{outcome.lastMessage || 'Waiting for feeds…'}</span>}
      </div>
    </div>
  );
}

function ReportTable({ outcomes }) {
  return (
    <div className="panel">
      <div className="panel-hd">
        <h2>Reports</h2>
        <span className="hint">{outcomes.length}</span>
      </div>
      <div className="panel-bd tight">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Report</th>
                <th>Stage</th>
                <th>Region</th>
                <th>COB</th>
                <th>Feeds</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o) => (
                <tr key={o.key}>
                  <td>
                    <Link className="lead" to={reportHref(o)}>{o.name}</Link>
                    <div className="sec">{o.question}</div>
                  </td>
                  <td><StatusPill status={o.status} /> <span className="sec">{o.stage}</span></td>
                  <td className="mono">{o.region}</td>
                  <td className="mono">{o.cobDate}</td>
                  <td><Meter completed={o.completed} total={o.expected} blocked={o.status === 'BLOCKED'} /></td>
                  <td className="num"><OpenReport outcome={o} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { view } = useApp();
  const [outcomes, setOutcomes] = useState(null);
  const [density, setDensity] = useState(() => {
    const saved = localStorage.getItem('ofx-reports-view');
    return DENSITY.some((d) => d.id === saved) ? saved : 'normal';
  });

  const load = useCallback(async () => {
    try { setOutcomes(await outcomesApi.all()); } catch { /* keep last good */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [load]);

  function choose(id) {
    setDensity(id);
    localStorage.setItem('ofx-reports-view', id);
  }

  if (!outcomes) return <Loading what="Loading reports…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Regulatory reporting</div>
          <PageTitle icon="report">Reports
            <InfoHint title="Report flow">Each report is a business outcome: its feeds fold to ready, the hub asks the generator to run, and the finished report becomes a document you can open. Switch Normal, Compact, or Table — the index stays the same.</InfoHint>
          </PageTitle>
        </div>
        <div className="ph-side">
          <div className="seg" role="tablist" aria-label="Reports layout">
            {DENSITY.map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={density === d.id}
                className={density === d.id ? 'on' : ''} onClick={() => choose(d.id)}>
                <Icon name={d.icon} size={14} /> {d.label}
              </button>
            ))}
          </div>
          <div className="ph-actions">
            <Link className="btn ghost" to="/board"><Icon name="board" size={15} /> Open Board</Link>
          </div>
        </div>
      </div>

      {density === 'table' ? (
        outcomes.length > 0
          ? <ReportTable outcomes={outcomes} />
          : null
      ) : (
        <div className="grid g1">
          {outcomes.map((o) => <ReportCard key={o.key} outcome={o} compact={density === 'compact'} />)}
        </div>
      )}

      {outcomes.length === 0 && (
        <div className="empty">
          {viewIncludes(view, '/drive')
            ? <>No report outcomes yet. Open the <Link to="/drive">Drive screen</Link> to run the 15C3 feeds.</>
            : <>No report outcomes yet. Switch View to Developer (or All) and drive the 15C3 feeds — Drive is not on this view.</>}
        </div>
      )}
    </>
  );
}
