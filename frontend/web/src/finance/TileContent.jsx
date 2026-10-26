import Chart from '../components/Chart.jsx';
import { CHART } from './transform.js';

const SEVERITY_COLOR = { CRITICAL: '#ef4444', WARN: '#f59e0b', SUCCESS: '#10b981', INFO: '#3b82f6' };
const STATUS_TONE = { success: 'ok', warning: 'warn', error: 'fail', info: 'info' };

function fmt(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(value) >= 1000 ? value.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : String(value);
  }
  return String(value);
}

/** One slide of a tile. Charts use the standard Chart (Wijmo FlexChart / FlexPie); progress, status and grid are plain markup. */
export default function TileContent({ slide, compact = false, full = false }) {
  const height = compact ? 140 : full ? 360 : 210;
  const data = slide?.data || [];
  if (!data.length) return <div className="tile-empty">No data available</div>;

  switch (slide.chartType) {
    case CHART.bar:
    case CHART.line:
    case CHART.area:
      return (
        <Chart data={data} x="name" type={slide.chartType === CHART.bar ? 'column' : slide.chartType}
          series={(slide.series || []).map((s) => ({ key: s.key, name: s.name || s.key, color: s.color }))}
          height={height} legend={compact ? 'None' : 'Bottom'} />
      );
    case CHART.pie: {
      const key = slide.series?.[0]?.key || 'value';
      const colored = data.map((d) => (SEVERITY_COLOR[d.name] ? { ...d, _color: SEVERITY_COLOR[d.name] } : d));
      return <Chart data={colored} x="name" type="donut" series={[{ key }]} height={height} legend={compact ? 'None' : 'Right'} />;
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
