import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { BrandMark } from '../components/Icon.jsx';
import { accessApi, currentActor, setSessionToken } from '../api.js';
import { completeLogin, startLogin } from './oidc.js';
import { ACTIVITY_EVENTS, isIdle } from './idle.js';
import { EMBED } from '../embed.js';

/**
 * Who is using the console, before anything else renders:
 *  - with SSO configured and anonymous access off, an unsigned user gets the sign-in page (OIDC + PKCE);
 *  - a user whose access was suspended for inactivity gets a page to ask for it back, and nothing else;
 *  - after `idleLockMinutes` without input the screen locks; with SSO, unlocking signs in again.
 * If the hub cannot be reached the console renders as before and its screens show their own errors.
 */
export default function SessionGate({ children }) {
  const [session, setSession] = useState(null);
  const [locked, setLocked] = useState(false);
  const lastActive = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    const load = () => accessApi.session().then((s) => { if (alive) setSession(s); }).catch(() => { if (alive) setSession({ unreachable: true }); });
    load();
    const t = setInterval(load, 5 * 60_000);
    window.addEventListener('ofx-session', load);
    return () => { alive = false; clearInterval(t); window.removeEventListener('ofx-session', load); };
  }, []);

  // A framed view (desk, embed) leaves locking to the window that hosts it.
  const minutes = EMBED ? null : session?.idleLockMinutes;
  useEffect(() => {
    if (!minutes) return undefined;
    const mark = () => { if (!locked) lastActive.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    const t = setInterval(() => { if (isIdle(lastActive.current, Date.now(), minutes)) setLocked(true); }, 15_000);
    return () => { ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, mark)); clearInterval(t); };
  }, [minutes, locked]);

  if (!session) return null;
  const signedIn = Boolean(sessionStorage.getItem('ofx-token'));
  if (session.mode === 'oidc' && !session.anonymousAllowed && !signedIn) return <SignIn oidc={session.oidc} />;
  if (session.suspended) return <Suspended session={session} />;

  return (
    <>
      {children}
      {locked && <IdleLock session={session} onUnlock={() => { lastActive.current = Date.now(); setLocked(false); }} />}
    </>
  );
}

function Gate({ title, children }) {
  return (
    <div className="gate">
      <div className="gate-card panel">
        <div className="gate-hd"><BrandMark size={34} /><div><b>One Finance</b><div className="sec">{title}</div></div></div>
        <div className="panel-bd stack">{children}</div>
      </div>
    </div>
  );
}

function SignIn({ oidc }) {
  const [err, setErr] = useState(null);
  return (
    <Gate title="Sign in">
      <p className="muted" style={{ margin: 0 }}>Sign in with your bank account. Your roles and group units come from the identity provider.</p>
      {err && <div className="banner fail"><div>{err}</div></div>}
      <button type="button" className="btn" onClick={() => startLogin(oidc).catch((e) => setErr(e.message))}>
        <Icon name="shield" size={14} /> Sign in with SSO
      </button>
      <p className="sec" style={{ margin: 0 }}>Identity provider: <span className="mono">{oidc?.issuer}</span></p>
    </Gate>
  );
}

/** /auth/callback: finish the PKCE exchange, keep the token for this tab, return to where the user was. */
export function AuthCallback() {
  const navigate = useNavigate();
  const [err, setErr] = useState(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    completeLogin()
      .then(({ token, subject, returnTo }) => { setSessionToken(token, subject); navigate(returnTo, { replace: true }); window.dispatchEvent(new Event('ofx-session')); })
      .catch((e) => setErr(e.message));
  }, [navigate]);
  return (
    <Gate title={err ? 'Sign-in did not finish' : 'Signing you in…'}>
      {err ? <><div className="banner fail"><div>{err}</div></div><a className="btn" href="/">Try again</a></> : <p className="muted">One moment.</p>}
    </Gate>
  );
}

function Suspended({ session }) {
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(null);
  const [err, setErr] = useState(null);
  async function ask(e) {
    e.preventDefault();
    setErr(null);
    try {
      const items = [
        ...(session.groupUnits?.length ? session.groupUnits.map((g) => ({ kind: 'GROUP_UNIT', value: g })) : []),
        ...(session.roles?.length ? session.roles.map((r) => ({ kind: 'ROLE', value: r })) : []),
      ];
      const r = await accessApi.request({ target: 'Restore access after inactivity', items: items.length ? items : [{ kind: 'ROLE', value: 'AUDIT' }], reason });
      setSent(r.id);
    } catch (e2) {
      setErr(e2.message);
    }
  }
  return (
    <Gate title="Access suspended">
      <p className="muted" style={{ margin: 0 }}>
        <b>{session.subject}</b>, your access was suspended because you had not used One Finance for more than {session.inactivityDays} days.
        Ask for it back; an approver who is not you restores it.
      </p>
      {sent ? (
        <div className="banner ok"><div><b>Request {sent} sent.</b> You can use the console again as soon as it is approved.</div></div>
      ) : (
        <form className="stack" onSubmit={ask}>
          <textarea className="inp" rows={3} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Why you need access again (e.g. back from leave, covering month-end)" required />
          {err && <div className="banner fail"><div>{err}</div></div>}
          <button type="submit" className="btn" disabled={!reason.trim()}><Icon name="send" size={14} /> Request access</button>
        </form>
      )}
    </Gate>
  );
}

function IdleLock({ session, onUnlock }) {
  const sso = session.mode === 'oidc';
  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label="Screen locked">
      <div className="gate-card panel">
        <div className="gate-hd"><BrandMark size={34} /><div><b>Locked</b><div className="sec">No input for {session.idleLockMinutes} minutes</div></div></div>
        <div className="panel-bd stack">
          <p className="muted" style={{ margin: 0 }}>The screen locked so figures are not left open on an unattended desk.</p>
          {sso ? (
            <button type="button" className="btn" onClick={() => { setSessionToken(null, null); startLogin(session.oidc); }}>
              <Icon name="shield" size={14} /> Sign in again
            </button>
          ) : (
            <button type="button" className="btn" onClick={onUnlock} autoFocus>
              <Icon name="user" size={14} /> Continue as {currentActor()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
