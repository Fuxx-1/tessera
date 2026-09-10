import { useId, type ChangeEventHandler, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "defaultChecked" | "type"> {
  checked?: boolean;
  defaultChecked?: boolean;
  error?: boolean;
  helpText?: ReactNode;
  label?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}

export interface RadioOption {
  disabled?: boolean;
  helpText?: ReactNode;
  label: ReactNode;
  value: string;
}

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: boolean;
  helpText?: ReactNode;
  label?: ReactNode;
  name?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  orientation?: "horizontal" | "vertical";
  value?: string;
}

export function Radio({
  checked,
  className,
  defaultChecked,
  disabled,
  error = false,
  helpText,
  id,
  label,
  onChange,
  onCheckedChange,
  ...props
}: RadioProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const [currentChecked, setChecked] = useControllableState({
    defaultValue: defaultChecked,
    fallbackValue: false,
    onChange: onCheckedChange,
    value: checked,
  });

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setChecked(event.currentTarget.checked);
    onChange?.(event);
  };

  return (
    <label className={cx("c-radio", error && "c-radio--error", className)} htmlFor={inputId}>
      <span className="c-radio__control">
        <input
          aria-describedby={helpId}
          aria-invalid={error || undefined}
          checked={currentChecked}
          className="c-radio__input"
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          type="radio"
          {...props}
        />
        <span aria-hidden="true" className="c-radio__dot" />
      </span>
      <span className="c-radio__content">
        {label ? <span className="c-radio__label">{label}</span> : null}
        {helpText ? (
          <span className="c-field__hint" id={helpId}>
            {helpText}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function RadioGroup({
  className,
  defaultValue,
  disabled = false,
  error = false,
  helpText,
  label,
  name,
  onChange,
  onValueChange,
  options,
  orientation = "vertical",
  value,
  "aria-label": ariaLabelProp,
  "aria-labelledby": ariaLabelledByProp,
  ...props
}: RadioGroupProps) {
  const generatedId = useId();
  const groupName = name ?? generatedId;
  const labelId = label ? `${generatedId}-label` : undefined;
  const ariaLabelledBy = [labelId, ariaLabelledByProp].filter(Boolean).join(" ") || undefined;
  const ariaLabel = ariaLabelledBy ? ariaLabelProp : ariaLabelProp ?? (typeof label === "string" ? label : undefined);
  const helpId = helpText ? `${generatedId}-help` : undefined;
  const [currentValue, setValue] = useControllableState({
    defaultValue,
    fallbackValue: "",
    onChange: onValueChange,
    value,
  });

  return (
    <div className={cx("c-radio-group-field", className)}>
      {label ? (
        <span className="c-field__label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        aria-describedby={helpId}
        aria-invalid={error || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cx("c-radio-group", `c-radio-group--${orientation}`)}
        role="radiogroup"
        {...props}
      >
        {options.map((option) => (
          <Radio
            checked={currentValue === option.value}
            disabled={disabled || option.disabled}
            error={error}
            helpText={option.helpText}
            key={option.value}
            label={option.label}
            name={groupName}
            onChange={(event) => {
              onChange?.(event);
            }}
            onCheckedChange={(nextChecked) => {
              if (nextChecked) {
                setValue(option.value);
              }
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
