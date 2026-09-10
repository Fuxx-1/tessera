import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import { Button } from "../Button";
import "./style.css";

type PopconfirmTriggerElement = ReactElement<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>;
export type PopconfirmPlacement = "top" | "bottom" | "left" | "right";
export type PopconfirmCloseReason = "cancel" | "confirm" | "escape" | "outside";

const viewportPadding = 12;
const overlayGap = 8;
const mobileBreakpoint = 430;
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface PopconfirmProps extends Omit<HTMLAttributes<HTMLSpanElement>, "title" | "onConfirm"> {
  cancelText?: ReactNode;
  children: PopconfirmTriggerElement;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  confirmText?: ReactNode;
  defaultOpen?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onRequestClose?: (reason: PopconfirmCloseReason) => void;
  open?: boolean;
  placement?: PopconfirmPlacement;
  title: ReactNode;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("hidden") &&
      !element.hasAttribute("inert") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function getPanelStyle(triggerElement: HTMLElement, panelElement: HTMLElement, placement: PopconfirmPlacement): CSSProperties {
  const triggerRect = triggerElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  const maxLeft = window.innerWidth - panelRect.width - viewportPadding;
  const maxTop = window.innerHeight - panelRect.height - viewportPadding;

  if (window.innerWidth <= mobileBreakpoint) {
    return {
      left: viewportPadding,
      top: clamp(triggerRect.bottom + overlayGap, viewportPadding, maxTop),
      width: window.innerWidth - viewportPadding * 2,
    };
  }

  const centeredLeft = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
  const centeredTop = triggerRect.top + triggerRect.height / 2 - panelRect.height / 2;

  if (placement === "top") {
    return {
      left: clamp(centeredLeft, viewportPadding, maxLeft),
      top: clamp(triggerRect.top - panelRect.height - overlayGap, viewportPadding, maxTop),
    };
  }

  if (placement === "left") {
    return {
      left: clamp(triggerRect.left - panelRect.width - overlayGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    };
  }

  if (placement === "right") {
    return {
      left: clamp(triggerRect.right + overlayGap, viewportPadding, maxLeft),
      top: clamp(centeredTop, viewportPadding, maxTop),
    };
  }

  return {
    left: clamp(centeredLeft, viewportPadding, maxLeft),
    top: clamp(triggerRect.bottom + overlayGap, viewportPadding, maxTop),
  };
}

export function Popconfirm({
  cancelText = "Cancel",
  children,
  className,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  confirmText = "Confirm",
  defaultOpen,
  description,
  disabled = false,
  loading = false,
  onCancel,
  onConfirm,
  onOpenChange,
  onRequestClose,
  open,
  placement = "top",
  title,
  ...props
}: PopconfirmProps) {
  const panelId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const confirmLockRef = useRef(false);
  const mountedRef = useRef(true);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const busy = loading || asyncLoading;
  const renderedOpen = !disabled && currentOpen;
  const describedBy = useMemo(() => (description ? descriptionId : undefined), [description, descriptionId]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      confirmLockRef.current = false;
    };
  }, []);

  const close = useCallback(
    (reason: PopconfirmCloseReason) => {
      if (busyRef.current || confirmLockRef.current) {
        return;
      }
      setCurrentOpen(false);
      onRequestClose?.(reason);
    },
    [onRequestClose, setCurrentOpen],
  );

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current ?? rootRef.current?.firstElementChild;
    const panelElement = panelRef.current;
    if (!(triggerElement instanceof HTMLElement) || !panelElement) {
      return;
    }
    setPosition(getPanelStyle(triggerElement, panelElement, placement));
  }, [placement]);

  const openPanel = useCallback(() => {
    if (disabled) {
      return;
    }
    const activeElement = document.activeElement;
    previousFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body && activeElement !== document.documentElement
        ? activeElement
        : triggerRef.current;
    setCurrentOpen(true);
  }, [disabled, setCurrentOpen]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!closeOnOutsideClick || busyRef.current || confirmLockRef.current) {
        return;
      }
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        close("outside");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape && !busyRef.current && !confirmLockRef.current) {
        event.preventDefault();
        close("escape");
        return;
      }

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

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, closeOnEscape, closeOnOutsideClick, renderedOpen]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [renderedOpen, updatePosition]);

  useLayoutEffect(() => {
    if (!renderedOpen) {
      return;
    }

    const focusPanelAction = () => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusTarget = cancelButtonRef.current ?? getFocusableElements(panel)[0] ?? panel;
      focusTarget.focus({ preventScroll: true });
    };

    focusPanelAction();
    const animationFrame = window.requestAnimationFrame(focusPanelAction);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      const previouslyFocused = previousFocusRef.current;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [renderedOpen]);

  useEffect(() => {
    if (disabled && currentOpen) {
      setCurrentOpen(false);
    }
  }, [currentOpen, disabled, setCurrentOpen]);

  async function handleConfirm() {
    if (busyRef.current || confirmLockRef.current) {
      return;
    }

    confirmLockRef.current = true;
    try {
      const result = onConfirm?.();
      if (result && typeof result.then === "function") {
        setAsyncLoading(true);
        try {
          await result;
          if (mountedRef.current) {
            setCurrentOpen(false);
            onRequestClose?.("confirm");
          }
        } catch {
          return;
        } finally {
          if (mountedRef.current) {
            setAsyncLoading(false);
          }
        }
        return;
      }

      setCurrentOpen(false);
      onRequestClose?.("confirm");
    } finally {
      window.setTimeout(() => {
        if (mountedRef.current) {
          confirmLockRef.current = false;
        }
      }, 0);
    }
  }

  function handleCancel() {
    if (busyRef.current || confirmLockRef.current) {
      return;
    }
    onCancel?.();
    close("cancel");
  }

  const triggerElement = cloneElement(children, {
    "aria-controls": panelId,
    "aria-expanded": renderedOpen,
    "aria-haspopup": "dialog",
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (!event.defaultPrevented) {
        renderedOpen ? close("cancel") : openPanel();
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      children.props.onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPanel();
      }
    },
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = children.props.ref;
      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef && typeof childRef === "object") {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
  } as HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> });

  const panel = (
      <span
        aria-busy={busy || undefined}
        aria-describedby={describedBy}
        aria-labelledby={titleId}
        className={cx("c-popconfirm__panel", `c-popconfirm__panel--${placement}`)}
        hidden={!renderedOpen}
        id={panelId}
        ref={panelRef}
        role="dialog"
        style={position}
        tabIndex={-1}
      >
        <span aria-hidden="true" className="c-popconfirm__icon">
          !
        </span>
        <span className="c-popconfirm__body">
          <strong className="c-popconfirm__title" id={titleId}>
            {title}
          </strong>
          {description ? (
            <span className="c-popconfirm__description" id={descriptionId}>
              {description}
            </span>
          ) : null}
          <span className="c-popconfirm__actions">
            <Button disabled={busy} onClick={handleCancel} ref={cancelButtonRef} size="sm" variant="ghost">
              {cancelText}
            </Button>
            <Button aria-busy={busy || undefined} disabled={busy} onClick={handleConfirm} size="sm" variant="solid">
              {busy ? "Working..." : confirmText}
            </Button>
          </span>
        </span>
      </span>
  );

  return (
    <span className={cx("c-popconfirm", className)} ref={rootRef} {...props}>
      {triggerElement}
      {renderedOpen && typeof document !== "undefined" ? createPortal(panel, document.body) : panel}
    </span>
  );
}
