import { Children, Fragment } from "react";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type SpaceSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type SpaceRootProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML">;

export interface SpaceProps extends SpaceRootProps {
  align?: "start" | "center" | "end" | "stretch";
  as?: ElementType;
  block?: boolean;
  children: ReactNode;
  direction?: "horizontal" | "vertical";
  size?: SpaceSize | number;
  split?: ReactNode;
  wrap?: boolean;
}

function toCssGap(value: number) {
  return `${Math.max(0, value)}px`;
}

function hasSplit(split: ReactNode) {
  return split !== undefined && split !== null && split !== false;
}

export function Space({
  align = "center",
  as: Component = "div",
  block = false,
  children,
  className,
  direction = "horizontal",
  size = "md",
  split,
  style,
  wrap,
  ...props
}: SpaceProps) {
  const items = Children.toArray(children);
  const shouldWrap = wrap ?? direction === "horizontal";
  const shouldRenderSplit = hasSplit(split);
  const styleWithGap = typeof size === "number" ? ({ ...style, "--c-space-gap": toCssGap(size) } as CSSProperties) : style;

  return (
    <Component
      className={cx(
        "c-space",
        `c-space--${direction}`,
        `c-space--align-${align}`,
        typeof size === "string" && `c-space--${size}`,
        block && "c-space--block",
        shouldWrap && "c-space--wrap",
        className,
      )}
      style={styleWithGap}
      {...props}
    >
      {items.map((item, index) => {
        const key = typeof item === "object" && item !== null && "key" in item && item.key != null ? item.key : index;

        return (
          <Fragment key={key}>
            <span className="c-space__item">{item}</span>
            {shouldRenderSplit && index < items.length - 1 ? (
              <span aria-hidden="true" className="c-space__split">
                {split}
              </span>
            ) : null}
          </Fragment>
        );
      })}
    </Component>
  );
}
