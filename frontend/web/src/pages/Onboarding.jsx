import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { Loading, PageTitle } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Select from '../components/Select.jsx';
import InfoHint from '../components/InfoHint.jsx';

const BLANK_FEED = { label: '', eventType: '', sourceSystem: '', expectedCount: 1 };

// A worked example that is deliberately NOT one of the seeded three, to show a new product is a
// kit of data (question + feeds + SLA + action), not a new app.
const EXAMPLE = {
  id: 'MEC_CLOSE',
  name: 'Month-end close',
  question: 'Can I close the books?',
  ownerGroup: 'Financial Control',
  regions: 'GLOBAL',
  slaMode: 'within',
  withinMinutes: 5,
  cutoff: '07:30',
  dayOffset: 1,
  feeds: [
    { label: 'SAP journals', eventType: 'SAP_JOURNAL_POSTED', sourceSystem: 'SAP', expectedCount: 12 },
    { label: 'Cost-centre sign-off', eventType: 'COSTCENTRE_SIGNED', sourceSystem: 'SAP', expectedCount: 8 },
  ],
  actionMode: 'notify',
  target: '',
  completionEvent: '',
  actionLabel: '',
};

export default function Onboarding() {
  const { filters } = useApp();
  const [defs, setDefs] = useState(null);
  const [sources, setSources] = useState([]);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EXAMPLE);

  const load = useCallback(async () => {
    const [d, s] = await Promise.all([
      outcomesApi.definitions().catch(() => []),
      api.sources().catch(() => []),
    ]);
    setDefs(d);
    setSources(s);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Source systems the platform already reads (feeds pick from these, but free text is allowed too).
  const knownSources = useMemo(() => {
    const set = new Set();
    (defs || []).forEach((o) => (o.dependencies || []).forEach((dep) => dep.sourceSystem && set.add(dep.sourceSystem)));
    sources.forEach((s) => set.add(s.sourceId));
    return [...set].sort();
  }, [defs, sources]);

  function set(patch) { setForm((f) => ({ ...f, ...patch })); }
  function setFeed(i, patch) {
    setForm((f) => ({ ...f, feeds: f.feeds.map((fd, idx) => (idx === i ? { ...fd, ...patch } : fd)) }));
  }
  function addFeed() { setForm((f) => ({ ...f, feeds: [...f.feeds, { ...BLANK_FEED }] })); }
  function removeFeed(i) { setForm((f) => ({ ...f, feeds: f.feeds.filter((_, idx) => idx !== i) })); }

  const totalKeys = form.feeds.reduce((n, fd) => n + (Number(fd.expectedCount) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setBanner(null);
    try {
      const definition = {
        id: form.id.trim(),
        name: form.name.trim(),
        question: form.question.trim(),
        ownerGroup: form.ownerGroup.trim() || 'Unassigned',
        regions: form.regions.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean),
        sla: form.slaMode === 'within'
          ? { withinMinutes: Number(form.withinMinutes) || 5 }
          : { cutoff: form.cutoff, dayOffset: Number(form.dayOffset) || 0 },
        dependencies: form.feeds
          .filter((fd) => fd.eventType.trim())
          .map((fd) => ({
            label: fd.label.trim() || fd.eventType.trim(),
            eventType: fd.eventType.trim().toUpperCase(),
            sourceSystem: fd.sourceSystem.trim().toUpperCase() || null,
            expectedCount: Number(fd.expectedCount) || 1,
          })),
        onReady: form.actionMode === 'command'
          ? {
            action: 'HTTP_COMMAND',
            target: form.target.trim(),
            completionEvent: form.completionEvent.trim().toUpperCase(),
            actionLabel: form.actionLabel.trim() || 'Downstream action',
          }
          : null,
      };
      if (!definition.dependencies.length) {
        throw new Error('Add at least one input feed with an event type.');
      }
      const created = await outcomesApi.register(definition, filters.cobDate || undefined);
      setBanner({
        cls: 'ok',
        text: `${definition.name} (${definition.id}) is live — ${definition.dependencies.length} feeds, `
          + `${totalKeys} keys expected. It now folds on the Board and Reports.`,
        outcome: created,
      });
      await load();
    } catch (err) {
      setBanner({ cls: 'fail', text: err.message });
    } finally { setBusy(false); }
  }

  if (!defs) return <Loading what="Loading onboarding…" />;

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Build · onboard a new outcome</div>
          <PageTitle icon="build">Onboard a business outcome
            <InfoHint title="Onboarding vs Configuration" width={360}>
              <b>Onboarding creates.</b> Define a new business outcome here — its question, the feeds it depends on, its SLA and what to do when ready — and it goes live immediately.<br /><br />
              <b>Configuration governs.</b> Once live, inspect and manage it on the Configuration screen. New products are a kit of data, not a new app.
            </InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/configuration"><Icon name="config" size={15} /> Configuration (govern)</Link>
        </div>
      </div>

      <div className="banner plain" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div><b>Onboarding creates a new outcome; Configuration inspects and governs it.</b>
          <span className="mono-sm">Define the question, feeds, SLA and on-ready action below — no code, no new screen.</span></div>
      </div>

      <div className="split">
        <div>
          <form className="panel accent" onSubmit={submit}>
            <div className="panel-hd"><h2>Define the outcome</h2><span className="hint">POST /api/outcomes/definitions</span></div>
            <div className="panel-bd stack">
              {banner && (
                <div className={'banner ' + banner.cls}>
                  <div>
                    <b>{banner.text}</b>
                    {banner.outcome && (
                      <span className="mono-sm">Now live: <Link to="/reports">Reports</Link> · <Link to="/board">Board</Link> · <Link to="/configuration">Configuration</Link></span>
                    )}
                  </div>
                </div>
              )}

              <div className="ob-row2">
                <div className="field"><label>Outcome id</label>
                  <input className="inp mono" value={form.id} onChange={(e) => set({ id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} required /></div>
                <div className="field"><label>Name</label>
                  <input className="inp" value={form.name} onChange={(e) => set({ name: e.target.value })} required /></div>
              </div>
              <div className="field"><label>Business question <InfoHint title="The question" width={260}>Every outcome answers a plain business question, e.g. “Can I close the books?”.</InfoHint></label>
                <input className="inp" value={form.question} onChange={(e) => set({ question: e.target.value })} required /></div>
              <div className="ob-row2">
                <div className="field"><label>Owner group</label>
                  <input className="inp" value={form.ownerGroup} onChange={(e) => set({ ownerGroup: e.target.value })} /></div>
                <div className="field"><label>Regions <span className="muted">(comma separated)</span></label>
                  <input className="inp mono" value={form.regions} onChange={(e) => set({ regions: e.target.value })} /></div>
              </div>

              <div className="field">
                <label>SLA</label>
                <div className="seg">
                  <button type="button" className={form.slaMode === 'within' ? 'on' : ''} onClick={() => set({ slaMode: 'within' })}>Window from first event</button>
                  <button type="button" className={form.slaMode === 'cutoff' ? 'on' : ''} onClick={() => set({ slaMode: 'cutoff' })}>Business cut-off</button>
                </div>
                {form.slaMode === 'within'
                  ? <div className="ob-inline"><span>Ready within</span><input className="inp mono sm" type="number" min="1" value={form.withinMinutes} onChange={(e) => set({ withinMinutes: e.target.value })} /><span>minutes</span></div>
                  : <div className="ob-inline"><input className="inp mono sm" value={form.cutoff} onChange={(e) => set({ cutoff: e.target.value })} /><span>on COB +</span><input className="inp mono sm" type="number" min="0" value={form.dayOffset} onChange={(e) => set({ dayOffset: e.target.value })} /><span>day(s)</span></div>}
              </div>

              <div className="field">
                <label>Input feeds <InfoHint title="The dependency mechanism" width={300}>These are the dependencies the outcome folds. It is READY only when every feed has all its expected keys; a failed key blocks it and is named.</InfoHint>
                  <span className="muted"> — {form.feeds.length} feeds · {totalKeys} keys expected</span></label>
                <div className="ob-feeds">
                  <div className="ob-feed ob-feed-hd">
                    <span>Label</span><span>Event type</span><span>Source system</span><span>Expected</span><span />
                  </div>
                  {form.feeds.map((fd, i) => (
                    <div className="ob-feed" key={i}>
                      <input className="inp" placeholder="SAP journals" value={fd.label} onChange={(e) => setFeed(i, { label: e.target.value })} />
                      <input className="inp mono" placeholder="SAP_JOURNAL_POSTED" value={fd.eventType} onChange={(e) => setFeed(i, { eventType: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} />
                      <input className="inp mono" placeholder="SAP" value={fd.sourceSystem} onChange={(e) => setFeed(i, { sourceSystem: e.target.value.toUpperCase() })} list="known-sources" />
                      <input className="inp mono sm" type="number" min="1" value={fd.expectedCount} onChange={(e) => setFeed(i, { expectedCount: e.target.value })} />
                      <button type="button" className="ob-x" title="Remove feed" onClick={() => removeFeed(i)} disabled={form.feeds.length === 1}>×</button>
                    </div>
                  ))}
                  <datalist id="known-sources">{knownSources.map((s) => <option key={s} value={s} />)}</datalist>
                </div>
                <button type="button" className="btn ghost sm" onClick={addFeed}><Icon name="bolt" size={13} /> Add feed</button>
              </div>

              <div className="field">
                <label>When every feed is complete <InfoHint title="On-ready action" width={300}>Notify-only signals the milestone. A command has the hub call a downstream engine (with a run id) and wait for its completion event.</InfoHint></label>
                <div className="seg">
                  <button type="button" className={form.actionMode === 'notify' ? 'on' : ''} onClick={() => set({ actionMode: 'notify' })}>Notify only</button>
                  <button type="button" className={form.actionMode === 'command' ? 'on' : ''} onClick={() => set({ actionMode: 'command' })}>Command an engine</button>
                </div>
                {form.actionMode === 'command' && (
                  <div className="ob-row3" style={{ marginTop: 8 }}>
                    <div className="field"><label>Target</label><input className="inp mono" placeholder="axiom" value={form.target} onChange={(e) => set({ target: e.target.value })} /></div>
                    <div className="field"><label>Completion event</label><input className="inp mono" placeholder="REPORT_GENERATED" value={form.completionEvent} onChange={(e) => set({ completionEvent: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} /></div>
                    <div className="field"><label>Action label</label><input className="inp" placeholder="Generate report" value={form.actionLabel} onChange={(e) => set({ actionLabel: e.target.value })} /></div>
                  </div>
                )}
              </div>

              <div className="ob-actions">
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Onboarding…' : <><Icon name="check" size={15} /> Onboard outcome</>}</button>
                <button className="btn ghost" type="button" onClick={() => setForm(EXAMPLE)}>Reset to example</button>
              </div>
            </div>
          </form>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Live business outcomes</h2><span className="hint">{defs.length}</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Outcome</th><th>Question</th><th className="num">Feeds</th></tr></thead>
                <tbody>
                  {defs.map((o) => (
                    <tr key={o.id}>
                      <td><span className="mono lead">{o.id}</span><div className="sec">{o.name}</div></td>
                      <td className="sec">{o.question}</td>
                      <td className="num mono">{(o.dependencies || []).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2>Sources you can read from <InfoHint title="Sources are picked, not invented" width={280}>Feeds reference a source system. These are the origins the platform already ingests.</InfoHint></h2><span className="hint">source_system</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Source</th><th>Ingest</th><th>Topic / feed</th></tr></thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.sourceId}>
                      <td className="mono lead">{s.sourceId}</td>
                      <td><span className="pill info">{s.ingestMode}</span></td>
                      <td className="mono sec">{s.topicOrUrl}</td>
                    </tr>
                  ))}
                  {sources.length === 0 && <tr><td colSpan={3} className="empty">No sources.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
