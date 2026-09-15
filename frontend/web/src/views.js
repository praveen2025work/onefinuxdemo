// Opt-in console views. This is a developer/demo convenience, not entitlement.
// CEES still fail-closes unentitled instances. A view only hides nav and Home starts.

export const VIEW_KEY = 'ofx-view';

export const VIEWS = [
  {
    id: 'all',
    label: 'All screens',
    icon: 'grid',
    who: 'Anyone',
    tag: 'opt out',
    cls: 'plain',
    job: 'Every route. Use this when you are learning the whole product or running an exec demo.',
    routes: null,
    starts: [
      { to: '/board', title: 'Outcome board', q: 'Ready, blocked, delayed and escalation counts for the whole unit.', tag: 'Read only', cls: 'plain' },
      { to: '/outcomes', title: 'My outcomes', q: 'Agents already ran. Open the ready output, sign off or post.', tag: 'user', cls: 'ok' },
      { to: '/operations', title: 'Operations console', q: 'Delays, escalations, dead letters and dual-control replay.', tag: 'RTB', cls: 'warn' },
      { to: '/onboarding', title: 'Onboard a kit', q: 'Bind known origins, register the kit as data, set the embed.', tag: 'maker-checker', cls: 'bo' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: 'code',
    who: 'Engineer joining the repo',
    tag: 'start here',
    cls: 'info',
    job: 'Understand the idea, run the three processes, create an outcome as data, watch the tape.',
    routes: ['/', '/product', '/onboarding', '/configuration', '/monitoring', '/drive'],
    starts: [
      { to: '/product?tab=start', title: 'Start here', q: 'Plain-language idea, how to run it, first change, how we review PRs.', tag: 'read', cls: 'info' },
      { to: '/onboarding', title: 'Onboard an outcome', q: 'Your first change is data: question + feeds + SLA + on-ready. No new Java type.', tag: 'create', cls: 'bo' },
      { to: '/configuration', title: 'Inspect the registry', q: 'See the live outcome or kit you just created — anatomy on the right.', tag: 'govern', cls: 'plain' },
      { to: '/drive', title: 'Drive a scenario', q: 'Reset, inject COB facts, then watch Monitoring. Not a product page.', tag: 'testing', cls: 'warn' },
    ],
  },
  {
    id: 'architect',
    label: 'Architect',
    icon: 'compass',
    who: 'Platform / design',
    tag: 'shape',
    cls: 'bo',
    job: 'Two models, group-unit fold, configuration as the registry, monitoring as the tape.',
    routes: ['/', '/product', '/board', '/configuration', '/monitoring'],
    starts: [
      { to: '/product?tab=architecture', title: 'Architecture', q: 'Same diagrams as docs/design — enterprise context through engine stages.', tag: 'diagrams', cls: 'info' },
      { to: '/board', title: 'Outcome board', q: 'What a head actually sees: traffic lights, named blocker, SLA.', tag: 'Read only', cls: 'plain' },
      { to: '/configuration', title: 'Configuration', q: 'The live contract: outcomes, kits, feeds, on-ready, embed.', tag: 'registry', cls: 'bo' },
      { to: '/monitoring', title: 'Monitoring', q: 'Received → persisted → propagated → audited.', tag: 'tape', cls: 'ok' },
    ],
  },
  {
    id: 'controller',
    label: 'Controller',
    icon: 'user',
    who: 'Outcome user',
    tag: 'act',
    cls: 'ok',
    job: 'Worklist, reports, and the unit board. Sign-off lives on the instance, not on Home.',
    routes: ['/', '/product', '/outcomes', '/reports', '/board'],
    starts: [
      { to: '/outcomes', title: 'My outcomes', q: 'Doer worklist. Open a ready instance to sign off or post.', tag: 'user', cls: 'ok' },
      { to: '/reports', title: 'Reports', q: 'Engine outcomes and the 15C3 five-stage pack.', tag: 'artifact', cls: 'info' },
      { to: '/board', title: 'Outcome board', q: 'Same instances as a supervisor table.', tag: 'Read only', cls: 'plain' },
    ],
  },
  {
    id: 'head',
    label: 'BU head',
    icon: 'sun',
    who: 'CIO / MD / BU head',
    tag: 'glance',
    cls: 'plain',
    job: 'Morning traffic lights and report availability. No sign-off, no Drive.',
    routes: ['/', '/product', '/board', '/reports'],
    starts: [
      { to: '/board', title: 'Outcome board', q: 'Ready / blocked / delayed / escalations for the unit.', tag: 'Read only', cls: 'plain' },
      { to: '/reports', title: 'Reports', q: 'Is the 15C3 pack available to view?', tag: 'artifact', cls: 'info' },
    ],
  },
  {
    id: 'rtb',
    label: 'RTB',
    icon: 'headset',
    who: 'Run the bank',
    tag: 'ops',
    cls: 'warn',
    job: 'Escalations, dead letters, dual-control replay, and the event tape.',
    routes: ['/', '/product', '/operations', '/monitoring', '/drive'],
    starts: [
      { to: '/operations', title: 'Operations', q: 'Escalations, watermarks, dead letters, dual-control replay.', tag: 'RTB', cls: 'warn' },
      { to: '/monitoring', title: 'Monitoring', q: 'Outbox, audit, received events.', tag: 'tape', cls: 'ok' },
      { to: '/drive', title: 'Drive (testing)', q: 'Reproduce a delay or a failed key. Product pages stay view-only.', tag: 'testing', cls: 'plain' },
    ],
  },
  {
    id: 'maker',
    label: 'Maker',
    icon: 'wrench',
    who: 'Config / onboarding',
    tag: 'create',
    cls: 'bo',
    job: 'Create an outcome, inspect it, then drive a COB to prove the fold.',
    routes: ['/', '/product', '/onboarding', '/configuration', '/drive'],
    starts: [
      { to: '/onboarding', title: 'Onboarding', q: 'Write the question, feeds, SLA and on-ready. Submit is POST /api/outcomes/definitions.', tag: 'create', cls: 'bo' },
      { to: '/configuration', title: 'Configuration', q: 'Govern what you created. Not a second create form.', tag: 'govern', cls: 'plain' },
      { to: '/drive', title: 'Drive a scenario', q: 'Prove the new outcome folds when facts arrive.', tag: 'testing', cls: 'warn' },
    ],
  },
];

export function viewById(id) {
  return VIEWS.find((v) => v.id === id) || VIEWS[0];
}

export function readStoredView() {
  try { return viewById(localStorage.getItem(VIEW_KEY)).id; } catch { return 'all'; }
}

export function persistView(id) {
  const next = viewById(id).id;
  try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
  return next;
}

export function pathAllowed(view, pathname) {
  if (!view.routes) return true;
  if (pathname.startsWith('/instance/')) return true;
  return view.routes.includes(pathname);
}

export function filterNav(nav, view) {
  if (!view.routes) return nav;
  return nav
    .map((section) => ({ ...section, items: section.items.filter((it) => view.routes.includes(it.to)) }))
    .filter((section) => section.items.length);
}

export function viewIncludes(view, route) {
  if (!view.routes) return true;
  return view.routes.includes(route);
}
