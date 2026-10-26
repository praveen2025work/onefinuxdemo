// Finance dashboard blueprint — the STEPS idea (lib/blueprints/finance-blueprint.ts): a dashboard is data.
// dataSources say where rows come from; tiles map rows to slides; tabs group tiles. A new desk copies this
// file and changes the data — no new components.
//
// endpoint:
//   '/api/...'   a hub endpoint (live: true → refetched when the hub pushes outcome / event / notification)
//   'mock:<id>'  a seeded demo dataset (finance/mockData.js) standing in for a finance system not yet bound
// params may use {{groupUnit}} {{cobDate}} {{region}}; computed adds derived fields (pct:a/b).

import { CHART } from './transform.js';

export const financeBlueprint = {
  id: 'finance',
  name: 'Finance dashboard',
  description: 'Live outcome readiness next to P&L, liquidity, risk and regulatory tiles.',

  dataSources: [
    { id: 'instances', name: 'Stitch instances', endpoint: '/api/stitch/instances', live: true,
      params: { groupUnit: '{{groupUnit}}', cobDate: '{{cobDate}}', region: '{{region}}' },
      computed: { completionPct: 'pct:completedKeys/totalKeys' } },
    { id: 'engine', name: 'Engine outcomes', endpoint: '/api/outcomes', live: true },
    { id: 'inbox', name: 'Notification inbox', endpoint: '/api/notifications', params: { limit: '100' }, live: true },
    { id: 'market-data', name: 'Market Data', endpoint: 'mock:market-data' },
    { id: 'pnl-daily', name: 'Daily P&L', endpoint: 'mock:pnl-daily' },
    { id: 'fx-rates', name: 'FX Rates', endpoint: 'mock:fx-rates' },
    { id: 'risk-metrics', name: 'Risk Metrics', endpoint: 'mock:risk-metrics' },
    { id: 'liquidity', name: 'Liquidity', endpoint: 'mock:liquidity' },
    { id: 'regulatory', name: 'Regulatory Reporting', endpoint: 'mock:regulatory' },
  ],

  tiles: [
    /* ── One Finance live tiles (hub data, refreshed on every push) ─────────────────────── */
    {
      id: 'outcome-readiness', group: 'live', title: 'Outcome readiness', description: 'Stitch instances for this unit, COB and region',
      dataSourceId: 'instances',
      statusRule: { field: 'status', errorWhen: 'someEqual:BLOCKED', warningWhen: 'someEqual:NOT_YET', alertWhen: 'someEqual:BLOCKED', default: 'success' },
      slides: [
        { id: 'readiness-status', chartType: CHART.status, source: 'One Finance hub · /api/stitch/instances',
          mapping: { nameField: 'sliceKey', series: [{ field: 'status' }], rowTransform: { status: 'READY=>success|CLEARED=>success|SIGNED=>success|BLOCKED=>error|*=>warning' } } },
        { id: 'readiness-progress', chartType: CHART.progress, source: 'Keys complete per instance',
          mapping: { nameField: 'sliceKey', series: [{ field: 'completionPct' }] } },
        { id: 'readiness-grid', chartType: CHART.grid, source: 'One Finance hub',
          columns: [{ key: 'kitId', label: 'Kit' }, { key: 'sliceKey', label: 'Instance' }, { key: 'region', label: 'Region' },
            { key: 'status', label: 'Status' }, { key: 'namedBlocker', label: 'Blocker' }, { key: 'amount', label: 'Amount' }],
          mapping: { nameField: 'sliceKey', series: [] } },
      ],
    },
    {
      id: 'report-readiness', group: 'live', title: 'Report readiness', description: 'Can I produce it? Engine outcomes for today',
      dataSourceId: 'engine',
      statusRule: { field: 'status', errorWhen: 'someEqual:BLOCKED', successWhen: 'allEqual:COMPLETED', default: 'info' },
      slides: [
        { id: 'report-progress', chartType: CHART.progress, source: 'Outcome engine · /api/outcomes',
          mapping: { nameField: 'name', series: [{ field: 'percent' }] } },
        { id: 'report-status', chartType: CHART.status, source: 'Outcome engine',
          mapping: { nameField: 'name', series: [{ field: 'status' }], rowTransform: { status: 'COMPLETED=>success|READY=>success|BLOCKED=>error|*=>info' } } },
        { id: 'report-grid', chartType: CHART.grid, source: 'Outcome engine',
          columns: [{ key: 'name', label: 'Outcome' }, { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' },
            { key: 'completed', label: 'Done' }, { key: 'expected', label: 'Expected' }, { key: 'percent', label: '%' }],
          mapping: { nameField: 'name', series: [] } },
      ],
    },
    {
      id: 'alerts', group: 'live', title: 'Alerts by severity', description: 'Notification inbox, pushed over the WebSocket',
      dataSourceId: 'inbox',
      statusRule: { field: 'severity', errorWhen: 'someEqual:CRITICAL', warningWhen: 'someEqual:WARN', default: 'success' },
      slides: [
        { id: 'alerts-pie', chartType: CHART.pie, source: 'One Finance hub · /api/notifications',
          mapping: { nameField: 'severity', aggregate: 'count', series: [{ field: 'value', label: 'Notifications' }] } },
        { id: 'alerts-transition', chartType: CHART.bar, source: 'By transition',
          mapping: { nameField: 'transition', aggregate: 'count', series: [{ field: 'value', label: 'Count', color: '#6366f1' }] } },
        { id: 'alerts-grid', chartType: CHART.grid, source: 'Latest notifications',
          columns: [{ key: 'severity', label: 'Severity' }, { key: 'title', label: 'Title' }, { key: 'outcomeName', label: 'Outcome' }, { key: 'createdAt', label: 'At' }],
          mapping: { nameField: 'title', series: [], rowLimit: 8 } },
      ],
    },

    /* ── STEPS finance tiles (seeded demo data until the finance systems are bound) ───────── */
    {
      id: 'data-availability', title: 'Data Availability', description: 'Status of critical data feeds',
      dataSourceId: 'market-data',
      statusRule: { field: 'status', warningWhen: 'someNotEqual:Available', default: 'success' },
      slides: [
        { id: 'data-availability-status', chartType: CHART.status,
          mapping: { nameField: 'feed', series: [{ field: 'status' }], rowTransform: { status: 'Available=>success|*=>warning' } } },
        { id: 'data-availability-grid', chartType: CHART.grid,
          columns: [{ key: 'feed', label: 'Feed' }, { key: 'lastUpdate', label: 'Last Update' }, { key: 'status', label: 'Status' }],
          mapping: { nameField: 'feed', series: [], rowTransform: { status: 'Available=>Complete|*=>Pending' } } },
      ],
    },
    {
      id: 'fobo-review', title: 'FOBO Review', description: 'Front Office / Back Office reconciliation',
      dataSourceId: 'pnl-daily',
      statusRule: { field: 'variance', warningWhen: 'always', alertWhen: 'always', default: 'warning' },
      slides: [
        { id: 'fobo-bar', chartType: CHART.bar, source: 'FOBO Reconciliation System',
          mapping: { nameField: 'dateLabel', rowLimit: -7, series: [
            { field: 'actual', label: 'Actual', color: '#0369a1' }, { field: 'expected', label: 'Expected', color: '#0891b2' }] } },
        { id: 'fobo-breaks', chartType: CHART.grid, source: 'FOBO Reconciliation System',
          columns: [{ key: 'id', label: 'ID' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }],
          staticData: [
            { id: 'BRK001', description: 'Trade Mismatch', amount: 45230, status: 'Open' },
            { id: 'BRK002', description: 'Missing Allocation', amount: 12500, status: 'Open' },
            { id: 'BRK003', description: 'Price Variance', amount: 8750, status: 'Investigating' },
          ],
          mapping: { nameField: 'id', series: [] } },
      ],
    },
    {
      id: 'pnl-analysis', title: 'P&L Analysis', description: 'Daily profit and loss breakdown',
      dataSourceId: 'pnl-daily',
      statusRule: { field: 'variance', successWhen: 'lastGte:0', warningWhen: 'lastLt:0', default: 'success' },
      slides: [
        { id: 'pnl-line', chartType: CHART.line, source: 'Finance Data Warehouse',
          mapping: { nameField: 'dateLabel', series: [
            { field: 'actual', label: 'Daily P&L', color: '#059669' }, { field: 'expected', label: 'Expected', color: '#0d9488' }] } },
        { id: 'pnl-breakdown', chartType: CHART.pie, source: 'Finance Data Warehouse',
          mapping: { nameField: '_derived_bucket', series: [{ field: 'value' }] } },
      ],
    },
    {
      id: 'fx-exposure', title: 'FX Exposure', description: 'Currency exposure and hedging status',
      dataSourceId: 'fx-rates',
      statusRule: { field: 'hedgePercent', default: 'info' },
      slides: [
        { id: 'fx-exposure-bar', chartType: CHART.bar, source: 'Risk Management System',
          mapping: { nameField: 'currency', series: [
            { field: 'grossExposure', label: 'Gross Exposure', color: '#6366f1' }, { field: 'netExposure', label: 'Net Exposure', color: '#8b5cf6' }] } },
        { id: 'fx-hedging', chartType: CHART.progress, source: 'Risk Management System',
          mapping: { nameField: 'currency', series: [{ field: 'hedgePercent' }] } },
      ],
    },
    {
      id: 'liquidity-status', title: 'Liquidity Status', description: 'Current liquidity metrics and thresholds',
      dataSourceId: 'liquidity',
      statusRule: { field: 'status', default: 'success' },
      slides: [
        { id: 'liquidity-metrics', chartType: CHART.status, dataKey: 'metrics', mapping: { nameField: 'metric', series: [{ field: 'value' }] } },
        { id: 'liquidity-trend', chartType: CHART.area, source: 'Treasury Management System', dataKey: 'trend',
          mapping: { nameField: 'dateLabel', series: [
            { field: 'actual', label: 'Actual', color: '#0ea5e9' }, { field: 'threshold', label: 'Threshold', color: '#f59e0b' }] } },
      ],
    },
    {
      id: 'regulatory-reporting', title: 'Regulatory Reporting', description: 'Status of regulatory reporting requirements',
      dataSourceId: 'regulatory',
      statusRule: { field: 'status', warningWhen: 'someEqual:Not Started', default: 'success' },
      slides: [
        { id: 'regulatory-grid', chartType: CHART.grid, source: 'Regulatory Reporting System',
          columns: [{ key: 'report', label: 'Report' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }, { key: 'completion', label: 'Completion' }],
          mapping: { nameField: 'report', series: [] } },
        { id: 'regulatory-progress', chartType: CHART.progress, source: 'Regulatory Reporting System',
          mapping: { nameField: 'report', series: [{ field: 'completion' }] } },
      ],
    },
    {
      id: 'risk-metrics', title: 'Risk Metrics', description: 'Key risk indicators and limits',
      dataSourceId: 'risk-metrics',
      statusRule: { field: 'status', errorWhen: 'someEqual:error', warningWhen: 'someEqual:warning', alertWhen: 'someEqual:error', default: 'success' },
      slides: [
        { id: 'risk-indicators', chartType: CHART.status, dataKey: 'indicators', mapping: { nameField: 'metric', series: [{ field: 'value' }] } },
        { id: 'risk-trend', chartType: CHART.line, source: 'Risk Management System', dataKey: 'trend',
          mapping: { nameField: 'dateLabel', series: [{ field: 'var', label: 'VaR', color: '#ef4444' }, { field: 'limit', label: 'Limit', color: '#f59e0b' }] } },
      ],
    },
    {
      id: 'settlement-status', title: 'Settlement Status', description: 'Daily settlement activity and exceptions',
      dataSourceId: 'market-data',
      statusRule: { field: 'status', default: 'info' },
      slides: [
        { id: 'settlement-pie', chartType: CHART.pie, source: 'Settlement System',
          staticData: [{ name: 'Settled', value: 85 }, { name: 'Pending', value: 10 }, { name: 'Failed', value: 5 }],
          mapping: { nameField: 'name', series: [{ field: 'value' }] } },
        { id: 'settlement-exceptions', chartType: CHART.grid, source: 'Settlement System',
          columns: [{ key: 'id', label: 'ID' }, { key: 'counterparty', label: 'Counterparty' }, { key: 'amount', label: 'Amount' }, { key: 'reason', label: 'Reason' }],
          staticData: [
            { id: 'STL001', counterparty: 'Bank A', amount: 1250000, reason: 'SSI Mismatch' },
            { id: 'STL002', counterparty: 'Fund B', amount: 750000, reason: 'Missing Confirmation' },
            { id: 'STL003', counterparty: 'Bank C', amount: 2100000, reason: 'Funding Delay' },
          ],
          mapping: { nameField: 'id', series: [] } },
      ],
    },
    {
      id: 'collateral-management', title: 'Collateral Management', description: 'Collateral positions and margin calls',
      dataSourceId: 'fx-rates',
      statusRule: { field: 'hedgePercent', default: 'warning' },
      slides: [
        { id: 'collateral-bar', chartType: CHART.bar, source: 'Collateral Management System',
          staticData: [
            { name: 'Cash', posted: 150, received: 120 }, { name: 'Govt Bonds', posted: 80, received: 95 },
            { name: 'Corporate Bonds', posted: 45, received: 30 }, { name: 'Equities', posted: 25, received: 15 },
          ],
          mapping: { nameField: 'name', series: [{ field: 'posted', label: 'Posted', color: '#0ea5e9' }, { field: 'received', label: 'Received', color: '#8b5cf6' }] } },
        { id: 'margin-calls', chartType: CHART.grid, source: 'Collateral Management System',
          columns: [{ key: 'counterparty', label: 'Counterparty' }, { key: 'callAmount', label: 'Call Amount' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }],
          staticData: [
            { counterparty: 'Bank X', callAmount: 3500000, deadline: '10:30', status: 'Pending' },
            { counterparty: 'Hedge Fund Y', callAmount: 1200000, deadline: '11:00', status: 'Disputed' },
            { counterparty: 'Bank Z', callAmount: 2800000, deadline: '14:00', status: 'Confirmed' },
          ],
          mapping: { nameField: 'counterparty', series: [] } },
      ],
    },
  ],

  tabs: [
    { id: 'overview', label: 'Overview', tileIds: 'all' },
    { id: 'live', label: 'Live readiness', tileIds: { group: 'live' } },
    { id: 'analysis', label: 'Analysis', tileIds: 'all' },
    { id: 'risk', label: 'Risk Metrics', tileIds: ['risk-metrics', 'fx-exposure', 'collateral-management'] },
    { id: 'compliance', label: 'Compliance', tileIds: ['regulatory-reporting', 'settlement-status', 'alerts'] },
  ],

  defaults: { columns: 3, viewMode: 'tile', refreshInterval: 60_000 },
};
