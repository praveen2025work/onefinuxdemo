import { formatClock, etaCaption, hasPrediction } from '../eta.js';
import Icon from './Icon.jsx';
import InfoHint from './InfoHint.jsx';

const PILL = {
  READY: 'ok', CLEARED: 'ok', BLOCKED: 'fail', DELAYED: 'warn', NOT_YET: 'plain',
  COMPLETED: 'ok', FAILED: 'fail', WAITING: 'plain', REVOKED: 'warn', OPEN: 'fail',
};
const PILL_ICON = {
  READY: 'check', CLEARED: 'check', COMPLETED: 'check',
  BLOCKED: 'shield', FAILED: 'alert', OPEN: 'alert',
  DELAYED: 'clock', WAITING: 'clock', REVOKED: 'history',
  NOT_YET: 'inbox',
};

export function StatusPill({ status }) {
  return (
    <span className={'pill ' + (PILL[status] || 'plain')}>
      <Icon name={PILL_ICON[status] || 'info'} size={11} />
      {status}
    </span>
  );
}

export function PageTitle({ icon, children }) {
  return (
    <h1 className="ph-title">
      {icon && <span className="ph-ico" aria-hidden><Icon name={icon} size={18} /></span>}
      <span className="ph-label">{children}</span>
    </h1>
  );
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

/** Advisory prediction from arrived facts / prior COBs. Never used as readiness. */
export function Prediction({ outcome }) {
  if (!hasPrediction(outcome) && !outcome?.deadline && !outcome?.atRisk) return null;
  const eta = formatClock(outcome.eta);
  const sla = formatClock(outcome.deadline);
  const hist = formatClock(outcome.historicP50);
  const late = outcome.atRisk || outcome.breached;
  return (
    <div className={'pred' + (late ? ' late' : '')}>
      <div className="pred-main">
        <div>
          <div className="pred-k"><Icon name="clock" size={12} /> Predicted ready
            <InfoHint title="Advisory only" width={280}>
              Projected from events that already arrived this COB, blended with the median (P50) ready time of prior COBs for the same outcome and region. This is <b>not</b> on the readiness fold and is not an LLM.
            </InfoHint>
          </div>
          <div className="pred-v">{eta || '—'}</div>
        </div>
        <div>
          <div className="pred-k"><Icon name="sla" size={12} /> SLA deadline</div>
          <div className="pred-v sla">{sla || '—'}</div>
        </div>
        {late && <span className="chip warn-chip"><Icon name="alert" size={11} /> {outcome.breached ? 'breached' : 'at risk'}</span>}
      </div>
      <div className="pred-f">{etaCaption(outcome)}{hist ? ` · historic P50 ${hist}` : ''}</div>
    </div>
  );
}
