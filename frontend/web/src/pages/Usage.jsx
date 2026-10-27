import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { PageHeader, Stat } from '../components/bits.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { uxApi } from '../api.js';
import { subscribeLive } from '../live/liveLink.js';

const DAYS = [7, 30, 90];

/** GridSpecs for the usage report, bound to the chosen window and team. */
function usageSpecs(days, team) {
  const params = [{ name: 'days', value: String(days) }, ...(team ? [{ name: 'team', value: team }] : [])];
  const source = (rowsPath) => ({ endpoint: '/api/ux/usage', params, rowsPath });
  return {
    apps: {
      id: 'ux-apps', title: 'Screens and apps opened', source: source('apps'), views: ['grid', 'chart'], chart: { x: 'app', y: 'opens' },
      columns: [
        { key: 'app', label: 'Screen or app', type: 'mono' },
        { key: 'opens', label: 'Opens', type: 'number', width: 90 },
        { key: 'users', label: 'People', type: 'number', width: 90 },
        { key: 'lastUsed', label: 'Last used', type: 'datetime', width: 160 },
      ],
    },
    components: {
      id: 'ux-components', title: 'Features used', source: source('components'), views: ['grid', 'chart'], chart: { x: 'component', y: 'uses' },
      columns: [
        { key: 'component', label: 'Feature', type: 'mono' },
        { key: 'app', label: 'On', type: 'mono', width: 170 },
        { key: 'uses', label: 'Uses', type: 'number', width: 80 },
        { key: 'users', label: 'People', type: 'number', width: 80 },
        { key: 'lastUsed', label: 'Last used', type: 'datetime', width: 150 },
      ],
    },
    access: {
      id: 'ux-access', title: 'Application access log', source: source('access'), views: ['grid'],
      columns: [
        { key: 'at', label: 'When', type: 'datetime', width: 160 },
        { key: 'actor', label: 'Who', width: 140 },
        { key: 'team', label: 'Team', type: 'chip', width: 100 },
        { key: 'type', label: 'How', type: 'chip', width: 110 },
        { key: 'app', label: 'Screen or app', type: 'mono' },
      ],
    },
    feedback: {
      id: 'ux-feedback', title: 'Feedback', source: { endpoint: '/api/ux/feedback' }, views: ['grid', 'chart'], chart: { x: 'category', op: 'count' },
      columns: [
        { key: 'at', label: 'When', type: 'datetime', width: 150 },
        { key: 'actor', label: 'Who', width: 130 },
        { key: 'app', label: 'Screen', type: 'mono', width: 150 },
        { key: 'category', label: 'Kind', type: 'chip', width: 100 },
        { key: 'rating', label: 'Rating', width: 84 },
        { key: 'text', label: 'Note', wrap: true },
      ],
    },
  };
}

/**
 * Usage telemetry and feedback: which screens and features people use (and who opened what, as an access log), what
 * they told us, and how each A-B experiment's variants perform. All from /api/ux; nothing here is per-team code.
 */
export default function Usage() {
  const { filters } = useApp();
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState('team');
  const [usage, setUsage] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [err, setErr] = useState(null);
  const team = scope === 'team' ? filters.groupUnit : null;
  const specs = useMemo(() => usageSpecs(days, team), [days, team]);

  useEffect(() => {
    setErr(null);
    uxApi.usage({ days, team }).then(setUsage).catch((e) => { setUsage(null); setErr(e.message); });
    uxApi.feedback().then(setFeedback).catch(() => setFeedback([]));
    uxApi.experimentResults().then(setExperiments).catch(() => setExperiments([]));
  }, [days, team]);

  const opens = (usage?.apps || []).reduce((n, a) => n + Number(a.opens || 0), 0);
  const people = Math.max(0, ...(usage?.apps || []).map((a) => Number(a.users || 0)));
  const rated = feedback.filter((f) => Number(f.rating) > 0);
  const avg = rated.length ? (rated.reduce((n, f) => n + Number(f.rating), 0) / rated.length).toFixed(1) : '—';

  return (
    <>
      <PageHeader icon="trend" title="Usage & feedback" context="Telemetry · feedback · experiments"
        infoTitle="What people use" infoWidth={360}
        info={<>The console records which screens and desk views each person opens, which features they use (lens switches,
          searches, assistant questions, write-back), experiment exposure, and feedback notes — with the team they were
          working in. It feeds team recommendations and A-B results. Events are kept for 180 days.</>}
        summary={`${opens} opens · ${feedback.length} feedback notes${team ? ` · ${team}` : ' · all teams'}`}>
        <div className="seg" role="group" aria-label="Window">
          {DAYS.map((d) => <button key={d} type="button" className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d} days</button>)}
        </div>
        <div className="seg" role="group" aria-label="Team">
          <button type="button" className={scope === 'team' ? 'on' : ''} onClick={() => setScope('team')}>{filters.groupUnit || 'My team'}</button>
          <button type="button" className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All teams</button>
        </div>
      </PageHeader>

      {err && <div className="banner warn" style={{ marginBottom: 8 }}><div>{err}. All-teams usage needs the ACCESS_REVIEW verb; pick your team instead.</div></div>}

      <div className="grid g4" style={{ marginBottom: 8 }}>
        <Stat label="Opens" value={opens} foot={`last ${days} days`} icon="window" />
        <Stat label="Most people on one screen" value={people || '—'} foot="distinct users" icon="users" />
        <Stat label="Feedback notes" value={feedback.length} foot="newest 100" icon="message" />
        <Stat label="Average rating" value={avg} foot={`${rated.length} rated`} icon="spark" tone={avg !== '—' && Number(avg) < 3 ? 'warn' : 'ok'} />
      </div>

      <div className="grid g2">
        <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.apps} context={{}} height={300} /></div></div>
        <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.components} context={{}} height={300} /></div></div>
      </div>
      <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.feedback} context={{}} subscribe={subscribeLive} height={280} /></div></div>

      <div className="panel">
        <div className="panel-hd"><h2>Experiments</h2><span className="hint">each person always sees the same variant</span></div>
        <div className="panel-bd">
          {experiments.length === 0 && <div className="empty sm">No experiments configured (onefinux.ux.experiments).</div>}
          <div className="grid g2">
            {experiments.map((e) => (
              <div key={e.id} className="xp">
                <div className="xp-hd"><b>{e.description || e.id}</b> <span className="mono sec">{e.id}</span>
                  <span className={'pill ' + (e.enabled ? 'ok' : 'plain')}>{e.enabled ? 'running' : 'off'}</span></div>
                <div className="sec">Success: <span className="mono">{e.conversion || '—'}</span></div>
                <div className="xp-vars">
                  {(e.variants || []).length === 0 && <span className="sec">No one has seen it yet.</span>}
                  {(e.variants || []).map((v) => {
                    const rate = v.exposed ? Math.round((100 * v.converted) / v.exposed) : 0;
                    return (
                      <div key={v.variant} className="xp-var">
                        <span className="chip">{v.variant}</span>
                        <span className="xp-bar"><i style={{ width: `${rate}%` }} /></span>
                        <span className="mono">{rate}%</span>
                        <span className="sec">{v.converted} of {v.exposed}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!team && <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.access} context={{}} height={300} /></div></div>}
    </>
  );
}
