import { useState } from 'react';
import Icon from './Icon.jsx';
import InfoHint from './InfoHint.jsx';
import GridConfigFields from './GridConfigFields.jsx';
import { BLANK_FEED, OUTCOME_STEPS, formToDefinition, stepErrors } from '../lib/outcomeForm.js';

const UPPER_ID = (v) => v.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

/**
 * A business outcome, configured one step at a time: 1 Outcome → 2 Input feeds → 3 SLA → 4 When ready → 5 Grids →
 * 6 Review. Onboarding uses it to create an outcome and Configuration to edit one, so a config user sees the same
 * numbered path either way. Next is blocked until the step is complete, and says why.
 */
export default function OutcomeWizard({ initial, mode = 'create', knownSources = [], busy = false, onSubmit, onCancel, onReset, sourcesHint, takenIds = [], onStep }) {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(0);
  // Edit starts from a complete definition, so every step is open; create opens them as you go.
  const [reached, setReached] = useState(mode === 'edit' ? OUTCOME_STEPS.length - 1 : 0);
  const [tried, setTried] = useState(false);

  const current = OUTCOME_STEPS[step];
  const taken = mode !== 'edit' && takenIds.includes((form.id || '').trim())
    ? [`${form.id} is already live. Pick another id, or edit it on Configuration.`] : [];
  const errors = [...(['outcome', 'review'].includes(current.id) ? taken : []), ...stepErrors(form, current.id)];
  const last = step === OUTCOME_STEPS.length - 1;

  function patch(p) { setForm((f) => ({ ...f, ...p })); }
  function setFeed(i, p) { setForm((f) => ({ ...f, feeds: f.feeds.map((fd, idx) => (idx === i ? { ...fd, ...p } : fd)) })); }

  function go(i) {
    setTried(false);
    setStep(i);
    if (onStep) onStep(i, i === OUTCOME_STEPS.length - 1);
    setReached((r) => Math.max(r, i));
  }

  function next(e) {
    e.preventDefault();
    if (errors.length) { setTried(true); return; }
    if (!last) { go(step + 1); return; }
    onSubmit(formToDefinition(form));
  }

  const totalKeys = form.feeds.reduce((n, fd) => n + (Number(fd.expectedCount) || 0), 0);

  return (
    <form className="wiz" onSubmit={next}>
      <ol className="wiz-steps" aria-label="Steps">
        {OUTCOME_STEPS.map((s, i) => {
          const done = i < step || (i <= reached && i !== step && stepErrors(form, s.id).length === 0);
          const open = i <= reached;
          return (
            <li key={s.id} className={'wiz-step' + (i === step ? ' on' : '') + (done ? ' done' : '') + (open ? '' : ' locked')}>
              <button type="button" disabled={!open} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}
                title={open ? s.title : 'Complete the steps before this one first'}>
                <span className="wiz-n">{done ? <Icon name="check" size={12} /> : i + 1}</span>
                <span className="wiz-lbl">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="panel accent">
        <div className="panel-hd">
          <h2><span className="muted">Step {step + 1} of {OUTCOME_STEPS.length} ·</span> {current.title}</h2>
          <span className="hint">{mode === 'edit' ? `PUT /api/outcomes/definitions/${form.id}` : 'POST /api/outcomes/definitions'}</span>
        </div>
        <div className="panel-bd stack">
          <p className="wiz-hint">{current.hint}</p>

          {current.id === 'outcome' && (
            <>
              <div className="ob-row2">
                <div className="field"><label>Outcome id {mode === 'edit' && <span className="muted">(fixed once live)</span>}</label>
                  <input className="inp mono" value={form.id} disabled={mode === 'edit'} autoFocus={mode !== 'edit'}
                    placeholder="MEC_CLOSE" onChange={(e) => patch({ id: UPPER_ID(e.target.value) })} /></div>
                <div className="field"><label>Name</label>
                  <input className="inp" value={form.name} placeholder="Month-end close" onChange={(e) => patch({ name: e.target.value })} /></div>
              </div>
              <div className="field"><label>Business question <InfoHint title="The question" width={260}>Every outcome answers a plain business question, e.g. “Can I close the books?”. It is the title on the board and in reports.</InfoHint></label>
                <input className="inp" value={form.question} placeholder="Can I close the books?" onChange={(e) => patch({ question: e.target.value })} /></div>
              <div className="ob-row2">
                <div className="field"><label>Owner group</label>
                  <input className="inp" value={form.ownerGroup} placeholder="Financial Control" onChange={(e) => patch({ ownerGroup: e.target.value })} /></div>
                <div className="field"><label>Regions <span className="muted">(comma separated; GLOBAL for all)</span></label>
                  <input className="inp mono" value={form.regions} onChange={(e) => patch({ regions: e.target.value })} /></div>
              </div>
            </>
          )}

          {current.id === 'feeds' && (
            <div className="field">
              <label>Input feeds <span className="muted">— {form.feeds.length} feed{form.feeds.length === 1 ? '' : 's'} · {totalKeys} keys expected</span></label>
              <div className="ob-feeds">
                <div className="ob-feed ob-feed-hd">
                  <span>Label</span><span>Event type</span><span>Source system</span><span>Expected</span><span />
                </div>
                {form.feeds.map((fd, i) => (
                  <div className="ob-feed" key={i}>
                    <input className="inp" placeholder="SAP journals" value={fd.label} onChange={(e) => setFeed(i, { label: e.target.value })} aria-label={`Feed ${i + 1} label`} />
                    <input className="inp mono" placeholder="SAP_JOURNAL_POSTED" value={fd.eventType} onChange={(e) => setFeed(i, { eventType: UPPER_ID(e.target.value) })} aria-label={`Feed ${i + 1} event type`} />
                    <input className="inp mono" placeholder="SAP" value={fd.sourceSystem} onChange={(e) => setFeed(i, { sourceSystem: e.target.value.toUpperCase() })} list="wiz-known-sources" aria-label={`Feed ${i + 1} source system`} />
                    <input className="inp mono sm" type="number" min="1" value={fd.expectedCount} onChange={(e) => setFeed(i, { expectedCount: e.target.value })} aria-label={`Feed ${i + 1} expected keys`} />
                    <button type="button" className="ob-x" title="Remove feed" aria-label="Remove feed"
                      onClick={() => setForm((f) => ({ ...f, feeds: f.feeds.filter((_, idx) => idx !== i) }))} disabled={form.feeds.length === 1}><Icon name="x" size={13} /></button>
                  </div>
                ))}
                <datalist id="wiz-known-sources">{knownSources.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="row">
                <button type="button" className="btn ghost sm" onClick={() => setForm((f) => ({ ...f, feeds: [...f.feeds, { ...BLANK_FEED }] }))}><Icon name="plus" size={13} /> Add feed</button>
                {sourcesHint}
              </div>
            </div>
          )}

          {current.id === 'sla' && (
            <div className="field">
              <label>Due</label>
              <div className="seg">
                <button type="button" className={form.slaMode === 'within' ? 'on' : ''} onClick={() => patch({ slaMode: 'within' })}>Window from first event</button>
                <button type="button" className={form.slaMode === 'cutoff' ? 'on' : ''} onClick={() => patch({ slaMode: 'cutoff' })}>Business cut-off</button>
              </div>
              {form.slaMode === 'within'
                ? <div className="ob-inline"><span>Ready within</span><input className="inp mono sm" type="number" min="1" value={form.withinMinutes} onChange={(e) => patch({ withinMinutes: e.target.value })} aria-label="Minutes" /><span>minutes of the first event</span></div>
                : <div className="ob-inline"><span>By</span><input className="inp mono sm" value={form.cutoff} onChange={(e) => patch({ cutoff: e.target.value })} aria-label="Cut-off time" /><span>on COB +</span><input className="inp mono sm" type="number" min="0" value={form.dayOffset} onChange={(e) => patch({ dayOffset: e.target.value })} aria-label="Days after COB" /><span>day(s)</span></div>}
            </div>
          )}

          {current.id === 'ready' && (
            <div className="field">
              <label>When every feed is complete</label>
              <div className="seg">
                <button type="button" className={form.actionMode === 'notify' ? 'on' : ''} onClick={() => patch({ actionMode: 'notify' })}>Notify only</button>
                <button type="button" className={form.actionMode === 'command' ? 'on' : ''} onClick={() => patch({ actionMode: 'command' })}>Command an engine</button>
              </div>
              {form.actionMode === 'command' && (
                <div className="ob-row3" style={{ marginTop: 8 }}>
                  <div className="field"><label>Target engine</label><input className="inp mono" placeholder="axiom" value={form.target} onChange={(e) => patch({ target: e.target.value })} /></div>
                  <div className="field"><label>Completion event</label><input className="inp mono" placeholder="REPORT_GENERATED" value={form.completionEvent} onChange={(e) => patch({ completionEvent: UPPER_ID(e.target.value) })} /></div>
                  <div className="field"><label>Action label</label><input className="inp" placeholder="Generate report" value={form.actionLabel} onChange={(e) => patch({ actionLabel: e.target.value })} /></div>
                </div>
              )}
            </div>
          )}

          {current.id === 'grids' && <GridConfigFields grids={form.grids || []} onChange={(grids) => patch({ grids })} />}

          {current.id === 'review' && <Review form={form} onEdit={go} />}

          {(tried || last) && errors.length > 0 && (
            <ul className="wiz-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}

          <div className="wiz-nav">
            <button type="button" className="btn ghost" onClick={() => go(step - 1)} disabled={step === 0}><Icon name="chevron" size={14} /> Back</button>
            {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
            {onReset && <button type="button" className="btn ghost" onClick={() => { setForm(onReset()); go(0); setReached(0); }}>Start again</button>}
            <span className="spacer" />
            {!last && <span className="sec">Next: {OUTCOME_STEPS[step + 1].label}</span>}
            <button className="btn" type="submit" disabled={busy || (last && errors.length > 0)}>
              {last
                ? (busy ? 'Saving…' : <><Icon name="check" size={14} /> {mode === 'edit' ? 'Save configuration' : 'Go live'}</>)
                : <>Next <Icon name="right" size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Step 6: the definition as it will be saved, one block per step, each with a link back to change it. */
function Review({ form, onEdit }) {
  const d = formToDefinition(form);
  const keys = d.dependencies.reduce((n, x) => n + x.expectedCount, 0);
  const block = (i, body) => (
    <div className="wiz-rev">
      <div className="wiz-rev-hd">
        <span className="wiz-n sm">{i + 1}</span> <b>{OUTCOME_STEPS[i].label}</b>
        <button type="button" className="btn ghost sm" onClick={() => onEdit(i)}>Change</button>
      </div>
      <div className="wiz-rev-bd">{body}</div>
    </div>
  );
  return (
    <div className="wiz-review">
      {block(0, <>
        <div className="kv"><span className="k">Outcome</span><span className="v"><span className="mono">{d.id || '—'}</span> · {d.name || '—'}</span></div>
        <div className="kv"><span className="k">Question</span><span className="v">{d.question || '—'}</span></div>
        <div className="kv"><span className="k">Owner · regions</span><span className="v">{d.ownerGroup} · {d.regions.join(', ') || 'GLOBAL'}</span></div>
      </>)}
      {block(1, <>
        <div className="kv"><span className="k">Feeds</span><span className="v">{d.dependencies.length} feeds · {keys} keys expected</span></div>
        {d.dependencies.map((x) => (
          <div key={x.eventType} className="kv"><span className="k">{x.label}</span>
            <span className="v"><span className="mono">{x.eventType}</span> · {x.sourceSystem || 'any source'} · {x.expectedCount} key{x.expectedCount === 1 ? '' : 's'}</span></div>
        ))}
      </>)}
      {block(2, <div className="kv"><span className="k">Due</span><span className="v">{d.sla.withinMinutes ? `within ${d.sla.withinMinutes} min of the first event` : `${d.sla.cutoff} on COB + ${d.sla.dayOffset} day(s)`}</span></div>)}
      {block(3, <div className="kv"><span className="k">On ready</span><span className="v">{d.onReady ? <>Command <span className="mono">{d.onReady.target}</span> “{d.onReady.actionLabel}”, done on <span className="mono">{d.onReady.completionEvent}</span></> : 'Notify only'}</span></div>)}
      {block(4, d.grids.length
        ? d.grids.map((g) => <div key={g.id} className="kv"><span className="k">{g.title}</span><span className="v mono">{g.method} {g.endpoint}{g.params.length ? ` · ${g.params.map((p) => p.name).join(', ')}` : ''}</span></div>)
        : <span className="sec">None. The Grid view stays hidden for this outcome until you add one.</span>)}
    </div>
  );
}
