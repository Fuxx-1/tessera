import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import type { SpaceSize } from "../Space";
import "./style.css";

type FlexRootProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;

export interface FlexProps extends FlexRootProps {
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  as?: ElementType;
  children: ReactNode;
  dangerouslySetInnerHTML?: never;
  direction?: "row" | "column";
  fullWidth?: boolean;
  gap?: SpaceSize | number;
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  responsive?: boolean;
  wrap?: boolean;
}

function toCssGap(value: number) {
  return `${Math.max(0, Number.isFinite(value) ? value : 0)}px`;
}

export function Flex({
  align = "stretch",
  as: Component = "div",
  children,
  className,
  direction = "row",
  fullWidth = false,
  gap = "md",
  justify = "start",
  responsive = true,
  style,
  wrap = false,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: FlexProps) {
  const styleWithGap = typeof gap === "number" ? ({ ...style, "--c-flex-gap": toCssGap(gap) } as CSSProperties) : style;

  return (
    <Component
      className={cx(
        "c-flex",
        `c-flex--${direction}`,
        `c-flex--align-${align}`,
        `c-flex--justify-${justify}`,
        typeof gap === "string" && `c-flex--gap-${gap}`,
        fullWidth && "c-flex--full",
        wrap && "c-flex--wrap",
        responsive && "c-flex--responsive",
        className,
      )}
      style={styleWithGap}
      {...props}
    >
      {children}
    </Component>
  );
}
