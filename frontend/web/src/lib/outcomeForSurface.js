/** Resolve which OutcomeDefinition supplies grids for an instance or report. */

export function outcomeForSurface(defs, hint = {}) {
  const list = Array.isArray(defs) ? defs : [];
  const outcomeId = hint.outcomeId;
  if (outcomeId) {
    const byId = list.find((d) => d && d.id === outcomeId);
    if (byId) return byId;
  }
  const kitId = hint.kitId;
  if (kitId) {
    const exact = list.find((d) => d && d.id === kitId);
    if (exact) return exact;
    const prefix = kitId + '_';
    return list.find((d) => d && typeof d.id === 'string' && d.id.startsWith(prefix)) || null;
  }
  return null;
}
