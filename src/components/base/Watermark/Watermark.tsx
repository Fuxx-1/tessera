import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { getSafeImageSrc } from "../../../utils/url";
import "./style.css";

export type WatermarkContent = string | string[];
export type WatermarkGap = number | readonly [number, number];
export type WatermarkOffset = number | readonly [number, number];

export type WatermarkFont = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: CSSProperties["fontStyle"];
  fontWeight?: CSSProperties["fontWeight"];
  lineHeight?: number;
};

export interface WatermarkProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "content"> {
  children?: ReactNode;
  content?: WatermarkContent;
  font?: WatermarkFont;
  gap?: WatermarkGap;
  image?: string;
  offset?: WatermarkOffset;
  opacity?: number;
  rotate?: number;
  text?: WatermarkContent;
  zIndex?: number;
}

const defaultFont: Required<Pick<WatermarkFont, "color" | "fontFamily" | "fontSize" | "fontWeight" | "lineHeight">> = {
  color: "#1f1f1d",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  fontSize: 14,
  fontWeight: 560,
  lineHeight: 1.5,
};
const MAX_CONTENT_LINES = 4;
const MAX_CONTENT_LINE_LENGTH = 96;
const MAX_TILE_SIZE = 720;
const MIN_TILE_WIDTH = 120;
const MIN_TILE_HEIGHT = 72;
const safeSvgColorPattern =
  /^(#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\(\s*[0-9.%+-]+(?:\s*,\s*|\s+)[0-9.%+-]+(?:\s*,\s*|\s+)[0-9.%+-]+(?:\s*(?:,|\/)\s*[0-9.%+-]+)?\s*\)|black|white|transparent|currentColor)$/;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePair(
  value: WatermarkGap | WatermarkOffset | undefined,
  fallback: readonly [number, number],
  bounds: { max?: number; min?: number } = {},
) {
  const min = bounds.min ?? 0;
  const max = bounds.max ?? Number.POSITIVE_INFINITY;
  const safePairValue = (item: number | undefined, fallbackItem: number) =>
    clamp(toFiniteNumber(item, fallbackItem), min, max);

  if (Array.isArray(value)) {
    return [safePairValue(value[0], fallback[0]), safePairValue(value[1], fallback[1])] as const;
  }

  if (typeof value === "number") {
    const safeValue = safePairValue(value, fallback[0]);
    return [safeValue, safeValue] as const;
  }

  return fallback;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")}`;
}

function normalizeContent(content: WatermarkContent | undefined) {
  const normalizeLine = (line: string) => {
    const normalized = line.trim().replace(/\s+/g, " ");
    return normalized.length > MAX_CONTENT_LINE_LENGTH ? `${normalized.slice(0, MAX_CONTENT_LINE_LENGTH - 3)}...` : normalized;
  };

  if (Array.isArray(content)) {
    return content.map(normalizeLine).filter((item) => item.length > 0).slice(0, MAX_CONTENT_LINES);
  }

  return content && content.trim().length > 0 ? [normalizeLine(content)] : [];
}

function getSafeSvgColor(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && safeSvgColorPattern.test(normalized) ? normalized : fallback;
}

function getSafeFontFamily(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length <= 160 && !/[<>{};]/.test(normalized) ? normalized : defaultFont.fontFamily;
}

function getSafeFontStyle(value: CSSProperties["fontStyle"]) {
  return value === "italic" || value === "oblique" || value === "normal" ? value : undefined;
}

function getSafeFontWeight(value: CSSProperties["fontWeight"]) {
  if (typeof value === "number") {
    return clamp(value, 100, 900);
  }

  return value === "normal" || value === "bold" || value === "lighter" || value === "bolder" ? value : defaultFont.fontWeight;
}

function createWatermarkImage({
  content,
  font,
  gap,
  image,
  offset,
  opacity,
  rotate,
}: {
  content: string[];
  font: Required<Pick<WatermarkFont, "color" | "fontFamily" | "fontSize" | "fontWeight" | "lineHeight">> &
    Pick<WatermarkFont, "fontStyle">;
  gap: readonly [number, number];
  image?: string;
  offset: readonly [number, number];
  opacity: number;
  rotate: number;
}) {
  const hasText = content.length > 0;
  const maxLineLength = Math.max(...content.map((item) => item.length), 8);
  const textWidth = hasText ? Math.min(Math.max(maxLineLength * font.fontSize * 0.62, 96), 320) : 0;
  const textLineHeight = font.fontSize * font.lineHeight;
  const textHeight = hasText ? content.length * textLineHeight : 0;
  const imageSize = image ? Math.max(64, Math.min(textWidth || 128, 160)) : 0;
  const imageTextGap = image && hasText ? Math.max(6, Math.round(font.fontSize * 0.45)) : 0;
  const markWidth = Math.max(textWidth, imageSize, 96);
  const markHeight =
    image && hasText ? Math.max(imageSize + imageTextGap + textHeight, 40) : Math.max(textHeight, imageSize, 40);
  const tileWidth = clamp(Math.ceil(markWidth + gap[0]), MIN_TILE_WIDTH, MAX_TILE_SIZE);
  const tileHeight = clamp(Math.ceil(markHeight + gap[1]), MIN_TILE_HEIGHT, MAX_TILE_SIZE);
  const centerX = Math.round(tileWidth / 2 + offset[0]);
  const centerY = Math.round(tileHeight / 2 + offset[1]);
  const imageY = hasText ? -markHeight / 2 : -imageSize / 2;
  const textStartY = image
    ? -markHeight / 2 + imageSize + imageTextGap + textLineHeight / 2
    : -((content.length - 1) * textLineHeight) / 2;
  const fontStyle = font.fontStyle ? ` font-style="${escapeXml(String(font.fontStyle))}"` : "";

  const imageNode = image
    ? `<image href="${escapeXml(image)}" x="${-imageSize / 2}" y="${imageY}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet" />`
    : "";
  const textNode = content
    .map((line, index) => {
      const y = textStartY + index * textLineHeight;
      return `<text x="0" y="${y}" text-anchor="middle" dominant-baseline="central">${escapeXml(line)}</text>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${tileWidth} ${tileHeight}"><g opacity="${opacity}" transform="translate(${centerX} ${centerY}) rotate(${rotate})" fill="${escapeXml(font.color)}" font-family="${escapeXml(font.fontFamily)}" font-size="${font.fontSize}" font-weight="${escapeXml(String(font.fontWeight))}"${fontStyle}>${imageNode}${textNode}</g></svg>`;

  return {
    backgroundImage: encodeSvg(svg),
    tileHeight,
    tileWidth,
  };
}

export function Watermark({
  children,
  className,
  content,
  font,
  gap,
  image,
  offset,
  opacity = 0.14,
  rotate = -22,
  style,
  text,
  zIndex = 1,
  ...props
}: WatermarkProps) {
  const lines = normalizeContent(content ?? text ?? "Tessera Components");
  const fontSize = toFiniteNumber(font?.fontSize, defaultFont.fontSize);
  const lineHeight = toFiniteNumber(font?.lineHeight, defaultFont.lineHeight);
  const resolvedFont = {
    ...defaultFont,
    ...font,
    color: getSafeSvgColor(font?.color, defaultFont.color),
    fontFamily: getSafeFontFamily(font?.fontFamily),
    fontSize: clamp(fontSize, 10, 48),
    fontStyle: getSafeFontStyle(font?.fontStyle),
    fontWeight: getSafeFontWeight(font?.fontWeight),
    lineHeight: clamp(lineHeight, 1, 3),
  };
  const resolvedGap = normalizePair(gap, [96, 72], { min: 0, max: MAX_TILE_SIZE });
  const resolvedOffset = normalizePair(offset, [0, 0], { min: -MAX_TILE_SIZE, max: MAX_TILE_SIZE });
  const safeOpacity = clamp(opacity, 0, 1);
  const safeRotate = toFiniteNumber(rotate, -22);
  const safeZIndex = clamp(Math.trunc(toFiniteNumber(zIndex, 1)), -1, 2147483647);
  const safeImage = getSafeImageSrc(image);
  const linesKey = lines.join("\u0000");

  const watermark = useMemo(
    () =>
      createWatermarkImage({
        content: lines,
        font: resolvedFont,
        gap: resolvedGap,
        image: safeImage,
        offset: resolvedOffset,
        opacity: safeOpacity,
        rotate: safeRotate,
      }),
    [
      safeImage,
      linesKey,
      resolvedFont.color,
      resolvedFont.fontFamily,
      resolvedFont.fontSize,
      resolvedFont.fontStyle,
      resolvedFont.fontWeight,
      resolvedFont.lineHeight,
      resolvedGap[0],
      resolvedGap[1],
      resolvedOffset[0],
      resolvedOffset[1],
      safeRotate,
      safeOpacity,
    ],
  );

  return (
    <div
      className={cx("c-watermark", !children && "c-watermark--empty", className)}
      style={
        {
          "--c-watermark-image": `url("${watermark.backgroundImage}")`,
          "--c-watermark-tile-height": `${watermark.tileHeight}px`,
          "--c-watermark-tile-width": `${watermark.tileWidth}px`,
          "--c-watermark-z-index": safeZIndex,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children ? <div className="c-watermark__content">{children}</div> : null}
      <div className="c-watermark__layer" aria-hidden="true" />
    </div>
  );
}
