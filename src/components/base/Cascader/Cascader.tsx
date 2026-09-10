import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type CascaderPath = string[];
export type CascaderSize = "sm" | "md";

export interface CascaderOption {
  children?: CascaderOption[];
  disabled?: boolean;
  label: ReactNode;
  searchLabel?: string;
  value: string;
}

export interface CascaderProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "defaultValue" | "onChange" | "value"> {
  allowClear?: boolean;
  defaultValue?: CascaderPath;
  emptyText?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  maxSearchResults?: number;
  onValueChange?: (value: CascaderPath, selectedOptions: CascaderOption[]) => void;
  options: CascaderOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  size?: CascaderSize;
  value?: CascaderPath;
}

type SearchResult = {
  key: string;
  labels: string[];
  options: CascaderOption[];
  value: CascaderPath;
};

const SEARCH_NODE_BUDGET = 2000;

function samePath(first: CascaderPath, second: CascaderPath) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function getOptionText(option: CascaderOption) {
  return typeof option.label === "string" || typeof option.label === "number" ? String(option.label) : option.value;
}

function getSearchText(option: CascaderOption) {
  if (option.searchLabel) {
    return option.searchLabel;
  }
  return getOptionText(option);
}

function getPathLabels(options: CascaderOption[]) {
  return options.map(getOptionText);
}

function pathKey(path: CascaderPath) {
  return path.join("__");
}

function findOptionPath(options: CascaderOption[], value: CascaderPath) {
  const path: CascaderOption[] = [];
  let level = options;

  for (const segment of value) {
    const option = level.find((item) => item.value === segment);
    if (!option) {
      return [];
    }
    path.push(option);
    level = option.children ?? [];
  }

  return path;
}

function getPanels(options: CascaderOption[], activePath: CascaderPath) {
  const panels: CascaderOption[][] = [options];
  let level = options;

  for (const segment of activePath) {
    const option = level.find((item) => item.value === segment);
    if (!option?.children?.length) {
      break;
    }
    panels.push(option.children);
    level = option.children;
  }

  return panels;
}

function collectSearchResults(
  options: CascaderOption[],
  query: string,
  maxResults: number,
  path: CascaderPath = [],
  optionPath: CascaderOption[] = [],
  ancestorDisabled = false,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];
  const stack = options
    .slice()
    .reverse()
    .map((option) => ({
      disabledPath: ancestorDisabled,
      option,
      selectedOptions: optionPath,
      valuePath: path,
    }));
  let visited = 0;

  while (stack.length > 0 && results.length < maxResults && visited < SEARCH_NODE_BUDGET) {
    const { disabledPath, option, selectedOptions, valuePath } = stack.pop()!;
    visited += 1;

    const nextValuePath = [...valuePath, option.value];
    const nextOptions = [...selectedOptions, option];
    const nextDisabledPath = disabledPath || Boolean(option.disabled);
    const labels = getPathLabels(nextOptions);
    const searchableText = nextOptions.map(getSearchText).join(" / ").toLowerCase();
    const children = option.children ?? [];
    const isLeaf = children.length === 0;

    if (!nextDisabledPath && isLeaf && searchableText.includes(normalizedQuery)) {
      results.push({
        key: nextValuePath.join("__"),
        labels,
        options: nextOptions,
        value: nextValuePath,
      });
    }

    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({
        disabledPath: nextDisabledPath,
        option: children[index],
        selectedOptions: nextOptions,
        valuePath: nextValuePath,
      });
    }
  }

  return results;
}

function moveIndex(options: CascaderOption[], currentIndex: number, direction: 1 | -1) {
  if (options.length === 0) {
    return -1;
  }

  let nextIndex = currentIndex;
  for (let step = 0; step < options.length; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length;
    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function Cascader({
  allowClear = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultValue,
  disabled = false,
  emptyText = "No results",
  error = false,
  errorText,
  helpText,
  hint,
  id,
  label,
  maxSearchResults = 8,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
  onValueChange,
  options,
  placeholder = "Select path",
  searchPlaceholder = "Search path",
  showSearch = false,
  size = "md",
  value,
  ...props
}: CascaderProps) {
  const generatedId = useId();
  const cascaderId = id ?? props.name ?? generatedId;
  const helpId = errorText ?? helpText ?? hint ? `${cascaderId}-help` : undefined;
  const panelId = `${cascaderId}-panel`;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0, triggerWidth: 0 });
  const [query, setQuery] = useState("");
  const [activePath, setActivePath] = useState<CascaderPath>(defaultValue ?? value ?? []);
  const [focusedColumn, setFocusedColumn] = useState(0);
  const [currentValue, setCurrentValue] = useControllableState<CascaderPath>({
    defaultValue,
    fallbackValue: [],
    onChange: (nextValue) => {
      onValueChange?.(nextValue, findOptionPath(options, nextValue));
    },
    value,
  });
  const selectedOptions = useMemo(() => findOptionPath(options, currentValue), [currentValue, options]);
  const selectedLabel = selectedOptions.length > 0 ? getPathLabels(selectedOptions).join(" / ") : "";
  const panels = useMemo(() => getPanels(options, activePath), [activePath, options]);
  const searchResults = useMemo(
    () => (showSearch && query.trim() ? collectSearchResults(options, query, maxSearchResults) : []),
    [maxSearchResults, options, query, showSearch],
  );
  const fieldHelp = errorText ?? helpText ?? hint;
  const popupStyle = {
    "--c-cascader-popup-left": `${popupPosition.left}px`,
    "--c-cascader-popup-top": `${popupPosition.top}px`,
    "--c-cascader-trigger-width": `${popupPosition.triggerWidth}px`,
  } as CSSProperties;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }, []);

  const commitPath = useCallback(
    (nextPath: CascaderPath) => {
      setCurrentValue(nextPath);
      setActivePath(nextPath);
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
    },
    [setCurrentValue],
  );

  const clearValue = useCallback(() => {
    setCurrentValue([]);
    setActivePath([]);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }, [setCurrentValue]);

  const chooseOption = useCallback(
    (option: CascaderOption, columnIndex: number) => {
      if (option.disabled) {
        return;
      }
      const nextPath = [...activePath.slice(0, columnIndex), option.value];
      setActivePath(nextPath);
      setFocusedColumn(columnIndex);

      if (!option.children?.length) {
        commitPath(nextPath);
      }
    },
    [activePath, commitPath],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        close();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [close, open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePopupPosition() {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const gutter = 16;
      const popupWidth = Math.min(popupRect.width || triggerRect.width, Math.max(viewportWidth - gutter * 2, 0));
      const maxLeft = Math.max(gutter, viewportWidth - popupWidth - gutter);
      const left = Math.min(Math.max(triggerRect.left, gutter), maxLeft);
      const belowTop = triggerRect.bottom + 6;
      const aboveTop = Math.max(gutter, triggerRect.top - popupRect.height - 6);
      const top = belowTop + popupRect.height <= viewportHeight - gutter || belowTop <= triggerRect.top ? belowTop : aboveTop;

      setPopupPosition({
        left: Math.round(left),
        top: Math.round(top),
        triggerWidth: Math.round(triggerRect.width),
      });
    }

    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open, panels.length, query]);

  useEffect(() => {
    if (!open) {
      setActivePath(currentValue);
      return;
    }

    if (showSearch) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
      return;
    }

    setFocusedColumn(0);
    setActivePath((currentPath) => {
      if (currentPath.length > 0) {
        return currentPath;
      }
      const firstEnabledOption = options.find((option) => !option.disabled);
      return firstEnabledOption ? [firstEnabledOption.value] : [];
    });
    window.requestAnimationFrame(() => popupRef.current?.focus());
  }, [currentValue, open, options, showSearch]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  function handleCascaderNavigation(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (showSearch && query.trim()) {
      return;
    }

    const currentPanel = panels[focusedColumn] ?? panels[0] ?? [];
    const currentValueAtColumn = activePath[focusedColumn];
    const currentIndex = currentPanel.findIndex((option) => option.value === currentValueAtColumn);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = moveIndex(currentPanel, currentIndex, event.key === "ArrowDown" ? 1 : -1);
      const nextOption = currentPanel[nextIndex];
      if (nextOption) {
        setActivePath([...activePath.slice(0, focusedColumn), nextOption.value]);
      }
      return;
    }

    if (event.key === "ArrowRight" || event.key === "Enter") {
      const option = currentPanel.find((item) => item.value === activePath[focusedColumn]);
      if (option && !option.disabled) {
        event.preventDefault();
        if (option.children?.length) {
          const firstEnabledChild = option.children.find((item) => !item.disabled);
          if (firstEnabledChild) {
            setActivePath([...activePath.slice(0, focusedColumn + 1), firstEnabledChild.value]);
          }
          setFocusedColumn(Math.min(focusedColumn + 1, panels.length));
        } else {
          commitPath(activePath.slice(0, focusedColumn + 1));
        }
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setFocusedColumn(Math.max(0, focusedColumn - 1));
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (open) {
      handleCascaderNavigation(event);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    handleCascaderNavigation(event);
  }

  return (
    <div className={cx("c-cascader-field", invalid && "c-cascader-field--error", className)} ref={rootRef}>
      {label ? (
        <label className="c-field__label" htmlFor={cascaderId}>
          {label}
        </label>
      ) : null}
      <div className="c-cascader__control">
        <button
          aria-controls={panelId}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={invalid}
          className={cx(
            "c-cascader__trigger",
            `c-cascader__trigger--${size}`,
            allowClear && selectedLabel && "c-cascader__trigger--clearable",
          )}
          disabled={disabled}
          id={cascaderId}
          onBlur={onBlur}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) {
              setOpen((currentOpen) => !currentOpen);
            }
          }}
          onFocus={onFocus}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
          {...props}
        >
          <span className={cx("c-cascader__value", !selectedLabel && "c-cascader__value--placeholder")}>
            {selectedLabel || placeholder}
          </span>
          <span className="c-cascader__chevron" aria-hidden="true" />
        </button>
        {allowClear && selectedLabel && !disabled ? (
          <button
            aria-label="Clear cascader value"
            className="c-cascader__clear"
            onClick={clearValue}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          />
        ) : null}
      </div>
      {open ? (
        <div
          aria-label={label ? undefined : "Cascader options"}
          aria-labelledby={label ? cascaderId : undefined}
          className="c-cascader__popup"
          id={panelId}
          onKeyDown={handlePanelKeyDown}
          ref={popupRef}
          role="dialog"
          style={popupStyle}
          tabIndex={-1}
        >
          {showSearch ? (
            <input
              aria-label="Search cascader options"
              className="c-cascader__search"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              ref={searchRef}
              value={query}
            />
          ) : null}

          {showSearch && query.trim() ? (
            <div className="c-cascader__search-results" role="listbox" aria-label="Search results">
              {searchResults.length > 0 ? (
                searchResults.map((result, resultIndex) => (
                  <button
                    className="c-cascader__search-option"
                    data-path={result.value.join("/")}
                    key={result.key}
                    onClick={() => commitPath(result.value)}
                    role="option"
                    aria-selected={samePath(currentValue, result.value)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        const nextIndex =
                          (resultIndex + (event.key === "ArrowDown" ? 1 : -1) + searchResults.length) %
                          searchResults.length;
                        const nextButton = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          ".c-cascader__search-option",
                        )[nextIndex];
                        nextButton?.focus();
                      }
                    }}
                    type="button"
                  >
                    {result.labels.map((item, index) => (
                      <span key={`${result.key}-${item}`}>
                        {index > 0 ? <span className="c-cascader__path-separator">/</span> : null}
                        {item}
                      </span>
                    ))}
                  </button>
                ))
              ) : (
                <div className="c-cascader__empty">{emptyText}</div>
              )}
            </div>
          ) : (
            <div className="c-cascader__menus">
              {panels.map((panel, columnIndex) => (
                <div
                  aria-label={`Level ${columnIndex + 1}`}
                  className="c-cascader__menu"
                  key={`panel-${columnIndex}`}
                  role="listbox"
                >
                  {panel.map((option) => {
                    const optionPath = [...activePath.slice(0, columnIndex), option.value];
                    const selected = samePath(currentValue, optionPath);
                    const active = activePath[columnIndex] === option.value;
                    return (
                      <button
                        aria-disabled={option.disabled || undefined}
                        aria-selected={selected || active}
                        className={cx(
                          "c-cascader__option",
                          active && "c-cascader__option--active",
                          selected && "c-cascader__option--selected",
                        )}
                        data-path={optionPath.join("/")}
                        disabled={option.disabled}
                        id={`${panelId}-option-${columnIndex}-${pathKey(optionPath)}`}
                        key={option.value}
                        onClick={() => chooseOption(option, columnIndex)}
                        onFocus={() => setFocusedColumn(columnIndex)}
                        role="option"
                        type="button"
                      >
                        <span>{option.label}</span>
                        {option.children?.length ? <span className="c-cascader__option-arrow" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}
