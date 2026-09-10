import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes, ReactNode, SyntheticEvent } from "react";
import { cx } from "../../../utils/cx";
import { getSafeImageSrc, isSafeImageSrc } from "../../../utils/url";
import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
import { Modal } from "../Modal";
import "./style.css";

export type ImageFit = "contain" | "cover" | "fill" | "none" | "scale-down";
export type ImagePreviewConfig = {
  closeLabel?: string;
  fit?: ImageFit;
  initialZoom?: number;
  maxZoom?: number;
  minZoom?: number;
  title?: ReactNode;
  zoom?: boolean;
};

export interface ImageProps
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "alt" | "dangerouslySetInnerHTML" | "height" | "loading" | "onClick" | "onError" | "onLoad" | "src" | "width"
  > {
  alt: string;
  aspectRatio?: number | string;
  caption?: ReactNode;
  emptyLabel?: string;
  errorLabel?: string;
  fallback?: ReactNode | string;
  fallbackAlt?: string;
  fit?: ImageFit;
  height?: number | string;
  loading?: boolean;
  loadingLabel?: string;
  nativeLoading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  onClick?: () => void;
  onError?: (event: SyntheticEvent<HTMLImageElement>, info: { src: string }) => void;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>, info: { src: string }) => void;
  preview?: boolean | ImagePreviewConfig;
  previewLabel?: string;
  width?: number | string;
}

type InternalImageProps = ImageProps & {
  dangerouslySetInnerHTML?: never;
  src?: string;
};

const minZoomFloor = 0.25;
const maxZoomCeiling = 4;

function getCssSize(value: number | string | undefined) {
  return typeof value === "number" ? `${value}px` : value;
}

function getAspectRatio(value: number | string | undefined) {
  return typeof value === "number" ? `${value}` : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSafeImageSrcSet(srcSet: string | undefined) {
  if (!srcSet) {
    return undefined;
  }

  const candidates = srcSet.split(",").map((candidate) => candidate.trim()).filter(Boolean);
  if (candidates.length === 0) {
    return undefined;
  }

  const safeCandidates = candidates.filter((candidate) => {
    const [candidateSrc] = candidate.split(/\s+/);
    return isSafeImageSrc(candidateSrc);
  });

  return safeCandidates.length === candidates.length ? srcSet.trim() : undefined;
}

export function Image({
  alt,
  aspectRatio,
  caption,
  className,
  emptyLabel = "No image source",
  errorLabel = "Image failed to load",
  fallback,
  fallbackAlt,
  fit = "cover",
  height,
  loading = false,
  loadingLabel = "Loading image",
  nativeLoading = "lazy",
  onClick,
  onError,
  onLoad,
  preview = false,
  previewLabel = "Preview image",
  src,
  srcSet,
  style,
  width,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: InternalImageProps) {
  const primarySrc = getSafeImageSrc(src);
  const fallbackSrc = typeof fallback === "string" ? getSafeImageSrc(fallback) : undefined;
  const safeSrcSet = getSafeImageSrcSet(srcSet);
  const [currentSrc, setCurrentSrc] = useState(primarySrc);
  const [imageState, setImageState] = useState<"idle" | "loading" | "loaded" | "error">(primarySrc ? "loading" : "error");
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewConfig = typeof preview === "object" ? preview : undefined;
  const minZoom = clamp(previewConfig?.minZoom ?? 0.5, minZoomFloor, maxZoomCeiling);
  const maxZoom = clamp(previewConfig?.maxZoom ?? 2.5, minZoom, maxZoomCeiling);
  const initialZoom = clamp(previewConfig?.initialZoom ?? 1, minZoom, maxZoom);
  const [zoom, setZoom] = useState(initialZoom);
  const previewEnabled = Boolean(preview && currentSrc && imageState === "loaded");
  const hasCustomFallback = Boolean(fallback && typeof fallback !== "string");
  const hasCaption = caption !== undefined && caption !== null && caption !== false;
  const needsStatusProbe = Boolean(fallback || preview);
  const showLoading = loading || imageState === "loading";

  useEffect(() => {
    setCurrentSrc(primarySrc);
    setImageState(primarySrc ? "loading" : "error");
  }, [primarySrc]);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, previewOpen]);

  useEffect(() => {
    if (!currentSrc || !needsStatusProbe) {
      return;
    }

    let cancelled = false;
    const probe = new window.Image();

    probe.onload = () => {
      if (!cancelled) {
        setImageState("loaded");
      }
    };

    probe.onerror = () => {
      if (cancelled) {
        return;
      }
      if (currentSrc === primarySrc && fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setImageState("loading");
        return;
      }

      setImageState("error");
    };

    probe.src = currentSrc;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [currentSrc, fallbackSrc, needsStatusProbe, primarySrc]);

  const rootStyle = useMemo(
    () =>
      ({
        "--image-aspect-ratio": getAspectRatio(aspectRatio),
        "--image-height": getCssSize(height),
        "--image-width": getCssSize(width),
        ...style,
      }) as CSSProperties,
    [aspectRatio, height, style, width],
  );

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setImageState("loaded");
    if (currentSrc) {
      onLoad?.(event, { src: currentSrc });
    }
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    if (currentSrc === primarySrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setImageState("loading");
      return;
    }

    setImageState("error");
    if (currentSrc) {
      onError?.(event, { src: currentSrc });
    }
  }

  function handlePreviewClick() {
    if (previewEnabled) {
      setPreviewOpen(true);
    }
  }

  const image = currentSrc ? (
    <img
      alt={currentSrc === fallbackSrc && fallbackAlt ? fallbackAlt : alt}
      className={cx("c-image__img", `c-image__img--${fit}`)}
      loading={nativeLoading}
      onError={handleError}
      onLoad={handleLoad}
      src={currentSrc}
      srcSet={currentSrc === primarySrc ? safeSrcSet : undefined}
      {...props}
    />
  ) : null;

  return (
    <figure
      className={cx(
        "c-image",
        `c-image--fit-${fit}`,
        aspectRatio && "c-image--ratio",
        loading && "c-image--forced-loading",
        imageState === "error" && "c-image--error",
        previewEnabled && "c-image--previewable",
        className,
      )}
      style={rootStyle}
    >
      <div className="c-image__frame">
        {previewEnabled ? (
          <button
            aria-label={previewLabel}
            className="c-image__preview-trigger"
            onClick={(event) => {
              onClick?.();
              handlePreviewClick();
            }}
            type="button"
          >
            {image}
          </button>
        ) : (
          image
        )}

        {showLoading ? (
          <span aria-live="polite" className="c-image__state c-image__state--loading" role="status">
            <span className="c-image__spinner" aria-hidden="true" />
            {loadingLabel}
          </span>
        ) : null}

        {imageState === "error" && !loading ? (
          <span className="c-image__state c-image__state--error" role="status">
            {hasCustomFallback ? fallback : primarySrc ? errorLabel : emptyLabel}
          </span>
        ) : null}
      </div>
      {hasCaption ? <figcaption className="c-image__caption">{caption}</figcaption> : null}

      {previewEnabled ? (
        <Modal
          bodyClassName="c-image-preview__body"
          className="c-image-preview"
          closeLabel={previewConfig?.closeLabel ?? "Close image preview"}
          onClose={() => setPreviewOpen(false)}
          open={previewOpen}
          size="lg"
          title={previewConfig?.title ?? alt}
        >
          <div className="c-image-preview__stage">
            <img
              alt={alt}
              className={cx("c-image-preview__img", `c-image-preview__img--${previewConfig?.fit ?? "contain"}`)}
              src={currentSrc}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
          {previewConfig?.zoom !== false ? (
            <div className="c-image-preview__controls" aria-label="Image zoom controls">
              <IconButton
                aria-label="Zoom out"
                disabled={zoom <= minZoom}
                onClick={() => setZoom((value) => clamp(Number((value - 0.25).toFixed(2)), minZoom, maxZoom))}
                size="sm"
                tooltip="缩小"
                tooltipPlacement="top"
              >
                <Icon decorative name="minus" />
              </IconButton>
              <span>{Math.round(zoom * 100)}%</span>
              <IconButton
                aria-label="Zoom in"
                disabled={zoom >= maxZoom}
                onClick={() => setZoom((value) => clamp(Number((value + 0.25).toFixed(2)), minZoom, maxZoom))}
                size="sm"
                tooltip="放大"
                tooltipPlacement="top"
              >
                <Icon decorative name="add" />
              </IconButton>
              <IconButton aria-label="Reset zoom" onClick={() => setZoom(initialZoom)} size="sm" tooltip="重置缩放" tooltipPlacement="top">
                <Icon decorative name="refresh" />
              </IconButton>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </figure>
  );
}
