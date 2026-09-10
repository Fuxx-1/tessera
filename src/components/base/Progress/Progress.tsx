import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

type ProgressStatus = "active" | "success" | "warning" | "error" | "exception";
type ProgressType = "line" | "circle" | "dashboard";
type ProgressSize = "sm" | "md" | "lg";
type ProgressStrokeColor = string | { from?: string; to?: string; "0%"?: string; "100%"?: string };

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML"> {
  shape?: ProgressType;
  type?: ProgressType;
  percent?: number;
  value?: number;
  max?: number;
  label?: ReactNode;
  indeterminate?: boolean;
  showValue?: boolean;
  size?: ProgressSize;
  status?: ProgressStatus;
  steps?: number;
  format?: (percent: number, value: number, max: number) => ReactNode;
  formatValue?: (value: number, max: number) => ReactNode;
  strokeColor?: ProgressStrokeColor;
}

type InternalProgressProps = ProgressProps & {
  dangerouslySetInnerHTML?: never;
};

function normalizeProgress(value: number, max: number) {
  const normalizedMax = Number.isFinite(max) && max > 0 ? max : 100;
  const finiteValue = Number.isFinite(value) ? value : 0;
  const boundedValue = Math.min(Math.max(finiteValue, 0), normalizedMax);

  return {
    boundedValue,
    max: normalizedMax,
    ratio: boundedValue / normalizedMax,
  };
}

function getTextValue(content: ReactNode, fallback: string) {
  if (typeof content === "string") return content;
  if (typeof content === "number") return String(content);
  return fallback;
}

function getStrokeColorStyle(strokeColor: ProgressStrokeColor | undefined) {
  if (!strokeColor) return {};
  if (typeof strokeColor === "string") {
    return {
      "--progress-stroke-color": strokeColor,
      "--progress-stroke-fill": strokeColor,
    } as CSSProperties;
  }

  const from = strokeColor.from ?? strokeColor["0%"];
  const to = strokeColor.to ?? strokeColor["100%"] ?? from;

  if (!from && !to) return {};

  return {
    "--progress-stroke-color": to ?? from,
    "--progress-stroke-fill": from && to && from !== to ? `linear-gradient(90deg, ${from}, ${to})` : (to ?? from),
  } as CSSProperties;
}

export function Progress({
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  className,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  format,
  formatValue,
  indeterminate = false,
  label,
  max = 100,
  percent: percentProp,
  showValue = true,
  shape,
  size = "md",
  steps,
  status = "active",
  strokeColor,
  style,
  type,
  value = 0,
  ...props
}: InternalProgressProps) {
  const usesPercent = typeof percentProp === "number";
  const normalized = normalizeProgress(usesPercent ? percentProp : value, usesPercent ? 100 : max);
  const ratio = normalized.ratio;
  const percent = Math.round(ratio * 100);
  const fallbackValueText = indeterminate ? "In progress" : `${percent}%`;
  const valueContent = indeterminate
    ? fallbackValueText
    : format
      ? format(percent, normalized.boundedValue, normalized.max)
      : formatValue
        ? formatValue(normalized.boundedValue, normalized.max)
        : fallbackValueText;
  const valueText = ariaValueText ?? getTextValue(valueContent, fallbackValueText);
  const progressStyle = {
    "--progress-value": `${percent}%`,
    ...getStrokeColorStyle(strokeColor),
    ...style,
  } as CSSProperties;
  const progressType = type ?? shape ?? "line";
  const visualStatus = status === "exception" ? "error" : status;
  const stepCount = Number.isFinite(steps) && steps && steps > 1 ? Math.min(20, Math.floor(steps)) : 0;
  const filledSteps = indeterminate || !stepCount ? 0 : Math.round(ratio * stepCount);
  const circleRadius = 44;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const dashboardGap = progressType === "dashboard" ? circleCircumference * 0.24 : 0;
  const circleArc = circleCircumference - dashboardGap;
  const circleOffset = circleArc * (1 - ratio);
  const circleDasharray = `${circleArc} ${circleCircumference}`;
  const circleTransform = progressType === "dashboard" ? "rotate(133 50 50)" : undefined;

  return (
    <div
      {...props}
      aria-busy={indeterminate || status === "active" ? true : undefined}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      aria-valuemax={indeterminate ? undefined : normalized.max}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuenow={indeterminate ? undefined : normalized.boundedValue}
      aria-valuetext={valueText}
      className={cx(
        "c-progress",
        `c-progress--${progressType}`,
        `c-progress--${visualStatus}`,
        status === "exception" && "c-progress--exception",
        `c-progress--${size}`,
        indeterminate && "c-progress--indeterminate",
        stepCount && progressType === "line" && "c-progress--steps",
        className,
      )}
      role="progressbar"
      style={progressStyle}
    >
      {progressType === "circle" || progressType === "dashboard" ? (
        <div className="c-progress__circle">
          <svg aria-hidden="true" className="c-progress__circle-svg" focusable="false" viewBox="0 0 100 100">
            <circle
              className="c-progress__circle-track"
              cx="50"
              cy="50"
              r={circleRadius}
              strokeDasharray={circleDasharray}
              transform={circleTransform}
            />
            <g className="c-progress__circle-bar-spin">
              <circle
                className="c-progress__circle-bar"
                cx="50"
                cy="50"
                r={circleRadius}
                strokeDasharray={circleDasharray}
                strokeDashoffset={circleOffset}
                transform={circleTransform}
              />
            </g>
          </svg>
          {showValue ? <span className="c-progress__circle-value">{valueContent}</span> : null}
          {label ? <span className="c-progress__circle-label">{label}</span> : null}
        </div>
      ) : (
        <>
          {label || showValue ? (
            <div className="c-progress__meta">
              {label ? <span>{label}</span> : null}
              {showValue ? <span>{valueContent}</span> : null}
            </div>
          ) : null}
          <div className="c-progress__track">
            {stepCount && !indeterminate ? (
              Array.from({ length: stepCount }, (_, index) => (
                <span
                  aria-hidden="true"
                  className={cx("c-progress__step", index < filledSteps && "c-progress__step--filled")}
                  key={index}
                />
              ))
            ) : (
              <span className="c-progress__bar" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
