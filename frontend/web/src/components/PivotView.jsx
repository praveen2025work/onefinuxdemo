import { useMemo, useState } from 'react';
import { PivotEngine, ShowTotals } from '@mescius/wijmo.olap';
import { PivotChart, PivotGrid, PivotPanel } from '@mescius/wijmo.react.olap';
import { fieldKinds, plainRows, resolvePivotField } from '../lib/aggregate.js';
import { useChartPalette } from './Chart.jsx';
import '../wijmo.js';

/** Place fields after the engine has generated them. Bindings are not PivotField keys. */
function placeFields(list, names) {
  if (!names?.length) return;
  const catalog = list.engine.fields;
  for (const name of names) {
    const field = resolvePivotField(catalog, name);
    if (field) list.push(field);
  }
}

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
    const next = new PivotEngine({
      itemsSource: data,
      showRowTotals: ShowTotals.Subtotals,
      showColumnTotals: ShowTotals.Subtotals,
    });
    // PivotField.key is the generated header ("Region"), not the binding ("region").
    // Passing bindings into the constructor makes getField return null, and Wijmo throws
    // "This collection must contain PivotField objects only."
    next.beginUpdate();
    placeFields(next.rowFields, rowFields || text.slice(0, 1));
    placeFields(next.columnFields, columnFields || text.slice(1, 2));
    placeFields(next.valueFields, valueFields || (numeric.length ? numeric.slice(0, 1) : []));
    next.endUpdate();
    return next;
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
