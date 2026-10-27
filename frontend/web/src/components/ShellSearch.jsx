import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { searchAll } from '../api';
import { useApp } from '../store.jsx';

/** Header combobox: entitled instances, outcomes, and notifications via GET /api/search. */
export default function ShellSearch() {
  const { filters } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const dismissedRef = useRef(false);
  const rootRef = useRef(null);
  const trimmed = q.trim();
  const latestRef = useRef({ q: '', groupUnit: filters.groupUnit, cobDate: filters.cobDate });
  latestRef.current = { q: trimmed, groupUnit: filters.groupUnit, cobDate: filters.cobDate };

  // Drop the previous list in this render when the trimmed query or filters change,
  // so those hits are not clickable while the debounced request is still in flight.
  const scopeKey = `${trimmed}\u0000${filters.groupUnit}\u0000${filters.cobDate}`;
  const [seenScope, setSeenScope] = useState(scopeKey);
  if (seenScope !== scopeKey) {
    setSeenScope(scopeKey);
    setHits([]);
    setOpen(false);
  }

  useEffect(() => {
    dismissedRef.current = false;
  }, [q, filters.groupUnit, filters.cobDate]);

  useEffect(() => {
    const trimmedQ = q.trim();
    if (trimmedQ.length < 2) {
      setHits([]);
      setOpen(false);
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      const reqQ = trimmedQ;
      const reqGroupUnit = filters.groupUnit;
      const reqCobDate = filters.cobDate;
      searchAll({ q: reqQ, groupUnit: reqGroupUnit, cobDate: reqCobDate })
        .then((data) => {
          if (cancelled) return;
          const cur = latestRef.current;
          if (cur.q !== reqQ || cur.groupUnit !== reqGroupUnit || cur.cobDate !== reqCobDate || cur.q.length < 2) return;
          setHits(data.hits || []);
          if (!dismissedRef.current) setOpen(true);
        })
        .catch(() => {
          if (cancelled) return;
          const cur = latestRef.current;
          if (cur.q !== reqQ || cur.groupUnit !== reqGroupUnit || cur.cobDate !== reqCobDate || cur.q.length < 2) return;
          setHits([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, filters.groupUnit, filters.cobDate]);

  useEffect(() => {
    if (!open) return undefined;
    function dismiss() {
      dismissedRef.current = true;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') dismiss();
    }
    function onPointerDown(e) {
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      dismiss();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  function choose(hit) {
    setOpen(false);
    setQ('');
    setHits([]);
    navigate(hit.route);
  }

  return (
    <div ref={rootRef} className="shell-search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <label className="search-inp sm">
        <Icon name="search" size={14} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (hits.length) setOpen(true); }}
          placeholder="Search instances, outcomes, notifications"
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="shell-search-list"
        />
      </label>
      {open && hits.length > 0 && (
        <div id="shell-search-list" className="shell-search-menu" role="listbox">
          {hits.map((hit) => (
            <button key={`${hit.kind}-${hit.id}`} type="button" role="option" className="shell-search-hit"
              onClick={() => choose(hit)}>
              <span className="shell-search-kind">{hit.kind}</span>
              <span className="shell-search-title">{hit.title}</span>
              {hit.detail && <span className="shell-search-detail">{hit.detail}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
