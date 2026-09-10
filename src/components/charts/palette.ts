import type { ChartTone } from "./types";

export const chartPalette: Record<ChartTone, string> = {
  neutral: "#2c2c2a",
  sage: "#66715e",
  clay: "#9b6a4e",
  plum: "#6f5d73",
  amber: "#b48639",
};

export const chartSeriesColors = ["#2c2c2a", "#66715e", "#9b6a4e", "#6f5d73", "#b48639", "#8a6f52"];

const hexColorPattern = /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;

export function isSafeChartColor(color: string | undefined): color is string {
  return typeof color === "string" && hexColorPattern.test(color.trim());
}

export function getChartColor(tone: ChartTone | undefined, fallback = chartPalette.neutral) {
  const paletteColor = tone ? chartPalette[tone] : undefined;
  return isSafeChartColor(paletteColor) ? paletteColor : fallback;
}

export function getSafeChartColors(colors: string[] | undefined, fallback = chartSeriesColors) {
  const safeColors = (colors ?? []).map((color) => color.trim()).filter(isSafeChartColor);
  return safeColors.length > 0 ? safeColors : fallback;
}

export function mixChartColor(color: string, target = "#ffffff", targetWeight = 0.5) {
  const from = parseHexColor(color);
  const to = parseHexColor(target);

  if (!from || !to) return color;

  const weight = Math.min(Math.max(targetWeight, 0), 1);
  const channel = (fromValue: number, toValue: number) => Math.round(fromValue * (1 - weight) + toValue * weight);

  return `#${[channel(from.r, to.r), channel(from.g, to.g), channel(from.b, to.b)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHexColor(color: string) {
  const normalized = color.trim();
  if (!hexColorPattern.test(normalized)) return null;

  const hex = normalized.slice(1);
  const sixDigitHex =
    hex.length === 3
      ? hex
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : hex.slice(0, 6);

  return {
    r: Number.parseInt(sixDigitHex.slice(0, 2), 16),
    g: Number.parseInt(sixDigitHex.slice(2, 4), 16),
    b: Number.parseInt(sixDigitHex.slice(4, 6), 16),
  };
}
