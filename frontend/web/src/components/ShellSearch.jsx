import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(() => {
      const reqQ = trimmed;
      searchAll({ q: reqQ, groupUnit: filters.groupUnit, cobDate: filters.cobDate })
        .then((data) => {
          if (q.trim() !== reqQ) return;
          setHits(data.hits || []);
          setOpen(true);
        })
        .catch(() => {
          if (q.trim() === reqQ) setHits([]);
        });
    }, 200);
    return () => clearTimeout(handle);
  }, [q, filters.groupUnit, filters.cobDate]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function choose(hit) {
    setOpen(false);
    setQ('');
    setHits([]);
    navigate(hit.route);
  }

  return (
    <div className="shell-search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <label className="search-inp sm">
        <Icon name="search" size={14} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length >= 2) setOpen(true); }}
          onFocus={() => { if (hits.length) setOpen(true); }}
          placeholder="Search instances, outcomes…"
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
