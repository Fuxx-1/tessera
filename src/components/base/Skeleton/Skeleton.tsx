import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type SkeletonSize = "sm" | "md" | "lg";
export type SkeletonPreset = "paragraph" | "avatar" | "button" | "table" | "card" | "image";

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  active?: boolean;
  avatar?: boolean | { size?: SkeletonSize };
  button?: boolean | { width?: string | number };
  card?: boolean | { rows?: number };
  children?: ReactNode;
  image?: boolean | { aspectRatio?: string | number; height?: string | number; width?: string | number };
  lines?: number;
  loading?: boolean;
  loadingLabel?: string;
  paragraph?: boolean | { rows?: number; widths?: Array<string | number> };
  preset?: SkeletonPreset;
  round?: boolean;
  size?: SkeletonSize;
  table?: boolean | { rows?: number };
  title?: boolean | { width?: string | number };
  width?: string | number;
}

function getCssSize(value: string | number | undefined) {
  return typeof value === "number" ? `${value}px` : value;
}

function getCssVarStyle(name: string, value: string | number | undefined) {
  const cssValue = getCssSize(value);
  return cssValue === undefined ? undefined : ({ [name]: cssValue } as CSSProperties);
}

function getCssRawValue(value: string | number | undefined) {
  return value === undefined ? undefined : String(value);
}

function getImageStyle(image: SkeletonProps["image"]) {
  if (typeof image !== "object") {
    return undefined;
  }

  return {
    "--skeleton-image-width": getCssSize(image.width),
    "--skeleton-image-height": getCssSize(image.height),
    "--skeleton-image-ratio": getCssRawValue(image.aspectRatio),
  } as CSSProperties;
}

export function Skeleton({
  active = true,
  avatar = false,
  button = false,
  card = false,
  children,
  className,
  image = false,
  lines,
  loading = true,
  loadingLabel,
  paragraph = true,
  preset,
  round = false,
  size = "md",
  style,
  table = false,
  title = true,
  width,
  ...props
}: SkeletonProps) {
  if (!loading) {
    return <>{children}</>;
  }

  const showAvatar = Boolean(avatar) || preset === "avatar";
  const avatarSize = typeof avatar === "object" ? avatar.size ?? size : size;
  const titleWidth = typeof title === "object" ? title.width : undefined;
  const paragraphRows = lines ?? (typeof paragraph === "object" ? paragraph.rows ?? 3 : paragraph ? 3 : 0);
  const paragraphWidths = typeof paragraph === "object" ? paragraph.widths ?? [] : [];
  const lineCount = Math.max(0, Math.floor(paragraphRows));
  const showButton = Boolean(button) || preset === "button";
  const buttonWidth = typeof button === "object" ? button.width : undefined;
  const showTable = Boolean(table) || preset === "table";
  const tableRows = Math.max(1, Math.floor(typeof table === "object" ? table.rows ?? 4 : 4));
  const showCard = Boolean(card) || preset === "card";
  const showImage = Boolean(image) || preset === "image";
  const cardRows = Math.max(1, Math.floor(typeof card === "object" ? card.rows ?? 3 : 3));
  const rootStyle = width === undefined ? style : ({ ...style, inlineSize: getCssSize(width) } as CSSProperties);
  const statusLabel = loadingLabel ?? (typeof props["aria-label"] === "string" ? props["aria-label"] : "Loading content");

  return (
    <div
      {...props}
      aria-label={statusLabel}
      aria-busy="true"
      aria-live="polite"
      className={cx(
        "c-skeleton",
        `c-skeleton--${size}`,
        active && "c-skeleton--active",
        showAvatar && "c-skeleton--with-avatar",
        showButton && "c-skeleton--button",
        showTable && "c-skeleton--table",
        showCard && "c-skeleton--card",
        showImage && "c-skeleton--image",
        round && "c-skeleton--round",
        className,
      )}
      role="status"
      style={rootStyle}
    >
      <span className="c-sr-only">{statusLabel}</span>
      {showCard ? (
        <span className="c-skeleton__card" aria-hidden="true">
          <span className="c-skeleton__media" />
          <span className="c-skeleton__body" aria-hidden="true">
            <span className="c-skeleton__title" />
            {Array.from({ length: cardRows }, (_, index) => (
              <span className="c-skeleton__line" key={index} style={getCssVarStyle("--skeleton-line-width", index === cardRows - 1 ? "62%" : "100%")} />
            ))}
          </span>
        </span>
      ) : showTable ? (
        <span className="c-skeleton__table" aria-hidden="true">
          {Array.from({ length: tableRows }, (_, rowIndex) => (
            <span className="c-skeleton__table-row" key={rowIndex}>
              <span className="c-skeleton__cell c-skeleton__cell--short" />
              <span className="c-skeleton__cell" />
              <span className="c-skeleton__cell c-skeleton__cell--medium" />
            </span>
          ))}
        </span>
      ) : showButton ? (
        <span className="c-skeleton__button" style={getCssVarStyle("--skeleton-button-width", buttonWidth)} aria-hidden="true" />
      ) : showImage ? (
        <span className="c-skeleton__image" style={getImageStyle(image)} aria-hidden="true" />
      ) : (
        <>
          {showAvatar ? <span className={cx("c-skeleton__avatar", `c-skeleton__avatar--${avatarSize}`)} aria-hidden="true" /> : null}
          <span className="c-skeleton__body" aria-hidden="true">
            {title ? <span className="c-skeleton__title" style={getCssVarStyle("--skeleton-title-width", titleWidth)} /> : null}
            {Array.from({ length: lineCount }, (_, index) => (
              <span
                className="c-skeleton__line"
                key={index}
                style={getCssVarStyle("--skeleton-line-width", paragraphWidths[index])}
              />
            ))}
          </span>
        </>
      )}
    </div>
  );
}
