import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export interface MentionOption {
  avatar?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
  description?: ReactNode;
}

export type MentionPlacement = "bottom" | "top";

export type MentionChangeInfo = {
  query: string;
  trigger: string;
};

export interface MentionsProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "children" | "defaultValue" | "onChange" | "onSelect" | "onValueChange" | "prefix" | "value"
  > {
  defaultValue?: string;
  emptyText?: ReactNode;
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  maxOptions?: number;
  minRows?: number;
  onSearch?: (query: string, trigger: string) => void;
  onSelect?: (option: MentionOption, info: MentionChangeInfo) => void;
  onValueChange?: (value: string) => void;
  options?: MentionOption[];
  placement?: MentionPlacement;
  prefix?: string | string[];
  resize?: Extract<CSSProperties["resize"], "none" | "both" | "horizontal" | "vertical">;
  split?: string;
  value?: string;
}

type MentionMatch = {
  end: number;
  query: string;
  start: number;
  trigger: string;
};

const mentionBoundaryPattern = /[\s([{,;:]/;
const DEFAULT_MAX_OPTIONS = 60;

function isInvalidAriaValue(value: MentionsProps["aria-invalid"]) {
  return value === true || value === "true" || value === "grammar" || value === "spelling";
}

function getTriggers(prefix: MentionsProps["prefix"]) {
  const prefixes = Array.isArray(prefix) ? prefix : [prefix ?? "@"];
  return Array.from(new Set(prefixes.filter((item): item is string => Boolean(item)))).sort((a, b) => b.length - a.length);
}

function findMentionMatch(value: string, caretIndex: number, triggers: string[]): MentionMatch | null {
  const beforeCaret = value.slice(0, caretIndex);
  let bestMatch: MentionMatch | null = null;

  for (const trigger of triggers) {
    const prefixIndex = beforeCaret.lastIndexOf(trigger);

    if (prefixIndex < 0) continue;
    if (prefixIndex > 0 && !mentionBoundaryPattern.test(beforeCaret[prefixIndex - 1])) continue;

    const query = beforeCaret.slice(prefixIndex + trigger.length);
    if (/[\r\n]/.test(query) || /\s/.test(query)) continue;
    if (!bestMatch || prefixIndex > bestMatch.start || (prefixIndex === bestMatch.start && trigger.length > bestMatch.trigger.length)) {
      bestMatch = {
        end: caretIndex,
        query,
        start: prefixIndex,
        trigger,
      };
    }
  }

  return bestMatch;
}

export function sanitizeMentionValue(value: string, prefix: string | string[] = "@") {
  const triggerPattern = getTriggers(prefix)
    .map((trigger) => trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const prefixPattern = triggerPattern ? new RegExp(`^(?:${triggerPattern})+`) : null;
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(prefixPattern ?? /^$/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_:.-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function Mentions({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultValue,
  disabled,
  emptyText = "No matches",
  error = false,
  errorText,
  helpText,
  hint,
  id,
  label,
  loading = false,
  loadingText = "Loading suggestions",
  maxOptions = DEFAULT_MAX_OPTIONS,
  minRows = 4,
  onBlur,
  onFocus,
  onKeyDown,
  onSearch,
  onSelect,
  onValueChange,
  options = [],
  placement = "bottom",
  prefix = "@",
  resize = "vertical",
  rows,
  split = " ",
  style,
  value,
  ...props
}: MentionsProps) {
  const generatedId = useId();
  const textareaId = id ?? props.name ?? generatedId;
  const listboxId = `${textareaId}-listbox`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentValue, setValue] = useControllableState({
    defaultValue,
    fallbackValue: "",
    onChange: onValueChange,
    value,
  });
  const [match, setMatch] = useState<MentionMatch | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const hasInternalError = error || Boolean(errorText);
  const ariaInvalidValue = hasInternalError ? true : ariaInvalid || undefined;
  const invalid = hasInternalError || isInvalidAriaValue(ariaInvalid);
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${textareaId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const triggers = useMemo(() => getTriggers(prefix), [prefix]);
  const optionBudget = Number.isFinite(maxOptions) ? Math.max(1, Math.floor(maxOptions)) : DEFAULT_MAX_OPTIONS;
  const filteredOptions = useMemo(() => {
    const budgetedOptions = options.slice(0, optionBudget);
    const query = match?.query.toLocaleLowerCase() ?? "";
    if (!query) return budgetedOptions;
    const keywords = query.split(/[-_.:]+/).filter(Boolean);

    return budgetedOptions.filter((option) => {
      const targetText = [
        option.value,
        typeof option.avatar === "string" ? option.avatar : "",
        typeof option.label === "string" ? option.label : "",
        typeof option.description === "string" ? option.description : "",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return keywords.every((keyword) => targetText.includes(keyword));
    });
  }, [match?.query, optionBudget, options]);
  const selectableOptions = filteredOptions.filter((option) => !option.disabled);
  const textareaActive = typeof document !== "undefined" && document.activeElement === textareaRef.current;
  const open = (focused || textareaActive) && Boolean(match) && !disabled;
  const showListbox = open && (loading || filteredOptions.length > 0 || !loading);
  const activeOption = filteredOptions[activeIndex];
  const activeOptionId = activeOption ? `${textareaId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [match?.query]);

  useEffect(() => {
    if (!activeOption || activeOption.disabled) {
      const nextIndex = filteredOptions.findIndex((option) => !option.disabled);
      setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
    }
  }, [activeOption, filteredOptions]);

  function syncMatch(nextValue: string, caretIndex: number) {
    const nextMatch = findMentionMatch(nextValue, caretIndex, triggers);
    setMatch(nextMatch);
    if (nextMatch) {
      onSearch?.(nextMatch.query, nextMatch.trigger);
    }
  }

  function syncFromTextarea(textarea: HTMLTextAreaElement) {
    if (document.activeElement === textarea) {
      setFocused(true);
    }
    syncMatch(textarea.value, textarea.selectionStart ?? textarea.value.length);
  }

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;

    const handleFocus = () => {
      setFocused(true);
      syncFromTextarea(textarea);
      window.requestAnimationFrame(() => {
        if (document.activeElement === textarea) {
          syncFromTextarea(textarea);
        }
      });
    };
    const handleCursorChange = () => {
      if (document.activeElement === textarea) {
        syncFromTextarea(textarea);
      }
    };

    textarea.addEventListener("focus", handleFocus);
    textarea.addEventListener("click", handleCursorChange);
    textarea.addEventListener("input", handleCursorChange);
    textarea.addEventListener("select", handleCursorChange);

    return () => {
      textarea.removeEventListener("focus", handleFocus);
      textarea.removeEventListener("click", handleCursorChange);
      textarea.removeEventListener("input", handleCursorChange);
      textarea.removeEventListener("select", handleCursorChange);
    };
  });

  function insertOption(option: MentionOption) {
    if (!match || option.disabled) return;

    const sanitized = sanitizeMentionValue(option.value, triggers);
    if (!sanitized) return;

    const mentionText = `${match.trigger}${sanitized}${split}`;
    const nextValue = `${currentValue.slice(0, match.start)}${mentionText}${currentValue.slice(match.end)}`;
    const nextCaret = match.start + mentionText.length;
    setValue(nextValue);
    setMatch(null);
    onSelect?.(option, { query: match.query, trigger: match.trigger });

    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function moveActive(delta: number) {
    if (selectableOptions.length === 0) return;
    const currentOption = filteredOptions[activeIndex];
    const currentSelectableIndex = selectableOptions.findIndex((option) => option === currentOption);
    const safeIndex = currentSelectableIndex < 0 ? 0 : currentSelectableIndex;
    const nextSelectable = selectableOptions[(safeIndex + delta + selectableOptions.length) % selectableOptions.length];
    const nextIndex = filteredOptions.findIndex((option) => option === nextSelectable);
    setActiveIndex(nextIndex);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter" || event.key === "Tab") {
      if (activeOption && !activeOption.disabled) {
        event.preventDefault();
        insertOption(activeOption);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMatch(null);
    }
  }

  return (
    <div className={cx("c-field", "c-mentions-field", invalid && "c-mentions-field--error")}>
      {label ? (
        <label className="c-field__label" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <span className={cx("c-mentions", `c-mentions--${placement}`, className)}>
        <textarea
          aria-activedescendant={open && activeOptionId ? activeOptionId : undefined}
          aria-autocomplete="list"
          aria-controls={showListbox ? listboxId : undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-invalid={ariaInvalidValue}
          aria-haspopup="listbox"
          className="c-mentions__textarea"
          disabled={disabled}
          id={textareaId}
          onBlur={(event) => {
            onBlur?.(event);
            window.setTimeout(() => {
              if (document.activeElement?.closest(".c-mentions") !== event.currentTarget.closest(".c-mentions")) {
                setFocused(false);
                setMatch(null);
              }
            }, 0);
          }}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setValue(nextValue);
            syncMatch(nextValue, event.currentTarget.selectionStart ?? nextValue.length);
          }}
          onClick={(event) => {
            syncFromTextarea(event.currentTarget);
          }}
          onFocus={(event) => {
            onFocus?.(event);
            setFocused(true);
            syncFromTextarea(event.currentTarget);
            window.requestAnimationFrame(() => {
              if (document.activeElement === event.currentTarget) {
                syncFromTextarea(event.currentTarget);
              }
            });
          }}
          onKeyDown={handleKeyDown}
          onSelect={(event) => {
            syncFromTextarea(event.currentTarget);
          }}
          ref={textareaRef}
          rows={rows ?? minRows}
          style={{ resize, ...style }}
          value={currentValue}
          {...props}
        />
        {showListbox ? (
          <span className="c-mentions__popup" role="presentation">
            {loading ? (
              <span className="c-mentions__state" role="status">
                <span className="c-mentions__spinner" aria-hidden="true" />
                {loadingText}
              </span>
            ) : filteredOptions.length > 0 ? (
              <span className="c-mentions__list" id={listboxId} role="listbox" aria-label="Mention suggestions">
                {filteredOptions.map((option, index) => (
                  <button
                    aria-disabled={option.disabled || undefined}
                    aria-selected={index === activeIndex}
                    className={cx(
                      "c-mentions__option",
                      index === activeIndex && "c-mentions__option--active",
                      option.disabled && "c-mentions__option--disabled",
                      option.avatar && "c-mentions__option--with-avatar",
                    )}
                    disabled={option.disabled}
                    id={`${textareaId}-option-${index}`}
                    key={`${option.value}-${index}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertOption(option)}
                    role="option"
                    type="button"
                  >
                    {option.avatar ? (
                      <span className="c-mentions__option-avatar" aria-hidden="true">
                        {option.avatar}
                      </span>
                    ) : null}
                    <span className="c-mentions__option-content">
                      <span className="c-mentions__option-label">{option.label}</span>
                      {option.description ? <span className="c-mentions__option-description">{option.description}</span> : null}
                    </span>
                  </button>
                ))}
              </span>
            ) : (
              <span className="c-mentions__state">{emptyText}</span>
            )}
          </span>
        ) : null}
      </span>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}
