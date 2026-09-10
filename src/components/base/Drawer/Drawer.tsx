import { useId, useMemo, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayDialog } from "../../../hooks/useOverlayDialog";
import { cx } from "../../../utils/cx";
import { useAppOverlayContainer } from "../App";
import "./style.css";

export type DrawerCloseReason = "escape" | "backdrop" | "close-button";

export interface DrawerProps {
  "aria-label"?: string;
  "aria-describedby"?: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  closeLabel?: string;
  container?: HTMLElement | null;
  dangerouslySetInnerHTML?: never;
  description?: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  onClose?: (reason: DrawerCloseReason) => void;
  open: boolean;
  placement?: "bottom" | "left" | "right" | "top";
  size?: "sm" | "md" | "lg";
  title?: ReactNode;
}

export function Drawer({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  bodyClassName,
  children,
  className,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  closeLabel = "Close drawer",
  container,
  description,
  footer,
  initialFocusRef,
  onClose,
  open,
  placement = "right",
  size = "md",
  title,
}: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasTitle = title !== undefined && title !== null && title !== false && title !== "";
  const dialogLabel = ariaLabel ?? "Drawer";
  const describedBy = useMemo(() => {
    return [description ? descriptionId : undefined, ariaDescribedBy].filter(Boolean).join(" ") || undefined;
  }, [ariaDescribedBy, description, descriptionId]);
  const appOverlayContainer = useAppOverlayContainer();
  const portalContainer = container ?? appOverlayContainer ?? (typeof document === "undefined" ? null : document.body);
  const dialogRef = useOverlayDialog({
    closeOnEscape,
    initialFocusRef: initialFocusRef ?? closeButtonRef,
    onRequestClose: () => onClose?.("escape"),
    open,
  });

  if (!open || !portalContainer) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (closeOnOutsideClick) {
      onClose?.("backdrop");
    }
  }

  return createPortal(
    <div className="c-overlay" role="presentation">
      <div
        aria-hidden="true"
        className="c-overlay__backdrop"
        onClick={handleBackdropClick}
      />
      <section
        aria-describedby={describedBy}
        aria-label={hasTitle ? undefined : dialogLabel}
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-modal="true"
        className={cx(
          "c-drawer",
          `c-drawer--${placement}`,
          `c-drawer--${size}`,
          description && "c-drawer--with-description",
          className,
        )}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="c-drawer__header">
          {hasTitle ? <h2 id={titleId}>{title}</h2> : <span />}
          <button
            aria-label={closeLabel}
            className="c-drawer__close"
            onClick={() => onClose?.("close-button")}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {description ? (
          <div className="c-drawer__description" id={descriptionId}>
            {description}
          </div>
        ) : null}
        <div className={cx("c-drawer__body", bodyClassName)}>{children}</div>
        {footer ? <footer className="c-drawer__footer">{footer}</footer> : null}
      </section>
    </div>,
    portalContainer,
  );
}
