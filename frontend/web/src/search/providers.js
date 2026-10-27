// Header search across applications. One query fans out to: the hub (/api/search: instances, outcomes,
// notifications, already entitlement-filtered), other applications that register a search endpoint
// (/api/ux/config searchProviders, called from the browser so the user's own access applies), and local
// sources — the console's screens, grids and common tasks. Pure: node --test drives localHits and mergeGroups.

export const TASKS = [
  { id: 'new-desk', title: 'New desk', detail: 'Start a desk for a business outcome, or a blank one', route: '/desks?new=1', words: 'workspace create layout' },
  { id: 'onboard', title: 'Onboard a business outcome', detail: 'Six steps: question, feeds, SLA, when ready, grids, review', route: '/onboarding', words: 'create outcome new' },
  { id: 'grid', title: 'Build or embed a grid', detail: 'GridSpec library, iframe and <ofx-grid> snippets', route: '/grids', words: 'table data embed spec' },
  { id: 'access', title: 'Request access', detail: 'Everything a desk or app needs, in one request', route: '/access#request', words: 'entitlement permission role' },
  { id: 'feedback', title: 'Give feedback', detail: 'Report a problem or suggest an idea', action: 'feedback', words: 'bug idea issue suggest' },
  { id: 'assist', title: 'Ask the assistant', detail: 'A question about your close, answered from live facts', action: 'assist', words: 'ai help chat question' },
];

export const GROUP_LABELS = { hub: 'Instances, outcomes and alerts', screens: 'Screens', grids: 'Grids', tasks: 'Tasks' };

function score(q, ...fields) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = fields.filter(Boolean).join(' ').toLowerCase();
  if (!words.every((w) => hay.includes(w))) return 0;
  const title = String(fields[0] || '').toLowerCase();
  return title.startsWith(words[0]) ? 3 : title.includes(words[0]) ? 2 : 1;
}

/** Screens, grids and tasks matching the query, best first, a few of each. */
export function localHits(q, { nav = [], specs = [], tasks = TASKS, limit = 4 } = {}) {
  const query = String(q || '').trim();
  if (query.length < 2) return [];
  const screens = nav.flatMap((sec) => sec.items.map((it) => ({ it, grp: sec.grp })))
    .map(({ it, grp }) => ({ s: score(query, it.label, it.short, grp, it.to), hit: { kind: 'screen', id: it.to, title: it.label, detail: grp, route: it.to, icon: it.icon } }))
    .filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.hit);
  const grids = specs
    .map((sp) => ({ s: score(query, sp.title, sp.id, sp.description), hit: { kind: 'grid', id: sp.id, title: sp.title || sp.id, detail: sp.description || sp.id, route: `/grids?spec=${encodeURIComponent(sp.id)}` } }))
    .filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.hit);
  const taskHits = tasks
    .map((t) => ({ s: score(query, t.title, t.detail, t.words), hit: { kind: 'task', id: t.id, title: t.title, detail: t.detail, route: t.route, action: t.action } }))
    .filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.hit);
  return [
    ...(screens.length ? [{ group: 'screens', label: GROUP_LABELS.screens, hits: screens }] : []),
    ...(grids.length ? [{ group: 'grids', label: GROUP_LABELS.grids, hits: grids }] : []),
    ...(taskHits.length ? [{ group: 'tasks', label: GROUP_LABELS.tasks, hits: taskHits }] : []),
  ];
}

/** Hub hits first, then each partner application, then local sources; empty groups dropped, each capped. */
export function mergeGroups(hub = [], partners = [], local = [], cap = 6) {
  const groups = [];
  if (hub.length) groups.push({ group: 'hub', label: GROUP_LABELS.hub, hits: hub.slice(0, cap) });
  for (const p of partners) if (p.hits?.length) groups.push({ group: `p:${p.id}`, label: p.label || p.id, hits: p.hits.slice(0, cap) });
  for (const g of local) if (g.hits?.length) groups.push({ ...g, hits: g.hits.slice(0, cap) });
  return groups;
}

/** A partner's hit is only followed inside the console: routes must be same-origin paths. */
export function safeRoute(route) {
  return typeof route === 'string' && route.startsWith('/') && !route.startsWith('//') ? route : null;
}

/** Ask one partner provider; failures and bad payloads become an empty list, never an error in the search box. */
export async function searchProvider(provider, q, fetchImpl = fetch) {
  try {
    const url = provider.url + (provider.url.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q);
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data?.hits) ? data.hits : [])
      .filter((h) => h && typeof h.title === 'string' && safeRoute(h.route))
      .map((h) => ({ kind: String(h.kind || provider.id), id: String(h.id ?? h.title), title: h.title.slice(0, 120),
        detail: typeof h.detail === 'string' ? h.detail.slice(0, 160) : '', route: h.route }));
  } catch {
    return [];
  }
}
