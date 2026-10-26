import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Menu from '../components/Menu.jsx';
import { financeBlueprint } from '../finance/blueprint.js';
import { useDashboardTiles } from '../finance/useDashboardTiles.js';
import { tilesForTab } from '../finance/transform.js';
import TileGrid from '../finance/TileGrid.jsx';
import FinanceAnalysis from '../finance/FinanceAnalysis.jsx';
import { broadcastContext } from '../workspace/interop.js';
import { CONTEXT_TYPES } from '../workspace/channels.js';

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

/**
 * Finance dashboard — STEPS' blueprint dashboard on One Finance: tabs, tile / split / full views, 2–5 columns,
 * rotating slides, Wijmo charts and a Wijmo detail grid + pivot. Live tiles come from the hub and refresh on
 * every WebSocket push; the finance tiles use seeded demo data until those systems are bound.
 */
export default function Finance() {
  const { filters, liveStatus } = useApp();
  const blueprint = financeBlueprint;
  const saved = readJson(LAYOUT_KEY, {});
  const [columns, setColumns] = useState(saved.columns || blueprint.defaults.columns);
  const [viewMode, setViewMode] = useState(saved.viewMode || blueprint.defaults.viewMode);
  const [tab, setTab] = useState(blueprint.tabs[0].id);
  const [focusedId, setFocusedId] = useState(null);
  const [hidden, setHidden] = useState(() => new Set(readJson(HIDDEN_KEY, [])));
  const [flashIds, setFlashIds] = useState(new Set());

  const { tiles, loading, errors, lastRefreshed, pulse, refresh } = useDashboardTiles(blueprint, filters);

  useEffect(() => { writeJson(LAYOUT_KEY, { columns, viewMode }); }, [columns, viewMode]);
  useEffect(() => { writeJson(HIDDEN_KEY, [...hidden]); }, [hidden]);

  const liveSources = useMemo(() => new Set(blueprint.dataSources.filter((d) => d.live).map((d) => d.id)), [blueprint]);
  const liveIds = useMemo(() => new Set(blueprint.tiles.filter((t) => liveSources.has(t.dataSourceId)).map((t) => t.id)), [blueprint, liveSources]);

  // A hub push refreshed the live tiles: light them up briefly so the eye catches what moved.
  useEffect(() => {
    if (!pulse) return undefined;
    setFlashIds(new Set(liveIds));
    const t = setTimeout(() => setFlashIds(new Set()), 900);
    return () => clearTimeout(t);
  }, [pulse, liveIds]);

  const visible = tiles.filter((t) => !hidden.has(t.id));
  const tabDef = blueprint.tabs.find((t) => t.id === tab) || blueprint.tabs[0];
  const tabTiles = tilesForTab(tabDef, visible);
  const failing = Object.keys(errors);

  function focus(id, mode) {
    setFocusedId(id);
    if (mode) setViewMode(mode);
    const t = tiles.find((x) => x.id === id);
    if (t) broadcastContext({ type: CONTEXT_TYPES.tile, tileId: t.id, title: t.title, status: t.status });
  }

  return (
    <>
      <PageHeader icon="dollar" title="Finance dashboard" infoTitle="A dashboard is data" infoWidth={330}
        context={`${filters.groupUnit} · COB ${filters.cobDate || '—'} · ${filters.region || 'all regions'}`}
        info={<>
          Ported from STEPS: one blueprint lists data sources, tiles and tabs. <b>Live</b> tiles read the hub and refresh
          on every WebSocket push; the other tiles use seeded demo data (<span className="mono">mock:</span>) until the finance
          system is bound — swap the endpoint, keep the tile. Charts and grids are Wijmo.
        </>}>
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
