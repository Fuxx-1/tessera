import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import { useAppOverlayContainer } from "../App";
import "./style.css";

type PopoverTriggerElement = ReactElement<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>;
export type PopoverPlacement = "top" | "bottom" | "left" | "right";
export type PopoverTrigger = "click" | "hover" | "focus";
type PopoverPositionStyle = CSSProperties & {
  "--c-popover-arrow-left"?: string;
  "--c-popover-arrow-top"?: string;
};

const viewportPadding = 12;
const overlayGap = 8;
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "content" | "title"> {
  children: PopoverTriggerElement;
  closeOnEscape?: boolean;
  container?: HTMLElement | null;
  content: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  initialFocus?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  placement?: PopoverPlacement;
  title?: ReactNode;
  trigger?: PopoverTrigger | PopoverTrigger[];
}

function normalizeTriggers(trigger: PopoverProps["trigger"]): PopoverTrigger[] {
  return Array.isArray(trigger) ? trigger : [trigger ?? "click"];
}

function clamp(value: number, min: number, max: number) {
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

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("hidden") && element.offsetParent !== null,
  );
}

function getPopoverStyle(
  triggerElement: HTMLElement,
  panelElement: HTMLElement,
  placement: PopoverPlacement,
  portalContainer: HTMLElement | null,
): PopoverPositionStyle {
  const triggerRect = triggerElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  const portalGeometry = getPortalGeometry(portalContainer);
  const maxWidth = window.innerWidth - viewportPadding * 2;
  const maxHeight = window.innerHeight - viewportPadding * 2;
  const measuredWidth = Math.min(panelRect.width, maxWidth);
  const measuredHeight = Math.min(panelRect.height, maxHeight);
  const maxLeft = window.innerWidth - measuredWidth - viewportPadding;
  const maxTop = window.innerHeight - measuredHeight - viewportPadding;
  const centeredLeft = triggerRect.left + triggerRect.width / 2 - measuredWidth / 2;
  const centeredTop = triggerRect.top + triggerRect.height / 2 - panelRect.height / 2;
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;
  const arrowInset = 16;
  const withHorizontalArrow = (viewportLeft: number, viewportTop: number): PopoverPositionStyle => ({
    left: (viewportLeft - portalGeometry.left) / portalGeometry.scaleX,
    maxHeight,
    maxWidth,
    top: (viewportTop - portalGeometry.top) / portalGeometry.scaleY,
    "--c-popover-arrow-left": `${clamp(
      (triggerCenterX - viewportLeft) / portalGeometry.scaleX,
      arrowInset,
      measuredWidth / portalGeometry.scaleX - arrowInset,
    )}px`,
  });
  const withVerticalArrow = (viewportLeft: number, viewportTop: number): PopoverPositionStyle => ({
    left: (viewportLeft - portalGeometry.left) / portalGeometry.scaleX,
    maxHeight,
    maxWidth,
    top: (viewportTop - portalGeometry.top) / portalGeometry.scaleY,
    "--c-popover-arrow-top": `${clamp(
      (triggerCenterY - viewportTop) / portalGeometry.scaleY,
      arrowInset,
      measuredHeight / portalGeometry.scaleY - arrowInset,
    )}px`,
  });

  if (placement === "top") {
    return withHorizontalArrow(
      clamp(centeredLeft, viewportPadding, maxLeft),
      clamp(triggerRect.top - panelRect.height - overlayGap, viewportPadding, maxTop),
    );
  }

  if (placement === "left") {
    return withVerticalArrow(
      clamp(triggerRect.left - panelRect.width - overlayGap, viewportPadding, maxLeft),
      clamp(centeredTop, viewportPadding, maxTop),
    );
  }

  if (placement === "right") {
    return withVerticalArrow(
      clamp(triggerRect.right + overlayGap, viewportPadding, maxLeft),
      clamp(centeredTop, viewportPadding, maxTop),
    );
  }

  return withHorizontalArrow(
    clamp(centeredLeft, viewportPadding, maxLeft),
    clamp(triggerRect.bottom + overlayGap, viewportPadding, maxTop),
  );
}

export function Popover({
  children,
  className,
  closeOnEscape = true,
  container,
  content,
  defaultOpen,
  disabled = false,
  initialFocus = true,
  onOpenChange,
  open,
  placement = "bottom",
  title,
  trigger,
  ...props
}: PopoverProps) {
  const popoverId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const appOverlayContainer = useAppOverlayContainer();
  const resolvedPortalRoot = container ?? appOverlayContainer ?? portalRoot;
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const renderedOpen = !disabled && currentOpen;
  const triggers = normalizeTriggers(trigger);
  const hasClickTrigger = triggers.includes("click");
  const hasFocusTrigger = triggers.includes("focus");
  const hasHoverTrigger = triggers.includes("hover");

  const containsPopoverElement = useCallback((target: EventTarget | Node | null) => {
    if (!(target instanceof Node)) {
      return false;
    }
    return Boolean(rootRef.current?.contains(target) || panelRef.current?.contains(target));
  }, []);

  const restorePreviousFocus = useCallback(() => {
    const previouslyFocused = previouslyFocusedRef.current ?? triggerRef.current;
    if (previouslyFocused && document.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
    previouslyFocusedRef.current = null;
  }, []);

  const close = useCallback(() => {
    setCurrentOpen(false);
    window.requestAnimationFrame(restorePreviousFocus);
  }, [restorePreviousFocus, setCurrentOpen]);

  const openFromTrigger = useCallback(
    (triggerElement: HTMLElement) => {
      previouslyFocusedRef.current = triggerElement;
      setCurrentOpen(true);
    },
    [setCurrentOpen],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(close, 120);
  }, [clearCloseTimer, close]);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current ?? rootRef.current?.firstElementChild;
    const panelElement = panelRef.current;
    if (!(triggerElement instanceof HTMLElement) || !panelElement) {
      return;
    }
    setPosition(getPopoverStyle(triggerElement, panelElement, placement, resolvedPortalRoot));
  }, [placement, resolvedPortalRoot]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containsPopoverElement(event.target)) {
        close();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, closeOnEscape, containsPopoverElement, renderedOpen]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useLayoutEffect(() => {
    if (!renderedOpen || !resolvedPortalRoot) {
      if (!renderedOpen) {
        setPosition({});
      }
      return;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [renderedOpen, resolvedPortalRoot, updatePosition]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    if (!previouslyFocusedRef.current && document.activeElement instanceof HTMLElement) {
      previouslyFocusedRef.current = document.activeElement;
    }

    window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || !initialFocus) {
        return;
      }
      const focusTarget = getFocusableElements(panel)[0] ?? panel;
      focusTarget.focus();
    });

    function handleTab(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
    };
  }, [initialFocus, renderedOpen]);

  useEffect(() => {
    if (disabled && currentOpen) {
      setCurrentOpen(false);
    }
  }, [currentOpen, disabled, setCurrentOpen]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const triggerElement = cloneElement(children, {
    "aria-controls": popoverId,
    "aria-expanded": renderedOpen,
    "aria-haspopup": "dialog",
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(event);
      if (hasFocusTrigger && !containsPopoverElement(event.relatedTarget)) {
        scheduleClose();
      }
    },
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (hasClickTrigger && !event.defaultPrevented) {
        if (renderedOpen) {
          close();
        } else {
          openFromTrigger(event.currentTarget);
        }
      }
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(event);
      if (hasFocusTrigger) {
        clearCloseTimer();
        openFromTrigger(event.currentTarget);
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      children.props.onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFromTrigger(event.currentTarget);
      }
    },
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      if (hasHoverTrigger) {
        clearCloseTimer();
        openFromTrigger(event.currentTarget);
      }
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(event);
      if (hasHoverTrigger) {
        scheduleClose();
      }
    },
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = children.props.ref;
      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef && "current" in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
  } as HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> });

  const { onMouseEnter, onMouseLeave, ...rootProps } = props;
  const panel = resolvedPortalRoot
    ? createPortal(
        <div
          className={cx("c-popover__panel", `c-popover__panel--${placement}`)}
          id={popoverId}
          aria-labelledby={title ? titleId : undefined}
          onBlur={(event) => {
            if (hasFocusTrigger && !containsPopoverElement(event.relatedTarget)) {
              scheduleClose();
            }
          }}
          onMouseEnter={() => {
            if (hasHoverTrigger) {
              clearCloseTimer();
            }
          }}
          onMouseLeave={() => {
            if (hasHoverTrigger) {
              scheduleClose();
            }
          }}
          ref={panelRef}
          role="dialog"
          style={position}
          tabIndex={-1}
        >
          {title ? <strong id={titleId}>{title}</strong> : null}
          <div className="c-popover__body">{content}</div>
        </div>,
        resolvedPortalRoot,
      )
    : null;

  return (
    <div
      className={cx("c-popover", className)}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hasHoverTrigger) {
          clearCloseTimer();
        }
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        if (hasHoverTrigger) {
          scheduleClose();
        }
      }}
      ref={rootRef}
      {...rootProps}
    >
      {triggerElement}
      {renderedOpen ? panel : null}
    </div>
  );
}
