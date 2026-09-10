import "./styles/sparkline.css";
import { useId } from "react";
import { cx } from "../../utils/cx";
import { UI_RENDER_BUDGETS } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { getChartColor } from "./palette";
import type { ChartBaseProps, ChartFormatter, ChartPoint, ChartTone } from "./types";
import {
  createAreaPath,
  createBandScale,
  createLinePath,
  createLinearScale,
  createPointScale,
  formatDatum,
  getChartA11yTitle,
  getChartRenderNotice,
  getValueDomain,
  normalizeCartesianData,
  sanitizeDimension,
  sanitizeNumber,
} from "./utils";

export type SparklineSize = "xs" | "sm" | "md";
export type SparklineVariant = "area" | "line" | "bar";

const sparklineSizeHeight: Record<SparklineSize, number> = {
  xs: 36,
  sm: 52,
  md: 80,
};

function getDefaultSparklineSummary(data: Array<{ label: string; value: number }>, valueFormatter: ChartFormatter | undefined) {
  if (data.length === 0) {
    return "Compact trend sparkline with no plotted values.";
  }

  const first = data[0];
  const last = data[data.length - 1];
  const min = data.reduce((current, datum) => (datum.value < current.value ? datum : current), first);
  const max = data.reduce((current, datum) => (datum.value > current.value ? datum : current), first);
  const direction = last.value > first.value ? "up" : last.value < first.value ? "down" : "flat";

  return [
    `${data.length} point compact trend, ${direction} from ${first.label} to ${last.label}.`,
    `Range ${formatDatum(valueFormatter, min.value, min)} to ${formatDatum(valueFormatter, max.value, max)}.`,
  ].join(" ");
}

export interface SparklineProps extends ChartBaseProps {
  height?: number;
  ariaLabel?: string;
  baselineValue?: number;
  maxDataPoints?: number;
  size?: SparklineSize;
  showBaseline?: boolean;
  tone?: ChartTone;
  showArea?: boolean;
  showEndpoint?: boolean;
  trendLabel?: string;
  variant?: SparklineVariant;
}

export function Sparkline({
  ariaLabel,
  baselineValue = 0,
  className,
  data,
  emptyText,
  error,
  height,
  loading,
  loadingText,
  maxDataPoints,
  notice,
  showBaseline = false,
  showArea = true,
  showEndpoint = true,
  size = "sm",
  summary,
  title,
  tone = "amber",
  trendLabel,
  valueFormatter,
  variant,
  ...props
}: SparklineProps) {
  const titleId = useId();
  const descId = useId();
  const width = 220;
  const resolvedHeight = sanitizeDimension(height, sparklineSizeHeight[size] ?? sparklineSizeHeight.sm, 32, 240);
  const padding = Math.max(5, Math.min(10, Math.round(resolvedHeight * 0.14)));
  const sourceData = data.filter((datum) => Number.isFinite(datum.value));
  const safeData = normalizeCartesianData(data, maxDataPoints ?? UI_RENDER_BUDGETS.chartSparklinePoints);
  const resolvedVariant = variant ?? (showArea ? "area" : "line");
  const includeBaseline = showBaseline || resolvedVariant === "bar";
  const renderNotice = notice ?? getChartRenderNotice("Sparkline", sourceData.length, safeData.length, "points");
  const labels = safeData.map((datum) => datum.label);
  const xScale = createPointScale(labels, [padding, width - padding]);
  const yScale = createLinearScale(getValueDomain(safeData.map((datum) => datum.value), includeBaseline), [resolvedHeight - padding, padding], true);
  const points: ChartPoint[] = safeData.map((datum, index) => ({ x: xScale(datum.label, index), y: yScale(datum.value) }));
  const linePath = createLinePath(points);
  const areaPath = createAreaPath(points, resolvedHeight - padding);
  const barScale = createBandScale(labels, [padding, width - padding], 0.34);
  const color = getChartColor(tone);
  const isEmpty = safeData.length === 0;
  const svgTitle = getChartA11yTitle(ariaLabel ?? title ?? trendLabel, "Sparkline");
  const svgSummary = summary ?? getDefaultSparklineSummary(safeData, valueFormatter);
  const lastPoint = points[points.length - 1];
  const lastDatum = safeData[safeData.length - 1];
  const baselineY = yScale(sanitizeNumber(baselineValue, 0));

  return (
    <ChartFrame
      className={cx("c-sparkline", `c-sparkline--${size}`, !title && !summary && "c-sparkline--compact", className)}
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
        aria-labelledby={`${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--sparkline"
        data-sparkline-size={size}
        focusable="false"
        preserveAspectRatio="none"
        role="img"
        data-sparkline-variant={resolvedVariant}
        viewBox={`0 0 ${width} ${resolvedHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        {showBaseline && safeData.length > 1 ? <line className="c-sparkline__baseline" x1={padding} x2={width - padding} y1={baselineY} y2={baselineY} /> : null}
        {resolvedVariant === "area" && areaPath ? <path className="c-chart__area c-sparkline__area" d={areaPath} style={{ fill: color, fillOpacity: 0.16 }} /> : null}
        {resolvedVariant === "bar"
          ? safeData.map((datum, index) => {
              const x = barScale(datum.label, index);
              const y = yScale(datum.value);
              const rectY = Math.min(y, baselineY);
              const rectHeight = Math.max(1, Math.abs(baselineY - y));
              return (
                <rect
                  className="c-sparkline__bar"
                  height={rectHeight}
                  key={`${datum.label}-${index}`}
                  rx="1"
                  style={{ fill: color }}
                  width={barScale.bandwidth}
                  x={x}
                  y={rectY}
                >
                  <title>{`${datum.label}: ${formatDatum(valueFormatter, datum.value, datum)}`}</title>
                </rect>
              );
            })
          : null}
        {resolvedVariant !== "bar" && linePath ? <path className="c-chart__line c-chart__line--sparkline" d={linePath} style={{ stroke: color }} /> : null}
        {resolvedVariant !== "bar" && showEndpoint && lastPoint && lastDatum ? (
          <circle className="c-sparkline__endpoint" cx={lastPoint.x} cy={lastPoint.y} r={size === "xs" ? 3 : 3.5} style={{ fill: color }}>
            <title>{`${lastDatum.label}: ${formatDatum(valueFormatter, lastDatum.value, lastDatum)}`}</title>
          </circle>
        ) : null}
      </svg>
      {trendLabel ? <span className="c-sparkline__trend-label">{trendLabel}</span> : null}
    </ChartFrame>
  );
}
