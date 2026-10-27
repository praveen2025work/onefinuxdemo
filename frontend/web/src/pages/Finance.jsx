import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Menu from '../components/Menu.jsx';
import { catalogue, loadUnitDashboards, resolveDashboard } from '../finance/dashboards.js';
import { useDashboardTiles } from '../finance/useDashboardTiles.js';
import { tilesForTab } from '../finance/transform.js';
import TileGrid from '../finance/TileGrid.jsx';
import FinanceAnalysis from '../finance/FinanceAnalysis.jsx';
import { broadcastContext } from '../workspace/interop.js';
import { CONTEXT_TYPES } from '../workspace/channels.js';
import { uxApi } from '../api.js';
import { trackUse } from '../ux/track.js';

const LAYOUT_KEY = 'ofx-fin-layout';
const HIDDEN_KEY = 'ofx-fin-hidden';
const VIEW_MODES = [
  { id: 'tile', label: 'Tile view', icon: 'grid' },
  { id: 'split', label: 'Split view', icon: 'split' },
  { id: 'full', label: 'Full view', icon: 'maximize' },
];

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window */ }
}

function layoutKey(id) { return `${LAYOUT_KEY}:${id}`; }
function hiddenKey(id) { return `${HIDDEN_KEY}:${id}`; }

/**
 * Finance dashboards: platform + unit-shared blueprints. /finance lists them; /finance/:id runs the shell
 * (tabs, tile / split / full, Wijmo charts, detail via GridSpec id when the tile declares one).
 */
export default function Finance() {
  const { id } = useParams();
  if (!id) return <FinancePicker />;
  return <FinanceShell dashboardId={id} />;
}

function FinancePicker() {
  const { filters } = useApp();
  const navigate = useNavigate();
  const [unit, setUnit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    loadUnitDashboards(filters.groupUnit).then((list) => { if (alive) setUnit(list); });
    return () => { alive = false; };
  }, [filters.groupUnit]);

  const list = catalogue(unit);

  async function shareCurrent() {
    const bp = resolveDashboard('finance', unit);
    if (!bp || !filters.groupUnit) return;
    setBusy(true); setMsg(null);
    try {
      await uxApi.shareTemplate({
        team: filters.groupUnit, kind: 'finance', name: `${bp.name} (${filters.groupUnit})`,
        json: { id: `${bp.id}-${filters.groupUnit.toLowerCase()}`, name: `${bp.name} · ${filters.groupUnit}`,
          description: bp.description, dataSources: bp.dataSources, tiles: bp.tiles, tabs: bp.tabs, defaults: bp.defaults },
      });
      trackUse('finance.share');
      const next = await loadUnitDashboards(filters.groupUnit);
      setUnit(next);
      setMsg({ cls: 'ok', text: `Shared a copy with ${filters.groupUnit}.` });
    } catch (e) {
      setMsg({ cls: 'fail', text: e.message || 'Share failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader icon="dollar" title="Finance dashboards" context={`${filters.groupUnit} · pick a blueprint`}
        infoTitle="A dashboard is data" infoWidth={340}
        info={<>
          Each dashboard is a blueprint: data sources, tiles and tabs. <b>Platform</b> ships the standard Finance
          board; a unit shares more via team templates (<span className="mono">kind: finance</span>). Detail panes
          open a named GridSpec when the tile sets <span className="mono">gridSpecId</span>.
        </>}
        summary={`${list.filter((d) => d.origin === 'platform').length} platform · ${list.filter((d) => d.origin === 'unit').length} unit`}>
        <button className="btn ghost sm" disabled={busy || !filters.groupUnit} onClick={shareCurrent}
          title="Share a copy of the platform finance board with this unit">
          <Icon name="share" size={13} /> Share platform board with unit
        </button>
      </PageHeader>
      {msg && <div className={'banner ' + msg.cls} role="status">{msg.text}</div>}
      <div className="fin-pick">
        {list.map((d) => (
          <button key={d.id} type="button" className="panel fin-pick-card" onClick={() => navigate(`/finance/${encodeURIComponent(d.id)}`)}>
            <div className="fin-pick-hd">
              <Icon name="dollar" size={18} />
              <div>
                <b>{d.name}</b>
                <div className="sec">{d.origin === 'platform' ? 'Platform' : `My unit · ${filters.groupUnit}`}</div>
              </div>
            </div>
            <p className="muted">{d.description || 'Dashboard blueprint'}</p>
            <div className="row wrapflex sec">
              <span>{d.tiles?.length || 0} tiles</span>
              <span>{d.tabs?.length || 0} tabs</span>
              <span className="mono">{d.id}</span>
            </div>
          </button>
        ))}
        {list.length === 0 && <div className="empty">No dashboards yet.</div>}
      </div>
    </>
  );
}

function FinanceShell({ dashboardId }) {
  const { filters, liveStatus } = useApp();
  const navigate = useNavigate();
  const [unit, setUnit] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadUnitDashboards(filters.groupUnit).then((list) => {
      if (!alive) return;
      setUnit(list);
      setReady(true);
    });
    return () => { alive = false; };
  }, [filters.groupUnit]);

  const blueprint = useMemo(() => resolveDashboard(dashboardId, unit), [dashboardId, unit]);

  const saved = readJson(layoutKey(dashboardId), {});
  const [columns, setColumns] = useState(saved.columns || blueprint?.defaults?.columns || 3);
  const [viewMode, setViewMode] = useState(saved.viewMode || blueprint?.defaults?.viewMode || 'tile');
  const [tab, setTab] = useState(blueprint?.tabs?.[0]?.id || 'overview');
  const [focusedId, setFocusedId] = useState(null);
  const [hidden, setHidden] = useState(() => new Set(readJson(hiddenKey(dashboardId), [])));
  const [flashIds, setFlashIds] = useState(new Set());

  useEffect(() => {
    if (!blueprint) return;
    setTab(blueprint.tabs[0]?.id || 'overview');
    setFocusedId(null);
    const nextLayout = readJson(layoutKey(dashboardId), {});
    setColumns(nextLayout.columns || blueprint.defaults?.columns || 3);
    setViewMode(nextLayout.viewMode || blueprint.defaults?.viewMode || 'tile');
    setHidden(new Set(readJson(hiddenKey(dashboardId), [])));
  }, [dashboardId, blueprint?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { tiles, loading, errors, lastRefreshed, pulse, refresh } = useDashboardTiles(blueprint || { dataSources: [], tiles: [] }, filters);

  useEffect(() => { writeJson(layoutKey(dashboardId), { columns, viewMode }); }, [dashboardId, columns, viewMode]);
  useEffect(() => { writeJson(hiddenKey(dashboardId), [...hidden]); }, [dashboardId, hidden]);

  const liveSources = useMemo(() => new Set((blueprint?.dataSources || []).filter((d) => d.live).map((d) => d.id)), [blueprint]);
  const liveIds = useMemo(() => new Set((blueprint?.tiles || []).filter((t) => liveSources.has(t.dataSourceId)).map((t) => t.id)), [blueprint, liveSources]);

  useEffect(() => {
    if (!pulse) return undefined;
    setFlashIds(new Set(liveIds));
    const t = setTimeout(() => setFlashIds(new Set()), 900);
    return () => clearTimeout(t);
  }, [pulse, liveIds]);

  if (ready && !blueprint) {
    return (
      <>
        <PageHeader icon="dollar" title="Dashboard not found" context={dashboardId}
          info={<>No platform or unit blueprint matches <span className="mono">{dashboardId}</span>.</>}>
          <Link className="btn ghost sm" to="/finance"><Icon name="chevron" size={13} /> All dashboards</Link>
        </PageHeader>
        <div className="empty">Open the catalogue and pick a dashboard.</div>
      </>
    );
  }

  if (!blueprint) return <div className="empty">Loading dashboard…</div>;

  const visible = tiles.filter((t) => !hidden.has(t.id));
  const tabDef = blueprint.tabs.find((t) => t.id === tab) || blueprint.tabs[0];
  const tabTiles = tilesForTab(tabDef, visible);
  const failing = Object.keys(errors);

  function focus(id, mode) {
    setFocusedId(id);
    if (mode) setViewMode(mode);
    const t = tiles.find((x) => x.id === id);
    if (t) broadcastContext({ type: CONTEXT_TYPES.tile, tileId: t.id, title: t.title, status: t.status, dashboardId });
  }

  return (
    <>
      <PageHeader icon="dollar" title={blueprint.name} infoTitle="A dashboard is data" infoWidth={330}
        context={`${filters.groupUnit} · COB ${filters.cobDate || '—'} · ${filters.region || 'all regions'} · ${blueprint.origin || 'platform'}`}
        info={<>
          Blueprint <span className="mono">{blueprint.id}</span>: data sources, tiles and tabs. <b>Live</b> tiles
          refresh on every hub push; other tiles use seeded demo data (<span className="mono">mock:</span>) until
          the finance system is bound. Detail opens a GridSpec when the tile sets <span className="mono">gridSpecId</span>.
        </>}>
        <button className="btn ghost sm" onClick={() => navigate('/finance')} title="All finance dashboards">
          <Icon name="chevron" size={13} /> Dashboards
        </button>
        <div className="seg" role="group" aria-label="View mode">
          {VIEW_MODES.map((m) => (
            <button key={m.id} className={viewMode === m.id ? 'on' : ''} title={m.label}
              onClick={() => { setViewMode(m.id); if (m.id !== 'tile' && !focusedId && tabTiles[0]) setFocusedId(tabTiles[0].id); }}>
              <Icon name={m.icon} size={14} /> <span className="fin-lbl">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Columns">
          {[2, 3, 4, 5].map((c) => (
            <button key={c} className={columns === c ? 'on' : ''} title={`${c} columns`} onClick={() => setColumns(c)} disabled={viewMode !== 'tile'}>
              <span className="col-ico" aria-hidden>{Array.from({ length: c }, (_, i) => <i key={i} />)}</span>
            </button>
          ))}
        </div>
        {failing.length > 0 && <span className="chip warn-chip" title={failing.map((k) => `${k}: ${errors[k]}`).join('\n')}><Icon name="alert" size={11} /> {failing.length} source{failing.length > 1 ? 's' : ''} failed</span>}
        <span className="fin-live" title={liveStatus.live ? `Live tiles refresh on every ${liveStatus.transport === 'ws' ? 'WebSocket' : 'SSE'} push` : 'Live tiles paused'}>
          <span className={'live-dot' + (liveStatus.live ? '' : ' off')} />
          {lastRefreshed ? lastRefreshed.toLocaleTimeString('en-GB') : 'Loading…'}
        </span>
        <Menu width={260} trigger={(open, toggle) => (
          <button className={'btn ghost sm' + (open ? ' on' : '')} onClick={toggle} title="Show or hide tiles"><Icon name="config" size={13} /> Tiles</button>
        )}>
          <div className="menu-sec">
            <div className="menu-lbl">Show tiles</div>
            {blueprint.tiles.map((t) => (
              <label key={t.id} className="menu-item">
                <input type="checkbox" checked={!hidden.has(t.id)} onChange={() => setHidden((h) => {
                  const next = new Set(h);
                  if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                  return next;
                })} />
                <span className="menu-txt">{t.title}</span>
                {liveIds.has(t.id) && <span className="ftile-live">live</span>}
              </label>
            ))}
          </div>
        </Menu>
        <button className="btn ghost sm" onClick={() => refresh()} title="Refresh"><Icon name="refresh" size={13} className={loading ? 'spin-ic' : ''} /></button>
      </PageHeader>

      <div className="tabs-bar" role="tablist">
        {blueprint.tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} className={'tab' + (t.id === tab ? ' on' : '')} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'live' && <span className="ftile-live">ws</span>}
          </button>
        ))}
      </div>

      {tab === 'analysis'
        ? <FinanceAnalysis tiles={visible} selectedId={focusedId} onSelect={(id) => focus(id)} />
        : <TileGrid tiles={tabTiles} columns={columns} viewMode={viewMode} focusedId={focusedId} onFocus={focus}
          loading={loading} liveIds={liveIds} flashIds={flashIds} />}
    </>
  );
}
