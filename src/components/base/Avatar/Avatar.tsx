import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cx } from "../../../utils/cx";
import { getSafeImageSrc, isSafeImageSrc } from "../../../utils/url";
import "./style.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "none" | "online" | "busy" | "away" | "offline";
export type AvatarBadgeTone = "neutral" | "success" | "warning" | "danger";

export interface AvatarBadgeConfig {
  ariaLabel?: string;
  content?: ReactNode;
  tone?: AvatarBadgeTone;
}

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  alt?: string;
  badge?: ReactNode | AvatarBadgeConfig;
  fallback?: ReactNode;
  icon?: ReactNode;
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "onError" | "src" | "srcSet">;
  onImageError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
  shape?: AvatarShape;
  size?: AvatarSize;
  src?: string;
  srcSet?: string;
  status?: AvatarStatus;
  text?: ReactNode;
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  maxCount?: number;
  overlap?: number;
  overflowLabel?: (hiddenCount: number) => ReactNode;
  size?: AvatarSize;
}

type NormalizedAvatarBadge = {
  ariaLabel?: string;
  content?: ReactNode;
  tone: AvatarBadgeTone;
};

const sizeMap: Record<Exclude<AvatarSize, number>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const statusLabelMap: Record<Exclude<AvatarStatus, "none">, string> = {
  online: "Online",
  busy: "Busy",
  away: "Away",
  offline: "Offline",
};

function getSizeValue(size: AvatarSize) {
  const value = typeof size === "number" ? size : sizeMap[size];
  return Number.isFinite(value) && value > 0 ? Math.min(Math.max(value, 16), 160) : sizeMap.md;
}

function getInitials(value: ReactNode, alt?: string) {
  const source = typeof value === "string" ? value : alt;

  if (!source) {
    return null;
  }

  const segments = source.trim().split(/\s+/).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  return segments.slice(0, 2).map((segment) => segment[0]).join("").toUpperCase();
}

function normalizeBadge(badge: AvatarProps["badge"]): NormalizedAvatarBadge | null {
  if (badge === undefined || badge === null || badge === false) {
    return null;
  }

  if (
    typeof badge === "object" &&
    !Array.isArray(badge) &&
    !isValidElement(badge) &&
    ("content" in badge || "tone" in badge || "ariaLabel" in badge)
  ) {
    const config = badge as AvatarBadgeConfig;

    return {
      ariaLabel: config.ariaLabel,
      content: config.content,
      tone: config.tone ?? "neutral",
    };
  }

  if (typeof badge === "object" && !isValidElement(badge)) {
    return null;
  }

  return {
    ariaLabel: typeof badge === "string" || typeof badge === "number" ? `${badge}` : undefined,
    content: badge,
    tone: "neutral" as const,
  };
}

function getSafeImageSrcSet(srcSet: string | undefined) {
  if (!srcSet) {
    return undefined;
  }

  const candidates = srcSet.split(",").map((candidate) => candidate.trim()).filter(Boolean);
  if (candidates.length === 0) {
    return undefined;
  }

  const safeCandidates = candidates.filter((candidate) => {
    const [candidateSrc] = candidate.split(/\s+/);
    return isAvatarSafeImageSrc(candidateSrc);
  });

  return safeCandidates.length === candidates.length ? srcSet.trim() : undefined;
}

function isProtocolRelativeSrc(src: string | undefined) {
  return Boolean(src?.trim().startsWith("//"));
}

function isAvatarSafeImageSrc(src: string | undefined) {
  return isSafeImageSrc(src) && !isProtocolRelativeSrc(src);
}

function getAvatarSafeImageSrc(src: string | undefined) {
  const safeSrc = getSafeImageSrc(src);
  return isProtocolRelativeSrc(safeSrc) ? undefined : safeSrc;
}

export function Avatar({
  alt,
  badge,
  className,
  fallback,
  icon,
  imageProps,
  onImageError,
  shape = "circle",
  size = "md",
  src,
  srcSet,
  status = "none",
  style,
  text,
  title,
  ...props
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeValue = getSizeValue(size);
  const badgeConfig = normalizeBadge(badge);
  const safeSrc = getAvatarSafeImageSrc(src);
  const safeSrcSet = getSafeImageSrcSet(srcSet);

  useEffect(() => {
    setImageFailed(false);
  }, [safeSrc, safeSrcSet]);

  const textFallback = useMemo(() => getInitials(text, alt), [alt, text]);
  const hasImage = Boolean(safeSrc) && !imageFailed;
  const fallbackContent = text ?? icon ?? fallback ?? textFallback ?? "?";
  const rootAriaLabel = props["aria-label"] ?? (!hasImage && alt ? alt : undefined);
  const statusLabel = status === "none" ? undefined : statusLabelMap[status];

  return (
    <span
      {...props}
      aria-label={rootAriaLabel}
      className={cx(
        "c-avatar",
        `c-avatar--${shape}`,
        typeof size === "string" && `c-avatar--${size}`,
        hasImage && "c-avatar--image",
        className,
      )}
      style={{ "--avatar-size": `${sizeValue}px`, ...style } as CSSProperties}
      title={title ?? (typeof alt === "string" ? alt : undefined)}
    >
      <span className="c-avatar__body">
        {hasImage ? (
          <img
            {...imageProps}
            alt={alt ?? ""}
            className={cx("c-avatar__image", imageProps?.className)}
            src={safeSrc}
            srcSet={safeSrcSet}
            onError={(event) => {
              setImageFailed(true);
              onImageError?.(event);
            }}
          />
        ) : (
          <span className={cx("c-avatar__fallback", icon && !text && "c-avatar__fallback--icon")} aria-hidden={alt ? true : undefined}>
            {fallbackContent}
          </span>
        )}
      </span>

      {status !== "none" ? (
        <span className={cx("c-avatar__status", `c-avatar__status--${status}`)} aria-label={statusLabel} role="status" />
      ) : null}

      {badgeConfig ? (
        <span
          aria-label={badgeConfig.ariaLabel}
          aria-hidden={badgeConfig.ariaLabel ? undefined : true}
          className={cx("c-avatar__badge", `c-avatar__badge--${badgeConfig.tone}`)}
          role={badgeConfig.ariaLabel ? "status" : undefined}
        >
          {badgeConfig.content}
        </span>
      ) : null}
    </span>
  );
}

export function AvatarGroup({
  children,
  className,
  maxCount,
  overlap = 10,
  overflowLabel,
  size = "md",
  style,
  ...props
}: AvatarGroupProps) {
  const childItems = Children.toArray(children).filter(Boolean);
  const normalizedMaxCount = typeof maxCount === "number" && Number.isFinite(maxCount) ? Math.max(0, Math.trunc(maxCount)) : childItems.length;
  const visibleItems = childItems.slice(0, normalizedMaxCount);
  const hiddenCount = Math.max(childItems.length - visibleItems.length, 0);
  const groupSize = getSizeValue(size);

  return (
    <span
      {...props}
      className={cx("c-avatar-group", className)}
      style={{ "--avatar-size": `${groupSize}px`, "--avatar-group-overlap": `${Math.max(0, overlap)}px`, ...style } as CSSProperties}
    >
      {visibleItems.map((child, index) => (
        <span className="c-avatar-group__item" key={isValidElement(child) && child.key ? child.key : index}>
          {isValidElement<Partial<AvatarProps>>(child)
            ? cloneElement(child as ReactElement<Partial<AvatarProps>>, { size: child.props.size ?? size })
            : child}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="c-avatar-group__item">
          <Avatar
            alt={`${hiddenCount} more avatars`}
            className="c-avatar-group__overflow"
            size={size}
            text={overflowLabel ? overflowLabel(hiddenCount) : `+${hiddenCount}`}
          />
        </span>
      ) : null}
    </span>
  );
}
