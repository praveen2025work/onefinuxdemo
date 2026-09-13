import { useEffect, useRef } from 'react';

/**
 * Subscribe to the hub's Server-Sent Events. The hub emits named events: hello, event, outcome,
 * notification, reset, kit. The browser never touches a bus — this is the only live channel.
 */
export function useStream(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const es = new EventSource('/api/stream');
    const names = ['hello', 'event', 'outcome', 'notification', 'reset', 'kit'];
    const listeners = names.map((name) => {
      const fn = (e) => {
        let data = null;
        try { data = JSON.parse(e.data); } catch { data = e.data; }
        ref.current[name]?.(data);
      };
      es.addEventListener(name, fn);
      return [name, fn];
    });
    es.onerror = () => ref.current.error?.();
    return () => {
      listeners.forEach(([name, fn]) => es.removeEventListener(name, fn));
      es.close();
    };
  }, []);
}
