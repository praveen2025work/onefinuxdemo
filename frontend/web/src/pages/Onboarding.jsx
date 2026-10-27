import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, outcomesApi } from '../api';
import { useApp } from '../store.jsx';
import { Loading, PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import OutcomeWizard from '../components/OutcomeWizard.jsx';
import { EXAMPLE, BLANK_FEED } from '../lib/outcomeForm.js';

export default function Onboarding() {
  const { filters } = useApp();
  const [defs, setDefs] = useState(null);
  const [sources, setSources] = useState([]);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0); // a fresh wizard after each outcome goes live

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

  async function submit(definition) {
    setBusy(true); setBanner(null);
    try {
      if (defs.some((o) => o.id === definition.id)) throw new Error(`${definition.id} is already live. Pick another id, or edit it on Configuration.`);
      const created = await outcomesApi.register(definition, filters.cobDate || undefined);
      const keys = definition.dependencies.reduce((n, d) => n + d.expectedCount, 0);
      setBanner({
        cls: 'ok',
        text: `${definition.name} (${definition.id}) is live: ${definition.dependencies.length} feeds, ${keys} keys expected. It now folds on the Board and Reports.`,
        outcome: created,
        id: definition.id,
      });
      setRound((r) => r + 1);
      await load();
    } catch (err) {
      setBanner({ cls: 'fail', text: err.message });
    } finally { setBusy(false); }
  }

  if (!defs) return <Loading what="Loading onboarding…" />;

  return (
    <>
      <PageHeader icon="build" title="Onboard a business outcome" context="Build · onboard a new outcome"
        infoTitle="Onboarding vs Configuration" infoWidth={360}
        info={<>
          <b>Onboarding creates.</b> Walk the six steps: name the outcome and its question, list the feeds it depends on,
          say when it is due, choose what happens when it is ready, add grids if you want them, then review and go live.
          No code and no new screen.<br /><br />
          <b>Configuration governs.</b> Once live, review or edit it on the Configuration screen, through the same steps.
        </>}
        summary="Six steps: outcome → feeds → SLA → when ready → grids → review">
        <Link className="btn ghost" to="/configuration"><Icon name="config" size={14} /> Configuration</Link>
      </PageHeader>

      <div className="split">
        <div>
          {banner && (
            <div className={'banner ' + banner.cls} style={{ marginBottom: 8 }}>
              <div>
                <b>{banner.text}</b>
                {banner.outcome && (
                  <span className="mono-sm">Next: <Link to={`/reports/${banner.id}`}>its report</Link> · <Link to="/board">Board</Link> · <Link to={`/desks?outcome=${banner.id}`}>open a desk for it</Link> · <Link to="/configuration">Configuration</Link></span>
                )}
              </div>
            </div>
          )}
          <OutcomeWizard key={round} initial={EXAMPLE} knownSources={knownSources} busy={busy} onSubmit={submit}
            takenIds={defs.map((o) => o.id)}
            onReset={() => ({ ...EXAMPLE, id: '', name: '', question: '', feeds: [{ ...BLANK_FEED }], grids: [] })}
            sourcesHint={<span className="sec">Pick a source the platform already reads (list on the right), or type a new one.</span>} />
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>Live business outcomes</h2><span className="hint">{defs.length}</span></div>
            <div className="panel-bd tight">
              <table className="tbl">
                <thead><tr><th>Outcome</th><th>Question</th><th className="num">Feeds</th><th className="num">Grids</th></tr></thead>
                <tbody>
                  {defs.map((o) => (
                    <tr key={o.id}>
                      <td><span className="mono lead">{o.id}</span><div className="sec">{o.name}</div></td>
                      <td className="sec">{o.question}</td>
                      <td className="num mono">{(o.dependencies || []).length}</td>
                      <td className="num mono">{(o.grids || []).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><h2>Sources you can read from <InfoHint title="Sources are picked, not invented" width={280}>Feeds reference a source system (step 2). These are the origins the platform already ingests.</InfoHint></h2><span className="hint">source_system</span></div>
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
