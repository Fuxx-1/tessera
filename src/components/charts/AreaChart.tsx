import "./styles/area.css";
import { useId } from "react";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getChartColor, isSafeChartColor } from "./palette";
import type { CartesianChartProps, ChartDatum, ChartMargin, ChartPoint } from "./types";
import {
  type CartesianSeriesInput,
  createAreaPath,
  createLinePath,
  createLinearScale,
  createLinearTicks,
  createPointScale,
  defaultChartWidth,
  formatDatum,
  formatShortLabel,
  getChartA11yTitle,
  getChartRenderNotice,
  getValueDomain,
  type NormalizedCartesianDatum,
  normalizeDomain,
  normalizeCartesianSeries,
  sanitizeDimension,
  sanitizeMargin,
  clampNumber,
  shouldRenderAxisLabel,
} from "./utils";

const defaultMargin: ChartMargin = { top: 18, right: 18, bottom: 32, left: 42 };
const defaultAreaPointBudget = 160;

type ResolvedAreaSeries = {
  name: string;
  color: string;
  fillOpacity: number;
  data: NormalizedCartesianDatum[];
  points: ChartPoint[];
  areaPath: string;
  linePath: string;
};

export interface AreaChartProps extends CartesianChartProps {
  fillOpacity?: number;
  series?: CartesianSeriesInput[];
  colors?: string[];
  showLegend?: boolean;
}

export function AreaChart({
  className,
  colors,
  data,
  emptyText,
  error,
  fillOpacity = 0.2,
  height = 260,
  loading,
  loadingText,
  margin,
  maxDataPoints,
  notice,
  scale,
  series,
  showGrid = true,
  showLegend = true,
  summary,
  title,
  tone = "clay",
  valueFormatter,
  xLabelMaxLength,
  ...props
}: AreaChartProps) {
  const titleId = useId();
  const descId = useId();
  const gradientId = `area-chart-gradient-${useId().replace(/:/g, "")}`;
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 260);
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, width, safeHeight);
  const chartWidth = Math.max(24, width - resolvedMargin.left - resolvedMargin.right);
  const chartHeight = Math.max(24, safeHeight - resolvedMargin.top - resolvedMargin.bottom);
  const rawSeriesCount = Math.max(series?.length ?? 1, 1);
  const perSeriesBudget = clampAreaPointBudget(maxDataPoints, rawSeriesCount);
  const safeSeries = normalizeCartesianSeries(data, series, perSeriesBudget);
  const sourcePointCount = safeSeries.reduce((sum, item) => sum + item.sourceCount, 0);
  const renderedPointCount = safeSeries.reduce((sum, item) => sum + item.data.length, 0);
  const renderNotice = notice ?? getChartRenderNotice("AreaChart", sourcePointCount, renderedPointCount, "points");
  const axisItems = getAreaAxisItems(safeSeries.flatMap((item) => item.data));
  const labels = axisItems.map((item) => item.label);
  const axisIndexBySourceIndex = new Map(axisItems.map((item, index) => [item.sourceIndex, index]));
  const xScale = createPointScale(labels, [resolvedMargin.left, resolvedMargin.left + chartWidth]);
  const yValues = safeSeries.flatMap((item) => item.data.map((datum) => datum.value));
  const yDomain = normalizeDomain(scale?.yDomain, getValueDomain(yValues, scale?.includeZero ?? true));
  const yScale = createLinearScale(
    yDomain,
    [resolvedMargin.top + chartHeight, resolvedMargin.top],
    scale?.clamp ?? true,
  );
  const safeFillOpacity = clampNumber(fillOpacity, 0, 1);
  const baselineY = yScale(Math.min(Math.max(0, yScale.domain[0]), yScale.domain[1]));
  const resolvedColors = getAreaColors(colors, tone);
  const resolvedSeries: ResolvedAreaSeries[] = safeSeries.map((item, seriesIndex) => {
    const color = getAreaSeriesColor(item.color, resolvedColors, seriesIndex);
    const points = item.data.map((datum) => ({
      x: xScale(datum.label, axisIndexBySourceIndex.get(datum.sourceIndex) ?? 0),
      y: yScale(datum.value),
    }));

    return {
      areaPath: createAreaPath(points, baselineY),
      color,
      data: item.data,
      fillOpacity: clampNumber(item.fillOpacity ?? safeFillOpacity, 0, 1),
      linePath: createLinePath(points),
      name: item.name,
      points,
    };
  });
  const ticks = createLinearTicks(yScale.domain, scale?.tickCount).map((value) => ({ value, y: yScale(value) }));
  const isEmpty = renderedPointCount === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Area chart");
  const seriesSummary =
    resolvedSeries.length > 1 ? `${resolvedSeries.length} series and ${renderedPointCount} plotted points` : `${renderedPointCount} plotted points`;
  const svgSummary =
    summary ??
    `${seriesSummary} with area fills from ${formatDatum(valueFormatter, yScale.domain[0])} to ${formatDatum(valueFormatter, yScale.domain[1])}.`;

  return (
    <ChartFrame
      className={className}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={summary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={hasState || undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <defs>
          {resolvedSeries.map((item, index) => (
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id={`${gradientId}-${index}`}
              key={`${item.name}-${index}`}
              x1="0"
              x2="0"
              y1={resolvedMargin.top}
              y2={resolvedMargin.top + chartHeight}
            >
              <stop offset="0%" stopColor={item.color} stopOpacity="0.92" />
              <stop offset="72%" stopColor={item.color} stopOpacity="0.42" />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.08" />
            </linearGradient>
          ))}
        </defs>
        {showGrid
          ? ticks.map((tick) => (
              <g className="c-chart__grid-line" key={tick.value}>
                <line x1={resolvedMargin.left} x2={width - resolvedMargin.right} y1={tick.y} y2={tick.y} />
                <text x={resolvedMargin.left - 10} y={tick.y + 4}>
                  {formatDatum(valueFormatter, tick.value)}
                </text>
              </g>
            ))
          : null}
        <line className="c-chart__baseline" x1={resolvedMargin.left} x2={width - resolvedMargin.right} y1={baselineY} y2={baselineY} />
        {resolvedSeries.map((item, seriesIndex) => (
          <g className="c-chart__area-series" data-series-name={item.name} key={`${item.name}-${seriesIndex}`}>
            {item.areaPath ? (
              <path
                className="c-chart__area"
                d={item.areaPath}
                style={{ fill: `url(#${gradientId}-${seriesIndex})`, fillOpacity: item.fillOpacity }}
              />
            ) : null}
            {item.linePath ? <path className="c-chart__line c-chart__line--area" d={item.linePath} style={{ stroke: item.color }} /> : null}
            {item.points.map((point, pointIndex) => {
              const datum = item.data[pointIndex];
              return (
                <circle
                  className="c-chart__point c-chart__point--area"
                  cx={point.x}
                  cy={point.y}
                  key={`${item.name}-${datum.sourceIndex}`}
                  r={resolvedSeries.length > 1 ? "3" : "3.5"}
                  style={{ fill: item.color }}
                >
                  <title>{formatAreaTooltip(item.name, datum, valueFormatter, resolvedSeries.length > 1)}</title>
                </circle>
              );
            })}
          </g>
        ))}
        <g className="c-chart__axis-labels">
          {labels.map((label, index) =>
            shouldRenderAxisLabel(index, labels.length) ? (
              <text key={`${label}-${index}`} x={xScale(label, index)} y={safeHeight - 9}>
                <title>{label}</title>
                {formatShortLabel(label, xLabelMaxLength)}
              </text>
            ) : null,
          )}
        </g>
        {showLegend && resolvedSeries.length > 1 ? (
          <g className="c-chart__legend c-chart__legend--area" transform={`translate(${resolvedMargin.left}, ${Math.max(14, resolvedMargin.top - 6)})`}>
            {resolvedSeries.map((item, index) => (
              <g key={`${item.name}-legend`} transform={`translate(${index * 116}, 0)`}>
                <line className="c-chart__legend-line" style={{ stroke: item.color }} x1="0" x2="18" y1="0" y2="0" />
                <text x="24" y="4">
                  <title>{item.name}</title>
                  {formatShortLabel(item.name, 13)}
                </text>
              </g>
            ))}
          </g>
        ) : null}
      </svg>
    </ChartFrame>
  );
}

function clampAreaPointBudget(maxDataPoints: number | undefined, seriesCount: number) {
  const totalBudget = Number.isFinite(maxDataPoints) ? clampNumber(Math.floor(maxDataPoints as number), 1, 2000) : defaultAreaPointBudget;
  return Math.max(1, Math.floor(totalBudget / Math.max(seriesCount, 1)));
}

function getAreaAxisItems(data: NormalizedCartesianDatum[]) {
  const labelBySourceIndex = new Map<number, string>();

  data.forEach((datum) => {
    if (!labelBySourceIndex.has(datum.sourceIndex)) {
      labelBySourceIndex.set(datum.sourceIndex, datum.label);
    }
  });

  return Array.from(labelBySourceIndex.entries())
    .sort(([left], [right]) => left - right)
    .map(([sourceIndex, label]) => ({ label, sourceIndex }));
}

function getAreaColors(colors: string[] | undefined, tone: AreaChartProps["tone"]) {
  const safeColors = (colors ?? []).map((color) => color.trim()).filter(isSafeChartColor);
  if (safeColors.length > 0) return safeColors;

  return [getChartColor(tone), ...chartSeriesColors.filter((color) => color !== getChartColor(tone))];
}

function getAreaSeriesColor(color: string | undefined, colors: string[], index: number) {
  if (isSafeChartColor(color)) return color.trim();

  return colors[index % colors.length] ?? chartSeriesColors[0] ?? "#2c2c2a";
}

function formatAreaTooltip(
  seriesName: string,
  datum: NormalizedCartesianDatum,
  valueFormatter: AreaChartProps["valueFormatter"],
  includeSeriesName: boolean,
) {
  const formattedValue = formatDatum(valueFormatter, datum.value, datum as ChartDatum);
  return includeSeriesName ? `${seriesName} - ${datum.label}: ${formattedValue}` : `${datum.label}: ${formattedValue}`;
}
