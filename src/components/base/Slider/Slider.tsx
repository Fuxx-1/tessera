import { useId, type CSSProperties, type InputHTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type SliderRangeValue = [number, number];
export type SliderValue = number | SliderRangeValue;
export type SliderMark = {
  label?: ReactNode;
  value: number;
};
type SliderThumb = "single" | "start" | "end";

interface SliderBaseProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onChange" | "type" | "value"> {
  "aria-valuetext"?: string;
  error?: boolean;
  formatValue?: (value: number) => ReactNode;
  formatRangeValue?: (value: SliderRangeValue) => ReactNode;
  helpText?: ReactNode;
  label?: ReactNode;
  marks?: SliderMark[] | Record<number, ReactNode>;
  max?: number;
  min?: number;
  showValue?: boolean;
  step?: number | "any";
  tooltip?: boolean | "always";
  tooltipFormatter?: (value: number) => ReactNode;
}

export interface SliderSingleProps extends SliderBaseProps {
  ariaValueText?: (value: number, thumb: "single") => string;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  range?: false;
  value?: number;
}

export interface SliderRangeProps extends SliderBaseProps {
  ariaValueText?: (value: number, thumb: "start" | "end") => string;
  defaultValue?: SliderRangeValue;
  onValueChange?: (value: SliderRangeValue) => void;
  range: true;
  value?: SliderRangeValue;
}

export type SliderProps = SliderSingleProps | SliderRangeProps;

export function Slider({
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueTextProp,
  ariaValueText,
  className,
  defaultValue,
  disabled,
  error = false,
  formatValue,
  formatRangeValue,
  helpText,
  id,
  label,
  marks,
  max = 100,
  min = 0,
  onValueChange,
  range: isRange = false,
  showValue = true,
  step = 1,
  style,
  tooltip = false,
  tooltipFormatter,
  value,
  ...props
}: SliderProps) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const helpId = helpText ? `${sliderId}-help` : undefined;
  const labelId = label ? `${sliderId}-label` : undefined;
  const startLabelId = isRange && labelId ? `${sliderId}-start-label` : undefined;
  const endLabelId = isRange && labelId ? `${sliderId}-end-label` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const range = normalizeRange(min, max);
  const normalizedStep = normalizeStep(step);
  const fallbackValue = normalizeSliderValue(defaultValue ?? range.min, range, normalizedStep, isRange);
  const [currentValue, setValue] = useControllableState<SliderValue>({
    defaultValue: defaultValue === undefined ? undefined : normalizeSliderValue(defaultValue, range, normalizedStep, isRange),
    fallbackValue,
    onChange: onValueChange as ((nextValue: SliderValue) => void) | undefined,
    value: value === undefined ? undefined : normalizeSliderValue(value, range, normalizedStep, isRange),
  });
  const normalizedValue = normalizeSliderValue(currentValue, range, normalizedStep, isRange);
  const singleValue = Array.isArray(normalizedValue) ? normalizedValue[0] : normalizedValue;
  const rangeValue = Array.isArray(normalizedValue) ? normalizedValue : ([singleValue, singleValue] satisfies SliderRangeValue);
  const startPercent = toPercent(rangeValue[0], range);
  const endPercent = toPercent(rangeValue[1], range);
  const fillStart = isRange ? startPercent : 0;
  const fillEnd = isRange ? endPercent : toPercent(singleValue, range);
  const displayValue = isRange
    ? formatRangeValue
      ? formatRangeValue(rangeValue)
      : `${formatSingleValue(rangeValue[0], formatValue)} - ${formatSingleValue(rangeValue[1], formatValue)}`
    : formatSingleValue(singleValue, formatValue);
  const valueTextFormatter = ariaValueText as ((value: number, thumb: SliderThumb) => string) | undefined;
  const computedValueText = valueTextFormatter?.(singleValue, "single");
  const normalizedMarks = normalizeMarks(marks, range, normalizedStep);
  const tooltipMode = tooltip === true || tooltip === "always" ? tooltip : false;
  const hasMarks = normalizedMarks.length > 0;

  const updateSingleValue = (nextValue: number) => {
    setValue(normalizeValue(nextValue, range, normalizedStep));
  };

  const updateRangeValue = (thumb: "start" | "end", nextValue: number) => {
    const normalizedNextValue = normalizeValue(nextValue, range, normalizedStep);
    const nextRange: SliderRangeValue =
      thumb === "start"
        ? [Math.min(normalizedNextValue, rangeValue[1]), rangeValue[1]]
        : [rangeValue[0], Math.max(normalizedNextValue, rangeValue[0])];
    setValue(nextRange);
  };

  const getRangeInputLabelledBy = (thumbLabelId?: string) =>
    props["aria-label"] ? undefined : [labelId, thumbLabelId].filter(Boolean).join(" ") || undefined;

  const updateRangeValueFromTrack = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isRange || disabled || (event.pointerType === "mouse" && event.button !== 0) || event.target instanceof HTMLInputElement) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextValue = normalizeValue(range.min + ratio * (range.max - range.min), range, normalizedStep);
    const [start, end] = rangeValue;
    const startDistance = Math.abs(nextValue - start);
    const endDistance = Math.abs(nextValue - end);
    const thumb = startDistance === endDistance ? (nextValue <= (start + end) / 2 ? "start" : "end") : startDistance < endDistance ? "start" : "end";

    updateRangeValue(thumb, nextValue);
    window.requestAnimationFrame(() => document.getElementById(`${sliderId}-${thumb}`)?.focus());
  };

  return (
    <div className={cx("c-slider-field", error && "c-slider-field--error", disabled && "c-slider-field--disabled", className)}>
      <span className="c-slider-field__header">
        {label ? (
          <span className="c-field__label" id={labelId}>
            {label}
          </span>
        ) : null}
        {showValue ? <span className="c-slider-field__value">{displayValue}</span> : null}
      </span>

      <div
        className={cx("c-slider-control", isRange && "c-slider-control--range", tooltipMode && "c-slider-control--tooltip", hasMarks && "c-slider-control--with-marks")}
        style={
          {
            ...style,
            "--c-slider-fill-start": `${fillStart}%`,
            "--c-slider-fill-end": `${fillEnd}%`,
          } as CSSProperties
        }
        onPointerDown={isRange ? updateRangeValueFromTrack : undefined}
      >
        {isRange ? (
          <>
            {startLabelId ? (
              <span className="c-sr-only" id={startLabelId}>
                start value
              </span>
            ) : null}
            {endLabelId ? (
              <span className="c-sr-only" id={endLabelId}>
                end value
              </span>
            ) : null}
            <input
              {...props}
              aria-describedby={describedBy}
              aria-invalid={error || undefined}
              aria-label={props["aria-label"] ? `${props["aria-label"]} start` : undefined}
              aria-labelledby={getRangeInputLabelledBy(startLabelId)}
              aria-valuetext={ariaValueTextProp ?? valueTextFormatter?.(rangeValue[0], "start")}
              className="c-slider c-slider--range-start"
              disabled={disabled}
              id={`${sliderId}-start`}
              max={range.max}
              min={range.min}
              onChange={(event) => updateRangeValue("start", Number(event.currentTarget.value))}
              step={normalizedStep}
              type="range"
              value={rangeValue[0]}
            />
            <input
              {...props}
              aria-describedby={describedBy}
              aria-invalid={error || undefined}
              aria-label={props["aria-label"] ? `${props["aria-label"]} end` : undefined}
              aria-labelledby={getRangeInputLabelledBy(endLabelId)}
              aria-valuetext={ariaValueTextProp ?? valueTextFormatter?.(rangeValue[1], "end")}
              className="c-slider c-slider--range-end"
              disabled={disabled}
              id={`${sliderId}-end`}
              max={range.max}
              min={range.min}
              onChange={(event) => updateRangeValue("end", Number(event.currentTarget.value))}
              step={normalizedStep}
              type="range"
              value={rangeValue[1]}
            />
            {tooltipMode ? <SliderTooltip percent={startPercent} value={formatTooltipValue(rangeValue[0], tooltipFormatter, formatValue)} /> : null}
            {tooltipMode ? <SliderTooltip percent={endPercent} value={formatTooltipValue(rangeValue[1], tooltipFormatter, formatValue)} /> : null}
          </>
        ) : (
          <>
            <input
              {...props}
              aria-describedby={describedBy}
              aria-invalid={error || undefined}
              aria-labelledby={props["aria-label"] ? undefined : labelId}
              aria-valuetext={ariaValueTextProp ?? computedValueText}
              className="c-slider"
              disabled={disabled}
              id={sliderId}
              max={range.max}
              min={range.min}
              onChange={(event) => updateSingleValue(Number(event.currentTarget.value))}
              step={normalizedStep}
              type="range"
              value={singleValue}
            />
            {tooltipMode ? <SliderTooltip percent={fillEnd} value={formatTooltipValue(singleValue, tooltipFormatter, formatValue)} /> : null}
          </>
        )}

        {hasMarks ? (
          <div className="c-slider-marks" aria-hidden="true">
            {normalizedMarks.map((mark) => (
              <span className="c-slider-mark" key={mark.value} style={getPositionedStyle(toPercent(mark.value, range), "mark")}>
                <span className="c-slider-mark__dot" />
                {mark.label !== undefined ? <span className="c-slider-mark__label">{mark.label}</span> : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {helpText ? (
        <span className={cx("c-field__hint", error && "c-field__hint--error")} id={helpId}>
          {helpText}
        </span>
      ) : null}
    </div>
  );
}

type NormalizedRange = {
  min: number;
  max: number;
};

function normalizeRange(min: number, max: number): NormalizedRange {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 100 };
  }

  return min <= max ? { min, max } : { min: max, max: min };
}

function normalizeStep(step: number | "any" | undefined) {
  if (step === "any") {
    return step;
  }

  return typeof step === "number" && Number.isFinite(step) && step > 0 ? step : 1;
}

function normalizeValue(value: number, range: NormalizedRange, step: number | "any") {
  const finiteValue = Number.isFinite(value) ? value : range.min;
  const clampedValue = Math.min(range.max, Math.max(range.min, finiteValue));

  if (step === "any" || step <= 0) {
    return clampedValue;
  }

  const decimals = getDecimalPlaces(step);
  const steppedValue = range.min + Math.round((clampedValue - range.min) / step) * step;
  return Number(Math.min(range.max, Math.max(range.min, steppedValue)).toFixed(decimals));
}

function normalizeSliderValue(value: SliderValue, range: NormalizedRange, step: number | "any", isRange: boolean): SliderValue {
  if (!isRange) {
    return normalizeValue(Array.isArray(value) ? value[0] : value, range, step);
  }

  const rawStart = Array.isArray(value) ? value[0] : range.min;
  const rawEnd = Array.isArray(value) ? value[1] : value;
  const start = normalizeValue(rawStart, range, step);
  const end = normalizeValue(rawEnd, range, step);
  return start <= end ? [start, end] : [end, start];
}

function normalizeMarks(marks: SliderBaseProps["marks"], range: NormalizedRange, step: number | "any") {
  const entries = Array.isArray(marks)
    ? marks
    : Object.entries(marks ?? {}).map(([value, label]) => ({ label, value: Number(value) }));

  return entries
    .map((mark) => ({ ...mark, value: normalizeValue(mark.value, range, step) }))
    .filter((mark, index, list) => list.findIndex((item) => item.value === mark.value) === index)
    .sort((a, b) => a.value - b.value);
}

function toPercent(value: number, range: NormalizedRange) {
  return range.max === range.min ? 0 : ((value - range.min) / (range.max - range.min)) * 100;
}

function formatSingleValue(value: number, formatValue: SliderBaseProps["formatValue"]) {
  return formatValue ? formatValue(value) : value;
}

function formatTooltipValue(value: number, tooltipFormatter: SliderBaseProps["tooltipFormatter"], formatValue: SliderBaseProps["formatValue"]) {
  if (tooltipFormatter) {
    return tooltipFormatter(value);
  }

  return formatSingleValue(value, formatValue);
}

function SliderTooltip({ percent, value }: { percent: number; value: ReactNode }) {
  return (
    <span className="c-slider-tooltip" style={getPositionedStyle(percent, "tooltip")}>
      {value}
    </span>
  );
}

function getPositionedStyle(percent: number, kind: "mark" | "tooltip") {
  const boundedPercent = Math.min(100, Math.max(0, percent));
  const isStartEdge = boundedPercent <= 0;
  const isEndEdge = boundedPercent >= 100;
  const positionName = kind === "mark" ? "--c-slider-mark-position" : "--c-slider-tooltip-position";
  const translateName = kind === "mark" ? "--c-slider-mark-translate" : "--c-slider-tooltip-translate";
  const arrowName = "--c-slider-tooltip-arrow-left";

  return {
    [positionName]: `${boundedPercent}%`,
    [translateName]: isStartEdge ? "0%" : isEndEdge ? "-100%" : "-50%",
    ...(kind === "tooltip" ? { [arrowName]: isStartEdge ? "10px" : isEndEdge ? "calc(100% - 10px)" : "50%" } : {}),
  } as CSSProperties;
}

function getDecimalPlaces(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return decimals.length;
}
