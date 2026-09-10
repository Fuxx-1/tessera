import "./styles/treemap.css";
import { useId } from "react";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors, isSafeChartColor } from "./palette";
import type { ChartBaseProps, ChartDatum, ChartFormatter, TreemapNode } from "./types";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  formatPercent,
  formatShortLabel,
  getChartA11yTitle,
  normalizeChartLabel,
  sanitizeDimension,
} from "./utils";

type NormalizedTreemapNode = {
  id: string;
  label: string;
  value: number;
  color?: string;
  children: NormalizedTreemapNode[];
  path: string[];
};

type TreemapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TreemapLayoutItem = TreemapRect & {
  node: NormalizedTreemapNode;
  depth: number;
  leaf: boolean;
};

type TreemapInputMeasure = {
  count: number;
  value: number;
};

export interface TreemapProps extends Omit<ChartBaseProps, "data"> {
  data?: ChartDatum[];
  nodes?: TreemapNode[];
  height?: number;
  colors?: string[];
  gap?: number;
  labelMaxLength?: number;
  showLabels?: boolean;
  showValues?: boolean;
  valueFormatter?: ChartFormatter;
  maxNodes?: number;
}

const minTreemapArea = 1.2;
const treemapOtherNodeId = "__treemap-other__";

function normalizeNodeValue(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value ?? 0 : 0;
}

function normalizeTreemapNodes(nodes: TreemapNode[] | undefined, path: string[] = []): NormalizedTreemapNode[] {
  return (nodes ?? [])
    .map((node, index) => {
      const label = normalizeChartLabel(node.label, `Node ${index + 1}`);
      const nextPath = [...path, label];
      const children = normalizeTreemapNodes(node.children, nextPath);
      const childrenValue = children.reduce((sum, child) => sum + child.value, 0);
      const ownValue = normalizeNodeValue(node.value);
      const value = childrenValue > 0 ? childrenValue : ownValue;

      return {
        id: node.id ? normalizeChartLabel(node.id, nextPath.join("/")) : nextPath.join("/"),
        label,
        value,
        color: isSafeChartColor(node.color) ? node.color?.trim() : undefined,
        children,
        path: nextPath,
      };
    })
    .filter((node) => node.value > 0);
}

function nodesFromData(data: ChartDatum[] | undefined): TreemapNode[] {
  return (data ?? [])
    .map((datum, index) => ({
      label: normalizeChartLabel(datum.label, `Item ${index + 1}`),
      value: datum.value,
    }))
    .filter((node) => Number.isFinite(node.value) && (node.value ?? 0) > 0);
}

function measureInputNodes(nodes: TreemapNode[] | undefined): TreemapInputMeasure {
  return (nodes ?? []).reduce(
    (result: TreemapInputMeasure, node): TreemapInputMeasure => {
      const child = measureInputNodes(node.children);
      return {
        count: result.count + 1 + child.count,
        value: result.value + (child.value > 0 ? child.value : normalizeNodeValue(node.value)),
      };
    },
    { count: 0, value: 0 },
  );
}

type LimitedTreemapInput = {
  hiddenCount: number;
  hiddenValue: number;
  nodes: TreemapNode[];
  visibleCount: number;
};

function limitInputNodes(nodes: TreemapNode[] | undefined, maxNodes: number): LimitedTreemapInput {
  const limit = clampRenderLimit(maxNodes, UI_RENDER_BUDGETS.relationNodes, 1, 800);
  let visibleCount = 0;
  let hiddenCount = 0;
  let hiddenValue = 0;

  function walk(source: TreemapNode[] | undefined): TreemapNode[] {
    const visible: TreemapNode[] = [];

    for (const node of source ?? []) {
      if (visibleCount >= limit) {
        const hidden = measureInputNodes([node]);
        hiddenCount += hidden.count;
        hiddenValue += hidden.value;
        continue;
      }

      visibleCount += 1;
      visible.push({
        ...node,
        children: node.children ? walk(node.children) : undefined,
      });
    }

    return visible;
  }

  const visible = walk(nodes);
  if (hiddenValue > 0 && visible.length > 0) {
    visible.push({
      id: treemapOtherNodeId,
      label: `Other ${hiddenCount.toLocaleString()} nodes`,
      value: hiddenValue,
    });
  }

  return { hiddenCount, hiddenValue, nodes: visible, visibleCount };
}

function insetRect(rect: TreemapRect, gap: number) {
  const inset = gap / 2;
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - inset * 2),
    height: Math.max(0, rect.height - inset * 2),
  };
}

function worstAspectRatio(row: NormalizedTreemapNode[], side: number, scale: number) {
  if (row.length === 0 || side <= 0 || scale <= 0) return Number.POSITIVE_INFINITY;

  let minArea = Number.POSITIVE_INFINITY;
  let maxArea = 0;
  let rowArea = 0;

  for (const node of row) {
    const area = node.value * scale;
    minArea = Math.min(minArea, area);
    maxArea = Math.max(maxArea, area);
    rowArea += area;
  }

  if (minArea <= 0 || rowArea <= 0) return Number.POSITIVE_INFINITY;

  const sideSquared = side * side;
  return Math.max((sideSquared * maxArea) / (rowArea * rowArea), (rowArea * rowArea) / (sideSquared * minArea));
}

function layoutTreemapRow(row: NormalizedTreemapNode[], rect: TreemapRect, scale: number, gap: number) {
  const rowArea = row.reduce((sum, node) => sum + node.value * scale, 0);
  const horizontal = rect.width >= rect.height;
  const rowThickness = horizontal ? Math.min(rect.height, rowArea / Math.max(rect.width, 1)) : Math.min(rect.width, rowArea / Math.max(rect.height, 1));
  let cursor = horizontal ? rect.x : rect.y;

  const items = row.map((node, index) => {
    const area = node.value * scale;
    const isLast = index === row.length - 1;
    const rawRect = horizontal
      ? {
          x: cursor,
          y: rect.y,
          width: isLast ? rect.x + rect.width - cursor : area / Math.max(rowThickness, 1),
          height: rowThickness,
        }
      : {
          x: rect.x,
          y: cursor,
          width: rowThickness,
          height: isLast ? rect.y + rect.height - cursor : area / Math.max(rowThickness, 1),
        };

    cursor += horizontal ? rawRect.width : rawRect.height;
    return { node, rect: row.length > 1 || gap > 0 ? insetRect(rawRect, gap) : rawRect };
  });

  const remaining = horizontal
    ? {
        x: rect.x,
        y: rect.y + rowThickness,
        width: rect.width,
        height: Math.max(0, rect.height - rowThickness),
      }
    : {
        x: rect.x + rowThickness,
        y: rect.y,
        width: Math.max(0, rect.width - rowThickness),
        height: rect.height,
      };

  return { items, remaining };
}

function squarifyNodes(nodes: NormalizedTreemapNode[], rect: TreemapRect, gap: number) {
  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, node) => sum + node.value, 0);
  const scale = total > 0 ? (rect.width * rect.height) / total : 0;
  const items: Array<{ node: NormalizedTreemapNode; rect: TreemapRect }> = [];
  let remaining = rect;
  let row: NormalizedTreemapNode[] = [];

  while (sorted.length > 0) {
    const next = sorted[0];
    const side = Math.min(remaining.width, remaining.height);
    const currentRatio = worstAspectRatio(row, side, scale);
    const nextRatio = worstAspectRatio([...row, next], side, scale);

    if (row.length === 0 || nextRatio <= currentRatio) {
      row.push(next);
      sorted.shift();
    } else {
      const laidOut = layoutTreemapRow(row, remaining, scale, gap);
      items.push(...laidOut.items);
      remaining = laidOut.remaining;
      row = [];
    }
  }

  if (row.length > 0) {
    const laidOut = layoutTreemapRow(row, remaining, scale, gap);
    items.push(...laidOut.items);
  }

  return items;
}

function getChildRect(rect: TreemapRect) {
  const headerHeight = rect.height >= 76 ? 22 : 0;
  const padding = rect.width >= 72 && rect.height >= 52 ? 5 : 2;

  return {
    x: rect.x + padding,
    y: rect.y + padding + headerHeight,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2 - headerHeight),
  };
}

function createTreemapLayout(nodes: NormalizedTreemapNode[], rect: TreemapRect, depth: number, gap: number): TreemapLayoutItem[] {
  const items: TreemapLayoutItem[] = [];

  for (const { node, rect: nodeRect } of squarifyNodes(nodes, rect, gap)) {
    if (nodeRect.width * nodeRect.height < minTreemapArea) {
      continue;
    }

    if (node.children.length > 0) {
      items.push({ ...nodeRect, node, depth, leaf: false });
      const childRect = getChildRect(nodeRect);
      if (childRect.width * childRect.height >= minTreemapArea) {
        items.push(...createTreemapLayout(node.children, childRect, depth + 1, gap));
      }
    } else {
      items.push({ ...nodeRect, node, depth, leaf: true });
    }
  }

  return items;
}

function getVisibleLabel(label: string, width: number, labelMaxLength: number) {
  const widthBasedLength = Math.max(4, Math.floor((width - 12) / 6));
  return formatShortLabel(label, Math.min(labelMaxLength, widthBasedLength));
}

function getClipId(baseId: string, index: number) {
  return `${baseId.replace(/:/g, "")}-treemap-clip-${index}`;
}

function getAutoSummary(nodes: NormalizedTreemapNode[], leafItems: TreemapLayoutItem[], valueFormatter: ChartFormatter | undefined) {
  if (leafItems.length === 0) {
    return "Treemap contains no positive finite values.";
  }

  const sorted = [...leafItems].sort((a, b) => b.node.value - a.node.value);
  const total = nodes.reduce((sum, node) => sum + node.value, 0);
  const largest = sorted[0];
  const largestShare = total > 0 ? largest.node.value / total : 0;

  return `${leafItems.length} leaf nodes. Largest leaf is ${largest.node.label} at ${formatDatum(valueFormatter, largest.node.value, largest.node)} (${formatPercent(largestShare)}).`;
}

export function Treemap({
  className,
  colors = chartSeriesColors,
  data,
  emptyText,
  error,
  gap = 3,
  height = 320,
  labelMaxLength = 18,
  loading,
  loadingText,
  maxNodes = UI_RENDER_BUDGETS.relationNodes,
  nodes,
  notice,
  showLabels = true,
  showValues = true,
  summary,
  title,
  valueFormatter,
  ...props
}: TreemapProps) {
  const titleId = useId();
  const descId = useId();
  const width = defaultChartWidth;
  const safeHeight = sanitizeDimension(height, 320, 180);
  const safeGap = clampNumber(gap, 0, 12);
  const safeLabelMaxLength = Math.max(4, Math.min(Math.floor(labelMaxLength), 48));
  const safeColors = getSafeChartColors(colors, chartSeriesColors);
  const limitedInput = limitInputNodes(nodes ?? nodesFromData(data), maxNodes);
  const rootNodes = normalizeTreemapNodes(limitedInput.nodes);
  const layout = createTreemapLayout(rootNodes, { x: 0, y: 0, width, height: safeHeight }, 0, safeGap);
  const leafItems = layout.filter((item) => item.leaf);
  const total = rootNodes.reduce((sum, node) => sum + node.value, 0);
  const isEmpty = leafItems.length === 0;
  const hasState = loading || error || isEmpty;
  const svgTitle = getChartA11yTitle(title, "Treemap");
  const svgSummary = summary ?? getAutoSummary(rootNodes, leafItems, valueFormatter);
  const renderNotice =
    notice ??
    (limitedInput.hiddenCount > 0
      ? `Treemap rendered ${limitedInput.visibleCount.toLocaleString()} explicit nodes; ${limitedInput.hiddenCount.toLocaleString()} lower-priority nodes were aggregated into Other for SVG performance.`
      : undefined);

  return (
    <ChartFrame
      className={className}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={svgSummary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--treemap"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role={hasState ? undefined : "img"}
        viewBox={`0 0 ${width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <defs>
          {leafItems.map((item, index) => {
            const clipId = getClipId(titleId, index);
            const clipPadding = 3;

            return (
              <clipPath id={clipId} key={clipId}>
                <rect height={Math.max(0, item.height - clipPadding * 2)} width={Math.max(0, item.width - clipPadding * 2)} x={item.x + clipPadding} y={item.y + clipPadding} />
              </clipPath>
            );
          })}
        </defs>
        <g className="c-treemap__groups" aria-hidden="true">
          {layout
            .filter((item) => !item.leaf)
            .map((item) => (
              <g className="c-treemap__group" key={`${item.node.id}-group-${item.depth}`}>
                <rect height={item.height} rx="7" width={item.width} x={item.x} y={item.y} />
                {showLabels && item.width >= 84 && item.height >= 34 ? (
                  <text className="c-treemap__group-label" x={item.x + 8} y={item.y + 16}>
                    <title>{item.node.path.join(" / ")}</title>
                    {getVisibleLabel(item.node.label, item.width, safeLabelMaxLength)}
                  </text>
                ) : null}
              </g>
            ))}
        </g>
        <g className="c-treemap__leaves" role={hasState ? undefined : "list"}>
          {leafItems.map((item, index) => {
            const fill = item.node.color ?? safeColors[index % safeColors.length];
            const percentage = total > 0 ? item.node.value / total : 0;
            const canShowLabel = showLabels && item.width >= 44 && item.height >= 28;
            const canShowValue = showValues && item.width >= 66 && item.height >= 50;
            const formattedValue = formatDatum(valueFormatter, item.node.value, item.node);
            const ariaLabel = `${item.node.path.join(" / ")}: ${formattedValue}, ${formatPercent(percentage)} of total`;
            const clipId = getClipId(titleId, index);

            return (
              <g
                aria-label={ariaLabel}
                className={item.node.id === treemapOtherNodeId ? "c-treemap__cell c-treemap__cell--other" : "c-treemap__cell"}
                data-area-share={percentage.toFixed(6)}
                data-node-value={item.node.value}
                key={`${item.node.id}-leaf-${index}`}
                role="listitem"
                tabIndex={hasState ? -1 : 0}
              >
                <rect height={item.height} rx="6" width={item.width} x={item.x} y={item.y} style={{ fill }} />
                <title>{ariaLabel}</title>
                <g clipPath={`url(#${clipId})`}>
                  {canShowLabel ? (
                    <text className="c-treemap__label" x={item.x + 8} y={item.y + 18}>
                      {getVisibleLabel(item.node.label, item.width, safeLabelMaxLength)}
                    </text>
                  ) : null}
                  {canShowValue ? (
                    <text className="c-treemap__value" x={item.x + 8} y={item.y + 36}>
                      {formattedValue}
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </ChartFrame>
  );
}
