import {
  useId,
  useRef,
  useState,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";
import { Icon } from "../Icon";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "onChange" | "prefix" | "value"> {
  allowClear?: boolean;
  clearLabel?: string;
  defaultValue?: string | number;
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  label?: ReactNode;
  hint?: ReactNode;
  invalid?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  value?: string | number;
}

export function Input({
  allowClear = false,
  className,
  clearLabel = "Clear input",
  defaultValue,
  disabled,
  error = false,
  errorText,
  helpText,
  id,
  label,
  hint,
  invalid: invalidProp = false,
  onChange,
  onClear,
  prefix,
  readOnly,
  suffix,
  value,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? props.name ?? generatedId;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => (defaultValue === undefined ? "" : String(defaultValue)));
  const currentValue = isControlled ? String(value) : internalValue;
  const hasInvalidState = invalidProp || error || Boolean(errorText);
  const ariaInvalidValue = ariaInvalid ?? (hasInvalidState ? true : undefined);
  const invalid =
    hasInvalidState ||
    ariaInvalidValue === true ||
    ariaInvalidValue === "true" ||
    ariaInvalidValue === "grammar" ||
    ariaInvalidValue === "spelling";
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${inputId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const hasPrefix = prefix !== undefined && prefix !== null;
  const hasSuffix = suffix !== undefined && suffix !== null;
  const canClear = allowClear && currentValue.length > 0 && !disabled && !readOnly;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (!isControlled) {
      setInternalValue(event.currentTarget.value);
    }

    onChange?.(event);
  };

  const handleClear = () => {
    if (disabled || readOnly) {
      return;
    }

    const input = inputRef.current;
    if (!isControlled) {
      setInternalValue("");
    }

    if (input && typeof window !== "undefined") {
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
    }

    onClear?.();
  };

  return (
    <div
      className={cx(
        "c-field",
        "c-input-field",
        invalid && "c-field--error c-input-field--error",
        disabled && "c-input-field--disabled",
        readOnly && "c-input-field--readonly",
      )}
    >
      {label ? (
        <label className="c-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <span
        className={cx(
          "c-input-field__control",
          hasPrefix && "c-input-field__control--prefixed",
          (hasSuffix || canClear) && "c-input-field__control--suffixed",
        )}
      >
        {hasPrefix ? (
          <span className="c-input-field__affix c-input-field__prefix" aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          {...props}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalidValue}
          className={cx("c-input", className)}
          defaultValue={undefined}
          disabled={disabled}
          id={inputId}
          onChange={handleChange}
          readOnly={readOnly}
          ref={inputRef}
          value={currentValue}
        />
        {canClear ? (
          <button aria-label={clearLabel} className="c-input-field__clear" onClick={handleClear} type="button">
            <Icon decorative name="close" size="sm" />
          </button>
        ) : null}
        {hasSuffix ? (
          <span className="c-input-field__affix c-input-field__suffix" aria-hidden="true">
            {suffix}
          </span>
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
