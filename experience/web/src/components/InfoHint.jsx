import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * A compact info icon that keeps explanatory copy off the screen until asked for.
 * Hover reveals the popover; click pins it open (click-outside / Esc closes). This lets
 * every screen drop its long descriptive paragraph and reclaim the space.
 */
export default function InfoHint({ children, title, width = 300, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <span className={'infohint' + (open ? ' pinned' : '')} ref={ref}>
      <button type="button" className="infohint-btn" aria-label={title || 'More info'}
        aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="info" size={15} />
      </button>
      <span className={'infohint-pop ' + align} style={{ width }} role="tooltip">
        {title && <span className="infohint-ttl">{title}</span>}
        <span className="infohint-bd">{children}</span>
      </span>
    </span>
  );
}
