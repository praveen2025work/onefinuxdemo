import { useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { StatusPill, Meter } from '../components/bits.jsx';

export default function Outcomes() {
  const { instances, filters } = useApp();
  const navigate = useNavigate();

  return (
    <>
      <div className="ph">
        <div>
          <div className="eyebrow">Outcome user · {filters.groupUnit}</div>
          <h1>My outcomes</h1>
          <p className="sub">Agents already ran against the stitched facts. Open a ready outcome to sign off or post; open a blocked one to see the named key.</p>
        </div>
      </div>

      <div className="grid g2">
        {instances.map((i) => (
          <div key={i.instanceId} className="oc" onClick={() => navigate('/instance/' + encodeURIComponent(i.instanceId))}>
            <div className="oc-hd">
              <StatusPill status={i.status} />
              <span className="chip" style={{ marginLeft: 'auto' }}>{i.region}</span>
            </div>
            <h3>{i.kitId} · {i.sliceKey}</h3>
            <p className="q">{i.question}</p>
            <div style={{ margin: '12px 0' }}><Meter completed={i.completedKeys} total={i.totalKeys} blocked={i.status === 'BLOCKED'} /></div>
            {i.namedBlocker
              ? <div className="banner fail"><div><b>Blocked</b><span className="mono-sm">{i.namedBlocker}</span></div></div>
              : <div className="row"><span className="muted">Run</span> <span className="mono">{i.runId || 'pending echo'}</span></div>}
          </div>
        ))}
        {instances.length === 0 && <div className="empty">No outcomes assigned for this COB / region.</div>}
      </div>
    </>
  );
}
