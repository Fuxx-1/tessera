import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface SelectOption {
  disabled?: boolean;
  label: ReactNode;
  searchText?: string;
  value: string;
}

export type SelectSize = "sm" | "md";
export type SelectMode = "single" | "multiple";
export type SelectValue = string | string[];
export type SelectFilter = (searchValue: string, option: SelectOption) => boolean;

export interface SelectChangeInfo {
  option?: SelectOption;
  selectedOptions: SelectOption[];
}

interface SelectBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange" | "onSelect"> {
  allowClear?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  emptyText?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
  filterOption?: boolean | SelectFilter;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  maxVisibleOptions?: number;
  name?: string;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (searchValue: string) => void;
  open?: boolean;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  showSearch?: boolean;
  size?: SelectSize;
}

export type SelectProps =
  | (SelectBaseProps & {
      defaultValue?: string;
      mode?: "single";
      onValueChange?: (value: string, info: SelectChangeInfo) => void;
      value?: string;
    })
  | (SelectBaseProps & {
      defaultValue?: string[];
      mode: "multiple";
      onValueChange?: (value: string[], info: SelectChangeInfo) => void;
      value?: string[];
    });

const closeAllSelectPanelsEvent = "tessera-select-close-all";

function isPrimitiveLabel(label: ReactNode): label is string | number {
  return typeof label === "string" || typeof label === "number";
}

function getOptionDisplayText(option: SelectOption) {
  return isPrimitiveLabel(option.label) ? String(option.label) : option.value;
}

function getOptionSearchText(option: SelectOption) {
  return option.searchText ?? getOptionDisplayText(option);
}

function normalizeValue(value: SelectValue | undefined, mode: SelectMode): SelectValue {
  if (mode === "multiple") {
    return Array.isArray(value) ? value : value ? [value] : [];
  }
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function valueToSet(value: SelectValue) {
  return new Set(Array.isArray(value) ? value : value ? [value] : []);
}

function getNextEnabledIndex(options: SelectOption[], startIndex: number, direction: 1 | -1) {
  if (options.length === 0) {
    return -1;
  }

  for (let step = 0; step < options.length; step += 1) {
    const index = (startIndex + step * direction + options.length) % options.length;
    if (!options[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function getSelectedOptions(options: SelectOption[], selectedValues: Set<string>) {
  return options.filter((option) => selectedValues.has(option.value));
}

function getSingleSummary(options: SelectOption[], value: SelectValue, placeholder?: string) {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  const selectedOption = selectedValue ? options.find((option) => option.value === selectedValue) : undefined;
  return selectedOption ? getOptionDisplayText(selectedOption) : (placeholder ?? "请选择");
}

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  allowClear = false,
  className,
  defaultOpen = false,
  defaultValue,
  disabled = false,
  emptyText = "没有匹配的选项",
  error = false,
  errorText,
  filterOption = true,
  helpText,
  hint,
  id,
  label,
  maxVisibleOptions = 80,
  mode = "single",
  name,
  onBlur,
  onFocus,
  onKeyDown,
  onOpenChange,
  onSearchChange,
  onValueChange,
  open,
  options,
  placeholder = "请选择",
  required,
  searchPlaceholder = "搜索选项",
  searchValue,
  showSearch = false,
  size = "md",
  value,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${fieldId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const shouldRefocusTriggerRef = useRef(false);
  const [currentValue, setCurrentValue] = useControllableState<SelectValue>({
    defaultValue: defaultValue === undefined ? undefined : normalizeValue(defaultValue, mode),
    fallbackValue: mode === "multiple" ? [] : "",
    value: value === undefined ? undefined : normalizeValue(value, mode),
  });
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const [currentSearch, setCurrentSearch] = useControllableState({
    defaultValue: "",
    fallbackValue: "",
    onChange: onSearchChange,
    value: searchValue,
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popupPlacement, setPopupPlacement] = useState<"bottom" | "top">("bottom");
  const [popupListMaxHeight, setPopupListMaxHeight] = useState<number | undefined>(undefined);
  const selectedValues = useMemo(() => valueToSet(currentValue), [currentValue]);
  const selectedOptions = useMemo(() => getSelectedOptions(options, selectedValues), [options, selectedValues]);
  const normalizedSearch = currentSearch.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(() => {
    if (!showSearch || filterOption === false) {
      return options;
    }

    if (typeof filterOption === "function") {
      return options.filter((option) => filterOption(currentSearch, option));
    }

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => getOptionSearchText(option).toLocaleLowerCase().includes(normalizedSearch));
  }, [currentSearch, filterOption, normalizedSearch, options, showSearch]);
  const visibleOptions = filteredOptions.slice(0, Math.max(1, maxVisibleOptions));
  const hasVirtualRemainder = filteredOptions.length > visibleOptions.length;
  const panelOpen = isOpen && !disabled;
  const activeOption = activeIndex >= 0 ? visibleOptions[activeIndex] : undefined;
  const activeDescendant = panelOpen && activeOption ? `${fieldId}-option-${activeIndex}` : undefined;
  const hasValue = selectedOptions.length > 0;
  const displayText =
    mode === "multiple"
      ? selectedOptions.length > 0
        ? `已选择 ${selectedOptions.length} 项`
        : placeholder
      : getSingleSummary(options, currentValue, placeholder);

  const emitValueChange = useCallback(
    (nextValue: SelectValue, option?: SelectOption) => {
      setCurrentValue(nextValue);
      const normalizedNextValue = normalizeValue(nextValue, mode);
      const changeInfo = {
        option,
        selectedOptions: getSelectedOptions(options, valueToSet(normalizedNextValue)),
      };

      if (mode === "multiple") {
        (onValueChange as ((value: string[], info: SelectChangeInfo) => void) | undefined)?.(
          Array.isArray(normalizedNextValue) ? normalizedNextValue : [],
          changeInfo,
        );
        return;
      }

      (onValueChange as ((value: string, info: SelectChangeInfo) => void) | undefined)?.(
        Array.isArray(normalizedNextValue) ? (normalizedNextValue[0] ?? "") : normalizedNextValue,
        changeInfo,
      );
    },
    [mode, onValueChange, options, setCurrentValue],
  );

  const closePeerPanels = useCallback(() => {
    document.dispatchEvent(new CustomEvent(closeAllSelectPanelsEvent, { detail: { sourceId: fieldId } }));
  }, [fieldId]);

  const openPanel = useCallback(() => {
    if (disabled) {
      return;
    }
    closePeerPanels();
    setIsOpen(true);
  }, [closePeerPanels, disabled, setIsOpen]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setCurrentSearch("");
  }, [setCurrentSearch, setIsOpen]);

  const measurePopup = useCallback(() => {
    if (!panelOpen || typeof window === "undefined") {
      setPopupPlacement("bottom");
      setPopupListMaxHeight(undefined);
      return;
    }

    if (window.matchMedia?.("(max-width: 760px)").matches) {
      setPopupPlacement("bottom");
      setPopupListMaxHeight(undefined);
      return;
    }

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      return;
    }

    const gap = 6;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap - viewportPadding;
    const spaceAbove = triggerRect.top - gap - viewportPadding;
    const popupHeight = popupRef.current?.getBoundingClientRect().height;
    const estimatedOptionRows = Math.max(1, Math.min(visibleOptions.length, 8));
    const estimatedPopupHeight = (showSearch ? 58 : 20) + estimatedOptionRows * 38;
    const requiredHeight = Math.min(320, Math.max(160, popupHeight || estimatedPopupHeight));
    const nextPlacement = spaceBelow < requiredHeight && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableSpace = Math.max(120, nextPlacement === "top" ? spaceAbove : spaceBelow);
    const chromeHeight = showSearch ? 58 : 20;

    setPopupPlacement(nextPlacement);
    setPopupListMaxHeight(Math.max(96, Math.min(280, Math.floor(availableSpace - chromeHeight))));
  }, [panelOpen, showSearch, visibleOptions.length]);

  useEffect(() => {
    if (!panelOpen) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((previousIndex) => {
      if (previousIndex >= 0 && visibleOptions[previousIndex] && !visibleOptions[previousIndex].disabled) {
        return previousIndex;
      }

      const selectedIndex = visibleOptions.findIndex((option) => selectedValues.has(option.value) && !option.disabled);
      return selectedIndex >= 0 ? selectedIndex : getNextEnabledIndex(visibleOptions, 0, 1);
    });
  }, [panelOpen, selectedValues, visibleOptions]);

  useEffect(() => {
    if (!panelOpen || typeof document === "undefined") {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePanel, panelOpen]);

  useEffect(() => {
    if (!panelOpen || typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", measurePopup);
    window.addEventListener("scroll", measurePopup, true);
    return () => {
      window.removeEventListener("resize", measurePopup);
      window.removeEventListener("scroll", measurePopup, true);
    };
  }, [measurePopup, panelOpen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const handleCloseAll = (event: Event) => {
      const sourceId = event instanceof CustomEvent ? event.detail?.sourceId : undefined;
      if (sourceId !== fieldId) {
        closePanel();
      }
    };

    document.addEventListener(closeAllSelectPanelsEvent, handleCloseAll);
    return () => document.removeEventListener(closeAllSelectPanelsEvent, handleCloseAll);
  }, [closePanel, fieldId]);

  useEffect(() => {
    if (!panelOpen || !activeDescendant || typeof document === "undefined") {
      return;
    }

    document.getElementById(activeDescendant)?.scrollIntoView({ block: "nearest" });
  }, [activeDescendant, panelOpen]);

  useLayoutEffect(() => {
    if (!panelOpen) {
      if (shouldRefocusTriggerRef.current) {
        shouldRefocusTriggerRef.current = false;
        triggerRef.current?.focus();
      }
      return;
    }

    measurePopup();

    if (showSearch) {
      searchRef.current?.focus();
    }
  }, [measurePopup, panelOpen, showSearch, visibleOptions.length]);

  const commitOption = (option: SelectOption) => {
    if (option.disabled) {
      return;
    }

    if (mode === "multiple") {
      const nextSelectedValues = new Set(selectedValues);
      if (nextSelectedValues.has(option.value)) {
        nextSelectedValues.delete(option.value);
      } else {
        nextSelectedValues.add(option.value);
      }
      emitValueChange(Array.from(nextSelectedValues), option);
      return;
    }

    emitValueChange(option.value, option);
    shouldRefocusTriggerRef.current = true;
    closePanel();
  };

  const clearValue = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    emitValueChange(mode === "multiple" ? [] : "");
    setCurrentSearch("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCurrentSearch(event.currentTarget.value);
  };

  const moveActive = (offset: number) => {
    if (visibleOptions.length === 0) {
      return;
    }

    setActiveIndex((previousIndex) => {
      const startIndex = previousIndex < 0 ? (offset > 0 ? 0 : visibleOptions.length - 1) : previousIndex + offset;
      return getNextEnabledIndex(visibleOptions, startIndex, offset > 0 ? 1 : -1);
    });
  };

  const handleKeyInteraction = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event as KeyboardEvent<HTMLDivElement>);
    if (event.defaultPrevented || disabled) {
      return;
    }

    if (!panelOpen && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openPanel();
      return;
    }

    if (event.key === "Escape" && panelOpen) {
      event.preventDefault();
      shouldRefocusTriggerRef.current = true;
      closePanel();
      return;
    }

    if (!panelOpen) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(getNextEnabledIndex(visibleOptions, 0, 1));
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(getNextEnabledIndex(visibleOptions, visibleOptions.length - 1, -1));
    } else if (event.key === "Enter" || (!showSearch && event.key === " ")) {
      event.preventDefault();
      if (activeOption && !activeOption.disabled) {
        commitOption(activeOption);
      }
    }
  };

  const handleRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) {
      return;
    }
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof Node && rootRef.current?.contains(activeElement)) {
        return;
      }
      closePanel();
    });
  };

  const hiddenValue = Array.isArray(currentValue) ? currentValue.join(",") : currentValue;

  return (
    <div
      className={cx(
        "c-select-field",
        `c-select-field--${size}`,
        mode === "multiple" && "c-select-field--multiple",
        panelOpen && "c-select-field--open",
        invalid && "c-select-field--error",
        disabled && "c-select-field--disabled",
        className,
      )}
      onBlur={handleRootBlur}
      onFocus={onFocus}
      ref={rootRef}
      {...props}
    >
      {label ? (
        <label className="c-field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      {name ? <input disabled={disabled} name={name} type="hidden" value={hiddenValue} /> : null}
      <div className="c-select-field__control">
        <button
          aria-activedescendant={activeDescendant}
          aria-controls={panelOpen ? listboxId : undefined}
          aria-describedby={describedBy}
          aria-expanded={panelOpen}
          aria-haspopup="listbox"
          aria-invalid={invalid}
          aria-required={required || undefined}
          className={cx("c-select", `c-select--${size}`, !hasValue && "c-select--placeholder")}
          disabled={disabled}
          id={fieldId}
          onClick={() => {
            if (panelOpen) {
              closePanel();
            } else {
              openPanel();
            }
          }}
          onKeyDown={handleKeyInteraction}
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          <span className="c-select__value">
            {mode === "multiple" && selectedOptions.length > 0 ? (
              <span className="c-select__tags">
                {selectedOptions.slice(0, 3).map((option) => (
                  <span className="c-select__tag" key={option.value}>
                    {option.label}
                  </span>
                ))}
                {selectedOptions.length > 3 ? <span className="c-select__tag">+{selectedOptions.length - 3}</span> : null}
              </span>
            ) : (
              displayText
            )}
          </span>
        </button>
        {allowClear && hasValue && !disabled ? (
          <button aria-label="清除选择" className="c-select__clear" onClick={clearValue} type="button" />
        ) : null}
        <button
          aria-label={panelOpen ? "收起选择器" : "展开选择器"}
          className="c-select__trigger"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (panelOpen) {
              closePanel();
            } else {
              triggerRef.current?.focus();
              openPanel();
            }
          }}
          tabIndex={-1}
          type="button"
        />
        {panelOpen ? (
          <div
            className={cx("c-select__popup", popupPlacement === "top" && "c-select__popup--top")}
            ref={popupRef}
            role="presentation"
            style={
              popupListMaxHeight
                ? ({ "--c-select-list-max-height": `${popupListMaxHeight}px` } as CSSProperties)
                : undefined
            }
          >
            {showSearch ? (
              <input
                aria-label="搜索选项"
                className="c-select__search"
                onChange={handleSearchChange}
                onKeyDown={handleKeyInteraction}
                placeholder={searchPlaceholder}
                ref={searchRef}
                type="search"
                value={currentSearch}
              />
            ) : null}
            <div
              aria-label={typeof label === "string" ? `${label} 候选项` : "选择器候选项"}
              aria-multiselectable={mode === "multiple" || undefined}
              className="c-select__list"
              id={listboxId}
              role="listbox"
            >
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option, index) => {
                  const selected = selectedValues.has(option.value);
                  return (
                    <div
                      aria-disabled={option.disabled || undefined}
                      aria-label={option.searchText ?? getOptionDisplayText(option)}
                      aria-selected={selected}
                      className={cx(
                        "c-select__option",
                        index === activeIndex && "c-select__option--active",
                        selected && "c-select__option--selected",
                        option.disabled && "c-select__option--disabled",
                      )}
                      id={`${fieldId}-option-${index}`}
                      key={option.value}
                      onClick={() => commitOption(option)}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setActiveIndex(index);
                        }
                      }}
                      role="option"
                      tabIndex={-1}
                    >
                      {mode === "multiple" ? (
                        <span aria-hidden="true" className={cx("c-select__check", selected && "c-select__check--checked")} />
                      ) : null}
                      <span className="c-select__option-label">{option.label}</span>
                    </div>
                  );
                })
              ) : (
                <div className="c-select__empty" role="status">
                  {emptyText}
                </div>
              )}
              {hasVirtualRemainder ? (
                <div className="c-select__virtual-note" role="status">
                  仅渲染前 {visibleOptions.length} 项，继续搜索可定位剩余 {filteredOptions.length - visibleOptions.length} 项。
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}
