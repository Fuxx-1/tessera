import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { UI_RENDER_BUDGETS } from "../../utils/performance";
import { ChartFrame } from "./ChartFrame";
import { getSafeChartColors, mixChartColor } from "./palette";
import type { ChartBaseProps } from "./types";
import { limitText } from "./utils";
import "./styles/mind-map.css";

export type MindMapNode = {
  id: string;
  label: string;
  value?: string;
  children?: MindMapNode[];
};

export type MindMapBranch = MindMapNode;

export type MindMapRoot = Omit<MindMapNode, "children">;

export type MindMapNodeStyle = {
  background?: string;
  border?: string;
  color?: string;
};

export type MindMapStyles = {
  root?: MindMapNodeStyle;
  branch?: MindMapNodeStyle;
  leaf?: MindMapNodeStyle;
  connector?: string;
  colors?: string[];
};

type LayoutNode = {
  id: string;
  label: string;
  labelLines: string[];
  value?: string;
  valueLines: string[];
  depth: number;
  side: -1 | 0 | 1;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  nodeStyle: MindMapNodeStyle;
  childCount: number;
  hiddenChildCount: number;
  collapsible: boolean;
  collapsed: boolean;
};

type LayoutLink = {
  from: LayoutNode;
  to: LayoutNode;
};

type SanitizedNode = {
  id: string;
  label: string;
  value?: string;
  children: SanitizedNode[];
};

type MindMapView = {
  x: number;
  y: number;
  scale: number;
};

type MindMapViewportSize = {
  width: number;
  height: number;
};

type MindMapDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export interface MindMapProps extends Omit<ChartBaseProps, "data" | "valueFormatter"> {
  root: MindMapRoot;
  branches: MindMapBranch[];
  collapsible?: boolean;
  collapsedIds?: string[];
  defaultCollapsedIds?: string[];
  depth?: number;
  height?: number;
  onCollapsedIdsChange?: (collapsedIds: string[]) => void;
  styles?: MindMapStyles;
}

const fallbackRoot: MindMapRoot = { id: "root", label: "Mind map" };
const minNodeHeight = 46;
const rootNodeWidth = 172;
const branchNodeWidth = 188;
const leafNodeWidth = 168;
const nodeEdgeGap = 82;
const branchVerticalGap = 42;
const childVerticalGap = 38;
const sideGap = 84;
const toggleSize = 18;
const toggleHitSize = 34;
const toggleOffset = toggleSize / 2 + 6.5;
const toggleSafePadding = 12;
const nodePaddingY = 10;
const labelLineHeight = 13;
const valueLineHeight = 12;
const textBlockGap = 4;
const minHeight = 260;
const maxDepth = 6;
const mobileReadableWidth = 1320;
const connectorStrokeWidth = 2;
const minZoom = 0.72;
const maxZoom = 1.8;
const zoomStep = 0.14;
const panStep = 52;
const mindMapColors = ["#5f625c", "#74776f", "#7b706a", "#747078", "#82775f", "#6d726d"];
const emptyBranches: MindMapBranch[] = [];
const defaultNodeStyles = {
  root: { background: "#4a4a44", border: "#62625a", color: "#ffffff" },
  branch: { color: "#1f1f1d" },
  leaf: { color: "#555552" },
};

function getNodeWidth(depth: number) {
  if (depth === 0) return rootNodeWidth;
  return depth === 1 ? branchNodeWidth : leafNodeWidth;
}

function getDepthOffset(depth: number, width: number) {
  if (depth <= 0) return 0;
  if (depth === 1) {
    return rootNodeWidth / 2 + sideGap + width / 2;
  }

  return rootNodeWidth / 2 + sideGap + branchNodeWidth + nodeEdgeGap + (depth - 2) * (leafNodeWidth + nodeEdgeGap) + width / 2;
}

function getSiblingGap(depth: number) {
  return depth <= 1 ? branchVerticalGap : childVerticalGap;
}

function getTextLineLimit(depth: number, textKind: "label" | "value") {
  if (textKind === "value") return depth === 0 ? 1 : 2;
  if (depth === 0) return 2;
  return depth === 1 ? 2 : 3;
}

function getLineCharLimit(depth: number, textKind: "label" | "value") {
  if (textKind === "value") return depth === 0 ? 22 : depth === 1 ? 20 : 18;
  if (depth === 0) return 18;
  return depth === 1 ? 20 : 18;
}

function splitMindMapText(value: string | undefined, fallback: string, depth: number, textKind: "label" | "value") {
  const safeText = limitText(value, fallback, textKind === "label" ? 112 : 72);
  const maxLines = getTextLineLimit(depth, textKind);
  const charLimit = getLineCharLimit(depth, textKind);
  const words = safeText.split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  const pushLine = (line: string) => {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  };

  for (const word of words.length > 0 ? words : [safeText]) {
    const chunks = word.length > charLimit ? word.match(new RegExp(`.{1,${charLimit}}`, "g")) ?? [word] : [word];
    for (const chunk of chunks) {
      const candidate = currentLine ? `${currentLine} ${chunk}` : chunk;
      if (candidate.length > charLimit && currentLine) {
        pushLine(currentLine);
        currentLine = chunk;
      } else {
        currentLine = candidate;
      }
    }
  }

  pushLine(currentLine);

  const boundedLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && boundedLines.length > 0) {
    const lastIndex = boundedLines.length - 1;
    boundedLines[lastIndex] = `${boundedLines[lastIndex].slice(0, Math.max(1, charLimit - 3)).trim()}...`;
  }

  return boundedLines.length > 0 ? boundedLines : [fallback];
}

function getNodeTextBlocks(node: SanitizedNode, depth: number) {
  return {
    labelLines: splitMindMapText(node.label, "Untitled", depth, "label"),
    valueLines: node.value ? splitMindMapText(node.value, "", depth, "value") : [],
  };
}

function getNodeHeight(labelLines: string[], valueLines: string[]) {
  const labelHeight = Math.max(1, labelLines.length) * labelLineHeight;
  const valueHeight = valueLines.length > 0 ? valueLines.length * valueLineHeight + textBlockGap : 0;
  return Math.max(minNodeHeight, Math.ceil(nodePaddingY * 2 + labelHeight + valueHeight));
}

function sanitizeNode(
  node: MindMapNode | MindMapRoot | undefined,
  fallbackId: string,
  counts = { value: 0 },
  depth = 0,
): SanitizedNode {
  counts.value += 1;
  return {
    id: limitText(node?.id, fallbackId, 80),
    label: limitText(node?.label, "Untitled", 96),
    value: node?.value ? limitText(node.value, "", 96) : undefined,
    children:
      "children" in (node ?? {}) && depth < maxDepth && counts.value < UI_RENDER_BUDGETS.relationNodes
        ? (node as MindMapNode).children
            ?.map((child, index) =>
              counts.value < UI_RENDER_BUDGETS.relationNodes ? sanitizeNode(child, `${fallbackId}-${index}`, counts, depth + 1) : null,
            )
            .filter((child): child is SanitizedNode => Boolean(child)) ?? []
        : [],
  };
}

function countMindMapNodes(nodes: MindMapNode[] | undefined, limit = UI_RENDER_BUDGETS.relationNodes + 1, counts = { value: 0 }): number {
  for (const node of nodes ?? []) {
    if (counts.value >= limit) break;
    counts.value += 1;
    countMindMapNodes(node.children, limit, counts);
  }

  return counts.value;
}

function normalizeDepth(depth: number | undefined) {
  if (depth === undefined || !Number.isFinite(depth)) return maxDepth;
  return Math.max(1, Math.min(maxDepth, Math.floor(depth)));
}

function getVisibleChildren(node: SanitizedNode, collapsedIds: Set<string>, depth: number, depthLimit = maxDepth) {
  if (collapsedIds.has(node.id) || depth >= depthLimit) return [];
  return node.children;
}

function getSanitizedNodeHeight(node: SanitizedNode, depth: number) {
  const textBlocks = getNodeTextBlocks(node, depth);
  return getNodeHeight(textBlocks.labelLines, textBlocks.valueLines);
}

function getSubtreeHeight(node: SanitizedNode, collapsedIds: Set<string>, depth: number, depthLimit: number): number {
  const visibleChildren = getVisibleChildren(node, collapsedIds, depth, depthLimit);
  const ownHeight = getSanitizedNodeHeight(node, depth);
  if (visibleChildren.length === 0) return ownHeight;

  const gap = getSiblingGap(depth);
  const childrenHeight = visibleChildren.reduce((sum, child) => sum + getSubtreeHeight(child, collapsedIds, depth + 1, depthLimit), 0);
  return Math.max(ownHeight, childrenHeight + Math.max(0, visibleChildren.length - 1) * gap);
}

function getSideHeight(branches: SanitizedNode[], collapsedIds: Set<string>, depthLimit: number) {
  if (branches.length === 0) return minNodeHeight;

  return (
    branches.reduce((sum, branch) => sum + getSubtreeHeight(branch, collapsedIds, 1, depthLimit), 0) +
    Math.max(0, branches.length - 1) * branchVerticalGap
  );
}

function buildSideLayout(
  branches: SanitizedNode[],
  side: -1 | 1,
  rootX: number,
  rootY: number,
  collapsedIds: Set<string>,
  depthLimit: number,
  safeColors: string[],
  styles: MindMapStyles | undefined,
  nextY: { value: number },
  nodes: LayoutNode[],
  links: LayoutLink[],
  rootNode: LayoutNode,
) {
  function visit(node: SanitizedNode, depth: number, parent: LayoutNode, colorIndex: number, topY: number, blockHeight: number): LayoutNode {
    const visibleChildren = depth < depthLimit && !collapsedIds.has(node.id) ? node.children : [];
    const textBlocks = getNodeTextBlocks(node, depth);
    const width = getNodeWidth(depth);
    const height = getNodeHeight(textBlocks.labelLines, textBlocks.valueLines);
    const y = topY + blockHeight / 2;
    const x = rootX + side * getDepthOffset(depth, width);
    const color = safeColors[colorIndex % safeColors.length] ?? mindMapColors[0];
    const nodeStyle = depth === 1 ? styles?.branch ?? defaultNodeStyles.branch : styles?.leaf ?? defaultNodeStyles.leaf;
    const layoutNode: LayoutNode = {
      id: node.id,
      label: node.label,
      labelLines: textBlocks.labelLines,
      value: node.value,
      valueLines: textBlocks.valueLines,
      depth,
      side,
      x,
      y,
      width,
      height,
      color,
      nodeStyle,
      childCount: node.children.length,
      hiddenChildCount: Math.max(0, node.children.length - visibleChildren.length),
      collapsible: node.children.length > 0,
      collapsed: collapsedIds.has(node.id),
    };

    nodes.push(layoutNode);
    links.push({ from: parent, to: layoutNode });

    if (visibleChildren.length === 0) {
      return layoutNode;
    }

    const childGap = getSiblingGap(depth);
    const childHeights = visibleChildren.map((child) => getSubtreeHeight(child, collapsedIds, depth + 1, depthLimit));
    const childrenHeight = childHeights.reduce((sum, childHeight) => sum + childHeight, 0) + Math.max(0, visibleChildren.length - 1) * childGap;
    let childTopY = topY + Math.max(0, (blockHeight - childrenHeight) / 2);

    for (const [index, child] of visibleChildren.entries()) {
      visit(child, depth + 1, layoutNode, colorIndex + index + 1, childTopY, childHeights[index]);
      childTopY += childHeights[index] + childGap;
    }

    return layoutNode;
  }

  for (const [index, branch] of branches.entries()) {
    const subtreeHeight = getSubtreeHeight(branch, collapsedIds, 1, depthLimit);
    visit(branch, 1, rootNode, index, nextY.value, subtreeHeight);
    nextY.value += subtreeHeight + branchVerticalGap;
  }

  if (branches.length === 0) {
    nextY.value += minNodeHeight + branchVerticalGap;
  }
}

function createLayout(root: SanitizedNode, branches: SanitizedNode[], collapsedIds: Set<string>, depthLimit: number, styles?: MindMapStyles) {
  const safeColors = getSafeChartColors(styles?.colors, mindMapColors);
  const leftBranches = branches.filter((_, index) => index % 2 === 1);
  const rightBranches = branches.filter((_, index) => index % 2 === 0);
  const topPadding = 44;
  const leftHeight = getSideHeight(leftBranches, collapsedIds, depthLimit);
  const rightHeight = getSideHeight(rightBranches, collapsedIds, depthLimit);
  const safeHeight = Math.max(minHeight, Math.ceil(Math.max(leftHeight, rightHeight) + topPadding * 2));
  const deepest = Math.max(1, Math.min(depthLimit, getDeepestVisibleDepth(branches, collapsedIds, depthLimit)));
  const deepestWidth = getNodeWidth(deepest);
  const maxNodeOffset = getDepthOffset(deepest, deepestWidth) + deepestWidth / 2 + toggleOffset + toggleHitSize / 2 + toggleSafePadding;
  const width = Math.max(640, Math.ceil(maxNodeOffset * 2));
  const rootX = width / 2;
  const rootY = safeHeight / 2;
  const rootTextBlocks = getNodeTextBlocks(root, 0);
  const rootNode: LayoutNode = {
    id: root.id,
    label: root.label,
    labelLines: rootTextBlocks.labelLines,
    value: root.value,
    valueLines: rootTextBlocks.valueLines,
    depth: 0,
    side: 0,
    x: rootX,
    y: rootY,
    width: rootNodeWidth,
    height: getNodeHeight(rootTextBlocks.labelLines, rootTextBlocks.valueLines) + 8,
    color: safeColors[0] ?? mindMapColors[0],
    nodeStyle: styles?.root ?? defaultNodeStyles.root,
    childCount: branches.length,
    hiddenChildCount: 0,
    collapsible: false,
    collapsed: false,
  };
  const nodes: LayoutNode[] = [rootNode];
  const links: LayoutLink[] = [];
  const leftTopY = (safeHeight - leftHeight) / 2;
  const rightTopY = (safeHeight - rightHeight) / 2;

  buildSideLayout(leftBranches, -1, rootX, rootY, collapsedIds, depthLimit, safeColors, styles, { value: leftTopY }, nodes, links, rootNode);
  buildSideLayout(rightBranches, 1, rootX, rootY, collapsedIds, depthLimit, safeColors, styles, { value: rightTopY }, nodes, links, rootNode);

  return { width, height: safeHeight, nodes, links };
}

function getDeepestVisibleDepth(nodes: SanitizedNode[], collapsedIds: Set<string>, depthLimit: number, depth = 1): number {
  if (nodes.length === 0 || depth >= depthLimit) return depth;
  return nodes.reduce((deepest, node) => {
    const children = getVisibleChildren(node, collapsedIds, depth, depthLimit);
    return Math.max(deepest, getDeepestVisibleDepth(children, collapsedIds, depthLimit, depth + 1));
  }, depth);
}

function formatPathNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function clampMindMapNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampMindMapView(view: MindMapView, width: number, height: number): MindMapView {
  const scale = clampMindMapNumber(Number.isFinite(view.scale) ? view.scale : 1, minZoom, maxZoom);
  const scaleOverflow = Math.max(0, scale - 1);
  const maxPanX = Math.max(72, width * (0.14 + scaleOverflow * 0.56));
  const maxPanY = Math.max(54, height * (0.14 + scaleOverflow * 0.56));

  return {
    scale,
    x: clampMindMapNumber(Number.isFinite(view.x) ? view.x : 0, -maxPanX, maxPanX),
    y: clampMindMapNumber(Number.isFinite(view.y) ? view.y : 0, -maxPanY, maxPanY),
  };
}

function getDefaultMindMapView(layoutWidth: number, layoutHeight: number, viewportSize: MindMapViewportSize): MindMapView {
  if (viewportSize.width <= 0 || viewportSize.height <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const renderedScale = Math.min(viewportSize.width / layoutWidth, viewportSize.height / layoutHeight);
  if (!Number.isFinite(renderedScale) || renderedScale <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const topInset = Math.max(0, (viewportSize.height - layoutHeight * renderedScale) / 2) / renderedScale;
  const leftInset = Math.max(0, (viewportSize.width - layoutWidth * renderedScale) / 2) / renderedScale;

  return clampMindMapView(
    {
      x: leftInset,
      y: topInset,
      scale: 1,
    },
    layoutWidth,
    layoutHeight,
  );
}

function getZoomedMindMapView(view: MindMapView, delta: number, origin: { x: number; y: number }, width: number, height: number): MindMapView {
  const nextScale = clampMindMapNumber(view.scale + delta, minZoom, maxZoom);
  if (nextScale === view.scale) return view;
  const ratio = nextScale / view.scale;

  return clampMindMapView(
    {
      scale: nextScale,
      x: origin.x - (origin.x - view.x) * ratio,
      y: origin.y - (origin.y - view.y) * ratio,
    },
    width,
    height,
  );
}

function createConnectorPath(from: LayoutNode, to: LayoutNode) {
  const side = to.side === -1 ? -1 : 1;
  const startX = from.x + side * (from.width / 2);
  const startY = from.y;
  const endX = to.x - side * (to.width / 2);
  const endY = to.y;
  const distance = Math.abs(endX - startX);
  const verticalDistance = Math.abs(endY - startY);
  const direction = side;
  const bendRatio = Math.min(0.46, 0.32 + verticalDistance / 1100);
  const bend = Math.max(28, Math.min(144, distance * bendRatio, distance / 2));
  const controlStartX = startX + direction * bend;
  const controlEndX = endX - direction * bend;
  const parts = [
    "M",
    startX,
    startY,
    "C",
    controlStartX,
    startY,
    controlEndX,
    endY,
    endX,
    endY,
  ];

  return parts.map((part) => (typeof part === "number" ? formatPathNumber(part) : part)).join(" ");
}

function getMindMapNodePaint(node: LayoutNode) {
  if (node.depth === 0) {
    return {
      fill: node.nodeStyle.background ?? defaultNodeStyles.root.background,
      stroke: node.nodeStyle.border ?? defaultNodeStyles.root.border,
      text: node.nodeStyle.color ?? defaultNodeStyles.root.color,
    };
  }

  const styleKey = node.depth === 1 ? "branch" : "leaf";

  return {
    fill:
      node.nodeStyle.background ??
      (node.depth === 1 ? mixChartColor(node.color, "#ffffff", 0.84) : mixChartColor(node.color, "#ffffff", 0.93)),
    stroke:
      node.nodeStyle.border ??
      (node.depth === 1 ? mixChartColor(node.color, "#2c2c2a", 0.14) : mixChartColor(node.color, "#dededb", 0.46)),
    text: node.nodeStyle.color ?? defaultNodeStyles[styleKey].color,
  };
}

export function MindMap({
  branches = emptyBranches,
  className,
  collapsedIds,
  collapsible = true,
  defaultCollapsedIds,
  depth,
  emptyText,
  error,
  height: _height,
  loading,
  loadingText,
  notice,
  onCollapsedIdsChange,
  root,
  styles,
  summary,
  title,
  ...props
}: MindMapProps) {
  const titleId = useId();
  const descId = useId();
  const [internalCollapsedIds, setInternalCollapsedIds] = useState(() => defaultCollapsedIds ?? []);
  const [view, setView] = useState<MindMapView>({ x: 0, y: 0, scale: 1 });
  const [viewportSize, setViewportSize] = useState<MindMapViewportSize>({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<MindMapDrag | null>(null);
  const safeBranchInput = Array.isArray(branches) ? branches : emptyBranches;
  const resolvedCollapsedIds = collapsedIds ?? internalCollapsedIds;
  const collapsedSet = useMemo(() => new Set(resolvedCollapsedIds.map((id) => limitText(id, "", 80)).filter(Boolean)), [resolvedCollapsedIds]);
  const safeRoot = useMemo(() => sanitizeNode(root ?? fallbackRoot, "root"), [root]);
  const inputNodeCount = useMemo(() => 1 + countMindMapNodes(safeBranchInput), [safeBranchInput]);
  const safeBranches = useMemo(() => {
    const counts = { value: 1 };
    return safeBranchInput
      .map((branch, index) =>
        counts.value < UI_RENDER_BUDGETS.relationNodes ? sanitizeNode(branch, `branch-${index}`, counts, 1) : null,
      )
      .filter((branch): branch is SanitizedNode => Boolean(branch));
  }, [safeBranchInput]);
  const depthLimit = normalizeDepth(depth);
  const layout = useMemo(() => createLayout(safeRoot, safeBranches, collapsedSet, depthLimit, styles), [collapsedSet, depthLimit, safeBranches, safeRoot, styles]);
  const hiddenBudgetCount = Math.max(0, inputNodeCount - layout.nodes.length);
  const isEmpty = safeBranches.length === 0;
  const hasState = loading || error || isEmpty;
  const svgSummary =
    summary ??
    `${safeBranches.length} primary branches rendered to depth ${depthLimit}. ${resolvedCollapsedIds.length} branch${
      resolvedCollapsedIds.length === 1 ? " is" : "es are"
    } collapsed.`;
  const renderNotice =
    notice ??
    (hiddenBudgetCount > 0
      ? `MindMap limited to ${layout.nodes.length.toLocaleString()} visible nodes; ${hiddenBudgetCount.toLocaleString()} nodes were omitted or collapsed by depth for SVG performance.`
      : undefined);
  const svgStyle = {
    "--mind-map-full-width": `${layout.width}px`,
    "--mind-map-mobile-width": `${Math.min(layout.width, mobileReadableWidth)}px`,
    maxHeight: _height ? Math.max(minHeight, _height) : undefined,
  } as CSSProperties;
  const defaultView = useMemo(
    () => getDefaultMindMapView(layout.width, layout.height, viewportSize),
    [layout.height, layout.width, viewportSize],
  );

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      setViewportSize((currentSize) =>
        currentSize.width === nextSize.width && currentSize.height === nextSize.height ? currentSize : nextSize,
      );
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(svg);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setView((currentView) => {
      const clampedView = clampMindMapView(currentView, layout.width, layout.height);
      return currentView.x === 0 && currentView.y === 0 && currentView.scale === 1 ? defaultView : clampedView;
    });
  }, [defaultView, layout.width, layout.height]);

  const setClampedView = (nextView: MindMapView | ((currentView: MindMapView) => MindMapView)) => {
    setView((currentView) => clampMindMapView(typeof nextView === "function" ? nextView(currentView) : nextView, layout.width, layout.height));
  };

  const zoomBy = (delta: number, origin = { x: layout.width / 2, y: layout.height / 2 }) => {
    setClampedView((currentView) => getZoomedMindMapView(currentView, delta, origin, layout.width, layout.height));
  };

  const panBy = (x: number, y: number) => {
    setClampedView((currentView) => ({
      ...currentView,
      x: currentView.x + x,
      y: currentView.y + y,
    }));
  };

  const resetView = () => {
    setView(defaultView);
  };

  const getSvgPoint = (event: ReactWheelEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: layout.width / 2, y: layout.height / 2 };

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localPoint = point.matrixTransform(matrix.inverse());
    return { x: localPoint.x, y: localPoint.y };
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (hasState || (!event.ctrlKey && !event.metaKey)) return;

    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -zoomStep : zoomStep, getSvgPoint(event));
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (hasState || event.button !== 0 || event.pointerType === "touch" || target?.closest(".c-mind-map__hit")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const svgPerPixelX = layout.width / Math.max(1, rect.width);
    const svgPerPixelY = layout.height / Math.max(1, rect.height);
    setClampedView((currentView) => ({
      ...currentView,
      x: drag.originX + (event.clientX - drag.startX) * svgPerPixelX,
      y: drag.originY + (event.clientY - drag.startY) * svgPerPixelY,
    }));
  };

  const handlePointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const updateCollapsed = (node: LayoutNode) => {
    if (!collapsible || !node.collapsible) return;
    const next = new Set(resolvedCollapsedIds);
    if (next.has(node.id)) {
      next.delete(node.id);
    } else {
      next.add(node.id);
    }
    const nextIds = Array.from(next);
    if (!collapsedIds) {
      setInternalCollapsedIds(nextIds);
    }
    onCollapsedIdsChange?.(nextIds);
  };

  const handleToggleKeyDown = (event: ReactKeyboardEvent<SVGRectElement>, node: LayoutNode) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    updateCollapsed(node);
  };

  return (
    <ChartFrame
      className={["c-mind-map", className].filter(Boolean).join(" ")}
      empty={isEmpty}
      emptyText={emptyText}
      error={error}
      loading={loading}
      loadingText={loadingText}
      notice={renderNotice}
      summary={summary}
      title={title}
      {...props}
    >
      {!hasState ? (
        <div aria-label="Mind map view controls" className="c-mind-map__viewbar" role="toolbar">
          <button aria-label="Pan mind map left" className="c-mind-map__control" onClick={() => panBy(-panStep, 0)} title="Pan left" type="button">
            <span aria-hidden="true">&lt;</span>
          </button>
          <button aria-label="Pan mind map up" className="c-mind-map__control" onClick={() => panBy(0, -panStep)} title="Pan up" type="button">
            <span aria-hidden="true">^</span>
          </button>
          <button aria-label="Pan mind map down" className="c-mind-map__control" onClick={() => panBy(0, panStep)} title="Pan down" type="button">
            <span aria-hidden="true">v</span>
          </button>
          <button aria-label="Pan mind map right" className="c-mind-map__control" onClick={() => panBy(panStep, 0)} title="Pan right" type="button">
            <span aria-hidden="true">&gt;</span>
          </button>
          <span aria-hidden="true" className="c-mind-map__viewbar-separator" />
          <button aria-label="Zoom mind map out" className="c-mind-map__control" onClick={() => zoomBy(-zoomStep)} title="Zoom out" type="button">
            <span aria-hidden="true">-</span>
          </button>
          <span aria-label={`Mind map zoom ${Math.round(view.scale * 100)} percent`} className="c-mind-map__zoom-readout" role="status">
            {Math.round(view.scale * 100)}%
          </span>
          <button aria-label="Zoom mind map in" className="c-mind-map__control" onClick={() => zoomBy(zoomStep)} title="Zoom in" type="button">
            <span aria-hidden="true">+</span>
          </button>
          <button aria-label="Reset mind map view" className="c-mind-map__control" onClick={resetView} title="Fit / reset view" type="button">
            <span aria-hidden="true">1:1</span>
          </button>
        </div>
      ) : null}
      <svg
        aria-hidden={hasState ? true : undefined}
        aria-labelledby={hasState ? undefined : `${titleId} ${descId}`}
        className="c-chart__svg c-chart__svg--mind-map"
        data-panning={isPanning ? "true" : undefined}
        data-view-scale={view.scale.toFixed(2)}
        focusable="false"
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        preserveAspectRatio="xMidYMid meet"
        ref={svgRef}
        role={hasState ? undefined : "img"}
        style={svgStyle}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <title id={titleId}>{limitText(title, "Mind map", 80)}</title>
        <desc id={descId}>{svgSummary}</desc>
        <g className="c-mind-map__viewport" transform={`translate(${formatPathNumber(view.x)} ${formatPathNumber(view.y)}) scale(${formatPathNumber(view.scale)})`}>
          <g className="c-mind-map__links">
            {layout.links.map((link) => (
              <path
                data-child-id={link.to.id}
                data-parent-id={link.from.id}
                data-source={link.from.id}
                data-target={link.to.id}
                d={createConnectorPath(link.from, link.to)}
                key={`${link.from.id}-${link.to.id}`}
                pathLength={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={connectorStrokeWidth}
                style={{
                  opacity: link.to.depth === 1 ? 0.76 : 0.5,
                  stroke: styles?.connector ?? mixChartColor(link.to.color, "#ffffff", link.to.depth === 1 ? 0.22 : 0.44),
                }}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
          <g className="c-mind-map__nodes">
            {layout.nodes.map((node) => {
              const paint = getMindMapNodePaint(node);
              const canToggle = collapsible && node.collapsible;
              const toggleCenterX = node.side >= 0 ? node.width + toggleOffset : -toggleOffset;
              const toggleCenterY = node.height / 2;
              const labelBlockHeight = node.labelLines.length * labelLineHeight;
              const valueBlockHeight = node.valueLines.length > 0 ? node.valueLines.length * valueLineHeight + textBlockGap : 0;
              const textBlockHeight = labelBlockHeight + valueBlockHeight;
              const labelStartY = (node.height - textBlockHeight) / 2 + 10;
              const valueStartY = (node.height - textBlockHeight) / 2 + labelBlockHeight + textBlockGap + 9;
              const statusText = node.collapsed
                ? `${node.hiddenChildCount} hidden child ${node.hiddenChildCount === 1 ? "node" : "nodes"}`
                : `${node.childCount} child ${node.childCount === 1 ? "node" : "nodes"}`;

              return (
                <g
                  className="c-mind-map__node"
                  data-depth={node.depth}
                  data-node-id={node.id}
                  data-side={node.side}
                  key={node.id}
                  transform={`translate(${node.x - node.width / 2} ${node.y - node.height / 2})`}
                >
                  <rect
                    className="c-mind-map__node-box"
                    height={node.height}
                    rx="8"
                    ry="8"
                    style={{
                      fill: paint.fill,
                      stroke: paint.stroke,
                    }}
                    width={node.width}
                  />
                  <text className="c-mind-map__node-label" style={{ fill: paint.text }} x={node.width / 2} y={labelStartY}>
                    {node.labelLines.map((line, index) => (
                      <tspan dy={index === 0 ? 0 : labelLineHeight} key={`${node.id}-label-${index}`} x={node.width / 2}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                  {node.valueLines.length > 0 ? (
                    <text className="c-mind-map__node-value" x={node.width / 2} y={valueStartY}>
                      {node.valueLines.map((line, index) => (
                        <tspan dy={index === 0 ? 0 : valueLineHeight} key={`${node.id}-value-${index}`} x={node.width / 2}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  ) : null}
                  {canToggle ? (
                    <g
                      className="c-mind-map__toggle"
                      transform={`translate(${toggleCenterX} ${toggleCenterY})`}
                    >
                      <circle r={toggleSize / 2} />
                      <text y="4">{node.collapsed ? "+" : "-"}</text>
                    </g>
                  ) : null}
                  {canToggle ? (
                    <rect
                      aria-expanded={!node.collapsed}
                      aria-label={`${node.label}. ${statusText}. ${node.collapsed ? "Expand" : "Collapse"} branch`}
                      className="c-mind-map__hit"
                      focusable="true"
                      height={toggleHitSize}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateCollapsed(node);
                      }}
                      onKeyDown={(event) => handleToggleKeyDown(event, node)}
                      role="button"
                      rx={toggleHitSize / 2}
                      ry={toggleHitSize / 2}
                      tabIndex={0}
                      width={toggleHitSize}
                      x={toggleCenterX - toggleHitSize / 2}
                      y={toggleCenterY - toggleHitSize / 2}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </ChartFrame>
  );
}
