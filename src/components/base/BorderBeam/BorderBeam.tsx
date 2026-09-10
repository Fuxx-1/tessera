import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

type BorderBeamCssProperties = CSSProperties & {
  "--c-border-beam-size"?: string;
  "--c-border-beam-duration"?: string;
  "--c-border-beam-delay"?: string;
  "--c-border-beam-radius"?: string;
  "--c-border-beam-color"?: string;
  "--c-border-beam-muted-color"?: string;
  "--c-border-beam-inset"?: string;
};

export type BorderBeamTone = "neutral" | "subtle" | "contrast";
export type BorderBeamSize = "sm" | "md" | "lg";

export interface BorderBeamProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "color"> {
  size?: BorderBeamSize;
  tone?: BorderBeamTone;
  duration?: number;
  delay?: number;
  paused?: boolean;
  radius?: number | string;
  color?: string;
  mutedColor?: string;
  inset?: number | string;
}

function toCssLength(value: number | string | undefined) {
  if (typeof value === "number") {
    return `${value}px`;
  }

  return value;
}

function toCssTime(value: number | undefined) {
  if (typeof value !== "number") {
    return undefined;
  }

  return `${Math.max(0, value)}ms`;
}

function setCssVariable<Key extends keyof BorderBeamCssProperties>(
  target: BorderBeamCssProperties,
  key: Key,
  value: BorderBeamCssProperties[Key],
) {
  if (value !== undefined) {
    target[key] = value;
  }
}

export function BorderBeam({
  "aria-hidden": ariaHidden = true,
  className,
  color,
  delay,
  duration,
  inset,
  mutedColor,
  paused = false,
  radius,
  size = "md",
  style,
  tone = "neutral",
  ...props
}: BorderBeamProps) {
  const beamStyle: BorderBeamCssProperties = { ...style };
  setCssVariable(beamStyle, "--c-border-beam-duration", toCssTime(duration));
  setCssVariable(beamStyle, "--c-border-beam-delay", toCssTime(delay));
  setCssVariable(beamStyle, "--c-border-beam-radius", toCssLength(radius));
  setCssVariable(beamStyle, "--c-border-beam-color", color);
  setCssVariable(beamStyle, "--c-border-beam-muted-color", mutedColor);
  setCssVariable(beamStyle, "--c-border-beam-inset", toCssLength(inset));

  return (
    <span
      aria-hidden={ariaHidden}
      className={cx("c-border-beam", `c-border-beam--${size}`, `c-border-beam--${tone}`, paused && "c-border-beam--paused", className)}
      style={beamStyle}
      {...props}
    />
  );
}
