import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../utils/cx";
import { Icon, IconButton } from "../base";
import { UI_RENDER_BUDGETS } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { chartSeriesColors, mixChartColor } from "./palette";
import type { OrganizationChartNode } from "./types";
import "./styles/organization-chart.css";

type LayoutNode = {
  node: NormalizedNode;
  depth: number;
  index: number;
  siblingCount: number;
  hiddenDescendantCount: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  x: number;
  y: number;
  children: LayoutNode[];
};

type Connector = {
  depth: number;
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type NormalizedNode = Omit<OrganizationChartNode, "children"> & {
  children: NormalizedNode[];
  hiddenChildCount: number;
  subtreeSize: number;
};

export interface OrganizationChartProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "onSelect"> {
  tree?: OrganizationChartNode | null;
  title?: string;
  summary?: string;
  compact?: boolean;
  loading?: boolean;
  error?: ReactNode;
  emptyText?: string;
  loadingText?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  levelGap?: number;
  notice?: ReactNode;
  siblingGap?: number;
  defaultExpandedDepth?: number;
  maxVisibleNodes?: number;
  maxVisibleLeaves?: number;
  onSelect?: (node: OrganizationChartNode) => void;
  renderAvatar?: (node: OrganizationChartNode) => ReactNode;
}

const defaultNodeWidth = 188;
const defaultNodeHeight = 74;
const defaultPadding = 20;
const maxTreeDepth = 8;
const maxTreeNodes = UI_RENDER_BUDGETS.relationNodes;
const defaultMaxVisibleNodes = UI_RENDER_BUDGETS.relationNodes;
const defaultMaxVisibleLeaves = 48;
const minZoom = 0.7;
const maxZoom = 1.35;
const zoomStep = 0.15;

function normalizeNode(
  node: OrganizationChartNode | null | undefined,
  fallbackId = "root",
  depth = 0,
  counts = { value: 0 },
): NormalizedNode | null {
  if (!node || counts.value >= maxTreeNodes || depth > maxTreeDepth) {
    return null;
  }

  counts.value += 1;
  const id = String(node.id || fallbackId).slice(0, 96);
  const title = String(node.title || "Untitled node").replace(/\s+/g, " ").trim().slice(0, 96) || "Untitled node";
  const subtitle = node.subtitle ? String(node.subtitle).replace(/\s+/g, " ").trim().slice(0, 120) : undefined;
  const avatar = node.avatar ? String(node.avatar).trim().slice(0, 12) : undefined;
  const rawChildren = node.children ?? [];
  const children = rawChildren
    .map((child, index) => normalizeNode(child, `${id}-${index + 1}`, depth + 1, counts))
    .filter((child): child is NormalizedNode => Boolean(child));
  const hiddenChildCount = Math.max(0, rawChildren.length - children.length);
  const subtreeSize = 1 + hiddenChildCount + children.reduce((sum, child) => sum + child.subtreeSize, 0);

  return { id, title, subtitle, avatar, children, hiddenChildCount, subtreeSize };
}

function getNodeChildren(node: OrganizationChartNode | NormalizedNode): readonly (OrganizationChartNode | NormalizedNode)[] {
  return node.children ?? [];
}

function countLeaves(node: NormalizedNode, collapsedIds: Set<string>, budget: { nodes: number; leaves: number }): number {
  if (budget.nodes <= 0 || budget.leaves <= 0) {
    return 0;
  }

  budget.nodes -= 1;
  const children = node.children;
  if (children.length === 0 || collapsedIds.has(node.id)) {
    budget.leaves -= 1;
    return 1;
  }

  let leaves = 0;
  for (const child of children) {
    if (budget.nodes <= 0 || budget.leaves <= 0) {
      break;
    }
    leaves += countLeaves(child, collapsedIds, budget);
  }

  return Math.max(1, leaves);
}

function createLayout(
  root: NormalizedNode,
  nodeWidth: number,
  nodeHeight: number,
  levelGap: number,
  siblingGap: number,
  collapsedIds: Set<string>,
  maxVisibleNodes: number,
  maxVisibleLeaves: number,
) {
  const connectors: Connector[] = [];
  const nodes: LayoutNode[] = [];
  let leafIndex = 0;
  let renderedNodes = 0;
  let renderedLeaves = 0;
  let hiddenByWindow = 0;

  function walk(node: NormalizedNode, depth: number, index: number, siblingCount: number): LayoutNode | null {
    if (renderedNodes >= maxVisibleNodes || renderedLeaves >= maxVisibleLeaves) {
      hiddenByWindow += node.subtreeSize;
      return null;
    }

    renderedNodes += 1;
    const isCollapsed = collapsedIds.has(node.id);
    const children: LayoutNode[] = [];
    let hiddenDescendantCount = node.hiddenChildCount;

    if (isCollapsed) {
      hiddenDescendantCount += node.children.reduce((sum, child) => sum + child.subtreeSize, 0);
    } else {
      node.children.forEach((child, childIndex) => {
        const childLayout = walk(child, depth + 1, childIndex, node.children.length);
        if (childLayout) {
          children.push(childLayout);
        } else {
          hiddenDescendantCount += child.subtreeSize;
        }
      });
    }

    const centerX =
      children.length > 0
        ? children.reduce((total, child) => total + child.x, 0) / children.length
        : defaultPadding + leafIndex++ * (nodeWidth + siblingGap) + nodeWidth / 2;
    if (children.length === 0) {
      renderedLeaves += 1;
    }

    const layoutNode: LayoutNode = {
      children,
      depth,
      hasChildren: node.children.length > 0 || node.hiddenChildCount > 0,
      hiddenDescendantCount,
      index,
      isCollapsed,
      node,
      siblingCount,
      x: centerX,
      y: defaultPadding + depth * (nodeHeight + levelGap),
    };

    nodes.push(layoutNode);
    children.forEach((child) => {
      connectors.push({
        depth: child.depth,
        id: `${node.id}-${child.node.id}`,
        fromX: layoutNode.x,
        fromY: layoutNode.y + nodeHeight,
        toX: child.x,
        toY: child.y,
      });
    });

    return layoutNode;
  }

  const rootLayout = walk(root, 0, 0, 1);
  const leafCount = Math.max(1, leafIndex, countLeaves(root, collapsedIds, { nodes: maxVisibleNodes, leaves: maxVisibleLeaves }));
  const maxDepth = nodes.reduce((current, node) => Math.max(current, node.depth), 0);
  const width = defaultPadding * 2 + leafCount * nodeWidth + Math.max(0, leafCount - 1) * siblingGap;
  const height = defaultPadding * 2 + (maxDepth + 1) * nodeHeight + maxDepth * levelGap;

  return { connectors, height, hiddenByWindow, nodes, rootLayout, width };
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function describeTree(root: OrganizationChartNode | NormalizedNode | null) {
  if (!root) {
    return "No organization nodes to display.";
  }

  let nodes = 0;
  let leaders = 0;
  let maxDepth = 0;

  function walk(node: OrganizationChartNode | NormalizedNode, depth: number) {
    const children = getNodeChildren(node);
    nodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (children.length > 0) {
      leaders += 1;
      children.forEach((child) => walk(child, depth + 1));
    }
  }

  walk(root, 0);
  return `${root.title} organization chart with ${nodes} nodes across ${maxDepth + 1} levels and ${leaders} parent nodes.`;
}

function countOrganizationNodes(node: OrganizationChartNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  let count = 0;
  const stack: OrganizationChartNode[] = [node];
  while (stack.length > 0 && count <= maxTreeNodes * 20) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    count += 1;
    stack.push(...(current.children ?? []));
  }

  return count;
}

function getOrganizationNodeColor(depth: number) {
  return chartSeriesColors[Math.abs(Math.round(depth)) % chartSeriesColors.length] ?? chartSeriesColors[0];
}

function createOrganizationConnectorPath(connector: Connector, levelGap: number) {
  const verticalDistance = Math.max(1, connector.toY - connector.fromY);
  const curve = Math.min(Math.max(levelGap * 0.52, 20), verticalDistance * 0.68);
  const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, ""));

  return `M ${format(connector.fromX)} ${format(connector.fromY)} C ${format(connector.fromX)} ${format(
    connector.fromY + curve,
  )}, ${format(connector.toX)} ${format(connector.toY - curve)}, ${format(connector.toX)} ${format(connector.toY)}`;
}

function clampOrganizationZoom(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, minZoom), maxZoom);
}

function toPublicOrganizationNode(node: NormalizedNode): OrganizationChartNode {
  return {
    avatar: node.avatar,
    children: node.children.map(toPublicOrganizationNode),
    id: node.id,
    subtitle: node.subtitle,
    title: node.title,
  };
}

function NodeButton({
  colorDepth,
  layoutNode,
  node,
  onSelect,
  renderAvatar,
  style,
  onToggle,
}: {
  colorDepth?: number;
  layoutNode?: LayoutNode;
  node: NormalizedNode;
  onSelect?: (node: OrganizationChartNode) => void;
  renderAvatar?: (node: OrganizationChartNode) => ReactNode;
  style?: React.CSSProperties;
  onToggle?: (nodeId: string) => void;
}) {
  const title = node.title || "Untitled node";
  const ariaLabel = node.subtitle ? `${title}, ${node.subtitle}` : title;
  const publicNode = toPublicOrganizationNode(node);
  const avatar = renderAvatar ? renderAvatar(publicNode) : (node.avatar ?? getInitials(title));
  const resolvedDepth = layoutNode?.depth ?? colorDepth ?? 0;
  const accent = getOrganizationNodeColor(resolvedDepth);
  const hiddenDescendantCount = layoutNode?.hiddenDescendantCount ?? 0;
  const hasToggle = Boolean(layoutNode?.hasChildren && onToggle);
  const isCollapsed = layoutNode?.isCollapsed ?? false;
  const toggleLabel = `${isCollapsed ? "Expand" : "Collapse"} ${title}`;

  return (
    <button
      aria-label={ariaLabel}
      aria-expanded={hasToggle ? !isCollapsed : undefined}
      aria-level={layoutNode ? layoutNode.depth + 1 : undefined}
      aria-posinset={layoutNode ? layoutNode.index + 1 : undefined}
      aria-setsize={layoutNode ? layoutNode.siblingCount : undefined}
      className="c-organization-chart__node"
      data-depth={resolvedDepth}
      onClick={() => onSelect?.(publicNode)}
      onKeyDown={(event) => {
        if (!hasToggle) {
          return;
        }
        if ((event.key === "ArrowLeft" && !isCollapsed) || (event.key === "ArrowRight" && isCollapsed)) {
          event.preventDefault();
          onToggle?.(node.id);
        }
      }}
      style={
        {
          "--org-node-accent": accent,
          "--org-node-accent-soft": mixChartColor(accent, "#ffffff", 0.86),
          ...style,
        } as React.CSSProperties
      }
      type="button"
    >
      <span className="c-organization-chart__avatar" aria-hidden="true">
        {avatar}
      </span>
      <span className="c-organization-chart__copy">
        <span className="c-organization-chart__title">{title}</span>
        {node.subtitle ? <span className="c-organization-chart__subtitle">{node.subtitle}</span> : null}
      </span>
      {hiddenDescendantCount > 0 ? (
        <span className="c-organization-chart__hidden-count" title={`${hiddenDescendantCount} hidden descendants`}>
          +{hiddenDescendantCount}
        </span>
      ) : null}
      {hasToggle ? (
        <span
          aria-hidden="true"
          className="c-organization-chart__toggle"
          onClick={(event) => {
            event.stopPropagation();
            onToggle?.(node.id);
          }}
          title={toggleLabel}
        >
          {isCollapsed ? "+" : "-"}
        </span>
      ) : null}
    </button>
  );
}

function CompactNode({
  onSelect,
  renderAvatar,
  onToggle,
  layoutNode,
}: {
  onSelect?: (node: OrganizationChartNode) => void;
  renderAvatar?: (node: OrganizationChartNode) => ReactNode;
  onToggle?: (nodeId: string) => void;
  layoutNode: LayoutNode;
}) {
  return (
    <li>
      <NodeButton
        colorDepth={layoutNode.depth}
        layoutNode={layoutNode}
        node={layoutNode.node}
        onSelect={onSelect}
        onToggle={onToggle}
        renderAvatar={renderAvatar}
      />
      {layoutNode.children.length > 0 && !layoutNode.isCollapsed ? (
        <ul>
          {layoutNode.children.map((child) => (
            <CompactNode
              key={child.node.id}
              layoutNode={child}
              onSelect={onSelect}
              onToggle={onToggle}
              renderAvatar={renderAvatar}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function OrganizationChart({
  className,
  compact = false,
  defaultExpandedDepth = Number.POSITIVE_INFINITY,
  emptyText,
  error,
  levelGap = 54,
  loading,
  loadingText,
  maxVisibleLeaves = defaultMaxVisibleLeaves,
  maxVisibleNodes = defaultMaxVisibleNodes,
  nodeHeight = defaultNodeHeight,
  nodeWidth = defaultNodeWidth,
  notice,
  onSelect,
  renderAvatar,
  siblingGap = 26,
  summary,
  title,
  tree,
  ...props
}: OrganizationChartProps) {
  const titleId = useId();
  const descId = useId();
  const [zoom, setZoom] = useState(1);
  const [manualCollapsedIds, setManualCollapsedIds] = useState<Set<string>>(() => new Set());
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(() => new Set());
  const safeRoot = useMemo(() => normalizeNode(tree), [tree]);
  const inputNodeCount = countOrganizationNodes(tree);
  const safeNodeWidth = Math.max(148, Math.min(260, Number.isFinite(nodeWidth) ? nodeWidth : defaultNodeWidth));
  const safeNodeHeight = Math.max(64, Math.min(110, Number.isFinite(nodeHeight) ? nodeHeight : defaultNodeHeight));
  const safeLevelGap = Math.max(34, Math.min(120, Number.isFinite(levelGap) ? levelGap : 54));
  const safeSiblingGap = Math.max(14, Math.min(80, Number.isFinite(siblingGap) ? siblingGap : 26));
  const safeMaxVisibleNodes = Math.max(1, Math.min(maxTreeNodes, Number.isFinite(maxVisibleNodes) ? Math.floor(maxVisibleNodes) : defaultMaxVisibleNodes));
  const safeMaxVisibleLeaves = Math.max(1, Math.min(96, Number.isFinite(maxVisibleLeaves) ? Math.floor(maxVisibleLeaves) : defaultMaxVisibleLeaves));
  const collapsedIds = useMemo(() => {
    const ids = new Set(manualCollapsedIds);
    if (safeRoot && Number.isFinite(defaultExpandedDepth)) {
      const stack: Array<{ node: NormalizedNode; depth: number }> = [{ node: safeRoot, depth: 0 }];
      while (stack.length > 0) {
        const item = stack.pop();
        if (!item) {
          continue;
        }
        if (item.depth >= defaultExpandedDepth && item.node.children.length > 0 && !manualExpandedIds.has(item.node.id)) {
          ids.add(item.node.id);
          continue;
        }
        item.node.children.forEach((child) => stack.push({ node: child, depth: item.depth + 1 }));
      }
    }
    return ids;
  }, [defaultExpandedDepth, manualCollapsedIds, manualExpandedIds, safeRoot]);
  const layout = useMemo(
    () =>
      safeRoot
        ? createLayout(safeRoot, safeNodeWidth, safeNodeHeight, safeLevelGap, safeSiblingGap, collapsedIds, safeMaxVisibleNodes, safeMaxVisibleLeaves)
        : null,
    [collapsedIds, safeLevelGap, safeMaxVisibleLeaves, safeMaxVisibleNodes, safeNodeHeight, safeNodeWidth, safeRoot, safeSiblingGap],
  );
  const isEmpty = !safeRoot;
  const chartTitle = title || "Organization chart";
  const chartSummary = summary ?? describeTree(safeRoot);
  const hiddenBudgetCount = Math.max(0, inputNodeCount - maxTreeNodes);
  const hiddenWindowCount = layout?.hiddenByWindow ?? 0;
  const renderNotice =
    notice ??
    (hiddenBudgetCount > 0 || hiddenWindowCount > 0
      ? `OrganizationChart is bounded to ${maxTreeNodes.toLocaleString()} normalized nodes and ${safeMaxVisibleLeaves.toLocaleString()} visible leaf lanes; ${(hiddenBudgetCount + hiddenWindowCount).toLocaleString()} descendants are hidden or windowed for layout performance.`
      : undefined);
  const zoomPercent = Math.round(zoom * 100);
  const canZoomOut = zoom > minZoom;
  const canZoomIn = zoom < maxZoom;

  const zoomBy = (delta: number) => {
    setZoom((currentZoom) => clampOrganizationZoom(Math.round((currentZoom + delta) * 100) / 100));
  };

  const resetZoom = () => setZoom(1);
  const toggleNode = (nodeId: string) => {
    const shouldExpand = collapsedIds.has(nodeId);
    setManualExpandedIds((current) => {
      const next = new Set(current);
      if (shouldExpand) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      return next;
    });
    setManualCollapsedIds((current) => {
      const next = new Set(current);
      if (shouldExpand) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(zoomStep);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(-zoomStep);
      return;
    }

    if (event.key === "0" || event.key === "Home") {
      event.preventDefault();
      resetZoom();
    }
  };

  return (
    <ChartFrame
      className={cx("c-organization-chart", compact && "c-organization-chart--compact", className)}
      empty={isEmpty}
      emptyText={emptyText ?? "No organization nodes"}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={summary}
      title={title}
      {...props}
    >
      {safeRoot && layout ? (
        <div
          className="c-organization-chart__viewport"
          style={
            {
              "--org-node-width": `${safeNodeWidth}px`,
              "--org-node-height": `${safeNodeHeight}px`,
            } as React.CSSProperties
          }
        >
          <span className="c-sr-only" id={titleId}>
            {chartTitle}
          </span>
          <span className="c-sr-only" id={descId}>
            {chartSummary}
          </span>
          <div className="c-organization-chart__toolbar c-local-tools" aria-label="Organization chart zoom controls">
            <span aria-live="polite">{zoomPercent}%</span>
            <IconButton aria-label="Zoom out organization chart" disabled={!canZoomOut} onClick={() => zoomBy(-zoomStep)} size="sm" tooltip="缩小组织图" tooltipPlacement="top">
              <Icon decorative name="minus" />
            </IconButton>
            <IconButton aria-label="Zoom in organization chart" disabled={!canZoomIn} onClick={() => zoomBy(zoomStep)} size="sm" tooltip="放大组织图" tooltipPlacement="top">
              <Icon decorative name="add" />
            </IconButton>
            <IconButton aria-label="Reset organization chart zoom" disabled={zoom === 1} onClick={resetZoom} size="sm" tooltip="重置组织图缩放" tooltipPlacement="top">
              <Icon decorative name="refresh" />
            </IconButton>
          </div>
          <div
            aria-describedby={descId}
            aria-labelledby={titleId}
            className="c-organization-chart__scroll"
            role="tree"
            tabIndex={0}
            onKeyDown={handleViewportKeyDown}
          >
            <div
              className="c-organization-chart__scale"
              style={{
                height: layout.height * zoom,
                width: layout.width * zoom,
              }}
            >
              <div
                className="c-organization-chart__canvas"
                style={{
                  minHeight: layout.height,
                  transform: `scale(${zoom})`,
                  width: layout.width,
                }}
              >
                <svg
                  aria-hidden="true"
                  className="c-organization-chart__connectors"
                  focusable="false"
                  height={layout.height}
                  viewBox={`0 0 ${layout.width} ${layout.height}`}
                  width={layout.width}
                >
                  {layout.connectors.map((connector) => (
                    <path
                      className="c-organization-chart__connector"
                      d={createOrganizationConnectorPath(connector, safeLevelGap)}
                      key={connector.id}
                      style={{ stroke: mixChartColor(getOrganizationNodeColor(connector.depth), "#c8c8c3", 0.58) }}
                    />
                  ))}
                </svg>
                {layout.nodes.map((layoutNode) => (
                  <NodeButton
                    key={layoutNode.node.id}
                    layoutNode={layoutNode}
                    node={layoutNode.node}
                    onSelect={onSelect}
                    onToggle={toggleNode}
                    renderAvatar={renderAvatar}
                    style={{
                      height: safeNodeHeight,
                      left: layoutNode.x - safeNodeWidth / 2,
                      top: layoutNode.y,
                      width: safeNodeWidth,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <ul className="c-organization-chart__stack" role="list">
            {layout.rootLayout ? (
              <CompactNode layoutNode={layout.rootLayout} onSelect={onSelect} onToggle={toggleNode} renderAvatar={renderAvatar} />
            ) : null}
          </ul>
        </div>
      ) : (
        <div className="c-organization-chart__empty-spacer" aria-hidden="true" />
      )}
    </ChartFrame>
  );
}
