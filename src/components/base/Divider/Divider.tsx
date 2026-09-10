import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  dashed?: boolean;
  margin?: number | string;
  orientation?: "start" | "center" | "end";
  plain?: boolean;
  role?: string;
  type?: "horizontal" | "vertical";
  vertical?: boolean;
}

function toCssLength(value: number | string | undefined) {
  return typeof value === "number" ? `${Math.max(0, value)}px` : value;
}

export function Divider({
  children,
  className,
  dashed = false,
  margin,
  orientation = "center",
  plain = false,
  role = "separator",
  style,
  type = "horizontal",
  vertical = false,
  ...props
}: DividerProps) {
  const hasLabel = children !== undefined && children !== null && children !== false && children !== true;
  const styleWithMargin =
    margin === undefined
      ? style
      : ({
          ...style,
          "--c-divider-margin": toCssLength(margin),
        } as CSSProperties);

  if (type === "vertical" || vertical) {
    return (
      <span
        {...props}
        aria-orientation="vertical"
        className={cx("c-divider", "c-divider--vertical", dashed && "c-divider--dashed", className)}
        role={role}
        style={styleWithMargin}
      />
    );
  }

  if (hasLabel) {
    return (
      <div
        {...props}
        aria-orientation="horizontal"
        className={cx(
          "c-divider",
          "c-divider--with-label",
          `c-divider--${orientation}`,
          dashed && "c-divider--dashed",
          plain && "c-divider--plain",
          className,
        )}
        role={role}
        style={styleWithMargin}
      >
        <span>{children}</span>
      </div>
    );
  }

  return (
    <hr
      {...props}
      aria-orientation="horizontal"
      className={cx("c-divider", dashed && "c-divider--dashed", className)}
      role={role}
      style={styleWithMargin}
    />
  );
}
