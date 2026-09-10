import mermaid from "mermaid";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon, IconButton } from "../../base";
import { cx } from "../../../utils/cx";
import { UI_RENDER_BUDGETS } from "../../../utils/performance";
import type { SvgMetrics } from "../../../utils/svg";
import { sanitizeSvg } from "../../../utils/svg";
import "./MarkdownEditor.css";

type PanZoom = {
  x: number;
  y: number;
  scale: number;
};

type ViewMode = "fit" | "manual";

type ViewerView = {
  mode: ViewMode;
  panZoom: PanZoom;
};

type ViewportSize = {
  width: number;
  height: number;
};

type RenderState =
  | { status: "idle" | "loading" }
  | { status: "ready"; svg: string; metrics: SvgMetrics }
  | { status: "error"; message: string };

type CopyState = "idle" | "copied" | "error";

export interface MermaidSvgViewerProps {
  source: string;
  className?: string;
  minHeight?: number;
  title?: string;
  maxSourceLength?: number;
}

const minScale = 0.04;
const maxScale = 4;
const maxViewportPadding = 32;
const viewportMaxHeight = 680;
const mermaidRenderTimeoutMs = 3500;
let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

// 与 Codex 设计 token 对齐的中性配色（避免旧橄榄/暖色与写死白底，支持亮/暗双主题）。
const MERMAID_FONT_FAMILY =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif';

function getMermaidThemeVariables(isDark: boolean) {
  if (isDark) {
    return {
      background: "#181818",
      primaryColor: "#303030",
      primaryBorderColor: "#4a4a4a",
      primaryTextColor: "#ededed",
      secondaryColor: "#262626",
      secondaryBorderColor: "#4a4a4a",
      secondaryTextColor: "#ededed",
      tertiaryColor: "#212121",
      tertiaryBorderColor: "#3a3a3a",
      tertiaryTextColor: "#afafaf",
      lineColor: "#5d5d5d",
      textColor: "#ededed",
      nodeBorder: "#4a4a4a",
      mainBkg: "#303030",
      clusterBkg: "#212121",
      clusterBorder: "#3a3a3a",
      edgeLabelBackground: "#181818",
      fontFamily: MERMAID_FONT_FAMILY,
    };
  }
  return {
    background: "#ffffff",
    primaryColor: "#f5f5f4",
    primaryBorderColor: "#d8d8d4",
    primaryTextColor: "#1a1c1f",
    secondaryColor: "#ededed",
    secondaryBorderColor: "#d8d8d4",
    secondaryTextColor: "#1a1c1f",
    tertiaryColor: "#f9f9f9",
    tertiaryBorderColor: "#e3e3e1",
    tertiaryTextColor: "#5d5d5d",
    lineColor: "#afafaf",
    textColor: "#1a1c1f",
    nodeBorder: "#d8d8d4",
    mainBkg: "#ffffff",
    clusterBkg: "#f9f9f9",
    clusterBorder: "#e3e3e1",
    edgeLabelBackground: "#ffffff",
    fontFamily: MERMAID_FONT_FAMILY,
  };
}

function configureMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    flowchart: {
      curve: "basis",
      htmlLabels: false,
    },
    themeVariables: getMermaidThemeVariables(isDark),
  });
}

function readIsDark(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark") {
    return true;
  }
  if (explicit === "light") {
    return false;
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(readIsDark);
  useEffect(() => {
    const update = () => setIsDark(readIsDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", update);
    };
  }, []);
  return isDark;
}

export function MermaidSvgViewer({
  className,
  maxSourceLength = UI_RENDER_BUDGETS.mermaidSourceCharacters,
  minHeight = 220,
  source,
  title = "Mermaid SVG",
}: MermaidSvgViewerProps) {
  const isDark = useIsDark();
  const reactId = useId();
  const diagramId = useMemo(
    () => `b-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );
  const [renderState, setRenderState] = useState<RenderState>({ status: "idle" });
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [view, setView] = useState<ViewerView>({
    mode: "fit",
    panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
  });
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyResetTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const getFitView = useCallback((metrics: SvgMetrics, size: ViewportSize): PanZoom => {
    const padding = getViewportPadding(size);
    const availableWidth = Math.max(size.width - padding * 2, 1);
    const availableHeight = Math.max(size.height - padding * 2, 1);
    const fitWidthScale = availableWidth / metrics.width;
    const fitHeightScale = availableHeight / metrics.height;
    const scale = clamp(Math.min(fitWidthScale, fitHeightScale), minScale, Math.min(maxScale, 1.8));
    const renderedWidth = metrics.width * scale;
    const renderedHeight = metrics.height * scale;

    return clampView(
      {
        x: Math.max(padding, (size.width - renderedWidth) / 2),
        y: Math.max(padding, (size.height - renderedHeight) / 2),
        scale,
      },
      metrics,
      size,
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      setViewportSize((currentSize) =>
        currentSize.width === nextWidth && currentSize.height === nextHeight
          ? currentSize
          : { width: nextWidth, height: nextHeight },
      );
    });

    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trimmedSource = source.trim();

    if (!trimmedSource) {
      setRenderState({ status: "error", message: "Mermaid source is empty." });
      setView({
        mode: "fit",
        panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
      });
      return;
    }

    if (trimmedSource.length > maxSourceLength) {
      setRenderState({ status: "error", message: `Mermaid source exceeds ${maxSourceLength.toLocaleString()} characters.` });
      setView({
        mode: "fit",
        panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
      });
      return;
    }

    if (countMermaidStatements(trimmedSource) > UI_RENDER_BUDGETS.mermaidStatements) {
      setRenderState({ status: "error", message: `Mermaid diagram exceeds ${UI_RENDER_BUDGETS.mermaidStatements.toLocaleString()} renderable statements.` });
      setView({
        mode: "fit",
        panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
      });
      return;
    }

    setRenderState({ status: "loading" });
    setView({
      mode: "fit",
      panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
    });

    queueMermaidRender(`${diagramId}-${hashSource(trimmedSource)}`, trimmedSource, isDark, () => cancelled)
      .then(({ svg }) => {
        if (cancelled) return;

        const sanitized = sanitizeSvg(svg);
        if (!sanitized.ok) {
          setRenderState({ status: "error", message: sanitized.error });
          return;
        }

        setRenderState({
          status: "ready",
          svg: sanitized.svg,
          metrics: sanitized.metrics,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRenderState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to render Mermaid diagram.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [diagramId, isDark, maxSourceLength, source]);

  const readyMetrics = renderState.status === "ready" ? renderState.metrics : undefined;

  useEffect(() => {
    if (!readyMetrics || !hasMeasuredViewport(viewportSize)) return;
    setView((currentView) => {
      if (currentView.mode === "fit") {
        return {
          mode: "fit",
          panZoom: getFitView(readyMetrics, viewportSize),
        };
      }

      return {
        mode: "manual",
        panZoom: clampView(currentView.panZoom, readyMetrics, viewportSize),
      };
    });
  }, [getFitView, readyMetrics, viewportSize]);

  const desiredViewportHeight = readyMetrics
    ? getViewportHeight(readyMetrics, Math.max(viewportSize.width || 0, 0), minHeight)
    : Math.max(minHeight, 240);

  const zoomBy = (delta: number, origin?: { x: number; y: number }) => {
    if (!readyMetrics || !hasMeasuredViewport(viewportSize)) return;
    setView((currentView) => ({
      mode: "manual",
      panZoom: clampView(
        getZoomedView(currentView.panZoom, delta, origin ?? getViewportCenter(viewportSize)),
        readyMetrics,
        viewportSize,
      ),
    }));
  };

  const resetView = () => {
    if (!readyMetrics || !hasMeasuredViewport(viewportSize)) {
      setView({
        mode: "fit",
        panZoom: { x: maxViewportPadding, y: maxViewportPadding, scale: 1 },
      });
      return;
    }

    setView({
      mode: "fit",
      panZoom: getFitView(readyMetrics, viewportSize),
    });
  };

  const resetCopyState = (nextState: CopyState) => {
    if (copyResetTimerRef.current) {
      window.clearTimeout(copyResetTimerRef.current);
    }

    setCopyState(nextState);
    copyResetTimerRef.current = window.setTimeout(() => setCopyState("idle"), nextState === "error" ? 1800 : 1400);
  };

  const copySource = async () => {
    const trimmedSource = source.trim();
    if (!trimmedSource || renderState.status === "loading") return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmedSource);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = trimmedSource;
        textarea.setAttribute("readonly", "");
        textarea.setAttribute("aria-hidden", "true");
        textarea.tabIndex = -1;
        textarea.style.position = "fixed";
        textarea.style.insetInlineStart = "-9999px";
        textarea.style.width = "1px";
        textarea.style.height = "1px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      resetCopyState("copied");
    } catch {
      resetCopyState("error");
    }
  };

  const downloadSvg = () => {
    if (renderState.status !== "ready") return;
    const blob = new Blob([renderState.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${diagramId}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (renderState.status !== "ready") return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    zoomBy(event.deltaY > 0 ? -0.08 : 0.08, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (renderState.status !== "ready") return;

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(0.12);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(-0.12);
      return;
    }

    if (event.key === "Home" || event.key === "0") {
      event.preventDefault();
      resetView();
      return;
    }

    const panStep = event.shiftKey ? 48 : 18;
    const keyOffsets: Record<string, { x: number; y: number }> = {
      ArrowUp: { x: 0, y: panStep },
      ArrowDown: { x: 0, y: -panStep },
      ArrowLeft: { x: panStep, y: 0 },
      ArrowRight: { x: -panStep, y: 0 },
    };
    const offset = keyOffsets[event.key];

    if (offset) {
      event.preventDefault();
      if (!hasMeasuredViewport(viewportSize)) return;
      setView((currentView) => ({
        mode: "manual",
        panZoom: clampView(
          {
            ...currentView.panZoom,
            x: currentView.panZoom.x + offset.x,
            y: currentView.panZoom.y + offset.y,
          },
          renderState.metrics,
          viewportSize,
        ),
      }));
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (renderState.status !== "ready") return;
    if (isViewerControlTarget(event.target)) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.panZoom.x,
      originY: view.panZoom.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (renderState.status !== "ready" || !hasMeasuredViewport(viewportSize)) return;

    setView((currentView) => ({
      mode: "manual",
      panZoom: clampView(
        {
          ...currentView.panZoom,
          x: drag.originX + event.clientX - drag.startX,
          y: drag.originY + event.clientY - drag.startY,
        },
        renderState.metrics,
        viewportSize,
      ),
    }));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <figure className={cx("b-mermaid-viewer", className)}>
      <figcaption className="b-mermaid-viewer__bar">
        <span>
          {title}
          {renderState.status === "ready" ? <small>{Math.round(view.panZoom.scale * 100)}%</small> : null}
        </span>
        <div className="b-mermaid-viewer__controls c-local-tools" aria-label="Mermaid viewport controls">
          <IconButton
            aria-label={copyState === "copied" ? "Mermaid source copied" : copyState === "error" ? "Copy Mermaid source failed" : "Copy Mermaid source"}
            disabled={!source.trim() || renderState.status === "loading"}
            onClick={copySource}
            size="sm"
            tooltip={copyState === "copied" ? "已复制源码" : copyState === "error" ? "复制源码失败" : "复制源码"}
            tooltipPlacement="top"
          >
            <Icon decorative name="copy" />
          </IconButton>
          <IconButton aria-label="Download Mermaid SVG" disabled={!readyMetrics} onClick={downloadSvg} size="sm" tooltip="下载 SVG" tooltipPlacement="top">
            <Icon decorative name="download" />
          </IconButton>
          <IconButton aria-label="Zoom out" disabled={!readyMetrics} onClick={() => zoomBy(-0.12)} size="sm" tooltip="缩小" tooltipPlacement="top">
            <Icon decorative name="minus" />
          </IconButton>
          <IconButton aria-label="Zoom in" disabled={!readyMetrics} onClick={() => zoomBy(0.12)} size="sm" tooltip="放大" tooltipPlacement="top">
            <Icon decorative name="add" />
          </IconButton>
          <IconButton aria-label="Fit view" disabled={!readyMetrics} onClick={resetView} size="sm" tooltip="适配视图" tooltipPlacement="top">
            <Icon decorative name="refresh" />
          </IconButton>
        </div>
      </figcaption>

      <div
        aria-busy={renderState.status === "loading" || undefined}
        aria-label={title}
        ref={viewportRef}
        className="b-mermaid-viewer__viewport"
        role="img"
        tabIndex={renderState.status === "ready" ? 0 : undefined}
        style={{ height: desiredViewportHeight }}
        title="Drag or use arrow keys to pan. Use plus, minus, or Home to zoom and reset."
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {renderState.status === "ready" ? (
          <div
            className="b-mermaid-viewer__svg"
            style={{
              width: renderState.metrics.width,
              height: renderState.metrics.height,
              transform: `translate(${view.panZoom.x}px, ${view.panZoom.y}px) scale(${view.panZoom.scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: renderState.svg }}
          />
        ) : (
          <pre className="b-mermaid-viewer__message">
            {renderState.status === "error" ? renderState.message : "Rendering Mermaid diagram..."}
          </pre>
        )}
      </div>
    </figure>
  );
}

function isViewerControlTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".b-mermaid-viewer__controls"));
}

function getZoomedView(view: PanZoom, delta: number, origin?: { x: number; y: number }): PanZoom {
  const nextScale = clamp(view.scale + delta, minScale, maxScale);

  if (!origin || nextScale === view.scale) {
    return {
      ...view,
      scale: nextScale,
    };
  }

  const ratio = nextScale / view.scale;
  return {
    x: origin.x - (origin.x - view.x) * ratio,
    y: origin.y - (origin.y - view.y) * ratio,
    scale: nextScale,
  };
}

function getViewportHeight(metrics: SvgMetrics, width: number, minHeight: number) {
  const safeWidth = Math.max(width, 1);
  const padding = getViewportPadding({ width: safeWidth, height: minHeight });
  const availableWidth = Math.max(safeWidth - padding * 2, 1);
  const widthFitScale = clamp(availableWidth / metrics.width, minScale, 1.8);
  return Math.max(minHeight, Math.min(viewportMaxHeight, Math.round(metrics.height * widthFitScale + padding * 2)));
}

function getViewportPadding(size: ViewportSize) {
  const shortestSide = Math.max(0, Math.min(size.width || maxViewportPadding * 2, size.height || maxViewportPadding * 2));
  return clamp(Math.floor(shortestSide / 8), 12, maxViewportPadding);
}

function getViewportCenter(size: ViewportSize) {
  return {
    x: size.width / 2,
    y: size.height / 2,
  };
}

function hasMeasuredViewport(size: ViewportSize) {
  return size.width > 0 && size.height > 0;
}

function clampView(view: PanZoom, metrics: SvgMetrics, size: ViewportSize): PanZoom {
  const scale = clamp(view.scale, minScale, maxScale);
  const padding = getViewportPadding(size);
  const contentWidth = metrics.width * scale;
  const contentHeight = metrics.height * scale;

  return {
    x: clampAxis(view.x, contentWidth, size.width, padding),
    y: clampAxis(view.y, contentHeight, size.height, padding),
    scale,
  };
}

function clampAxis(position: number, contentSize: number, viewportSize: number, padding: number) {
  if (contentSize + padding * 2 <= viewportSize) {
    return (viewportSize - contentSize) / 2;
  }

  return clamp(position, viewportSize - contentSize - padding, padding);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashSource(source: string) {
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function countMermaidStatements(source: string) {
  return source
    .split(/\n|;/)
    .map((line) => line.replace(/%%.*$/, "").trim())
    .filter(Boolean).length;
}

function queueMermaidRender(id: string, source: string, isDark: boolean, shouldCancel?: () => boolean) {
  const task = mermaidRenderQueue
    .catch(() => undefined)
    .then(() => {
      if (shouldCancel?.()) {
        throw new Error("Mermaid render cancelled.");
      }
      configureMermaid(isDark);
      return withTimeout(mermaid.render(id, source), mermaidRenderTimeoutMs);
    });

  mermaidRenderQueue = task.catch(() => undefined);
  return task;
}

function withTimeout<TValue>(promise: Promise<TValue>, timeoutMs: number): Promise<TValue> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Mermaid render exceeded ${timeoutMs.toLocaleString()}ms budget.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
