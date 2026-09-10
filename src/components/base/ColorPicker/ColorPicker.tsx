import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type ColorPickerChangeSource = "hex" | "native" | "swatch";

export type ColorPickerChangeInfo = {
  alpha: number;
  source: ColorPickerChangeSource;
  valid: boolean;
};

export type ColorPickerSwatch =
  | string
  | {
      disabled?: boolean;
      label?: string;
      value: string;
    };

export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  allowAlpha?: boolean;
  alpha?: number;
  alphaLabel?: ReactNode;
  defaultAlpha?: number;
  defaultValue?: string;
  disabled?: boolean;
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  hexLabel?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  name?: string;
  nativeLabel?: string;
  onAlphaChange?: (alpha: number) => void;
  onValueChange?: (value: string, info: ColorPickerChangeInfo) => void;
  required?: boolean;
  swatches?: ColorPickerSwatch[];
  swatchesLabel?: ReactNode;
  value?: string;
}

const DEFAULT_COLOR = "#111110";

export function ColorPicker({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  allowAlpha = false,
  alpha,
  alphaLabel = "透明度",
  className,
  defaultAlpha,
  defaultValue,
  disabled,
  error = false,
  errorText,
  helpText,
  hexLabel = "Hex",
  hint,
  id,
  label,
  name,
  nativeLabel = "打开系统颜色选择器",
  onAlphaChange,
  onValueChange,
  required,
  swatches,
  swatchesLabel = "色板",
  value,
  ...props
}: ColorPickerProps) {
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const labelId = label ? `${pickerId}-label` : undefined;
  const swatchesId = swatches?.length ? `${pickerId}-swatches-label` : undefined;
  const normalizedSwatches = useMemo(() => normalizeSwatches(swatches), [swatches]);
  const fallbackValue = normalizeHexValue(defaultValue) ?? normalizedSwatches[0]?.value ?? DEFAULT_COLOR;
  const [currentValue, setCurrentValue] = useControllableState({
    defaultValue: normalizeHexValue(defaultValue),
    fallbackValue,
    value: value === undefined ? undefined : (normalizeHexValue(value) ?? DEFAULT_COLOR),
  });
  const [currentAlpha, setCurrentAlpha] = useControllableState({
    defaultValue: normalizeAlpha(defaultAlpha),
    fallbackValue: 100,
    onChange: onAlphaChange,
    value: alpha === undefined ? undefined : (normalizeAlpha(alpha) ?? 100),
  });
  const normalizedValue = normalizeHexValue(currentValue) ?? DEFAULT_COLOR;
  const [hexText, setHexText] = useState(formatHex(normalizedValue));
  const hexInvalid = hexText.trim().length > 0 && !normalizeHexValue(hexText);
  const invalid = error || Boolean(errorText) || hexInvalid;
  const fieldHelp = hexInvalid ? "请输入 3 位或 6 位十六进制颜色，例如 #1677ff。" : (errorText ?? helpText ?? hint);
  const helpId = fieldHelp ? `${pickerId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    setHexText(formatHex(normalizedValue));
  }, [normalizedValue]);

  const commitValue = (nextValue: string, source: ColorPickerChangeSource) => {
    const normalizedNextValue = normalizeHexValue(nextValue);

    if (!normalizedNextValue || disabled) {
      return;
    }

    setCurrentValue(normalizedNextValue);
    onValueChange?.(normalizedNextValue, {
      alpha: currentAlpha,
      source,
      valid: true,
    });
  };

  const handleHexChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextText = event.currentTarget.value;
    const normalizedNextValue = normalizeHexValue(nextText);

    setHexText(nextText);

    if (normalizedNextValue) {
      commitValue(normalizedNextValue, "hex");
    }
  };

  return (
    <div
      {...props}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-labelledby={ariaLabelledBy ?? labelId}
      className={cx("c-color-picker-field", invalid && "c-color-picker-field--error", className)}
      id={pickerId}
      role="group"
    >
      {label ? (
        <span className="c-field__label" id={labelId}>
          {label}
        </span>
      ) : null}

      <div className="c-color-picker">
        <label className="c-color-picker__native">
          <span className="c-sr-only">{nativeLabel}</span>
          <span className="c-color-picker__preview" style={{ backgroundColor: hexToRgb(normalizedValue, currentAlpha) }} />
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="c-color-picker__native-input"
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setHexText(formatHex(nextValue));
              commitValue(nextValue, "native");
            }}
            required={required}
            type="color"
            value={normalizedValue}
          />
        </label>

        <label className="c-color-picker__hex">
          <span className="c-color-picker__control-label">{hexLabel}</span>
          <input
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoCapitalize="none"
            autoComplete="off"
            className="c-color-picker__hex-input"
            disabled={disabled}
            inputMode="text"
            maxLength={7}
            onBlur={() => {
              if (hexText.trim().length === 0) {
                setHexText(formatHex(normalizedValue));
              }
            }}
            onChange={handleHexChange}
            pattern="#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?"
            placeholder="#111110"
            spellCheck={false}
            value={hexText}
          />
        </label>
      </div>

      {normalizedSwatches.length > 0 ? (
        <div aria-labelledby={swatchesId} className="c-color-picker__swatches" role="group">
          <span className="c-color-picker__control-label" id={swatchesId}>
            {swatchesLabel}
          </span>
          <div className="c-color-picker__swatch-list">
            {normalizedSwatches.map((swatch) => {
              const selected = swatch.value === normalizedValue;
              return (
                <button
                  aria-label={swatch.label ?? swatch.value}
                  aria-pressed={selected}
                  className="c-color-picker__swatch"
                  disabled={disabled || swatch.disabled}
                  key={`${swatch.value}-${swatch.label ?? ""}`}
                  onClick={() => {
                    setHexText(formatHex(swatch.value));
                    commitValue(swatch.value, "swatch");
                  }}
                  style={{ backgroundColor: swatch.value }}
                  title={swatch.label ?? swatch.value}
                  type="button"
                >
                  <span className="c-sr-only">{selected ? "已选择" : "选择"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {allowAlpha ? (
        <label className="c-color-picker__alpha">
          <span className="c-color-picker__alpha-header">
            <span className="c-color-picker__control-label">{alphaLabel}</span>
            <span className="c-color-picker__alpha-value">{currentAlpha}%</span>
          </span>
          <input
            aria-describedby={describedBy}
            className="c-color-picker__alpha-input"
            disabled={disabled}
            max={100}
            min={0}
            onChange={(event) => setCurrentAlpha(normalizeAlpha(Number(event.currentTarget.value)) ?? 100)}
            step={1}
            type="range"
            value={currentAlpha}
          />
        </label>
      ) : null}

      {name ? <input disabled={disabled} name={name} type="hidden" value={normalizedValue} /> : null}
      {allowAlpha && name ? <input disabled={disabled} name={`${name}Alpha`} type="hidden" value={currentAlpha} /> : null}

      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}

function normalizeSwatches(swatches: ColorPickerSwatch[] | undefined) {
  if (!swatches) {
    return [];
  }

  return swatches.flatMap((swatch) => {
    const value = typeof swatch === "string" ? swatch : swatch.value;
    const normalizedValue = normalizeHexValue(value);

    if (!normalizedValue) {
      return [];
    }

    return [
      {
        disabled: typeof swatch === "string" ? false : swatch.disabled,
        label: typeof swatch === "string" ? normalizedValue : swatch.label,
        value: normalizedValue,
      },
    ];
  });
}

function normalizeHexValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  const withHash = trimmedValue.startsWith("#") ? trimmedValue : `#${trimmedValue}`;
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(withHash);

  if (shortMatch) {
    const [, compactValue] = shortMatch;
    return `#${compactValue
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }

  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : undefined;
}

function normalizeAlpha(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function formatHex(value: string) {
  return (normalizeHexValue(value) ?? DEFAULT_COLOR).toUpperCase();
}

function hexToRgb(value: string, alpha: number) {
  const normalizedValue = normalizeHexValue(value) ?? DEFAULT_COLOR;
  const red = Number.parseInt(normalizedValue.slice(1, 3), 16);
  const green = Number.parseInt(normalizedValue.slice(3, 5), 16);
  const blue = Number.parseInt(normalizedValue.slice(5, 7), 16);

  return `rgb(${red} ${green} ${blue} / ${alpha}%)`;
}
