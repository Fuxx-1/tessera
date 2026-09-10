import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./MobilePreviewFrame.css";

export type MobilePreviewFrameSizeId = "iphone-se" | "iphone-14" | "pixel-7" | "fold" | "tablet";
export type MobilePreviewFrameChrome = "ios" | "android" | "none";
export type MobilePreviewFrameOrientation = "portrait" | "landscape";

export type MobilePreviewFrameSize = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export interface MobilePreviewFrameProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  size?: MobilePreviewFrameSizeId | MobilePreviewFrameSize;
  orientation?: MobilePreviewFrameOrientation;
  chrome?: MobilePreviewFrameChrome;
  scrollable?: boolean;
  screenLabel?: string;
  statusBarLabel?: string;
  safeAreaLabel?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

const sizePresets: Record<MobilePreviewFrameSizeId, MobilePreviewFrameSize> = {
  "iphone-se": { id: "iphone-se", label: "iPhone SE", width: 320, height: 568 },
  "iphone-14": { id: "iphone-14", label: "iPhone 14", width: 390, height: 844 },
  "pixel-7": { id: "pixel-7", label: "Pixel 7", width: 412, height: 915 },
  fold: { id: "fold", label: "Fold outer", width: 344, height: 882 },
  tablet: { id: "tablet", label: "Small tablet", width: 768, height: 1024 },
};

const MIN_VIEWPORT_EDGE = 240;
const MAX_VIEWPORT_EDGE = 1280;

function clampViewportEdge(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.round(Math.min(Math.max(numericValue, MIN_VIEWPORT_EDGE), MAX_VIEWPORT_EDGE));
}

function getSize(size: MobilePreviewFrameProps["size"]): MobilePreviewFrameSize {
  const fallback = sizePresets["iphone-14"];

  if (!size) {
    return fallback;
  }

  if (typeof size === "string") {
    return sizePresets[size] ?? fallback;
  }

  return {
    id: size.id || "custom",
    label: size.label || "Custom viewport",
    width: clampViewportEdge(size.width, fallback.width),
    height: clampViewportEdge(size.height, fallback.height),
  };
}

function getViewport(size: MobilePreviewFrameSize, orientation: MobilePreviewFrameOrientation) {
  if (orientation === "landscape") {
    return {
      width: Math.max(size.width, size.height),
      height: Math.min(size.width, size.height),
    };
  }

  return {
    width: Math.min(size.width, size.height),
    height: Math.max(size.width, size.height),
  };
}

function DefaultMobilePreviewContent() {
  return (
    <div className="b-mobile-preview-frame__default-content">
      <div className="b-mobile-preview-frame__hero">
        <span>Mobile mapping</span>
        <strong>Task detail</strong>
      </div>
      <div className="b-mobile-preview-frame__row">
        <span>Status</span>
        <b>Ready</b>
      </div>
      <div className="b-mobile-preview-frame__row">
        <span>Owner</span>
        <b>Component team</b>
      </div>
      <div className="b-mobile-preview-frame__row">
        <span>Viewport</span>
        <b>No iframe</b>
      </div>
      <div className="b-mobile-preview-frame__action-pair" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}

function handleScreenKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.currentTarget !== event.target) {
    return;
  }

  const scrollStep = 40;
  const pageStep = Math.max(event.currentTarget.clientHeight - scrollStep, scrollStep);
  const keyScrollMap: Record<string, number> = {
    ArrowDown: scrollStep,
    ArrowUp: -scrollStep,
    PageDown: pageStep,
    PageUp: -pageStep,
  };

  if (event.key === "Home") {
    event.preventDefault();
    event.currentTarget.scrollTop = 0;
    return;
  }

  if (event.key === "End") {
    event.preventDefault();
    event.currentTarget.scrollTop = event.currentTarget.scrollHeight;
    return;
  }

  const delta = keyScrollMap[event.key];

  if (delta) {
    event.preventDefault();
    event.currentTarget.scrollBy({ top: delta });
  }
}

export function MobilePreviewFrame({
  children,
  chrome = "ios",
  className,
  description,
  eyebrow,
  footer,
  orientation = "portrait",
  screenLabel,
  safeAreaLabel = "Safe area preview",
  scrollable = true,
  size,
  style: styleProp,
  statusBarLabel = "Device chrome",
  title,
  toolbar,
  ...props
}: MobilePreviewFrameProps) {
  const resolvedSize = getSize(size);
  const viewport = getViewport(resolvedSize, orientation);
  const titleText = typeof title === "string" ? title : resolvedSize.label;
  const label = screenLabel ?? `${titleText} ${viewport.width} by ${viewport.height} mobile preview`;
  const style = {
    "--b-mobile-preview-width": `${viewport.width}px`,
    "--b-mobile-preview-height": `${viewport.height}px`,
    "--b-mobile-preview-ratio-width": viewport.width,
    "--b-mobile-preview-ratio-height": viewport.height,
  } as CSSProperties;

  return (
    <section
      className={cx(
        "b-mobile-preview-frame",
        `b-mobile-preview-frame--${chrome}`,
        `b-mobile-preview-frame--${orientation}`,
        scrollable && "b-mobile-preview-frame--scrollable",
        className,
      )}
      data-chrome={chrome}
      data-orientation={orientation}
      data-preview-height={viewport.height}
      data-preview-width={viewport.width}
      style={{ ...style, ...styleProp }}
      {...props}
    >
      {title || eyebrow || description || toolbar ? (
        <header className="b-mobile-preview-frame__header">
          <div>
            {eyebrow ? <span className="b-mobile-preview-frame__eyebrow">{eyebrow}</span> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {toolbar ? <div className="b-mobile-preview-frame__toolbar">{toolbar}</div> : null}
        </header>
      ) : null}

      <div className="b-mobile-preview-frame__scale-box">
        <div className="b-mobile-preview-frame__device" aria-label={label}>
          {chrome !== "none" ? (
            <div className="b-mobile-preview-frame__status" aria-label={statusBarLabel}>
              <span>9:41</span>
              {chrome === "ios" ? <span className="b-mobile-preview-frame__speaker" aria-hidden="true" /> : null}
              <span className="b-mobile-preview-frame__signals" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : null}

          <div
            className="b-mobile-preview-frame__screen"
            role="region"
            aria-label={safeAreaLabel}
            onKeyDown={scrollable ? handleScreenKeyDown : undefined}
            tabIndex={scrollable ? 0 : undefined}
          >
            <div className="b-mobile-preview-frame__content">{children ?? <DefaultMobilePreviewContent />}</div>
          </div>

          {chrome === "android" ? <div className="b-mobile-preview-frame__android-nav" aria-hidden="true" /> : null}
          {chrome === "ios" ? <div className="b-mobile-preview-frame__home" aria-hidden="true" /> : null}
        </div>
      </div>

      <footer className="b-mobile-preview-frame__footer">
        <span>
          {resolvedSize.label} / {viewport.width} x {viewport.height}
        </span>
        {footer ? <span>{footer}</span> : null}
      </footer>
    </section>
  );
}
