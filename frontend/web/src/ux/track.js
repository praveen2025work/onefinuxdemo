// The console's telemetry instance: batches to /api/ux/events and flushes when the tab is hidden.
import { uxApi } from '../api.js';
import { createTelemetry, routeKey } from './telemetry.js';

export const telemetry = createTelemetry({ send: (batch, keepalive) => uxApi.events(batch, keepalive) });

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') telemetry.flush(true); });
}

export const track = (type, fields) => telemetry.track(type, fields);
export const trackOpen = (pathname) => telemetry.track('APP_OPEN', { app: routeKey(pathname) });
/** A component used on a screen: a lens switch, a desk action, a recommendation followed… */
export const trackUse = (component, app = typeof window !== 'undefined' ? routeKey(window.location.pathname) : undefined, detail) =>
  telemetry.track('COMPONENT_USE', { app, component, detail });
