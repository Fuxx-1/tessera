import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "dangerouslySetInnerHTML"> {
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  loading?: boolean;
  variant?: "solid" | "soft" | "ghost";
  size?: "sm" | "md";
  children: ReactNode;
}

type InternalButtonProps = ButtonProps & {
  dangerouslySetInnerHTML?: never;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    "aria-busy": ariaBusy,
    className,
    disabled,
    icon,
    iconPosition = "start",
    loading = false,
    variant = "soft",
    size = "md",
    children,
    type = "button",
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ...props
  }: InternalButtonProps,
  ref,
) {
  const isDisabled = disabled || loading;
  const iconNode = loading ? <span aria-hidden="true" className="c-button__spinner" /> : icon;

  return (
    <button
      {...props}
      aria-busy={loading ? true : ariaBusy}
      className={cx(
        "c-button",
        `c-button--${variant}`,
        `c-button--${size}`,
        iconNode && "c-button--with-icon",
        loading && "c-button--loading",
        className,
      )}
      disabled={isDisabled}
      ref={ref}
      type={type}
    >
      {iconNode && iconPosition === "start" ? (
        <span aria-hidden="true" className="c-button__icon">
          {iconNode}
        </span>
      ) : null}
      <span className="c-button__content">{children}</span>
      {iconNode && iconPosition === "end" ? (
        <span aria-hidden="true" className="c-button__icon">
          {iconNode}
        </span>
      ) : null}
    </button>
  );
});
