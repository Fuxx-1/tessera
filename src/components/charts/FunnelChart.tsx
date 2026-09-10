import { useId } from "react";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "../../utils/performance";
import "./styles/funnel.css";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors } from "./palette";
import type { ChartBaseProps, ChartFormatter } from "./types";
import {
  defaultChartWidth,
  formatDatum,
  formatPercent,
  formatShortLabel,
  getChartA11yTitle,
  getChartRenderNotice,
  normalizeChartLabel,
  sanitizeDimension,
} from "./utils";

export type FunnelChartDatum = {
  stage?: string;
  label?: string;
  value: number;
};

export type FunnelChartSegment = {
  stage: string;
  label: string;
  value: number;
  percent: number;
  dropoff: number;
  previousValue?: number;
};

export interface FunnelChartProps extends Omit<ChartBaseProps, "data" | "valueFormatter"> {
  data: FunnelChartDatum[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showStageLabels?: boolean;
  showValueLabels?: boolean;
  showPercentLabels?: boolean;
  showDropoffLabels?: boolean;
  legendMaxItems?: number;
  maxSegments?: number;
  stageFormatter?: (stage: string, segment: FunnelChartSegment, index: number) => string;
  valueFormatter?: ChartFormatter;
  percentFormatter?: (percent: number, segment: FunnelChartSegment, index: number) => string;
  dropoffFormatter?: (dropoff: number, segment: FunnelChartSegment, index: number) => string;
}

function normalizeFunnelData(data: FunnelChartDatum[]) {
  return data
    .map((datum, index) => {
      const stage = normalizeChartLabel(datum.stage ?? datum.label, `Stage ${index + 1}`);

      return {
        label: stage,
        stage,
        value: datum.value,
      };
    })
    .filter((datum) => Number.isFinite(datum.value) && datum.value > 0);
}

function createFunnelSegments(data: FunnelChartDatum[], maxSegments: number): FunnelChartSegment[] {
  const safeData = normalizeFunnelData(data).slice(0, maxSegments);
  const firstValue = safeData[0]?.value ?? 0;

  if (firstValue <= 0) {
    return [];
  }

  return safeData.map((datum, index) => {
    const previousValue = index > 0 ? safeData[index - 1].value : undefined;
    const dropoff = previousValue && previousValue > 0 ? (previousValue - datum.value) / previousValue : 0;

    return {
      stage: datum.stage,
      label: datum.label,
      value: datum.value,
      percent: datum.value / firstValue,
      dropoff,
      previousValue,
    };
  });
}

function formatDropoff(value: number) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  if (value < 0) {
    return `Gain ${formatPercent(Math.abs(value))}`;
  }

  return `Drop ${formatPercent(value)}`;
}

function safeFormatStage(
  formatter: FunnelChartProps["stageFormatter"],
  stage: string,
  segment: FunnelChartSegment,
  index: number,
) {
  try {
    return normalizeChartLabel(formatter ? formatter(stage, segment, index) : stage, stage);
  } catch {
    return stage;
  }
}

function safeFormatRatio(
  formatter: FunnelChartProps["percentFormatter"] | FunnelChartProps["dropoffFormatter"],
  fallback: string,
  ratio: number,
  segment: FunnelChartSegment,
  index: number,
) {
  try {
    const formatted = formatter ? formatter(ratio, segment, index) : fallback;
    return normalizeChartLabel(formatted, fallback);
  } catch {
    return fallback;
  }
}

export function FunnelChart({
  className,
  colors = chartSeriesColors,
  data,
  emptyText,
  error,
  height = 300,
  loading,
  loadingText,
  legendMaxItems = 8,
  maxSegments = UI_RENDER_BUDGETS.chartFunnelSegments,
  notice,
  percentFormatter,
  dropoffFormatter,
  showDropoffLabels = true,
  showLegend = true,
  showPercentLabels = true,
  showStageLabels = true,
  showValueLabels = true,
  stageFormatter,
  summary,
  title,
  valueFormatter,
  ...props
}: FunnelChartProps) {
  const titleId = useId();
  const descId = useId();
  const safeHeight = sanitizeDimension(height, 300, 220);
  const positiveCount = data.filter((datum) => Number.isFinite(datum.value) && datum.value > 0).length;
  const safeMaxSegments = clampRenderLimit(maxSegments, UI_RENDER_BUDGETS.chartFunnelSegments, 1, UI_RENDER_BUDGETS.chartFunnelSegments);
  const segments = createFunnelSegments(data, safeMaxSegments);
  const renderNotice =
    notice ??
    getChartRenderNotice("FunnelChart", positiveCount, segments.length, "positive stages", "truncated");
  const safeColors = getSafeChartColors(colors, chartSeriesColors);
  const width = defaultChartWidth;
  const plotX = 24;
  const plotY = 24;
  const legendWidth = showLegend ? 176 : 0;
  const plotWidth = width - plotX * 2 - legendWidth;
  const centerX = plotX + plotWidth / 2;
  const stageGap = 4;
  const availableHeight = Math.max(120, safeHeight - plotY * 2 - Math.max(0, segments.length - 1) * stageGap);
  const stageHeight = segments.length > 0 ? availableHeight / segments.length : availableHeight;
  const compactLabels = stageHeight < 22;
  const stageLabelStride = compactLabels ? Math.max(1, Math.ceil(18 / Math.max(stageHeight + stageGap, 1))) : 1;
  const showInlineValueLabels = showValueLabels && !compactLabels;
  const showInlinePercentLabels = showPercentLabels && !compactLabels;
  const showInlineDropoffLabels = showDropoffLabels && !compactLabels;
  const firstValue = segments[0]?.value ?? 1;
  const maxFunnelWidth = Math.max(190, plotWidth - 18);
  const minFunnelWidth = Math.min(96, maxFunnelWidth * 0.38);
  const valueToWidth = (value: number) => Math.max(minFunnelWidth, maxFunnelWidth * Math.min(1, Math.max(0, value / firstValue)));
  const visibleLegendItems = Number.isFinite(legendMaxItems) ? Math.max(0, Math.floor(legendMaxItems)) : 8;
  const legendSegments = showLegend ? segments.slice(0, visibleLegendItems) : [];
  const hiddenLegendCount = showLegend ? Math.max(0, segments.length - legendSegments.length) : 0;
  const isEmpty = segments.length === 0;
  const hasState = loading || error || isEmpty;
  const svgTitle = getChartA11yTitle(title, "Funnel chart");
  const invalidCount = data.length - positiveCount;
  const truncatedCount = Math.max(0, positiveCount - segments.length);
  const finalSegment = segments[segments.length - 1];
  const generatedSummary =
    segments.length > 0
      ? `${segments.length} funnel stages from ${segments[0].stage} to ${finalSegment.stage}. Final conversion is ${formatPercent(
          finalSegment.percent,
        )}${invalidCount > 0 ? `; ${invalidCount} non-positive or invalid ${invalidCount === 1 ? "stage was" : "stages were"} ignored` : ""}${
          truncatedCount > 0 ? `; ${truncatedCount} positive ${truncatedCount === 1 ? "stage was" : "stages were"} truncated` : ""
        }.`
      : "No positive funnel stages to display.";
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
      summary={summary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--funnel"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-chart__funnel">
          {segments.map((segment, index) => {
            const nextSegment = segments[index + 1];
            const topWidth = valueToWidth(segment.value);
            const bottomWidth = valueToWidth(nextSegment?.value ?? segment.value * 0.82);
            const y = plotY + index * (stageHeight + stageGap);
            const bottomY = y + stageHeight;
            const points = [
              [centerX - topWidth / 2, y],
              [centerX + topWidth / 2, y],
              [centerX + bottomWidth / 2, bottomY],
              [centerX - bottomWidth / 2, bottomY],
            ]
              .map((point) => point.join(","))
              .join(" ");
            const displayStage = safeFormatStage(stageFormatter, segment.stage, segment, index);
            const displayValue = formatDatum(valueFormatter, segment.value, { label: segment.stage, value: segment.value });
            const displayPercent = safeFormatRatio(percentFormatter, formatPercent(segment.percent), segment.percent, segment, index);
            const displayDropoff = safeFormatRatio(dropoffFormatter, formatDropoff(segment.dropoff), segment.dropoff, segment, index);
            const showInlineStageLabel =
              showStageLabels && (!compactLabels || index % stageLabelStride === 0 || index === segments.length - 1);
            const detailLabel = [
              displayStage,
              displayValue,
              showPercentLabels ? displayPercent : undefined,
              showDropoffLabels && index > 0 ? displayDropoff : undefined,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <g className="c-chart__funnel-segment" key={`${segment.stage}-${index}`}>
                <polygon aria-label={detailLabel} points={points} style={{ fill: safeColors[index % safeColors.length] }}>
                  <title>{detailLabel}</title>
                </polygon>
                <text className="c-chart__funnel-label c-chart__funnel-label--stage" x={centerX} y={y + stageHeight * 0.42}>
                  <title>{displayStage}</title>
                  {showInlineStageLabel ? formatShortLabel(displayStage, compactLabels ? 14 : 20) : null}
                </text>
                <text className="c-chart__funnel-label c-chart__funnel-label--value" x={centerX} y={y + stageHeight * 0.68}>
                  {[showInlineValueLabels ? displayValue : undefined, showInlinePercentLabels ? displayPercent : undefined].filter(Boolean).join(" · ")}
                </text>
                {showInlineDropoffLabels && index > 0 ? (
                  <text className="c-chart__funnel-dropoff" x={plotX + 2} y={y + stageHeight * 0.56}>
                    {displayDropoff}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        {showLegend ? (
          <g className="c-chart__legend c-chart__legend--funnel" transform={`translate(${width - legendWidth + 8} ${plotY + 8})`}>
            {legendSegments.map((segment, index) => {
              const displayStage = safeFormatStage(stageFormatter, segment.stage, segment, index);
              const displayPercent = safeFormatRatio(percentFormatter, formatPercent(segment.percent), segment.percent, segment, index);

              return (
                <g key={`${segment.stage}-legend-${index}`} transform={`translate(0 ${index * 28})`}>
                  <rect height="10" rx="3" width="10" x="0" y="-8" style={{ fill: safeColors[index % safeColors.length] }} />
                  <text className="c-chart__legend-label" x="18" y="0">
                    <title>{displayStage}</title>
                    {formatShortLabel(displayStage, 14)}
                  </text>
                  <text className="c-chart__legend-value" x="142" y="0">
                    {displayPercent}
                  </text>
                </g>
              );
            })}
            {hiddenLegendCount > 0 ? (
              <text className="c-chart__legend-more" x="18" y={legendSegments.length * 28}>
                +{hiddenLegendCount} more
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </ChartFrame>
  );
}
