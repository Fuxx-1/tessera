import "./styles/bar.css";
import { useId } from "react";
import { ChartFrame } from "./ChartFrame";
import { getChartColor } from "./palette";
import type { CartesianChartProps, ChartDatum, ChartMargin } from "./types";
import {
  createBandScale,
  createLinearScale,
  createLinearTicks,
  defaultChartWidth,
  formatDatum,
  formatShortLabel,
  getChartA11yTitle,
  getValueDomain,
  normalizeCartesianDataWindow,
  normalizeDomain,
  sanitizeDimension,
  sanitizeMargin,
  sanitizeNumber,
  shouldRenderAxisLabel,
  type ChartDataWindow,
} from "./utils";

const defaultMargin: ChartMargin = { top: 18, right: 18, bottom: 34, left: 42 };

export interface BarChartProps extends CartesianChartProps {
  barRadius?: number;
  barPadding?: number;
  labelFormatter?: (label: string, datum: ChartDatum, index: number) => string;
  maxLabelLength?: number;
  minBarWidth?: number;
  showValues?: boolean;
  tickCount?: number;
  dataWindow?: ChartDataWindow;
  yDomain?: [number, number];
}

export function BarChart({
  barPadding = 0.22,
  barRadius = 4,
  className,
  data,
  dataWindow,
  emptyText,
  error,
  height = 260,
  labelFormatter,
  loading,
  loadingText,
  margin,
  maxLabelLength = 12,
  maxDataPoints,
  minBarWidth = 18,
  notice,
  scale: _scale,
  showGrid = true,
  showValues = false,
  summary,
  tickCount = 4,
  title,
  tone = "neutral",
  valueFormatter,
  xLabelMaxLength: _xLabelMaxLength,
  yDomain,
  ...props
}: BarChartProps) {
  const titleId = useId();
  const descId = useId();
  const clipId = `bar-chart-clip-${useId().replace(/:/g, "")}`;
  const safeHeight = sanitizeDimension(height, 260);
  const normalizedWindow = normalizeCartesianDataWindow(data, maxDataPoints, dataWindow);
  const safeData = normalizedWindow.data;
  const hiddenOutsideWindow = Math.max(0, normalizedWindow.totalFiniteCount - normalizedWindow.windowFiniteCount);
  const hiddenBySampling = Math.max(0, normalizedWindow.windowFiniteCount - safeData.length);
  const renderNotice =
    notice ??
    (hiddenOutsideWindow || hiddenBySampling
      ? `BarChart renders ${safeData.length.toLocaleString()} of ${normalizedWindow.totalFiniteCount.toLocaleString()} finite bars${
          hiddenOutsideWindow
            ? ` from rows ${Math.min(normalizedWindow.windowStart + 1, data.length).toLocaleString()}-${normalizedWindow.windowEnd.toLocaleString()}`
            : ""
        }${hiddenBySampling ? " after sampling the active window" : ""} for SVG performance.`
      : undefined);
  const dataCount = Math.max(safeData.length, 1);
  const safeMinBarWidth = Math.max(8, sanitizeNumber(minBarWidth, 18));
  const provisionalMargin = sanitizeMargin(margin, defaultMargin, defaultChartWidth, safeHeight);
  const minPlotWidth = provisionalMargin.left + provisionalMargin.right + dataCount * safeMinBarWidth * 1.65;
  const width = Math.max(defaultChartWidth, Math.ceil(minPlotWidth));
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, width, safeHeight);
  const chartWidth = Math.max(24, width - resolvedMargin.left - resolvedMargin.right);
  const chartHeight = Math.max(24, safeHeight - resolvedMargin.top - resolvedMargin.bottom);
  const labels = safeData.map((datum) => datum.label);
  const xScale = createBandScale(labels, [resolvedMargin.left, resolvedMargin.left + chartWidth], barPadding);
  const resolvedDomain = normalizeDomain(yDomain, getValueDomain(safeData.map((datum) => datum.value)));
  const yScale = createLinearScale(
    resolvedDomain,
    [resolvedMargin.top + chartHeight, resolvedMargin.top],
    true,
  );
  const baselineY = yScale(Math.max(0, yScale.domain[0]));
  const color = getChartColor(tone);
  const ticks = createLinearTicks(yScale.domain, tickCount).map((value) => ({ value, y: yScale(value) }));
  const isEmpty = safeData.length === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Bar chart");
  const generatedSummary = (() => {
    if (safeData.length === 0) {
      return "No bars to display.";
    }

    const maxDatum = safeData.reduce((current, datum) => (datum.value > current.value ? datum : current), safeData[0]);
    const minDatum = safeData.reduce((current, datum) => (datum.value < current.value ? datum : current), safeData[0]);

    return `${safeData.length} bars comparing category values. Highest value is ${maxDatum.label} at ${formatDatum(
      valueFormatter,
      maxDatum.value,
      maxDatum,
    )}; lowest value is ${minDatum.label} at ${formatDatum(valueFormatter, minDatum.value, minDatum)}.`;
  })();
  const svgSummary = summary ?? generatedSummary;

  return (
    <ChartFrame
      className={className}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={svgSummary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={hasState || undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--bar"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        style={{ minWidth: width > defaultChartWidth ? width : undefined }}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <defs>
          <clipPath id={clipId}>
            <rect height={chartHeight} width={chartWidth} x={resolvedMargin.left} y={resolvedMargin.top} />
          </clipPath>
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
        <g clipPath={`url(#${clipId})`}>
          {safeData.map((datum, index) => {
            const x = xScale(datum.label, index);
            const y = yScale(Math.max(datum.value, 0));
            const barHeight = Math.abs(yScale(datum.value) - baselineY);
            const rectY = datum.value >= 0 ? y : baselineY;
            const displayValue = formatDatum(valueFormatter, datum.value, datum);
            const valueLabelY =
              datum.value >= 0
                ? Math.max(rectY - 8, resolvedMargin.top + 8)
                : Math.min(rectY + barHeight + 16, safeHeight - resolvedMargin.bottom + 18);

            return (
              <g className="c-chart__bar-group" key={`${datum.label}-${index}`}>
                <rect
                  aria-label={`${datum.label}: ${displayValue}`}
                  className="c-chart__bar"
                  height={Math.max(barHeight, 1)}
                  rx={barRadius}
                  ry={barRadius}
                  style={{ fill: color }}
                  width={xScale.bandwidth}
                  x={x}
                  y={rectY}
                >
                  <title>{`${datum.label}: ${displayValue}`}</title>
                </rect>
                {showValues ? (
                  <text className="c-chart__bar-value" x={x + xScale.bandwidth / 2} y={valueLabelY}>
                    {displayValue}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        <g className="c-chart__axis-labels">
          {safeData.map((datum, index) => {
            const formattedLabel = labelFormatter ? labelFormatter(datum.label, datum, index) : datum.label;

            return shouldRenderAxisLabel(index, safeData.length) ? (
              <text key={`${datum.label}-${index}`} x={xScale(datum.label, index) + xScale.bandwidth / 2} y={safeHeight - 9}>
                <title>{formattedLabel}</title>
                {formatShortLabel(formattedLabel, maxLabelLength)}
              </text>
            ) : null;
          })}
        </g>
      </svg>
    </ChartFrame>
  );
}
