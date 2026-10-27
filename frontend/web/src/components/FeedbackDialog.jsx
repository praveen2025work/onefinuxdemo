import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { routeKey } from '../ux/telemetry.js';
import { telemetry } from '../ux/track.js';

const CATEGORIES = [
  { id: 'problem', label: 'Something is wrong' },
  { id: 'idea', label: 'An idea' },
  { id: 'data', label: 'The data looks off' },
  { id: 'praise', label: 'This works well' },
];

/** Feedback from any screen: a rating, what kind, and a note. It is stored with the screen it came from (/usage). */
export default function FeedbackDialog({ open, onClose, initialCategory }) {
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('problem');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) { setSent(false); setRating(0); setText(''); setCategory(initialCategory || 'problem'); }
  }, [open, initialCategory]);

  if (!open) return null;

  function send(e) {
    e.preventDefault();
    telemetry.track('FEEDBACK', { app: routeKey(location.pathname), component: category, variant: rating ? String(rating) : undefined,
      detail: { text: text.trim().slice(0, 1500), path: location.pathname } });
    telemetry.flush();
    setSent(true);
  }

  return (
    <Modal title="Feedback" onClose={onClose} width={460}>
      {sent ? (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>Thank you. The team reads every note on the Usage &amp; feedback screen.</p>
          <div className="row"><button type="button" className="btn" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <form className="stack" onSubmit={send}>
          <div className="field">
            <label>About <span className="muted mono">{routeKey(location.pathname)}</span></label>
            <div className="seg">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" className={category === c.id ? 'on' : ''} onClick={() => setCategory(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>How is this screen working for you?</label>
            <div className="fb-stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`}
                  className={'fb-star' + (n <= rating ? ' on' : '')} onClick={() => setRating(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>What happened, or what would help?</label>
            <textarea className="inp" rows={4} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} required
              placeholder="e.g. The board took a while to show R-2031 after Motif posted." />
          </div>
          <div className="row">
            <button type="submit" className="btn" disabled={!text.trim()}><Icon name="send" size={14} /> Send</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
