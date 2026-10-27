/** Shared OutcomeDefinition form mapping for Onboarding (create) and Configuration (edit). */

export const BLANK_FEED = { label: '', eventType: '', sourceSystem: '', expectedCount: 1 };
export const BLANK_PARAM = { name: '', from: 'cobDate', value: '' };
export const BLANK_GRID = {
  id: '',
  title: '',
  endpoint: '/sim/grids/',
  method: 'GET',
  params: [{ ...BLANK_PARAM, name: 'cobDate' }],
};

export const GRID_FROM = [
  'cobDate', 'region', 'groupUnitId', 'kitId', 'instanceId', 'sliceKey',
  'account', 'journalId', 'amount', 'fsLine', 'runId', 'status', 'namedBlocker',
];

export const EXAMPLE = {
  id: 'MEC_CLOSE',
  name: 'Month-end close',
  question: 'Can I close the books?',
  ownerGroup: 'Financial Control',
  regions: 'GLOBAL',
  slaMode: 'within',
  withinMinutes: 5,
  cutoff: '07:30',
  dayOffset: 1,
  feeds: [
    { label: 'SAP journals', eventType: 'SAP_JOURNAL_POSTED', sourceSystem: 'SAP', expectedCount: 12 },
    { label: 'Cost-centre sign-off', eventType: 'COSTCENTRE_SIGNED', sourceSystem: 'SAP', expectedCount: 8 },
  ],
  actionMode: 'notify',
  target: '',
  completionEvent: '',
  actionLabel: '',
  grids: [],
};

export function definitionToForm(o) {
  const sla = o.sla || {};
  const command = o.onReady && o.onReady.action && o.onReady.action !== 'NOTIFY_ONLY';
  return {
    id: o.id || '',
    name: o.name || '',
    question: o.question || '',
    ownerGroup: o.ownerGroup || '',
    regions: (o.regions || []).join(', '),
    slaMode: sla.withinMinutes ? 'within' : 'cutoff',
    withinMinutes: sla.withinMinutes || 5,
    cutoff: sla.cutoff || '07:30',
    dayOffset: sla.dayOffset || 0,
    feeds: (o.dependencies || []).length
      ? o.dependencies.map((d) => ({
        label: d.label || '',
        eventType: d.eventType || '',
        sourceSystem: d.sourceSystem || '',
        expectedCount: d.expectedCount || 1,
      }))
      : [{ ...BLANK_FEED }],
    actionMode: command ? 'command' : 'notify',
    target: o.onReady?.target || '',
    completionEvent: o.onReady?.completionEvent || '',
    actionLabel: o.onReady?.actionLabel || '',
    grids: (o.grids || []).map((g) => ({
      id: g.id || '',
      title: g.title || '',
      endpoint: g.endpoint || '',
      method: g.method || 'GET',
      params: (g.params || []).length
        ? g.params.map((p) => ({ name: p.name || '', from: p.from || '', value: p.value || '' }))
        : [{ ...BLANK_PARAM }],
    })),
  };
}

export function formToDefinition(form) {
  const grids = (form.grids || [])
    .filter((g) => g.id.trim() && g.endpoint.trim())
    .map((g) => ({
      id: g.id.trim(),
      title: g.title.trim() || g.id.trim(),
      endpoint: g.endpoint.trim(),
      method: (g.method || 'GET').trim().toUpperCase(),
      params: (g.params || [])
        .filter((p) => p.name.trim())
        .map((p) => {
          const row = { name: p.name.trim() };
          if (p.value && String(p.value).trim()) row.value = String(p.value).trim();
          else if (p.from && String(p.from).trim()) row.from = String(p.from).trim();
          return row;
        }),
    }));
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    question: form.question.trim(),
    ownerGroup: form.ownerGroup.trim() || 'Unassigned',
    regions: form.regions.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean),
    sla: form.slaMode === 'within'
      ? { withinMinutes: Number(form.withinMinutes) || 5 }
      : { cutoff: form.cutoff, dayOffset: Number(form.dayOffset) || 0 },
    dependencies: form.feeds
      .filter((fd) => fd.eventType.trim())
      .map((fd) => ({
        label: fd.label.trim() || fd.eventType.trim(),
        eventType: fd.eventType.trim().toUpperCase(),
        sourceSystem: fd.sourceSystem.trim().toUpperCase() || null,
        expectedCount: Number(fd.expectedCount) || 1,
      })),
    onReady: form.actionMode === 'command'
      ? {
        action: 'HTTP_COMMAND',
        target: form.target.trim(),
        completionEvent: form.completionEvent.trim().toUpperCase(),
        actionLabel: form.actionLabel.trim() || 'Downstream action',
      }
      : null,
    grids,
  };
}

/**
 * The steps a config user walks through, in order, to make an outcome work for their use case. Onboarding (create)
 * and Configuration (edit) share them, so both screens read 1 → 6 the same way.
 */
export const OUTCOME_STEPS = [
  { id: 'outcome', label: 'Outcome', title: 'Name the outcome and its question', hint: 'Who owns it, which regions see it, and the business question it answers.' },
  { id: 'feeds', label: 'Input feeds', title: 'List the feeds it depends on', hint: 'Each feed is an event type from a source system and how many keys must arrive. READY means every feed is complete.' },
  { id: 'sla', label: 'SLA', title: 'Say when it is due', hint: 'A window from the first event, or a business cut-off on the COB date plus N days. Late instances turn amber, then breach.' },
  { id: 'ready', label: 'When ready', title: 'Choose what happens when every feed is in', hint: 'Notify only, or have the hub command a downstream engine and wait for its completion event.' },
  { id: 'grids', label: 'Grids', title: 'Add lineage grids (optional)', hint: 'Endpoints the console reads for the instance and report Grid view. Parameters bind to the business date, region and row.' },
  { id: 'review', label: 'Review', title: 'Check the contract and go live', hint: 'This is the definition that is saved. Nothing is live until you press the button.' },
];

const ID_RE = /^[A-Z][A-Z0-9_]*$/;
const CUTOFF_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What blocks moving past a step, in words a config user can act on. An empty list means the step is complete. */
export function stepErrors(form, stepId) {
  const errs = [];
  if (stepId === 'outcome') {
    if (!ID_RE.test((form.id || '').trim())) errs.push('Outcome id: capitals, digits and _ only, starting with a letter (e.g. MEC_CLOSE).');
    if (!(form.name || '').trim()) errs.push('Name the outcome.');
    if (!(form.question || '').trim()) errs.push('Write the business question it answers.');
  } else if (stepId === 'feeds') {
    const feeds = (form.feeds || []).filter((fd) => (fd.eventType || '').trim());
    if (!feeds.length) errs.push('Add at least one input feed with an event type.');
    if (feeds.some((fd) => !(Number(fd.expectedCount) >= 1))) errs.push('Each feed expects at least 1 key.');
    const types = feeds.map((fd) => fd.eventType.trim().toUpperCase());
    if (new Set(types).size !== types.length) errs.push('Each event type appears once.');
  } else if (stepId === 'sla') {
    if (form.slaMode === 'within' && !(Number(form.withinMinutes) >= 1)) errs.push('The window is at least 1 minute.');
    if (form.slaMode === 'cutoff' && !CUTOFF_RE.test(String(form.cutoff || ''))) errs.push('The cut-off is a time as HH:MM.');
    if (form.slaMode === 'cutoff' && !(Number(form.dayOffset) >= 0)) errs.push('Days after COB is 0 or more.');
  } else if (stepId === 'ready') {
    if (form.actionMode === 'command' && !(form.target || '').trim()) errs.push('Name the engine to command (target).');
    if (form.actionMode === 'command' && !(form.completionEvent || '').trim()) errs.push('Name the event the engine sends when it is done.');
  } else if (stepId === 'grids') {
    (form.grids || []).forEach((g, i) => {
      const started = (g.id || '').trim() || (g.title || '').trim();
      if (started && !(g.id || '').trim()) errs.push(`Grid ${i + 1}: give it an id.`);
      if (started && !(g.endpoint || '').trim()) errs.push(`Grid ${i + 1}: give it an endpoint.`);
    });
  } else if (stepId === 'review') {
    OUTCOME_STEPS.filter((s) => s.id !== 'review').forEach((s) => stepErrors(form, s.id).forEach((e) => errs.push(e)));
  }
  return errs;
}

/** The first step that still has errors (or the review step), where a wizard opens or jumps back to. */
export function firstIncompleteStep(form) {
  const i = OUTCOME_STEPS.findIndex((s) => s.id !== 'review' && stepErrors(form, s.id).length);
  return i < 0 ? OUTCOME_STEPS.length - 1 : i;
}
