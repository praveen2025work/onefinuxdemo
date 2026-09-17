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
