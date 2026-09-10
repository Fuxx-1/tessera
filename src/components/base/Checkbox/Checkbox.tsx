import { useEffect, useId, useRef, type ChangeEventHandler, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "defaultChecked" | "type"> {
  checked?: boolean;
  defaultChecked?: boolean;
  error?: boolean;
  helpText?: ReactNode;
  indeterminate?: boolean;
  invalid?: boolean;
  label?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

export interface CheckboxOption {
  disabled?: boolean;
  helpText?: ReactNode;
  label: ReactNode;
  value: string;
}

export interface CheckboxGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  "aria-label"?: string;
  defaultValue?: string[];
  disabled?: boolean;
  error?: boolean;
  helpText?: ReactNode;
  invalid?: boolean;
  label?: ReactNode;
  name?: string;
  onValueChange?: (value: string[]) => void;
  options: CheckboxOption[];
  orientation?: "horizontal" | "vertical";
  value?: string[];
}

function isInvalidAriaValue(value: CheckboxProps["aria-invalid"] | CheckboxGroupProps["aria-invalid"]) {
  return value === true || value === "true" || value === "grammar" || value === "spelling";
}

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  checked,
  className,
  defaultChecked,
  disabled,
  error = false,
  helpText,
  id,
  indeterminate = false,
  invalid = false,
  label,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const invalidState = invalid || error || isInvalidAriaValue(ariaInvalid);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentChecked, setChecked] = useControllableState({
    defaultValue: defaultChecked,
    fallbackValue: false,
    onChange: onCheckedChange,
    value: checked,
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setChecked(event.currentTarget.checked);
    onChange?.(event);
  };

  return (
    <label className={cx("c-checkbox", invalidState && "c-checkbox--error", className)} htmlFor={inputId}>
      <span className="c-checkbox__control">
        <input
          {...props}
          aria-checked={indeterminate ? "mixed" : currentChecked}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid ?? (invalidState || undefined)}
          checked={currentChecked}
          className="c-checkbox__input"
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          ref={inputRef}
          type="checkbox"
        />
        <span aria-hidden="true" className="c-checkbox__box">
          {indeterminate ? <span className="c-checkbox__mark c-checkbox__mark--mixed" /> : null}
          {!indeterminate && currentChecked ? <span className="c-checkbox__mark" /> : null}
        </span>
      </span>
      <span className="c-checkbox__content">
        {label ? <span className="c-checkbox__label">{label}</span> : null}
        {helpText ? (
          <span className="c-field__hint" id={helpId}>
            {helpText}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function CheckboxGroup({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledBy,
  className,
  defaultValue,
  disabled = false,
  error = false,
  helpText,
  invalid = false,
  label,
  name,
  onValueChange,
  options,
  orientation = "vertical",
  value,
  ...props
}: CheckboxGroupProps) {
  const generatedId = useId();
  const groupName = name ?? generatedId;
  const labelId = label ? `${generatedId}-label` : undefined;
  const helpId = helpText ? `${generatedId}-help` : undefined;
  const labelledBy = [ariaLabelledBy, labelId].filter(Boolean).join(" ") || undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const invalidState = invalid || error || isInvalidAriaValue(ariaInvalid);
  const [currentValue, setValue] = useControllableState({
    defaultValue,
    fallbackValue: [],
    onChange: onValueChange,
    value,
  });

  const selectedValues = new Set(currentValue);

  return (
    <div className={cx("c-checkbox-group-field", className)}>
      {label ? (
        <span className="c-field__label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        {...props}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid ?? (invalidState || undefined)}
        aria-labelledby={labelledBy}
        className={cx("c-checkbox-group", `c-checkbox-group--${orientation}`)}
        role="group"
      >
        {options.map((option) => (
          <Checkbox
            checked={selectedValues.has(option.value)}
            disabled={disabled || option.disabled}
            invalid={invalidState}
            helpText={option.helpText}
            key={option.value}
            label={option.label}
            name={groupName}
            onCheckedChange={(nextChecked) => {
              const nextValue = nextChecked
                ? [...currentValue, option.value]
                : currentValue.filter((itemValue) => itemValue !== option.value);
              setValue(nextValue);
            }}
            value={option.value}
          />
        ))}
      </div>
      {helpText ? (
        <span className={cx("c-field__hint", error && "c-field__hint--error")} id={helpId}>
          {helpText}
        </span>
      ) : null}
    </div>
  );
}
