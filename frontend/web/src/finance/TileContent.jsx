import { FlexChart, FlexChartAxis, FlexChartLegend, FlexChartSeries, FlexPie, FlexPieDataLabel } from '@mescius/wijmo.react.chart';
import { CHART } from './transform.js';
import '../wijmo.js';

const PIE_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
const SEVERITY_COLOR = { CRITICAL: '#ef4444', WARN: '#f59e0b', SUCCESS: '#10b981', INFO: '#3b82f6' };
const STATUS_TONE = { success: 'ok', warning: 'warn', error: 'fail', info: 'info' };

function fmt(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(value) >= 1000 ? value.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : String(value);
  }
  return String(value);
}

/** One slide of a tile. Charts are Wijmo FlexChart / FlexPie; progress, status and grid are plain markup. */
export default function TileContent({ slide, compact = false, full = false }) {
  const height = compact ? 140 : full ? 360 : 210;
  const data = slide?.data || [];
  if (!data.length) return <div className="tile-empty">No data available</div>;

  switch (slide.chartType) {
    case CHART.bar:
    case CHART.line:
    case CHART.area: {
      const type = slide.chartType === CHART.bar ? 'Column' : slide.chartType === CHART.area ? 'Area' : 'LineSymbols';
      const palette = (slide.series || []).map((s, i) => s.color || PIE_PALETTE[i % PIE_PALETTE.length]);
      return (
        <div className="tile-chart" style={{ height }}>
          <FlexChart itemsSource={data} bindingX="name" chartType={type} palette={palette} legendToggle
            style={{ height }} initialized={(c) => { c.tooltip.content = '<b>{seriesName}</b><br/>{x}: {y:n0}'; }}>
            <FlexChartLegend position={compact ? 'None' : 'Bottom'} />
            <FlexChartAxis wjProperty="axisY" format="n0" majorGrid />
            <FlexChartAxis wjProperty="axisX" labelAngle={data.length > 8 ? -35 : 0} />
            {(slide.series || []).map((s) => <FlexChartSeries key={s.key} binding={s.key} name={s.name || s.key} />)}
          </FlexChart>
        </div>
      );
    }
    case CHART.pie: {
      const key = slide.series?.[0]?.key || 'value';
      const palette = data.map((d, i) => SEVERITY_COLOR[d.name] || PIE_PALETTE[i % PIE_PALETTE.length]);
      return (
        <div className="tile-chart" style={{ height }}>
          <FlexPie itemsSource={data} binding={key} bindingName="name" innerRadius={0.55} palette={palette}
            style={{ height }} initialized={(c) => { c.tooltip.content = '<b>{name}</b>: {value}'; }}>
            <FlexChartLegend position={compact ? 'None' : 'Right'} />
            <FlexPieDataLabel content="{value}" position="Inside" />
          </FlexPie>
        </div>
      );
    }
    case CHART.progress:
      return (
        <div className="tile-progress">
          {data.slice(0, compact ? 4 : 8).map((item, i) => {
            const value = Math.max(0, Math.min(100, Number(item.value) || 0));
            const tone = value < 30 ? 'fail' : value < 70 ? 'warn' : 'ok';
            return (
              <div key={i} className="tp-row">
                <div className="tp-lbl"><span>{item.name ?? `Item ${i + 1}`}</span><b className="mono">{Math.round(Number(item.value) || 0)}%</b></div>
                <div className="tp-bar"><i className={tone} style={{ width: value + '%' }} /></div>
              </div>
            );
          })}
        </div>
      );
    case CHART.status:
      return (
        <div className="tile-status">
          {data.slice(0, compact ? 4 : 8).map((item, i) => (
            <div key={i} className="ts-row">
              <span className="ts-name">{item.name}</span>
              <span className="ts-val mono">{item.value}</span>
              <i className={'ts-dot ' + (STATUS_TONE[item.status] || 'info')} />
            </div>
          ))}
        </div>
      );
    case CHART.grid: {
      const cols = slide.columns?.length ? slide.columns : Object.keys(data[0] || {}).map((k) => ({ key: k, label: k }));
      return (
        <div className="tile-grid">
          <table className="tbl mini">
            <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {data.slice(0, compact ? 3 : full ? 50 : 5).map((row, i) => (
                <tr key={i}>{cols.map((c) => <td key={c.key} className={typeof row[c.key] === 'number' ? 'num mono' : ''}>{fmt(row[c.key])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return <div className="tile-empty">Unsupported chart type</div>;
  }
}
