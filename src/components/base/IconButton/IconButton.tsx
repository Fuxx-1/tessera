import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { Tooltip, type TooltipProps } from "../Tooltip";
import "./style.css";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "dangerouslySetInnerHTML"> {
  children: ReactNode;
  label?: string;
  loading?: boolean;
  pressed?: boolean;
  size?: IconButtonSize;
  tone?: IconButtonTone;
  tooltip?: ReactNode;
  tooltipPlacement?: TooltipProps["placement"];
}

type InternalIconButtonProps = IconButtonProps & {
  dangerouslySetInnerHTML?: never;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    "aria-busy": ariaBusy,
    "aria-label": ariaLabel,
    children,
    className,
    disabled,
    label,
    loading = false,
    pressed,
    size = "md",
    title,
    tone = "neutral",
    type = "button",
    tooltip,
    tooltipPlacement,
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ...props
  }: InternalIconButtonProps,
  ref,
) {
  const accessibleLabel = ariaLabel ?? label ?? (typeof title === "string" ? title : undefined);
  const tooltipContent = tooltip ?? title;
  const isDisabled = disabled || loading;

  if (import.meta.env.DEV && !accessibleLabel) {
    console.warn("IconButton requires an accessible label. Provide label, aria-label, or a string title.");
  }

  const button = (
    <button
      aria-label={accessibleLabel}
      aria-pressed={pressed ?? undefined}
      aria-busy={loading || ariaBusy || undefined}
      className={cx(
        "c-icon-button",
        `c-icon-button--${size}`,
        `c-icon-button--${tone}`,
        loading && "c-icon-button--loading",
        className,
      )}
      disabled={isDisabled}
      ref={ref}
      title={title}
      type={type}
      {...props}
    >
      <span aria-hidden={loading ? true : undefined} className="c-icon-button__content">
        {children}
      </span>
      {loading ? <span aria-hidden="true" className="c-icon-button__spinner" /> : null}
    </button>
  );

  if (!tooltipContent) {
    return button;
  }

  return (
    <Tooltip content={tooltipContent} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  );
});
