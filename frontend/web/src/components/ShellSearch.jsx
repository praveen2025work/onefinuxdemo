import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { searchAll } from '../api';
import { useApp } from '../store.jsx';
import { NAV } from '../nav.js';
import { BUILTIN_SPECS } from '../grid/specs.js';
import { loadMySpecs } from '../grid/useGridSpec.js';
import { localHits, mergeGroups, safeRoute, searchProvider } from '../search/providers.js';
import { uxConfig } from '../ux/experiments.js';
import { openAssistant, openFeedback } from '../ux/bus.js';
import { track } from '../ux/track.js';
import { routeKey } from '../ux/telemetry.js';

const KIND_ICON = { instance: 'cards', outcome: 'report', notification: 'bell', screen: 'window', grid: 'grid', task: 'bolt', break: 'link' };

/**
 * Header search across applications: instances, outcomes and alerts from the hub (entitled only), each registered
 * partner application's own search, and the console's screens, grids and tasks. The last line always offers to ask
 * the assistant, so a question typed here gets an answer too. Arrow keys move, Enter opens.
 */
export default function ShellSearch() {
  const { filters } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hub, setHub] = useState([]);
  const [partners, setPartners] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const dismissedRef = useRef(false);
  const rootRef = useRef(null);
  const trimmed = q.trim();
  const latestRef = useRef('');
  latestRef.current = `${trimmed}\u0000${filters.groupUnit}\u0000${filters.cobDate}`;

  // Drop the previous results in this render when the query or scope changes, so stale hits are never clickable.
  const scopeKey = latestRef.current;
  const [seenScope, setSeenScope] = useState(scopeKey);
  if (seenScope !== scopeKey) {
    setSeenScope(scopeKey);
    setHub([]);
    setPartners([]);
    setActive(0);
  }

  useEffect(() => { dismissedRef.current = false; }, [q, filters.groupUnit, filters.cobDate]);

  useEffect(() => {
    if (trimmed.length < 2) { setOpen(false); return undefined; }
    let cancelled = false;
    const key = latestRef.current;
    const handle = setTimeout(() => {
      const stillCurrent = () => !cancelled && latestRef.current === key;
      searchAll({ q: trimmed, groupUnit: filters.groupUnit, cobDate: filters.cobDate })
        .then((data) => { if (stillCurrent()) setHub(data.hits || []); })
        .catch(() => { if (stillCurrent()) setHub([]); });
      uxConfig().then((cfg) => Promise.all((cfg.searchProviders || []).map((p) => searchProvider(p, trimmed).then((hits) => ({ ...p, hits })))))
        .then((res) => { if (stillCurrent()) setPartners(res); });
      if (!dismissedRef.current) setOpen(true);
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [trimmed, filters.groupUnit, filters.cobDate]);

  useEffect(() => {
    if (!open) return undefined;
    function dismiss() { dismissedRef.current = true; setOpen(false); }
    function onPointerDown(e) { if (!rootRef.current?.contains(e.target)) dismiss(); }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const groups = useMemo(() => {
    if (trimmed.length < 2) return [];
    const local = localHits(trimmed, { nav: NAV, specs: [...BUILTIN_SPECS, ...loadMySpecs()] });
    return mergeGroups(hub, partners, local);
  }, [trimmed, hub, partners]);
  const flat = [...groups.flatMap((g) => g.hits.map((h) => ({ ...h, group: g.group }))), { kind: 'ask', id: 'ask', title: `Ask the assistant: “${trimmed}”`, action: 'assist' }];

  function reset() {
    setOpen(false);
    setQ('');
    setHub([]);
    setPartners([]);
  }

  function choose(hit) {
    track('SEARCH', { app: routeKey(window.location.pathname), component: `search.${hit.kind}`, detail: { group: hit.group || hit.kind } });
    const question = trimmed;
    reset();
    if (hit.action === 'assist') { openAssistant(hit.kind === 'ask' ? question : undefined); return; }
    if (hit.action === 'feedback') { openFeedback(); return; }
    const route = safeRoute(hit.route);
    if (route) navigate(route);
  }

  function onKey(e) {
    if (e.key === 'Escape') { dismissedRef.current = true; setOpen(false); return; }
    if (!open || trimmed.length < 2) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(flat[Math.min(active, flat.length - 1)]); }
  }

  let index = -1;
  const row = (hit) => {
    index += 1;
    const i = index;
    return (
      <button key={`${hit.group}-${hit.kind}-${hit.id}`} id={`shell-hit-${i}`} type="button" role="option" aria-selected={i === active}
        className={'shell-search-hit' + (i === active ? ' on' : '')} onMouseEnter={() => setActive(i)} onClick={() => choose(hit)}>
        <span className="shell-search-kind"><Icon name={KIND_ICON[hit.kind] || 'search'} size={12} /> {hit.kind}</span>
        <span className="shell-search-title">{hit.title}</span>
        {hit.detail && <span className="shell-search-detail">{hit.detail}</span>}
      </button>
    );
  };

  return (
    <div ref={rootRef} className="shell-search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <label className="search-inp sm">
        <Icon name="search" size={14} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (trimmed.length >= 2) setOpen(true); }}
          onKeyDown={onKey}
          placeholder="Search or ask: instances, apps, grids, breaks…"
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls={open && trimmed.length >= 2 ? 'shell-search-list' : undefined}
          aria-activedescendant={open ? `shell-hit-${active}` : undefined}
        />
      </label>
      {open && trimmed.length >= 2 && (
        <div id="shell-search-list" className="shell-search-menu" role="listbox">
          {groups.map((g) => (
            <div key={g.group} className="shell-search-grp" role="group" aria-label={g.label}>
              <div className="shell-search-lbl">{g.label}</div>
              {g.hits.map((h) => row({ ...h, group: g.group }))}
            </div>
          ))}
          {groups.length === 0 && <div className="shell-search-none">No matches in One Finance or connected apps.</div>}
          <div className="shell-search-grp ask">{row(flat[flat.length - 1])}</div>
        </div>
      )}
    </div>
  );
}
