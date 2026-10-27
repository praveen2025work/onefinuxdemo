import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { PageHeader, StatusPill } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import Select from '../components/Select.jsx';
import SpecGrid from '../grid/SpecGrid.jsx';
import { accessApi } from '../api.js';
import { loadState, WS_KEY } from '../workspace/layout.js';
import { canDo, itemsForDesk } from '../ux/access.js';

const USERS_SPEC = {
  id: 'access-users', title: 'Everyone the hub has seen', source: { endpoint: '/api/access/users' }, views: ['grid'],
  columns: [
    { key: 'subject', label: 'User', width: 160 },
    { key: 'lastSeen', label: 'Last seen', type: 'datetime', width: 170 },
    { key: 'suspended', label: 'Suspended', type: 'bool', width: 100 },
    { key: 'granted', label: 'Granted through requests' },
  ],
};

function readDesks() {
  try { return loadState(localStorage.getItem(WS_KEY)).workspaces; } catch { return []; }
}

/**
 * Access, in one place. What I have and why (token roles, granted extras, the verbs my roles allow); one request for
 * everything a desk needs; approvals by someone else; periodic review of every grant; the entitlement report; and
 * restoring someone suspended for inactivity. The hub enforces every rule shown here.
 */
export default function Access() {
  const { filters } = useApp();
  const [me, setMe] = useState(null);
  const [mine, setMine] = useState([]);
  const [queue, setQueue] = useState([]);
  const [review, setReview] = useState([]);
  const [suspended, setSuspended] = useState([]);
  const [msg, setMsg] = useState(null);
  const desks = useMemo(readDesks, []);
  const [deskId, setDeskId] = useState(() => desks[0]?.id || '');
  const [role, setRole] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const m = await accessApi.me().catch(() => null);
    setMe(m);
    accessApi.requests().then((rs) => {
      setMine(rs.filter((r) => r.subject === m?.subject));
      setQueue(canDo(m, 'ACCESS_APPROVE') ? rs.filter((r) => r.status === 'PENDING' && r.subject !== m?.subject) : []);
    }).catch(() => { setMine([]); setQueue([]); });
    if (canDo(m, 'ACCESS_REVIEW')) {
      accessApi.review().then(setReview).catch(() => setReview([]));
      accessApi.users().then((us) => setSuspended(us.filter((u) => u.suspended))).catch(() => setSuspended([]));
    } else { setReview([]); setSuspended([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (window.location.hash === '#request') document.getElementById('request')?.scrollIntoView(); }, []);

  const desk = desks.find((d) => d.id === deskId);
  const roles = Object.keys(me?.roleStructure || {});
  const items = itemsForDesk(desk, { groupUnit: filters.groupUnit, role, held: me || {} });

  async function act(fn, ok) {
    setMsg(null);
    try { await fn(); setMsg({ cls: 'ok', text: ok }); await load(); } catch (e) { setMsg({ cls: 'fail', text: e.message }); }
  }

  async function submit(e) {
    e.preventDefault();
    await act(() => accessApi.request({ target: desk ? `Desk: ${desk.name}` : 'Console access', items, reason }),
      'Request sent. An approver who is not you decides; you will have the access as soon as it is approved.');
    setReason('');
  }

  return (
    <>
      <PageHeader icon="shield" title="My access" context="Entitlements · requests · reviews"
        infoTitle="One place for access" infoWidth={380}
        info={<>Your <b>roles</b> and <b>group units</b> come from your sign-in token; approved requests add to them. The
          <b> role structure</b> decides which verbs each role allows (sign-off, post, write-back, approve…), so a role change
          changes what you can do on your next click. Access is suspended after {me?.inactivityDays ?? 90} days without a
          visit. Approvals and reviews are always by someone else.</>}
        summary={me ? `${me.subject} · ${(me.roles || []).join(', ') || 'no role'}${me.suspended ? ' · suspended' : ''}` : ''} />

      {msg && <div className={'banner ' + msg.cls} style={{ marginBottom: 8 }}><div>{msg.text}</div></div>}

      <div className="split">
        <div>
          <div className="panel">
            <div className="panel-hd"><h2>What I have</h2><span className="hint">token + approved requests</span></div>
            <div className="panel-bd stack">
              <div className="kv"><span className="k">Roles</span><span className="v">{(me?.roles || []).map((r) => <span key={r} className="chip">{r}</span>)}{!me?.roles?.length && '—'}</span></div>
              <div className="kv"><span className="k">Group units</span><span className="v">{(me?.groupUnits || []).map((g) => <span key={g} className="chip">{g === '*' ? 'all (superuser)' : g}</span>)}{!me?.groupUnits?.length && '—'}</span></div>
              <div className="kv"><span className="k">Products</span><span className="v">{(me?.ceesProducts || []).map((p) => <span key={p} className="chip">{p}</span>)}{!me?.ceesProducts?.length && '—'}</span></div>
              <div className="kv"><span className="k">I can</span><span className="v acc-verbs">{(me?.actions || []).map((a) => <span key={a} className="chip ok-chip">{a === '*' ? 'everything' : a}</span>)}</span></div>
              {(me?.granted?.roles?.length > 0 || me?.granted?.groupUnits?.length > 0 || me?.granted?.ceesProducts?.length > 0) && (
                <div className="kv"><span className="k">From requests</span><span className="v sec">
                  {[...(me.granted.roles || []), ...(me.granted.groupUnits || []), ...(me.granted.ceesProducts || [])].join(', ')}</span></div>
              )}
            </div>
          </div>

          <form className="panel accent" id="request" onSubmit={submit}>
            <div className="panel-hd"><h2>Request access</h2><span className="hint">everything a desk needs, in one request</span></div>
            <div className="panel-bd stack">
              <div className="ob-row2">
                <div className="field"><label>For</label>
                  <Select variant="block" value={deskId} onChange={setDeskId} minWidth={220}
                    options={[...desks.map((d) => ({ value: d.id, label: `Desk · ${d.name}` })), { value: '', label: 'The console in general' }]} />
                </div>
                <div className="field"><label>Role (optional)</label>
                  <Select variant="block" value={role} onChange={setRole} minWidth={160}
                    options={[{ value: '', label: 'Keep my roles' }, ...roles.map((r) => ({ value: r, label: r }))]} />
                </div>
              </div>
              <div className="field">
                <label>It asks for</label>
                <div className="acc-items">
                  {items.map((it) => <span key={it.kind + it.value} className="chip">{it.kind.replace('_', ' ').toLowerCase()}: {it.value}</span>)}
                  {items.length === 0 && <span className="sec">Nothing — you already hold what this desk needs in {filters.groupUnit}.</span>}
                </div>
              </div>
              <div className="field"><label>Why</label>
                <textarea className="inp" rows={2} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} required
                  placeholder="e.g. Covering Alice for month-end in REV-ACC" /></div>
              <div className="row"><button className="btn" type="submit" disabled={!items.length || !reason.trim()}><Icon name="send" size={14} /> Send request</button></div>
            </div>
          </form>

          {queue.length > 0 && (
            <div className="panel">
              <div className="panel-hd"><h2>Waiting for you</h2><span className="hint">{queue.length} request{queue.length === 1 ? '' : 's'}</span></div>
              <div className="panel-bd stack">
                {queue.map((r) => (
                  <div key={r.id} className="acc-req">
                    <div><b>{r.subject}</b> · {r.target} <span className="mono sec">{r.id}</span></div>
                    <div className="sec">{(JSON.parse(r.items || '[]')).map((i) => `${i.kind}:${i.value}`).join(', ')} — {r.reason}</div>
                    <div className="row">
                      <button type="button" className="btn sm" onClick={() => act(() => accessApi.decide(r.id, 'approve'), `${r.id} approved.`)}><Icon name="check" size={13} /> Approve</button>
                      <button type="button" className="btn ghost sm" onClick={() => act(() => accessApi.decide(r.id, 'reject'), `${r.id} rejected.`)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><h2>My requests</h2><span className="hint">{mine.length}</span></div>
            <div className="panel-bd stack">
              {mine.length === 0 && <div className="empty sm">None yet.</div>}
              {mine.map((r) => (
                <div key={r.id} className="acc-req">
                  <div className="row"><span className="mono">{r.id}</span><StatusPill status={r.status === 'APPROVED' ? 'READY' : r.status === 'REJECTED' ? 'BLOCKED' : 'WAITING'} /></div>
                  <div className="sec">{r.target}{r.decidedBy ? ` · by ${r.decidedBy}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {canDo(me, 'ACCESS_REVIEW') && (
        <>
          <div className="panel">
            <div className="panel-hd">
              <h2>Access review</h2><span className="hint">confirm or revoke each grant; you cannot review your own</span>
              {canDo(me, 'ACCESS_APPROVE') && (
                <button type="button" className="btn ghost sm" onClick={() => act(async () => { const r = await accessApi.sweep(); return r; }, 'Inactivity sweep done.')}>
                  <Icon name="clock" size={13} /> Run inactivity sweep
                </button>
              )}
            </div>
            <div className="panel-bd stack">
              {suspended.map((u) => (
                <div key={u.subject} className="acc-req warn">
                  <div><b>{u.subject}</b> <span className="pill fail">suspended for inactivity</span></div>
                  <div className="sec">last seen {String(u.lastSeen).slice(0, 16)}</div>
                  {canDo(me, 'ACCESS_APPROVE') && u.subject !== me?.subject && (
                    <div className="row"><button type="button" className="btn ghost sm" onClick={() => act(() => accessApi.restore(u.subject), `${u.subject} restored.`)}>Restore</button></div>
                  )}
                </div>
              ))}
              {review.length === 0 && <div className="empty sm">No grants to review.</div>}
              {review.map((g) => (
                <div key={g.id} className={'acc-req' + (g.inStructure ? '' : ' warn')}>
                  <div><b>{g.subject}</b> · <span className="mono">{g.grant}</span>
                    {!g.inStructure && <span className="pill warn">outside the role structure</span>}
                    {g.suspended && <span className="pill fail">suspended</span>}</div>
                  <div className="sec">granted by {g.grantedBy} · last seen {g.lastSeen ? String(g.lastSeen).slice(0, 16) : 'never'}{g.reviewedBy ? ` · last reviewed by ${g.reviewedBy}` : ''}</div>
                  <div className="row">
                    <button type="button" className="btn ghost sm" onClick={() => act(() => accessApi.reviewOne(g.id, true), 'Kept.')}>Keep</button>
                    <button type="button" className="btn ghost sm" onClick={() => act(() => accessApi.reviewOne(g.id, false), 'Revoked.')}>Revoke</button>
                    {g.suspended && canDo(me, 'ACCESS_APPROVE') && (
                      <button type="button" className="btn ghost sm" onClick={() => act(() => accessApi.restore(g.subject), `${g.subject} restored.`)}>Restore</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel"><div className="panel-bd"><SpecGrid spec={USERS_SPEC} context={{}} height={280} /></div></div>
        </>
      )}
    </>
  );
}
