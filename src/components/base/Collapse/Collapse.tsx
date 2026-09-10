import { useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type CollapseMode = "single" | "multiple";
export type CollapseActiveKey = string | string[];

export interface CollapseItem {
  key: string;
  header: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  extra?: ReactNode;
}

export interface CollapseProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  activeKey?: CollapseActiveKey;
  className?: string;
  defaultActiveKey?: CollapseActiveKey;
  id?: string;
  items: CollapseItem[];
  mode?: CollapseMode;
  onActiveKeyChange?: (activeKey: CollapseActiveKey) => void;
}

function getSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function normalizeKeys(value: CollapseActiveKey | undefined, mode: CollapseMode) {
  const keys = Array.isArray(value) ? value : value ? [value] : [];
  return mode === "single" ? keys.slice(0, 1) : keys;
}

function formatKeys(keys: string[], mode: CollapseMode): CollapseActiveKey {
  return mode === "single" ? (keys[0] ?? "") : keys;
}

function getFallbackActiveKey(items: CollapseItem[], mode: CollapseMode) {
  const firstEnabled = items.find((item) => !item.disabled)?.key;
  return formatKeys(firstEnabled ? [firstEnabled] : [], mode);
}

function CollapsePanel({
  children,
  isOpen,
  panelId,
  triggerId,
}: {
  children: ReactNode;
  isOpen: boolean;
  panelId: string;
  triggerId: string;
}) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frameId = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    setIsVisible(false);
    if (!isMounted) {
      return;
    }

    const timeoutId = window.setTimeout(() => setIsMounted(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [isMounted, isOpen]);

  return (
    <div
      aria-hidden={!isOpen}
      aria-labelledby={triggerId}
      className={cx("c-collapse__panel", isVisible && "c-collapse__panel--open")}
      hidden={!isMounted}
      id={panelId}
      inert={!isOpen ? true : undefined}
      role="region"
    >
      <div className="c-collapse__body">{children}</div>
    </div>
  );
}

export function Collapse({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  activeKey,
  className,
  defaultActiveKey,
  id,
  items,
  mode = "multiple",
  onActiveKeyChange,
}: CollapseProps) {
  const reactId = useId();
  const collapseId = id ?? `collapse-${reactId.replace(/:/g, "")}`;
  const fallbackValue = useMemo(() => getFallbackActiveKey(items, mode), [items, mode]);
  const [currentValue, setCurrentValue] = useControllableState<CollapseActiveKey>({
    defaultValue: defaultActiveKey,
    fallbackValue,
    onChange: onActiveKeyChange,
    value: activeKey,
  });
  const activeKeys = useMemo(() => normalizeKeys(currentValue, mode), [currentValue, mode]);
  const enabledKeys = useMemo(() => items.filter((item) => !item.disabled).map((item) => item.key), [items]);

  useEffect(() => {
    if (activeKey !== undefined) {
      return;
    }

    const validKeys = activeKeys.filter((key) => items.some((item) => item.key === key && !item.disabled));
    if (validKeys.length !== activeKeys.length) {
      setCurrentValue(formatKeys(validKeys, mode));
    }
  }, [activeKey, activeKeys, items, mode, setCurrentValue]);

  function updateKeys(nextKeys: string[]) {
    setCurrentValue(formatKeys(nextKeys, mode));
  }

  function toggleItem(key: string) {
    const item = items.find((candidate) => candidate.key === key);
    if (!item || item.disabled) {
      return;
    }

    const isOpen = activeKeys.includes(key);
    if (mode === "single") {
      updateKeys(isOpen ? [] : [key]);
      return;
    }

    updateKeys(isOpen ? activeKeys.filter((active) => active !== key) : [...activeKeys, key]);
  }

  function focusButton(key: string) {
    document.getElementById(`${collapseId}-${getSafeId(key)}-trigger`)?.focus();
  }

  function focusByOffset(key: string, offset: number) {
    const currentIndex = enabledKeys.indexOf(key);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextKey = enabledKeys[(startIndex + offset + enabledKeys.length) % enabledKeys.length];
    if (nextKey) {
      focusButton(nextKey);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    if (enabledKeys.length <= 1) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusByOffset(key, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusByOffset(key, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusButton(enabledKeys[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusButton(enabledKeys[enabledKeys.length - 1]);
    }
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cx("c-collapse", mode === "single" && "c-collapse--single", className)}
      data-mode={mode}
    >
      {items.map((item) => {
        const safeId = getSafeId(item.key);
        const panelId = `${collapseId}-${safeId}-panel`;
        const triggerId = `${collapseId}-${safeId}-trigger`;
        const isOpen = activeKeys.includes(item.key) && !item.disabled;

        return (
          <section className={cx("c-collapse__item", isOpen && "c-collapse__item--open")} key={item.key}>
            <h3 className="c-collapse__heading">
              <button
                aria-controls={panelId}
                aria-disabled={item.disabled || undefined}
                aria-expanded={isOpen}
                className="c-collapse__trigger"
                disabled={item.disabled}
                id={triggerId}
                onClick={() => toggleItem(item.key)}
                onKeyDown={(event) => handleKeyDown(event, item.key)}
                type="button"
              >
                <span className="c-collapse__chevron" aria-hidden="true" />
                <span className="c-collapse__header">{item.header}</span>
                {item.extra ? <span className="c-collapse__extra">{item.extra}</span> : null}
              </button>
            </h3>
            <CollapsePanel isOpen={isOpen} panelId={panelId} triggerId={triggerId}>
              {item.children}
            </CollapsePanel>
          </section>
        );
      })}
    </div>
  );
}
