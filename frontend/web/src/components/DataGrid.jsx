import { useEffect, useMemo, useRef, useState } from 'react';
import { CollectionView } from '@mescius/wijmo';
import { FlexGrid, FlexGridColumn } from '@mescius/wijmo.react.grid';
import { FlexGridFilter } from '@mescius/wijmo.react.grid.filter';
import Icon from './Icon.jsx';
import { rowsToCsv } from '../lib/csv.js';
import '../wijmo.js';

const PILL = { READY: 'ok', CLEARED: 'ok', COMPLETED: 'ok', SIGNED: 'bo', BLOCKED: 'fail', FAILED: 'fail', DELAYED: 'warn', NOT_YET: 'plain',
  success: 'ok', warning: 'warn', error: 'fail', info: 'info', Available: 'ok', Complete: 'ok', Pending: 'warn', Open: 'fail',
  Investigating: 'warn', Disputed: 'fail', Confirmed: 'ok', 'Not Started': 'fail', 'In Progress': 'warn', Submitted: 'ok' };

/**
 * Wijmo FlexGrid with the console theme (STEPS DataGrid / WijmoDataViewer): column filters, sort, quick search,
 * CSV export and optional row selection. `columns`: [{ binding, header, width, format, align, pill }].
 * Column-less rows auto-generate columns. Selecting a row calls onSelect(item) — Workspace views use that
 * to share context on their link channel.
 */
export default function DataGrid({ rows = [], columns, height = 360, onSelect, title, exportName = 'grid',
  toolbar = true, empty = 'No rows.', dense = false }) {
  const [query, setQuery] = useState('');
  const gridRef = useRef(null);
  const queryRef = useRef('');
  queryRef.current = query.trim().toLowerCase();

  const view = useMemo(() => {
    const cv = new CollectionView(rows);
    cv.filter = (item) => {
      const q = queryRef.current;
      if (!q) return true;
      return Object.values(item || {}).some((v) => v != null && String(v).toLowerCase().includes(q));
    };
    return cv;
  }, [rows]);

  useEffect(() => { view.refresh(); }, [query, view]);

  const cols = columns && columns.length ? columns : null;

  function formatItem(grid, e) {
    if (e.panel !== grid.cells || !cols) return;
    const col = cols[e.col];
    if (!col?.pill) return;
    const value = grid.getCellData(e.row, e.col, false);
    if (value == null || value === '') return;
    const tone = PILL[value] || 'plain';
    e.cell.innerHTML = `<span class="pill ${tone}">${String(value).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])}</span>`;
  }

  function exportCsv() {
    const items = view.items.slice();
    const header = cols ? cols.map((c) => ({ key: c.binding, label: c.header || c.binding })) : null;
    const csv = rowsToCsv(items, header);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className={'datagrid' + (dense ? ' dense' : '')}>
      {toolbar && (
        <div className="dg-bar">
          {title && <b className="dg-title">{title}</b>}
          <span className="sec">{view.items.length} of {rows.length}</span>
          <div className="spacer" />
          <label className="search-inp sm">
            <Icon name="search" size={13} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search grid" />
          </label>
          <button type="button" className="btn ghost sm" onClick={exportCsv} disabled={!rows.length} title="Export the filtered rows">
            <Icon name="download" size={13} /> CSV
          </button>
        </div>
      )}
      <div className="wijmo-host" style={{ height }}>
        <FlexGrid
          itemsSource={view}
          isReadOnly
          autoGenerateColumns={!cols}
          headersVisibility="Column"
          selectionMode="Row"
          initialized={(g) => { gridRef.current = g; }}
          formatItem={formatItem}
          selectionChanged={(g) => { if (onSelect && g.selectedItems?.length) onSelect(g.selectedItems[0]); }}
        >
          <FlexGridFilter />
          {cols && cols.map((c) => (
            <FlexGridColumn key={c.binding} binding={c.binding} header={c.header || c.binding}
              width={c.width || '*'} minWidth={c.minWidth || 80} format={c.format} align={c.align} />
          ))}
        </FlexGrid>
      </div>
      {rows.length === 0 && <p className="muted dg-empty">{empty}</p>}
    </div>
  );
}
