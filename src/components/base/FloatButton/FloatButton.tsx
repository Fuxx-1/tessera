import { forwardRef } from "react";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { Badge, type BadgeProps } from "../Badge";
import { Tooltip, type TooltipProps } from "../Tooltip";
import "./style.css";

export type FloatButtonPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type FloatButtonVariant = "primary" | "secondary";
export type FloatButtonShape = "circle" | "square";
export type FloatButtonOffset = number | string;
export type FloatButtonGap = number | string;

export interface FloatButtonGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML"> {
  children: ReactNode;
  gap?: FloatButtonGap;
  offset?: FloatButtonOffset | [FloatButtonOffset, FloatButtonOffset];
  position?: FloatButtonPosition;
}

export interface FloatButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "dangerouslySetInnerHTML"> {
  badge?: Pick<BadgeProps, "ariaLabel" | "count" | "dot" | "hidden" | "maxCount" | "showZero" | "status">;
  children: ReactNode;
  label?: string;
  loading?: boolean;
  offset?: FloatButtonOffset | [FloatButtonOffset, FloatButtonOffset];
  position?: FloatButtonPosition;
  shape?: FloatButtonShape;
  tooltip?: ReactNode;
  tooltipPlacement?: TooltipProps["placement"];
  variant?: FloatButtonVariant;
}

type InternalFloatButtonProps = FloatButtonProps & {
  dangerouslySetInnerHTML?: never;
};

type InternalFloatButtonGroupProps = FloatButtonGroupProps & {
  dangerouslySetInnerHTML?: never;
};

function toCssOffset(value: FloatButtonOffset) {
  return typeof value === "number" ? `${value}px` : value;
}

function getOffsetStyle(offset: FloatButtonProps["offset"]): CSSProperties {
  if (offset === undefined) {
    return {};
  }

  if (Array.isArray(offset)) {
    return {
      "--c-float-button-inline-offset": toCssOffset(offset[0]),
      "--c-float-button-block-offset": toCssOffset(offset[1]),
    } as CSSProperties;
  }

  return {
    "--c-float-button-inline-offset": toCssOffset(offset),
    "--c-float-button-block-offset": toCssOffset(offset),
  } as CSSProperties;
}

function getGapStyle(gap: FloatButtonGap | undefined): CSSProperties {
  if (gap === undefined) {
    return {};
  }

  return {
    "--c-float-button-group-gap": toCssOffset(gap),
  } as CSSProperties;
}

const FloatButtonRoot = forwardRef<HTMLButtonElement, FloatButtonProps>(function FloatButton(
  {
    "aria-label": ariaLabel,
    badge,
    children,
    className,
    disabled,
    label,
    loading = false,
    offset,
    position = "bottom-right",
    shape = "circle",
    style,
    title,
    tooltip,
    tooltipPlacement,
    type = "button",
    variant = "primary",
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ...props
  }: InternalFloatButtonProps,
  ref,
) {
  const accessibleLabel = ariaLabel ?? label ?? (typeof title === "string" ? title : undefined);
  const tooltipContent = tooltip ?? title;
  const offsetStyle = getOffsetStyle(offset);
  const busyProps = loading ? { "aria-busy": true } : {};
  const iconProps = accessibleLabel ? { "aria-hidden": true } : {};
  const button = (
    <button
      aria-label={accessibleLabel}
      className={cx(
        "c-float-button",
        `c-float-button--${variant}`,
        `c-float-button--${shape}`,
        `c-float-button--${position}`,
        loading && "c-float-button--loading",
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      style={{ ...offsetStyle, ...style }}
      title={title}
      type={type}
      {...busyProps}
      {...props}
    >
      <span className="c-float-button__icon" {...iconProps}>
        {children}
      </span>
      {loading ? <span className="c-float-button__spinner" aria-hidden="true" /> : null}
    </button>
  );

  if (import.meta.env.DEV && !accessibleLabel) {
    console.warn("FloatButton requires an accessible label. Provide label, aria-label, or a string title.");
  }

  const node = badge ? (
    <Badge className={cx("c-float-button-badge", `c-float-button-badge--${position}`)} style={offsetStyle} {...badge}>
      {button}
    </Badge>
  ) : (
    button
  );

  if (!tooltipContent) {
    return node;
  }

  return (
    <Tooltip
      className={cx("c-float-button-tooltip", `c-float-button-tooltip--${position}`)}
      content={tooltipContent}
      placement={tooltipPlacement}
      style={offsetStyle}
    >
      {node}
    </Tooltip>
  );
});

const FloatButtonGroup = forwardRef<HTMLDivElement, FloatButtonGroupProps>(function FloatButtonGroup(
  {
    "aria-label": ariaLabel,
    children,
    className,
    gap,
    offset,
    position = "bottom-right",
    role = "group",
    style,
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ...props
  }: InternalFloatButtonGroupProps,
  ref,
) {
  const offsetStyle = getOffsetStyle(offset);
  const gapStyle = getGapStyle(gap);

  if (import.meta.env.DEV && role === "group" && !ariaLabel) {
    console.warn("FloatButton.Group requires an accessible label when role is group.");
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cx("c-float-button-group", `c-float-button-group--${position}`, className)}
      ref={ref}
      role={role}
      style={{ ...offsetStyle, ...gapStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
});

export const FloatButton = Object.assign(FloatButtonRoot, {
  Group: FloatButtonGroup,
});
