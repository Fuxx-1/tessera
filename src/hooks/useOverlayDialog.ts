import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "details > summary:first-of-type",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let overlayLockCount = 0;
let bodyOverflowBeforeLock = "";

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute("hidden") &&
      !element.hasAttribute("inert") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function focusDialogTarget(dialog: HTMLElement, initialFocusRef?: RefObject<HTMLElement | null>) {
  const focusTarget = initialFocusRef?.current ?? getFocusableElements(dialog)[0] ?? dialog;
  focusTarget.focus();
}

function acquireBodyScrollLock() {
  if (overlayLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
  }
  overlayLockCount += 1;
  document.body.style.overflow = "hidden";

  return () => {
    overlayLockCount = Math.max(0, overlayLockCount - 1);
    if (overlayLockCount === 0) {
      document.body.style.overflow = bodyOverflowBeforeLock;
    }
  };
}

export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    return acquireBodyScrollLock();
  }, [open]);
}

export function useOverlayDialog({
  closeOnEscape,
  initialFocusRef,
  onRequestClose,
  open,
}: {
  closeOnEscape: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onRequestClose?: () => void;
  open: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const initialFocusRefRef = useRef(initialFocusRef);
  const onRequestCloseRef = useRef(onRequestClose);

  useEffect(() => {
    closeOnEscapeRef.current = closeOnEscape;
    initialFocusRefRef.current = initialFocusRef;
    onRequestCloseRef.current = onRequestClose;
  }, [closeOnEscape, initialFocusRef, onRequestClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseBodyScrollLock = acquireBodyScrollLock();

    const dialog = dialogRef.current;
    if (dialog) {
      focusDialogTarget(dialog, initialFocusRefRef.current);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      focusDialogTarget(dialog, initialFocusRefRef.current);
    });

    function handleKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      if (event.key === "Escape" && closeOnEscapeRef.current) {
        event.preventDefault();
        onRequestCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      releaseBodyScrollLock();
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return dialogRef;
}
