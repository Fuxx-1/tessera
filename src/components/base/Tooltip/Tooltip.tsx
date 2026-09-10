import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../../../utils/cx";
import { useAppOverlayContainer } from "../App";
import "./style.css";

type TooltipTriggerElement = ReactElement<HTMLAttributes<Element>>;
export type TooltipPlacement = "top" | "bottom" | "left" | "right";
export type TooltipTrigger = "hover" | "focus" | "click";
export type TooltipTone = "light" | "dark";

const viewportPadding = 12;
const overlayGap = 8;

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "content" | "dangerouslySetInnerHTML"> {
  children: TooltipTriggerElement;
  closeDelay?: number;
  container?: HTMLElement | null;
  content: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: TooltipPlacement;
  tone?: TooltipTone;
  trigger?: TooltipTrigger | TooltipTrigger[];
}

function normalizeTriggers(trigger: TooltipProps["trigger"]): TooltipTrigger[] {
  if (Array.isArray(trigger)) {
    return trigger;
  }

  return trigger === undefined ? ["hover", "focus"] : [trigger];
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getPortalGeometry(container: HTMLElement | null) {
  if (!container || container === document.body || container === document.documentElement) {
    return { left: 0, scaleX: 1, scaleY: 1, top: 0 };
  }

  const rect = container.getBoundingClientRect();
  return {
    left: rect.left,
    scaleX: rect.width > 0 && container.offsetWidth > 0 ? rect.width / container.offsetWidth : 1,
    scaleY: rect.height > 0 && container.offsetHeight > 0 ? rect.height / container.offsetHeight : 1,
    top: rect.top,
  };
}

function addArrowPosition(
  style: CSSProperties,
  triggerRect: DOMRect,
  bubbleRect: DOMRect,
  portalGeometry: { left: number; scaleX: number; scaleY: number; top: number },
): CSSProperties {
  const viewportLeft = typeof style.left === "number" ? style.left : 0;
  const viewportTop = typeof style.top === "number" ? style.top : 0;
  const left = (viewportLeft - portalGeometry.left) / portalGeometry.scaleX;
  const top = (viewportTop - portalGeometry.top) / portalGeometry.scaleY;
  const arrowLeft = clamp(
    (triggerRect.left + triggerRect.width / 2 - viewportLeft) / portalGeometry.scaleX,
    10,
    bubbleRect.width / portalGeometry.scaleX - 10,
  );
  const arrowTop = clamp(
    (triggerRect.top + triggerRect.height / 2 - viewportTop) / portalGeometry.scaleY,
    10,
    bubbleRect.height / portalGeometry.scaleY - 10,
  );

  return {
    ...style,
    left,
    top,
    ["--c-tooltip-arrow-left" as string]: `${arrowLeft}px`,
    ["--c-tooltip-arrow-top" as string]: `${arrowTop}px`,
  };
}

function getTooltipStyle(
  triggerElement: HTMLElement,
  bubbleElement: HTMLElement,
  placement: TooltipPlacement,
  portalContainer: HTMLElement | null,
): CSSProperties {
  const triggerRect = triggerElement.getBoundingClientRect();
  const bubbleRect = bubbleElement.getBoundingClientRect();
  const portalGeometry = getPortalGeometry(portalContainer);
  const maxLeft = window.innerWidth - bubbleRect.width - viewportPadding;
  const maxTop = window.innerHeight - bubbleRect.height - viewportPadding;
  const centeredLeft = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
  const centeredTop = triggerRect.top + triggerRect.height / 2 - bubbleRect.height / 2;

  if (placement === "bottom") {
    return addArrowPosition({
      left: clamp(centeredLeft, viewportPadding, maxLeft),
      top: clamp(triggerRect.bottom + overlayGap, viewportPadding, maxTop),
    }, triggerRect, bubbleRect, portalGeometry);
  }

  if (placement === "left") {
    return addArrowPosition({
      left: clamp(triggerRect.left - bubbleRect.width - overlayGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    }, triggerRect, bubbleRect, portalGeometry);
  }

  if (placement === "right") {
    return addArrowPosition({
      left: clamp(triggerRect.right + overlayGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    }, triggerRect, bubbleRect, portalGeometry);
  }

  return addArrowPosition({
    left: clamp(centeredLeft, viewportPadding, maxLeft),
    top: clamp(triggerRect.top - bubbleRect.height - overlayGap, viewportPadding, maxTop),
  }, triggerRect, bubbleRect, portalGeometry);
}

export function Tooltip({
  children,
  className,
  closeDelay = 80,
  container,
  content,
  defaultOpen = false,
  disabled = false,
  onOpenChange,
  open,
  placement = "top",
  tone = "light",
  trigger,
  ...props
}: TooltipProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [position, setPosition] = useState<CSSProperties>({});
  const appOverlayContainer = useAppOverlayContainer();
  const portalContainer = container ?? appOverlayContainer ?? (typeof document === "undefined" ? null : document.body);
  const currentOpen = !disabled && (open ?? uncontrolledOpen);
  const triggers = useMemo(() => normalizeTriggers(trigger), [trigger]);
  const hasHoverTrigger = triggers.includes("hover");
  const hasFocusTrigger = triggers.includes("focus");
  const hasClickTrigger = triggers.includes("click");
  const describedBy = [children.props["aria-describedby"], currentOpen ? tooltipId : undefined].filter(Boolean).join(" ");

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled) {
        nextOpen = false;
      }
      if (open === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [disabled, onOpenChange, open],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay);
  }, [clearCloseTimer, closeDelay, setOpen]);

  const updatePosition = useCallback(() => {
    const triggerElement = rootRef.current?.firstElementChild;
    const bubbleElement = bubbleRef.current;
    if (!(triggerElement instanceof HTMLElement) || !bubbleElement) {
      return;
    }
    setPosition(getTooltipStyle(triggerElement, bubbleElement, placement, portalContainer));
  }, [placement, portalContainer]);

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [currentOpen, setOpen]);

  useLayoutEffect(() => {
    if (!currentOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [currentOpen, updatePosition]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const triggerNode = cloneElement(children, {
    "aria-describedby": describedBy || undefined,
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(event);
      if (hasFocusTrigger) {
        setOpen(false);
      }
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (hasClickTrigger && !event.defaultPrevented) {
        setOpen(!currentOpen);
      }
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(event);
      if (hasFocusTrigger) {
        clearCloseTimer();
        setOpen(true);
      }
    },
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      if (hasHoverTrigger) {
        clearCloseTimer();
        setOpen(true);
      }
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(event);
      if (hasHoverTrigger) {
        scheduleClose();
      }
    },
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      children.props.onPointerDown?.(event);
      if (event.pointerType !== "mouse" && hasHoverTrigger && !hasClickTrigger) {
        setOpen(!currentOpen);
      }
    },
  });

  const bubbleNode = (
    <span
      className={cx("c-tooltip__bubble", `c-tooltip__bubble--${placement}`)}
      data-tone={tone}
      hidden={!currentOpen}
      id={tooltipId}
      ref={bubbleRef}
      role="tooltip"
      style={position}
    >
      {content}
    </span>
  );

  return (
    <span className={cx("c-tooltip", className)} ref={rootRef} {...props}>
      {triggerNode}
      {portalContainer ? createPortal(bubbleNode, portalContainer) : null}
    </span>
  );
}
