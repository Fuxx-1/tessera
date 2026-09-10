import { useId } from "react";
import { cx } from "../../utils/cx";
import { UI_RENDER_BUDGETS, limitItems } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { isSafeChartColor } from "./palette";
import type { ChartBaseProps, ChartFormatter, ChartMargin, HeatmapColorStop, HeatmapDatum } from "./types";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  formatShortLabel,
  getChartA11yTitle,
  normalizeDomain,
  normalizeHeatmapMatrix,
  sanitizeDimension,
  sanitizeMargin,
  sanitizeNumber,
} from "./utils";
import type { NormalizedHeatmapDatum } from "./utils";
import "./styles/heatmap.css";

const defaultMargin: ChartMargin = { top: 26, right: 24, bottom: 70, left: 90 };
const defaultColorStops: HeatmapColorStop[] = [
  { value: 0, color: "#eef2f7", label: "Low" },
  { value: 0.36, color: "#99c7c4", label: "Medium low" },
  { value: 0.68, color: "#618f87", label: "Medium high" },
  { value: 1, color: "#54486e", label: "High" },
];

export interface HeatmapProps extends Omit<ChartBaseProps, "data" | "valueFormatter"> {
  data: HeatmapDatum[];
  xCategories?: string[];
  yCategories?: string[];
  colorDomain?: [number, number];
  colorStops?: HeatmapColorStop[];
  height?: number;
  margin?: Partial<ChartMargin>;
  showLegend?: boolean;
  showTooltip?: boolean;
  showDataTable?: boolean;
  cellGap?: number;
  minCellSize?: number;
  xLabelMaxLength?: number;
  yLabelMaxLength?: number;
  valueFormatter?: ChartFormatter | ((value: number, datum?: HeatmapDatum) => string);
}

function normalizeColorStops(stops: HeatmapColorStop[] | undefined, domain: [number, number]) {
  const [domainMin, domainMax] = domain;
  const domainSpan = domainMax - domainMin || 1;
  const safeStops = (stops ?? defaultColorStops)
    .map((stop) => ({
      value: sanitizeNumber(stop.value, domainMin),
      color: isSafeChartColor(stop.color) ? stop.color.trim() : "",
      label: stop.label,
    }))
    .filter((stop) => stop.color)
    .map((stop) => ({
      ...stop,
      value: stop.value >= 0 && stop.value <= 1 ? domainMin + stop.value * domainSpan : stop.value,
    }))
    .sort((a, b) => a.value - b.value);

  if (safeStops.length >= 2) {
    return safeStops;
  }

  return defaultColorStops.map((stop) => ({
    ...stop,
    value: domainMin + stop.value * domainSpan,
  }));
}

function parseHexColor(color: string): [number, number, number] {
  const normalized =
    color.length === 4 ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}` : color.slice(0, 7);
  const value = Number.parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function interpolateColor(start: string, end: string, ratio: number) {
  const startRgb = parseHexColor(start);
  const endRgb = parseHexColor(end);
  const channels = startRgb.map((channel, index) => Math.round(channel + (endRgb[index] - channel) * ratio));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function getHeatmapColor(value: number, stops: HeatmapColorStop[]) {
  const sortedStops = stops.slice().sort((a, b) => a.value - b.value);
  const first = sortedStops[0];
  const last = sortedStops[sortedStops.length - 1];

  if (value <= first.value) {
    return first.color;
  }

  if (value >= last.value) {
    return last.color;
  }

  const upperIndex = sortedStops.findIndex((stop) => value <= stop.value);
  const lower = sortedStops[Math.max(upperIndex - 1, 0)];
  const upper = sortedStops[upperIndex];
  const ratio = clampNumber((value - lower.value) / (upper.value - lower.value || 1), 0, 1);
  return interpolateColor(lower.color, upper.color, ratio);
}

function getFormattedValue(valueFormatter: HeatmapProps["valueFormatter"], value: number, datum?: HeatmapDatum) {
  return formatDatum(valueFormatter as ChartFormatter | undefined, value, datum as never);
}

export function Heatmap({
  cellGap = 3,
  className,
  colorDomain,
  colorStops,
  data,
  emptyText,
  error,
  height = 320,
  loading,
  loadingText,
  margin,
  minCellSize = 34,
  notice,
  showDataTable = true,
  showLegend = true,
  showTooltip = true,
  summary,
  title,
  valueFormatter,
  xCategories,
  xLabelMaxLength = 12,
  yCategories,
  yLabelMaxLength = 14,
  ...props
}: HeatmapProps) {
  const titleId = useId();
  const descId = useId();
  const tableId = useId();
  const legendGradientId = useId().replace(/:/g, "");
  const safeHeight = sanitizeDimension(height, 320, 180, 900);
  const matrix = normalizeHeatmapMatrix(data, {
    maxCells: UI_RENDER_BUDGETS.heatmapCells,
    maxXCategories: UI_RENDER_BUDGETS.heatmapAxisCategories,
    maxYCategories: UI_RENDER_BUDGETS.heatmapAxisCategories,
    xCategories,
    yCategories,
  });
  const safeData = matrix.data;
  const safeXCategories = matrix.xCategories;
  const safeYCategories = matrix.yCategories;
  const hiddenAxisCount =
    Math.max(0, matrix.originalXCount - safeXCategories.length) + Math.max(0, matrix.originalYCount - safeYCategories.length);
  const aggregatedCellCount = safeData.reduce((count, datum) => count + Math.max(0, datum.count - 1), 0);
  const renderNotice =
    notice ??
    (hiddenAxisCount > 0 || aggregatedCellCount > 0
      ? `Heatmap rendered ${matrix.renderedCellSlots.toLocaleString()} SVG cells from ${matrix.originalXCount.toLocaleString()} x ${matrix.originalYCount.toLocaleString()} categories; off-budget categories are sampled and finite values in the same bucket are averaged for SVG performance.`
      : undefined);
  const visibleYCategories = limitItems(safeYCategories, Math.max(1, Math.floor(UI_RENDER_BUDGETS.chartTableRows / Math.max(safeXCategories.length, 1))));
  const safeMinCellSize = clampNumber(sanitizeNumber(minCellSize, 34), 18, 84);
  const safeCellGap = clampNumber(sanitizeNumber(cellGap, 3), 0, 10);
  const provisionalMargin = sanitizeMargin(margin, defaultMargin, defaultChartWidth, safeHeight, 80);
  const minPlotWidth = safeXCategories.length * (safeMinCellSize + safeCellGap) - safeCellGap;
  const width = Math.max(defaultChartWidth, Math.ceil(provisionalMargin.left + provisionalMargin.right + minPlotWidth));
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, width, safeHeight, 80);
  const legendHeight = showLegend ? 38 : 0;
  const chartWidth = Math.max(24, width - resolvedMargin.left - resolvedMargin.right);
  const chartHeight = Math.max(24, safeHeight - resolvedMargin.top - resolvedMargin.bottom - legendHeight);
  const cellWidth =
    safeXCategories.length > 0 ? Math.max(1, (chartWidth - safeCellGap * (safeXCategories.length - 1)) / safeXCategories.length) : 1;
  const cellHeight =
    safeYCategories.length > 0 ? Math.max(1, (chartHeight - safeCellGap * (safeYCategories.length - 1)) / safeYCategories.length) : 1;
  const values = safeData.map((datum) => datum.value);
  const fallbackDomain: [number, number] = values.length > 0 ? [Math.min(...values), Math.max(...values)] : [0, 1];
  const domain = normalizeDomain(colorDomain, fallbackDomain);
  const stops = normalizeColorStops(colorStops, domain);
  const datumMap = new Map<string, NormalizedHeatmapDatum>();
  safeData.forEach((datum) => {
    datumMap.set(`${datum.x}\n${datum.y}`, datum);
  });
  const cells = safeYCategories.flatMap((yCategory, yIndex) =>
    safeXCategories.map((xCategory, xIndex) => ({
      datum: datumMap.get(`${xCategory}\n${yCategory}`),
      xCategory,
      xIndex,
      yCategory,
      yIndex,
    })),
  );
  const isEmpty = safeData.length === 0 || safeXCategories.length === 0 || safeYCategories.length === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Heatmap");
  const generatedSummary = (() => {
    if (isEmpty) {
      return "No heatmap cells to display.";
    }

    const maxDatum = safeData.reduce((current, datum) => (datum.value > current.value ? datum : current), safeData[0]);
    const minDatum = safeData.reduce((current, datum) => (datum.value < current.value ? datum : current), safeData[0]);
    return `${safeXCategories.length} x categories and ${safeYCategories.length} y categories rendered as ${matrix.renderedCellSlots} SVG cells. Highest cell is ${maxDatum.x} by ${maxDatum.y} at ${getFormattedValue(
      valueFormatter,
      maxDatum.value,
      maxDatum,
    )}; lowest cell is ${minDatum.x} by ${minDatum.y} at ${getFormattedValue(valueFormatter, minDatum.value, minDatum)}.`;
  })();
  const svgSummary = summary ?? generatedSummary;
  const legendY = safeHeight - 32;
  const legendWidth = Math.min(220, chartWidth);

  return (
    <ChartFrame
      className={cx("c-heatmap", className)}
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
        aria-describedby={showDataTable && !hasState ? tableId : undefined}
        aria-hidden={hasState || undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--heatmap"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        style={{ minWidth: width > defaultChartWidth ? width : undefined }}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        {showLegend ? (
          <defs>
            <linearGradient id={legendGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
              {stops.map((stop) => (
                <stop
                  key={`${stop.value}-${stop.color}`}
                  offset={`${clampNumber((stop.value - domain[0]) / (domain[1] - domain[0] || 1), 0, 1) * 100}%`}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>
        ) : null}
        <g className="c-chart__axis-labels c-heatmap__x-labels">
          {safeXCategories.map((category, index) => (
            <text
              key={category}
              transform={`translate(${resolvedMargin.left + index * (cellWidth + safeCellGap) + cellWidth / 2} ${safeHeight - resolvedMargin.bottom + 18}) rotate(-35)`}
            >
              <title>{category}</title>
              {formatShortLabel(category, xLabelMaxLength)}
            </text>
          ))}
        </g>
        <g className="c-chart__axis-labels c-heatmap__y-labels">
          {safeYCategories.map((category, index) => (
            <text key={category} x={resolvedMargin.left - 12} y={resolvedMargin.top + index * (cellHeight + safeCellGap) + cellHeight / 2 + 4}>
              <title>{category}</title>
              {formatShortLabel(category, yLabelMaxLength)}
            </text>
          ))}
        </g>
        <g className="c-heatmap__cells">
          {cells.map(({ datum, xCategory, xIndex, yCategory, yIndex }) => {
            const x = resolvedMargin.left + xIndex * (cellWidth + safeCellGap);
            const y = resolvedMargin.top + yIndex * (cellHeight + safeCellGap);
            const formattedValue = datum ? getFormattedValue(valueFormatter, datum.value, datum) : "No data";
            const aggregateText = datum && datum.count > 1 ? ` averaged from ${datum.count.toLocaleString()} values` : "";
            const label = `${xCategory}, ${yCategory}: ${formattedValue}${aggregateText}`;

            return (
              <rect
                aria-label={label}
                className={cx("c-heatmap__cell", !datum && "c-heatmap__cell--missing")}
                height={cellHeight}
                key={`${xCategory}-${yCategory}`}
                rx="4"
                ry="4"
                style={{ fill: datum ? getHeatmapColor(datum.value, stops) : "#f2f2ef" }}
                width={cellWidth}
                x={x}
                y={y}
              >
                {showTooltip ? <title>{label}</title> : null}
              </rect>
            );
          })}
        </g>
        {showLegend ? (
          <g className="c-heatmap__legend" transform={`translate(${resolvedMargin.left} ${legendY})`}>
            <rect height="10" rx="5" width={legendWidth} fill={`url(#${legendGradientId})`} />
            <text x="0" y="26">
              {stops[0].label ?? getFormattedValue(valueFormatter, domain[0])}
            </text>
            <text x={legendWidth} y="26">
              {stops[stops.length - 1].label ?? getFormattedValue(valueFormatter, domain[1])}
            </text>
          </g>
        ) : null}
      </svg>
      {showDataTable ? (
        <div className="c-chart__table-wrap c-heatmap__table-wrap" id={tableId}>
          <table className="c-chart__table c-heatmap__table">
            <caption>{title ? `${title} data table` : "Heatmap data table"}</caption>
            <thead>
              <tr>
                <th scope="col">Y / X</th>
                {safeXCategories.map((category) => (
                  <th key={category} scope="col">
                    {category}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleYCategories.items.map((yCategory) => (
                <tr key={yCategory}>
                  <th scope="row">{yCategory}</th>
                  {safeXCategories.map((xCategory) => {
                    const datum = datumMap.get(`${xCategory}\n${yCategory}`);
                    return (
                      <td key={xCategory}>
                        {datum ? (
                          <>
                            {getFormattedValue(valueFormatter, datum.value, datum)}
                            {datum.count > 1 ? <span className="c-heatmap__aggregate-count"> avg {datum.count.toLocaleString()}</span> : null}
                          </>
                        ) : (
                          "n/a"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {visibleYCategories.hiddenCount > 0 ? (
                <tr>
                  <td colSpan={safeXCategories.length + 1}>
                    Showing first {visibleYCategories.items.length.toLocaleString()} of {safeYCategories.length.toLocaleString()} rows.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </ChartFrame>
  );
}
