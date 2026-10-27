import { useEffect } from 'react';
import Icon from './Icon.jsx';
import Select from './Select.jsx';
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
    <aside className={'npanel' + (open ? ' open' : '')} aria-label="Settings" aria-hidden={!open} inert={open ? undefined : ''}>
      <div className="np-inner">
        <div className="np-hd">
          <div className="np-ttl"><h3>Settings</h3></div>
          <div className="np-tools">
            <button type="button" className="np-ic" onClick={onClose} title="Close" aria-label="Close settings">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        <div className="np-list set-form">
          <div className="field">
            <label id="set-unit-lbl">Group unit</label>
            <Select labelledBy="set-unit-lbl" variant="block" icon="tower" value={filters.groupUnit || ''}
              placeholder="Group unit"
              onChange={(id) => setFilters({ groupUnit: id })}
              options={units.map((g) => ({ value: g.groupUnitId, label: g.name || g.groupUnitId }))} />
          </div>
          <div className="field">
            <label id="set-region-lbl">Region</label>
            <Select labelledBy="set-region-lbl" variant="block" icon="globe" value={filters.region || ''}
              placeholder="Region"
              onChange={(region) => setFilters({ region })}
              options={[{ value: '', label: 'All regions' }, ...regions.map((r) => ({ value: r, label: r }))]} />
          </div>
          <div className="field">
            <label id="set-view-lbl">View <span className="muted">· filters the menu, not access</span></label>
            <Select labelledBy="set-view-lbl" variant="block" value={view.id}
              onChange={setView}
              options={VIEWS.map((v) => ({ value: v.id, label: v.label }))} />
          </div>
        </div>
      </div>
    </aside>
  );
}
