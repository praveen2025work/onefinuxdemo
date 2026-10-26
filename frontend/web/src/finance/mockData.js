// Demo datasets for the Finance dashboard — the same shapes STEPS serves from /api/finance/*.
// Seeded by COB date so a refresh does not reshuffle the board. A blueprint names these as
// `mock:<dataset>`; point the data source at a real endpoint and the tile keeps working.
// Pure: node --test loads it.

function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** mulberry32: small, fast, deterministic. */
export function seeded(seedText) {
  let a = hash(seedText);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function days(ref, count) {
  const base = ref ? new Date(ref + 'T12:00:00Z') : new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getTime() - (count - 1 - i) * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}` };
  });
}

const r2 = (n) => Math.round(n * 100) / 100;

export const MOCK_DATASETS = {
  'market-data': (ctx) => {
    const rnd = seeded('market' + ctx.cobDate);
    return [
      { feed: 'Market Data', status: 'Available', lastUpdate: '06:45', percentage: 100 },
      { feed: 'Reference Data', status: 'Available', lastUpdate: '06:52', percentage: 100 },
      { feed: 'Trade Data', status: rnd() > 0.2 ? 'Available' : 'Delayed', lastUpdate: '07:10', percentage: 100 },
      { feed: 'Position Data', status: 'Delayed', lastUpdate: '07:31', percentage: 75 },
    ];
  },
  'pnl-daily': (ctx) => {
    const rnd = seeded('pnl' + ctx.cobDate + ctx.region);
    return days(ctx.cobDate, 14).map(({ iso, label }) => {
      const actual = r2(rnd() * 5_000_000 - 1_000_000);
      const expected = r2(2_000_000 + rnd() * 500_000);
      return { date: iso, dateLabel: label, actual, expected, variance: r2(actual - expected) };
    });
  },
  'fx-rates': (ctx) => {
    const rnd = seeded('fx' + ctx.cobDate);
    const base = [
      ['EUR/USD', 1.0923, 92, 80, -15], ['GBP/USD', 1.2654, 78, 60, 10], ['USD/JPY', 110.32, 95, 40, -5],
      ['USD/CHF', 0.9123, 88, 30, 8], ['USD/CAD', 1.3542, 85, 120, 20],
    ];
    return base.map(([currency, rate, hedge, gross, net]) => ({
      currency,
      rate: +(rate * (1 + (rnd() - 0.5) * 0.004)).toFixed(4),
      change: +((rnd() - 0.5) * 0.006).toFixed(4),
      hedgePercent: hedge,
      grossExposure: gross,
      netExposure: net,
    }));
  },
  'risk-metrics': (ctx) => {
    const rnd = seeded('risk' + ctx.cobDate);
    const indicators = [
      { metric: 'VaR', value: 24.5, limit: 25, unit: '$M', status: 'error' },
      { metric: 'Stress Test', value: 42.8, limit: 50, unit: '$M', status: 'warning' },
      { metric: 'Credit Risk', value: 65, limit: 80, unit: '%', status: 'success' },
      { metric: 'Operational Risk', value: 30, limit: 60, unit: '%', status: 'success' },
    ];
    const trend = days(ctx.cobDate, 14).map(({ iso, label }) => ({ date: iso, dateLabel: label, var: +(20 + rnd() * 8).toFixed(1), limit: 25 }));
    return { indicators, trend };
  },
  liquidity: (ctx) => {
    const rnd = seeded('liq' + ctx.cobDate);
    const metrics = [
      { metric: 'LCR', value: 125, threshold: 100, unit: '%', status: 'success' },
      { metric: 'NSFR', value: 110, threshold: 100, unit: '%', status: 'success' },
      { metric: 'Cash Reserves', value: 1.2, threshold: 1.0, unit: '$B', status: 'success' },
      { metric: 'Intraday', value: 95, threshold: 90, unit: '%', status: 'info' },
    ];
    const trend = days(ctx.cobDate, 30).map(({ iso, label }) => ({ date: iso, dateLabel: label, actual: +(100 + rnd() * 30).toFixed(1), threshold: 100 }));
    return { metrics, trend };
  },
  regulatory: () => [
    { report: 'FINREP', deadline: '2026-11-30', status: 'In Progress', completion: 75 },
    { report: 'COREP', deadline: '2026-11-25', status: 'In Progress', completion: 60 },
    { report: 'MiFID II', deadline: '2026-11-20', status: 'Completed', completion: 100 },
    { report: 'Dodd-Frank', deadline: '2026-12-15', status: 'Not Started', completion: 0 },
  ],
};

export function mockDataset(name, ctx = {}) {
  const fn = MOCK_DATASETS[name];
  if (!fn) throw new Error(`Unknown mock dataset "${name}"`);
  return fn(ctx);
}
