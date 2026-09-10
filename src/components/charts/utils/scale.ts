import type { ChartPoint } from "../types";

export type LinearScale = {
  (value: number): number;
  domain: [number, number];
  range: [number, number];
};

export type BandScale = {
  (label: string, index?: number): number;
  bandwidth: number;
  step: number;
  labels: string[];
};

export type NumericDomain = {
  min: number;
  max: number;
};

export const defaultChartWidth = 640;
export const minChartHeight = 64;
export const maxChartHeight = 1200;

type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function getFiniteValues(values: number[]) {
  return values.filter((value) => Number.isFinite(value));
}

export function sanitizeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function sanitizeDimension(value: number | undefined, fallback: number, min = minChartHeight, max = maxChartHeight): number {
  return clampNumber(sanitizeNumber(value ?? fallback, fallback), min, max);
}

export function sanitizeMargin(
  margin: Partial<ChartMargin> | undefined,
  fallback: ChartMargin,
  width: number,
  height: number,
  minPlotSize = 24,
): ChartMargin {
  const safeWidth = sanitizeDimension(width, defaultChartWidth, minPlotSize * 2, defaultChartWidth * 4);
  const safeHeight = sanitizeDimension(height, fallback.top + fallback.bottom + minPlotSize, minPlotSize * 2, maxChartHeight);
  const maxHorizontal = Math.max(0, safeWidth - minPlotSize);
  const maxVertical = Math.max(0, safeHeight - minPlotSize);
  const next = {
    top: clampNumber(sanitizeNumber(margin?.top ?? fallback.top, fallback.top), 0, maxVertical),
    right: clampNumber(sanitizeNumber(margin?.right ?? fallback.right, fallback.right), 0, maxHorizontal),
    bottom: clampNumber(sanitizeNumber(margin?.bottom ?? fallback.bottom, fallback.bottom), 0, maxVertical),
    left: clampNumber(sanitizeNumber(margin?.left ?? fallback.left, fallback.left), 0, maxHorizontal),
  };

  const horizontalTotal = next.left + next.right;
  if (horizontalTotal > maxHorizontal && horizontalTotal > 0) {
    const ratio = maxHorizontal / horizontalTotal;
    next.left *= ratio;
    next.right *= ratio;
  }

  const verticalTotal = next.top + next.bottom;
  if (verticalTotal > maxVertical && verticalTotal > 0) {
    const ratio = maxVertical / verticalTotal;
    next.top *= ratio;
    next.bottom *= ratio;
  }

  return next;
}

export function getValueDomain(values: number[], includeZero = true): [number, number] {
  const finiteValues = getFiniteValues(values);

  if (finiteValues.length === 0) {
    return [0, 1];
  }

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);

  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }

  if (min === max) {
    const padding = Math.abs(min || 1) * 0.1;
    return [min - padding, max + padding];
  }

  const padding = (max - min) * 0.08;
  return [min - padding, max + padding];
}

export function normalizeDomain(domain: [number, number] | undefined, fallback: [number, number]): [number, number] {
  if (!domain) {
    return fallback;
  }

  const [start, end] = domain;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return fallback;
  }

  if (start === end) {
    const padding = Math.abs(start || 1) * 0.1;
    return [start - padding, end + padding];
  }

  return start < end ? [start, end] : [end, start];
}

export const normalizeValueDomain = normalizeDomain;

export function normalizeNumericDomain(min: number | undefined, max: number | undefined, fallback: [number, number]): NumericDomain {
  const [fallbackMin, fallbackMax] = normalizeDomain(fallback, [0, 1]);
  const safeMin = sanitizeNumber(min ?? fallbackMin, fallbackMin);
  const safeMax = sanitizeNumber(max ?? fallbackMax, fallbackMax);
  const [domainMin, domainMax] = normalizeDomain([safeMin, safeMax], [fallbackMin, fallbackMax]);

  return { min: domainMin, max: domainMax };
}

export function normalizeFiniteValue(value: number, domain: NumericDomain): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return clampNumber(value, domain.min, domain.max);
}

export function createLinearScale(domain: [number, number], range: [number, number], clamp = false): LinearScale {
  const safeDomain = normalizeDomain(domain, [0, 1]);
  const safeRange: [number, number] = [sanitizeNumber(range[0], 0), sanitizeNumber(range[1], 1)];
  const [domainMin, domainMax] = safeDomain;
  const [rangeMin, rangeMax] = safeRange;
  const domainSpan = domainMax - domainMin || 1;
  const rangeSpan = rangeMax - rangeMin;

  const scale = ((value: number) => {
    const safeValue = sanitizeNumber(value, domainMin);
    const raw = rangeMin + ((safeValue - domainMin) / domainSpan) * rangeSpan;
    return clamp ? clampNumber(raw, Math.min(rangeMin, rangeMax), Math.max(rangeMin, rangeMax)) : raw;
  }) as LinearScale;

  scale.domain = safeDomain;
  scale.range = safeRange;
  return scale;
}

function getNiceStep(span: number, tickCount: number) {
  const rawStep = span / Math.max(tickCount - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

export function createLinearTicks(domain: [number, number], tickCount = 4) {
  const [domainMin, domainMax] = normalizeDomain(domain, [0, 1]);
  const count = Math.max(2, Math.min(Math.round(tickCount), 8));
  const span = domainMax - domainMin;

  if (!Number.isFinite(span) || span <= 0) {
    return [domainMin, domainMax];
  }

  const step = getNiceStep(span, count);
  const start = Math.ceil(domainMin / step) * step;
  const ticks: number[] = [];

  for (let value = start; value <= domainMax + step * 0.5; value += step) {
    const rounded = Number(value.toPrecision(12));
    if (rounded >= domainMin - step * 0.5 && rounded <= domainMax + step * 0.5) {
      ticks.push(rounded);
    }
  }

  if (!ticks.some((tick) => Math.abs(tick) < Number.EPSILON) && domainMin < 0 && domainMax > 0) {
    ticks.push(0);
  }

  return ticks.sort((a, b) => a - b);
}

export function createPointScale(labels: string[], range: [number, number]) {
  const [start, end] = [sanitizeNumber(range[0], 0), sanitizeNumber(range[1], 1)];

  if (labels.length <= 1) {
    return () => (start + end) / 2;
  }

  const step = (end - start) / (labels.length - 1);
  return (_label: string, index: number) => start + index * step;
}

export function createBandScale(labels: string[], range: [number, number], padding = 0.22): BandScale {
  const [start, end] = [sanitizeNumber(range[0], 0), sanitizeNumber(range[1], 1)];
  const count = Math.max(labels.length, 1);
  const span = end - start;
  const step = span / count;
  const safePadding = clampNumber(sanitizeNumber(padding, 0.22), 0, 0.8);
  const bandwidth = step * (1 - safePadding);
  const offset = (step - bandwidth) / 2;

  const scale = ((label: string, explicitIndex?: number) => {
    const fallbackIndex = labels.indexOf(label);
    const index = Number.isFinite(explicitIndex) ? explicitIndex : Math.max(fallbackIndex, 0);
    return start + Math.min(Math.max(index ?? 0, 0), count - 1) * step + offset;
  }) as BandScale;

  scale.bandwidth = Math.max(bandwidth, 1);
  scale.step = step;
  scale.labels = labels;
  return scale;
}

export function getClosestPoint(points: ChartPoint[], x: number, y: number) {
  return points.reduce<ChartPoint | null>((closest, point) => {
    if (!closest) {
      return point;
    }

    const currentDistance = Math.hypot(point.x - x, point.y - y);
    const closestDistance = Math.hypot(closest.x - x, closest.y - y);
    return currentDistance < closestDistance ? point : closest;
  }, null);
}
