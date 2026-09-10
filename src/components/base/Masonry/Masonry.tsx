import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import type { SpaceSize } from "../Space";
import "./style.css";

export type MasonryColumns = 1 | 2 | 3 | 4 | 5 | 6 | "auto";
export type MasonryOrder = "columns" | "rows";
export type MasonryItemBreakInside = "avoid" | "auto";

export interface MasonryProps extends HTMLAttributes<HTMLElement> {
  ariaLabel?: string;
  as?: ElementType;
  children: ReactNode;
  columns?: MasonryColumns;
  columnsMd?: MasonryColumns;
  columnsSm?: MasonryColumns;
  gap?: SpaceSize | number;
  minItemWidth?: number;
  order?: MasonryOrder;
}

export interface MasonryItemProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  breakInside?: MasonryItemBreakInside;
  children: ReactNode;
}

function toCssGap(value: number) {
  return `${Math.max(0, value)}px`;
}

function getColumnsClass(prefix: string, columns: MasonryColumns | undefined) {
  if (columns === undefined) {
    return undefined;
  }

  return columns === "auto" ? `${prefix}-auto` : `${prefix}-${columns}`;
}

function shouldAddListRole(component: ElementType) {
  return component !== "ul" && component !== "ol";
}

export function Masonry({
  ariaLabel,
  as: Component = "ul",
  children,
  className,
  columns = 3,
  columnsMd,
  columnsSm,
  gap = "md",
  minItemWidth = 220,
  order = "columns",
  role,
  style,
  ...props
}: MasonryProps) {
  const customProperties: CSSProperties = {
    ...style,
    "--c-masonry-min": `${Math.max(1, minItemWidth)}px`,
    ...(typeof gap === "number" ? { "--c-masonry-gap": toCssGap(gap) } : null),
  } as CSSProperties;
  const listRole = role ?? (shouldAddListRole(Component) ? "list" : undefined);

  return (
    <Component
      aria-label={ariaLabel}
      className={cx(
        "c-masonry",
        `c-masonry--order-${order}`,
        getColumnsClass("c-masonry--cols", columns),
        getColumnsClass("c-masonry--cols-md", columnsMd),
        getColumnsClass("c-masonry--cols-sm", columnsSm),
        typeof gap === "string" && `c-masonry--gap-${gap}`,
        className,
      )}
      role={listRole}
      style={customProperties}
      {...props}
    >
      {children}
    </Component>
  );
}

export function MasonryItem({
  as: Component = "li",
  breakInside = "avoid",
  children,
  className,
  role,
  ...props
}: MasonryItemProps) {
  const itemRole = role ?? (Component === "li" ? undefined : "listitem");

  return (
    <Component
      className={cx("c-masonry__item", `c-masonry__item--break-${breakInside}`, className)}
      role={itemRole}
      {...props}
    >
      {children}
    </Component>
  );
}
