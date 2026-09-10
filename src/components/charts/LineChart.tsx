import "./styles/line.css";
import { useId } from "react";
import { ChartFrame } from "./ChartFrame";
import { getChartColor } from "./palette";
import type { CartesianChartProps, ChartMargin, ChartPoint } from "./types";
import {
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
  normalizeDomain,
  normalizeCartesianDataSample,
  sanitizeDimension,
  sanitizeMargin,
  shouldRenderAxisLabel,
} from "./utils";

const defaultMargin: ChartMargin = { top: 18, right: 18, bottom: 32, left: 42 };

export interface LineChartProps extends CartesianChartProps {
  showPoints?: boolean;
}

export function LineChart({
  className,
  data,
  emptyText,
  error,
  height = 260,
  loading,
  loadingText,
  margin,
  maxDataPoints,
  notice,
  scale,
  showGrid = true,
  showPoints = true,
  summary,
  title,
  tone = "sage",
  valueFormatter,
  xLabelMaxLength,
  ...props
}: LineChartProps) {
  const titleId = useId();
  const descId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 260);
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, width, safeHeight);
  const chartWidth = Math.max(24, width - resolvedMargin.left - resolvedMargin.right);
  const chartHeight = Math.max(24, safeHeight - resolvedMargin.top - resolvedMargin.bottom);
  const sampledData = normalizeCartesianDataSample(data, maxDataPoints);
  const safeData = sampledData.data;
  const renderNotice = notice ?? getChartRenderNotice("LineChart", sampledData.totalFiniteCount, safeData.length, "points");
  const labels = safeData.map((datum) => datum.label);
  const xScale = createPointScale(labels, [resolvedMargin.left, resolvedMargin.left + chartWidth]);
  const yDomain = normalizeDomain(scale?.yDomain, getValueDomain(safeData.map((datum) => datum.value), scale?.includeZero ?? true));
  const yScale = createLinearScale(
    yDomain,
    [resolvedMargin.top + chartHeight, resolvedMargin.top],
    scale?.clamp ?? true,
  );
  const color = getChartColor(tone);
  const points: ChartPoint[] = safeData.map((datum, index) => ({ x: xScale(datum.label, index), y: yScale(datum.value) }));
  const path = createLinePath(points);
  const ticks = createLinearTicks(yScale.domain, scale?.tickCount).map((value) => ({ value, y: yScale(value) }));
  const isEmpty = safeData.length === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Line chart");
  const svgSummary =
    summary ??
    `${safeData.length} plotted points from ${formatDatum(valueFormatter, yScale.domain[0])} to ${formatDatum(valueFormatter, yScale.domain[1])}.`;

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
        {path ? <path className="c-chart__line" d={path} style={{ stroke: color }} /> : null}
        {showPoints
          ? points.map((point, index) => (
              <circle
                className="c-chart__point"
                cx={point.x}
                cy={point.y}
                key={`${safeData[index].label}-${index}`}
                r="4"
                style={{ fill: color }}
              >
                <title>{`${safeData[index].label}: ${formatDatum(valueFormatter, safeData[index].value, safeData[index])}`}</title>
              </circle>
            ))
          : null}
        <g className="c-chart__axis-labels">
          {safeData.map((datum, index) =>
            shouldRenderAxisLabel(index, safeData.length) ? (
              <text key={`${datum.label}-${index}`} x={xScale(datum.label, index)} y={safeHeight - 9}>
                <title>{datum.label}</title>
                {formatShortLabel(datum.label, xLabelMaxLength)}
              </text>
            ) : null,
          )}
        </g>
      </svg>
    </ChartFrame>
  );
}
