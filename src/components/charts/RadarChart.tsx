import { useId } from "react";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "../../utils/performance";
import "./styles/radar.css";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors, isSafeChartColor } from "./palette";
import type { ChartBaseProps, RadarChartAxis, RadarChartSeries } from "./types";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  formatShortLabel,
  getChartA11yTitle,
  normalizeChartLabel,
  polarToCartesian,
  sanitizeDimension,
  sanitizeNumber,
} from "./utils";

const maxAxes = 12;
const gridRingCount = 4;
const radarStartAngle = 0;

type RadarAxis = {
  key: string;
  label: string;
  max: number;
};

type RadarPoint = {
  x: number;
  y: number;
  value: number;
  axis: RadarAxis;
};

type ResolvedRadarSeries = {
  name: string;
  fill: string;
  stroke: string;
  points: RadarPoint[];
  values: number[];
};

export interface RadarChartProps extends Omit<ChartBaseProps, "data"> {
  axes?: RadarChartAxis[];
  categories?: string[];
  series: RadarChartSeries[];
  height?: number;
  axisLabelMaxLength?: number;
  legendMaxItems?: number;
  maxSeries?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  gridLevels?: number;
  showGridLabels?: boolean;
}

function getRadarAngle(axisIndex: number, axisCount: number) {
  return radarStartAngle + (axisIndex / axisCount) * 360;
}

function normalizeAxes(axes: RadarChartAxis[] | undefined, categories: string[] | undefined): RadarAxis[] {
  const rawAxes =
    axes && axes.length > 0
      ? axes.map((axis, index) => ({
          key: normalizeChartLabel(axis.key || axis.label, `axis-${index + 1}`),
          label: normalizeChartLabel(axis.label || axis.key, `Axis ${index + 1}`),
          max: Math.max(1, sanitizeNumber(axis.max ?? 100, 100)),
        }))
      : (categories ?? []).map((category, index) => ({
          key: normalizeChartLabel(category, `axis-${index + 1}`),
          label: normalizeChartLabel(category, `Axis ${index + 1}`),
          max: 100,
        }));

  const seen = new Map<string, number>();

  return rawAxes.slice(0, maxAxes).map((axis, index) => {
    const seenCount = seen.get(axis.key) ?? 0;
    seen.set(axis.key, seenCount + 1);

    return {
      ...axis,
      key: seenCount > 0 ? `${axis.key}-${seenCount + 1}` : axis.key,
      label: axis.label || `Axis ${index + 1}`,
    };
  });
}

function readSeriesValue(values: RadarChartSeries["values"], axis: RadarAxis, index: number) {
  if (Array.isArray(values)) {
    return values[index];
  }

  return values[axis.key] ?? values[axis.label];
}

function createPolygonPath(points: RadarPoint[]) {
  if (points.length < 3) {
    return "";
  }

  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
}

function createPolylinePath(points: RadarPoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function resolveSeries(
  series: RadarChartSeries[],
  axes: RadarAxis[],
  centerX: number,
  centerY: number,
  radius: number,
  colors: string[],
): ResolvedRadarSeries[] {
  return series
    .map((item, seriesIndex) => {
      const itemStroke = item.stroke;
      const itemFill = item.fill;
      const stroke =
        typeof itemStroke === "string" && isSafeChartColor(itemStroke)
          ? itemStroke
          : (colors[seriesIndex % colors.length] ?? chartSeriesColors[0] ?? "#6b7280");
      const fill = typeof itemFill === "string" && isSafeChartColor(itemFill) ? itemFill : stroke;
      const points = axes.map((axis, axisIndex) => {
        const angle = getRadarAngle(axisIndex, axes.length);
        const value = clampNumber(sanitizeNumber(readSeriesValue(item.values, axis, axisIndex), 0), 0, axis.max);
        const point = polarToCartesian(centerX, centerY, radius * (value / axis.max), angle);

        return {
          ...point,
          axis,
          value,
        };
      });

      return {
        name: normalizeChartLabel(item.name, `Series ${seriesIndex + 1}`),
        fill,
        stroke,
        points,
        values: points.map((point) => point.value),
      };
    })
    .filter((item) => item.points.length >= 3 && item.values.some((value) => value > 0));
}

function createSummary(series: ResolvedRadarSeries[], valueFormatter: RadarChartProps["valueFormatter"]) {
  if (series.length === 0) {
    return "No radar series to display.";
  }

  return series
    .map((item) => {
      const firstPoint = item.points[0];
      if (!firstPoint) {
        return `${item.name} has no radar points.`;
      }
      const strongest = item.points.reduce((current, point) => (point.value > current.value ? point : current), firstPoint);
      return `${item.name} is strongest on ${strongest.axis.label} at ${formatDatum(valueFormatter, strongest.value)}.`;
    })
    .join(" ");
}

function getAxisLabelAnchor(pointX: number, centerX: number) {
  const deltaX = pointX - centerX;
  if (Math.abs(deltaX) < 8) {
    return "middle";
  }

  return deltaX > 0 ? "start" : "end";
}

export function RadarChart({
  axes,
  axisLabelMaxLength = 14,
  categories,
  className,
  emptyText,
  error,
  gridLevels = gridRingCount,
  height = 300,
  legendMaxItems = 6,
  loading,
  loadingText,
  maxSeries = UI_RENDER_BUDGETS.chartRadarSeries,
  notice,
  series = [],
  showGrid = true,
  showGridLabels = true,
  showLabels = true,
  showLegend = true,
  showTooltip = true,
  summary,
  title,
  valueFormatter,
  ...props
}: RadarChartProps) {
  const titleId = useId();
  const descId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 300, 220);
  const resolvedAxes = normalizeAxes(axes, categories);
  const safeMaxSeries = clampRenderLimit(maxSeries, UI_RENDER_BUDGETS.chartRadarSeries, 1, UI_RENDER_BUDGETS.chartRadarSeries);
  const visibleSeries = series.slice(0, safeMaxSeries);
  const hasLegend = showLegend && visibleSeries.length > 0;
  const centerX = hasLegend ? 236 : width / 2;
  const centerY = safeHeight / 2;
  const labelReserve = showLabels ? 54 : 20;
  const radius = Math.max(40, Math.min(centerX - labelReserve, safeHeight / 2 - labelReserve, hasLegend ? 152 : 178));
  const safeColors = getSafeChartColors(chartSeriesColors, chartSeriesColors);
  const safeSeries = resolvedAxes.length >= 3 ? resolveSeries(visibleSeries, resolvedAxes, centerX, centerY, radius, safeColors) : [];
  const levels = Math.max(2, Math.min(Math.round(sanitizeNumber(gridLevels, gridRingCount)), 6));
  const legendItems = hasLegend ? safeSeries.slice(0, Math.max(0, Math.floor(sanitizeNumber(legendMaxItems, 6)))) : [];
  const hiddenLegendCount = hasLegend ? Math.max(0, safeSeries.length - legendItems.length) : 0;
  const legendY = Math.max(30, centerY - (legendItems.length + (hiddenLegendCount ? 1 : 0)) * 14);
  const isEmpty = resolvedAxes.length < 3 || safeSeries.length === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Radar chart");
  const svgSummary = summary ?? createSummary(safeSeries, valueFormatter);
  const renderNotice =
    notice ??
    (series.length > visibleSeries.length
      ? `RadarChart limited to ${visibleSeries.length.toLocaleString()} of ${series.length.toLocaleString()} series for SVG performance.`
      : undefined);
  const axisEndpoints = resolvedAxes.map((axis, index) => ({
    axis,
    angle: getRadarAngle(index, resolvedAxes.length),
    point: polarToCartesian(centerX, centerY, radius, getRadarAngle(index, resolvedAxes.length)),
    labelPoint: polarToCartesian(centerX, centerY, radius + 26, getRadarAngle(index, resolvedAxes.length)),
  }));

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
        className="c-chart__svg c-chart__svg--radar"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        {showGrid ? (
          <g className="c-chart__radar-grid">
            {Array.from({ length: levels }, (_, index) => {
              const levelRadius = radius * ((index + 1) / levels);
              const ringPoints = resolvedAxes.map((_, axisIndex) => {
                const point = polarToCartesian(centerX, centerY, levelRadius, getRadarAngle(axisIndex, resolvedAxes.length));
                return { ...point, value: 0, axis: resolvedAxes[axisIndex] };
              });

              return (
                <g key={`ring-${index}`}>
                  <path d={createPolygonPath(ringPoints)} />
                  {showGridLabels ? (
                    <text x={centerX + 7} y={centerY - levelRadius + 4}>
                      {Math.round(((index + 1) / levels) * 100)}%
                    </text>
                  ) : null}
                </g>
              );
            })}
            {axisEndpoints.map(({ axis, point }) => (
              <line key={`axis-${axis.key}`} x1={centerX} x2={point.x} y1={centerY} y2={point.y} />
            ))}
          </g>
        ) : null}
        {safeSeries.map((item, index) => (
          <g className="c-chart__radar-series" key={`${item.name}-${index}`}>
            <path className="c-chart__radar-area" d={createPolygonPath(item.points)} style={{ fill: item.fill, stroke: item.stroke }} />
            <path className="c-chart__radar-outline" d={createPolylinePath([...item.points, item.points[0]])} style={{ stroke: item.stroke }} />
            {item.points.map((point) => (
              <circle className="c-chart__radar-point" cx={point.x} cy={point.y} key={`${item.name}-${point.axis.key}`} r="3.5" style={{ fill: item.stroke }}>
                {showTooltip ? <title>{`${item.name}, ${point.axis.label}: ${formatDatum(valueFormatter, point.value)}`}</title> : null}
              </circle>
            ))}
          </g>
        ))}
        {showLabels ? (
          <g className="c-chart__radar-labels">
            {axisEndpoints.map(({ axis, labelPoint }) => (
              <text key={`label-${axis.key}`} textAnchor={getAxisLabelAnchor(labelPoint.x, centerX)} x={labelPoint.x} y={labelPoint.y + 4}>
                <title>{axis.label}</title>
                {formatShortLabel(axis.label, axisLabelMaxLength)}
              </text>
            ))}
          </g>
        ) : null}
        {showLegend ? (
          <g className="c-chart__legend c-chart__legend--radar" transform={`translate(${centerX + radius + 46} ${legendY})`}>
            {legendItems.map((item, index) => (
              <g key={`${item.name}-legend-${index}`} transform={`translate(0 ${index * 28})`}>
                <rect height="10" rx="3" width="10" x="0" y="-8" style={{ fill: item.stroke }} />
                <text className="c-chart__legend-label" x="18" y="0">
                  <title>{item.name}</title>
                  {formatShortLabel(item.name, 18)}
                </text>
              </g>
            ))}
            {hiddenLegendCount > 0 ? (
              <text className="c-chart__legend-more" x="18" y={legendItems.length * 28}>
                +{hiddenLegendCount} more
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </ChartFrame>
  );
}
