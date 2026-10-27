import { Suspense, lazy, useMemo, useState } from 'react';
import DataGrid from './DataGrid.jsx';
import Select from './Select.jsx';
import Icon from './Icon.jsx';
import { aggregateBy, fieldKinds, plainRows } from '../lib/aggregate.js';

const PivotView = lazy(() => import('./PivotView.jsx'));
const Chart = lazy(() => import('./Chart.jsx'));

const VIEWS = { grid: { label: 'Grid', icon: 'grid' }, pivot: { label: 'Pivot', icon: 'layers' }, chart: { label: 'Chart', icon: 'pie' } };
const CHART_TYPES = ['column', 'bar', 'line', 'area', 'donut'];
const OPS = ['sum', 'avg', 'count', 'min', 'max'];

/**
 * The standard data view: one set of rows, three Wijmo lenses — Grid (FlexGrid: filter, sort, search, CSV),
 * Pivot (OLAP panel + grid + chart) and Chart (FlexChart of any number by any dimension). Every screen that
 * shows tabular data uses this, so an analyst gets the same tools everywhere.
 */
export default function DataView({ rows = [], columns, views = ['grid', 'pivot', 'chart'], defaultView = 'grid', height = 360,
  title, exportName, onSelect, empty, pivot = {}, chart = {}, actions, rowHeight, maxHeight, edit, below }) {
  const [picked, setView] = useState(views.includes(defaultView) ? defaultView : views[0]);
  const view = views.includes(picked) ? picked : views[0];
  const data = useMemo(() => plainRows(rows), [rows]);
  const { numeric, text } = useMemo(() => fieldKinds(data), [data]);
  const [cat, setCat] = useState(chart.x || null);
  const [val, setVal] = useState(chart.y || null);
  const [op, setOp] = useState(chart.op || 'sum');
  const [type, setType] = useState(chart.type || 'column');
  const catField = cat && text.includes(cat) ? cat : text[0];
  const valField = val === '__count' ? null : (val && numeric.includes(val) ? val : numeric[0] || null);
  const series = useMemo(() => (catField ? aggregateBy(data, catField, valField, valField ? op : 'count') : []), [data, catField, valField, op]);
  const lensHeight = typeof height === 'number' ? height : 320;

  const switcher = views.length > 1 && (
    <div className="seg sm" role="tablist" aria-label="View as">
      {views.map((v) => (
        <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
          <Icon name={VIEWS[v].icon} size={12} /> {VIEWS[v].label}
        </button>
      ))}
    </div>
  );

  if (view === 'grid') {
    return (
      <>
        <DataGrid rows={rows} columns={columns} height={height} title={title} exportName={exportName} onSelect={onSelect}
          empty={empty} rowHeight={rowHeight} maxHeight={maxHeight} actions={<>{actions}{switcher}</>} edit={edit} />
        {below}
      </>
    );
  }

  return (
    <div className={'dataview' + (height === '100%' ? ' fill' : '')}>
      <div className="dg-bar">
        {title && <b className="dg-title">{title}</b>}
        <span className="sec">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
        <div className="spacer" />
        {view === 'chart' && (
          <>
            <Select variant="plain" value={catField || ''} onChange={setCat} options={text.map((f) => ({ value: f, label: `by ${f}` }))} placeholder="Dimension" />
            <Select variant="plain" value={valField || '__count'} onChange={setVal}
              options={[...numeric.map((f) => ({ value: f, label: f })), { value: '__count', label: 'count of rows' }]} />
            {valField && <Select variant="plain" value={op} onChange={setOp} options={OPS.map((o) => ({ value: o, label: o }))} />}
            <Select variant="plain" value={type} onChange={setType} options={CHART_TYPES.map((t) => ({ value: t, label: t }))} />
          </>
        )}
        {actions}
        {switcher}
      </div>
      <Suspense fallback={<p className="muted">Loading {VIEWS[view].label.toLowerCase()}…</p>}>
        {view === 'pivot' && <PivotView rows={data} height={lensHeight} {...pivot} />}
        {view === 'chart' && (catField
          ? <Chart data={series} x="name" series={[{ key: 'value', name: valField ? `${op} of ${valField}` : 'rows' }]} type={type} height={lensHeight} />
          : <p className="muted">These rows have no text field to chart by.</p>)}
      </Suspense>
    </div>
  );
}
