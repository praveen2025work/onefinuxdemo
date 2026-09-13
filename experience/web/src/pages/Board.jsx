import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { StatusPill, Meter } from '../components/bits.jsx';

const STATUSES = ['', 'READY', 'BLOCKED', 'NOT_YET', 'CLEARED'];

export default function Board() {
  const { instances, filters, setFilters } = useApp();
  const navigate = useNavigate();

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Business-unit head · read only</div>
          <h1>Outcome board</h1>
          <p className="sub">Traffic lights for the whole unit. A head sees Ready / Blocked / escalations — no book grid, no engine internals.</p>
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
            <table className="tbl">
              <thead><tr><th>Kit / question</th><th>Instance</th><th>Region</th><th>Readiness</th><th>Status</th><th>Blocker</th><th className="num">Esc.</th><th /></tr></thead>
              <tbody>
                {instances.map((i) => (
                  <tr key={i.instanceId}>
                    <td><span className="lead">{i.kitId}</span><div className="sec">{i.question}</div></td>
                    <td className="mono" style={{ fontSize: 12 }}>{i.sliceKey}</td>
                    <td><span className="chip">{i.region}</span></td>
                    <td><Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} /></td>
                    <td><StatusPill status={i.status} /></td>
                    <td className="sec">{i.namedBlocker || '—'}</td>
                    <td className="num">{i.openEscalations}</td>
                    <td><button className="btn ghost sm" onClick={() => navigate('/instance/' + encodeURIComponent(i.instanceId))}>Open</button></td>
                  </tr>
                ))}
                {instances.length === 0 && <tr><td colSpan={8} className="empty">No instances match this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
