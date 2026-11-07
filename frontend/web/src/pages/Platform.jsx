import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Stat } from '../components/bits.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { hubJson } from '../api.js';

const list = (v) => (Array.isArray(v) ? v.join(', ') : v ?? '');

/** GridSpecs for each settings section, with the rows inline from one /api/platform/settings response. */
function platformSpecs(s) {
  const spec = (id, title, rows, columns, extra = {}) => ({ id, title, source: { rows }, views: ['grid'], columns, ...extra });
  return {
    roles: spec('platform-roles', 'Role structure — verbs per role', s.roles || [], [
      { key: 'role', label: 'Role', type: 'chip', width: 140 },
      { key: 'verb', label: 'Verb', type: 'mono' },
    ]),
    calendar: spec('platform-calendar', 'Close calendar', (s.calendar || []).map((r) => ({ ...r, weekend: list(r.weekend), holidays: list(r.holidays) })), [
      { key: 'region', label: 'Region', type: 'chip', width: 100 },
      { key: 'zone', label: 'Zone', type: 'mono', width: 170 },
      { key: 'weekend', label: 'Weekend', width: 170 },
      { key: 'holidays', label: 'Holidays' },
    ]),
    outcomes: spec('platform-outcomes', 'Outcome deadlines', s.outcomes || [], [
      { key: 'outcomeId', label: 'Outcome', type: 'mono', width: 170 },
      { key: 'name', label: 'Name' },
      { key: 'regions', label: 'Regions', width: 110 },
      { key: 'deadline', label: 'Deadline', width: 230 },
      { key: 'zone', label: 'Zone', type: 'mono', width: 150 },
      { key: 'owner', label: 'Owner', width: 160 },
      { key: 'onReady', label: 'On ready', type: 'chip', width: 130 },
    ]),
    channels: spec('platform-channels', 'Notification channels', (s.channels || []).map((c) => ({ ...c, enabled: c.enabled ? 'on' : 'off' })), [
      { key: 'channel', label: 'Channel', type: 'mono', width: 130 },
      { key: 'enabled', label: 'State', type: 'chip', width: 80 },
      { key: 'detail', label: 'Detail', wrap: true },
    ]),
    actionTargets: spec('platform-action-targets', 'Action targets', s.actionTargets || [], [
      { key: 'id', label: 'Target', type: 'mono', width: 150 },
      { key: 'url', label: 'URL', type: 'mono' },
    ]),
    writebackTargets: spec('platform-writeback-targets', 'Write-back targets', s.writebackTargets || [], [
      { key: 'id', label: 'Target', type: 'mono', width: 150 },
      { key: 'url', label: 'URL', type: 'mono' },
    ]),
    searchProviders: spec('platform-search', 'Search providers', s.searchProviders || [], [
      { key: 'id', label: 'Provider', type: 'mono', width: 130 },
      { key: 'label', label: 'Label', width: 160 },
      { key: 'url', label: 'URL', type: 'mono' },
    ]),
    experiments: spec('platform-experiments', 'Experiments', (s.experiments || []).map((e) => ({ ...e, enabled: e.enabled ? 'running' : 'off' })), [
      { key: 'id', label: 'Experiment', type: 'mono', width: 160 },
      { key: 'description', label: 'Description' },
      { key: 'variants', label: 'Variants', width: 150 },
      { key: 'enabled', label: 'State', type: 'chip', width: 90 },
      { key: 'conversion', label: 'Success event', type: 'mono', width: 150 },
    ]),
  };
}

/**
 * Platform settings, read-only: the role structure, close calendar, outcome deadlines, notification channels,
 * action and write-back targets, search providers and experiments the hub is running with. Change them in
 * configuration; this screen never writes. Needs the PLATFORM_VIEW verb.
 */
export default function Platform() {
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    hubJson('/api/platform/settings').then(setSettings).catch((e) => setErr(e.message));
  }, []);

  const specs = useMemo(() => (settings ? platformSpecs(settings) : null), [settings]);
  const roles = new Set((settings?.roles || []).map((r) => r.role)).size;
  const live = (settings?.channels || []).filter((c) => c.enabled).length;

  return (
    <>
      <PageHeader icon="wrench" title="Platform settings" context="Roles · calendar · channels · targets"
        infoTitle="What the hub runs with" infoWidth={360}
        info={<>Read-only. Every row comes from the hub's configuration (application.yml and its environment
          overrides): verbs per role, the business-day calendar and zone per region, each outcome's deadline rule,
          external notification channels, action and write-back targets, search providers and A-B experiments.
          Passwords and keys are never shown.</>}
        summary={settings ? `Business zone ${settings.zone} · delays ${settings.stitchDelays ? 'on' : 'off'}` : undefined} />

      {err && <div className="banner warn" style={{ marginBottom: 8 }}><div>{err}. Platform settings need the PLATFORM_VIEW verb (admin, RTB or audit).</div></div>}

      {specs && (
        <>
          <div className="grid g4" style={{ marginBottom: 8 }}>
            <Stat label="Roles" value={roles} foot={`${settings.roles.length} verbs granted`} icon="shield" />
            <Stat label="Regions" value={settings.calendar.length} foot="each with its own zone" icon="clock" />
            <Stat label="Outcomes" value={settings.outcomes.length} foot="deadline rules" icon="sla" />
            <Stat label="External channels on" value={live} foot={`of ${settings.channels.length}`} icon="bell" tone={live ? 'ok' : undefined} />
          </div>
          <div className="grid g2">
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.roles} context={{}} height={340} /></div></div>
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.calendar} context={{}} height={340} /></div></div>
          </div>
          <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.outcomes} context={{}} height={300} /></div></div>
          <div className="grid g2">
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.channels} context={{}} height={200} /></div></div>
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.experiments} context={{}} height={200} /></div></div>
          </div>
          <div className="grid g3">
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.actionTargets} context={{}} height={240} /></div></div>
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.writebackTargets} context={{}} height={240} /></div></div>
            <div className="panel"><div className="panel-bd"><SpecGrid spec={specs.searchProviders} context={{}} height={240} /></div></div>
          </div>
        </>
      )}
    </>
  );
}
