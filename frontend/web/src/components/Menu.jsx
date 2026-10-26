import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Header dropdown (STEPS DropdownMenu). `trigger(open, toggle)` renders the button; children render the menu
 * and receive `close`. The menu is portalled + fixed so a panel never clips it, and it closes on outside
 * click, Escape, scroll, resize and window blur — the same contract as Select and DatePicker.
 */
export default function Menu({ trigger, children, align = 'end', width = 280, className = '' }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const trigRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useLayoutEffect(() => {
    if (open && trigRef.current) setRect(trigRef.current.getBoundingClientRect());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (trigRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    function onScroll(e) { if (!menuRef.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close]);

  const left = rect
    ? Math.max(8, Math.min(align === 'end' ? rect.right - width : rect.left, window.innerWidth - width - 8))
    : 0;

  return (
    <div className="menu-wrap" ref={trigRef}>
      {trigger(open, toggle)}
      {open && rect && createPortal(
        <div ref={menuRef} className={'menu-pop ' + className} role="menu"
          style={{ position: 'fixed', top: rect.bottom + 6, left, width }}>
          {typeof children === 'function' ? children(close) : children}
        </div>,
        document.body,
      )}
    </div>
  );
}
