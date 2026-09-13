export function StatusPill({ status }) {
  const map = {
    READY: 'ok', CLEARED: 'ok', BLOCKED: 'fail', DELAYED: 'warn', NOT_YET: 'plain',
    COMPLETED: 'ok', FAILED: 'fail', WAITING: 'plain', REVOKED: 'warn', OPEN: 'fail',
  };
  return <span className={'pill ' + (map[status] || 'plain')}><span className="dot" />{status}</span>;
}

export function Meter({ completed, total, blocked }) {
  const t = Math.max(total, 1);
  const okPct = Math.round((completed / t) * 100);
  const failPct = blocked ? Math.round((1 / t) * 100) : 0;
  const waitPct = Math.max(0, 100 - okPct - failPct);
  return (
    <div className="meter">
      <span className="meter-t">
        <i className="ok" style={{ width: okPct + '%' }} />
        {blocked ? <i className="fail" style={{ width: failPct + '%' }} /> : null}
        <i className="wait" style={{ width: waitPct + '%' }} />
      </span>
      <span className="val">{completed}/{total}</span>
    </div>
  );
}

export function Loading({ what = 'Loading…' }) {
  return <div className="spin">{what}</div>;
}

export function Empty({ what = 'Nothing here yet.' }) {
  return <div className="empty">{what}</div>;
}
