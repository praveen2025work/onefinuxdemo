import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import TileContent from './TileContent.jsx';

const ROTATE_MS = 15_000;
const DOT = { success: 'ok', warning: 'warn', error: 'fail', info: 'info', neutral: 'plain' };

/**
 * STEPS FinanceTile: status dot, alert mark, slides that rotate every 15s, hover controls
 * (prev / next / pin / focus) and a footer with update time and source. Click to focus.
 */
export default function FinanceTile({ tile, onFocus, focused = false, full = false, compact = false, live = false, flash = false }) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const slides = tile.slides || [];
  const slide = slides.length ? slides[index % slides.length] : null;

  useEffect(() => {
    if (pinned || slides.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [pinned, slides.length]);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <article className={'ftile' + (focused ? ' focused' : '') + (compact ? ' compact' : '') + (flash ? ' flash' : '')}
      onClick={onFocus} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onFocus?.(); }}>
      <header className="ftile-hd">
        <div className="ftile-ttl">
          <i className={'ftile-dot ' + (DOT[tile.status] || 'info')} />
          <h3>{tile.title}</h3>
          {tile.alert && <span className="ftile-alert" title="Needs attention"><Icon name="alert" size={14} /></span>}
          {live && <span className="ftile-live" title="Refreshed when the hub pushes over the WebSocket">live</span>}
        </div>
        <div className="ftile-ctl">
          {slides.length > 1 && (
            <>
              <button type="button" title="Previous view" onClick={stop(() => setIndex((i) => (i - 1 + slides.length) % slides.length))}><Icon name="chevron" size={13} /></button>
              <button type="button" title="Next view" onClick={stop(() => setIndex((i) => (i + 1) % slides.length))}><Icon name="right" size={13} /></button>
            </>
          )}
          <button type="button" title={pinned ? 'Resume rotation' : 'Pin this view'} className={pinned ? 'on' : ''} onClick={stop(() => setPinned((p) => !p))}>
            <Icon name={pinned ? 'pinoff' : 'pin'} size={13} />
          </button>
          {!full && <button type="button" title="Focus" onClick={stop(() => onFocus?.())}><Icon name="maximize" size={13} /></button>}
        </div>
      </header>
      {!compact && <p className="ftile-desc">{tile.description}</p>}
      <div className="ftile-bd">{slide ? <TileContent slide={slide} compact={compact} full={full} /> : <div className="tile-empty">No data available</div>}</div>
      {slides.length > 1 && !compact && (
        <div className="ftile-dots">{slides.map((s, i) => <i key={s.id} className={i === index % slides.length ? 'on' : ''} />)}</div>
      )}
      {!compact && (
        <footer className="ftile-ft">
          <span>Updated: {tile.lastUpdated}</span>
          {slide?.source && <span className="ftile-src" title={slide.source}>Source: {slide.source}</span>}
        </footer>
      )}
    </article>
  );
}
