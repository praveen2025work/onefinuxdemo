// Desks: One Finance's multi-screen workspaces, organised around business outcomes. A desk is bound to a business
// outcome (an engine outcome such as FOBO_HELIX, or a stitch kit such as FOBO) or it is free. Views on an outcome
// desk link to the outcome's shared channel, which the hub relays to every browser, so a pick or an action on one
// screen reaches that outcome's screens in other tabs and on other people's machines.
// Pure data + helpers: node --test loads this file.

import { channelById, contextLabel } from './channels.js';

export const SHARED_CHANNEL = /^outcome:[a-z0-9_-]{1,40}$/;
export const SHARED_COLOR = '#0891b2';

export function isSharedChannel(id) {
  return typeof id === 'string' && SHARED_CHANNEL.test(id);
}

/** subject = { kind: 'outcome' | 'kit', id, name, question? }. Anything else is not a subject. */
export function cleanSubject(s) {
  if (!s || typeof s !== 'object') return null;
  const kind = s.kind === 'outcome' || s.kind === 'kit' ? s.kind : null;
  const id = typeof s.id === 'string' && /^[A-Za-z0-9_.-]{1,60}$/.test(s.id) ? s.id : null;
  if (!kind || !id) return null;
  return {
    kind,
    id,
    name: String(s.name || id).slice(0, 80),
    ...(s.question ? { question: String(s.question).slice(0, 160) } : {}),
  };
}

/** The outcome's shared channel: `outcome:fobo_helix` for an engine outcome, `outcome:kit-fobo` for a kit. */
export function deskChannel(subject) {
  const s = cleanSubject(subject);
  if (!s) return null;
  const slug = (s.kind === 'kit' ? 'kit-' : '') + s.id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return 'outcome:' + slug.slice(0, 40);
}

/** Display info for a channel id: a colour (this browser only), or an outcome desk's shared channel. */
export function channelInfo(id, subject) {
  const colour = channelById(id);
  if (colour) return { ...colour, shared: false };
  if (!isSharedChannel(id)) return null;
  const s = cleanSubject(subject);
  const label = s && deskChannel(s) === id ? `${s.name} desk` : 'Outcome desk';
  return { id, label, color: SHARED_COLOR, shared: true };
}

/** What a desk can be built for: engine outcomes (Reports) and stitch kits (Board), one entry each. */
export function deskSubjects(outcomes = [], kits = []) {
  const seen = new Set();
  const list = [];
  for (const o of outcomes) {
    if (!o?.outcomeId || seen.has('outcome:' + o.outcomeId)) continue;
    seen.add('outcome:' + o.outcomeId);
    list.push({ kind: 'outcome', id: o.outcomeId, name: o.name || o.outcomeId, question: o.question, owner: o.ownerGroup });
  }
  for (const k of kits) {
    if (!k?.kitId || seen.has('kit:' + k.kitId)) continue;
    seen.add('kit:' + k.kitId);
    list.push({ kind: 'kit', id: k.kitId, name: k.name || `${k.kitId} kit`, question: k.question, owner: k.groupUnitId });
  }
  return list;
}

export function sameSubject(a, b) {
  const x = cleanSubject(a);
  const y = cleanSubject(b);
  return Boolean(x && y && x.kind === y.kind && x.id.toUpperCase() === y.id.toUpperCase());
}

/**
 * Does a hub item (an activity, a notification row, an outcome or instance change) belong to this desk's outcome?
 * A free desk hears everything; platform announcements reach every desk.
 */
export function matchesSubject(subject, item) {
  if (!item || typeof item !== 'object') return false;
  const s = cleanSubject(subject);
  if (!s) return true;
  const same = (v) => typeof v === 'string' && v.toUpperCase() === s.id.toUpperCase();
  const keyHead = typeof item.outcomeKey === 'string' ? item.outcomeKey.split(/[|/]/)[0] : null;
  if (keyHead === 'PLATFORM') return true;
  if (s.kind === 'outcome') return same(item.outcomeId) || same(keyHead);
  return same(item.kitId) || same(keyHead);
}

const ACTION_TONE = {
  SIGN_OFF: 'ok', COUNTERSIGN: 'ok', POST: 'info', ADJUST: 'warn', ESCALATE: 'fail', OVERRIDE: 'warn', RERUN: 'info', NOTE: 'plain',
};
const SEVERITY_TONE = { SUCCESS: 'ok', INFO: 'info', WARN: 'warn', CRITICAL: 'fail' };

/** One line of a desk's activity feed, from a hub activity, a notification row, or a context shared on the desk. */
export function feedItem(kind, data) {
  if (!data || typeof data !== 'object') return null;
  if (kind === 'activity') {
    return { id: String(data.id), at: data.at, kind: 'action', verb: data.action, actor: data.actor || null,
      text: data.summary || '', tone: ACTION_TONE[data.action] || 'info' };
  }
  if (kind === 'notification') {
    return { id: 'n-' + data.id, at: data.createdAt, kind: 'notification', verb: data.transition || 'NOTICE', actor: null,
      text: [data.title, data.message].filter(Boolean).join(' — '), tone: SEVERITY_TONE[data.severity] || 'info' };
  }
  if (kind === 'context') {
    return { id: data.id || `c-${data.at}-${data.source}`, at: new Date(data.at || Date.now()).toISOString(), kind: 'shared',
      verb: 'SHARED', actor: data.by || null, text: `${data.context?.type}: ${contextLabel(data.context)}`, tone: 'bo',
      remote: Boolean(data.remote) };
  }
  return null;
}

/** Newest first, one row per id. */
export function mergeFeed(items, limit = 80) {
  const byId = new Map();
  for (const it of items) if (it && it.id && !byId.has(it.id)) byId.set(it.id, it);
  const time = (it) => { const t = new Date(it.at).getTime(); return Number.isFinite(t) ? t : 0; };
  return [...byId.values()].sort((a, b) => time(b) - time(a)).slice(0, limit);
}

/**
 * The views a new outcome desk starts with. Every view links to the outcome's shared channel.
 * An engine outcome gets its readiness, report and lineage grids; a kit gets its instances, the instance viewer
 * and the board. Both start with the activity feed, which is where actions from other screens show up.
 */
export function deskTemplate(subject, { grids = [] } = {}) {
  const s = cleanSubject(subject);
  if (!s) return null;
  const channel = deskChannel(s);
  const view = (appId, title, extra = {}) => ({ appId, title, channel, ...extra });
  const widget = (appId, title, config = {}) => view(appId, title, { config: { ...config, subject: s } });
  if (s.kind === 'outcome') {
    return {
      name: s.name,
      subject: s,
      layout: 'grid',
      views: [
        widget('activity', 'Activity'),
        widget('grid', 'Readiness', { spec: 'outcomes', filter: { outcomeId: s.id } }),
        view('reports', s.name, { channel: null, path: '/reports/' + encodeURIComponent(s.id) }),
        ...grids.slice(0, 2).filter((g) => g?.id).map((g) => widget('grid', g.title || g.id, { spec: `outcome:${s.id}:${g.id}` })),
      ],
    };
  }
  return {
    name: s.name,
    subject: s,
    layout: 'grid',
    views: [
      widget('activity', 'Activity'),
      widget('grid', 'Instances', { spec: 'instances', filter: { kitId: s.id } }),
      view('instance', 'Instance detail'),
      view('board', 'Outcome board', { channel: null }),
    ],
  };
}
