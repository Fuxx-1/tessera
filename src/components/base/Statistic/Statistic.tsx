import { useEffect, useId, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type StatisticTrend = "up" | "down" | "flat" | "positive" | "negative";
export type StatisticTone = "neutral" | "positive" | "warning" | "critical";
export type StatisticSize = "sm" | "md" | "lg";

export type StatisticCountdownTarget = number | string | Date;

export interface StatisticCountdownOptions {
  target: StatisticCountdownTarget;
  format?: "auto" | "clock" | "short";
  now?: () => number;
  onFinish?: () => void;
}

export interface StatisticCountupOptions {
  from?: number;
  duration?: number;
  startOnMount?: boolean;
}

export interface StatisticProps extends Omit<HTMLAttributes<HTMLElement>, "prefix" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  value?: number | string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  precision?: number;
  trend?: StatisticTrend;
  tone?: StatisticTone;
  size?: StatisticSize;
  groupSeparator?: string;
  decimalSeparator?: string;
  formatter?: (value: number | string) => ReactNode;
  formatValue?: (value: number | string) => ReactNode;
  valueStyle?: CSSProperties;
  valueLabel?: string;
  countup?: boolean | StatisticCountupOptions;
  countdown?: StatisticCountdownOptions;
  loading?: boolean;
  loadingLabel?: string;
  empty?: ReactNode;
}

const SAFE_DECIMAL_NUMBER_PATTERN = /^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?|\.\d+)$/;

function clampPrecision(precision: number | undefined) {
  if (precision === undefined) return undefined;
  if (!Number.isFinite(precision)) return 0;
  return Math.min(Math.max(Math.floor(precision), 0), 12);
}

function parseNumericValue(value: number | string | undefined) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return undefined;
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const trimmedValue = value.trim();
    if (!SAFE_DECIMAL_NUMBER_PATTERN.test(trimmedValue)) return undefined;
    const normalizedValue = trimmedValue.replace(/,/g, "");
    const parsed = Number(normalizedValue);
    if (Math.abs(parsed) > Number.MAX_SAFE_INTEGER) return undefined;
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function formatNumericValue(
  value: number,
  precision: number | undefined,
  groupSeparator: string,
  decimalSeparator: string,
) {
  const fixedValue = precision === undefined ? String(value) : value.toFixed(precision);
  const [integerPart = "0", decimalPart] = fixedValue.split(".");
  const sign = integerPart.startsWith("-") ? "-" : "";
  const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
  const groupedInteger = unsignedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);

  return `${sign}${groupedInteger}${decimalPart !== undefined ? `${decimalSeparator}${decimalPart}` : ""}`;
}

function formatPrimitiveValue(
  value: number | string,
  precision: number | undefined,
  groupSeparator: string,
  decimalSeparator: string,
) {
  const numericValue = parseNumericValue(value);
  if (numericValue !== undefined) {
    return formatNumericValue(numericValue, precision, groupSeparator, decimalSeparator);
  }
  return value;
}

function parseCountdownTarget(target: StatisticCountdownTarget) {
  if (target instanceof Date) return target.getTime();
  if (typeof target === "number") return target;
  const parsed = Date.parse(target);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function formatCountdownValue(remainingMs: number, format: StatisticCountdownOptions["format"] = "auto") {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (format === "short") {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  if (format === "clock" || days === 0) {
    return `${days > 0 ? `${days}d ` : ""}${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
  }

  return `${days}d ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
}

function resolveCountupOptions(countup: StatisticProps["countup"]): Required<StatisticCountupOptions> | undefined {
  if (!countup) return undefined;
  if (countup === true) {
    return { duration: 900, from: 0, startOnMount: true };
  }

  return {
    duration: Math.max(countup.duration ?? 900, 0),
    from: countup.from ?? 0,
    startOnMount: countup.startOnMount ?? true,
  };
}

export function Statistic({
  className,
  countdown,
  countup,
  decimalSeparator = ".",
  description,
  empty = "No value",
  formatter,
  formatValue,
  groupSeparator = ",",
  loading = false,
  loadingLabel = "Loading statistic",
  prefix,
  precision,
  size = "md",
  suffix,
  title,
  tone = "neutral",
  trend,
  value,
  valueStyle,
  valueLabel,
  ...props
}: StatisticProps) {
  const titleId = useId();
  const descriptionId = useId();
  const clampedPrecision = clampPrecision(precision);
  const numericValue = parseNumericValue(value);
  const countupOptions = useMemo(() => resolveCountupOptions(countup), [countup]);
  const [animatedValue, setAnimatedValue] = useState(() => countupOptions?.from ?? numericValue ?? 0);
  const countdownFormat = countdown?.format;
  const countdownNowGetter = countdown?.now;
  const countdownOnFinish = countdown?.onFinish;
  const countdownTarget = countdown?.target;
  const [countdownNow, setCountdownNow] = useState(() => countdownNowGetter?.() ?? Date.now());
  const targetTime = useMemo(
    () => (countdownTarget !== undefined ? parseCountdownTarget(countdownTarget) : undefined),
    [countdownTarget],
  );
  const remainingMs = countdown && targetTime !== undefined ? Math.max(0, targetTime - countdownNow) : undefined;
  const hasNonFiniteNumber = typeof value === "number" && !Number.isFinite(value);

  useEffect(() => {
    if (!countupOptions || numericValue === undefined || !countupOptions.startOnMount) {
      if (numericValue !== undefined) setAnimatedValue(numericValue);
      return;
    }

    if (countupOptions.duration === 0) {
      setAnimatedValue(numericValue);
      return;
    }

    let animationFrame = 0;
    const startedAt = performance.now();
    const startValue = countupOptions.from;
    const delta = numericValue - startValue;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / countupOptions.duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(startValue + delta * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    setAnimatedValue(startValue);
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [countupOptions?.duration, countupOptions?.from, countupOptions?.startOnMount, numericValue]);

  useEffect(() => {
    if (!countdown || targetTime === undefined || !Number.isFinite(targetTime)) return;

    let finished = false;
    const update = () => {
      const now = countdownNowGetter?.() ?? Date.now();
      setCountdownNow(now);
      if (!finished && targetTime - now <= 0) {
        finished = true;
        countdownOnFinish?.();
      }
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [countdown, countdownNowGetter, countdownOnFinish, targetTime]);

  const isEmpty = !loading && !countdown && (value === undefined || value === null || value === "" || hasNonFiniteNumber);
  const resolvedFormatter = formatter ?? formatValue;
  const displayValue = useMemo(() => {
    if (countdown) {
      return Number.isFinite(remainingMs ?? Number.NaN) ? formatCountdownValue(remainingMs ?? 0, countdownFormat) : empty;
    }

    if (isEmpty || value === undefined) {
      return empty;
    }

    if (resolvedFormatter) {
      return resolvedFormatter(value);
    }

    if (countupOptions && numericValue !== undefined) {
      return formatNumericValue(animatedValue, clampedPrecision, groupSeparator, decimalSeparator);
    }

    return formatPrimitiveValue(value, clampedPrecision, groupSeparator, decimalSeparator);
  }, [
    animatedValue,
    clampedPrecision,
    countdown,
    countdownFormat,
    countupOptions,
    decimalSeparator,
    empty,
    groupSeparator,
    isEmpty,
    numericValue,
    remainingMs,
    resolvedFormatter,
    value,
  ]);

  const computedValueLabel =
    valueLabel ??
    (typeof displayValue === "string" || typeof displayValue === "number"
      ? [prefix, displayValue, suffix].filter((part) => typeof part === "string" || typeof part === "number").join(" ")
      : undefined);
  const describedBy = description ? descriptionId : undefined;
  const labelledBy = title ? titleId : undefined;

  return (
    <section
      aria-busy={loading || undefined}
      aria-describedby={describedBy}
      aria-labelledby={labelledBy}
      className={cx(
        "c-statistic",
        `c-statistic--${size}`,
        `c-statistic--${tone}`,
        trend && `c-statistic--trend-${trend}`,
        loading && "c-statistic--loading",
        isEmpty && "c-statistic--empty",
        className,
      )}
      {...props}
    >
      {title ? (
        <span className="c-statistic__title" id={titleId}>
          {title}
        </span>
      ) : null}
      {description ? (
        <p className="c-statistic__description" id={descriptionId}>
          {description}
        </p>
      ) : null}

      {loading ? (
        <div className="c-statistic__skeleton" role="status" aria-label={loadingLabel}>
          <span />
          <span />
        </div>
      ) : (
        <output
          aria-label={computedValueLabel}
          aria-live={countdown ? "polite" : undefined}
          className="c-statistic__output"
          role={countdown ? "timer" : undefined}
          title={typeof computedValueLabel === "string" ? computedValueLabel : undefined}
        >
          {trend ? <span className="c-statistic__trend-icon" aria-hidden="true" /> : null}
          {prefix ? <span className="c-statistic__prefix">{prefix}</span> : null}
          <span className="c-statistic__value" style={valueStyle}>{displayValue}</span>
          {suffix ? <span className="c-statistic__suffix">{suffix}</span> : null}
        </output>
      )}
    </section>
  );
}
