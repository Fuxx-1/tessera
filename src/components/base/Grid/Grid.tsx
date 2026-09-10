import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import type { SpaceSize } from "../Space";
import "./style.css";

type GridColumns = 1 | 2 | 3 | 4 | 6 | 12 | "auto";
type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "full";
type GridRootProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;

const GRID_COLUMNS = new Set<GridColumns>([1, 2, 3, 4, 6, 12, "auto"]);
const GRID_SPANS = new Set<GridSpan>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, "full"]);

export interface GridProps extends GridRootProps {
  as?: ElementType;
  children: ReactNode;
  columns?: GridColumns;
  dense?: boolean;
  dangerouslySetInnerHTML?: never;
  gap?: SpaceSize | number;
  minItemWidth?: number;
}

export interface GridItemProps extends GridRootProps {
  as?: ElementType;
  children: ReactNode;
  dangerouslySetInnerHTML?: never;
  span?: GridSpan;
  spanMd?: GridSpan;
  spanSm?: GridSpan;
}

function toCssGap(value: number) {
  return `${Math.max(0, Number.isFinite(value) ? value : 0)}px`;
}

function toCssMinItemWidth(value: number) {
  return `${Math.max(1, Number.isFinite(value) ? value : 1)}px`;
}

function normalizeSpan(span: GridSpan | undefined) {
  if (span === "full") {
    return span;
  }

  if (typeof span === "number" && Number.isFinite(span)) {
    return Math.min(12, Math.max(1, Math.round(span))) as GridSpan;
  }

  return GRID_SPANS.has(span as GridSpan) ? span : undefined;
}

function getSpanClass(prefix: string, span: GridSpan | undefined) {
  const safeSpan = normalizeSpan(span);
  if (safeSpan === undefined) {
    return undefined;
  }

  return safeSpan === "full" ? `${prefix}-full` : `${prefix}-${safeSpan}`;
}

export function Grid({
  as: Component = "div",
  children,
  className,
  columns = 12,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  dense = false,
  gap = "md",
  minItemWidth = 220,
  style,
  ...props
}: GridProps) {
  const safeColumns = GRID_COLUMNS.has(columns as GridColumns) ? columns : 12;
  const customProperties: CSSProperties = {
    ...style,
    "--c-grid-min": toCssMinItemWidth(minItemWidth),
    ...(typeof gap === "number" ? { "--c-grid-gap": toCssGap(gap) } : null),
  } as CSSProperties;

  return (
    <Component
      className={cx(
        "c-grid",
        safeColumns === "auto" ? "c-grid--auto" : `c-grid--cols-${safeColumns}`,
        dense && "c-grid--dense",
        typeof gap === "string" && `c-grid--gap-${gap}`,
        className,
      )}
      style={customProperties}
      {...props}
    >
      {children}
    </Component>
  );
}

export function GridItem({
  as: Component = "div",
  children,
  className,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  span = 1,
  spanMd,
  spanSm,
  ...props
}: GridItemProps) {
  return (
    <Component
      className={cx(
        "c-grid__item",
        getSpanClass("c-grid__item--span", span),
        getSpanClass("c-grid__item--span-md", spanMd),
        getSpanClass("c-grid__item--span-sm", spanSm),
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
