import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import "./style.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function getFirstEnabledId(items: TabItem[]) {
  return items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? "";
}

function getSafeId(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "tab";
}

export function Tabs({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  id,
  items,
  value,
  defaultValue,
  onValueChange,
}: TabsProps) {
  const reactId = useId();
  const tabsId = id ?? `tabs-${reactId.replace(/:/g, "")}`;
  const fallback = getFirstEnabledId(items);
  const isControlled = value !== undefined;
  const [uncontrolledActive, setUncontrolledActive] = useState(defaultValue ?? fallback);
  const active = isControlled ? value : uncontrolledActive;
  const activeItem = useMemo(
    () => items.find((item) => item.id === active && !item.disabled) ?? items.find((item) => !item.disabled) ?? items[0],
    [active, items],
  );
  const activeId = activeItem?.id ?? "";
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const itemDomIds = useMemo(() => items.map((item, index) => `${getSafeId(item.id)}-${index}`), [items]);

  useEffect(() => {
    if (isControlled || !fallback) {
      return;
    }

    const hasCurrent = items.some((item) => item.id === uncontrolledActive && !item.disabled);
    if (!hasCurrent) {
      setUncontrolledActive(fallback);
    }
  }, [fallback, isControlled, items, uncontrolledActive]);

  function selectTab(value: string) {
    if (!enabledItems.some((item) => item.id === value)) {
      return;
    }

    if (value === activeId) {
      return;
    }

    if (!isControlled) {
      setUncontrolledActive(value);
    }

    onValueChange?.(value);
  }

  function focusTab(value: string) {
    const tab = tabRefs.current[value];

    tab?.focus();
    tab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function selectByOffset(offset: number) {
    const currentIndex = enabledItems.findIndex((item) => item.id === activeId);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (startIndex + offset + enabledItems.length) % enabledItems.length;
    const nextId = enabledItems[nextIndex]?.id;

    if (nextId) {
      selectTab(nextId);
      focusTab(nextId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (enabledItems.length <= 1) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectByOffset(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectByOffset(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const firstId = enabledItems[0]?.id;
      if (firstId) {
        selectTab(firstId);
        focusTab(firstId);
      }
    } else if (event.key === "End") {
      event.preventDefault();
      const lastId = enabledItems[enabledItems.length - 1]?.id;
      if (lastId) {
        selectTab(lastId);
        focusTab(lastId);
      }
    }
  }

  return (
    <div className="c-tabs">
      <div aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} className="c-tabs__list" role="tablist">
        {items.map((item, index) => {
          const domId = itemDomIds[index] ?? `${getSafeId(item.id)}-${index}`;

          return (
            <button
              aria-controls={`${tabsId}-${domId}-panel`}
              aria-disabled={item.disabled || undefined}
              aria-selected={item.id === activeId}
              className="c-tabs__tab"
              disabled={item.disabled}
              id={`${tabsId}-${domId}-tab`}
              key={`${item.id}-${index}`}
              onKeyDown={handleKeyDown}
              onClick={() => selectTab(item.id)}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              role="tab"
              tabIndex={item.id === activeId ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => {
        const isActive = item.id === activeId;
        const safeId = itemDomIds[index] ?? `${getSafeId(item.id)}-${index}`;

        return (
          <div
            aria-labelledby={`${tabsId}-${safeId}-tab`}
            className="c-tabs__panel"
            hidden={!isActive}
            id={`${tabsId}-${safeId}-panel`}
            key={`${item.id}-${index}`}
            role="tabpanel"
            tabIndex={isActive ? 0 : -1}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
