import "./styles/sankey.css";
import { useId, type CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { UI_RENDER_BUDGETS, clampRenderLimit } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, getSafeChartColors, mixChartColor } from "./palette";
import type { ChartBaseProps, ChartMargin, SankeyChartLink, SankeyChartNode } from "./types";
import {
  clampNumber,
  defaultChartWidth,
  formatDatum,
  formatShortLabel,
  getChartA11yTitle,
  normalizeChartLabel,
  sanitizeDimension,
  sanitizeMargin,
  sanitizeNumber,
} from "./utils";

const defaultMargin: ChartMargin = { top: 24, right: 118, bottom: 24, left: 118 };
const maxNodeLabelLength = 80;

type NormalizedNode = SankeyChartNode & {
  id: string;
  label: string;
  order: number;
};

type NormalizedLink = SankeyChartLink & {
  index: number;
  source: string;
  target: string;
  value: number;
  label: string;
};

type SankeyNodeLayout = {
  id: string;
  label: string;
  value: number;
  layer: number;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

type SankeyLinkLayout = {
  source: SankeyNodeLayout;
  target: SankeyNodeLayout;
  value: number;
  label: string;
  width: number;
  opacity: number;
  path: string;
  stroke: string;
};

type SankeyRejectedCounts = {
  cyclic: number;
  invalid: number;
  missing: number;
  self: number;
};

type SankeyNormalizedNodesResult = {
  hiddenCount: number;
  nodes: NormalizedNode[];
};

export interface SankeyChartProps extends Omit<ChartBaseProps, "data"> {
  nodes: SankeyChartNode[];
  links: SankeyChartLink[];
  colors?: string[];
  height?: number;
  margin?: Partial<ChartMargin>;
  nodeWidth?: number;
  nodeGap?: number;
  minLinkWidth?: number;
  maxLinkWidth?: number;
  labelMaxLength?: number;
  maxLinks?: number;
  maxNodes?: number;
  showValues?: boolean;
}

function normalizeSankeyNodes(nodes: SankeyChartNode[], maxNodes: number = UI_RENDER_BUDGETS.relationNodes): SankeyNormalizedNodesResult {
  const seen = new Set<string>();
  const limit = clampRenderLimit(maxNodes, UI_RENDER_BUDGETS.relationNodes, 1, UI_RENDER_BUDGETS.relationNodes);
  let validCount = 0;
  const normalizedNodes = nodes.reduce<NormalizedNode[]>((acc, node, index) => {
    const id = String(node.id ?? "").trim();

    if (!id || seen.has(id)) {
      return acc;
    }

    seen.add(id);
    validCount += 1;
    if (acc.length >= limit) {
      return acc;
    }

    acc.push({
      ...node,
      id,
      label: normalizeChartLabel(node.label, `Node ${index + 1}`).slice(0, maxNodeLabelLength),
      order: Number.isFinite(node.order) ? Number(node.order) : index,
    });
    return acc;
  }, []);

  return {
    hiddenCount: Math.max(0, validCount - normalizedNodes.length),
    nodes: normalizedNodes,
  };
}

function normalizeSankeyLinks(links: SankeyChartLink[], nodeIds: Set<string>, maxLinks: number = UI_RENDER_BUDGETS.relationLinks) {
  const limit = clampRenderLimit(maxLinks, UI_RENDER_BUDGETS.relationLinks, 1, UI_RENDER_BUDGETS.relationLinks);
  const rejected: SankeyRejectedCounts = { cyclic: 0, invalid: 0, missing: 0, self: 0 };
  const validLinks = links.flatMap<NormalizedLink>((link, index) => {
    const normalized = {
      ...link,
      index,
      source: String(link.source ?? "").trim(),
      target: String(link.target ?? "").trim(),
      value: sanitizeNumber(link.value, Number.NaN),
      label: link.label ? normalizeChartLabel(link.label, "Flow").slice(0, maxNodeLabelLength) : "",
    };

    if (!nodeIds.has(normalized.source) || !nodeIds.has(normalized.target)) {
      rejected.missing += 1;
      return [];
    }

    if (normalized.source === normalized.target) {
      rejected.self += 1;
      return [];
    }

    if (!(normalized.value > 0)) {
      rejected.invalid += 1;
      return [];
    }

    return [normalized];
  });
  const rankedLinks =
    validLinks.length > limit
      ? [...validLinks]
          .sort((a, b) => b.value - a.value || a.index - b.index)
          .slice(0, limit)
          .sort((a, b) => a.index - b.index)
      : validLinks;

  return {
    hiddenCount: Math.max(0, validLinks.length - rankedLinks.length),
    links: rankedLinks,
    rejected,
  };
}

function wouldCreateCycle(source: string, target: string, outgoing: Map<string, string[]>) {
  const stack = [target];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const nodeId = stack.pop() as string;
    if (nodeId === source) {
      return true;
    }
    if (visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    stack.push(...(outgoing.get(nodeId) ?? []));
  }

  return false;
}

function filterAcyclicLinks(links: NormalizedLink[], rejected: SankeyRejectedCounts) {
  const outgoing = new Map<string, string[]>();
  const safeLinks: NormalizedLink[] = [];

  for (const link of links) {
    if (wouldCreateCycle(link.source, link.target, outgoing)) {
      rejected.cyclic += 1;
      continue;
    }

    safeLinks.push(link);
    outgoing.set(link.source, [...(outgoing.get(link.source) ?? []), link.target]);
  }

  return safeLinks;
}

function inferLayers(nodes: NormalizedNode[], links: NormalizedLink[]) {
  const explicitLayers = new Map<string, number>();
  const indegree = new Map<string, number>();
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    if (Number.isFinite(node.layer)) {
      explicitLayers.set(node.id, Math.max(0, Math.round(Number(node.layer))));
    }
    indegree.set(node.id, 0);
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }

  for (const link of links) {
    outgoing.get(link.source)?.push(link.target);
    incoming.get(link.target)?.push(link.source);
    indegree.set(link.target, (indegree.get(link.target) ?? 0) + 1);
  }

  const layers = new Map(explicitLayers);
  const roots = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((node) => node.id);
  const queue = roots.length > 0 ? [...roots] : nodes.map((node) => node.id);
  const visited = new Set<string>();

  for (const nodeId of queue) {
    layers.set(nodeId, explicitLayers.get(nodeId) ?? 0);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    const layer = layers.get(nodeId) ?? 0;

    for (const targetId of outgoing.get(nodeId) ?? []) {
      if (explicitLayers.has(targetId)) {
        indegree.set(targetId, Math.max(0, (indegree.get(targetId) ?? 0) - 1));
      } else {
        layers.set(targetId, Math.max(layers.get(targetId) ?? 0, layer + 1));
        indegree.set(targetId, Math.max(0, (indegree.get(targetId) ?? 0) - 1));
      }

      if ((indegree.get(targetId) ?? 0) === 0) {
        queue.push(targetId);
      }
    }
  }

  for (const node of nodes) {
    if (layers.has(node.id)) {
      continue;
    }

    const incomingLayers = (incoming.get(node.id) ?? []).flatMap((sourceId) => {
      const layer = layers.get(sourceId);
      return Number.isFinite(layer) ? [Number(layer)] : [];
    });
    layers.set(node.id, explicitLayers.get(node.id) ?? (incomingLayers.length > 0 ? Math.max(...incomingLayers) + 1 : 0));
  }

  return layers;
}

function createSankeyPath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const curve = Math.max(18, Math.abs(targetX - sourceX) * 0.44);
  const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, ""));
  return `M ${format(sourceX)} ${format(sourceY)} C ${format(sourceX + curve)} ${format(sourceY)}, ${format(
    targetX - curve,
  )} ${format(targetY)}, ${format(targetX)} ${format(targetY)}`;
}

function layoutSankey({
  colors,
  height,
  links,
  margin,
  maxLinkWidth,
  maxLinks,
  maxNodes,
  minLinkWidth,
  nodeGap,
  nodes,
  nodeWidth,
  valueFormatter,
}: {
  colors: string[];
  height: number;
  links: SankeyChartLink[];
  margin: ChartMargin;
  maxLinkWidth: number;
  maxLinks: number;
  maxNodes: number;
  minLinkWidth: number;
  nodeGap: number;
  nodes: SankeyChartNode[];
  nodeWidth: number;
  valueFormatter: SankeyChartProps["valueFormatter"];
}) {
  const normalizedNodeResult = normalizeSankeyNodes(nodes, maxNodes);
  const safeNodes = normalizedNodeResult.nodes;
  const nodeIds = new Set(safeNodes.map((node) => node.id));
  const normalizedLinkResult = normalizeSankeyLinks(links, nodeIds, maxLinks);
  const rejectedCounts = { ...normalizedLinkResult.rejected };
  const acyclicLinks = filterAcyclicLinks(normalizedLinkResult.links, rejectedCounts);
  const layers = inferLayers(safeNodes, acyclicLinks);
  const safeLinks = acyclicLinks.filter((link) => {
    const sourceLayer = layers.get(link.source) ?? 0;
    const targetLayer = layers.get(link.target) ?? 0;

    if (targetLayer <= sourceLayer) {
      rejectedCounts.cyclic += 1;
      return false;
    }

    return true;
  });
  const incomingTotalById = new Map<string, number>();
  const outgoingTotalById = new Map<string, number>();

  for (const link of safeLinks) {
    outgoingTotalById.set(link.source, (outgoingTotalById.get(link.source) ?? 0) + link.value);
    incomingTotalById.set(link.target, (incomingTotalById.get(link.target) ?? 0) + link.value);
  }
  const maxLayer = Math.max(0, ...Array.from(layers.values()));
  const columnCount = maxLayer + 1;
  const plotHeight = Math.max(80, height - margin.top - margin.bottom);
  const columnGroups = Array.from({ length: columnCount }, (_, layer) =>
    safeNodes
      .filter((node) => (layers.get(node.id) ?? 0) === layer)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
  );
  const maxColumnSize = Math.max(1, ...columnGroups.map((group) => group.length));
  const requiredPlotWidth = Math.max(280, columnCount * 180 + Math.max(0, columnCount - 1) * 88);
  const width = Math.max(defaultChartWidth, Math.ceil(margin.left + margin.right + requiredPlotWidth));
  const plotWidth = Math.max(80, width - margin.left - margin.right);
  const layerStep = columnCount <= 1 ? 0 : plotWidth / Math.max(columnCount - 1, 1);
  const nodeValueById = new Map<string, number>();

  for (const node of safeNodes) {
    const incoming = incomingTotalById.get(node.id) ?? 0;
    const outgoing = outgoingTotalById.get(node.id) ?? 0;
    const explicitValue = Number.isFinite(node.value) && Number(node.value) > 0 ? Number(node.value) : 0;
    nodeValueById.set(node.id, Math.max(incoming, outgoing, explicitValue, 1));
  }

  const maxNodeValue = Math.max(1, ...Array.from(nodeValueById.values()));
  const availableNodeHeight = Math.max(20, (plotHeight - Math.max(0, maxColumnSize - 1) * nodeGap) / maxColumnSize);
  const minNodeHeight = clampNumber(availableNodeHeight * 0.36, 14, 34);
  const maxNodeHeight = Math.max(minNodeHeight, availableNodeHeight);
  const nodeLayouts = new Map<string, SankeyNodeLayout>();

  columnGroups.forEach((group, layer) => {
    const rawHeights = group.map((node) => minNodeHeight + ((nodeValueById.get(node.id) ?? 1) / maxNodeValue) * (maxNodeHeight - minNodeHeight));
    const totalHeight = rawHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, group.length - 1) * nodeGap;
    let y = margin.top + Math.max(0, (plotHeight - totalHeight) / 2);

    group.forEach((node, index) => {
      const nodeHeight = rawHeights[index] ?? minNodeHeight;
      const color = colors[nodeLayouts.size % colors.length] ?? chartSeriesColors[0];
      nodeLayouts.set(node.id, {
        id: node.id,
        label: node.label,
        value: nodeValueById.get(node.id) ?? 1,
        layer,
        order: node.order,
        x: margin.left + layer * layerStep,
        y,
        width: nodeWidth,
        height: nodeHeight,
        color,
      });
      y += nodeHeight + nodeGap;
    });
  });

  const maxLinkValue = Math.max(1, ...safeLinks.map((link) => link.value));
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  const sortedLinks = [...safeLinks].sort((a, b) => {
    const sourceA = nodeLayouts.get(a.source);
    const sourceB = nodeLayouts.get(b.source);
    const targetA = nodeLayouts.get(a.target);
    const targetB = nodeLayouts.get(b.target);
    return (
      (sourceA?.layer ?? 0) - (sourceB?.layer ?? 0) ||
      (sourceA?.y ?? 0) - (sourceB?.y ?? 0) ||
      (targetA?.y ?? 0) - (targetB?.y ?? 0) ||
      b.value - a.value ||
      a.index - b.index
    );
  });
  const linkLayouts = sortedLinks.reduce<SankeyLinkLayout[]>((acc, link) => {
    const source = nodeLayouts.get(link.source);
    const target = nodeLayouts.get(link.target);
    if (!source || !target) {
      return acc;
    }

    const sourceTotal = Math.max(link.value, outgoingTotalById.get(source.id) ?? link.value);
    const targetTotal = Math.max(link.value, incomingTotalById.get(target.id) ?? link.value);
    const sourceScale = source.height / sourceTotal;
    const targetScale = target.height / targetTotal;
    const widthValue = link.value * Math.min(sourceScale, targetScale);
    const linkWidth = clampNumber(widthValue, minLinkWidth, maxLinkWidth);
    const sourceOffset = sourceOffsets.get(source.id) ?? 0;
    const targetOffset = targetOffsets.get(target.id) ?? 0;
    const y1 = clampNumber(source.y + (sourceOffset + link.value / 2) * sourceScale, source.y + linkWidth / 2, source.y + source.height - linkWidth / 2);
    const y2 = clampNumber(target.y + (targetOffset + link.value / 2) * targetScale, target.y + linkWidth / 2, target.y + target.height - linkWidth / 2);
    const label = link.label || `${source.label} to ${target.label}`;

    sourceOffsets.set(source.id, sourceOffset + link.value);
    targetOffsets.set(target.id, targetOffset + link.value);
    acc.push({
      source,
      target,
      value: link.value,
      label,
      opacity: 0.18 + (link.value / maxLinkValue) * 0.2,
      width: linkWidth,
      path: createSankeyPath(source.x + source.width, y1, target.x, y2),
      stroke: mixChartColor(source.color, target.color, 0.34),
    });
    return acc;
  }, []);

  const largestLink = linkLayouts.reduce<SankeyLinkLayout | null>((largest, link) => (!largest || link.value > largest.value ? link : largest), null);
  const summary =
    safeNodes.length === 0 || safeLinks.length === 0 || !largestLink
      ? "No Sankey flows to display."
      : `${safeNodes.length} nodes and ${safeLinks.length} links across ${columnCount} layers. Largest flow is ${largestLink.label} at ${formatDatum(
          valueFormatter,
          largestLink.value,
        )}.${rejectedCounts.cyclic > 0 ? ` ${rejectedCounts.cyclic} cyclic or backward link${rejectedCounts.cyclic === 1 ? "" : "s"} skipped.` : ""}`;

  return {
    columns: columnGroups.length,
    hiddenLinkCount: normalizedLinkResult.hiddenCount,
    hiddenNodeCount: normalizedNodeResult.hiddenCount,
    isEmpty: safeNodes.length === 0 || safeLinks.length === 0,
    linkLayouts,
    nodeLayouts: Array.from(nodeLayouts.values()),
    rejectedCounts,
    summary,
    width,
  };
}

export function SankeyChart({
  className,
  colors,
  emptyText,
  error,
  height = 320,
  labelMaxLength = 16,
  links,
  loading,
  loadingText,
  margin,
  maxLinkWidth = 28,
  maxLinks = UI_RENDER_BUDGETS.relationLinks,
  maxNodes = UI_RENDER_BUDGETS.relationNodes,
  minLinkWidth = 3,
  nodeGap = 18,
  nodes,
  nodeWidth = 18,
  showValues = true,
  summary,
  title,
  valueFormatter,
  ...props
}: SankeyChartProps) {
  const titleId = useId();
  const descId = useId();
  const safeHeight = sanitizeDimension(height, 320, 180, 900);
  const safeNodeWidth = clampNumber(sanitizeNumber(nodeWidth, 18), 8, 42);
  const safeNodeGap = clampNumber(sanitizeNumber(nodeGap, 18), 8, 48);
  const safeMinLinkWidth = clampNumber(sanitizeNumber(minLinkWidth, 3), 1, 20);
  const safeMaxLinkWidth = Math.max(safeMinLinkWidth, clampNumber(sanitizeNumber(maxLinkWidth, 28), safeMinLinkWidth, 64));
  const safeLabelMaxLength = Math.max(4, Math.min(Math.round(sanitizeNumber(labelMaxLength, 16)), 32));
  const resolvedMargin = sanitizeMargin(margin, defaultMargin, defaultChartWidth, safeHeight);
  const safeMaxNodes = clampRenderLimit(maxNodes, UI_RENDER_BUDGETS.relationNodes, 1, UI_RENDER_BUDGETS.relationNodes);
  const safeMaxLinks = clampRenderLimit(maxLinks, UI_RENDER_BUDGETS.relationLinks, 1, UI_RENDER_BUDGETS.relationLinks);
  const layout = layoutSankey({
    colors: getSafeChartColors(colors),
    height: safeHeight,
    links,
    margin: resolvedMargin,
    maxLinkWidth: safeMaxLinkWidth,
    maxLinks: safeMaxLinks,
    maxNodes: safeMaxNodes,
    minLinkWidth: safeMinLinkWidth,
    nodeGap: safeNodeGap,
    nodes,
    nodeWidth: safeNodeWidth,
    valueFormatter,
  });
  const svgTitle = getChartA11yTitle(title, "Sankey chart");
  const svgSummary = summary ?? layout.summary;
  const hiddenNodeCount = layout.hiddenNodeCount;
  const hiddenLinkCount = layout.hiddenLinkCount;
  const rejectedLinkCount = Object.values(layout.rejectedCounts).reduce((sum, value) => sum + value, 0);
  const renderNoticeParts = [
    hiddenNodeCount > 0 || hiddenLinkCount > 0
      ? `SankeyChart sampled ${layout.nodeLayouts.length.toLocaleString()} nodes and ${layout.linkLayouts.length.toLocaleString()} highest-value links for SVG performance.`
      : "",
    rejectedLinkCount > 0
      ? `${rejectedLinkCount.toLocaleString()} invalid, missing, self, cyclic, or backward link${rejectedLinkCount === 1 ? "" : "s"} were skipped.`
      : "",
  ].filter(Boolean);
  const renderNotice = renderNoticeParts.length > 0 ? renderNoticeParts.join(" ") : undefined;

  return (
    <ChartFrame
      className={cx("c-sankey-chart", className)}
      empty={layout.isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={summary}
      title={title}
      {...props}
    >
      <svg
        aria-hidden={loading || error || layout.isEmpty ? true : undefined}
        aria-labelledby={`${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--sankey"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        style={
          layout.width > defaultChartWidth
            ? ({ "--sankey-chart-full-width": `${layout.width}px`, minWidth: layout.width } as CSSProperties)
            : undefined
        }
        viewBox={`0 0 ${layout.width} ${safeHeight}`}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-sankey-chart__links">
          {layout.linkLayouts.map((link, index) => {
            const displayValue = formatDatum(valueFormatter, link.value);

            return (
              <path
                className="c-sankey-chart__link"
                d={link.path}
                key={`${link.source.id}-${link.target.id}-${index}`}
                opacity={link.opacity}
                stroke={link.stroke}
                strokeWidth={link.width}
              >
                <title>{`${link.label}: ${displayValue}`}</title>
              </path>
            );
          })}
        </g>
        <g className="c-sankey-chart__nodes">
          {layout.nodeLayouts.map((node) => {
            const displayValue = formatDatum(valueFormatter, node.value);
            const isLastLayer = node.layer >= layout.columns - 1;
            const labelX = isLastLayer ? node.x + node.width + 8 : node.x - 8;
            const labelAnchor = isLastLayer ? "start" : "end";

            return (
              <g className="c-sankey-chart__node" key={node.id}>
                <rect
                  aria-label={`${node.label}: ${displayValue}`}
                  height={node.height}
                  rx={4}
                  ry={4}
                  style={{ fill: node.color }}
                  width={node.width}
                  x={node.x}
                  y={node.y}
                >
                  <title>{`${node.label}: ${displayValue}`}</title>
                </rect>
                <text className="c-sankey-chart__label" textAnchor={labelAnchor} x={labelX} y={node.y + node.height / 2 - (showValues ? 4 : -4)}>
                  <title>{node.label}</title>
                  {formatShortLabel(node.label, safeLabelMaxLength)}
                </text>
                {showValues ? (
                  <text className="c-sankey-chart__value" textAnchor={labelAnchor} x={labelX} y={node.y + node.height / 2 + 12}>
                    {displayValue}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </ChartFrame>
  );
}
