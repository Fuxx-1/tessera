export const UI_RENDER_BUDGETS = {
  chartCartesianPoints: 160,
  chartSparklinePoints: 48,
  chartFunnelSegments: 40,
  chartScatterPoints: 240,
  chartPieSlices: 40,
  chartRadarSeries: 12,
  chartTableRows: 120,
  chartWordCloudWords: 80,
  commandPaletteItems: 500,
  heatmapAxisCategories: 30,
  heatmapCells: 900,
  listItems: 500,
  markdownBlocks: 80,
  markdownSourceCharacters: 80000,
  markdownHtmlBlockCharacters: 24000,
  mermaidBlocks: 8,
  mermaidSourceCharacters: 12000,
  mermaidStatements: 260,
  relationLinks: 180,
  relationNodes: 120,
  svgNodes: 1200,
  tableRows: 500,
  transferItems: 500,
} as const;

export function clampRenderLimit(value: number | undefined, fallback: number, min = 1, max = 2000): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value as number)));
}

export function limitItems<TItem>(items: readonly TItem[], limit: number) {
  const safeLimit = clampRenderLimit(limit, items.length);
  return {
    hiddenCount: Math.max(0, items.length - safeLimit),
    items: items.length > safeLimit ? items.slice(0, safeLimit) : items,
    limit: safeLimit,
  };
}
