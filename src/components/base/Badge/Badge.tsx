import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type BadgeStatus = "default" | "success" | "warning" | "error" | "processing";
export type BadgeSize = "sm" | "md";
export type BadgeOffsetValue = number | string;
export type BadgeOffset = BadgeOffsetValue | [BadgeOffsetValue, BadgeOffsetValue];
export type BadgeRibbonPlacement = "start" | "end";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  ariaLabel?: string;
  children?: ReactNode;
  count?: ReactNode;
  dot?: boolean;
  hidden?: boolean;
  inline?: boolean;
  maxCount?: number;
  offset?: BadgeOffset;
  overflowCount?: number;
  showZero?: boolean;
  size?: BadgeSize;
  status?: BadgeStatus;
  text?: ReactNode;
}

export interface BadgeRibbonProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML"> {
  ariaLabel?: string;
  children: ReactNode;
  placement?: BadgeRibbonPlacement;
  status?: BadgeStatus;
  text: ReactNode;
}

function getDisplayCount(count: ReactNode, maxCount: number) {
  if (typeof count === "number" && count > maxCount) {
    return `${maxCount}+`;
  }

  return count;
}

function isAnnounceable(value: ReactNode): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function toCssLength(value: BadgeOffsetValue) {
  return typeof value === "number" ? `${value}px` : value;
}

function getOffsetStyle(offset: BadgeOffset | undefined): CSSProperties | undefined {
  if (offset === undefined) {
    return undefined;
  }

  const [inlineOffset, blockOffset] = Array.isArray(offset) ? offset : [offset, offset];
  return {
    "--c-badge-offset-x": toCssLength(inlineOffset),
    "--c-badge-offset-y": toCssLength(blockOffset),
  } as CSSProperties;
}

function BadgeRoot({
  children,
  ariaLabel,
  className,
  count,
  dot = false,
  hidden = false,
  inline = false,
  maxCount = 99,
  offset,
  overflowCount,
  showZero = false,
  size = "sm",
  style,
  status = "default",
  text,
  ...props
}: BadgeProps) {
  const hasChildren = children !== undefined && children !== null && children !== false;
  const hasText = text !== undefined && text !== null && text !== false && text !== "";
  const hasCount = count !== undefined && count !== null && count !== "" && (showZero || count !== 0);
  const showMarker = !hidden && (dot || hasCount);
  const marker = dot ? null : hasCount ? getDisplayCount(count, overflowCount ?? maxCount) : null;
  const markerLabel = ariaLabel ?? (dot ? `${status} status` : isAnnounceable(marker) ? `${marker}` : undefined);
  const shouldExposeMarker = Boolean(markerLabel);
  const markerStyle = !inline ? getOffsetStyle(offset) : undefined;

  if (hasChildren) {
    return (
      <span className={cx("c-badge", inline && "c-badge--inline", className)} style={style} {...props}>
        {children}
        {showMarker ? (
          <span
            aria-label={markerLabel}
            aria-hidden={shouldExposeMarker ? undefined : true}
            className={cx(
              "c-badge__marker",
              `c-badge__marker--${status}`,
              `c-badge__marker--${size}`,
              dot && "c-badge__marker--dot",
            )}
            role={shouldExposeMarker ? "status" : undefined}
            style={markerStyle}
          >
            {marker}
          </span>
        ) : null}
      </span>
    );
  }

  if (showMarker && !hasText) {
    return (
      <span className={cx("c-badge", "c-badge--standalone", className)} style={style} {...props}>
        <span
          aria-label={markerLabel}
          aria-hidden={shouldExposeMarker ? undefined : true}
          className={cx(
            "c-badge__marker",
            `c-badge__marker--${status}`,
            `c-badge__marker--${size}`,
            dot && "c-badge__marker--dot",
          )}
          role={shouldExposeMarker ? "status" : undefined}
        >
          {marker}
        </span>
      </span>
    );
  }

  return (
    <span className={cx("c-badge-status", `c-badge-status--${size}`, className)} role={hasText ? "status" : undefined} style={style} {...props}>
      {!hidden && (dot || hasText || status !== "default") ? (
        <span
          aria-label={ariaLabel ?? (text ? undefined : `${status} status`)}
          className={cx("c-badge-status__dot", `c-badge-status__dot--${status}`)}
          role={hasText ? undefined : "status"}
        />
      ) : null}
      {hasText ? <span className="c-badge-status__text">{text}</span> : null}
    </span>
  );
}

export function BadgeRibbon({
  ariaLabel,
  children,
  className,
  placement = "end",
  status = "default",
  text,
  ...props
}: BadgeRibbonProps) {
  return (
    <div className={cx("c-badge-ribbon", `c-badge-ribbon--${placement}`, className)} {...props}>
      {children}
      <span
        aria-label={ariaLabel}
        className={cx("c-badge-ribbon__label", `c-badge-ribbon__label--${status}`)}
        role={ariaLabel ? "status" : undefined}
      >
        {text}
      </span>
    </div>
  );
}

export const Badge = Object.assign(BadgeRoot, {
  Ribbon: BadgeRibbon,
});
