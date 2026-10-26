import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon, { BrandMark } from '../components/Icon.jsx';
import ChannelPicker from './ChannelPicker.jsx';
import { EMBED_TITLE, EMBED_VIEW_ID, POPPED } from '../embed.js';
import { followRoute } from './channels.js';
import { interopSelf, onLinkedContext, onOwnChannel, onSystem, postSystem, setOwnChannel } from './interop.js';
import { useLiveStatus } from '../useStream.js';

/**
 * A console screen running as a Workspace view (?ofx-embed=1): no rail, no top bar, no second masthead.
 * - Follows linked context: an Instance view on the blue channel opens whatever row a blue view picked.
 * - Obeys host commands (navigate) and announces itself so the host replays channel + scope.
 * - Torn out into its own window, it draws a slim header with the link picker and a Dock button.
 */
export default function EmbedShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [channel, setChannel] = useState(() => interopSelf().channel);

  useEffect(() => onOwnChannel(setChannel), []);

  useEffect(() => onLinkedContext((ctx) => {
    const to = followRoute(window.location.pathname, ctx);
    if (to) navigate(to);
  }), [navigate]);

  useEffect(() => onSystem((msg) => {
    if (msg.viewId !== EMBED_VIEW_ID) return;
    if (msg.kind === 'navigate' && typeof msg.path === 'string' && msg.path.startsWith('/') && !msg.path.startsWith('//')) {
      navigate(msg.path);
    }
    if (msg.kind === 'join' && msg.context) {
      const to = followRoute(window.location.pathname, msg.context);
      if (to) navigate(to);
    }
  }), [navigate]);

  useEffect(() => { postSystem({ kind: 'view-hello', viewId: EMBED_VIEW_ID }); }, []);

  function dock() {
    const qs = new URLSearchParams(location.search);
    [...qs.keys()].filter((k) => k.startsWith('ofx-') || ['groupUnit', 'cobDate', 'region', 'theme'].includes(k)).forEach((k) => qs.delete(k));
    postSystem({
      kind: 'dock',
      viewId: EMBED_VIEW_ID,
      path: location.pathname + (qs.toString() ? '?' + qs.toString() : ''),
      title: EMBED_TITLE || document.title,
      channel,
    });
    setTimeout(() => window.close(), 150);
  }

  return (
    <div className={'embed' + (POPPED ? ' popped' : '')}>
      {POPPED && (
        <header className="embed-hd">
          <BrandMark size={22} />
          <b>{EMBED_TITLE || 'One Finance view'}</b>
          <LiveDot />
          <div className="spacer" />
          <ChannelPicker value={channel} onChange={(c) => setOwnChannel(c)} />
          <button type="button" className="btn ghost sm" onClick={dock} title="Put this view back into the Workspace">
            <Icon name="minimize" size={13} /> Dock
          </button>
        </header>
      )}
      <main className="body embed-body"><div className="wrap">{children}</div></main>
    </div>
  );
}

function LiveDot() {
  const s = useLiveStatus();
  return <span className="live-pill"><span className={'live-dot' + (s.live ? '' : ' off')} />{s.live ? `live · ${s.transport}` : 'offline'}</span>;
}
