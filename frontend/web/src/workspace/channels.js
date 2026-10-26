// Link channels for the Workspace — the FDC3 "user channel" idea (OpenFin / Glue42 colour linking).
// Views on the same colour share context: pick a row in one, the others follow. Pure data + helpers.

export const CHANNELS = [
  { id: 'red', label: 'Red', color: '#ef4444' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'yellow', label: 'Yellow', color: '#eab308' },
  { id: 'green', label: 'Green', color: '#22c55e' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'purple', label: 'Purple', color: '#a855f7' },
];

export function channelById(id) {
  return CHANNELS.find((c) => c.id === id) || null;
}

/** Context types the console understands. Partners may send any `type`; unknown types are relayed untouched. */
export const CONTEXT_TYPES = {
  instance: 'ofx.instance', // { id, kitId?, region?, status?, name? }
  outcome: 'ofx.outcome', // { outcomeId, cobDate, region }
  tile: 'ofx.tile', // { tileId, title, status }
  scope: 'ofx.scope', // { groupUnit, cobDate, region }
};

/** The context a console instance row shares. */
export function instanceContext(i) {
  return { type: CONTEXT_TYPES.instance, id: i.instanceId, kitId: i.kitId, region: i.region, status: i.status, name: i.question };
}

/** A context must be a plain object with a string `type`, and small enough to post around. */
export function isValidContext(ctx) {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return false;
  if (typeof ctx.type !== 'string' || !ctx.type || ctx.type.length > 80) return false;
  try {
    return JSON.stringify(ctx).length <= 16_384;
  } catch {
    return false;
  }
}

/** The console route a context opens, or null when the context is not navigable. */
export function routeForContext(ctx) {
  if (!isValidContext(ctx)) return null;
  if (ctx.type === CONTEXT_TYPES.instance && ctx.id) return '/instance/' + encodeURIComponent(String(ctx.id));
  if (ctx.type === CONTEXT_TYPES.outcome && ctx.outcomeId && ctx.cobDate && ctx.region) {
    return `/reports/${encodeURIComponent(ctx.outcomeId)}/${encodeURIComponent(ctx.cobDate)}/${encodeURIComponent(ctx.region)}`;
  }
  return null;
}

/** Should a view showing `pathname` follow this context by navigating? Only viewers of the same kind follow. */
export function followRoute(pathname, ctx) {
  const route = routeForContext(ctx);
  if (!route) return null;
  const path = String(pathname || '');
  if (ctx.type === CONTEXT_TYPES.instance && (path === '/instance' || path.startsWith('/instance/'))) return route === path ? null : route;
  if (ctx.type === CONTEXT_TYPES.outcome && path.startsWith('/reports/')) return route === path ? null : route;
  return null;
}

/** One-line label for a context chip. */
export function contextLabel(ctx) {
  if (!isValidContext(ctx)) return '—';
  if (ctx.type === CONTEXT_TYPES.instance) return [ctx.kitId, ctx.region, ctx.id].filter(Boolean).join(' · ');
  if (ctx.type === CONTEXT_TYPES.outcome) return [ctx.outcomeId, ctx.cobDate, ctx.region].filter(Boolean).join(' · ');
  if (ctx.type === CONTEXT_TYPES.tile) return [ctx.title || ctx.tileId, ctx.status].filter(Boolean).join(' · ');
  if (ctx.type === CONTEXT_TYPES.scope) return [ctx.groupUnit, ctx.cobDate, ctx.region || 'ALL'].filter(Boolean).join(' · ');
  return ctx.name || ctx.id || ctx.type;
}
