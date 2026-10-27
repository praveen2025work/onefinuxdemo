import Menu from '../components/Menu.jsx';
import Icon from '../components/Icon.jsx';
import { CHANNELS } from './channels.js';
import { channelInfo } from './desks.js';

/**
 * Link picker for a view. Colours (FDC3 user channels) link views in this browser; on an outcome desk the desk's own
 * channel is offered first and links the view with that outcome's screens in every browser. `null` = not linked.
 * `desk` = the channel info of the current desk's shared channel (from channelInfo), or null on a free desk.
 */
export default function ChannelPicker({ value, onChange, compact = false, desk = null }) {
  const current = channelInfo(value, desk?.subject);
  return (
    <Menu width={216} align="end" trigger={(open, toggle) => (
      <button type="button" className={'chan-trig' + (open ? ' on' : '') + (current ? ' linked' : '') + (current?.shared ? ' shared' : '')} onClick={toggle}
        title={current ? `Linked: ${current.label}${current.shared ? ' (shared with every browser on this outcome)' : ' channel'}` : 'Not linked — pick a channel to share context'}
        aria-label={current ? `Linked to ${current.label}` : 'Link to a channel'}>
        {current ? <i className={'chan-dot' + (current.shared ? ' shared' : '')} style={{ background: current.color }} /> : <Icon name="link" size={13} />}
        {!compact && <span>{current ? current.label : 'Link'}</span>}
      </button>
    )}>
      {(close) => (
        <div className="menu-sec">
          {desk && (
            <>
              <div className="menu-lbl">This desk <span className="muted">· every browser on {desk.subject?.name || 'this outcome'}</span></div>
              <button type="button" className={'menu-item' + (value === desk.id ? ' on' : '')} onClick={() => { onChange(desk.id); close(); }}>
                <i className="chan-dot lg shared" style={{ background: desk.color }} />
                <span className="menu-txt">{desk.label}</span>
                {value === desk.id && <Icon name="check" size={13} />}
              </button>
            </>
          )}
          <div className="menu-lbl">Colour <span className="muted">· this browser</span></div>
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
