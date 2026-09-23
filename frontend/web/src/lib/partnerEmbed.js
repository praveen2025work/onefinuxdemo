/**
 * Kit embed URLs. Seed used https://helix.example/fobo as a placeholder.
 * The POC stub is same-origin through the console proxy at /sim/screens/helix.
 * Rewrite the documented placeholder host only — not a product switch.
 */
export function resolvePartnerEmbedUrl(url) {
  if (url == null || url === '') return url;
  const raw = String(url);
  if (raw.startsWith('/')) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'helix.example' || parsed.hostname.endsWith('.helix.example')) {
      return '/sim/screens/helix';
    }
  } catch {
    return raw;
  }
  return raw;
}

/** IFRAME surface, or a stale dest whose id is the kit renderer prefix (HELIX vs HELIX_RECON). */
export function destUsesKitEmbed(dest, inst) {
  if (!dest) return false;
  if (String(dest.surface || '').toUpperCase() === 'IFRAME') return true;
  if (dest.surface) return false;
  const renderer = String(inst?.renderer || '').toUpperCase();
  const destId = String(dest.destId || '').toUpperCase();
  return Boolean(inst?.embedUrl && destId && renderer.startsWith(destId));
}
