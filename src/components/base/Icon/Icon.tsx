import { forwardRef, useId } from "react";
import type { SVGAttributes } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type IconSize = "sm" | "md" | "lg" | number;
export type IconTone = "neutral" | "muted" | "accent" | "success" | "warning" | "danger";

type IconPath = {
  d: string;
  fill?: "none" | "currentColor";
};

type IconDefinition = {
  viewBox: "0 0 24 24";
  paths: readonly IconPath[];
};

export const iconRegistry = {
  add: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M12 5v14M5 12h14" }],
  },
  alert: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 8v5" },
      { d: "M12 17h.01" },
      { d: "M10.2 4.5 3.4 17a2 2 0 0 0 1.8 3h13.6a2 2 0 0 0 1.8-3L13.8 4.5a2 2 0 0 0-3.6 0Z" },
    ],
  },
  calendar: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M8 3v4M16 3v4M4 9h16" },
      { d: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" },
    ],
  },
  check: {
    viewBox: "0 0 24 24",
    paths: [{ d: "m5 12 4 4L19 6" }],
  },
  "chevron-down": {
    viewBox: "0 0 24 24",
    paths: [{ d: "m6 9 6 6 6-6" }],
  },
  "chevron-right": {
    viewBox: "0 0 24 24",
    paths: [{ d: "m9 6 6 6-6 6" }],
  },
  code: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "m8 9-4 3 4 3" },
      { d: "m16 9 4 3-4 3" },
      { d: "m14 5-4 14" },
    ],
  },
  close: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M6 6l12 12M18 6 6 18" }],
  },
  copy: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" },
      { d: "M4 14V6a2 2 0 0 1 2-2h8" },
    ],
  },
  download: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 4v10" },
      { d: "m7 10 5 5 5-5" },
      { d: "M5 20h14" },
    ],
  },
  edit: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 20h9" },
      { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" },
    ],
  },
  "external-link": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M14 4h6v6" },
      { d: "m10 14 10-10" },
      { d: "M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" },
    ],
  },
  filter: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M4 6h16M7 12h10M10 18h4" }],
  },
  info: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 16v-4" },
      { d: "M12 8h.01" },
      { d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" },
    ],
  },
  more: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", fill: "currentColor" },
      { d: "M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", fill: "currentColor" },
      { d: "M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", fill: "currentColor" },
    ],
  },
  minus: {
    viewBox: "0 0 24 24",
    paths: [{ d: "M5 12h14" }],
  },
  refresh: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M20 12a8 8 0 0 1-13.65 5.65" },
      { d: "M4 12A8 8 0 0 1 17.65 6.35" },
      { d: "M17 2v5h5" },
      { d: "M7 22v-5H2" },
    ],
  },
  search: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" },
      { d: "m21 21-4.35-4.35" },
    ],
  },
  settings: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" },
      { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.13.39.35.74.6 1 .31.27.68.4 1.08.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" },
    ],
  },
  trash: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4 7h16" },
      { d: "M10 11v6M14 11v6" },
      { d: "M6 7l1 14h10l1-14" },
      { d: "M9 7V4h6v3" },
    ],
  },
  upload: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 20V10" },
      { d: "m7 14 5-5 5 5" },
      { d: "M5 4h14" },
    ],
  },
  "wrap-text": {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4 6h16" },
      { d: "M4 10h11a4 4 0 0 1 0 8H9" },
      { d: "m11 15-3 3 3 3" },
      { d: "M4 14h4" },
    ],
  },
  user: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
      { d: "M4 21a8 8 0 0 1 16 0" },
    ],
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof iconRegistry;

export const iconNames = Object.keys(iconRegistry) as IconName[];

export function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(iconRegistry, value);
}

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "dangerouslySetInnerHTML"> {
  decorative?: boolean;
  name: IconName;
  size?: IconSize;
  title?: string;
  tone?: IconTone;
}

type InternalIconProps = IconProps & {
  children?: never;
  dangerouslySetInnerHTML?: never;
};

function getSizeStyle(size: IconSize) {
  return typeof size === "number" ? { "--icon-size": `${Math.max(8, size)}px` } : undefined;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    "aria-label": ariaLabel,
    children: _children,
    className,
    decorative,
    name,
    size = "md",
    title,
    tone,
    dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
    ...props
  }: InternalIconProps,
  ref,
) {
  const titleId = useId();
  const definition: IconDefinition = iconRegistry[name];
  const isDecorative = decorative ?? !title;
  const accessibleName = isDecorative ? undefined : (ariaLabel ?? title);

  if (import.meta.env.DEV && !isDecorative && !accessibleName) {
    console.warn("Icon with decorative={false} requires title or aria-label.");
  }

  return (
    <svg
      {...props}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={!isDecorative && !title ? ariaLabel : undefined}
      aria-labelledby={!isDecorative && title ? titleId : undefined}
      className={cx("c-icon", typeof size === "string" && `c-icon--${size}`, tone && `c-icon--${tone}`, className)}
      fill="none"
      focusable="false"
      height="1em"
      ref={ref}
      role={isDecorative ? undefined : "img"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      style={{ ...getSizeStyle(size), ...props.style }}
      viewBox={definition.viewBox}
      width="1em"
    >
      {!isDecorative && title ? <title id={titleId}>{title}</title> : null}
      {definition.paths.map((path, index) => (
        <path
          d={path.d}
          fill={path.fill ?? "none"}
          key={`${name}-${index}`}
          stroke={path.fill === "currentColor" ? "none" : "currentColor"}
        />
      ))}
    </svg>
  );
});
