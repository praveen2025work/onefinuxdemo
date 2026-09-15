import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { StatusPill, Meter, Loading, Prediction, PageTitle } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { viewIncludes } from '../views.js';

// The five stages a report walks through: feeds arriving → ready → processing → generated → available.
const STEPS = [
  { key: 'FEEDS', label: 'Feeds in', hint: 'Sources publishing', icon: 'inbox' },
  { key: 'READY', label: 'Ready', hint: 'All feeds complete', icon: 'play' },
  { key: 'PROCESSING', label: 'Processing', hint: 'Report generating', icon: 'spark' },
  { key: 'GENERATED', label: 'Generated', hint: 'Report produced', icon: 'report' },
  { key: 'AVAILABLE', label: 'Available', hint: 'Ready to view', icon: 'eye' },
];

// How far along the flow each stage is (index of the step it has reached; AVAILABLE clears all five).
const REACHED = {
  NOT_STARTED: 0, FEEDS: 0, BLOCKED: 0, READY: 1, PROCESSING: 2, FAILED: 2, GENERATED: 3, AVAILABLE: 5,
};

function stepState(stage, i) {
  if (stage === 'BLOCKED' && i === 0) return 'error';
  if (stage === 'FAILED' && i === 2) return 'error';
  const reached = REACHED[stage] ?? 0;
  if (i < reached) return 'done';
  if (i === reached) return 'active';
  return 'todo';
}

function Flow({ stage }) {
  return (
    <div className="rflow">
      {STEPS.map((s, i) => {
        const st = stepState(stage, i);
        return (
          <div key={s.key} className={'rstep ' + st}>
            <div className="rdot">{st === 'done' ? <Icon name="check" size={13} /> : <Icon name={s.icon} size={13} />}</div>
            <div className="rmeta">
              <div className="rlbl">{s.label}</div>
              <div className="rhint">{s.hint}</div>
            </div>
            {i < STEPS.length - 1 && <div className="rbar" />}
          </div>
        );
      })}
    </div>
  );
}

function ReportModal({ outcome, onClose }) {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    outcomesApi.report(outcome.outcomeId, outcome.cobDate, outcome.region)
      .then((d) => { if (alive) setDoc(d); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [outcome]);

  return (
    <Modal title={doc ? doc.title : '15C3 report'} subtitle="Generated regulatory report · available to view"
      width={620} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Close</button>}>
      {err && <div className="banner fail"><div><b>Not available</b><span className="mono-sm">{err}</span></div></div>}
      {!err && !doc && <Loading what="Opening report…" />}
      {doc && (
        <div className="rdoc">
          <div className="rdoc-grid">
            <div><span className="k">Report id</span><span className="v mono">{doc.reportId}</span></div>
            <div><span className="k">Catalog</span><span className="v mono">{doc.catalogId}</span></div>
            <div><span className="k">Rows</span><span className="v">{doc.rowCount?.toLocaleString?.() || doc.rowCount}</span></div>
            <div><span className="k">Owner</span><span className="v">{doc.ownerGroup}</span></div>
            <div><span className="k">COB</span><span className="v">{doc.cobDate}</span></div>
            <div><span className="k">Region</span><span className="v">{doc.region}</span></div>
            <div><span className="k">Generated</span><span className="v">{(doc.generatedAt || '').replace('T', ' ').slice(0, 19)} UTC</span></div>
            <div className="wide"><span className="k">Locator</span><span className="v mono-sm">{doc.uri}</span></div>
          </div>
          {doc.summary && <p className="rdoc-sum">{doc.summary}</p>}
          <div className="rdoc-tbl">
            <div className="rdoc-th"><span>Feed</span><span>Source</span><span className="num">Inputs</span></div>
            {doc.feeds.map((f) => (
              <div key={f.label} className="rdoc-tr">
                <span>{f.label}</span>
                <span><span className="chip">{f.sourceSystem}</span></span>
                <span className="num mono">{f.completed}/{f.expected}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Reports() {
  const { view } = useApp();
  const [outcomes, setOutcomes] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try { setOutcomes(await outcomesApi.all()); } catch { /* keep last good */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [load]);

  if (!outcomes) return <Loading what="Loading reports…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Regulatory reporting</div>
          <PageTitle icon="report">Reports
            <InfoHint title="Report flow">Each report is a business outcome: its feeds fold to ready, the hub asks the generator to run, and the finished report becomes available to view. No polling — every feed is an event.</InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/board"><Icon name="board" size={15} /> Open Board</Link>
        </div>
      </div>

      <div className="grid g1">
        {outcomes.map((o) => {
          const available = o.stage === 'AVAILABLE' && o.report;
          return (
            <div key={o.key} className="rcard panel">
              <div className="rcard-hd">
                <div>
                  <div className="row">
                    <StatusPill status={o.status} />
                    <span className="chip">{o.region}</span>
                    <span className="chip">COB {o.cobDate}</span>
                    {o.atRisk && <span className="chip warn-chip">at risk</span>}
                    {o.breached && <span className="chip warn-chip">SLA breached</span>}
                  </div>
                  <h3>{o.name}</h3>
                  <p className="q">{o.question}</p>
                </div>
                <div className="rcard-cta">
                  {available
                    ? <button className="btn" onClick={() => setOpen(o)}><Icon name="report" size={15} /> View report</button>
                    : <span className="pill plain"><span className="dot" />{o.stage}</span>}
                </div>
              </div>

              <Flow stage={o.stage} />
              <Prediction outcome={o} />

              <div className="rfeeds">
                {o.dependencies.map((d) => (
                  <div key={d.eventType} className={'rfeed' + (d.completed >= d.expected ? ' ok' : '') + (d.failedKeys?.length ? ' bad' : '')}>
                    <div className="rfeed-hd">
                      <span className="rfeed-lbl">{d.label}</span>
                      <span className="chip">{d.sourceSystem}</span>
                    </div>
                    <Meter completed={d.completed} total={d.expected} blocked={d.failedKeys?.length > 0} />
                  </div>
                ))}
              </div>

              <div className="rcard-ft">
                {available
                  ? <span className="mono-sm">{o.report.reportId} · {o.report.rowCount?.toLocaleString?.() || o.report.rowCount} rows · {o.report.catalogId}</span>
                  : <span className="muted">{o.lastMessage || 'Waiting for feeds…'}</span>}
              </div>
            </div>
          );
        })}
        {outcomes.length === 0 && (
          <div className="empty">
            {viewIncludes(view, '/drive')
              ? <>No report outcomes yet. Open the <Link to="/drive">Drive screen</Link> to run the 15C3 feeds.</>
              : <>No report outcomes yet. Switch View to Developer (or All) and drive the 15C3 feeds — Drive is not on this view.</>}
          </div>
        )}
      </div>

      {open && <ReportModal outcome={open} onClose={() => setOpen(null)} />}
    </>
  );
}
