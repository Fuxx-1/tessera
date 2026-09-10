import { useId, type ButtonHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type SwitchChangeEvent = KeyboardEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>;

export interface SwitchProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-checked" | "aria-invalid" | "defaultChecked" | "onChange" | "role" | "type"
  > {
  checked?: boolean;
  checkedChildren?: ReactNode;
  defaultChecked?: boolean;
  error?: boolean;
  helpText?: ReactNode;
  label?: string;
  loading?: boolean;
  loadingLabel?: string;
  onChange?: (checked: boolean, event: SwitchChangeEvent) => void;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  unCheckedChildren?: ReactNode;
}

export function Switch({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  checked,
  checkedChildren,
  className,
  defaultChecked,
  disabled,
  error = false,
  helpText,
  id,
  label,
  loading = false,
  loadingLabel = "Loading switch",
  form,
  name,
  onChange,
  onCheckedChange,
  onClick,
  onKeyDown,
  size = "md",
  unCheckedChildren,
  value = "on",
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const helpId = helpText ? `${switchId}-help` : undefined;
  const labelId = label ? `${switchId}-label` : undefined;
  const loadingId = loading ? `${switchId}-loading` : undefined;
  const describedBy = [ariaDescribedBy, helpId, loadingId].filter(Boolean).join(" ") || undefined;
  const [currentChecked, setChecked] = useControllableState({
    defaultValue: defaultChecked,
    fallbackValue: false,
    onChange: onCheckedChange,
    value: checked,
  });
  const interactiveDisabled = disabled || loading;
  const stateChildren = currentChecked ? checkedChildren : unCheckedChildren;

  const toggleChecked = (event: SwitchChangeEvent) => {
    if (interactiveDisabled) {
      return;
    }

    const nextChecked = !currentChecked;
    setChecked(nextChecked);
    onChange?.(nextChecked, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || event.repeat || (event.key !== " " && event.key !== "Enter")) {
      return;
    }

    event.preventDefault();
    toggleChecked(event);
  };

  return (
    <span className={cx("c-switch-field", error && "c-switch-field--error")}>
      <button
        {...props}
        aria-busy={loading || props["aria-busy"] || undefined}
        aria-checked={currentChecked}
        aria-describedby={describedBy}
        aria-invalid={error || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : labelId)}
        className={cx("c-switch", `c-switch--${size}`, loading && "c-switch--loading", className)}
        disabled={interactiveDisabled}
        form={form}
        id={switchId}
        onClick={(event) => {
          onClick?.(event);

          if (!event.defaultPrevented) {
            toggleChecked(event);
          }
        }}
        onKeyDown={handleKeyDown}
        role="switch"
        type="button"
      >
        <span className="c-switch__track">
          {loading ? <span aria-hidden="true" className="c-switch__spinner" /> : null}
          {stateChildren !== undefined && stateChildren !== null && stateChildren !== false ? (
            <span aria-hidden="true" className="c-switch__state">
              {stateChildren}
            </span>
          ) : null}
          <span className="c-switch__thumb" />
        </span>
        {label ? (
          <span className="c-switch__label" id={labelId}>
            {label}
          </span>
        ) : null}
        {loading ? (
          <span aria-live="polite" className="c-sr-only" id={loadingId} role="status">
            {loadingLabel}
          </span>
        ) : null}
      </button>
      {name && currentChecked ? (
        <input disabled={interactiveDisabled} form={form} name={name} type="hidden" value={value} />
      ) : null}
      {helpText ? (
        <span className={cx("c-field__hint", error && "c-field__hint--error")} id={helpId}>
          {helpText}
        </span>
      ) : null}
    </span>
  );
}
