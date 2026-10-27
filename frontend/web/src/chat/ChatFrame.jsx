import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { currentActor } from '../api.js';
import { partnerThemeParams } from '../lib/themes.js';
import { broadcastContext } from '../workspace/interop.js';
import { routeKey } from '../ux/telemetry.js';
import { trackUse } from '../ux/track.js';
import { chatOrigin, chatSrc, contextMessage, readChatMessage } from './chatHost.js';

/**
 * A chatbot another team runs, framed in the console. It starts with the theme and the user's scope in its URL,
 * then hears every theme and scope change by postMessage (see chatHost.js for the contract), and may ask the console
 * to open a route or share a context with linked screens. Nothing else it sends is acted on. The bot styles itself
 * with /theme/onefinux-tokens.css and the .ofx-chat classes, so it looks like the console's own assistant.
 */
export default function ChatFrame({ chatbot, className = '' }) {
  const { filters, themeId } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const frame = useRef(null);
  const [ready, setReady] = useState(false);
  const pageOrigin = window.location.origin;
  const origin = useMemo(() => chatOrigin(chatbot, pageOrigin), [chatbot, pageOrigin]);
  const theme = partnerThemeParams(themeId);
  // The src is fixed at first render; later changes travel by postMessage so the conversation is not reloaded.
  const [src] = useState(() => chatSrc(chatbot, { ...theme, scope: filters, pageOrigin }));

  const post = (msg) => { if (origin && frame.current?.contentWindow) frame.current.contentWindow.postMessage(msg, origin); };

  useEffect(() => {
    function onMessage(e) {
      const m = readChatMessage(e, { origin, frameWindow: frame.current?.contentWindow });
      if (!m) return;
      if (m.kind === 'ready') setReady(true);
      if (m.kind === 'open') { trackUse('chatbot.open', routeKey(window.location.pathname), { route: m.route }); navigate(m.route); }
      if (m.kind === 'share') { trackUse('chatbot.share'); broadcastContext(m.context); }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin, navigate]);

  useEffect(() => { if (ready) post({ type: 'ofx.theme', theme: theme.theme, skin: theme.skin }); }, [ready, theme.theme, theme.skin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ready) post(contextMessage(filters, routeKey(location.pathname), currentActor()));
  }, [ready, filters.groupUnit, filters.cobDate, filters.region, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) return <div className="empty sm">The chatbot URL is not valid. Check onefinux.ux.chatbot.url.</div>;
  return (
    <iframe ref={frame} className={'chat-frame ' + className} src={src} title={chatbot.title || 'Chat'}
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups" referrerPolicy="strict-origin-when-cross-origin"
      allow="clipboard-write" />
  );
}
