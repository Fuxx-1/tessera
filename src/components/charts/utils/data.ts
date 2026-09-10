import type { ChartDatum, HeatmapDatum, ScatterChartDatum } from "../types";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "../../../utils/performance";

export const chartLabelMaxLength = 80;
const aggregateLabel = "Other";

export type NormalizedCartesianDatum = ChartDatum & {
  sourceIndex: number;
};

export type CartesianSeriesInput = {
  name?: string;
  data?: ChartDatum[];
  color?: string;
  fillOpacity?: number;
};

export type NormalizedCartesianSeries = {
  name: string;
  data: NormalizedCartesianDatum[];
  sourceCount: number;
  color?: string;
  fillOpacity?: number;
};

export type ChartDataWindow = {
  end?: number;
  start?: number;
};

export type NormalizedCartesianWindow = {
  data: ChartDatum[];
  totalFiniteCount: number;
  windowEnd: number;
  windowFiniteCount: number;
  windowStart: number;
};

export type NormalizedCartesianSample = {
  data: NormalizedCartesianDatum[];
  totalFiniteCount: number;
};

export function normalizeChartLabel(label: string | undefined, fallback: string): string {
  const normalized = String(label ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, chartLabelMaxLength);
}

export function normalizeCartesianData(data: ChartDatum[], maxItems: number = UI_RENDER_BUDGETS.chartCartesianPoints): NormalizedCartesianDatum[] {
  return sampleChartData(
    data
    .map((datum, index) => ({
      label: normalizeChartLabel(datum.label, `Item ${index + 1}`),
      value: datum.value,
      sourceIndex: index,
    }))
      .filter((datum) => Number.isFinite(datum.value)),
    maxItems,
  );
}

export function normalizeCartesianDataSample(
  data: ChartDatum[],
  maxItems: number = UI_RENDER_BUDGETS.chartCartesianPoints,
): NormalizedCartesianSample {
  const limit = clampRenderLimit(maxItems, UI_RENDER_BUDGETS.chartCartesianPoints);
  const finiteCount = countFiniteChartData(data);

  if (finiteCount === 0) {
    return { data: [], totalFiniteCount: 0 };
  }

  if (finiteCount <= limit) {
    return {
      data: data.flatMap((datum, index) =>
        Number.isFinite(datum.value)
          ? [
              {
                label: normalizeChartLabel(datum.label, `Item ${index + 1}`),
                value: datum.value,
                sourceIndex: index,
              },
            ]
          : [],
      ),
      totalFiniteCount: finiteCount,
    };
  }

  const sampledFiniteIndexes = new Set<number>();
  const sampleCount = Math.min(limit, finiteCount);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    sampledFiniteIndexes.add(Math.round((sampleIndex / Math.max(sampleCount - 1, 1)) * (finiteCount - 1)));
  }

  const sampledData: NormalizedCartesianDatum[] = [];
  let finiteIndex = -1;

  for (let sourceIndex = 0; sourceIndex < data.length && sampledData.length < sampleCount; sourceIndex += 1) {
    const datum = data[sourceIndex];
    if (!Number.isFinite(datum.value)) continue;

    finiteIndex += 1;
    if (!sampledFiniteIndexes.has(finiteIndex)) continue;

    sampledData.push({
      label: normalizeChartLabel(datum.label, `Item ${sourceIndex + 1}`),
      value: datum.value,
      sourceIndex,
    });
  }

  return { data: sampledData, totalFiniteCount: finiteCount };
}

export function normalizeCartesianSeries(
  data: ChartDatum[] | undefined,
  series: CartesianSeriesInput[] | undefined,
  maxItems: number = UI_RENDER_BUDGETS.chartCartesianPoints,
): NormalizedCartesianSeries[] {
  const seriesInput = series?.length ? series : [{ name: "Series 1", data }];

  return seriesInput
    .map((item, index) => {
      const rawData = Array.isArray(item.data) ? item.data : [];
      const normalizedData = normalizeCartesianData(rawData, maxItems);

      return {
        color: item.color,
        data: normalizedData,
        fillOpacity: item.fillOpacity,
        name: normalizeChartLabel(item.name, `Series ${index + 1}`),
        sourceCount: countFiniteChartData(rawData),
      };
    })
    .filter((item) => item.sourceCount > 0 || item.data.length > 0);
}

export function normalizeCartesianDataWindow(
  data: ChartDatum[],
  maxItems: number = UI_RENDER_BUDGETS.chartCartesianPoints,
  window?: ChartDataWindow,
): NormalizedCartesianWindow {
  const totalFiniteCount = countFiniteChartData(data);
  const hasWindow = Boolean(window && (Number.isFinite(window.start) || Number.isFinite(window.end)));
  const rawStart = hasWindow ? Math.floor(window?.start ?? 0) : 0;
  const rawEnd = hasWindow ? Math.ceil(window?.end ?? data.length) : data.length;
  const windowStart = Math.max(0, Math.min(rawStart, data.length));
  const windowEnd = Math.max(windowStart, Math.min(rawEnd, data.length));
  const windowData = data.slice(windowStart, windowEnd);
  const normalizedWindowData = windowData
    .map((datum, index) => ({
      label: normalizeChartLabel(datum.label, `Item ${windowStart + index + 1}`),
      value: datum.value,
    }))
    .filter((datum) => Number.isFinite(datum.value));

  return {
    data: sampleChartData(normalizedWindowData, maxItems),
    totalFiniteCount,
    windowEnd,
    windowFiniteCount: normalizedWindowData.length,
    windowStart,
  };
}

export function normalizePieData(data: ChartDatum[], maxItems: number = UI_RENDER_BUDGETS.chartPieSlices): ChartDatum[] {
  return aggregateChartData(
    data
    .map((datum, index) => ({
      label: normalizeChartLabel(datum.label, `Slice ${index + 1}`),
      value: datum.value,
    }))
      .filter((datum) => Number.isFinite(datum.value) && datum.value > 0),
    maxItems,
  );
}

export function normalizeScatterData(data: ScatterChartDatum[], maxItems: number = UI_RENDER_BUDGETS.chartScatterPoints): ScatterChartDatum[] {
  return sampleChartData(
    data
    .map((datum, index) => ({
      label: normalizeChartLabel(datum.label, `Point ${index + 1}`),
      x: datum.x,
      y: datum.y,
      radius: datum.radius,
      color: datum.color,
      group: datum.group ? normalizeChartLabel(datum.group, "Group") : undefined,
    }))
      .filter((datum) => Number.isFinite(datum.x) && Number.isFinite(datum.y)),
    maxItems,
  );
}

export function countFiniteChartData(data: ChartDatum[], positiveOnly = false): number {
  return data.filter((datum) => Number.isFinite(datum.value) && (!positiveOnly || datum.value > 0)).length;
}

export type NormalizedHeatmapDatum = {
  x: string;
  y: string;
  value: number;
  count: number;
};

type NormalizeHeatmapOptions = {
  xCategories?: string[];
  yCategories?: string[];
  maxXCategories?: number;
  maxYCategories?: number;
  maxCells?: number;
};

export function normalizeHeatmapMatrix(data: HeatmapDatum[], options: NormalizeHeatmapOptions = {}) {
  const maxXCategories = clampRenderLimit(options.maxXCategories, UI_RENDER_BUDGETS.heatmapAxisCategories);
  const maxCells = clampRenderLimit(options.maxCells, UI_RENDER_BUDGETS.heatmapCells);
  const requestedYLimit = clampRenderLimit(options.maxYCategories, UI_RENDER_BUDGETS.heatmapAxisCategories);
  const normalizedData = data.map((datum, index) => ({
    x: normalizeChartLabel(datum.x, `Column ${index + 1}`),
    y: normalizeChartLabel(datum.y, `Row ${index + 1}`),
    value: datum.value,
  }));
  const finiteData = normalizedData.filter(isFiniteHeatmapDatum);
  const allXCategories = uniqueChartLabels(options.xCategories, finiteData.map((datum) => datum.x), "Column");
  const allYCategories = uniqueChartLabels(options.yCategories, finiteData.map((datum) => datum.y), "Row");
  const xCategories = sampleChartCategories(allXCategories, maxXCategories);
  const yLimitByCells = Math.max(1, Math.floor(maxCells / Math.max(xCategories.length, 1)));
  const yCategories = sampleChartCategories(allYCategories, Math.min(requestedYLimit, yLimitByCells));
  const xBuckets = createHeatmapBuckets(allXCategories, xCategories);
  const yBuckets = createHeatmapBuckets(allYCategories, yCategories);
  const buckets = new Map<string, NormalizedHeatmapDatum>();

  for (const datum of finiteData) {
    const xBucket = xBuckets.get(datum.x);
    const yBucket = yBuckets.get(datum.y);
    if (!xBucket || !yBucket) continue;

    const key = `${xBucket}\n${yBucket}`;
    const current = buckets.get(key);
    if (current) {
      current.value += datum.value as number;
      current.count += 1;
    } else {
      buckets.set(key, { x: xBucket, y: yBucket, value: datum.value as number, count: 1 });
    }
  }

  const normalized = Array.from(buckets.values()).map((datum) => ({
    ...datum,
    value: datum.value / Math.max(datum.count, 1),
  }));

  return {
    allXCategories,
    allYCategories,
    data: normalized,
    originalCellCount: finiteData.length,
    originalXCount: allXCategories.length,
    originalYCount: allYCategories.length,
    renderedCellSlots: xCategories.length * yCategories.length,
    xCategories,
    yCategories,
  };
}

export function getChartRenderNotice(
  chartName: string,
  originalCount: number,
  renderedCount: number,
  unit = "items",
  strategy = "sampled",
) {
  const hiddenCount = Math.max(0, originalCount - renderedCount);
  if (hiddenCount === 0) return undefined;
  return `${chartName} ${strategy} to ${renderedCount.toLocaleString()} of ${originalCount.toLocaleString()} ${unit} for SVG performance.`;
}

export function formatShortLabel(label: string, maxLength = 12): string {
  if (label.length <= maxLength) {
    return label;
  }

  if (maxLength <= 4) {
    return label.slice(0, maxLength);
  }

  return `${label.slice(0, maxLength - 3)}...`;
}

export function shouldRenderAxisLabel(index: number, total: number, maxVisible = 8): boolean {
  if (total <= 0 || index < 0 || index >= total) {
    return false;
  }

  const safeMaxVisible = Math.max(2, Math.floor(maxVisible));
  if (total <= safeMaxVisible) {
    return true;
  }

  if (index === 0 || index === total - 1) {
    return true;
  }

  const stride = Math.ceil((total - 1) / Math.max(safeMaxVisible - 1, 1));
  return index % stride === 0;
}

export function getChartA11yTitle(title: string | undefined, fallback: string): string {
  return normalizeChartLabel(title, fallback);
}

function sampleChartData<TDatum>(data: TDatum[], maxItems: number) {
  const limit = clampRenderLimit(maxItems, UI_RENDER_BUDGETS.chartCartesianPoints);
  if (data.length <= limit) {
    return data;
  }

  const lastIndex = data.length - 1;
  return Array.from({ length: limit }, (_, index) => {
    const sourceIndex = Math.round((index / Math.max(limit - 1, 1)) * lastIndex);
    return data[sourceIndex];
  });
}

function aggregateChartData(data: ChartDatum[], maxItems: number) {
  const limit = clampRenderLimit(maxItems, UI_RENDER_BUDGETS.chartPieSlices);
  if (data.length <= limit) {
    return data;
  }

  const visible = data.slice(0, Math.max(1, limit - 1));
  const otherValue = data.slice(visible.length).reduce((sum, datum) => sum + datum.value, 0);
  return otherValue > 0 ? [...visible, { label: aggregateLabel, value: otherValue }] : visible;
}

function uniqueChartLabels(categories: string[] | undefined, fallback: string[], prefix: string) {
  const source = categories ?? fallback;
  const values = source.map((category, index) => normalizeChartLabel(category, `${prefix} ${index + 1}`));
  return Array.from(new Set(values));
}

function sampleChartCategories(categories: string[], maxItems: number) {
  const sampled = sampleChartData(categories, maxItems);
  return Array.from(new Set(sampled));
}

function createHeatmapBuckets(sourceCategories: string[], renderedCategories: string[]) {
  const buckets = new Map<string, string>();
  if (sourceCategories.length === 0 || renderedCategories.length === 0) return buckets;

  sourceCategories.forEach((category, index) => {
    const renderedIndex = Math.min(Math.floor((index / sourceCategories.length) * renderedCategories.length), renderedCategories.length - 1);
    buckets.set(category, renderedCategories[renderedIndex]);
  });

  return buckets;
}

function isFiniteHeatmapDatum(datum: { x: string; y: string; value: HeatmapDatum["value"] }): datum is { x: string; y: string; value: number } {
  return typeof datum.value === "number" && Number.isFinite(datum.value);
}
