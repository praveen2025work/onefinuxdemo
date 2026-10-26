import { useMemo, useState } from 'react';
import Select from '../components/Select.jsx';
import { Stat } from '../components/bits.jsx';
import Chart from '../components/Chart.jsx';
import DataView from '../components/DataView.jsx';
import { CHART, linearForecast } from './transform.js';
import { detailRows } from './TileGrid.jsx';

/** The first time series a tile has (bar / line / area slide), for the trend + projection. */
function seriesOf(tile) {
  const slide = tile?.slides?.find((s) => [CHART.line, CHART.area, CHART.bar].includes(s.chartType) && s.data?.length > 2 && s.series?.length);
  if (!slide) return null;
  const key = slide.series[0].key;
  return { slide, key, label: slide.series[0].name || key, values: slide.data.map((d) => Number(d[key])) };
}

/**
 * STEPS FinanceAnalysis, without the invented insights: summary statistics, the trend with a least-squares
 * projection (advisory, never on the readiness path, not an LLM) and the rows in a Wijmo grid.
 */
export default function FinanceAnalysis({ tiles, selectedId, onSelect }) {
  const tile = tiles.find((t) => t.id === selectedId) || tiles.find((t) => seriesOf(t)) || tiles[0];
  const [ahead, setAhead] = useState(5);
  const s = seriesOf(tile);
  const { rows, columns } = useMemo(() => detailRows(tile), [tile]);

  const stats = useMemo(() => {
    if (!s) return null;
    const vals = s.values.filter(Number.isFinite);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      last: vals[vals.length - 1],
      avg: vals.length ? sum / vals.length : 0,
      min: Math.min(...vals),
      max: Math.max(...vals),
      forecast: linearForecast(vals, ahead),
    };
  }, [s, ahead]);

  const chartData = useMemo(() => {
    if (!s || !stats) return [];
    const hist = s.slide.data.map((d) => ({ name: d.name, actual: Number(d[s.key]), projected: null }));
    if (hist.length) hist[hist.length - 1].projected = hist[hist.length - 1].actual;
    stats.forecast.next.forEach((v, i) => hist.push({ name: `+${i + 1}`, actual: null, projected: v }));
    return hist;
  }, [s, stats]);

  const n = (v) => (Number.isFinite(v) ? v.toLocaleString('en-GB', { maximumFractionDigits: 1 }) : '—');

  return (
    <div className="fin-analysis">
      <div className="panel">
        <div className="panel-hd">
          <h2>Analysis · {tile?.title}</h2>
          <div className="row">
            <Select variant="plain" value={tile?.id} onChange={onSelect} options={tiles.map((t) => ({ value: t.id, label: t.title }))} />
            <Select variant="plain" value={String(ahead)} onChange={(v) => setAhead(Number(v))}
              options={[3, 5, 7, 10].map((k) => ({ value: String(k), label: `Project ${k} steps` }))} />
          </div>
        </div>
        <div className="panel-bd">
          {s && stats ? (
            <>
              <div className="stats">
                <Stat tone="info" icon="trend" label={`Last · ${s.label}`} value={n(stats.last)} />
                <Stat icon="activity" label="Average" value={n(stats.avg)} />
                <Stat icon="down" label="Min" value={n(stats.min)} />
                <Stat icon="trend" label="Max" value={n(stats.max)} />
                <Stat tone={stats.forecast.slope >= 0 ? 'ok' : 'warn'} icon="spark" label="Trend per step" value={n(stats.forecast.slope)}
                  foot="Least-squares, advisory only" />
              </div>
              <Chart data={chartData} x="name" type="line" height={300}
                series={[{ key: 'actual', name: s.label }, { key: 'projected', name: 'Projection', color: '#f59e0b' }]} />
            </>
          ) : <p className="muted">This tile has no time series. Pick P&amp;L Analysis, Liquidity or Risk Metrics for a trend.</p>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-hd"><h2>Rows behind the tile</h2><span className="hint">Wijmo grid · pivot · chart</span></div>
        <div className="panel-bd"><DataView rows={rows} columns={columns} height={300} exportName={`${tile?.id}-analysis`} defaultView="pivot" /></div>
      </div>
    </div>
  );
}
