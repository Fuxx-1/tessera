import { useId, type HTMLAttributes, type ReactNode } from "react";
import "./styles/scatter.css";
import { ChartFrame } from "./ChartFrame";
import { getChartColor } from "./palette";
import { UI_RENDER_BUDGETS, limitItems } from "../../utils/performance";
import type { ChartMargin, ChartTone, ScatterChartDatum, ScatterChartFormatter } from "./types";
import {
  clampNumber,
  createLinearScale,
  createLinearTicks,
  defaultChartWidth,
  defaultValueFormatter,
  formatShortLabel,
  getChartA11yTitle,
  getChartRenderNotice,
  getValueDomain,
  limitText,
  normalizeDomain,
  normalizeScatterData,
  sanitizeDimension,
  sanitizeMargin,
  sanitizeNumber,
  shouldRenderAxisLabel,
} from "./utils";

const defaultMargin: ChartMargin = { top: 18, right: 20, bottom: 42, left: 48 };
const safeHexColor = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const defaultLegendMaxItems = 6;

type ScatterScaleOptions = {
  xDomain?: [number, number];
  yDomain?: [number, number];
  includeZero?: boolean;
  clamp?: boolean;
  tickCount?: number;
};

export interface ScatterChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  data: ScatterChartDatum[];
  title?: string;
  summary?: string;
  loading?: boolean;
  error?: ReactNode;
  emptyText?: string;
  loadingText?: string;
  notice?: ReactNode;
  height?: number;
  margin?: Partial<ChartMargin>;
  scale?: ScatterScaleOptions;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showTable?: boolean;
  tone?: ChartTone;
  legendMaxItems?: number;
  minRadius?: number;
  maxRadius?: number;
  xFormatter?: ScatterChartFormatter;
  yFormatter?: ScatterChartFormatter;
  radiusFormatter?: ScatterChartFormatter;
  xLabel?: string;
  yLabel?: string;
  labelMaxLength?: number;
}

function formatScatterValue(formatter: ScatterChartFormatter | undefined, value: number, datum?: ScatterChartDatum) {
  const fallback = defaultValueFormatter(value, datum ? { label: datum.label, value } : undefined);

  try {
    return limitText(formatter ? formatter(value, datum) : fallback, fallback);
  } catch {
    return fallback;
  }
}

function getPointColor(color: string | undefined, tone: ChartTone) {
  return color && safeHexColor.test(color) ? color : getChartColor(tone);
}

function getRadiusScale(data: ScatterChartDatum[], minRadius: number, maxRadius: number) {
  const radii = data.map((datum) => datum.radius).filter((value): value is number => Number.isFinite(value));

  if (radii.length === 0) {
    return () => minRadius;
  }

  const domain = normalizeDomain([Math.min(...radii), Math.max(...radii)], [minRadius, maxRadius]);
  const scale = createLinearScale(domain, [minRadius, maxRadius], true);
  return (value: number | undefined) => (Number.isFinite(value) ? scale(value ?? domain[0]) : minRadius);
}

function getLegendLabel(datum: ScatterChartDatum) {
  return limitText(datum.group ?? datum.label, datum.label);
}

function getScatterLegendItems(data: ScatterChartDatum[], tone: ChartTone, maxItems: number) {
  const groups = new Map<string, string>();

  data.forEach((datum) => {
    const label = getLegendLabel(datum);
    if (!groups.has(label)) {
      groups.set(label, getPointColor(datum.color, tone));
    }
  });

  return limitItems(Array.from(groups, ([label, color]) => ({ color, label })), maxItems);
}

export function ScatterChart({
  className,
  data,
  emptyText,
  error,
  height = 300,
  labelMaxLength = 14,
  legendMaxItems = defaultLegendMaxItems,
  loading,
  loadingText,
  margin,
  maxRadius = 12,
  minRadius = 4,
  notice,
  radiusFormatter,
  scale,
  showGrid = true,
  showLegend = true,
  showTable = true,
  showTooltip = true,
  summary,
  title,
  tone = "plum",
  xFormatter,
  xLabel = "X",
  yFormatter,
  yLabel = "Y",
  ...props
}: ScatterChartProps) {
  const titleId = useId();
  const descId = useId();
  const tableId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 300);
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, width, safeHeight);
  const chartWidth = Math.max(24, width - resolvedMargin.left - resolvedMargin.right);
  const chartHeight = Math.max(24, safeHeight - resolvedMargin.top - resolvedMargin.bottom);
  const sourceData = data.filter((datum) => Number.isFinite(datum.x) && Number.isFinite(datum.y));
  const safeData = normalizeScatterData(data);
  const renderNotice = notice ?? getChartRenderNotice("ScatterChart", sourceData.length, safeData.length, "points", "sampled");
  const tableRows = limitItems(safeData, UI_RENDER_BUDGETS.chartTableRows);
  const safeLegendMaxItems = Math.max(0, Math.floor(sanitizeNumber(legendMaxItems, defaultLegendMaxItems)));
  const legendRows = showLegend ? getScatterLegendItems(safeData, tone, safeLegendMaxItems) : undefined;
  const safeMinRadius = clampNumber(sanitizeNumber(minRadius, 4), 1, 24);
  const safeMaxRadius = Math.max(safeMinRadius, clampNumber(sanitizeNumber(maxRadius, 12), safeMinRadius, 32));
  const xDomain = normalizeDomain(
    scale?.xDomain,
    getValueDomain(safeData.map((datum) => datum.x), scale?.includeZero ?? false),
  );
  const yDomain = normalizeDomain(
    scale?.yDomain,
    getValueDomain(safeData.map((datum) => datum.y), scale?.includeZero ?? false),
  );
  const xScale = createLinearScale(xDomain, [resolvedMargin.left, resolvedMargin.left + chartWidth], scale?.clamp ?? true);
  const yScale = createLinearScale(yDomain, [resolvedMargin.top + chartHeight, resolvedMargin.top], scale?.clamp ?? true);
  const radiusScale = getRadiusScale(safeData, safeMinRadius, safeMaxRadius);
  const xTicks = createLinearTicks(xScale.domain, scale?.tickCount).map((value) => ({ value, x: xScale(value) }));
  const yTicks = createLinearTicks(yScale.domain, scale?.tickCount).map((value) => ({ value, y: yScale(value) }));
  const isEmpty = safeData.length === 0;
  const hasState = Boolean(loading || error || isEmpty);
  const svgTitle = getChartA11yTitle(title, "Scatter chart");
  const generatedSummary =
    safeData.length === 0
      ? "No scatter points to display."
      : `${safeData.length} points plotting ${xLabel} from ${formatScatterValue(xFormatter, xScale.domain[0])} to ${formatScatterValue(
          xFormatter,
          xScale.domain[1],
        )} and ${yLabel} from ${formatScatterValue(yFormatter, yScale.domain[0])} to ${formatScatterValue(yFormatter, yScale.domain[1])}.`;
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
        aria-describedby={showTable && !hasState ? tableId : undefined}
        aria-hidden={hasState || undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--scatter"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        {showGrid
          ? yTicks.map((tick) => (
              <g className="c-chart__grid-line" key={`y-${tick.value}`}>
                <line x1={resolvedMargin.left} x2={width - resolvedMargin.right} y1={tick.y} y2={tick.y} />
                <text x={resolvedMargin.left - 10} y={tick.y + 4}>
                  {formatScatterValue(yFormatter, tick.value)}
                </text>
              </g>
            ))
          : null}
        {showGrid
          ? xTicks.map((tick) => (
              <g className="c-chart__grid-line c-chart__grid-line--vertical" key={`x-${tick.value}`}>
                <line x1={tick.x} x2={tick.x} y1={resolvedMargin.top} y2={safeHeight - resolvedMargin.bottom} />
              </g>
            ))
          : null}
        <line className="c-chart__baseline" x1={resolvedMargin.left} x2={width - resolvedMargin.right} y1={safeHeight - resolvedMargin.bottom} y2={safeHeight - resolvedMargin.bottom} />
        <line className="c-chart__baseline" x1={resolvedMargin.left} x2={resolvedMargin.left} y1={resolvedMargin.top} y2={safeHeight - resolvedMargin.bottom} />
        <g className="c-chart__axis-labels">
          {xTicks.map((tick, index) =>
            shouldRenderAxisLabel(index, xTicks.length, 5) ? (
              <text key={`x-label-${tick.value}`} x={tick.x} y={safeHeight - 20}>
                {formatScatterValue(xFormatter, tick.value)}
              </text>
            ) : null,
          )}
          <text className="c-chart__axis-title" x={resolvedMargin.left + chartWidth / 2} y={safeHeight - 4}>
            {formatShortLabel(xLabel, labelMaxLength)}
          </text>
          <text className="c-chart__axis-title" transform={`translate(12 ${resolvedMargin.top + chartHeight / 2}) rotate(-90)`}>
            {formatShortLabel(yLabel, labelMaxLength)}
          </text>
        </g>
        <g className="c-chart__scatter-points">
          {safeData.map((datum, index) => {
            const xValue = formatScatterValue(xFormatter, datum.x, datum);
            const yValue = formatScatterValue(yFormatter, datum.y, datum);
            const radiusValue = Number.isFinite(datum.radius)
              ? `; radius ${formatScatterValue(radiusFormatter, datum.radius ?? 0, datum)}`
              : "";
            const pointLabel = `${datum.label}: ${xLabel} ${xValue}, ${yLabel} ${yValue}${radiusValue}`;

            return (
              <circle
                aria-label={pointLabel}
                className="c-chart__point c-chart__point--scatter"
                cx={xScale(datum.x)}
                cy={yScale(datum.y)}
                key={`${datum.label}-${index}`}
                r={radiusScale(datum.radius)}
                style={{ fill: getPointColor(datum.color, tone) }}
              >
                {showTooltip ? <title>{pointLabel}</title> : null}
              </circle>
            );
          })}
        </g>
      </svg>
      {showTable && !hasState ? (
        <div className="c-chart__table-wrap" id={tableId}>
          <table className="c-chart__table">
            <caption>{`${svgTitle} data table`}</caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">{xLabel}</th>
                <th scope="col">{yLabel}</th>
                <th scope="col">Radius</th>
                <th scope="col">Group</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.items.map((datum, index) => (
                <tr key={`${datum.label}-row-${index}`}>
                  <th scope="row">{datum.label}</th>
                  <td>{formatScatterValue(xFormatter, datum.x, datum)}</td>
                  <td>{formatScatterValue(yFormatter, datum.y, datum)}</td>
                  <td>{Number.isFinite(datum.radius) ? formatScatterValue(radiusFormatter, datum.radius ?? 0, datum) : "n/a"}</td>
                  <td>{datum.group ?? "n/a"}</td>
                </tr>
              ))}
              {tableRows.hiddenCount > 0 ? (
                <tr>
                  <td colSpan={5}>Showing first {tableRows.items.length.toLocaleString()} of {safeData.length.toLocaleString()} points.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
      {legendRows && legendRows.items.length > 0 && !hasState ? (
        <div className="c-scatter-chart__legend" aria-label={`${svgTitle} legend`}>
          {legendRows.items.map((item, index) => (
            <span className="c-scatter-chart__legend-item" key={`${item.label}-legend-${index}`}>
              <span className="c-scatter-chart__legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="c-scatter-chart__legend-label">{item.label}</span>
            </span>
          ))}
          {legendRows.hiddenCount > 0 ? (
            <span className="c-scatter-chart__legend-more">+{legendRows.hiddenCount.toLocaleString()} more</span>
          ) : null}
        </div>
      ) : null}
    </ChartFrame>
  );
}
