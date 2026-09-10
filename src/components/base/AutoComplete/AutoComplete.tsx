import {
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

const closeAllAutoCompletePanelsEvent = "tessera-autocomplete-close-all";
const defaultMaxFilterOptions = 1000;
const defaultMaxVisibleOptions = 80;

export interface AutoCompleteOption {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  searchText?: string;
  value: string;
}

export type AutoCompleteFilter = (inputValue: string, option: AutoCompleteOption) => boolean;
export type AutoCompleteSize = "sm" | "md";

export interface AutoCompleteProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "children"
    | "dangerouslySetInnerHTML"
    | "defaultValue"
    | "onChange"
    | "onSelect"
    | "onValueChange"
    | "size"
    | "value"
  > {
  dangerouslySetInnerHTML?: never;
  defaultOpen?: boolean;
  defaultValue?: string;
  emptyText?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
  filterOption?: boolean | AutoCompleteFilter;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  maxFilterOptions?: number;
  maxVisibleOptions?: number;
  mobileOverlay?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (value: string, option: AutoCompleteOption) => void;
  onValueChange?: (value: string) => void;
  open?: boolean;
  options: AutoCompleteOption[];
  size?: AutoCompleteSize;
  value?: string;
}

function isPrimitiveLabel(label: ReactNode): label is string | number {
  return typeof label === "string" || typeof label === "number";
}

function getOptionSearchText(option: AutoCompleteOption) {
  if (option.searchText !== undefined) {
    return option.searchText;
  }

  return isPrimitiveLabel(option.label) ? String(option.label) : option.value;
}

function getOptionDisplayText(option: AutoCompleteOption) {
  return isPrimitiveLabel(option.label) ? String(option.label) : option.value;
}

function getNextEnabledIndex(options: AutoCompleteOption[], startIndex: number, direction: 1 | -1) {
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

export function AutoComplete({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultOpen = false,
  defaultValue,
  disabled,
  emptyText = "No matches",
  error = false,
  errorText,
  filterOption = true,
  helpText,
  hint,
  id,
  label,
  loading = false,
  loadingText = "Loading suggestions",
  maxFilterOptions = defaultMaxFilterOptions,
  maxVisibleOptions = defaultMaxVisibleOptions,
  mobileOverlay = true,
  onBlur,
  onCompositionEnd,
  onCompositionStart,
  onFocus,
  onKeyDown,
  onOpenChange,
  onSelect,
  onValueChange,
  open,
  options,
  placeholder,
  readOnly,
  required,
  size = "md",
  value,
  ...props
}: AutoCompleteProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${inputId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const suppressFocusOpenRef = useRef(false);
  const [currentValue, setCurrentValue] = useControllableState({
    defaultValue,
    fallbackValue: "",
    onChange: onValueChange,
    value,
  });
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const [activeIndex, setActiveIndex] = useState(-1);
  const filterOptionLimit = Number.isFinite(maxFilterOptions)
    ? Math.max(1, Math.floor(maxFilterOptions))
    : defaultMaxFilterOptions;
  const visibleOptionLimit = Number.isFinite(maxVisibleOptions)
    ? Math.max(1, Math.floor(maxVisibleOptions))
    : defaultMaxVisibleOptions;

  const filteredOptions = useMemo(() => {
    const limitedOptions: AutoCompleteOption[] = [];
    const sourceOptions = options.slice(0, filterOptionLimit);
    const collect = (option: AutoCompleteOption) => {
      if (limitedOptions.length < visibleOptionLimit) {
        limitedOptions.push(option);
      }
    };

    if (filterOption === false) {
      for (const option of sourceOptions) {
        collect(option);
        if (limitedOptions.length >= visibleOptionLimit) {
          break;
        }
      }
      return limitedOptions;
    }

    if (typeof filterOption === "function") {
      for (const option of sourceOptions) {
        if (filterOption(currentValue, option)) {
          collect(option);
          if (limitedOptions.length >= visibleOptionLimit) {
            break;
          }
        }
      }
      return limitedOptions;
    }

    const normalizedInput = currentValue.trim().toLocaleLowerCase();
    if (!normalizedInput) {
      for (const option of sourceOptions) {
        collect(option);
        if (limitedOptions.length >= visibleOptionLimit) {
          break;
        }
      }
      return limitedOptions;
    }

    for (const option of sourceOptions) {
      if (getOptionSearchText(option).toLocaleLowerCase().includes(normalizedInput)) {
        collect(option);
        if (limitedOptions.length >= visibleOptionLimit) {
          break;
        }
      }
    }
    return limitedOptions;
  }, [currentValue, filterOption, filterOptionLimit, options, visibleOptionLimit]);

  const hasResults = filteredOptions.length > 0;
  const canOpen = !disabled && !readOnly && (loading || hasResults || Boolean(emptyText));
  const panelOpen = Boolean(isOpen && canOpen);
  const activeOption = activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;
  const activeDescendant = panelOpen && activeOption ? `${inputId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!panelOpen) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((previousIndex) => {
      if (previousIndex >= 0 && filteredOptions[previousIndex] && !filteredOptions[previousIndex].disabled) {
        return previousIndex;
      }

      return getNextEnabledIndex(filteredOptions, 0, 1);
    });
  }, [filteredOptions, panelOpen]);

  useEffect(() => {
    if (!panelOpen || typeof document === "undefined") {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [panelOpen, setIsOpen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const handleCloseAll = (event: Event) => {
      const sourceId = event instanceof CustomEvent ? event.detail?.sourceId : undefined;
      if (sourceId !== inputId) {
        setIsOpen(false);
      }
    };

    document.addEventListener(closeAllAutoCompletePanelsEvent, handleCloseAll);
    return () => document.removeEventListener(closeAllAutoCompletePanelsEvent, handleCloseAll);
  }, [inputId, setIsOpen]);

  useEffect(() => {
    if (!panelOpen || !activeDescendant || typeof document === "undefined") {
      return;
    }

    document.getElementById(activeDescendant)?.scrollIntoView({ block: "nearest" });
  }, [activeDescendant, panelOpen]);

  const closePeerPanels = useCallback(() => {
    document.dispatchEvent(new CustomEvent(closeAllAutoCompletePanelsEvent, { detail: { sourceId: inputId } }));
  }, [inputId]);

  const openPanel = useCallback(
    (source: "focus" | "input" | "manual" = "focus") => {
      if (source === "focus" && suppressFocusOpenRef.current) {
        return;
      }

      closePeerPanels();
      if (canOpen) {
        setIsOpen(true);
      }
    },
    [canOpen, closePeerPanels, setIsOpen],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return undefined;
    }

    const handleNativeFocus = () => openPanel("focus");
    const handleDocumentFocusIn = (event: Event) => {
      if (event.target === input) {
        openPanel("focus");
      }
    };

    input.addEventListener("focus", handleNativeFocus);
    input.addEventListener("focusin", handleNativeFocus);
    document.addEventListener("focusin", handleDocumentFocusIn, true);

    const nativeFocus = input.focus;
    input.focus = function focusAutoCompleteInput(options?: FocusOptions) {
      nativeFocus.call(input, options);
      window.queueMicrotask(() => {
        if (document.activeElement === input) {
          openPanel("focus");
        }
      });
    };

    return () => {
      input.removeEventListener("focus", handleNativeFocus);
      input.removeEventListener("focusin", handleNativeFocus);
      document.removeEventListener("focusin", handleDocumentFocusIn, true);
      if (input.focus !== nativeFocus) {
        input.focus = nativeFocus;
      }
    };
  }, [openPanel]);

  useEffect(() => {
    if (!mobileOverlay || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 430px)");
    const syncMobileOpen = () => {
      if (mediaQuery.matches && canOpen && document.activeElement === inputRef.current) {
        openPanel("manual");
      }
    };

    syncMobileOpen();
    mediaQuery.addEventListener("change", syncMobileOpen);
    return () => mediaQuery.removeEventListener("change", syncMobileOpen);
  }, [canOpen, mobileOverlay, openPanel]);

  const commitOption = (option: AutoCompleteOption) => {
    if (option.disabled) {
      return;
    }

    setCurrentValue(option.value);
    suppressFocusOpenRef.current = true;
    setIsOpen(false);
    closePeerPanels();
    onSelect?.(option.value, option);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    suppressFocusOpenRef.current = false;
    setCurrentValue(event.currentTarget.value);
    if (!disabled) {
      closePeerPanels();
      setIsOpen(true);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    openPanel("focus");
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) {
      return;
    }

    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        suppressFocusOpenRef.current = false;
        setIsOpen(false);
      }
    }, 0);
  };

  const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = true;
    onCompositionStart?.(event);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    onCompositionEnd?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!panelOpen) {
        openPanel("manual");
        return;
      }
      setActiveIndex((previousIndex) => getNextEnabledIndex(filteredOptions, previousIndex + 1, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!panelOpen) {
        openPanel("manual");
        return;
      }
      setActiveIndex((previousIndex) =>
        getNextEnabledIndex(filteredOptions, previousIndex < 0 ? filteredOptions.length - 1 : previousIndex - 1, -1),
      );
      return;
    }

    if (event.key === "Enter" && !composingRef.current && panelOpen) {
      const fallbackOption = filteredOptions[getNextEnabledIndex(filteredOptions, 0, 1)];
      const optionToCommit = activeOption && !activeOption.disabled ? activeOption : fallbackOption;

      if (optionToCommit && !optionToCommit.disabled) {
        event.preventDefault();
        commitOption(optionToCommit);
      }
      return;
    }

    if (event.key === "Escape" && panelOpen) {
      event.preventDefault();
      suppressFocusOpenRef.current = true;
      setIsOpen(false);
      document.dispatchEvent(new Event(closeAllAutoCompletePanelsEvent));
    }
  };

  const panel = (
    <div className={cx("c-autocomplete__panel", mobileOverlay && "c-autocomplete__panel--mobile")} role="presentation">
      {loading ? (
        <div className="c-autocomplete__status" role="status" aria-live="polite">
          <span className="c-autocomplete__spinner" aria-hidden="true" />
          <span>{loadingText}</span>
        </div>
      ) : hasResults ? (
        <div
          aria-label={typeof label === "string" ? `${label} suggestions` : "Suggestions"}
          className="c-autocomplete__list"
          id={listboxId}
          role="listbox"
        >
          {filteredOptions.map((option, index) => (
            <div
              aria-disabled={option.disabled || undefined}
              aria-label={option.searchText ?? getOptionDisplayText(option)}
              aria-selected={index === activeIndex}
              className={cx(
                "c-autocomplete__option",
                index === activeIndex && "c-autocomplete__option--active",
                option.disabled && "c-autocomplete__option--disabled",
              )}
              id={`${inputId}-option-${index}`}
              key={`${option.value}-${index}`}
              onClick={() => {
                if (!option.disabled) {
                  commitOption(option);
                }
              }}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => {
                if (!option.disabled) {
                  setActiveIndex(index);
                }
              }}
              role="option"
              tabIndex={-1}
            >
              <span className="c-autocomplete__option-label">{option.label}</span>
              {option.description ? (
                <span className="c-autocomplete__option-meta">{option.description}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="c-autocomplete__empty" role="status">
          {emptyText}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cx(
        "c-autocomplete-field",
        `c-autocomplete-field--${size}`,
        panelOpen && "c-autocomplete-field--open",
        invalid && "c-autocomplete-field--error",
        mobileOverlay && "c-autocomplete-field--mobile-overlay",
        className,
      )}
      ref={rootRef}
    >
      {label ? (
        <label className="c-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <span className="c-autocomplete-field__control">
        <input
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={panelOpen ? listboxId : undefined}
          aria-describedby={describedBy}
          aria-expanded={panelOpen}
          aria-haspopup="listbox"
          aria-invalid={invalid}
          autoComplete="off"
          className="c-autocomplete"
          disabled={disabled}
          id={inputId}
          onBlur={handleBlur}
          onChange={handleValueChange}
          onCompositionEnd={handleCompositionEnd}
          onCompositionStart={handleCompositionStart}
          onFocus={handleFocus}
          onFocusCapture={() => openPanel("focus")}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          ref={inputRef}
          required={required}
          role="combobox"
          value={currentValue}
          {...props}
        />
        <button
          aria-label={panelOpen ? "Close suggestions" : "Open suggestions"}
          className="c-autocomplete__trigger"
          disabled={disabled || readOnly}
          onClick={(event) => {
            event.preventDefault();
            if (panelOpen) {
              setIsOpen(false);
            } else {
              inputRef.current?.focus();
              openPanel("manual");
            }
          }}
          tabIndex={-1}
          type="button"
        />
        {panelOpen ? panel : null}
      </span>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}
