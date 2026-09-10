import "./styles/pie.css";
import { useId } from "react";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors } from "./palette";
import type { ChartBaseProps } from "./types";
import {
  createPieSlicePath,
  createPieSlices,
  defaultChartWidth,
  formatDatum,
  formatPercent,
  formatShortLabel,
  getChartA11yTitle,
  getChartRenderNotice,
  normalizePieData,
  sanitizeDimension,
} from "./utils";

export interface PieChartProps extends ChartBaseProps {
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  legendMaxItems?: number;
  maxSlices?: number;
}

export function PieChart({
  className,
  colors = chartSeriesColors,
  data,
  emptyText,
  error,
  height = 260,
  loading,
  loadingText,
  legendMaxItems = 8,
  maxSlices,
  notice,
  showLegend = true,
  summary,
  title,
  valueFormatter,
  ...props
}: PieChartProps) {
  const titleId = useId();
  const descId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 260, 180);
  const centerX = showLegend ? 146 : width / 2;
  const centerY = safeHeight / 2;
  const radius = Math.max(52, Math.min(96, safeHeight / 2 - 22));
  const safeColors = getSafeChartColors(colors, chartSeriesColors);
  const positiveCount = data.filter((datum) => Number.isFinite(datum.value) && datum.value > 0).length;
  const invalidCount = data.length - positiveCount;
  const safeData = normalizePieData(data, maxSlices);
  const renderNotice = notice ?? getChartRenderNotice("PieChart", positiveCount, safeData.length, "slices", "aggregated");
  const slices = createPieSlices(safeData);
  const visibleLegendItems = Number.isFinite(legendMaxItems) ? Math.max(0, Math.floor(legendMaxItems)) : 8;
  const legendSlices = showLegend ? slices.slice(0, visibleLegendItems) : [];
  const hiddenLegendCount = showLegend ? Math.max(0, slices.length - legendSlices.length) : 0;
  const legendY = Math.max(24, centerY - (legendSlices.length + (hiddenLegendCount > 0 ? 1 : 0)) * 13);
  const isEmpty = slices.length === 0;
  const hasState = loading || error || isEmpty;
  const svgTitle = getChartA11yTitle(title, "Pie chart");
  const aggregatedCount = Math.max(0, positiveCount - safeData.length);
  const svgSummary =
    summary ??
    `${slices.length} rendered slices${aggregatedCount > 0 ? ` from ${positiveCount} positive values` : ""}${
      invalidCount > 0 ? `; ${invalidCount} non-positive or invalid ${invalidCount === 1 ? "value was" : "values were"} ignored` : ""
    }.`;

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
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--pie"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-chart__pie">
          {slices.map((slice, index) => (
            <path
              data-slice-label={slice.label}
              d={createPieSlicePath(centerX, centerY, radius, slice)}
              key={`${slice.label}-${index}`}
              style={{ fill: safeColors[index % safeColors.length] }}
            >
              <title>{`${slice.label}: ${formatDatum(valueFormatter, slice.value, slice)} (${formatPercent(slice.percentage)})`}</title>
            </path>
          ))}
          <circle className="c-chart__pie-hole" cx={centerX} cy={centerY} r={radius * 0.52} />
        </g>
        {showLegend ? (
          <g className="c-chart__legend" transform={`translate(${centerX + radius + 36} ${legendY})`}>
            {legendSlices.map((slice, index) => (
              <g key={`${slice.label}-legend-${index}`} transform={`translate(0 ${index * 28})`}>
                <rect height="10" rx="3" width="10" x="0" y="-8" style={{ fill: safeColors[index % safeColors.length] }} />
                <text aria-label={slice.label} className="c-chart__legend-label" data-legend-label={slice.label} x="18" y="0">
                  {formatShortLabel(slice.label, 18)}
                </text>
                <text className="c-chart__legend-value" x="206" y="0">
                  {formatPercent(slice.percentage)}
                </text>
              </g>
            ))}
            {hiddenLegendCount > 0 ? (
              <text className="c-chart__legend-more" x="18" y={legendSlices.length * 28}>
                +{hiddenLegendCount} more
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </ChartFrame>
  );
}
