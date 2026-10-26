import Menu from '../components/Menu.jsx';
import Icon from '../components/Icon.jsx';
import { CHANNELS, channelById } from './channels.js';

/** Colour link picker for a view (OpenFin / FDC3 user channels). `null` = not linked. */
export default function ChannelPicker({ value, onChange, compact = false }) {
  const current = channelById(value);
  return (
    <Menu width={196} align="end" trigger={(open, toggle) => (
      <button type="button" className={'chan-trig' + (open ? ' on' : '') + (current ? ' linked' : '')} onClick={toggle}
        title={current ? `Linked: ${current.label} channel` : 'Not linked — pick a colour to share context'}
        aria-label={current ? `Linked to ${current.label}` : 'Link to a channel'}>
        {current ? <i className="chan-dot" style={{ background: current.color }} /> : <Icon name="link" size={13} />}
        {!compact && <span>{current ? current.label : 'Link'}</span>}
      </button>
    )}>
      {(close) => (
        <div className="menu-sec">
          <div className="menu-lbl">Link channel</div>
          <div className="chan-grid">
            {CHANNELS.map((c) => (
              <button key={c.id} type="button" className={'chan-opt' + (c.id === value ? ' on' : '')}
                onClick={() => { onChange(c.id); close(); }} title={c.label}>
                <i className="chan-dot lg" style={{ background: c.color }} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="menu-item" onClick={() => { onChange(null); close(); }} disabled={!value}>
            <Icon name="x" size={13} /><span className="menu-txt">Unlink</span>
          </button>
        </div>
      )}
    </Menu>
  );
}
