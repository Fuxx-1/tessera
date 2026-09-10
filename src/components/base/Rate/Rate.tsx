import {
  useId,
  type CSSProperties,
  type ChangeEventHandler,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type RateSemantics = "radio" | "slider";
export type RateCharacter = string | number | ((value: number, index: number) => string | number);

export interface RateProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "defaultValue" | "onChange"> {
  allowClear?: boolean;
  allowHalf?: boolean;
  ariaValueText?: (value: number) => string;
  character?: RateCharacter;
  clear?: boolean;
  clearLabel?: string;
  count?: number;
  defaultValue?: number;
  disabled?: boolean;
  error?: boolean;
  formatValue?: (value: number) => ReactNode;
  helpText?: ReactNode;
  label?: ReactNode;
  name?: string;
  onValueChange?: (value: number) => void;
  readOnly?: boolean;
  semantics?: RateSemantics;
  showValue?: boolean;
  tooltips?: Array<string | number | null | undefined>;
  value?: number;
}

type InternalRateProps = RateProps & {
  dangerouslySetInnerHTML?: never;
};

export function Rate({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  allowClear,
  allowHalf = false,
  ariaValueText,
  character,
  className,
  clear,
  clearLabel = "Clear rating",
  count = 5,
  defaultValue,
  disabled = false,
  error = false,
  formatValue,
  helpText,
  id,
  label,
  name,
  onValueChange,
  readOnly = false,
  semantics = "radio",
  showValue = true,
  tooltips,
  value,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: InternalRateProps) {
  const generatedId = useId();
  const rateId = id ?? generatedId;
  const normalizedCount = normalizeCount(count);
  const canClear = allowClear ?? clear ?? true;
  const step = allowHalf ? 0.5 : 1;
  const minSelectable = allowHalf ? 0.5 : 1;
  const minValue = canClear ? 0 : minSelectable;
  const fallbackValue = normalizeValue(defaultValue ?? minValue, normalizedCount, step, minValue);
  const [currentValue, setCurrentValue] = useControllableState({
    defaultValue: defaultValue === undefined ? undefined : normalizeValue(defaultValue, normalizedCount, step, minValue),
    fallbackValue,
    onChange: onValueChange,
    value: value === undefined ? undefined : normalizeValue(value, normalizedCount, step, minValue),
  });
  const normalizedValue = normalizeValue(currentValue, normalizedCount, step, minValue);
  const groupName = name ?? `${rateId}-rate`;
  const labelId = label ? `${rateId}-label` : undefined;
  const helpId = helpText ? `${rateId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const valueText = ariaValueText?.(normalizedValue) ?? defaultValueText(normalizedValue, normalizedCount);
  const displayValue = formatValue ? formatValue(normalizedValue) : `${normalizedValue}/${normalizedCount}`;

  const commitValue = (nextValue: number) => {
    if (disabled || readOnly) {
      return;
    }

    setCurrentValue(normalizeValue(nextValue, normalizedCount, step, minValue));
  };

  const handleOptionChange =
    (nextValue: number): ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      if (event.currentTarget.checked) {
        commitValue(nextValue);
      }
    };

  const handleOptionClick =
    (nextValue: number): MouseEventHandler<HTMLInputElement> =>
    (event) => {
      if (readOnly) {
        event.preventDefault();
        return;
      }

      if (canClear && normalizedValue === nextValue) {
        commitValue(0);
      }
    };

  const handleReadonlyOptionKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (readOnly && isValueChangeKey(event.key)) {
      event.preventDefault();
    }
  };

  const handleRangeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    commitValue(Number(event.currentTarget.value));
  };

  const handleReadonlyRangePointer: PointerEventHandler<HTMLInputElement> = (event) => {
    if (readOnly) {
      event.preventDefault();
    }
  };

  const handleReadonlyRangeKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (readOnly && isValueChangeKey(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <div
      aria-disabled={disabled || undefined}
      className={cx(
        "c-rate-field",
        error && "c-rate-field--error",
        readOnly && "c-rate-field--readonly",
        disabled && "c-rate-field--disabled",
        className,
      )}
      id={rateId}
      {...props}
    >
      <div className="c-rate-field__header">
        {label ? (
          <span className="c-field__label" id={labelId}>
            {label}
          </span>
        ) : null}
        {showValue ? <span className="c-rate-field__value">{displayValue}</span> : null}
      </div>

      <div className="c-rate-field__control">
        {semantics === "slider" ? (
          <div
            aria-invalid={error || undefined}
            aria-readonly={readOnly || undefined}
            className="c-rate c-rate--slider"
            style={{ "--c-rate-count": normalizedCount } as CSSProperties}
          >
            <input
              aria-describedby={describedBy}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : labelId}
              aria-readonly={readOnly || undefined}
              aria-valuetext={valueText}
              className="c-rate__range"
              disabled={disabled}
              max={normalizedCount}
              min={canClear ? 0 : minSelectable}
              onChange={handleRangeChange}
              onKeyDown={handleReadonlyRangeKeyDown}
              onPointerDown={handleReadonlyRangePointer}
              step={step}
              type="range"
              value={normalizedValue}
            />
            <RateStars character={character} count={normalizedCount} tooltips={tooltips} value={normalizedValue} />
          </div>
        ) : (
          <div
            aria-describedby={describedBy}
            aria-invalid={error || undefined}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabel ? undefined : labelId}
            aria-readonly={readOnly || undefined}
            className="c-rate c-rate--radio"
            role="radiogroup"
            style={{ "--c-rate-count": normalizedCount } as CSSProperties}
          >
            <RateRadioStars
              allowHalf={allowHalf}
              character={character}
              count={normalizedCount}
              disabled={disabled}
              name={groupName}
              onChange={handleOptionChange}
              onClick={handleOptionClick}
              onKeyDown={handleReadonlyOptionKeyDown}
              tooltips={tooltips}
              value={normalizedValue}
            />
          </div>
        )}

        {canClear ? (
          <button
            aria-label={clearLabel}
            className="c-rate__clear"
            disabled={disabled || readOnly || normalizedValue === 0}
            onClick={() => commitValue(0)}
            type="button"
          >
            <span aria-hidden="true">0</span>
          </button>
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

function RateRadioStars({
  allowHalf,
  character,
  count,
  disabled,
  name,
  onChange,
  onClick,
  onKeyDown,
  tooltips,
  value,
}: {
  allowHalf: boolean;
  character?: RateCharacter;
  count: number;
  disabled: boolean;
  name: string;
  onChange: (nextValue: number) => ChangeEventHandler<HTMLInputElement>;
  onClick: (nextValue: number) => MouseEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  tooltips?: Array<string | number | null | undefined>;
  value: number;
}) {
  return Array.from({ length: count }, (_, index) => {
    const itemValue = index + 1;
    const halfValue = itemValue - 0.5;
    const fill = getItemFill(value, itemValue);
    const tooltip = getTooltipText(tooltips?.[index]);
    const icon = <RateIcon character={character} fill={fill} index={index} value={itemValue} />;

    return (
      <span className="c-rate__item" key={itemValue} style={{ "--c-rate-fill": `${fill}%` } as CSSProperties} title={tooltip}>
        {icon}
        {allowHalf ? (
          <>
            <RateRadioInput
              checked={value === halfValue}
              className="c-rate__hit c-rate__hit--half"
              disabled={disabled}
              label={getOptionLabel(halfValue, count, tooltip)}
              name={name}
              onChange={onChange(halfValue)}
              onClick={onClick(halfValue)}
              onKeyDown={onKeyDown}
              value={halfValue}
            />
            <RateRadioInput
              checked={value === itemValue}
              className="c-rate__hit c-rate__hit--full"
              disabled={disabled}
              label={getOptionLabel(itemValue, count, tooltip)}
              name={name}
              onChange={onChange(itemValue)}
              onClick={onClick(itemValue)}
              onKeyDown={onKeyDown}
              value={itemValue}
            />
          </>
        ) : (
          <RateRadioInput
            checked={value === itemValue}
            className="c-rate__hit c-rate__hit--full"
            disabled={disabled}
            label={getOptionLabel(itemValue, count, tooltip)}
            name={name}
            onChange={onChange(itemValue)}
            onClick={onClick(itemValue)}
            onKeyDown={onKeyDown}
            value={itemValue}
          />
        )}
      </span>
    );
  });
}

function RateRadioInput({
  checked,
  className,
  disabled,
  label,
  name,
  onChange,
  onClick,
  onKeyDown,
  value,
}: {
  checked: boolean;
  className: string;
  disabled: boolean;
  label: string;
  name: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClick: MouseEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
  value: number;
}) {
  return (
    <label className={className}>
      <input
        aria-label={label}
        checked={checked}
        className="c-rate__input"
        disabled={disabled}
        name={name}
        onChange={onChange}
        onClick={onClick}
        onKeyDown={onKeyDown}
        type="radio"
        value={value}
      />
    </label>
  );
}

function RateStars({
  character,
  count,
  tooltips,
  value,
}: {
  character?: RateCharacter;
  count: number;
  tooltips?: Array<string | number | null | undefined>;
  value: number;
}) {
  return (
    <span aria-hidden="true" className="c-rate__stars">
      {Array.from({ length: count }, (_, index) => {
        const itemValue = index + 1;
        const fill = getItemFill(value, itemValue);
        return (
          <span
            className="c-rate__item"
            key={itemValue}
            style={{ "--c-rate-fill": `${fill}%` } as CSSProperties}
            title={getTooltipText(tooltips?.[index])}
          >
            <RateIcon character={character} fill={fill} index={index} value={itemValue} />
          </span>
        );
      })}
    </span>
  );
}

function RateIcon({
  character,
  fill,
  index,
  value,
}: {
  character?: RateCharacter;
  fill: number;
  index: number;
  value: number;
}) {
  const glyph = getCharacter(character, value, index);

  if (glyph === undefined) {
    return <span aria-hidden="true" className="c-rate__icon" />;
  }

  return (
    <span aria-hidden="true" className="c-rate__icon c-rate__icon--custom" style={{ "--c-rate-fill": `${fill}%` } as CSSProperties}>
      <span className="c-rate__glyph c-rate__glyph--base">{glyph}</span>
      <span className="c-rate__glyph c-rate__glyph--fill">{glyph}</span>
    </span>
  );
}

function normalizeCount(count: number) {
  if (!Number.isFinite(count)) {
    return 5;
  }

  return Math.min(20, Math.max(1, Math.floor(count)));
}

function isValueChangeKey(key: string) {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", " ", "Enter"].includes(key);
}

function normalizeValue(value: number, count: number, step: number, minValue = 0) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(count, Math.max(minValue, finiteValue));
  const steppedValue = Math.round(clampedValue / step) * step;
  return Number(Math.min(count, Math.max(minValue, steppedValue)).toFixed(step === 0.5 ? 1 : 0));
}

function getCharacter(character: RateCharacter | undefined, value: number, index: number) {
  if (character === undefined) {
    return undefined;
  }

  const nextCharacter = typeof character === "function" ? character(value, index) : character;
  return typeof nextCharacter === "number" || typeof nextCharacter === "string" ? String(nextCharacter) : undefined;
}

function getTooltipText(tooltip: string | number | null | undefined) {
  if (tooltip === null || tooltip === undefined) {
    return undefined;
  }

  return String(tooltip).replace(/\s+/g, " ").trim().slice(0, 160) || undefined;
}

function getOptionLabel(value: number, count: number, tooltip: string | undefined) {
  return tooltip ? `${defaultValueText(value, count)}: ${tooltip}` : defaultValueText(value, count);
}

function getItemFill(value: number, itemValue: number) {
  if (value >= itemValue) {
    return 100;
  }

  if (value <= itemValue - 1) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value - (itemValue - 1)) * 100));
}

function defaultValueText(value: number, count: number) {
  return value === 0 ? `No rating out of ${count}` : `${value} out of ${count}`;
}
