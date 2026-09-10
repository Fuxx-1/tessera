import { useId } from "react";
import "./styles/gauge.css";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors, isSafeChartColor } from "./palette";
import type { ChartBaseProps } from "./types";
import { cx } from "../../utils/cx";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  getChartA11yTitle,
  limitText,
  normalizeFiniteValue,
  normalizeNumericDomain,
  polarToCartesian,
  sanitizeDimension,
  sanitizeNumber,
} from "./utils";

export type GaugeChartSegment = {
  label?: string;
  from: number;
  to: number;
  color?: string;
};

export type GaugeChartThreshold = {
  label?: string;
  value: number;
  color?: string;
};

export interface GaugeChartProps extends Omit<ChartBaseProps, "data"> {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  segments?: GaugeChartSegment[];
  thresholds?: GaugeChartThreshold[];
  height?: number;
  colors?: string[];
  showValue?: boolean;
}

type NormalizedSegment = Required<Pick<GaugeChartSegment, "from" | "to">> & {
  label: string;
  displayLabel: string;
  color: string;
};

type NormalizedThreshold = Required<Pick<GaugeChartThreshold, "value">> & {
  label: string;
  displayLabel: string;
  color: string;
};

type GaugeDomain = ReturnType<typeof normalizeNumericDomain>;

const gaugeStartAngle = -118;
const gaugeEndAngle = 118;
const gaugeSpan = gaugeEndAngle - gaugeStartAngle;
const defaultGaugeSegments: GaugeChartSegment[] = [
  { label: "Low", from: 0, to: 50, color: "#9b6a4e" },
  { label: "Target", from: 50, to: 80, color: "#b48639" },
  { label: "High", from: 80, to: 100, color: "#66715e" },
];

function normalizeGaugeDomain(min: number | undefined, max: number | undefined): GaugeDomain {
  return normalizeNumericDomain(min, max, [0, 100]);
}

function normalizeGaugeValue(value: number, domain: GaugeDomain) {
  return normalizeFiniteValue(value, domain);
}

function valueToRatio(value: number, domain: GaugeDomain) {
  return clampNumber((value - domain.min) / (domain.max - domain.min || 1), 0, 1);
}

function valueToAngle(value: number, domain: GaugeDomain) {
  return gaugeStartAngle + valueToRatio(value, domain) * gaugeSpan;
}

function createGaugeArcPath(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const safeRadius = Math.max(0, sanitizeNumber(radius, 0));
  const safeStart = Math.min(sanitizeNumber(startAngle, gaugeStartAngle), sanitizeNumber(endAngle, gaugeEndAngle));
  const safeEnd = Math.max(sanitizeNumber(startAngle, gaugeStartAngle), sanitizeNumber(endAngle, gaugeEndAngle));

  if (safeRadius <= 0 || safeStart === safeEnd) {
    return "";
  }

  const start = polarToCartesian(centerX, centerY, safeRadius, safeStart);
  const end = polarToCartesian(centerX, centerY, safeRadius, safeEnd);
  const largeArcFlag = safeEnd - safeStart <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${safeRadius} ${safeRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function createDefaultGaugeSegments(domain: GaugeDomain): GaugeChartSegment[] {
  const span = domain.max - domain.min;

  return defaultGaugeSegments.map((segment) => ({
    ...segment,
    from: domain.min + (segment.from / 100) * span,
    to: domain.min + (segment.to / 100) * span,
  }));
}

function normalizeGaugeSegments(
  segments: GaugeChartSegment[] | undefined,
  domain: GaugeDomain,
  colors: string[],
): NormalizedSegment[] {
  const sourceSegments = segments && segments.length > 0 ? segments : createDefaultGaugeSegments(domain);
  const normalizedSegments = sourceSegments
    .map((segment, index) => {
      if (!Number.isFinite(segment.from) || !Number.isFinite(segment.to)) {
        return null;
      }

      const segmentColor = segment.color;
      const from = clampNumber(segment.from, domain.min, domain.max);
      const to = clampNumber(segment.to, domain.min, domain.max);
      const start = Math.min(from, to);
      const end = Math.max(from, to);

      if (start === end) {
        return null;
      }

      const fallbackColor = colors[index % colors.length] ?? chartSeriesColors[0] ?? "#6b7280";
      const fallbackLabel = `Segment ${index + 1}`;
      const safeLabel = limitText(segment.label, fallbackLabel, 72);

      return {
        from: start,
        to: end,
        label: safeLabel,
        displayLabel: limitText(safeLabel, fallbackLabel, 18),
        color: typeof segmentColor === "string" && isSafeChartColor(segmentColor) ? segmentColor.trim() : fallbackColor,
      };
    })
    .filter((segment): segment is NormalizedSegment => segment !== null)
    .sort((first, second) => first.from - second.from || first.to - second.to);

  return normalizedSegments.length > 0 || !segments ? normalizedSegments : normalizeGaugeSegments(undefined, domain, colors);
}

function normalizeGaugeThresholds(
  thresholds: GaugeChartThreshold[] | undefined,
  domain: GaugeDomain,
  fallbackColor: string,
): NormalizedThreshold[] {
  return (thresholds ?? [])
    .map((threshold, index) => {
      const thresholdColor = threshold.color;
      if (!Number.isFinite(threshold.value)) {
        return null;
      }

      return {
        value: clampNumber(threshold.value, domain.min, domain.max),
        label: limitText(threshold.label, `Threshold ${index + 1}`, 72),
        displayLabel: limitText(threshold.label, `T${index + 1}`, 16),
        color: typeof thresholdColor === "string" && isSafeChartColor(thresholdColor) ? thresholdColor.trim() : fallbackColor,
      };
    })
    .filter((threshold): threshold is NormalizedThreshold => threshold !== null);
}

function getGaugeSummary(
  label: string,
  valueLabel: string,
  value: number,
  domain: GaugeDomain,
  segments: NormalizedSegment[],
  thresholds: NormalizedThreshold[],
  valueFormatter: GaugeChartProps["valueFormatter"],
) {
  const activeSegment = segments.find((segment) =>
    value === domain.max ? segment.from <= value && value <= segment.to : segment.from <= value && value < segment.to,
  );
  const segmentText = activeSegment
    ? ` Current range is ${activeSegment.label}.`
    : "";
  const thresholdText =
    thresholds.length > 0
      ? ` Thresholds: ${thresholds.map((threshold) => `${threshold.label} at ${formatDatum(valueFormatter, threshold.value)}`).join(", ")}.`
      : "";

  return `${label} is ${valueLabel}, on a gauge from ${formatDatum(valueFormatter, domain.min)} to ${formatDatum(
    valueFormatter,
    domain.max,
  )}.${segmentText}${thresholdText}`;
}

export function GaugeChart({
  className,
  colors = chartSeriesColors,
  emptyText,
  error,
  height = 260,
  label,
  loading,
  loadingText,
  max,
  min,
  segments,
  showValue = true,
  summary,
  thresholds,
  title,
  value,
  valueFormatter,
  ...props
}: GaugeChartProps) {
  const titleId = useId();
  const descId = useId();
  const meterLabelId = useId();
  const meterDescId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 260, 190, 520);
  const domain = normalizeGaugeDomain(min, max);
  const safeValue = normalizeGaugeValue(value, domain);
  const isEmpty = safeValue === null;
  const hasState = loading || error || isEmpty;
  const safeColors = getSafeChartColors(colors, chartSeriesColors);
  const safeSegments = normalizeGaugeSegments(segments, domain, safeColors);
  const safeThresholds = normalizeGaugeThresholds(thresholds, domain, safeColors[0] ?? chartSeriesColors[0]);
  const centerX = width / 2;
  const centerY = safeHeight - 54;
  const radius = Math.max(70, Math.min(190, safeHeight - 94));
  const strokeWidth = Math.max(16, Math.min(28, radius * 0.14));
  const renderValue = safeValue ?? domain.min;
  const indicatorAngle = valueToAngle(renderValue, domain);
  const indicatorPoint = polarToCartesian(centerX, centerY, radius - strokeWidth / 2, indicatorAngle);
  const valueLabel = safeValue === null ? "n/a" : formatDatum(valueFormatter, safeValue);
  const chartLabel = limitText(label || title, "Gauge value", 64);
  const svgTitle = getChartA11yTitle(title || label, "Gauge chart");
  const generatedSummary = isEmpty
    ? `${chartLabel} has no finite gauge value, on a gauge from ${formatDatum(valueFormatter, domain.min)} to ${formatDatum(
        valueFormatter,
        domain.max,
      )}.`
    : getGaugeSummary(chartLabel, valueLabel, safeValue, domain, safeSegments, safeThresholds, valueFormatter);
  const svgSummary = summary ?? generatedSummary;

  return (
    <ChartFrame
      className={cx("c-gauge-chart", className)}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      summary={svgSummary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--gauge"
        data-gauge-value={safeValue ?? undefined}
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-gauge-chart__track">
          <path d={createGaugeArcPath(centerX, centerY, radius, gaugeStartAngle, gaugeEndAngle)} pathLength={100} />
        </g>
        <g className="c-gauge-chart__segments">
          {safeSegments.map((segment, index) => (
            <path
              d={createGaugeArcPath(centerX, centerY, radius, valueToAngle(segment.from, domain), valueToAngle(segment.to, domain))}
              key={`${segment.label}-${index}`}
              pathLength={100}
              style={{ stroke: segment.color, strokeWidth }}
            >
              <title>{`${segment.label}: ${formatDatum(valueFormatter, segment.from)} to ${formatDatum(valueFormatter, segment.to)}`}</title>
            </path>
          ))}
        </g>
        <g className="c-gauge-chart__thresholds">
          {safeThresholds.map((threshold, index) => {
            const angle = valueToAngle(threshold.value, domain);
            const outer = polarToCartesian(centerX, centerY, radius + strokeWidth * 0.5, angle);
            const inner = polarToCartesian(centerX, centerY, radius - strokeWidth * 0.78, angle);
            const text = polarToCartesian(centerX, centerY, radius + 26, angle);

            return (
              <g key={`${threshold.label}-${index}`}>
                <line x1={inner.x} x2={outer.x} y1={inner.y} y2={outer.y} style={{ stroke: threshold.color }} />
                <text x={text.x} y={text.y}>
                  <title>{`${threshold.label}: ${formatDatum(valueFormatter, threshold.value)}`}</title>
                  {threshold.displayLabel}
                </text>
              </g>
            );
          })}
        </g>
        <line
          className="c-gauge-chart__needle"
          x1={centerX}
          x2={indicatorPoint.x}
          y1={centerY}
          y2={indicatorPoint.y}
        >
          <title>{`${chartLabel}: ${valueLabel}`}</title>
        </line>
        <circle className="c-gauge-chart__hub" cx={centerX} cy={centerY} r={strokeWidth * 0.45} />
        <g className="c-gauge-chart__labels">
          <text x={centerX - radius} y={centerY + 30}>
            {formatDatum(valueFormatter, domain.min)}
          </text>
          <text x={centerX + radius} y={centerY + 30}>
            {formatDatum(valueFormatter, domain.max)}
          </text>
          {showValue ? (
            <text className="c-gauge-chart__value" x={centerX} y={centerY - 18}>
              {valueLabel}
            </text>
          ) : null}
          <text className="c-gauge-chart__label" x={centerX} y={centerY + 28}>
            {chartLabel}
          </text>
        </g>
      </svg>
      <div
        aria-describedby={hasState ? undefined : meterDescId}
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : meterLabelId}
        aria-valuemax={hasState ? undefined : domain.max}
        aria-valuemin={hasState ? undefined : domain.min}
        aria-valuenow={hasState || safeValue === null ? undefined : safeValue}
        aria-valuetext={hasState ? undefined : `${chartLabel}: ${valueLabel}`}
        className="c-gauge-chart__meter"
        role="meter"
      >
        <span id={meterLabelId}>{chartLabel}</span>
        <span id={meterDescId}>{svgSummary}</span>
      </div>
    </ChartFrame>
  );
}
