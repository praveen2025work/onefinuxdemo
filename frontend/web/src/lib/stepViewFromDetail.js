/**
 * Compose a step-view payload from the instance-detail body.
 * Used when GET /instance/step-view is missing (stale hub) or returns 404.
 * Same rules as the hub fold: IFRAME from dest.surface, else GRID of events. No product switch.
 */

import { destUsesKitEmbed, resolvePartnerEmbedUrl } from './partnerEmbed.js';

export function destsPublishSurface(detail) {
  return (detail?.destinations || []).some((d) => Object.prototype.hasOwnProperty.call(d, 'surface'));
}

export function stepViewFromDetail(detail, ref) {
  const needle = String(ref || '').trim();
  const dests = detail?.destinations || [];
  const dest = dests.find((d) => d.destId === needle) || null;
  const inst = detail?.instance || {};
  const title = dest ? String(dest.displayName || needle) : needle;

  if (destUsesKitEmbed(dest, inst)) {
    const embedUrl = resolvePartnerEmbedUrl(dest.embedUrl || inst.embedUrl || null);
    return {
      kind: 'IFRAME',
      ref: needle,
      title,
      embedUrl,
      allowedOrigin: dest.allowedOrigin || inst.allowedOrigin || null,
    };
  }

  const sourceFilter = dest ? String(dest.reportSourceId || '').trim() : needle;
  const events = detail?.events || [];
  const matched = events.filter((event) => eventMatchesRef(event, needle, sourceFilter, dest));
  if (!matched.length) {
    return { kind: 'NONE', ref: needle, title, columns: [], rows: [] };
  }
  return grid(needle, title, matched);
}

function eventMatchesRef(event, needle, sourceFilter, dest) {
  const src = String(event?.sourceSystem || '');
  if (dest) {
    if (sourceFilter && src === sourceFilter) return true;
    if (!sourceFilter && (src === needle || String(event?.eventType || '').includes(needle))) return true;
    if (!sourceFilter && src && needle.includes(src)) return true;
    return false;
  }
  return src === needle;
}

function grid(ref, title, events) {
  const extra = [];
  const rows = events.map((event) => {
    const row = {
      occurredAt: event.occurredAt,
      eventType: event.eventType,
      status: event.status,
      sourceKey: event.sourceKey,
    };
    for (const [key, value] of Object.entries(attrsOf(event))) {
      if (!key || key.toLowerCase() === 'instanceid' || key.toLowerCase() === 'correlationid') continue;
      if (!extra.includes(key)) extra.push(key);
      row[key] = value;
    }
    return row;
  });
  const columns = [
    { key: 'occurredAt', label: 'Time' },
    { key: 'eventType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'sourceKey', label: 'Key' },
    ...extra.map((key) => ({ key, label: key })),
  ];
  return { kind: 'GRID', ref, title, columns, rows };
}

function attrsOf(event) {
  const raw = event?.attributesJson;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
}
