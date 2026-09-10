import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type TextareaAutoSizeConfig = {
  maxRows?: number;
  minRows?: number;
};

export type TextareaShowCountConfig = {
  formatter?: (info: { count: number; maxLength?: number; value: string }) => ReactNode;
};

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue" | "onChange" | "value"> {
  autoSize?: boolean | TextareaAutoSizeConfig;
  defaultValue?: string | number | readonly string[];
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  minRows?: number;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  resize?: Extract<CSSProperties["resize"], "none" | "both" | "horizontal" | "vertical">;
  showCount?: boolean | TextareaShowCountConfig;
  value?: string | number | readonly string[];
}

function isInvalidAriaValue(value: TextareaProps["aria-invalid"]) {
  return value === true || value === "true" || value === "grammar" || value === "spelling";
}

function toTextareaString(value: TextareaProps["value"] | TextareaProps["defaultValue"]) {
  if (value === undefined || value === null) {
    return "";
  }

  return Array.isArray(value) ? value.join("") : String(value);
}

function normalizeTextareaRows(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function getAutoSizeRows(autoSize: TextareaProps["autoSize"], minRows: number) {
  const normalizedMinRows = normalizeTextareaRows(minRows, 4);

  if (!autoSize || autoSize === true) {
    return { maxRows: undefined, minRows: normalizedMinRows };
  }

  const resolvedMinRows = normalizeTextareaRows(autoSize.minRows, normalizedMinRows);
  const resolvedMaxRows = normalizeTextareaRows(autoSize.maxRows, 0);

  return {
    maxRows: resolvedMaxRows > 0 ? Math.max(resolvedMinRows, resolvedMaxRows) : undefined,
    minRows: resolvedMinRows,
  };
}

function mergeDescribedBy(...ids: Array<string | undefined>) {
  const uniqueIds = ids.flatMap((id) => id?.split(/\s+/) ?? []).filter(Boolean);
  return Array.from(new Set(uniqueIds)).join(" ") || undefined;
}

export function Textarea({
  autoSize = false,
  className,
  defaultValue,
  disabled,
  error = false,
  errorText,
  helpText,
  hint,
  id,
  label,
  minRows = 4,
  onChange,
  readOnly,
  resize = "vertical",
  rows,
  showCount = false,
  style,
  value,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = id ?? props.name ?? generatedId;
  const isControlled = value !== undefined;
  const resolvedReadOnly = Boolean(readOnly || (isControlled && !onChange && !props.onInput));
  const [internalValue, setInternalValue] = useState(() => toTextareaString(defaultValue));
  const currentValue = isControlled ? toTextareaString(value) : internalValue;
  const hasInternalError = error || Boolean(errorText);
  const ariaInvalidValue = hasInternalError ? true : (ariaInvalid ?? undefined);
  const accessibleLabel = ariaLabel ?? (!label && props.name ? props.name : undefined);
  const invalid = hasInternalError || isInvalidAriaValue(ariaInvalid);
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${textareaId}-help` : undefined;
  const countId = showCount ? `${textareaId}-count` : undefined;
  const describedBy = mergeDescribedBy(ariaDescribedBy, helpId, countId);
  const autoSizeRows = getAutoSizeRows(autoSize, minRows);
  const resolvedRows = normalizeTextareaRows(rows, autoSizeRows.minRows);
  const valueCount = Array.from(currentValue).length;
  const countText =
    typeof showCount === "object" && showCount.formatter
      ? showCount.formatter({ count: valueCount, maxLength: props.maxLength, value: currentValue })
      : props.maxLength
        ? `${valueCount} / ${props.maxLength}`
        : `${valueCount}`;
  const hasFooter = Boolean(fieldHelp || showCount);

  useLayoutEffect(() => {
    if (!autoSize || !textareaRef.current || typeof window === "undefined") {
      return;
    }

    const textarea = textareaRef.current;
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);
    const borderHeight = Number.parseFloat(computedStyle.borderTopWidth) + Number.parseFloat(computedStyle.borderBottomWidth);
    const paddingHeight = Number.parseFloat(computedStyle.paddingTop) + Number.parseFloat(computedStyle.paddingBottom);
    const rowHeight = Number.isFinite(lineHeight) ? lineHeight : textarea.scrollHeight / Math.max(textarea.rows, 1);
    const maxRows = autoSizeRows.maxRows && autoSizeRows.maxRows > 0 ? autoSizeRows.maxRows : undefined;
    const maxHeight = maxRows ? rowHeight * maxRows + paddingHeight + borderHeight : Number.POSITIVE_INFINITY;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight + borderHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight + borderHeight > maxHeight ? "auto" : "hidden";
  }, [autoSize, autoSizeRows.maxRows, autoSizeRows.minRows, currentValue, resolvedRows]);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    if (!isControlled) {
      setInternalValue(event.currentTarget.value);
    }

    onChange?.(event);
  };

  return (
    <label
      className={cx(
        "c-field",
        "c-textarea-field",
        invalid && "c-textarea-field--error",
        disabled && "c-textarea-field--disabled",
        resolvedReadOnly && "c-textarea-field--readonly",
        autoSize && "c-textarea-field--autosize",
      )}
      htmlFor={textareaId}
    >
      {label ? <span className="c-field__label">{label}</span> : null}
      <textarea
        {...props}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalidValue}
        aria-label={accessibleLabel}
        className={cx("c-textarea", autoSize && "c-textarea--autosize", className)}
        disabled={disabled}
        id={textareaId}
        onChange={handleChange}
        readOnly={resolvedReadOnly}
        ref={textareaRef}
        rows={resolvedRows}
        style={{ ...style, resize: autoSize ? "none" : (style?.resize ?? resize) }}
        value={currentValue}
      />
      {hasFooter ? (
        <span className="c-textarea-field__footer">
          {fieldHelp ? (
            <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
              {fieldHelp}
            </span>
          ) : (
            <span />
          )}
          {showCount ? (
            <span className="c-textarea-field__count" id={countId}>
              {countText}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
