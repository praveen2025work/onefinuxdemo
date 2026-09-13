import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function parse(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function iso(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${d}`;
}
function label(dt) {
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * A modern calendar popover that replaces the native <input type="date">. Shows a month grid with
 * prev/next navigation, today + selected highlights, and emphasises the COB dates the platform
 * actually has data for. Rendered in a portal (fixed) so it is never clipped, and closes on Escape,
 * outside click, scroll, resize or window blur.
 */
export default function DatePicker({ value, cobDates = [], onChange }) {
  const selected = parse(value);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || today);
  const [rect, setRect] = useState(null);
  const trigRef = useRef(null);
  const popRef = useRef(null);
  const cobSet = useMemo(() => new Set(cobDates), [cobDates]);

  const place = useCallback(() => { if (trigRef.current) setRect(trigRef.current.getBoundingClientRect()); }, []);
  useLayoutEffect(() => { if (open) { setView(parse(value) || new Date()); place(); } }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (trigRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function pick(dt) { onChange(iso(dt)); setOpen(false); }

  return (
    <div className="dp">
      <button ref={trigRef} type="button" className="tb-btn cal" title="Business date (COB)"
        onClick={() => setOpen((o) => !o)}>
        <Icon name="calendar" size={15} />
        <span className="dp-val">{selected ? label(selected) : 'Pick COB'}</span>
        <Icon name="down" size={13} className={'sel2-chev' + (open ? ' flip' : '')} />
      </button>
      {open && rect && createPortal(
        <div ref={popRef} className="dp-pop"
          style={{ position: 'fixed', top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)) }}>
          <div className="dp-hd">
            <button type="button" className="dp-nav" title="Previous month"
              onClick={() => setView(new Date(y, m - 1, 1))}><Icon name="chevron" size={16} /></button>
            <div className="dp-title">{MONTHS[m]} {y}</div>
            <button type="button" className="dp-nav" title="Next month"
              onClick={() => setView(new Date(y, m + 1, 1))}><Icon name="chevron" size={16} className="flip" /></button>
          </div>
          <div className="dp-wd">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="dp-grid">
            {cells.map((dt, i) => (dt ? (
              <button key={iso(dt)} type="button"
                className={'dp-day' + (sameDay(dt, selected) ? ' sel' : '') + (sameDay(dt, today) ? ' today' : '')
                  + (cobSet.has(iso(dt)) ? ' cob' : '')}
                title={cobSet.has(iso(dt)) ? 'COB with data' : undefined}
                onClick={() => pick(dt)}>{dt.getDate()}</button>
            ) : <span key={`e${i}`} className="dp-empty" />))}
          </div>
          <div className="dp-ft">
            {cobDates.length > 0
              ? cobDates.slice(0, 3).map((d) => (
                <button key={d} type="button" className={'dp-quick' + (d === value ? ' on' : '')}
                  onClick={() => { onChange(d); setOpen(false); }}>{label(parse(d))}</button>
              ))
              : <button type="button" className="dp-quick" onClick={() => pick(today)}>Today</button>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
