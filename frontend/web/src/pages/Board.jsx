import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import DataView from '../components/DataView.jsx';
import { StatusPill, Meter, PageTitle, formatAmount } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';
import { useLinkChannel, useShareInstance } from '../workspace/useLink.js';
import { channelById } from '../workspace/channels.js';

const STATUSES = ['', 'READY', 'BLOCKED', 'NOT_YET', 'SIGNED', 'CLEARED'];

export default function Board() {
  const { instances, filters, setFilters } = useApp();
  const navigate = useNavigate();
  const channel = channelById(useLinkChannel());
  const { picked, share } = useShareInstance();
  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const named = instances.find((i) => i.status === 'BLOCKED');
  const rows = useMemo(() => instances.map((i) => ({ ...i, amount: i.amount == null || i.amount === '' ? null : Number(i.amount) })), [instances]);
  const open = (i) => navigate('/instance/' + encodeURIComponent(i.instanceId));
  // The standard grid: filter, sort, CSV, pivot and chart for free; status, readiness and Open stay as cells.
  const columns = [
    { binding: 'kitId', header: 'Kit / question', minWidth: 190, width: '1.4*', template: (i) => (
      <div className="cell-2l"><span className="lead">{i.kitId}</span><span className="sec">{i.question}</span></div>) },
    { binding: 'sliceKey', header: 'Instance', width: 110, mono: true },
    { binding: 'region', header: 'Region', width: 90, chip: true },
    { binding: 'amount', header: 'Amount', width: 130, format: 'n0', align: 'right' },
    { binding: 'completedKeys', header: 'Readiness', minWidth: 160, template: (i) => (
      <Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} />) },
    { binding: 'status', header: 'Status', width: 130, template: (i) => <StatusPill status={i.status} /> },
    { binding: 'namedBlocker', header: 'Blocker', minWidth: 150, wrap: true },
    { binding: 'openEscalations', header: 'Esc.', width: 64, align: 'right' },
    { binding: null, header: '', width: 92, sortable: false, template: (i) => (
      <button className="btn ghost sm" onClick={() => open(i)}><Icon name="open" size={13} /> Open</button>) },
  ];

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Business-unit head · read only</div>
          <PageTitle icon="board">Outcome board
            <InfoHint title="Outcome board">Traffic lights for the whole unit. A head sees Ready / Blocked / escalations — no book grid, no engine internals.</InfoHint>
          </PageTitle>
          <p className="sub">
            {blocked
              ? `${ready} ready. ${blocked} blocked — ${named.region} ${named.kitId} on ${named.namedBlocker || named.status}${formatAmount(named.amount) ? ` · ${formatAmount(named.amount)}` : ''}.`
              : ready
                ? `${ready} ready across the unit. No named blockers.`
                : 'No instances match this filter.'}
          </p>
        </div>
        <div className="seg">
          {STATUSES.map((s) => (
            <button key={s || 'all'} className={filters.status === s ? 'on' : ''} onClick={() => setFilters({ status: s })}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-hd"><h2>{filters.groupUnit} · COB {filters.cobDate} · {filters.region || 'all regions'}</h2>
          {channel
            ? <span className="hint link-hint"><i className="chan-dot" style={{ background: channel.color }} /> select a row to share it{picked ? ' · shared' : ''}</span>
            : <span className="hint">v_head_board</span>}
        </div>
        <div className="panel-bd">
          <DataView rows={rows} columns={columns} height="auto" rowHeight={56} exportName={`board-${filters.cobDate || 'cob'}`}
            empty="No instances match this filter." onSelect={channel ? share : undefined}
            pivot={{ rowFields: ['region'], columnFields: ['status'], valueFields: ['amount'] }} chart={{ x: 'status', y: 'amount' }} />
        </div>
      </div>
    </>
  );
}
