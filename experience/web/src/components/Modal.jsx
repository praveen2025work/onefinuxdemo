import { useEffect, useState } from 'react';
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

/** Prompt replacement: a titled modal with a single text input. */
export function PromptModal({ title, subtitle, label, placeholder, initial = '', confirmText = 'Save', onCancel, onConfirm }) {
  const [value, setValue] = useState(initial);
  return (
    <Modal title={title} subtitle={subtitle} onClose={onCancel}
      footer={<><button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={() => onConfirm(value.trim())} disabled={!value.trim()}>{confirmText}</button></>}>
      <div className="field" style={{ margin: 0 }}>
        {label && <label>{label}</label>}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input className="inp" autoFocus value={value} placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()); }} />
      </div>
    </Modal>
  );
}

/** Confirm replacement. */
export function ConfirmModal({ title, subtitle, body, confirmText = 'Confirm', danger, onCancel, onConfirm }) {
  return (
    <Modal title={title} subtitle={subtitle} onClose={onCancel}
      footer={<><button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className={'btn' + (danger ? ' danger' : '')} onClick={onConfirm}>{confirmText}</button></>}>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{body}</p>
    </Modal>
  );
}
