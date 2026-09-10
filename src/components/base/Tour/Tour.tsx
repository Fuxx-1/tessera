import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "../../../hooks/useControllableState";
import { useOverlayDialog } from "../../../hooks/useOverlayDialog";
import { cx } from "../../../utils/cx";
import "./style.css";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";
export type TourCloseReason = "escape" | "outside" | "close-button" | "finish";
export type TourTarget = HTMLElement | null | (() => HTMLElement | null) | string;

export type TourStep = {
  target?: TourTarget;
  title: ReactNode;
  description?: ReactNode;
  placement?: TourPlacement;
  nextLabel?: string;
  prevLabel?: string;
  closeLabel?: string;
};

export interface TourProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "title"> {
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  container?: HTMLElement | null;
  current?: number;
  defaultCurrent?: number;
  defaultOpen?: boolean;
  finishLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  mask?: boolean;
  nextLabel?: string;
  onClose?: (reason: TourCloseReason) => void;
  onCurrentChange?: (current: number) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  placement?: TourPlacement;
  prevLabel?: string;
  showProgress?: boolean;
  steps: TourStep[];
}

type TargetState = {
  element: HTMLElement | null;
  offscreen: boolean;
  rect: DOMRect | null;
};

const viewportPadding = 16;
const spotlightPadding = 8;
const panelGap = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveTarget(target: TourTarget | undefined) {
  if (typeof document === "undefined" || !target) {
    return null;
  }

  if (typeof target === "string") {
    try {
      return document.querySelector<HTMLElement>(target);
    } catch {
      return null;
    }
  }

  if (typeof target === "function") {
    try {
      const nextTarget = target();
      return nextTarget instanceof HTMLElement ? nextTarget : null;
    } catch {
      return null;
    }
  }

  return target instanceof HTMLElement ? target : null;
}

function getTargetState(target: TourTarget | undefined): TargetState {
  const element = resolveTarget(target);
  if (!element || !element.isConnected) {
    return { element: null, offscreen: true, rect: null };
  }

  const rect = element.getBoundingClientRect();
  const offscreen =
    rect.bottom <= viewportPadding ||
    rect.right <= viewportPadding ||
    rect.top >= window.innerHeight - viewportPadding ||
    rect.left >= window.innerWidth - viewportPadding;

  return { element, offscreen, rect };
}

function getSpotlightStyle(rect: DOMRect | null): CSSProperties {
  if (!rect) {
    return {};
  }

  return {
    height: rect.height + spotlightPadding * 2,
    left: rect.left - spotlightPadding,
    top: rect.top - spotlightPadding,
    width: rect.width + spotlightPadding * 2,
  };
}

function getPanelStyle(rect: DOMRect | null, placement: TourPlacement, panelElement: HTMLElement | null): CSSProperties {
  const width = panelElement?.offsetWidth ?? 320;
  const height = panelElement?.offsetHeight ?? 180;
  const maxLeft = window.innerWidth - width - viewportPadding;
  const maxTop = window.innerHeight - height - viewportPadding;

  if (!rect || placement === "center") {
    return {
      left: clamp((window.innerWidth - width) / 2, viewportPadding, maxLeft),
      top: clamp((window.innerHeight - height) / 2, viewportPadding, maxTop),
    };
  }

  const centeredLeft = rect.left + rect.width / 2 - width / 2;
  const centeredTop = rect.top + rect.height / 2 - height / 2;

  if (placement === "top") {
    return {
      left: clamp(centeredLeft, viewportPadding, maxLeft),
      top: clamp(rect.top - height - panelGap, viewportPadding, maxTop),
    };
  }

  if (placement === "left") {
    return {
      left: clamp(rect.left - width - panelGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    };
  }

  if (placement === "right") {
    return {
      left: clamp(rect.right + panelGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    };
  }

  return {
    left: clamp(centeredLeft, viewportPadding, maxLeft),
    top: clamp(rect.bottom + panelGap, viewportPadding, maxTop),
  };
}

export function Tour({
  className,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  container,
  current,
  defaultCurrent,
  defaultOpen,
  finishLabel = "Finish",
  initialFocusRef,
  mask = true,
  nextLabel = "Next",
  onClose,
  onCurrentChange,
  onOpenChange,
  open,
  placement = "bottom",
  prevLabel = "Previous",
  showProgress = true,
  steps,
  ...props
}: TourProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const [currentStep, setCurrentStep] = useControllableState({
    defaultValue: defaultCurrent,
    fallbackValue: 0,
    onChange: onCurrentChange,
    value: current,
  });
  const boundedCurrent = clamp(currentStep, 0, Math.max(steps.length - 1, 0));
  const activeStep = steps[boundedCurrent];
  const renderedOpen = currentOpen && steps.length > 0;
  const [targetState, setTargetState] = useState<TargetState>({ element: null, offscreen: true, rect: null });
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const portalContainer = container ?? (typeof document === "undefined" ? null : document.body);
  const closeButtonLabel = activeStep?.closeLabel ?? "Close tour";
  const renderedPlacement = targetState.offscreen ? "center" : activeStep?.placement ?? placement;
  const describedBy = activeStep?.description ? descriptionId : undefined;
  const totalSteps = steps.length;
  const isLastStep = boundedCurrent >= totalSteps - 1;
  const dialogRef = useOverlayDialog({
    closeOnEscape,
    initialFocusRef: initialFocusRef ?? nextButtonRef,
    onRequestClose: () => {
      onClose?.("escape");
      setCurrentOpen(false);
    },
    open: renderedOpen,
  });

  const updatePosition = useCallback(() => {
    if (!renderedOpen) {
      return;
    }

    const nextTargetState = getTargetState(activeStep?.target);
    setTargetState(nextTargetState);
    setPanelStyle(getPanelStyle(nextTargetState.offscreen ? null : nextTargetState.rect, activeStep?.placement ?? placement, panelRef.current));
  }, [activeStep, placement, renderedOpen]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [renderedOpen, updatePosition]);

  useEffect(() => {
    if (renderedOpen && currentStep !== boundedCurrent) {
      setCurrentStep(boundedCurrent);
    }
  }, [boundedCurrent, currentStep, renderedOpen, setCurrentStep]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const focusTarget = initialFocusRef?.current ?? nextButtonRef.current ?? panelRef.current;
      focusTarget?.focus();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [boundedCurrent, initialFocusRef, renderedOpen]);

  const close = useCallback(
    (reason: TourCloseReason) => {
      onClose?.(reason);
      setCurrentOpen(false);
    },
    [onClose, setCurrentOpen],
  );

  const goPrev = useCallback(() => {
    setCurrentStep(clamp(boundedCurrent - 1, 0, Math.max(totalSteps - 1, 0)));
  }, [boundedCurrent, setCurrentStep, totalSteps]);

  const goNext = useCallback(() => {
    if (isLastStep) {
      close("finish");
      return;
    }
    setCurrentStep(clamp(boundedCurrent + 1, 0, Math.max(totalSteps - 1, 0)));
  }, [boundedCurrent, close, isLastStep, setCurrentStep, totalSteps]);

  const spotlightStyle = useMemo(() => {
    if (targetState.offscreen) {
      return {};
    }
    return getSpotlightStyle(targetState.rect);
  }, [targetState]);

  if (!renderedOpen || !portalContainer || !activeStep) {
    return null;
  }

  return createPortal(
    <div className={cx("c-tour", className)} role="presentation" {...props}>
      {mask ? <div className="c-tour__mask" aria-hidden="true" /> : null}
      {targetState.offscreen ? null : <div className="c-tour__spotlight" aria-hidden="true" style={spotlightStyle} />}
      {closeOnOutsideClick ? (
        <button
          aria-label={closeButtonLabel}
          className="c-tour__outside"
          onClick={() => close("outside")}
          tabIndex={-1}
          type="button"
        />
      ) : null}
      <section
        aria-describedby={describedBy}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cx("c-tour__panel", `c-tour__panel--${renderedPlacement}`)}
        data-fallback={targetState.offscreen ? "true" : undefined}
        ref={(node: HTMLElement | null) => {
          panelRef.current = node;
          dialogRef.current = node;
        }}
        role="dialog"
        style={panelStyle}
        tabIndex={-1}
      >
        <header className="c-tour__header">
          <div>
            {showProgress ? (
              <p className="c-tour__progress" aria-label={`Step ${boundedCurrent + 1} of ${totalSteps}`}>
                {boundedCurrent + 1} / {totalSteps}
              </p>
            ) : null}
            <h2 id={titleId}>{activeStep.title}</h2>
          </div>
          <button className="c-tour__close" aria-label={closeButtonLabel} onClick={() => close("close-button")} type="button">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {activeStep.description ? (
          <div className="c-tour__description" id={descriptionId}>
            {activeStep.description}
          </div>
        ) : null}
        {targetState.offscreen ? (
          <p className="c-tour__fallback" role="status">
            Target is unavailable in this viewport, so this step is shown as a centered guide.
          </p>
        ) : null}
        <footer className="c-tour__footer">
          <button className="c-button c-button--soft c-button--sm" disabled={boundedCurrent === 0} onClick={goPrev} type="button">
            {activeStep.prevLabel ?? prevLabel}
          </button>
          <button className="c-button c-button--solid c-button--sm" onClick={goNext} ref={nextButtonRef} type="button">
            {isLastStep ? finishLabel : activeStep.nextLabel ?? nextLabel}
          </button>
        </footer>
      </section>
    </div>,
    portalContainer,
  );
}
