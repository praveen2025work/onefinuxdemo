import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { uxApi } from '../api.js';
import { NAV } from '../nav.js';
import { convert } from '../ux/experiments.js';
import { trackUse } from '../ux/track.js';

const SCREENS = Object.fromEntries(NAV.flatMap((s) => s.items).map((it) => [it.to, it]));

/** "Popular with your team": screens teammates in this group unit opened this month that you have not lately. */
export default function TeamPicks({ team, onPick, compact = false, experiment, label }) {
  const navigate = useNavigate();
  const [picks, setPicks] = useState([]);
  useEffect(() => {
    if (!team) { setPicks([]); return; }
    uxApi.recommendations(team).then(setPicks).catch(() => setPicks([]));
  }, [team]);
  if (!picks.length) return compact ? null : <div className="empty sm">Nothing new from your team this month.</div>;

  function open(p) {
    trackUse('recommendation.open', undefined, { app: p.app });
    if (experiment) convert(experiment);
    if (onPick) onPick(p);
    else if (String(p.app).startsWith('/') && !p.app.includes(':')) navigate(p.app);
  }

  return (
    <>
    {label}
    <div className="picks">
      {picks.map((p) => {
        const screen = SCREENS[p.app];
        return (
          <button key={p.app} type="button" className="pick" onClick={() => open(p)} title={p.why}>
            <span className="ph-ico"><Icon name={screen?.icon || 'window'} size={15} /></span>
            <span className="pick-txt"><b>{screen?.label || p.app}</b><span>{p.why}</span></span>
          </button>
        );
      })}
    </div>
    </>
  );
}
