import { useEffect, useState } from 'react';
import { FlexChart, FlexChartAxis, FlexChartLegend, FlexChartSeries, FlexPie, FlexPieDataLabel } from '@mescius/wijmo.react.chart';
import '../wijmo.js';

const FALLBACK = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
const TYPES = { column: 'Column', bar: 'Bar', line: 'LineSymbols', area: 'Area', scatter: 'Scatter', spline: 'Spline' };

function readPalette() {
  if (typeof document === 'undefined') return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const colors = [1, 2, 3, 4, 5, 6].map((i) => css.getPropertyValue(`--ofx-chart-${i}`).trim()).filter(Boolean);
  return colors.length === 6 ? colors : FALLBACK;
}

/** Chart colours from the design standard (--ofx-chart-1…6); follows a theme change. */
export function useChartPalette() {
  const [palette, setPalette] = useState(readPalette);
  useEffect(() => {
    const on = () => setPalette(readPalette());
    window.addEventListener('ofx-theme', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('ofx-theme', on); window.removeEventListener('storage', on); };
  }, []);
  return palette;
}

/**
 * The standard chart (Wijmo FlexChart / FlexPie). One component for every screen so charts share palette,
 * axis style, legend and tooltip.
 *   data   rows; x = category field; series = [{ key, name, color? }]
 *   type   column | bar | line | area | scatter | spline | pie | donut
 */
export default function Chart({ data = [], x = 'name', series = [], type = 'column', height = 240, legend = 'Bottom',
  format = 'n0', stacked = false, labelAngle }) {
  const palette = useChartPalette();
  if (!data.length) return <div className="tile-empty">No data available</div>;

  if (type === 'pie' || type === 'donut') {
    const key = series[0]?.key || 'value';
    const colors = data.map((d, i) => d._color || palette[i % palette.length]);
    return (
      <div className="chart" style={{ height }}>
        <FlexPie itemsSource={data} binding={key} bindingName={x} innerRadius={type === 'donut' ? 0.55 : 0} palette={colors}
          style={{ height }} initialized={(c) => { c.tooltip.content = '<b>{name}</b>: {value}'; }}>
          <FlexChartLegend position={legend} />
          <FlexPieDataLabel content="{value}" position="Inside" />
        </FlexPie>
      </div>
    );
  }

  const colors = series.map((s, i) => s.color || palette[i % palette.length]);
  return (
    <div className="chart" style={{ height }}>
      <FlexChart itemsSource={data} bindingX={x} chartType={TYPES[type] || 'Column'} palette={colors} legendToggle
        stacking={stacked ? 'Stacked' : 'None'} style={{ height }}
        initialized={(c) => { c.tooltip.content = '<b>{seriesName}</b><br/>{x}: {y:' + format + '}'; }}>
        <FlexChartLegend position={series.length > 1 ? legend : 'None'} />
        <FlexChartAxis wjProperty="axisY" format={format} majorGrid />
        <FlexChartAxis wjProperty="axisX" labelAngle={labelAngle ?? (data.length > 8 ? -35 : 0)} />
        {series.map((s) => <FlexChartSeries key={s.key} binding={s.key} name={s.name || s.key} />)}
      </FlexChart>
    </div>
  );
}
