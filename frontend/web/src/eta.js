/** Advisory ETA helpers. Predictions never sit on the readiness fold. */

export function formatClock(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function etaCaption(o) {
  const n = o.historicSamples || 0;
  const prior = n === 1 ? '1 prior COB' : `${n} prior COBs`;
  switch (o.etaBasis) {
    case 'BLENDED': return `Blended: this COB's arrivals + P50 of ${prior}`;
    case 'HISTORIC': return `P50 of ${prior} (same outcome + region)`;
    case 'LIVE': return "Projected from this COB's arrived facts";
    default: return 'Not enough arrivals yet';
  }
}

export function hasPrediction(o) {
  return Boolean(o && o.eta);
}
