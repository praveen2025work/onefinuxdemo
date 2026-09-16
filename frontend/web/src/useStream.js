import { useEffect, useRef } from 'react';

/**
 * Subscribe to the hub's Server-Sent Events. The hub emits named events: hello, event, outcome,
 * notification, reset, kit. The browser never touches a bus — this is the only live channel.
 * Reconnects if the tab was backgrounded and the socket dropped, so cards still arrive
 * once the One Finance tab is active again.
 */
export function useStream(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    let es;
    let retry;
    const names = ['hello', 'event', 'outcome', 'notification', 'reset', 'kit', 'propagation'];

    function bind(socket) {
      return names.map((name) => {
        const fn = (e) => {
          let data = null;
          try { data = JSON.parse(e.data); } catch { data = e.data; }
          ref.current[name]?.(data);
        };
        socket.addEventListener(name, fn);
        return [name, fn];
      });
    }

    function connect() {
      if (es && es.readyState !== EventSource.CLOSED) return;
      es = new EventSource('/api/stream');
      const listeners = bind(es);
      es.__listeners = listeners;
      es.onerror = () => {
        ref.current.error?.();
        listeners.forEach(([name, fn]) => es.removeEventListener(name, fn));
        es.close();
        es = null;
        clearTimeout(retry);
        retry = setTimeout(connect, 2000);
      };
    }

    function onVisible() {
      if (!document.hidden) connect();
    }

    connect();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(retry);
      if (es) {
        (es.__listeners || []).forEach(([name, fn]) => es.removeEventListener(name, fn));
        es.close();
      }
    };
  }, []);
}
