import { useState } from 'react';
import { Link } from 'react-router-dom';
import { runScenario, cancelScenarios, resetPlatform } from '../api';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { PageTitle } from '../components/bits.jsx';

// A dedicated testing surface. The product pages (Home, Board, Reports) stay clean and view-only;
// every scenario that drives the demo lives here so it is obvious what is real vs. what is a trigger.
const SCENARIOS = [
  { key: 'reset', title: 'Reset platform', icon: 'refresh', tone: 'danger', cta: 'Reset',
    desc: 'Purge stitch instances and engine outcomes, then re-seed. Start every Helix / 15C3 demo from a clean slate.',
    run: () => resetPlatform() },
  { key: 'fobo', title: 'FOBO stitch', icon: 'board', tone: 'ok', cta: 'Drive',
    desc: 'FOBO does not send. CATS, Motif and MBR publish facts. R-1042 READY; R-2031 BLOCKED on Motif MB014. Helix only echoes a run on the ready row.',
    run: () => runScenario('fobo') },
  { key: 'helix', title: 'FOBO / Helix', icon: 'share', tone: 'ok', cta: 'Drive',
    desc: 'Motif sends 300 MASTERBOOK_READY facts (COB = today, NY). At 300 the hub POSTs Helix. Helix later publishes HELIX_ANALYSIS_COMPLETE. Set the header date to today, then watch Reports.',
    run: () => runScenario('helix') },
  { key: '15c3', title: '15C3 report', icon: 'report', tone: 'info', cta: 'Run feeds',
    desc: 'Feeds fold to ready, Axiom generates the regulatory pack, it becomes available to view.',
    run: () => runScenario('15c3') },
  { key: '15c3-fail', title: '15C3 with failure', icon: 'report', tone: 'warn', cta: 'Run + fail',
    desc: 'The 15C3 flow with a feed failure and recovery — shows the blocked and override path.',
    run: () => runScenario('15c3', { failure: 'true' }) },
  { key: 'pnl', title: 'PnL reporting', icon: 'activity', tone: 'info', cta: 'Drive',
    desc: 'Inputs fold under a tight SLA. Notify-only: the platform signals ready, it commands nothing.',
    run: () => runScenario('pnl') },
  { key: 'restate', title: 'Restate SAP', icon: 'refresh', tone: 'warn', cta: 'Restate',
    desc: 'SAP trial balance restatement — withdraws a prior completion so readiness drops downstream.',
    run: () => runScenario('restate') },
  { key: 'all', title: 'Run all', icon: 'bolt', tone: 'ok', cta: 'Run all',
    desc: 'Helix + 15C3 + PnL together — a full close of business in miniature.',
    run: () => runScenario('all') },
  { key: 'cancel', title: 'Cancel scheduled', icon: 'warning', tone: 'plain', cta: 'Cancel',
    desc: 'Stop the drip of any scenario still scheduled, so a clean run is not disturbed.',
    run: () => cancelScenarios() },
];

function summarise(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    const events = data.reduce((n, r) => n + (r.eventsScheduled || 0), 0);
    return `${data.length} scenarios · ${events} events scheduled`;
  }
  if (typeof data.cancelled === 'number') return `Cancelled ${data.cancelled} scheduled event(s)`;
  if (data.story) {
    const meta = [];
    if (data.eventsScheduled != null) meta.push(`${data.eventsScheduled} events`);
    if (data.durationSeconds != null) meta.push(`${data.durationSeconds}s`);
    if (data.cobDate) meta.push(`COB ${data.cobDate}`);
    return `${data.story}${meta.length ? ' — ' + meta.join(' · ') : ''}`;
  }
  return 'Done.';
}

export default function Drive() {
  const [state, setState] = useState({}); // key -> { busy, at, text, error }

  async function fire(s) {
    setState((p) => ({ ...p, [s.key]: { busy: true } }));
    try {
      const data = await s.run();
      setState((p) => ({ ...p, [s.key]: { busy: false, at: new Date(), text: summarise(data) } }));
    } catch (e) {
      setState((p) => ({ ...p, [s.key]: { busy: false, at: new Date(), error: e.message } }));
    }
  }

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Testing · scenario driver</div>
          <PageTitle icon="bolt">Drive scenarios
            <InfoHint title="Why a separate screen">Product pages stay view-only so a demo reads like the real thing. This screen is the only place that injects facts — reset first, drive a scenario, then watch it land on the Board and Reports.</InfoHint>
          </PageTitle>
        </div>
        <div className="ph-actions">
          <Link className="btn ghost" to="/board"><Icon name="board" size={15} /> Open Board</Link>
          <Link className="btn ghost" to="/reports"><Icon name="report" size={15} /> Open Reports</Link>
        </div>
      </div>

      <div className="banner info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={16} />
        <div><b>These buttons inject events into the hub.</b><span className="mono-sm">Reset first for a clean slate, then drive one scenario and follow it on the Board / Reports.</span></div>
      </div>

      <div className="drive-grid">
        {SCENARIOS.map((s) => {
          const st = state[s.key] || {};
          return (
            <div key={s.key} className={'dcard ' + s.tone}>
              <div className="dcard-hd">
                <span className={'dcard-ic ' + s.tone}><Icon name={s.icon} size={20} /></span>
                <h3>{s.title}</h3>
              </div>
              <p className="dcard-desc">{s.desc}</p>
              <div className="dcard-ft">
                <button className={'btn' + (s.tone === 'danger' ? ' danger' : s.tone === 'plain' ? ' ghost' : '')}
                  disabled={st.busy} onClick={() => fire(s)}>
                  {st.busy ? 'Running…' : s.cta}
                </button>
                {st.at && !st.busy && (
                  <span className="dcard-run">{st.at.toLocaleTimeString()}</span>
                )}
              </div>
              {(st.text || st.error) && !st.busy && (
                <div className={'dcard-result' + (st.error ? ' bad' : '')}>
                  {st.error ? st.error : st.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
