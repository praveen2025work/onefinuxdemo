import { useEffect } from 'react';
import Icon from './Icon.jsx';

/** On-screen modal dialog — the app never uses window.alert / prompt / confirm. */
export default function Modal({ title, subtitle, onClose, children, footer, width = 460 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd">
          <div><div className="modal-ttl">{title}</div>{subtitle && <div className="modal-sub">{subtitle}</div>}</div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="chevron" size={16} className="flip" /></button>
        </div>
        <div className="modal-bd">{children}</div>
        {footer && <div className="modal-ft">{footer}</div>}
      </div>
    </div>
  );
}
