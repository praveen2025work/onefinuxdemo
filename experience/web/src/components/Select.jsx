import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * A modern, accessible dropdown that replaces the native <select> everywhere in the console.
 * Controlled: pass value + options [{value,label}] + onChange. Supports a small caption, an optional
 * leading icon, keyboard (Esc/Enter/Arrows) and click-outside close.
 */
export default function Select({ value, onChange, options, placeholder = 'Select…', caption, icon,
  variant = 'default', minWidth }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter' && active >= 0) { onChange(options[active].value); setOpen(false); }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, active, options, onChange]);

  return (
    <div className={'sel2 ' + variant + (open ? ' open' : '')} ref={ref} style={minWidth ? { minWidth } : undefined}>
      <button type="button" className="sel2-trig" onClick={() => { setOpen((o) => !o); setActive(options.findIndex((o) => o.value === value)); }}>
        {icon && <Icon name={icon} size={15} className="sel2-ic" />}
        <span className="sel2-txt">
          {caption && <span className="sel2-cap">{caption}</span>}
          <span className={'sel2-val' + (selected ? '' : ' ph')}>{selected ? selected.label : placeholder}</span>
        </span>
        <Icon name="down" size={14} className={'sel2-chev' + (open ? ' flip' : '')} />
      </button>
      {open && (
        <div className="sel2-menu" role="listbox">
          {options.map((o, idx) => (
            <button type="button" key={o.value} role="option" aria-selected={o.value === value}
              className={'sel2-opt' + (o.value === value ? ' on' : '') + (idx === active ? ' active' : '')}
              onMouseEnter={() => setActive(idx)}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <span>{o.label}</span>
              {o.value === value && <Icon name="check" size={14} />}
            </button>
          ))}
          {options.length === 0 && <div className="sel2-empty">No options</div>}
        </div>
      )}
    </div>
  );
}
