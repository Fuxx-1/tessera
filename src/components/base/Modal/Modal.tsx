import { useId, useMemo, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayDialog } from "../../../hooks/useOverlayDialog";
import { cx } from "../../../utils/cx";
import { useAppOverlayContainer } from "../App";
import "./style.css";

export type ModalCloseReason = "escape" | "backdrop" | "close-button";

export interface ModalProps {
  "aria-label"?: string;
  "aria-describedby"?: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  closeLabel?: string;
  confirmLoading?: boolean;
  container?: HTMLElement | null;
  dangerouslySetInnerHTML?: never;
  description?: ReactNode;
  destroyOnClose?: boolean;
  footer?: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  maskClosable?: boolean;
  onClose?: (reason: ModalCloseReason) => void;
  open: boolean;
  size?: "sm" | "md" | "lg";
  title?: ReactNode;
}

export function Modal({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  bodyClassName,
  children,
  className,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  closeLabel = "Close modal",
  confirmLoading = false,
  container,
  description,
  destroyOnClose = true,
  footer,
  initialFocusRef,
  maskClosable,
  onClose,
  open,
  size = "md",
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasTitle = title !== undefined && title !== null && title !== false && title !== "";
  const dialogLabel = ariaLabel ?? "Dialog";
  const describedBy = useMemo(() => {
    return [description ? descriptionId : undefined, ariaDescribedBy].filter(Boolean).join(" ") || undefined;
  }, [ariaDescribedBy, description, descriptionId]);
  const appOverlayContainer = useAppOverlayContainer();
  const portalContainer = container ?? appOverlayContainer ?? (typeof document === "undefined" ? null : document.body);
  const outsideCloseEnabled = maskClosable ?? closeOnOutsideClick;
  const dialogRef = useOverlayDialog({
    closeOnEscape: closeOnEscape && !confirmLoading,
    initialFocusRef: initialFocusRef ?? closeButtonRef,
    onRequestClose: () => onClose?.("escape"),
    open,
  });

  if (!portalContainer || (!open && destroyOnClose)) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (outsideCloseEnabled && !confirmLoading) {
      onClose?.("backdrop");
    }
  }

  return createPortal(
    <div className="c-overlay" hidden={!open} role="presentation">
      <button
        aria-label={closeLabel}
        aria-hidden={outsideCloseEnabled ? undefined : true}
        className="c-overlay__backdrop"
        disabled={confirmLoading || !outsideCloseEnabled}
        onClick={handleBackdropClick}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-busy={confirmLoading || undefined}
        aria-describedby={describedBy}
        aria-label={hasTitle ? undefined : dialogLabel}
        aria-labelledby={hasTitle ? titleId : undefined}
        aria-modal="true"
        className={cx("c-modal", `c-modal--${size}`, confirmLoading && "c-modal--loading", className)}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="c-modal__header">
          {hasTitle ? <h2 id={titleId}>{title}</h2> : <span />}
          <button
            aria-label={closeLabel}
            className="c-modal__close"
            disabled={confirmLoading}
            onClick={() => onClose?.("close-button")}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="c-modal__scroll">
          {description ? (
            <p className="c-modal__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
          <div className={cx("c-modal__body", bodyClassName)}>{children}</div>
        </div>
        {footer ? <footer className="c-modal__footer">{footer}</footer> : null}
      </section>
    </div>,
    portalContainer,
  );
}
