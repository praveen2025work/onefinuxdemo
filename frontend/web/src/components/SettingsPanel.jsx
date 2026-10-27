import { useEffect } from 'react';
import Icon from './Icon.jsx';
import { useApp } from '../store.jsx';
import { VIEWS } from '../views.js';

/**
 * Group unit, region and view in one panel. Picking a value applies it immediately
 * so the page behind updates while the other two stay visible.
 */
export default function SettingsPanel({ open, onClose }) {
  const { context, filters, setFilters, view, setView } = useApp();
  const units = context?.groupUnits?.length
    ? context.groupUnits
    : (filters.groupUnit ? [{ groupUnitId: filters.groupUnit, name: filters.groupUnit }] : []);
  const regions = context?.regions || [];

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside className={'npanel' + (open ? ' open' : '')} aria-label="Settings" aria-hidden={!open}>
      <div className="np-inner">
        <div className="np-hd">
          <div className="np-ttl"><h3>Settings</h3></div>
          <div className="np-tools">
            <button type="button" className="np-ic" onClick={onClose} title="Close" aria-label="Close settings">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        <div className="np-list">
          <section className="set-sec">
            <div className="menu-lbl">Group unit</div>
            {units.map((g) => (
              <button key={g.groupUnitId} type="button" role="menuitemradio"
                aria-checked={g.groupUnitId === filters.groupUnit}
                className={'menu-item' + (g.groupUnitId === filters.groupUnit ? ' on' : '')}
                onClick={() => setFilters({ groupUnit: g.groupUnitId })}>
                <Icon name="tower" size={14} />
                <span className="menu-txt">{g.name || g.groupUnitId}</span>
                {g.groupUnitId === filters.groupUnit && <Icon name="check" size={14} />}
              </button>
            ))}
          </section>
          <section className="set-sec">
            <div className="menu-lbl">Region</div>
            {[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))].map((r) => (
              <button key={r.value || 'all'} type="button" role="menuitemradio"
                aria-checked={(filters.region || '') === r.value}
                className={'menu-item' + ((filters.region || '') === r.value ? ' on' : '')}
                onClick={() => setFilters({ region: r.value })}>
                <Icon name="globe" size={14} />
                <span className="menu-txt">{r.label}</span>
                {(filters.region || '') === r.value && <Icon name="check" size={14} />}
              </button>
            ))}
          </section>
          <section className="set-sec">
            <div className="menu-lbl">View <span className="muted">· filters the menu, not access</span></div>
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="menuitemradio" aria-checked={v.id === view.id}
                className={'menu-item' + (v.id === view.id ? ' on' : '')}
                onClick={() => setView(v.id)}>
                <Icon name={v.icon} size={14} />
                <span className="menu-txt">{v.label}</span>
                {v.id === view.id && <Icon name="check" size={14} />}
              </button>
            ))}
          </section>
        </div>
      </div>
    </aside>
  );
}
