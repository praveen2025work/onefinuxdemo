import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { creatableOption, filterOptions, isChosen, selectionText, selectionTitle, toggleValue } from '../lib/selectModel.js';

/**
 * The one dropdown. Single value by default; `multiple` keeps the menu open and toggles each row.
 * The menu has a search box (except the icon-only header variant). `creatable` adds a typed value
 * that is not already in the list. The menu is portaled so a panel with overflow hidden cannot clip it.
 */
export default function Select({ value, onChange, options = [], placeholder = 'Select…', caption, icon,
  variant = 'default', minWidth, title, multiple = false, searchable = true, creatable = false, id, labelledBy, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const trigRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const showSearch = searchable && variant !== 'icon';
  const text = selectionText(options, value, { multiple, placeholder });
  const full = selectionTitle(options, value, multiple);

  const rows = useMemo(() => {
    const found = filterOptions(options, showSearch ? query : '');
    const extra = creatable ? creatableOption(options, query) : null;
    return extra ? [extra, ...found] : found;
  }, [options, query, showSearch, creatable]);

  const place = useCallback(() => {
    if (trigRef.current) setRect(trigRef.current.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const focusSearch = () => { if (showSearch) searchRef.current?.focus(); };
    const t = setTimeout(focusSearch, 0);
    function onDoc(e) {
      if (trigRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter' && active >= 0 && rows[active]) { e.preventDefault(); choose(rows[active]); }
    }
    function onScroll(e) {
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('blur', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('blur', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, active, rows, onChange, multiple, showSearch, value]);

  function choose(opt) {
    if (multiple) {
      onChange(toggleValue(value, opt.value));
      setQuery('');
      return;
    }
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  function openMenu() {
    setQuery('');
    const current = options.findIndex((o) => isChosen(value, o.value, multiple));
    setActive(current >= 0 ? current : 0);
    setOpen((o) => !o);
  }

  return (
    <div className={'sel2 ' + variant + (open ? ' open' : '') + (multiple ? ' multi' : '')} style={minWidth ? { minWidth } : undefined} title={title || full || undefined}>
      <button ref={trigRef} id={id} type="button" className="sel2-trig"
        aria-haspopup="listbox" aria-expanded={open} aria-labelledby={labelledBy}
        title={title || full || undefined} aria-label={ariaLabel || (variant === 'icon' ? (title || text) : undefined)}
        onClick={openMenu}>
        {icon && <Icon name={icon} size={16} className="sel2-ic" />}
        <span className="sel2-txt">
          {caption && <span className="sel2-cap">{caption}</span>}
          <span className={'sel2-val' + (text === placeholder ? ' ph' : '')}>{text}</span>
        </span>
        <Icon name="down" size={14} className={'sel2-chev' + (open ? ' flip' : '')} />
      </button>
      {open && rect && createPortal(
        <div ref={menuRef} className="sel2-menu" role="listbox" aria-multiselectable={multiple || undefined}
          style={variant === 'icon'
            ? { position: 'fixed', top: rect.bottom + 4, left: 'auto', right: Math.max(8, window.innerWidth - rect.right), minWidth: 220 }
            : { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220), minWidth: Math.max(rect.width, 220) }}>
          {showSearch && (
            <label className="sel2-search">
              <Icon name="search" size={14} />
              <input ref={searchRef} value={query} placeholder="Search" aria-label="Search options"
                onChange={(e) => { setQuery(e.target.value); setActive(0); }} />
            </label>
          )}
          <div className="sel2-opts">
            {rows.map((o, idx) => {
              const on = isChosen(value, o.value, multiple);
              return (
                <button type="button" key={`${o.create ? 'new:' : ''}${o.value}`} role="option" aria-selected={on}
                  className={'sel2-opt' + (on ? ' on' : '') + (idx === active ? ' active' : '')}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => choose(o)}>
                  <span>{o.label}</span>
                  {on && <Icon name="check" size={14} />}
                </button>
              );
            })}
            {rows.length === 0 && <div className="sel2-empty">No matches</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
