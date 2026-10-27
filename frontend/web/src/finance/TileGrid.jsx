import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import FinanceTile from './FinanceTile.jsx';
import DataView from '../components/DataView.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { useGridSpec } from '../grid/useGridSpec.js';
import { paramContext } from '../grid/spec.js';
import { subscribeLive } from '../live/liveLink.js';
import { useApp } from '../store.jsx';
import { CHART } from './transform.js';
import Icon from '../components/Icon.jsx';

/** Rows behind a tile for the detail grid: its grid slide if it has one, else the richest slide. */
export function detailRows(tile) {
  if (!tile?.slides?.length) return { rows: [], columns: null, title: tile?.title };
  const grid = tile.slides.find((s) => s.chartType === CHART.grid && s.data?.length);
  const slide = grid || tile.slides.slice().sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0];
  const columns = slide.columns?.length
    ? slide.columns.map((c) => ({ binding: c.key, header: c.label, pill: /status|severity/i.test(c.key) }))
    : null;
  return { rows: slide.data || [], columns, title: slide.title || tile.title };
}

function SpecDetail({ gridSpecId }) {
  const { filters } = useApp();
  const { spec, loading, error } = useGridSpec(gridSpecId);
  return (
    <div className="panel fin-detail">
      <div className="panel-hd">
        <h2>Detailed data · GridSpec</h2>
        <span className="hint">
          <Link to={`/grids?spec=${encodeURIComponent(gridSpecId)}`} className="mono">{gridSpecId}</Link>
          {' · '}desk / embed
        </span>
      </div>
      <div className="panel-bd">
        {loading && <div className="empty sm">Loading grid…</div>}
        {error && <div className="empty sm">{error}</div>}
        {spec && <SpecGrid spec={spec} context={paramContext(filters)} subscribe={subscribeLive} height={320} />}
      </div>
    </div>
  );
}

function SlideDetail({ tile }) {
  const { rows, columns, title } = useMemo(() => detailRows(tile), [tile]);
  return (
    <div className="panel fin-detail">
      <div className="panel-hd"><h2>Detailed data · {tile.title}</h2><span className="hint">Wijmo grid · pivot · chart</span></div>
      <div className="panel-bd">
        <DataView rows={rows} columns={columns} height={320} title={title} exportName={tile.id} />
      </div>
    </div>
  );
}

function DetailPanel({ tile }) {
  if (tile?.gridSpecId) return <SpecDetail gridSpecId={tile.gridSpecId} />;
  return <SlideDetail tile={tile} />;
}

/**
 * STEPS TileGrid: tile view (2–5 columns), split view (60/40 with compact tiles on the right) and full view
 * (tile selector + one tile), with the Wijmo detail grid / pivot under the focused tile. When the tile
 * declares gridSpecId, the detail pane is that GridSpec (library / desk / embed).
 */
export default function TileGrid({ tiles, columns, viewMode, focusedId, onFocus, loading, liveIds, flashIds }) {
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);

  if (loading && tiles.length === 0) {
    return <div className="fin-grid" style={{ '--cols': columns }}>{Array.from({ length: 6 }, (_, i) => <div key={i} className="ftile skeleton" />)}</div>;
  }
  if (!tiles.length) return <div className="empty">No tiles on this tab.</div>;

  const focused = (focusedId && byId.get(focusedId)) || tiles[0];

  if (viewMode === 'full') {
    return (
      <div className="fin-full">
        <div className="fin-picker">
          {tiles.map((t) => (
            <button key={t.id} className={'btn ghost sm' + (t.id === focused.id ? ' on' : '')} onClick={() => onFocus(t.id, 'full')}>
              <i className={'ftile-dot ' + ({ success: 'ok', warning: 'warn', error: 'fail' }[t.status] || 'info')} /> {t.title}
              {t.gridSpecId && <Icon name="grid" size={11} title={t.gridSpecId} />}
            </button>
          ))}
        </div>
        <FinanceTile key={focused.id} tile={focused} focused full live={liveIds.has(focused.id)} flash={flashIds.has(focused.id)}
          onFocus={() => onFocus(focused.id, 'tile')} />
        <DetailPanel tile={focused} />
      </div>
    );
  }

  if (viewMode === 'split') {
    return (
      <div className="fin-split">
        <div className="fin-split-main">
          <FinanceTile key={focused.id} tile={focused} focused live={liveIds.has(focused.id)} flash={flashIds.has(focused.id)}
            onFocus={() => onFocus(focused.id, 'full')} />
          <DetailPanel tile={focused} />
        </div>
        <div className="fin-split-side">
          {tiles.filter((t) => t.id !== focused.id).map((t) => (
            <FinanceTile key={t.id} tile={t} compact live={liveIds.has(t.id)} flash={flashIds.has(t.id)} onFocus={() => onFocus(t.id, 'split')} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fin-grid" style={{ '--cols': columns }}>
      {tiles.map((t) => (
        <FinanceTile key={t.id} tile={t} live={liveIds.has(t.id)} flash={flashIds.has(t.id)} onFocus={() => onFocus(t.id, 'split')} />
      ))}
    </div>
  );
}
