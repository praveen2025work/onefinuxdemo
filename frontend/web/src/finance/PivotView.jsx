import { useMemo } from 'react';
import { PivotEngine } from '@mescius/wijmo.olap';
import { PivotGrid, PivotPanel } from '@mescius/wijmo.react.olap';
import '../wijmo.js';

/** Wijmo pivot (OLAP) on a tile's rows: drag fields between rows / columns / values in the panel. */
export default function PivotView({ rows }) {
  const engine = useMemo(() => {
    const sample = rows[0] || {};
    const keys = Object.keys(sample);
    const numeric = keys.filter((k) => typeof sample[k] === 'number');
    const text = keys.filter((k) => typeof sample[k] === 'string');
    return new PivotEngine({
      itemsSource: rows,
      rowFields: text.slice(0, 1),
      columnFields: text.slice(1, 2),
      valueFields: numeric.slice(0, 1),
      showRowTotals: 'Subtotals',
      showColumnTotals: 'Subtotals',
    });
  }, [rows]);

  if (!rows.length) return <p className="muted">No rows to pivot.</p>;
  return (
    <div className="pivot-wrap">
      <div className="pivot-panel wijmo-host"><PivotPanel itemsSource={engine} /></div>
      <div className="pivot-grid wijmo-host"><PivotGrid itemsSource={engine} /></div>
    </div>
  );
}
