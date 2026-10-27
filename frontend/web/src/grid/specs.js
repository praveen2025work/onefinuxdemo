// Built-in grid specs: the read-only data One Finance already serves, described as GridSpecs (see spec.js).
// A desk's Grid view, the grid library (/grids), /widget/grid and <ofx-grid> resolve a spec id here first;
// `outcome:<OUTCOME>:<grid>` ids come from the outcome definitions' own `grids`. Pure: node --test loads it.

const SCOPE_PARAMS = [{ name: 'groupUnit', from: 'groupUnit' }, { name: 'cobDate', from: 'cobDate' }, { name: 'region', from: 'region' }];
const ACTION_TONES = { SIGN_OFF: 'ok', COUNTERSIGN: 'ok', POST: 'info', ADJUST: 'warn', ESCALATE: 'fail', OVERRIDE: 'warn', RERUN: 'info' };

export const BUILTIN_SPECS = [
  {
    id: 'instances',
    title: 'Stitch instances',
    description: 'Readiness of every instance in the unit for this COB. A pick shares the instance.',
    source: { endpoint: '/api/stitch/instances', params: SCOPE_PARAMS },
    columns: [
      { key: 'kitId', label: 'Kit', type: 'chip', width: 90 },
      { key: 'sliceKey', label: 'Instance', type: 'mono', width: 100 },
      { key: 'region', label: 'Region', width: 80 },
      { key: 'status', label: 'Status', type: 'status', width: 110 },
      { key: 'completedKeys', label: 'Done', type: 'number', width: 70 },
      { key: 'totalKeys', label: 'Keys', type: 'number', width: 70 },
      { key: 'namedBlocker', label: 'Blocker' },
      { key: 'amount', label: 'Amount', type: 'money', width: 130 },
      { key: 'openEscalations', label: 'Esc.', type: 'number', width: 60 },
    ],
    live: ['outcome', 'kit', 'reset'],
    share: { type: 'ofx.instance', fields: { id: 'instanceId', kitId: 'kitId', region: 'region', status: 'status', name: 'question' } },
    pivot: { rowFields: ['region'], columnFields: ['status'], valueFields: ['amount'] },
    chart: { x: 'status', y: 'amount' },
  },
  {
    id: 'outcomes',
    title: 'Business outcomes',
    description: 'Can I produce it? Every engine outcome for the COB. A pick shares the outcome.',
    source: { endpoint: '/api/outcomes' },
    columns: [
      { key: 'name', label: 'Outcome' },
      { key: 'region', label: 'Region', width: 90 },
      { key: 'cobDate', label: 'COB', type: 'mono', width: 110 },
      { key: 'status', label: 'Status', type: 'status', width: 130 },
      { key: 'percent', label: 'Ready', type: 'percent', width: 80 },
      { key: 'completed', label: 'Done', type: 'number', width: 80 },
      { key: 'expected', label: 'Expected', type: 'number', width: 90 },
      { key: 'ownerGroup', label: 'Owner' },
    ],
    live: ['outcome', 'reset'],
    share: { type: 'ofx.outcome', fields: { outcomeId: 'outcomeId', cobDate: 'cobDate', region: 'region' } },
    chart: { x: 'status', op: 'count' },
  },
  {
    id: 'activity',
    title: 'Activity',
    description: 'Who did what on which outcome: sign-offs, posts, overrides, re-runs, partner actions.',
    source: { endpoint: '/api/activity', params: [{ name: 'limit', value: '200' }] },
    columns: [
      { key: 'at', label: 'When', type: 'datetime', width: 150 },
      { key: 'actor', label: 'Who', width: 130 },
      { key: 'action', label: 'Action', type: 'status', width: 120, tones: ACTION_TONES },
      { key: 'summary', label: 'What', wrap: true },
      { key: 'outcomeId', label: 'Outcome', type: 'chip', width: 130 },
      { key: 'kitId', label: 'Kit', type: 'chip', width: 80 },
    ],
    views: ['grid', 'chart'],
    live: ['activity', 'reset'],
    share: { type: 'ofx.instance', fields: { id: 'instanceId' } },
    chart: { x: 'action', op: 'count' },
  },
  {
    id: 'notifications',
    title: 'Notification inbox',
    description: 'Every notification the hub persisted, newest first.',
    source: { endpoint: '/api/notifications', params: [{ name: 'limit', value: '200' }] },
    columns: [
      { key: 'createdAt', label: 'When', type: 'datetime', width: 150 },
      { key: 'severity', label: 'Severity', type: 'status', width: 100 },
      { key: 'transition', label: 'Transition', type: 'chip', width: 120 },
      { key: 'outcomeName', label: 'Outcome', width: 160 },
      { key: 'title', label: 'Title' },
      { key: 'message', label: 'Message', wrap: true },
    ],
    views: ['grid', 'chart'],
    live: ['notification', 'reset'],
    chart: { x: 'severity', op: 'count' },
  },
  {
    id: 'events',
    title: 'Event tape',
    description: 'Facts as the hub received them.',
    source: { endpoint: '/api/stitch/monitor/events', params: [{ name: 'limit', value: '200' }] },
    columns: [
      { key: 'receivedAt', label: 'Received', type: 'datetime', width: 150 },
      { key: 'sourceSystem', label: 'Source', type: 'chip', width: 100 },
      { key: 'eventType', label: 'Event' },
      { key: 'sourceKey', label: 'Key', type: 'mono', width: 130 },
      { key: 'region', label: 'Region', width: 80 },
      { key: 'status', label: 'Status', type: 'status', width: 110 },
      { key: 'instanceId', label: 'Instance', type: 'mono' },
    ],
    live: ['event', 'reset'],
    share: { type: 'ofx.instance', fields: { id: 'instanceId' } },
    chart: { x: 'sourceSystem', op: 'count' },
  },
  {
    id: 'escalations',
    title: 'Escalations',
    description: 'Open escalations RTB is working.',
    source: { endpoint: '/api/stitch/rtb', rowsPath: 'escalations' },
    columns: [
      { key: 'escalationId', label: 'Escalation', type: 'mono', width: 120 },
      { key: 'sliceKey', label: 'Instance', type: 'mono', width: 100 },
      { key: 'region', label: 'Region', width: 80 },
      { key: 'kind', label: 'Kind', type: 'chip', width: 100 },
      { key: 'status', label: 'Status', type: 'status', width: 100 },
      { key: 'openedAt', label: 'Opened', type: 'datetime', width: 150 },
    ],
    live: ['notification', 'activity', 'reset'],
    share: { type: 'ofx.instance', fields: { id: 'instanceId' } },
  },
  {
    id: 'break-register',
    title: 'Break register',
    description: 'Reconciliation breaks, editable: owner, status, comment and due date. A second person approves before the reconciliation system is changed.',
    source: { endpoint: '/sim/grids/breaks' },
    columns: [
      { key: 'breakId', label: 'Break', type: 'mono', width: 100 },
      { key: 'book', label: 'Book', type: 'chip', width: 80 },
      { key: 'amount', label: 'Amount', type: 'money', width: 130 },
      { key: 'status', label: 'Status', type: 'status', width: 130 },
      { key: 'owner', label: 'Owner', width: 110 },
      { key: 'dueDate', label: 'Due', type: 'mono', width: 110 },
      { key: 'comment', label: 'Comment', wrap: true },
    ],
    edit: {
      key: 'breakId',
      columns: [
        { key: 'owner', maxLength: 40 },
        { key: 'status', options: ['OPEN', 'INVESTIGATING', 'DISPUTED', 'CLEARED'], required: true },
        { key: 'comment', maxLength: 200 },
        { key: 'dueDate', type: 'date' },
      ],
      approval: 'maker-checker',
      target: 'breaks',
    },
    live: ['activity', 'reset'],
    share: { type: 'ofx.break', fields: { id: 'breakId', breakId: 'breakId' } },
    pivot: { rowFields: ['book'], columnFields: ['status'], valueFields: ['amount'] },
    chart: { x: 'status', y: 'amount' },
  },
  {
    id: 'sample-breaks',
    title: 'Sample: breaks (static rows)',
    description: 'A spec with its rows inline — copy it to start your own grid without an endpoint.',
    source: {
      rows: [
        { breakId: 'BK-4410', book: 'MB012', amount: 8420, status: 'Cleared', owner: 'Alex' },
        { breakId: 'BK-4420', book: 'MB014', amount: 12450000, status: 'Open', owner: 'Priya' },
        { breakId: 'BK-4431', book: 'MB014', amount: 310500, status: 'Investigating', owner: 'Alex' },
        { breakId: 'BK-4502', book: 'MB021', amount: 92000, status: 'Disputed', owner: 'Sam' },
      ],
    },
    columns: [
      { key: 'breakId', label: 'Break', type: 'mono', width: 110 },
      { key: 'book', label: 'Book', type: 'chip', width: 90 },
      { key: 'amount', label: 'Amount', type: 'money', width: 140 },
      { key: 'status', label: 'Status', type: 'status', width: 130 },
      { key: 'owner', label: 'Owner' },
    ],
    share: { type: 'ofx.break', fields: { id: 'breakId', breakId: 'breakId' } },
    pivot: { rowFields: ['book'], columnFields: ['status'], valueFields: ['amount'] },
    chart: { x: 'status', y: 'amount' },
  },
];

export function builtinSpec(id) {
  return BUILTIN_SPECS.find((s) => s.id === id) || null;
}

/** An outcome definition's lineage grids as specs: `outcome:<OUTCOME>:<grid>`. Columns come from the response. */
export function outcomeGridSpecs(definitions = []) {
  const out = [];
  for (const def of definitions) {
    if (!def?.id || !Array.isArray(def.grids)) continue;
    for (const g of def.grids) {
      if (!g?.id || !g.endpoint) continue;
      out.push({
        id: `outcome:${def.id}:${g.id}`,
        title: `${def.name || def.id} · ${g.title || g.id}`,
        description: def.question || undefined,
        source: { endpoint: g.endpoint, method: g.method, params: g.params || [] },
        live: ['outcome'],
      });
    }
  }
  return out;
}
