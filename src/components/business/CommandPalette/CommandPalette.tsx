import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { Button } from "../../base";
import { useBodyScrollLock } from "../../../hooks/useOverlayDialog";
import { cx } from "../../../utils/cx";
import { clampRenderLimit, limitItems, UI_RENDER_BUDGETS } from "../../../utils/performance";
import "./CommandPalette.css";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: ReactNode;
  group?: string;
  shortcut?: string;
  disabled?: boolean;
  keywords?: string[];
  onSelect?: () => void;
}

export type CommandPaletteCloseReason = "escape" | "overlay" | "close-button" | "select";

export interface CommandPaletteProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  items: CommandPaletteItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason?: CommandPaletteCloseReason) => void;
  onSelect?: (item: CommandPaletteItem) => void;
  triggerLabel?: ReactNode;
  label?: string;
  placeholder?: string;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  maxVisibleItems?: number;
  clearOnClose?: boolean;
  enableGlobalShortcut?: boolean;
  showTrigger?: boolean;
}

export function CommandPalette({
  clearOnClose = true,
  className,
  defaultOpen = false,
  empty = "No commands found",
  enableGlobalShortcut = false,
  error,
  items,
  label = "Command palette",
  loading = false,
  maxVisibleItems = UI_RENDER_BUDGETS.commandPaletteItems,
  onOpenChange,
  onSelect,
  open,
  placeholder = "Type a command or search...",
  showTrigger = true,
  triggerLabel = "Command palette",
  ...props
}: CommandPaletteProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = open ?? localOpen;
  const wasOpenRef = useRef(isOpen);
  const reactId = useId();
  const paletteId = useMemo(() => `b-command-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`, [reactId]);
  const dialogTitleId = `${paletteId}-title`;
  const listboxId = `${paletteId}-listbox`;

  const matchedItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [item.label, item.group, item.shortcut, getSearchableText(item.description), ...(item.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query]);
  const visibleLimit = clampRenderLimit(maxVisibleItems, UI_RENDER_BUDGETS.commandPaletteItems);
  const visibleResult = useMemo(() => limitItems(matchedItems, visibleLimit), [matchedItems, visibleLimit]);
  const visibleItems = visibleResult.items;
  const hiddenItemCount = visibleResult.hiddenCount;

  const enabledItems = useMemo(() => visibleItems.filter((item) => !item.disabled), [visibleItems]);
  const activeItemId = enabledItems[activeIndex]?.id;
  const normalizedQuery = query.trim();
  useBodyScrollLock(isOpen);

  const setOpenState = useCallback((nextOpen: boolean, reason?: CommandPaletteCloseReason) => {
    if (nextOpen && typeof document !== "undefined") {
      const activeElement = document.activeElement;
      openerRef.current = getRestoreTarget(activeElement, triggerRef.current);
    }

    if (open === undefined) {
      setLocalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, reason);
  }, [onOpenChange, open]);

  const closePalette = useCallback((reason: CommandPaletteCloseReason) => {
    if (reason === "escape" || reason === "close-button" || reason === "select") {
      const restoreTarget = openerRef.current ?? triggerRef.current;
      restoreTarget?.focus({ preventScroll: true });
    }
    setOpenState(false, reason);
  }, [setOpenState]);

  function selectItem(item: CommandPaletteItem) {
    if (item.disabled) return;
    closePalette("select");
    item.onSelect?.();
    onSelect?.(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"].includes(event.key)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePalette("escape");
      return;
    }

    if (enabledItems.length === 0) {
      return;
    }

    event.preventDefault();

    if (event.key === "ArrowDown") {
      setActiveIndex((current) => (current + 1) % enabledItems.length);
    } else if (event.key === "ArrowUp") {
      setActiveIndex((current) => (current - 1 + enabledItems.length) % enabledItems.length);
    } else if (event.key === "Home") {
      setActiveIndex(0);
    } else if (event.key === "End") {
      setActiveIndex(enabledItems.length - 1);
    } else if (event.key === "Enter") {
      const item = enabledItems[activeIndex] ?? enabledItems[0];
      selectItem(item);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette("escape");
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useLayoutEffect(() => {
    if (!isOpen) return;
    if (!wasOpenRef.current && typeof document !== "undefined") {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && !dialogRef.current?.contains(activeElement)) {
        openerRef.current = getRestoreTarget(activeElement, triggerRef.current);
      }
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && wasOpenRef.current) {
      if (clearOnClose) {
        setQuery("");
        setActiveIndex(0);
      }
      const restoreTarget = openerRef.current ?? triggerRef.current;
      window.requestAnimationFrame(() => {
        restoreTarget?.focus({ preventScroll: true });
      });
      openerRef.current = null;
    }

    wasOpenRef.current = isOpen;
  }, [clearOnClose, isOpen]);

  useEffect(() => {
    if (!enableGlobalShortcut) return;

    function handleDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || event.altKey || event.shiftKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      event.preventDefault();
      setOpenState(true);
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [enableGlobalShortcut, setOpenState]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, items.length, maxVisibleItems]);

  useEffect(() => {
    if (activeIndex > 0 && activeIndex >= enabledItems.length) {
      setActiveIndex(Math.max(0, enabledItems.length - 1));
    }
  }, [activeIndex, enabledItems.length]);

  useEffect(() => {
    if (!isOpen || !activeItemId) return;

    const activeOption = dialogRef.current?.querySelector<HTMLElement>(`#${CSS.escape(getCommandOptionId(paletteId, activeItemId))}`);
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeItemId, isOpen, paletteId]);

  return (
    <section className={cx("b-command-palette", className)} {...props}>
      {showTrigger ? (
        <Button
          aria-controls={isOpen ? paletteId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setOpenState(true)}
          ref={triggerRef}
          variant="soft"
        >
          {triggerLabel}
        </Button>
      ) : null}

      {isOpen ? (
        <div className="b-command-palette__overlay" role="presentation" onMouseDown={() => closePalette("overlay")}>
          <div
            aria-busy={loading || undefined}
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="b-command-palette__dialog"
            id={paletteId}
            onKeyDown={handleDialogKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
            ref={dialogRef}
            role="dialog"
          >
            <header className="b-command-palette__search">
              <h2 className="b-command-palette__title" id={dialogTitleId}>{label}</h2>
              <input
                aria-activedescendant={enabledItems[activeIndex] ? getCommandOptionId(paletteId, enabledItems[activeIndex].id) : undefined}
                aria-controls={listboxId}
                aria-expanded="true"
                aria-label={`${label} search`}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                ref={inputRef}
                role="combobox"
                value={query}
              />
              <Button aria-label={`Close ${label}`} onClick={() => closePalette("close-button")} size="sm" variant="ghost">
                Esc
              </Button>
            </header>

            {loading ? (
              <div className="b-command-palette__state" role="status">Loading commands...</div>
            ) : error ? (
              <div className="b-business-state b-business-state--error" role="alert">{error}</div>
            ) : matchedItems.length === 0 ? (
              <div className="b-command-palette__state" role="status">{empty}</div>
            ) : (
              <>
                <ul className="b-command-palette__list" id={listboxId} role="listbox" aria-label="Commands">
                  {visibleItems.map((item, index) => {
                    const isActive = item.id === activeItemId && !item.disabled;
                    const previousItem = visibleItems[index - 1];
                    const showGroup = item.group && item.group !== previousItem?.group;

                    return (
                      <li key={item.id} role="presentation">
                        {showGroup ? <span className="b-command-palette__group">{item.group}</span> : null}
                        <button
                          aria-disabled={item.disabled}
                          aria-selected={isActive}
                          className={cx("b-command-palette__item", isActive && "b-command-palette__item--active")}
                          disabled={item.disabled}
                          id={getCommandOptionId(paletteId, item.id)}
                          onClick={() => selectItem(item)}
                          role="option"
                          tabIndex={-1}
                          type="button"
                        >
                          <span>
                            <strong>{renderHighlightedText(item.label, normalizedQuery)}</strong>
                            {item.description ? <small>{renderHighlightedText(item.description, normalizedQuery)}</small> : null}
                          </span>
                          {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {hiddenItemCount > 0 ? (
                  <div className="b-command-palette__overflow" role="status">
                    Showing first {visibleItems.length} of {matchedItems.length} commands. Refine search to narrow results.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getCommandOptionId(paletteId: string, itemId: string) {
  return `${paletteId}-${itemId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getSearchableText(value: ReactNode) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function renderHighlightedText(value: ReactNode, query: string) {
  if ((typeof value !== "string" && typeof value !== "number") || !query) {
    return value;
  }

  const text = String(value);
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery, cursor);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const end = matchIndex + query.length;
    parts.push(
      <mark className="b-command-palette__highlight" key={`${matchIndex}-${end}`}>
        {text.slice(matchIndex, end)}
      </mark>,
    );
    cursor = end;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

function getRestoreTarget(activeElement: Element | null, fallback: HTMLElement | null) {
  if (activeElement instanceof HTMLElement && !["BODY", "HTML"].includes(activeElement.tagName)) {
    return activeElement;
  }

  return fallback;
}

function getFocusableElements(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, a[href], [tabindex]',
    ),
  ).filter((element) => element.offsetParent !== null && !element.hasAttribute("disabled") && element.tabIndex >= 0);
}
