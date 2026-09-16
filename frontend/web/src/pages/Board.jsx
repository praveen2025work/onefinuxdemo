import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { StatusPill, Meter, PageTitle, formatAmount } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import InfoHint from '../components/InfoHint.jsx';

const STATUSES = ['', 'READY', 'BLOCKED', 'NOT_YET', 'SIGNED', 'CLEARED'];

export default function Board() {
  const { instances, filters, setFilters } = useApp();
  const navigate = useNavigate();
  const ready = instances.filter((i) => i.status === 'READY').length;
  const blocked = instances.filter((i) => i.status === 'BLOCKED').length;
  const named = instances.find((i) => i.status === 'BLOCKED');

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
        <div className="panel-hd"><h2>{filters.groupUnit} · COB {filters.cobDate} · {filters.region || 'all regions'}</h2><span className="hint">v_head_board</span></div>
        <div className="panel-bd tight">
          <div className="tbl-wrap">
            <p className="swipe-hint muted">On a phone, swipe the table sideways to reach status, blocker, and Open.</p>
            <table className="tbl cards-sm">
                <thead><tr><th>Kit / question</th><th>Instance</th><th>Region</th><th>Amount</th><th>Readiness</th><th>Status</th><th>Blocker</th><th className="num">Esc.</th><th /></tr></thead>
                <tbody>
                {instances.map((i) => (
                  <tr key={i.instanceId}>
                    <td className="cell-lead"><span className="lead">{i.kitId}</span><div className="sec">{i.question}</div></td>
                    <td className="mono" data-label="Instance">{i.sliceKey}</td>
                    <td data-label="Region"><span className="chip">{i.region}</span></td>
                    <td className="mono num" data-label="Amount">{formatAmount(i.amount) || '—'}</td>
                    <td className="cell-wide" data-label="Readiness"><Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} /></td>
                    <td data-label="Status"><StatusPill status={i.status} /></td>
                    <td className="sec cell-wide" data-label="Blocker">{i.namedBlocker || '—'}</td>
                    <td className="num" data-label="Escalations">{i.openEscalations}</td>
                    <td className="cell-act"><button className="btn ghost sm" onClick={() => navigate('/instance/' + encodeURIComponent(i.instanceId))}><Icon name="open" size={13} /> Open</button></td>
                  </tr>
                ))}
                {instances.length === 0 && <tr><td colSpan={9} className="empty">No instances match this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
