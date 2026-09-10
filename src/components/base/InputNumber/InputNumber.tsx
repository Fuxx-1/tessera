import { useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type InputNumberValue = number | "";

export type InputNumberChangeInfo = {
  input: string;
  source: "input" | "blur" | "step";
};

export type InputNumberFormatterInfo = {
  input: string;
  userTyping: boolean;
};

export interface InputNumberProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "defaultValue" | "inputMode" | "max" | "min" | "onChange" | "prefix" | "step" | "type" | "value"
  > {
  controls?: boolean;
  defaultValue?: InputNumberValue;
  error?: boolean;
  formatter?: (value: InputNumberValue, info: InputNumberFormatterInfo) => string;
  helpText?: ReactNode;
  hint?: ReactNode;
  inputMode?: "decimal" | "numeric";
  label?: ReactNode;
  max?: number;
  min?: number;
  onInputChange?: (input: string) => void;
  onValueChange?: (value: InputNumberValue, info: InputNumberChangeInfo) => void;
  parser?: (input: string) => InputNumberValue;
  precision?: number;
  prefix?: ReactNode;
  step?: number;
  suffix?: ReactNode;
  wheel?: boolean;
  value?: InputNumberValue;
}

export function InputNumber({
  className,
  controls = true,
  defaultValue,
  disabled,
  error = false,
  formatter,
  helpText,
  hint,
  id,
  inputMode = "decimal",
  label,
  max,
  min,
  onInputChange,
  onValueChange,
  parser,
  placeholder,
  precision,
  prefix,
  readOnly,
  step = 1,
  suffix,
  value,
  wheel = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputNumberProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const fieldHelp = helpText ?? hint;
  const helpId = fieldHelp ? `${inputId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const ariaInvalidValue = ariaInvalid ?? (error ? true : undefined);
  const normalizer = useMemo(
    () => ({
      format: (nextValue: InputNumberValue, info: InputNumberFormatterInfo) => {
        const safeValue = toSafeNumberValue(nextValue);
        try {
          const formattedValue = formatter ? formatter(safeValue, info) : formatNumberValue(safeValue);
          return typeof formattedValue === "string" ? formattedValue : formatNumberValue(safeValue);
        } catch {
          return formatNumberValue(safeValue);
        }
      },
      parse: (input: string) => {
        try {
          return toSafeNumberValue(parser ? parser(input) : parseNumberInput(input));
        } catch {
          return "";
        }
      },
    }),
    [formatter, parser],
  );
  const [currentValue, setValue] = useControllableState({
    defaultValue,
    fallbackValue: "",
    value,
  });
  const [inputText, setInputText] = useState(() =>
    normalizer.format(currentValue, { input: "", userTyping: false }),
  );
  const [isFocused, setIsFocused] = useState(false);
  const isComposingRef = useRef(false);
  const canStep = !disabled && !readOnly;
  const numericValue = typeof currentValue === "number" ? currentValue : undefined;
  const stepUpDisabled = !canStep || (typeof max === "number" && typeof numericValue === "number" && numericValue >= max);
  const stepDownDisabled = !canStep || (typeof min === "number" && typeof numericValue === "number" && numericValue <= min);
  const hasPrefix = prefix !== undefined && prefix !== null;
  const hasSuffix = suffix !== undefined && suffix !== null;

  useEffect(() => {
    if (!isFocused) {
      setInputText(normalizer.format(currentValue, { input: inputText, userTyping: false }));
    }
  }, [currentValue, inputText, isFocused, normalizer]);

  const commitValue = (nextValue: InputNumberValue, source: InputNumberChangeInfo["source"], input: string) => {
    const normalizedValue = normalizeValue(nextValue, { max, min, precision });
    const formattedInput = normalizer.format(normalizedValue, { input, userTyping: source === "input" });

    setInputText(source === "input" ? input : formattedInput);

    if (source === "input") {
      setValue(normalizedValue);
      onValueChange?.(normalizedValue, { input, source });
      return;
    }

    if (normalizedValue !== currentValue) {
      setValue(normalizedValue);
    }
    onValueChange?.(normalizedValue, { input: formattedInput, source });
  };

  const stepValue = (direction: 1 | -1) => {
    if (!canStep || (direction === 1 && stepUpDisabled) || (direction === -1 && stepDownDisabled)) {
      return;
    }

    const parsedInput = normalizer.parse(inputText);
    const safeStep = toSafeStep(step);
    const baseValue = parsedInput === "" ? currentValue || 0 : parsedInput;
    const nextValue = normalizeValue(baseValue + safeStep * direction, { max, min, precision });
    commitValue(nextValue, "step", String(nextValue));
  };

  const syncInputValue = (rawValue: string) => {
    const parsedValue = normalizer.parse(rawValue);

    setInputText(rawValue);
    onInputChange?.(rawValue);

    if (rawValue === "") {
      commitValue("", "input", rawValue);
    } else if (parsedValue !== "") {
      const normalizedValue = normalizeValue(parsedValue, { precision });
      setValue(normalizedValue);
      onValueChange?.(normalizedValue, { input: rawValue, source: "input" });
    }
  };

  return (
    <div
      className={cx(
        "c-number-field",
        error && "c-number-field--error",
        disabled && "c-number-field--disabled",
        readOnly && "c-number-field--readonly",
        className,
      )}
    >
      {label ? (
        <label className="c-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <span
        className={cx(
          "c-number-field__control",
          controls && "c-number-field__control--with-buttons",
          hasPrefix && "c-number-field__control--prefixed",
          hasSuffix && "c-number-field__control--suffixed",
        )}
      >
        {hasPrefix ? (
          <span className="c-number-field__affix c-number-field__prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          {...props}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalidValue}
          aria-readonly={readOnly || undefined}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={numericValue}
          aria-valuetext={numericValue === undefined ? undefined : inputText}
          className="c-input c-number-field__input"
          disabled={disabled}
          id={inputId}
          inputMode={inputMode}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);

            const rawValue = event.currentTarget.value;
            const parsedValue = normalizer.parse(rawValue);
            const nextValue = parsedValue === "" && rawValue.trim() !== "" ? currentValue : parsedValue;
            commitValue(nextValue, "blur", rawValue);
          }}
          onChange={(event) => {
            const rawValue = event.currentTarget.value;

            if (isComposingRef.current) {
              setInputText(rawValue);
              onInputChange?.(rawValue);
            } else {
              syncInputValue(rawValue);
            }
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            props.onCompositionEnd?.(event);
            syncInputValue(event.currentTarget.value);
          }}
          onCompositionStart={(event) => {
            isComposingRef.current = true;
            props.onCompositionStart?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);

            if (event.defaultPrevented) {
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              stepValue(1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              stepValue(-1);
            } else if (event.key === "Home" && typeof min === "number" && canStep) {
              event.preventDefault();
              commitValue(min, "step", String(min));
            } else if (event.key === "End" && typeof max === "number" && canStep) {
              event.preventDefault();
              commitValue(max, "step", String(max));
            }
          }}
          onWheel={(event) => {
            props.onWheel?.(event);

            if (!wheel || event.defaultPrevented || document.activeElement !== event.currentTarget) {
              return;
            }

            event.preventDefault();
            stepValue(event.deltaY < 0 ? 1 : -1);
          }}
          pattern={inputMode === "numeric" ? "[0-9]*" : undefined}
          placeholder={placeholder}
          readOnly={readOnly}
          role="spinbutton"
          type="text"
          value={inputText}
        />
        {hasSuffix ? (
          <span className="c-number-field__affix c-number-field__suffix" aria-hidden="true">
            {suffix}
          </span>
        ) : null}
        {controls ? (
          <span className="c-number-field__buttons">
            <button
              aria-label="增加数值"
              disabled={stepUpDisabled}
              onClick={() => stepValue(1)}
              type="button"
            >
              +
            </button>
            <button
              aria-label="减少数值"
              disabled={stepDownDisabled}
              onClick={() => stepValue(-1)}
              type="button"
            >
              -
            </button>
          </span>
        ) : null}
      </span>
      {fieldHelp ? (
        <span className={cx("c-field__hint", error && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}

function parseNumberInput(input: string): InputNumberValue {
  const normalizedInput = input.trim().replace(/,/g, "");

  if (normalizedInput === "" || /^[+-]?(\.|\d+\.)?$/.test(normalizedInput)) {
    return "";
  }

  const parsedValue = Number(normalizedInput);
  return Number.isFinite(parsedValue) ? parsedValue : "";
}

function formatNumberValue(value: InputNumberValue) {
  return value === "" ? "" : String(value);
}

function toSafeNumberValue(value: InputNumberValue): InputNumberValue {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function toSafeStep(step: number) {
  return Number.isFinite(step) && step > 0 ? step : 1;
}

function normalizeValue(
  value: InputNumberValue,
  {
    max,
    min,
    precision,
  }: {
    max?: number;
    min?: number;
    precision?: number;
  },
): InputNumberValue {
  const safeValue = toSafeNumberValue(value);

  if (safeValue === "") {
    return "";
  }

  const safePrecision = toSafePrecision(precision);
  const roundedValue = typeof safePrecision === "number" ? Number(safeValue.toFixed(safePrecision)) : safeValue;
  return Math.min(max ?? roundedValue, Math.max(min ?? roundedValue, roundedValue));
}

function toSafePrecision(precision: number | undefined) {
  if (typeof precision !== "number" || !Number.isInteger(precision) || precision < 0) {
    return undefined;
  }

  return Math.min(precision, 12);
}
