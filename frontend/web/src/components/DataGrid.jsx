import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CollectionView } from '@mescius/wijmo';
import { FlexGrid, FlexGridCellTemplate, FlexGridColumn } from '@mescius/wijmo.react.grid';
import { FlexGridFilter } from '@mescius/wijmo.react.grid.filter';
import Icon from './Icon.jsx';
import { rowsToCsv } from '../lib/csv.js';
import { plainRows } from '../lib/aggregate.js';
import '../wijmo.js';

// Status words the platform uses, mapped to the standard pill tones.
export const PILL_TONE = {
  READY: 'ok', CLEARED: 'ok', COMPLETED: 'ok', DISPATCHED: 'ok', DELIVERED: 'ok', OK: 'ok', OPEN_OK: 'ok',
  SIGNED: 'bo', BLOCKED: 'fail', FAILED: 'fail', DENY: 'fail', OPEN: 'fail', HOLD: 'warn', DELAYED: 'warn',
  PENDING: 'warn', WAITING: 'plain', NOT_YET: 'plain', NOT_STARTED: 'plain', REPLAYED: 'info', CLOSED: 'plain',
  CRITICAL: 'fail', WARN: 'warn', SUCCESS: 'ok', INFO: 'info',
  success: 'ok', warning: 'warn', error: 'fail', info: 'info', Available: 'ok', Complete: 'ok', Completed: 'ok',
  Pending: 'warn', Open: 'fail', Investigating: 'warn', Disputed: 'fail', Confirmed: 'ok', 'Not Started': 'fail',
  'In Progress': 'warn', Submitted: 'ok', Delayed: 'warn',
};

const HEADER_H = 26;

function keyOf(row) {
  if (!row || typeof row !== 'object') return null;
  return row.instanceId ?? row.id ?? row.eventId ?? row.outboxId ?? row.deadLetterId ?? row.escalationId ?? null;
}

function esc(text) {
  return String(text).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
}

/**
 * The standard grid — Wijmo FlexGrid with the shared skin, column filters, sort, quick search and CSV export.
 *
 * columns: [{ binding, header, width, minWidth, format, align,
 *             pill (status pill; tone(value) overrides), chip (mono chip), mono, wrap, suffix (e.g. '%'),
 *             template: (item) => ReactNode   — React cell content (buttons, meters, two-line cells) }]
 * height:  px, '100%', or 'auto' (fits the rows up to maxHeight).
 * onSelect(item) fires when a row is selected — Workspace views share that row on their link channel.
 */
export default function DataGrid({ rows = [], columns, height = 360, maxHeight = 520, rowHeight = 28, onSelect,
  title, exportName = 'grid', toolbar = true, search = true, empty = 'No rows.', dense = false, actions, frozen = 0 }) {
  const [query, setQuery] = useState('');
  const queryRef = useRef('');
  queryRef.current = query.trim().toLowerCase();
  const cols = columns && columns.length ? columns : null;

  // One CollectionView for the life of the grid; new rows swap its source, so a poll or a live refresh keeps
  // the user's sort, column filters, scroll and selection.
  const view = useMemo(() => {
    const cv = new CollectionView([]);
    cv.filter = (item) => {
      const q = queryRef.current;
      if (!q) return true;
      return Object.values(item || {}).some((v) => v != null && typeof v !== 'object' && String(v).toLowerCase().includes(q));
    };
    return cv;
  }, []);
  const [, bump] = useState(0);

  // A user's click selects a row; loading data never does (a linked view would otherwise share row 1 by itself).
  const userPick = useRef(false);
  // Wijmo moves the selection inside this same pointer / key event; the flag never outlives it.
  const markPick = () => { userPick.current = true; setTimeout(() => { userPick.current = false; }, 0); };
  useLayoutEffect(() => {
    const keep = view.currentItem;
    view.sourceCollection = rows;
    const again = keep && keyOf(keep) != null ? rows.find((r) => keyOf(r) === keyOf(keep)) : null;
    if (again) view.moveCurrentTo(again);
    else view.moveCurrentToPosition(-1);
    bump((n) => n + 1);
  }, [rows, view]);
  useEffect(() => { view.refresh(); }, [query, view]);

  // 'auto' fits the rows (capped); '100%' fills a flex parent (Workspace views); a number is fixed pixels.
  const fill = height === '100%';
  const px = height === 'auto'
    ? Math.min(maxHeight, HEADER_H + rowHeight * Math.max(rows.length, 1) + 2)
    : height;

  function formatItem(grid, e) {
    if (e.panel !== grid.cells || !cols) return;
    const col = cols[e.col];
    if (!col || col.template) return;
    if (!col.pill && !col.chip && !col.suffix) return;
    const value = grid.getCellData(e.row, e.col, true);
    if (value == null || value === '') return;
    if (!col.pill && !col.chip) {
      e.cell.textContent = value + col.suffix;
      return;
    }
    if (col.pill) {
      const raw = grid.getCellData(e.row, e.col, false);
      const tone = (col.tone && col.tone(raw, grid.rows[e.row]?.dataItem)) || PILL_TONE[raw] || 'plain';
      e.cell.innerHTML = `<span class="pill ${tone}">${esc(value)}</span>`;
    } else {
      e.cell.innerHTML = `<span class="chip">${esc(value)}</span>`;
    }
  }

  function exportCsv() {
    const header = cols ? cols.filter((c) => c.binding).map((c) => ({ key: c.binding, label: c.header || c.binding })) : null;
    const csv = rowsToCsv(plainRows(view.items.slice()), header);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${exportName}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className={'datagrid' + (dense ? ' dense' : '') + (fill ? ' fill' : '')}>
      {toolbar && (
        <div className="dg-bar">
          {title && <b className="dg-title">{title}</b>}
          <span className="sec">{query ? `${view.items.length} of ${rows.length}` : `${rows.length} row${rows.length === 1 ? '' : 's'}`}</span>
          <div className="spacer" />
          {actions}
          {search && (
            <label className="search-inp sm">
              <Icon name="search" size={13} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search grid" />
            </label>
          )}
          <button type="button" className="btn ghost sm" onClick={exportCsv} disabled={!rows.length} title="Export the filtered rows">
            <Icon name="download" size={13} /> CSV
          </button>
        </div>
      )}
      <div className="wijmo-host dg-host" style={fill ? undefined : { height: px }}
        onPointerDownCapture={markPick} onKeyDownCapture={markPick}>
        <FlexGrid
          itemsSource={view}
          isReadOnly
          autoGenerateColumns={!cols}
          headersVisibility="Column"
          selectionMode="Row"
          frozenColumns={frozen}
          initialized={(g) => {
            g.rows.defaultSize = rowHeight;
            g.columnHeaders.rows.defaultSize = HEADER_H;
          }}
          formatItem={formatItem}
          selectionChanged={(g) => {
            if (!userPick.current) return;
            userPick.current = false;
            if (onSelect && g.selectedItems?.length) onSelect(g.selectedItems[0]);
          }}
        >
          <FlexGridFilter />
          {cols && cols.map((c, i) => (
            <FlexGridColumn key={c.binding || `col-${i}`} binding={c.binding} header={c.header ?? c.binding}
              width={c.width || '*'} minWidth={c.minWidth || 70} format={c.format} align={c.align}
              wordWrap={Boolean(c.wrap)} allowSorting={c.sortable !== false} cssClass={[c.mono ? 'cell-mono' : '', c.className || ''].join(' ').trim() || undefined}>
              {c.template && <FlexGridCellTemplate cellType="Cell" template={(ctx) => c.template(ctx.item, ctx)} />}
            </FlexGridColumn>
          ))}
        </FlexGrid>
        {rows.length === 0 && <div className="dg-empty">{empty}</div>}
      </div>
    </div>
  );
}
