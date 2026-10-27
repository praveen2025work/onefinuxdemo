import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from './Menu.jsx';
import Icon from './Icon.jsx';
import { useApp } from '../store.jsx';
import { actorLabel, currentActor, listActors, setActor } from '../api';
import { useInstallPrompt } from '../pwa.js';

function initials(label) {
  const parts = String(label || '').replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'P') + (parts[1]?.[0] || parts[0]?.[1] || 'K')).toUpperCase();
}

/**
 * STEPS profile menu: the avatar in the header; name, "Last updated", live link and identity in the dropdown.
 * "Act as" (demo identity for dual sign-off) lives here so the header stays one clean row.
 */
export default function ProfileMenu({ onOpenSettings }) {
  const { filters, lastUpdated, refreshInstances, liveStatus } = useApp();
  const [actor, setActorState] = useState(() => currentActor());
  const [actors, setActors] = useState([]);
  const navigate = useNavigate();
  const { canInstall, standalone, install } = useInstallPrompt();

  useEffect(() => { listActors().then(setActors).catch(() => setActors([])); }, []);

  async function onActor(user) {
    await setActor(user);
    setActorState(user);
    refreshInstances().catch(() => {});
  }

  const label = actorLabel(actor);
  const users = actors.length ? actors.map((u) => u.user || u) : [actor];

  return (
    <Menu width={300} trigger={(open, toggle) => (
      <button type="button" className={'profile-trig' + (open ? ' on' : '')} onClick={toggle} aria-label={`Profile: ${label}`}
        aria-expanded={open} title={`${label} · last updated ${lastUpdated.toLocaleTimeString()}`}>
        <span className="avatar">{initials(label)}</span>
      </button>
    )}>
      {(close) => (
        <>
          <div className="menu-head">
            <span className="avatar lg">{initials(label)}</span>
            <div>
              <b>{label}</b>
              <div className="mono muted">{actor}</div>
            </div>
          </div>
          <div className="menu-kv">
            <div><span>Group unit</span><b className="mono">{filters.groupUnit || '—'}</b></div>
            <div><span>Region</span><b className="mono">{filters.region || 'ALL'}</b></div>
            <div><span>Live link</span><b className="mono">{liveStatus.live ? `${liveStatus.transport} · ${liveStatus.role}` : 'offline'}</b></div>
            <div><span>Last updated</span><b className="mono">{lastUpdated.toLocaleString('en-GB')}</b></div>
          </div>
          <div className="menu-sec">
            <div className="menu-lbl">Act as <span className="muted">· demo identity for dual sign-off</span></div>
            {users.map((u) => (
              <button key={u} type="button" role="menuitemradio" aria-checked={u === actor}
                className={'menu-item' + (u === actor ? ' on' : '')}
                onClick={() => { onActor(u); close(); }}>
                <Icon name="user" size={14} />
                <span className="menu-txt">{actorLabel(u)}</span>
                {u === actor && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
          <div className="menu-sec">
            <button type="button" className="menu-item" onClick={() => { onOpenSettings?.(); close(); }}>
              <Icon name="config" size={14} /><span className="menu-txt">Settings</span>
            </button>
            <button type="button" className="menu-item" onClick={() => { navigate('/notifications'); close(); }}>
              <Icon name="bell" size={14} /><span className="menu-txt">Notifications</span>
            </button>
            <button type="button" className="menu-item" onClick={() => { navigate('/desks'); close(); }}>
              <Icon name="window" size={14} /><span className="menu-txt">Desks</span>
            </button>
            <button type="button" className="menu-item" onClick={() => { navigate('/guide'); close(); }}>
              <Icon name="code" size={14} /><span className="menu-txt">Help · developer guide</span>
            </button>
            {canInstall && !standalone && (
              <button type="button" className="menu-item" onClick={() => { install(); close(); }}>
                <Icon name="install" size={14} /><span className="menu-txt">Install One Finance app</span>
              </button>
            )}
          </div>
          <p className="menu-foot">Identity is a demo token. CEES still fail-closes unentitled instances.</p>
        </>
      )}
    </Menu>
  );
}
