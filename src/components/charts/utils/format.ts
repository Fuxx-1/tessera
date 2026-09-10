import type { ChartDatum, ChartFormatter } from "../types";

export const defaultValueFormatter: ChartFormatter = (value) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
      }).format(value)
    : "n/a";

export function limitText(value: unknown, fallback: string, maxLength = 96) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, maxLength);
}

export function formatDatum(formatter: ChartFormatter | undefined, value: number, datum?: ChartDatum) {
  const fallback = defaultValueFormatter(value, datum);

  try {
    const formatted = (formatter ?? defaultValueFormatter)(value, datum);
    return limitText(formatted, fallback);
  } catch {
    return fallback;
  }
}

export function formatPercent(value: number) {
  return Number.isFinite(value) ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value * 100)}%` : "n/a";
}
