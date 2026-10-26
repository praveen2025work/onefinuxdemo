import { useMemo, useState } from 'react';
import { PivotEngine } from '@mescius/wijmo.olap';
import { PivotChart, PivotGrid, PivotPanel } from '@mescius/wijmo.react.olap';
import { fieldKinds, plainRows } from '../lib/aggregate.js';
import { useChartPalette } from './Chart.jsx';
import '../wijmo.js';

/**
 * The standard pivot (Wijmo OLAP): field panel, pivot grid and an optional pivot chart, on any rows.
 * Starts with the first text field on rows, the second on columns and the first number as the value;
 * drag fields in the panel to re-shape it.
 */
export default function PivotView({ rows = [], rowFields, columnFields, valueFields, height = 340 }) {
  const [chart, setChart] = useState(false);
  const palette = useChartPalette();
  const engine = useMemo(() => {
    const data = plainRows(rows);
    const { numeric, text } = fieldKinds(data);
    return new PivotEngine({
      itemsSource: data,
      rowFields: rowFields || text.slice(0, 1),
      columnFields: columnFields || text.slice(1, 2),
      valueFields: valueFields || (numeric.length ? numeric.slice(0, 1) : []),
      showRowTotals: 'Subtotals',
      showColumnTotals: 'Subtotals',
    });
  }, [rows, rowFields, columnFields, valueFields]);

  if (!rows.length) return <p className="muted">No rows to pivot.</p>;
  return (
    <div className="pivot">
      <div className="pivot-wrap" style={{ height }}>
        <div className="pivot-panel"><PivotPanel itemsSource={engine} /></div>
        <div className="pivot-grid"><PivotGrid itemsSource={engine} /></div>
      </div>
      <label className="pivot-toggle">
        <input type="checkbox" checked={chart} onChange={(e) => setChart(e.target.checked)} /> Pivot chart
      </label>
      {chart && <div className="pivot-chart"><PivotChart itemsSource={engine} palette={palette} showTitle={false} /></div>}
    </div>
  );
}
