import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

type DropdownTriggerElement = ReactElement<HTMLAttributes<HTMLElement> & { disabled?: boolean; ref?: Ref<HTMLElement> }>;

export type DropdownPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";
export type DropdownTrigger = "click" | "hover";

export type DropdownItem = {
  danger?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  key: string;
  label: ReactNode;
  onSelect?: (key: string) => void;
};

export type DropdownSeparator = {
  key: string;
  type: "separator";
};

export type DropdownMenuItem = DropdownItem | DropdownSeparator;

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  children: DropdownTriggerElement;
  closeOnEscape?: boolean;
  closeOnSelect?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  items: DropdownMenuItem[];
  menuLabel?: string;
  minMenuWidth?: number;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (key: string, item: DropdownItem) => void;
  open?: boolean;
  placement?: DropdownPlacement;
  trigger?: DropdownTrigger | DropdownTrigger[];
}

const viewportPadding = 12;
const overlayGap = 6;

function isActionItem(item: DropdownMenuItem): item is DropdownItem {
  return !("type" in item);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFixedGeometry(panelElement: HTMLElement) {
  const panelRect = panelElement.getBoundingClientRect();
  const currentLeft = Number.parseFloat(panelElement.style.left || "0") || 0;
  const currentTop = Number.parseFloat(panelElement.style.top || "0") || 0;
  const scaleX = panelRect.width > 0 && panelElement.offsetWidth > 0 ? panelRect.width / panelElement.offsetWidth : 1;
  const scaleY = panelRect.height > 0 && panelElement.offsetHeight > 0 ? panelRect.height / panelElement.offsetHeight : 1;

  return {
    originLeft: panelRect.left - currentLeft * scaleX,
    originTop: panelRect.top - currentTop * scaleY,
    scaleX,
    scaleY,
  };
}

function getEnabledItemIndexes(items: DropdownMenuItem[]) {
  return items.reduce<number[]>((indexes, item, index) => {
    if (isActionItem(item) && !item.disabled) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function normalizeTriggers(trigger: DropdownProps["trigger"]): DropdownTrigger[] {
  return Array.isArray(trigger) ? trigger : [trigger ?? "click"];
}

function getNextEnabledIndex(items: DropdownMenuItem[], currentIndex: number, direction: 1 | -1) {
  const enabledIndexes = getEnabledItemIndexes(items);
  if (enabledIndexes.length === 0) {
    return -1;
  }

  const currentEnabledIndex = enabledIndexes.indexOf(currentIndex);
  if (currentEnabledIndex === -1) {
    return direction === 1 ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
  }

  const nextEnabledIndex = (currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length;
  return enabledIndexes[nextEnabledIndex];
}

function getDropdownStyle(
  triggerElement: HTMLElement,
  panelElement: HTMLElement,
  placement: DropdownPlacement,
  minMenuWidth: number,
): CSSProperties {
  const triggerRect = triggerElement.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  const fixedGeometry = getFixedGeometry(panelElement);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const mobile = viewportWidth <= 430;
  const maxWidth = viewportWidth - viewportPadding * 2;
  const maxHeight = viewportHeight - viewportPadding * 2;
  const measuredWidth = Math.max(panelRect.width, Math.min(minMenuWidth, maxWidth), Math.min(triggerRect.width, maxWidth));
  const measuredHeight = Math.min(panelRect.height, maxHeight);
  const width = mobile ? maxWidth : measuredWidth;
  const maxLeft = viewportWidth - width - viewportPadding;
  const maxTop = viewportHeight - measuredHeight - viewportPadding;
  const alignedEndLeft = triggerRect.right - width;
  const alignedStartLeft = triggerRect.left;
  const preferTop = placement.startsWith("top");
  const alignEnd = placement.endsWith("end");
  const belowTop = triggerRect.bottom + overlayGap;
  const aboveTop = triggerRect.top - measuredHeight - overlayGap;
  const enoughBelow = belowTop + measuredHeight <= viewportHeight - viewportPadding;
  const enoughAbove = aboveTop >= viewportPadding;
  const top = preferTop ? (enoughAbove ? aboveTop : belowTop) : !enoughBelow && enoughAbove ? aboveTop : belowTop;
  const viewportLeft = clamp(mobile ? viewportPadding : alignEnd ? alignedEndLeft : alignedStartLeft, viewportPadding, maxLeft);
  const viewportTop = clamp(top, viewportPadding, Math.max(viewportPadding, maxTop));

  return {
    left: (viewportLeft - fixedGeometry.originLeft) / fixedGeometry.scaleX,
    maxHeight: maxHeight / fixedGeometry.scaleY,
    width: width / fixedGeometry.scaleX,
    top: (viewportTop - fixedGeometry.originTop) / fixedGeometry.scaleY,
  };
}

function isNodeInside(node: EventTarget | null, ...containers: Array<HTMLElement | null>) {
  return node instanceof Node && containers.some((container) => container?.contains(node));
}

export function Dropdown({
  children,
  className,
  closeOnEscape = true,
  closeOnSelect = true,
  defaultOpen,
  disabled = false,
  items,
  menuLabel = "Actions",
  minMenuWidth = 180,
  onOpenChange,
  onSelect,
  open,
  placement = "bottom-start",
  trigger = "click",
  ...props
}: DropdownProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialFocusIndexRef = useRef<number | null>(null);
  const skipOpenFocusRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const [activeIndex, setActiveIndex] = useState(() => getEnabledItemIndexes(items)[0] ?? -1);
  const childDisabled = Boolean(children.props.disabled);
  const triggerDisabled = disabled || childDisabled;
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const renderedOpen = !triggerDisabled && currentOpen;
  const triggers = normalizeTriggers(trigger);
  const hasClickTrigger = triggers.includes("click");
  const hasHoverTrigger = triggers.includes("hover");

  const close = useCallback(() => setCurrentOpen(false), [setCurrentOpen]);
  const openMenu = useCallback(() => {
    if (!triggerDisabled) {
      skipOpenFocusRef.current = false;
      setCurrentOpen(true);
    }
  }, [setCurrentOpen, triggerDisabled]);

  const openMenuWithoutFocus = useCallback(() => {
    if (!triggerDisabled) {
      skipOpenFocusRef.current = true;
      setCurrentOpen(true);
    }
  }, [setCurrentOpen, triggerDisabled]);

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
    setPosition(getDropdownStyle(triggerElement, panelElement, placement, minMenuWidth));
  }, [minMenuWidth, placement]);

  const focusItem = useCallback(
    (index: number) => {
      if (index < 0) {
        return;
      }
      setActiveIndex(index);
      window.requestAnimationFrame(() => itemRefs.current[index]?.focus());
    },
    [setActiveIndex],
  );

  const openAndFocusItem = useCallback(
    (index: number) => {
      initialFocusIndexRef.current = index;
      openMenu();
      window.requestAnimationFrame(() => {
        updatePosition();
        focusItem(index);
      });
    },
    [focusItem, openMenu, updatePosition],
  );

  const selectItem = useCallback(
    (item: DropdownItem) => {
      if (item.disabled) {
        return;
      }
      item.onSelect?.(item.key);
      onSelect?.(item.key, item);
      if (closeOnSelect) {
        close();
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    },
    [close, closeOnSelect, onSelect],
  );

  useEffect(() => {
    if (!renderedOpen) {
      setPosition({});
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!isNodeInside(event.target, rootRef.current, panelRef.current)) {
        close();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        close();
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, closeOnEscape, renderedOpen]);

  useEffect(() => {
    if (!renderedOpen) {
      return;
    }

    const firstEnabledIndex = getEnabledItemIndexes(items)[0] ?? -1;
    const focusIndex = initialFocusIndexRef.current ?? firstEnabledIndex;
    initialFocusIndexRef.current = null;
    setActiveIndex(focusIndex);
    updatePosition();
    window.requestAnimationFrame(() => {
      updatePosition();
      if (skipOpenFocusRef.current) {
        skipOpenFocusRef.current = false;
      } else if (focusIndex >= 0) {
        itemRefs.current[focusIndex]?.focus();
      } else {
        panelRef.current?.focus();
      }
    });

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [items, renderedOpen, updatePosition]);

  useLayoutEffect(() => {
    if (!renderedOpen) {
      return;
    }

    if (skipOpenFocusRef.current) {
      updatePosition();
      const frame = window.requestAnimationFrame(updatePosition);
      return () => window.cancelAnimationFrame(frame);
    }

    const firstEnabledIndex = getEnabledItemIndexes(items)[0] ?? -1;
    const focusIndex = initialFocusIndexRef.current ?? (activeIndex >= 0 ? activeIndex : firstEnabledIndex);
    updatePosition();
    if (focusIndex >= 0) {
      setActiveIndex(focusIndex);
      itemRefs.current[focusIndex]?.focus();
    } else {
      panelRef.current?.focus();
    }
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      if (focusIndex >= 0) {
        itemRefs.current[focusIndex]?.focus();
      } else {
        panelRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, items, renderedOpen, updatePosition]);

  useEffect(() => {
    if (triggerDisabled && currentOpen) {
      setCurrentOpen(false);
    }
  }, [currentOpen, setCurrentOpen, triggerDisabled]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const triggerElement = cloneElement(children, {
    "aria-controls": menuId,
    "aria-disabled": triggerDisabled || undefined,
    "aria-expanded": renderedOpen,
    "aria-haspopup": "menu",
    disabled: triggerDisabled,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      if (skipNextClickRef.current) {
        skipNextClickRef.current = false;
        return;
      }
      // 键盘激活（Enter/Space）会在按钮上合成一个 detail=0 的 click；开合已由 onKeyDown
      // 处理，这里必须忽略，否则 keydown 打开后立刻被该 click 再次切换关掉（键盘打不开）。
      if (event.detail === 0) {
        return;
      }
      if (hasClickTrigger && !event.defaultPrevented && !triggerDisabled) {
        setCurrentOpen(!renderedOpen);
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      children.props.onKeyDown?.(event);
      if (event.defaultPrevented || triggerDisabled) {
        return;
      }
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAndFocusItem(getEnabledItemIndexes(items)[0] ?? -1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openAndFocusItem(getNextEnabledIndex(items, -1, -1));
      }
    },
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      children.props.onPointerDown?.(event);
      if (
        hasClickTrigger &&
        event.button === 0 &&
        !event.defaultPrevented &&
        !triggerDisabled
      ) {
        event.preventDefault();
        skipNextClickRef.current = true;
        setCurrentOpen(!renderedOpen);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    },
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      if (hasHoverTrigger && !triggerDisabled) {
        clearCloseTimer();
        openMenuWithoutFocus();
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

  const { onBlur, onMouseEnter, onMouseLeave, ...rootProps } = props;

  return (
    <div
      className={cx("c-dropdown", className)}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (hasHoverTrigger && !triggerDisabled) {
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
      onBlur={(event) => {
        onBlur?.(event);
        const nextFocusedElement = event.relatedTarget;
        if (
          renderedOpen &&
          !isNodeInside(nextFocusedElement, event.currentTarget, panelRef.current)
        ) {
          close();
        }
      }}
    >
      {triggerElement}
      <div
        aria-label={menuLabel}
        className={cx("c-dropdown__menu", `c-dropdown__menu--${placement}`)}
        data-placement={placement}
        hidden={!renderedOpen}
        id={menuId}
        onBlur={(event) => {
          const nextFocusedElement = event.relatedTarget;
          if (renderedOpen && !isNodeInside(nextFocusedElement, rootRef.current, event.currentTarget)) {
            close();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            focusItem(getNextEnabledIndex(items, activeIndex, 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            focusItem(getNextEnabledIndex(items, activeIndex, -1));
          } else if (event.key === "Home") {
            event.preventDefault();
            focusItem(getEnabledItemIndexes(items)[0] ?? -1);
          } else if (event.key === "End") {
            event.preventDefault();
            const enabledIndexes = getEnabledItemIndexes(items);
            focusItem(enabledIndexes[enabledIndexes.length - 1] ?? -1);
          } else if (event.key === "Tab") {
            close();
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
        role="menu"
        style={position}
        tabIndex={-1}
      >
        {items.map((item, index) => {
          if (!isActionItem(item)) {
            return <div className="c-dropdown__separator" key={item.key} role="separator" />;
          }

          return (
            <button
              aria-disabled={item.disabled || undefined}
              className={cx(
                "c-dropdown__item",
                item.danger && "c-dropdown__item--danger",
                index === activeIndex && "c-dropdown__item--active",
              )}
              disabled={item.disabled}
              key={item.key}
              onClick={() => selectItem(item)}
              onFocus={() => setActiveIndex(index)}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
            >
              <span className="c-dropdown__item-label">{item.label}</span>
              {item.description ? <span className="c-dropdown__item-description">{item.description}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
