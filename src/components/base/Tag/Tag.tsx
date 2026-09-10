import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

type NativeSpanProps = Omit<HTMLAttributes<HTMLSpanElement>, "color" | "dangerouslySetInnerHTML" | "onClick">;
type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color" | "dangerouslySetInnerHTML" | "onChange" | "type">;
type TagCustomColorStyle = CSSProperties & {
  "--c-tag-custom-bg"?: string;
  "--c-tag-custom-border"?: string;
  "--c-tag-custom-text"?: string;
};

export type TagColor = string;
export type TagSize = "sm" | "md";
export type TagTone = "default" | "neutral" | "subtle" | "strong" | "success" | "warning" | "danger" | "info";
export type TagStatus = "default" | "neutral" | "success" | "warning" | "error" | "processing";

type BaseTagProps = {
  children: ReactNode;
  checkable?: boolean;
  checked?: boolean;
  closeAriaLabel?: string;
  closable?: boolean;
  color?: TagColor;
  dangerouslySetInnerHTML?: never;
  disabled?: boolean;
  icon?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  onClose?: () => void;
  size?: TagSize;
  status?: TagStatus;
  tone?: TagTone;
};

export type TagProps = BaseTagProps &
  NativeSpanProps &
  NativeButtonProps & {
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  };

function isInteractiveTag(checkable: boolean, onClick: TagProps["onClick"], closable: boolean) {
  return checkable || Boolean(onClick && !closable);
}

export function Tag({
  children,
  checkable = false,
  checked = false,
  className,
  closeAriaLabel = "移除标签",
  closable,
  color,
  disabled = false,
  icon,
  onCheckedChange,
  onClick,
  onClose,
  size = "sm",
  status,
  style,
  tone = "neutral",
  ...props
}: TagProps) {
  const closeable = closable ?? Boolean(onClose);
  const hasCloseButton = closeable && Boolean(onClose);
  const closeHandler = hasCloseButton ? onClose : undefined;
  const interactive = isInteractiveTag(checkable, onClick, hasCloseButton);
  const resolvedTone = normalizeTone(status === "error" ? "danger" : status === "processing" ? "info" : status ?? tone);
  const customColors = getCustomTagColors(color);
  const tagStyle = getTagStyle(customColors, style);
  const tagClassName = cx(
    "c-tag",
    `c-tag--${size}`,
    `c-tag--${resolvedTone}`,
    customColors && "c-tag--custom",
    checkable && "c-tag--checkable",
    checked && "c-tag--checked",
    disabled && "c-tag--disabled",
    hasCloseButton && "c-tag--closable",
    className,
  );
  const content = (
    <>
      {icon ? (
        <span className="c-tag__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="c-tag__label">{children}</span>
    </>
  );

  if (interactive) {
    return (
      <button
        aria-pressed={checkable ? checked : undefined}
        className={tagClassName}
        disabled={disabled}
        type="button"
        style={tagStyle}
        {...(props as NativeButtonProps)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && checkable) {
            onCheckedChange?.(!checked);
          }
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={tagClassName} style={tagStyle} {...(props as NativeSpanProps)}>
      {content}
      {hasCloseButton ? (
        <button
          aria-label={closeAriaLabel}
          className="c-tag__close"
          disabled={disabled}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeHandler?.();
          }}
        >
          <span aria-hidden="true">x</span>
        </button>
      ) : null}
    </span>
  );
}

function normalizeTone(tone: TagTone | TagStatus) {
  return tone === "default" ? "neutral" : tone;
}

function getTagStyle(customColor: ReturnType<typeof getCustomTagColors>, style: CSSProperties | undefined): CSSProperties | undefined {
  if (!customColor) {
    return style;
  }

  return {
    ...style,
    "--c-tag-custom-bg": customColor.background,
    "--c-tag-custom-border": customColor.border,
    "--c-tag-custom-text": customColor.text,
  } as TagCustomColorStyle;
}

function getCustomTagColors(color: TagColor | undefined) {
  const accent = normalizeHexTagColor(color);

  if (!accent) {
    return null;
  }

  const accentRgb = hexToRgb(accent);
  const backgroundRgb = mixRgb(accentRgb, [255, 255, 255], 0.88);
  const borderRgb: [number, number, number] =
    getContrastRatio(accentRgb, [255, 255, 255]) < 1.6 ? [200, 200, 195] : mixRgb(accentRgb, [255, 255, 255], 0.56);
  const text = getContrastRatio(accentRgb, backgroundRgb) >= 4.5 ? accent : "#1f1f1d";

  return {
    background: rgbToHex(backgroundRgb),
    border: rgbToHex(borderRgb),
    text,
  };
}

function normalizeHexTagColor(color: TagColor | undefined) {
  const value = color?.trim();

  if (!value) {
    return null;
  }

  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(value);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toLowerCase();
  }

  return /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

function hexToRgb(color: string): [number, number, number] {
  return [Number.parseInt(color.slice(1, 3), 16), Number.parseInt(color.slice(3, 5), 16), Number.parseInt(color.slice(5, 7), 16)];
}

function mixRgb(source: [number, number, number], target: [number, number, number], targetWeight: number): [number, number, number] {
  return source.map((channel, index) => Math.round(channel * (1 - targetWeight) + target[index] * targetWeight)) as [number, number, number];
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function getContrastRatio(foreground: [number, number, number], background: [number, number, number]) {
  const light = getRelativeLuminance(foreground);
  const dark = getRelativeLuminance(background);
  const brightest = Math.max(light, dark);
  const dimmest = Math.min(light, dark);

  return (brightest + 0.05) / (dimmest + 0.05);
}

function getRelativeLuminance(rgb: [number, number, number]) {
  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;

    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
