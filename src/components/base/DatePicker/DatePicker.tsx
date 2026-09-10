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
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type DatePickerValue = string;

export type DatePickerChangeInfo = {
  date: Date | null;
  source: "select" | "clear";
};

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "max" | "min" | "onChange" | "readOnly" | "type" | "value"> {
  defaultOpen?: boolean;
  defaultPickerDate?: DatePickerValue | Date;
  defaultValue?: DatePickerValue;
  disabledDate?: (date: Date) => boolean;
  error?: boolean;
  errorText?: ReactNode;
  helpText?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
  locale?: string;
  max?: DatePickerValue | Date;
  min?: DatePickerValue | Date;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: DatePickerValue, info: DatePickerChangeInfo) => void;
  open?: boolean;
  placeholder?: string;
  value?: DatePickerValue;
}

type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

type DatePickerPanelStyle = CSSProperties & {
  "--c-date-picker-panel-left"?: string;
  "--c-date-picker-panel-width"?: string;
};

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? "default"}:${JSON.stringify(options)}`;
  const cached = dateTimeFormatCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(locale, options);
  dateTimeFormatCache.set(key, formatter);
  return formatter;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: DatePickerValue | Date | undefined | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return null;
  }

  return date;
}

function compareDate(a: Date, b: Date) {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

function getCalendarDays(monthDate: Date): CalendarDay[] {
  const firstDay = startOfMonth(monthDate);
  const gridStart = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      inCurrentMonth: date.getMonth() === firstDay.getMonth(),
      iso: toIsoDate(date),
    };
  });
}

function getWeekdayLabels(locale: string | undefined) {
  const formatter = getFormatter(locale, { weekday: "short" });
  const sunday = new Date(2026, 5, 7);
  return Array.from({ length: 7 }, (_, index) => formatter.format(addDays(sunday, index)));
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isDateDisabled(date: Date, minDate: Date | null, maxDate: Date | null, disabledDate?: (date: Date) => boolean) {
  const day = startOfDay(date);
  if (minDate && compareDate(day, minDate) < 0) {
    return true;
  }
  if (maxDate && compareDate(day, maxDate) > 0) {
    return true;
  }
  return disabledDate?.(new Date(day)) ?? false;
}

function findEnabledDate(seedDate: Date, minDate: Date | null, maxDate: Date | null, disabledDate?: (date: Date) => boolean) {
  if (!isDateDisabled(seedDate, minDate, maxDate, disabledDate)) {
    return startOfDay(seedDate);
  }

  for (let offset = 1; offset <= 42; offset += 1) {
    const forward = addDays(seedDate, offset);
    if (!isDateDisabled(forward, minDate, maxDate, disabledDate)) {
      return startOfDay(forward);
    }

    const backward = addDays(seedDate, -offset);
    if (!isDateDisabled(backward, minDate, maxDate, disabledDate)) {
      return startOfDay(backward);
    }
  }

  return startOfDay(seedDate);
}

function focusButtonByIso(root: HTMLElement | null, iso: string) {
  root?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus();
}

export function DatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultOpen,
  defaultPickerDate,
  defaultValue,
  disabled,
  disabledDate,
  error = false,
  errorText,
  helpText,
  hint,
  id,
  label,
  locale,
  max,
  min,
  name,
  onBlur,
  onFocus,
  onKeyDown,
  onOpenChange,
  onValueChange,
  open,
  placeholder = "Select date",
  required,
  value,
  ...props
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const panelId = `${inputId}-panel`;
  const headingId = `${inputId}-heading`;
  const fieldHelp = errorText ?? helpText ?? hint;
  const helpId = fieldHelp ? `${inputId}-help` : undefined;
  const describedBy = [ariaDescribedBy, helpId].filter(Boolean).join(" ") || undefined;
  const invalid = ariaInvalid ?? (error || Boolean(errorText) || undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<DatePickerPanelStyle>();
  const [currentValue, setCurrentValue] = useControllableState({
    defaultValue,
    fallbackValue: "",
    value,
  });
  const [currentOpen, setCurrentOpen] = useControllableState({
    defaultValue: defaultOpen,
    fallbackValue: false,
    onChange: onOpenChange,
    value: open,
  });
  const minDate = useMemo(() => parseDate(min), [min]);
  const maxDate = useMemo(() => parseDate(max), [max]);
  const selectedDate = useMemo(() => parseDate(currentValue), [currentValue]);
  const fallbackPickerDate = useMemo(
    () => parseDate(defaultPickerDate) ?? selectedDate ?? minDate ?? startOfDay(new Date()),
    [defaultPickerDate, minDate, selectedDate],
  );
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(fallbackPickerDate));
  const [activeDate, setActiveDate] = useState(() =>
    findEnabledDate(selectedDate ?? fallbackPickerDate, minDate, maxDate, disabledDate),
  );
  const monthLabel = getFormatter(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const formattedValue = selectedDate ? getFormatter(locale, { day: "2-digit", month: "short", year: "numeric" }).format(selectedDate) : "";
  const hiddenValue = selectedDate ? toIsoDate(selectedDate) : "";
  const weekdays = useMemo(() => getWeekdayLabels(locale), [locale]);
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const todayIso = toIsoDate(startOfDay(new Date()));
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : "";
  const activeIso = toIsoDate(activeDate);
  const previousMonthDisabled = minDate && compareDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0), minDate) < 0;
  const nextMonthDisabled = maxDate && compareDate(addMonths(visibleMonth, 1), maxDate) > 0;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled) {
        return;
      }
      setCurrentOpen(nextOpen);
    },
    [disabled, setCurrentOpen],
  );

  const closePanel = useCallback(
    (restoreFocus = true) => {
      setCurrentOpen(false);
      if (restoreFocus && !disabled) {
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [disabled, setCurrentOpen],
  );

  useLayoutEffect(() => {
    if (!currentOpen || disabled) {
      setPanelStyle(undefined);
      return;
    }

    const updatePanelPosition = () => {
      const root = rootRef.current;
      if (!root || typeof window === "undefined") {
        return;
      }

      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const rootRect = root.getBoundingClientRect();
      const viewportGutter = viewportWidth <= 760 ? 10 : 12;
      const preferredWidth = viewportWidth <= 760 ? 360 : 336;
      const panelWidth = Math.max(280, Math.min(preferredWidth, viewportWidth - viewportGutter * 2));
      const minLeft = viewportGutter - rootRect.left;
      const maxLeft = viewportWidth - viewportGutter - rootRect.left - panelWidth;
      const nextLeft = Math.min(Math.max(0, minLeft), maxLeft);

      setPanelStyle({
        "--c-date-picker-panel-left": `${Math.round(nextLeft)}px`,
        "--c-date-picker-panel-width": `${Math.round(panelWidth)}px`,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [currentOpen, disabled]);

  const moveActiveDate = useCallback(
    (nextDate: Date) => {
      const enabledDate = findEnabledDate(nextDate, minDate, maxDate, disabledDate);
      setActiveDate(enabledDate);
      if (!isSameMonth(enabledDate, visibleMonth)) {
        setVisibleMonth(startOfMonth(enabledDate));
      }
      window.requestAnimationFrame(() => focusButtonByIso(gridRef.current, toIsoDate(enabledDate)));
    },
    [disabledDate, maxDate, minDate, visibleMonth],
  );

  useEffect(() => {
    if (selectedDate) {
      setActiveDate(findEnabledDate(selectedDate, minDate, maxDate, disabledDate));
      setVisibleMonth(startOfMonth(selectedDate));
    }
  }, [currentValue, disabledDate, maxDate, minDate, selectedDate]);

  useEffect(() => {
    if (!currentOpen || disabled) {
      return;
    }

    window.requestAnimationFrame(() => {
      focusButtonByIso(gridRef.current, toIsoDate(activeDate));
    });
  }, [activeDate, currentOpen, disabled]);

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        closePanel(false);
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [closePanel, currentOpen]);

  const selectDate = (date: Date) => {
    if (disabled || isDateDisabled(date, minDate, maxDate, disabledDate)) {
      return;
    }

    const nextValue = toIsoDate(date);
    setCurrentValue(nextValue);
    onValueChange?.(nextValue, { date: new Date(date), source: "select" });
    closePanel();
  };

  const clearValue = () => {
    if (disabled || required) {
      return;
    }

    setCurrentValue("");
    onValueChange?.("", { date: null, source: "clear" });
    closePanel();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "Escape") {
      closePanel();
    }
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    const movement: Record<string, number> = {
      ArrowDown: 7,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
    };

    if (event.key in movement) {
      event.preventDefault();
      moveActiveDate(addDays(activeDate, movement[event.key]));
    } else if (event.key === "Home") {
      event.preventDefault();
      moveActiveDate(addDays(activeDate, -activeDate.getDay()));
    } else if (event.key === "End") {
      event.preventDefault();
      moveActiveDate(addDays(activeDate, 6 - activeDate.getDay()));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      moveActiveDate(addMonths(activeDate, -1));
    } else if (event.key === "PageDown") {
      event.preventDefault();
      moveActiveDate(addMonths(activeDate, 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDate(activeDate);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  };

  return (
    <div className={cx("c-date-picker", invalid && "c-date-picker--error", className)} ref={rootRef}>
      {label ? (
        <label className="c-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <span className="c-date-picker__control">
        <input
          {...props}
          aria-controls={panelId}
          aria-describedby={describedBy}
          aria-expanded={currentOpen}
          aria-haspopup="dialog"
          aria-invalid={invalid}
          className="c-input c-date-picker__input"
          disabled={disabled}
          id={inputId}
          inputMode="none"
          name={name ? `${name}-display` : undefined}
          onBlur={onBlur}
          onClick={() => setOpen(!currentOpen)}
          onFocus={onFocus}
          onKeyDown={handleTriggerKeyDown}
          placeholder={placeholder}
          readOnly
          ref={inputRef}
          required={required && !hiddenValue}
          type="text"
          value={formattedValue}
        />
        {name ? <input name={name} type="hidden" value={hiddenValue} /> : null}
        {selectedDate && !required ? (
          <button
            aria-label="Clear selected date"
            className="c-date-picker__clear"
            disabled={disabled}
            onClick={clearValue}
            type="button"
          >
            x
          </button>
        ) : null}
        <button
          aria-controls={panelId}
          aria-expanded={currentOpen}
          aria-haspopup="dialog"
          aria-label="Open date picker"
          className="c-date-picker__trigger"
          disabled={disabled}
          onClick={() => setOpen(!currentOpen)}
          type="button"
        >
          <span aria-hidden="true" className="c-date-picker__icon">
            <span />
            <span />
          </span>
        </button>
      </span>
      <div
        aria-labelledby={headingId}
        className="c-date-picker__panel"
        hidden={!currentOpen || disabled}
        id={panelId}
        role="dialog"
        style={panelStyle}
      >
        <div className="c-date-picker__header">
          <DatePickerNavButton
            aria-label="Previous month"
            disabled={Boolean(previousMonthDisabled)}
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          >
            ‹
          </DatePickerNavButton>
          <strong id={headingId}>{monthLabel}</strong>
          <DatePickerNavButton
            aria-label="Next month"
            disabled={Boolean(nextMonthDisabled)}
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          >
            ›
          </DatePickerNavButton>
        </div>
        <div aria-labelledby={headingId} className="c-date-picker__grid" onKeyDown={handleGridKeyDown} ref={gridRef} role="grid">
          {weekdays.map((weekday) => (
            <span className="c-date-picker__weekday" key={weekday} role="columnheader">
              {weekday}
            </span>
          ))}
          {days.map((day) => {
            const dayDisabled = isDateDisabled(day.date, minDate, maxDate, disabledDate);
            const dayIso = day.iso;
            const daySelected = selectedIso === dayIso;
            const dayActive = activeIso === dayIso;
            return (
              <button
                aria-current={dayIso === todayIso ? "date" : undefined}
                aria-disabled={dayDisabled || undefined}
                aria-label={getFormatter(locale, { dateStyle: "full" }).format(day.date)}
                aria-selected={daySelected}
                className={cx(
                  "c-date-picker__day",
                  !day.inCurrentMonth && "c-date-picker__day--outside",
                  dayIso === todayIso && "c-date-picker__day--today",
                  daySelected && "c-date-picker__day--selected",
                )}
                data-date={dayIso}
                disabled={dayDisabled}
                key={dayIso}
                onClick={() => selectDate(day.date)}
                role="gridcell"
                tabIndex={dayActive && !dayDisabled ? 0 : -1}
                type="button"
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="c-date-picker__footer">
          <button className="c-date-picker__text-button" disabled={disabled} onClick={() => moveActiveDate(startOfDay(new Date()))} type="button">
            Today
          </button>
          <button className="c-date-picker__text-button" disabled={!selectedDate || required || disabled} onClick={clearValue} type="button">
            Clear
          </button>
        </div>
      </div>
      {fieldHelp ? (
        <span className={cx("c-field__hint", invalid && "c-field__hint--error")} id={helpId}>
          {fieldHelp}
        </span>
      ) : null}
    </div>
  );
}

function DatePickerNavButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cx("c-date-picker__nav", className)} type="button" {...props}>
      {children}
    </button>
  );
}
