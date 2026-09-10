import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type TimePickerValue = string;
export type TimePickerChangeSource = "input" | "panel" | "step" | "blur" | "clear";
export type TimePickerFormatMode = "12h" | "24h";

export type TimePickerDisabledTimeInfo = {
  hour: number;
  minute: number;
  second: number;
  totalSeconds: number;
  value: TimePickerValue;
};

export type TimePickerChangeInfo = {
  source: TimePickerChangeSource;
  seconds: number | null;
};

export interface TimePickerProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "defaultValue" | "max" | "min" | "onChange" | "step" | "type" | "value"
  > {
  defaultValue?: TimePickerValue;
  allowClear?: boolean;
  disabledTime?: (time: TimePickerDisabledTimeInfo) => boolean;
  error?: boolean;
  errorText?: ReactNode;
  formatMode?: TimePickerFormatMode;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  max?: TimePickerValue;
  min?: TimePickerValue;
  nativeFallback?: boolean | "auto";
  onValueChange?: (value: TimePickerValue, info: TimePickerChangeInfo) => void;
  placeholder?: string;
  showSeconds?: boolean;
  step?: number;
  value?: TimePickerValue;
}

const daySeconds = 24 * 60 * 60;
type TimePickerOption = { disabled: boolean; seconds: number; value: string };

export function TimePicker({
  allowClear = true,
  className,
  defaultValue,
  disabled,
  disabledTime,
  error = false,
  errorText,
  formatMode = "24h",
  helpText,
  hint,
  id,
  label,
  max,
  min,
  nativeFallback = false,
  onValueChange,
  placeholder,
  readOnly,
  showSeconds = false,
  step = 60,
  value,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: TimePickerProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const panelId = `${inputId}-panel`;
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${inputId}-help` : undefined;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const safeStep = normalizeStep(step);
  const format = showSeconds ? "seconds" : "minutes";
  const minSeconds = parseTimeToSeconds(min);
  const maxSeconds = parseTimeToSeconds(max);
  const normalizedValue = value === "" ? "" : normalizeTimeValue(value, { format, maxSeconds, minSeconds });
  const [currentValue, setCurrentValue] = useControllableState<TimePickerValue>({
    defaultValue: normalizeTimeValue(defaultValue, { format, maxSeconds, minSeconds }),
    fallbackValue: "",
    value: normalizedValue,
  });
  const [inputText, setInputText] = useState(formatDisplayValue(currentValue, formatMode, format));
  const [isOpen, setIsOpen] = useState(false);
  const [isNativeMode, setIsNativeMode] = useState(formatMode === "24h" && nativeFallback === true);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canEdit = !disabled && !readOnly;
  const canUseNativeMode = formatMode === "24h" && !disabledTime;
  const nativeStep = showSeconds ? safeStep : Math.max(60, safeStep);

  useEffect(() => {
    setInputText(formatDisplayValue(currentValue, formatMode, format));
  }, [currentValue, format, formatMode]);

  useEffect(() => {
    if (!isOpen || isNativeMode || !canEdit || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
      commitInput(inputRef.current?.value ?? inputText, "blur");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [canEdit, inputText, isNativeMode, isOpen]);

  useEffect(() => {
    if (!canUseNativeMode) {
      setIsNativeMode(false);
      return;
    }

    if (nativeFallback !== "auto") {
      setIsNativeMode(nativeFallback);
      return;
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsNativeMode(false);
      return;
    }

    const query = window.matchMedia("(pointer: coarse), (max-width: 640px)");
    const updateNativeMode = () => setIsNativeMode(query.matches);
    updateNativeMode();
    query.addEventListener?.("change", updateNativeMode);
    return () => query.removeEventListener?.("change", updateNativeMode);
  }, [canUseNativeMode, nativeFallback]);

  const options = useMemo(
    () =>
      buildTimeOptions({
        disabledTime,
        format,
        maxSeconds,
        minSeconds,
        step: safeStep,
      }),
    [disabledTime, format, maxSeconds, minSeconds, safeStep],
  );

  const firstEnabledSeconds = useMemo(() => options.find((option) => !option.disabled)?.seconds ?? null, [options]);
  const lastEnabledSeconds = useMemo(
    () => [...options].reverse().find((option) => !option.disabled)?.seconds ?? null,
    [options],
  );

  const commitSeconds = (seconds: number | null, source: TimePickerChangeSource) => {
    const nextSeconds = seconds === null ? null : clampTime(seconds, minSeconds, maxSeconds);
    if (nextSeconds !== null && isTimeDisabled(nextSeconds, disabledTime, format)) {
      setInputText(formatDisplayValue(currentValue, formatMode, format));
      return;
    }

    const nextValue = nextSeconds === null ? "" : formatTime(nextSeconds, format);
    setInputText(formatDisplayValue(nextValue, formatMode, format));
    setCurrentValue(nextValue);
    onValueChange?.(nextValue, { seconds: nextSeconds, source });
  };

  const commitInput = (rawValue: string, source: TimePickerChangeSource) => {
    const parsedSeconds = parseTimeToSeconds(rawValue);
    if (parsedSeconds === null) {
      if (rawValue.trim() === "") {
        commitSeconds(null, source === "input" ? "clear" : source);
      } else {
        setInputText(formatDisplayValue(currentValue, formatMode, format));
      }
      return;
    }

    commitSeconds(parsedSeconds, source);
  };

  const stepBy = (direction: 1 | -1) => {
    if (!canEdit) {
      return;
    }

    const parsedSeconds = parseTimeToSeconds(inputText);
    const baseSeconds = parsedSeconds ?? minSeconds ?? 0;
    const nextSeconds = findEnabledStep(baseSeconds, direction, safeStep, minSeconds, maxSeconds, disabledTime, format);
    if (nextSeconds !== null) {
      commitSeconds(nextSeconds, "step");
    }
    setIsOpen(false);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsOpen(false);
    commitInput(inputText, "blur");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    props.onKeyDown?.(event);

    if (event.defaultPrevented || !canEdit) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      commitSeconds(firstEnabledSeconds ?? minSeconds ?? 0, "step");
      setIsOpen(false);
    } else if (event.key === "End") {
      event.preventDefault();
      commitSeconds(lastEnabledSeconds ?? maxSeconds ?? daySeconds - 1, "step");
      setIsOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitInput(event.currentTarget.value, "blur");
      setIsOpen(false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setInputText(formatDisplayValue(currentValue, formatMode, format));
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cx("c-time-picker", invalid && "c-time-picker--error", disabled && "c-time-picker--disabled", className)}
      onBlur={handleBlur}
      ref={rootRef}
    >
      {label ? (
        <label className="c-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <span className={cx("c-time-picker__control", allowClear && "c-time-picker__control--clearable")}>
        <input
          {...props}
          aria-controls={!isNativeMode ? panelId : undefined}
          aria-describedby={describedBy}
          aria-expanded={!isNativeMode ? isOpen : undefined}
          aria-haspopup={!isNativeMode ? "listbox" : undefined}
          aria-invalid={invalid}
          autoComplete={props.autoComplete ?? "off"}
          className="c-input c-time-picker__input"
          disabled={disabled}
          id={inputId}
          inputMode={isNativeMode ? undefined : formatMode === "12h" ? "text" : "numeric"}
          max={isNativeMode ? normalizeTimeValue(max, { format, maxSeconds, minSeconds }) : undefined}
          min={isNativeMode ? normalizeTimeValue(min, { format, maxSeconds, minSeconds }) : undefined}
          onChange={(event) => {
            const rawValue = event.currentTarget.value;
            setInputText(rawValue);
            if (isNativeMode || isCompleteTime(rawValue, showSeconds) || rawValue === "") {
              commitInput(rawValue, "input");
            }
          }}
          onFocus={(event) => {
            props.onFocus?.(event);
            if (!isNativeMode && canEdit) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? (formatMode === "12h" ? (showSeconds ? "HH:mm:ss AM" : "HH:mm AM") : showSeconds ? "HH:mm:ss" : "HH:mm")}
          readOnly={readOnly}
          ref={inputRef}
          step={isNativeMode ? nativeStep : undefined}
          type={isNativeMode ? "time" : "text"}
          value={inputText}
        />
        {allowClear ? (
          <button
            aria-label="清除时间"
            className="c-time-picker__clear"
            disabled={!canEdit || currentValue === ""}
            onClick={() => {
              commitSeconds(null, "clear");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <button
          aria-label="打开时间选择"
          className="c-time-picker__trigger"
          disabled={!canEdit}
          onClick={() => {
            if (isNativeMode) {
              inputRef.current?.showPicker?.();
              inputRef.current?.focus();
              return;
            }
            setIsOpen((open) => !open);
            inputRef.current?.focus();
          }}
          type="button"
        >
          <span aria-hidden="true">◷</span>
        </button>
        {!isNativeMode && isOpen && canEdit ? (
          <div
            aria-label="可选时间"
            className="c-time-picker__panel"
            id={panelId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setInputText(formatDisplayValue(currentValue, formatMode, format));
                setIsOpen(false);
                inputRef.current?.focus();
              }
            }}
            role="listbox"
          >
            {options.map((option) => (
              <button
                aria-disabled={option.disabled || undefined}
                aria-selected={option.value === currentValue}
                className={cx(
                  "c-time-picker__option",
                  option.value === currentValue && "c-time-picker__option--selected",
                  option.disabled && "c-time-picker__option--disabled",
                )}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  commitSeconds(option.seconds, "panel");
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                role="option"
                type="button"
              >
                {formatDisplayValue(option.value, formatMode, format)}
              </button>
            ))}
          </div>
        ) : null}
      </span>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}

function normalizeStep(step: number) {
  if (!Number.isFinite(step) || step <= 0) {
    return 60;
  }

  return Math.max(1, Math.floor(step));
}

function isCompleteTime(value: string, showSeconds: boolean) {
  return showSeconds
    ? /^\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?$/i.test(value)
    : /^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(value);
}

function parseTimeToSeconds(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  const meridiem = match[4]?.toUpperCase();

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
  }

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(seconds: number, format: "minutes" | "seconds") {
  const normalizedSeconds = ((seconds % daySeconds) + daySeconds) % daySeconds;
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const secondsPart = normalizedSeconds % 60;
  const base = `${padTimePart(hours)}:${padTimePart(minutes)}`;

  return format === "seconds" ? `${base}:${padTimePart(secondsPart)}` : base;
}

function formatDisplayValue(value: string, formatMode: TimePickerFormatMode, format: "minutes" | "seconds") {
  if (formatMode === "24h") {
    return value;
  }

  const parsedSeconds = parseTimeToSeconds(value);
  return parsedSeconds === null ? value : formatTime12Hour(parsedSeconds, format);
}

function formatTime12Hour(seconds: number, format: "minutes" | "seconds") {
  const normalizedSeconds = ((seconds % daySeconds) + daySeconds) % daySeconds;
  const hours24 = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const secondsPart = normalizedSeconds % 60;
  const hours12 = hours24 % 12 || 12;
  const base = `${padTimePart(hours12)}:${padTimePart(minutes)}`;
  const withSeconds = format === "seconds" ? `${base}:${padTimePart(secondsPart)}` : base;

  return `${withSeconds} ${hours24 >= 12 ? "PM" : "AM"}`;
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function clampTime(value: number, min?: number | null, max?: number | null) {
  let nextValue = Math.max(0, Math.min(daySeconds - 1, value));
  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }
  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }
  return nextValue;
}

function normalizeTimeValue(
  value: string | undefined,
  {
    format,
    maxSeconds,
    minSeconds,
  }: {
    format: "minutes" | "seconds";
    maxSeconds?: number | null;
    minSeconds?: number | null;
  },
) {
  const parsedSeconds = parseTimeToSeconds(value);
  return parsedSeconds === null ? undefined : formatTime(clampTime(parsedSeconds, minSeconds, maxSeconds), format);
}

function buildTimeOptions({
  disabledTime,
  format,
  maxSeconds,
  minSeconds,
  step,
}: {
  disabledTime?: (time: TimePickerDisabledTimeInfo) => boolean;
  format: "minutes" | "seconds";
  maxSeconds?: number | null;
  minSeconds?: number | null;
  step: number;
}) {
  const start = minSeconds ?? 0;
  const end = maxSeconds ?? daySeconds - 1;
  const options: TimePickerOption[] = [];
  let current = start;

  while (current <= end && options.length < 1440) {
    options.push({ disabled: isTimeDisabled(current, disabledTime, format), seconds: current, value: formatTime(current, format) });
    current += step;
  }

  if (options.length === 0 || options[options.length - 1].seconds !== end) {
    options.push({ disabled: isTimeDisabled(end, disabledTime, format), seconds: end, value: formatTime(end, format) });
  }

  return options;
}

function isTimeDisabled(
  seconds: number,
  disabledTime: TimePickerProps["disabledTime"],
  format: "minutes" | "seconds",
) {
  if (!disabledTime) {
    return false;
  }

  const normalizedSeconds = clampTime(seconds);
  try {
    return disabledTime({
      hour: Math.floor(normalizedSeconds / 3600),
      minute: Math.floor((normalizedSeconds % 3600) / 60),
      second: normalizedSeconds % 60,
      totalSeconds: normalizedSeconds,
      value: formatTime(normalizedSeconds, format),
    });
  } catch {
    return true;
  }
}

function findEnabledStep(
  baseSeconds: number,
  direction: 1 | -1,
  step: number,
  minSeconds: number | null | undefined,
  maxSeconds: number | null | undefined,
  disabledTime: TimePickerProps["disabledTime"],
  format: "minutes" | "seconds",
) {
  let nextSeconds = clampTime(baseSeconds + step * direction, minSeconds, maxSeconds);
  const edge = direction > 0 ? (maxSeconds ?? daySeconds - 1) : (minSeconds ?? 0);

  while ((direction > 0 && nextSeconds <= edge) || (direction < 0 && nextSeconds >= edge)) {
    if (!isTimeDisabled(nextSeconds, disabledTime, format)) {
      return nextSeconds;
    }

    const candidate = nextSeconds + step * direction;
    if (candidate === nextSeconds || candidate < 0 || candidate >= daySeconds) {
      return null;
    }
    nextSeconds = clampTime(candidate, minSeconds, maxSeconds);
  }

  return null;
}
