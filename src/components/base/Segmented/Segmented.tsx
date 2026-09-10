import { useId, useMemo, useRef } from "react";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface SegmentedOption {
  disabled?: boolean;
  label: ReactNode;
  title?: string;
  value: string;
}

export interface SegmentedProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "onChange"> {
  defaultValue?: string;
  hint?: string;
  label?: string;
  onValueChange?: (value: string) => void;
  options: SegmentedOption[];
  size?: "sm" | "md";
  value?: string;
}

function getEnabledIndexes(options: SegmentedOption[]) {
  return options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
}

export function Segmented({
  className,
  defaultValue,
  hint,
  label,
  onValueChange,
  options,
  size = "md",
  style,
  value,
  ...props
}: SegmentedProps) {
  const generatedId = useId();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledIndexes = useMemo(() => getEnabledIndexes(options), [options]);
  const enabledOptions = useMemo(() => enabledIndexes.map((index) => options[index]), [enabledIndexes, options]);
  const fallbackValue = enabledOptions[0]?.value ?? "";
  const [currentValue, setCurrentValue] = useControllableState({
    defaultValue,
    fallbackValue,
    onChange: onValueChange,
    value,
  });
  const checkedIndex = options.findIndex((option) => !option.disabled && option.value === currentValue);
  const firstEnabledIndex = enabledIndexes[0] ?? -1;
  const labelId = label ? `${generatedId}-label` : undefined;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const indicatorStyle =
    checkedIndex >= 0
      ? ({ "--segmented-count": options.length, "--segmented-index": checkedIndex + 1 } as CSSProperties)
      : ({ "--segmented-count": options.length } as CSSProperties);

  function selectOption(option: SegmentedOption) {
    if (option.disabled) {
      return;
    }

    setCurrentValue(option.value);
  }

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const key = event.key;
    if (key === " " || key === "Enter") {
      event.preventDefault();
      selectOption(options[currentIndex]);
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) {
      return;
    }

    event.preventDefault();

    if (enabledIndexes.length === 0) {
      return;
    }

    const currentEnabledIndex = enabledIndexes.indexOf(currentIndex);
    const baseIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : 0;
    let nextEnabledIndex = baseIndex;

    if (key === "ArrowRight" || key === "ArrowDown") {
      nextEnabledIndex = (baseIndex + 1) % enabledIndexes.length;
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      nextEnabledIndex = (baseIndex - 1 + enabledIndexes.length) % enabledIndexes.length;
    } else if (key === "Home") {
      nextEnabledIndex = 0;
    } else if (key === "End") {
      nextEnabledIndex = enabledIndexes.length - 1;
    }

    const nextIndex = enabledIndexes[nextEnabledIndex];
    const nextOption = options[nextIndex];
    if (!nextOption) {
      return;
    }

    selectOption(nextOption);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={cx("c-segmented-field", className)}>
      {label ? (
        <span className="c-field__label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        aria-describedby={hintId}
        aria-labelledby={labelId}
        className={cx("c-segmented", `c-segmented--${size}`)}
        role="radiogroup"
        style={{ ...style, ...indicatorStyle }}
        {...props}
      >
        {checkedIndex >= 0 ? <span aria-hidden="true" className="c-segmented__indicator" /> : null}
        {options.map((option, index) => {
          const checked = index === checkedIndex;
          const tabStop = checked || (checkedIndex < 0 && index === firstEnabledIndex);
          return (
            <button
              aria-checked={checked}
              className="c-segmented__item"
              disabled={option.disabled}
              key={option.value}
              onClick={() => selectOption(option)}
              onKeyDown={(event) => moveSelection(event, index)}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              role="radio"
              tabIndex={tabStop ? 0 : -1}
              title={option.title}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint ? (
        <span className="c-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
