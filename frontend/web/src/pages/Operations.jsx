import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { StatusPill, Loading, PageHeader } from '../components/bits.jsx';
import DataGrid from '../components/DataGrid.jsx';

export default function Operations() {
  const [rtb, setRtb] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => setRtb(await api.rtb()), []);
  useEffect(() => { load(); }, [load]);

  async function replay(id) {
    setBusy(id);
    try { await api.replay(id); await load(); } finally { setBusy(null); }
  }

  if (!rtb) return <Loading what="Loading operations…" />;

  // The standard grid for every RTB list; Replay stays a dual-control action cell.
  const escalationColumns = [
    { binding: 'escalationId', header: 'Escalation', minWidth: 140, mono: true },
    { binding: 'sliceKey', header: 'Instance', width: 120, mono: true },
    { binding: 'region', header: 'Region', width: 90, chip: true },
    { binding: 'kind', header: 'Kind', minWidth: 130, chip: true },
    { binding: 'openedAt', header: 'Opened', width: 170, template: (e) => <span className="mono sec">{(e.openedAt || '').slice(0, 19)}</span> },
    { binding: 'status', header: 'Status', width: 120, template: (e) => <StatusPill status={e.status} /> },
  ];
  const deadLetterColumns = [
    { binding: 'deadLetterId', header: 'Id', minWidth: 120, mono: true },
    { binding: 'sourceId', header: 'Source', width: 120, chip: true },
    { binding: 'ingestOffset', header: 'Offset', width: 110, mono: true },
    { binding: 'reason', header: 'Reason', minWidth: 180, wrap: true },
    { binding: 'status', header: 'Status', width: 110, template: (d) => <StatusPill status={d.status} /> },
    { binding: null, header: '', width: 92, sortable: false, template: (d) => (d.status === 'HOLD'
      ? <button className="btn ghost sm" disabled={busy === d.deadLetterId} onClick={() => replay(d.deadLetterId)}>Replay</button>
      : null) },
  ];
  const watermarkColumns = [
    { binding: 'sourceId', header: 'Source', minWidth: 110, mono: true },
    { binding: 'partitionId', header: 'Partition', width: 100, mono: true },
    { binding: 'lastOffset', header: 'Offset', minWidth: 110, mono: true },
    { binding: 'lagSeconds', header: 'Lag (s)', width: 90, align: 'right' },
  ];

  return (
    <>
      <PageHeader icon="ops" title="Operations console" context="Run-the-bank support"
        info="Escalations, feed watermarks and dead letters. Replay is dual-control. RTB never signs off a break or publishes a kit." />

      <div className="panel">
        <div className="panel-hd"><h2>Escalations</h2><span className="hint">escalation</span></div>
        <div className="panel-bd">
          <DataGrid rows={rtb.escalations} columns={escalationColumns} height="auto" maxHeight={360} exportName="escalations" empty="No escalations." />
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-hd"><h2>Dead letters</h2><span className="hint">dead_letter</span></div>
          <div className="panel-bd">
            <DataGrid rows={rtb.deadLetters} columns={deadLetterColumns} height="auto" maxHeight={360} exportName="dead-letters" empty="No dead letters." />
          </div>
        </div>

        <div className="panel">
          <div className="panel-hd"><h2>Feed watermarks</h2><span className="hint">feed_watermark</span></div>
          <div className="panel-bd">
            <DataGrid rows={rtb.watermarks} columns={watermarkColumns} height="auto" maxHeight={360} exportName="watermarks" empty="No watermarks." />
          </div>
        </div>
      </div>
    </>
  );
}
