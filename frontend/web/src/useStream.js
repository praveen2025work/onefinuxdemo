import { useEffect, useRef, useState } from 'react';
import { onLiveStatus, subscribeLive } from './live/liveLink.js';

/**
 * Subscribe to the hub's live events: hello, event, outcome, notification, reset, kit, propagation.
 * Every hook shares one connection (WebSocket /api/ws, SSE fallback) — see live/liveLink.js.
 * `error` fires when the link drops; the link reconnects on its own and says `hello` again.
 */
export function useStream(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const off = subscribeLive((name, data) => ref.current[name]?.(data));
    let wasLive = null;
    const offStatus = onLiveStatus((s) => {
      if (s.live === wasLive) return;
      const dropped = wasLive === true && !s.live;
      wasLive = s.live;
      if (dropped) ref.current.error?.();
    });
    return () => { off(); offStatus(); };
  }, []);
}

/** { live, transport: 'ws'|'sse'|null, role: 'leader'|'follower', since, lastAt } */
export function useLiveStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => onLiveStatus((s) => setStatus({ ...s })), []);
  return status || { live: false, transport: null, role: 'starting' };
}
