import { useMemo, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type CalendarSize = "comfortable" | "compact";
export type CalendarViewMode = "month" | "year";

export type CalendarEvent = {
  id: string;
  date: Date | string;
  title: ReactNode;
  tone?: "neutral" | "strong" | "subtle";
};

export type CalendarMark = {
  date: Date | string;
  label?: string;
  tone?: "neutral" | "strong" | "subtle";
};

export type CalendarDateInfo = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  marks: CalendarMark[];
};

export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  defaultValue?: Date | string;
  events?: CalendarEvent[];
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  labels?: Partial<CalendarLabels>;
  locale?: string;
  marks?: CalendarMark[];
  maxEventsPerDay?: number;
  onChange?: (date: Date, info: CalendarDateInfo) => void;
  onMonthChange?: (month: Date) => void;
  renderDate?: (info: CalendarDateInfo) => ReactNode;
  showOutsideDays?: boolean;
  size?: CalendarSize;
  value?: Date | string;
  viewDate?: Date | string;
  viewMode?: CalendarViewMode;
}

export type CalendarLabels = {
  calendar: string;
  monthLabel: (date: Date) => string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  selected: string;
  selectedMonth: string;
  currentMonth: string;
  outsideMonth: string;
  events: (count: number) => string;
  mark: string;
  yearLabel: (date: Date) => string;
  monthEvents: (count: number) => string;
  monthMarks: (count: number) => string;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  marks: CalendarMark[];
};

type CalendarMonthCell = {
  date: Date;
  dateKey: string;
  events: CalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
  marks: CalendarMark[];
  monthLabel: string;
  shortLabel: string;
};

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value: Date, amount: number) {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + amount);
  return startOfDay(nextDate);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function addMonthsKeepingDay(value: Date, amount: number) {
  const targetMonth = new Date(value.getFullYear(), value.getMonth() + amount, 1);
  const lastDayOfTargetMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

  return startOfDay(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(value.getDate(), lastDayOfTargetMonth)));
}

function toDate(value: Date | string | undefined, fallback = new Date()) {
  if (!value) {
    return startOfDay(fallback);
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? startOfDay(fallback) : startOfDay(value);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? startOfDay(fallback) : startOfDay(parsedDate);
}

function toDateKey(value: Date | string) {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartOffset(month: Date, firstDayOfWeek: CalendarProps["firstDayOfWeek"]) {
  return (month.getDay() - (firstDayOfWeek ?? 0) + 7) % 7;
}

function groupByDate<T extends { date: Date | string }>(items: T[] = []) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const dateKey = toDateKey(item.date);
    groups[dateKey] = [...(groups[dateKey] ?? []), item];
    return groups;
  }, {});
}

function normalizeEventLimit(maxEventsPerDay: number) {
  return Math.max(0, Math.floor(Number.isFinite(maxEventsPerDay) ? maxEventsPerDay : 2));
}

function buildWeekdayLabels(locale: string, firstDayOfWeek: CalendarProps["firstDayOfWeek"]) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const baseSunday = new Date(2026, 5, 7);

  return Array.from({ length: 7 }, (_, index) => {
    const dayIndex = ((firstDayOfWeek ?? 0) + index) % 7;
    return formatter.format(addDays(baseSunday, dayIndex));
  });
}

function createLabels(locale: string, labels?: Partial<CalendarLabels>): CalendarLabels {
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const yearFormatter = new Intl.DateTimeFormat(locale, { year: "numeric" });

  return {
    calendar: "Calendar",
    monthLabel: (date) => monthFormatter.format(date),
    previousMonth: "Previous month",
    nextMonth: "Next month",
    today: "Today",
    selected: "Selected",
    selectedMonth: "Selected month",
    currentMonth: "Current month",
    outsideMonth: "Outside current month",
    events: (count) => `${count} event${count === 1 ? "" : "s"}`,
    mark: "Marked date",
    yearLabel: (date) => yearFormatter.format(date),
    monthEvents: (count) => `${count} event${count === 1 ? "" : "s"} this month`,
    monthMarks: (count) => `${count} marked date${count === 1 ? "" : "s"} this month`,
    ...labels,
  };
}

function buildCells({
  events,
  firstDayOfWeek,
  marks,
  month,
  selectedDate,
  today,
}: {
  events: CalendarEvent[];
  firstDayOfWeek: CalendarProps["firstDayOfWeek"];
  marks: CalendarMark[];
  month: Date;
  selectedDate: Date;
  today: Date;
}) {
  const eventsByDate = groupByDate(events);
  const marksByDate = groupByDate(marks);
  const startOffset = getStartOffset(month, firstDayOfWeek);
  const gridStart = addDays(month, -startOffset);
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(today);

  return Array.from({ length: 42 }, (_, index): CalendarCell => {
    const date = addDays(gridStart, index);
    const dateKey = toDateKey(date);

    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear(),
      isSelected: dateKey === selectedKey,
      isToday: dateKey === todayKey,
      events: eventsByDate[dateKey] ?? [],
      marks: marksByDate[dateKey] ?? [],
    };
  });
}

function getCellLabel(cell: CalendarCell, labels: CalendarLabels, locale: string) {
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(cell.date);
  const stateLabels = [
    cell.isSelected ? labels.selected : undefined,
    cell.isToday ? labels.today : undefined,
    cell.isCurrentMonth ? labels.currentMonth : labels.outsideMonth,
    cell.events.length > 0 ? labels.events(cell.events.length) : undefined,
    cell.marks.length > 0 ? labels.mark : undefined,
  ].filter(Boolean);

  return [dateLabel, ...stateLabels].join(", ");
}

function isSameMonth(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function buildYearCells({
  events,
  locale,
  marks,
  selectedDate,
  today,
  yearDate,
}: {
  events: CalendarEvent[];
  locale: string;
  marks: CalendarMark[];
  selectedDate: Date;
  today: Date;
  yearDate: Date;
}) {
  const longFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const shortFormatter = new Intl.DateTimeFormat(locale, { month: "short" });

  return Array.from({ length: 12 }, (_, monthIndex): CalendarMonthCell => {
    const date = new Date(yearDate.getFullYear(), monthIndex, 1);
    const eventsForMonth = events.filter((event) => isSameMonth(toDate(event.date), date));
    const marksForMonth = marks.filter((mark) => isSameMonth(toDate(mark.date), date));

    return {
      date,
      dateKey: toDateKey(date),
      events: eventsForMonth,
      isSelected: isSameMonth(date, selectedDate),
      isToday: isSameMonth(date, today),
      marks: marksForMonth,
      monthLabel: longFormatter.format(date),
      shortLabel: shortFormatter.format(date),
    };
  });
}

function getMonthCellLabel(cell: CalendarMonthCell, labels: CalendarLabels) {
  const stateLabels = [
    cell.isSelected ? labels.selectedMonth : undefined,
    cell.isToday ? labels.today : undefined,
    cell.events.length > 0 ? labels.monthEvents(cell.events.length) : undefined,
    cell.marks.length > 0 ? labels.monthMarks(cell.marks.length) : undefined,
  ].filter(Boolean);

  return [cell.monthLabel, ...stateLabels].join(", ");
}

function moveFocus(
  event: KeyboardEvent<HTMLButtonElement>,
  date: Date,
  firstDayOfWeek: NonNullable<CalendarProps["firstDayOfWeek"]>,
  onMove: (date: Date) => void,
) {
  const movements: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };

  if (event.key in movements) {
    event.preventDefault();
    onMove(addDays(date, movements[event.key]));
  } else if (event.key === "Home") {
    event.preventDefault();
    onMove(addDays(date, -getStartOffset(date, firstDayOfWeek)));
  } else if (event.key === "End") {
    event.preventDefault();
    onMove(addDays(date, 6 - getStartOffset(date, firstDayOfWeek)));
  } else if (event.key === "PageUp") {
    event.preventDefault();
    onMove(addMonthsKeepingDay(date, event.shiftKey ? -12 : -1));
  } else if (event.key === "PageDown") {
    event.preventDefault();
    onMove(addMonthsKeepingDay(date, event.shiftKey ? 12 : 1));
  }
}

function moveMonthFocus(event: KeyboardEvent<HTMLButtonElement>, date: Date, onMove: (date: Date) => void) {
  const movements: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -4,
    ArrowDown: 4,
  };

  if (event.key in movements) {
    event.preventDefault();
    onMove(addMonths(date, movements[event.key]));
  } else if (event.key === "Home") {
    event.preventDefault();
    onMove(new Date(date.getFullYear(), 0, 1));
  } else if (event.key === "End") {
    event.preventDefault();
    onMove(new Date(date.getFullYear(), 11, 1));
  } else if (event.key === "PageUp") {
    event.preventDefault();
    onMove(addMonths(date, event.shiftKey ? -120 : -12));
  } else if (event.key === "PageDown") {
    event.preventDefault();
    onMove(addMonths(date, event.shiftKey ? 120 : 12));
  }
}

function DayButton({
  cell,
  children,
  firstDayOfWeek,
  labels,
  locale,
  maxEventsPerDay,
  onFocusDate,
  onMoveDate,
  onSelect,
  showOutsideDays,
  tabIndex,
}: {
  cell: CalendarCell;
  children?: ReactNode;
  labels: CalendarLabels;
  locale: string;
  firstDayOfWeek: NonNullable<CalendarProps["firstDayOfWeek"]>;
  maxEventsPerDay: number;
  onFocusDate: (date: Date) => void;
  onMoveDate: (date: Date) => void;
  onSelect: (cell: CalendarCell) => void;
  showOutsideDays: boolean;
  tabIndex: ButtonHTMLAttributes<HTMLButtonElement>["tabIndex"];
}) {
  const visibleEvents = cell.events.slice(0, maxEventsPerDay);
  const hiddenEventCount = Math.max(cell.events.length - visibleEvents.length, 0);
  const shouldDim = !cell.isCurrentMonth && !showOutsideDays;

  return (
    <button
      aria-current={cell.isToday ? "date" : undefined}
      aria-label={getCellLabel(cell, labels, locale)}
      aria-pressed={cell.isSelected}
      className={cx(
        "c-calendar__day",
        cell.isSelected && "c-calendar__day--selected",
        cell.isToday && "c-calendar__day--today",
        !cell.isCurrentMonth && "c-calendar__day--outside",
        shouldDim && "c-calendar__day--hidden",
      )}
      data-date={cell.dateKey}
      tabIndex={tabIndex}
      type="button"
      onClick={() => onSelect(cell)}
      onFocus={() => onFocusDate(cell.date)}
      onKeyDown={(event) => moveFocus(event, cell.date, firstDayOfWeek, onMoveDate)}
    >
      <span className="c-calendar__date-number">{cell.dayNumber}</span>
      {cell.marks.length > 0 ? (
        <span className="c-calendar__marks" aria-hidden="true">
          {cell.marks.slice(0, 3).map((mark, index) => (
            <span className={cx("c-calendar__mark", mark.tone && `c-calendar__mark--${mark.tone}`)} key={`${cell.dateKey}-${index}`} />
          ))}
        </span>
      ) : null}
      {children ? <span className="c-calendar__custom">{children}</span> : null}
      {visibleEvents.length > 0 || hiddenEventCount > 0 ? (
        <span className="c-calendar__events" aria-hidden="true">
          {visibleEvents.map((event) => (
            <span className={cx("c-calendar__event", event.tone && `c-calendar__event--${event.tone}`)} key={event.id}>
              {event.title}
            </span>
          ))}
          {hiddenEventCount > 0 ? <span className="c-calendar__event c-calendar__event--more">+{hiddenEventCount}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

function MonthButton({
  cell,
  labels,
  onFocusMonth,
  onSelect,
  tabIndex,
}: {
  cell: CalendarMonthCell;
  labels: CalendarLabels;
  onFocusMonth: (date: Date) => void;
  onSelect: (cell: CalendarMonthCell) => void;
  tabIndex: ButtonHTMLAttributes<HTMLButtonElement>["tabIndex"];
}) {
  const visibleEvents = cell.events.slice(0, 2);
  const hiddenEventCount = Math.max(cell.events.length - visibleEvents.length, 0);

  return (
    <button
      aria-current={cell.isToday ? "date" : undefined}
      aria-label={getMonthCellLabel(cell, labels)}
      aria-pressed={cell.isSelected}
      className={cx("c-calendar__month", cell.isSelected && "c-calendar__month--selected", cell.isToday && "c-calendar__month--today")}
      data-month={cell.dateKey}
      tabIndex={tabIndex}
      type="button"
      onClick={() => onSelect(cell)}
      onFocus={() => onFocusMonth(cell.date)}
      onKeyDown={(event) => moveMonthFocus(event, cell.date, onFocusMonth)}
    >
      <span className="c-calendar__month-name">{cell.shortLabel}</span>
      {cell.marks.length > 0 ? (
        <span className="c-calendar__marks" aria-hidden="true">
          {cell.marks.slice(0, 3).map((mark, index) => (
            <span className={cx("c-calendar__mark", mark.tone && `c-calendar__mark--${mark.tone}`)} key={`${cell.dateKey}-${index}`} />
          ))}
        </span>
      ) : null}
      {visibleEvents.length > 0 ? (
        <span className="c-calendar__events" aria-hidden="true">
          {visibleEvents.map((event) => (
            <span className={cx("c-calendar__event", event.tone && `c-calendar__event--${event.tone}`)} key={event.id}>
              {event.title}
            </span>
          ))}
          {hiddenEventCount > 0 ? <span className="c-calendar__event c-calendar__event--more">+{hiddenEventCount}</span> : null}
        </span>
      ) : null}
    </button>
  );
}

export function Calendar({
  className,
  defaultValue,
  events = [],
  firstDayOfWeek = 0,
  labels: labelsProp,
  locale = typeof navigator === "undefined" ? "en-US" : navigator.language,
  marks = [],
  maxEventsPerDay = 2,
  onChange,
  onMonthChange,
  renderDate,
  showOutsideDays = true,
  size = "comfortable",
  value,
  viewDate,
  viewMode = "month",
  ...props
}: CalendarProps) {
  const fallbackDate = useMemo(() => toDate(defaultValue ?? value ?? new Date()), [defaultValue, value]);
  const [selectedDate, setSelectedDate] = useControllableState<Date>({
    defaultValue: defaultValue ? toDate(defaultValue) : undefined,
    fallbackValue: fallbackDate,
    value: value ? toDate(value) : undefined,
  });
  const [focusedDate, setFocusedDate] = useControllableState<Date>({
    defaultValue: viewDate ? toDate(viewDate) : startOfMonth(selectedDate),
    fallbackValue: startOfMonth(selectedDate),
    value: viewDate ? toDate(viewDate) : undefined,
    onChange: onMonthChange ? (nextDate) => onMonthChange(startOfMonth(nextDate)) : undefined,
  });
  const today = useMemo(() => startOfDay(new Date()), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentMonth = startOfMonth(focusedDate);
  const eventLimit = normalizeEventLimit(maxEventsPerDay);
  const labels = useMemo(() => createLabels(locale, labelsProp), [labelsProp, locale]);
  const weekdayLabels = useMemo(() => buildWeekdayLabels(locale, firstDayOfWeek), [firstDayOfWeek, locale]);
  const cells = useMemo(
    () => buildCells({ events, firstDayOfWeek, marks, month: currentMonth, selectedDate, today }),
    [currentMonth, events, firstDayOfWeek, marks, selectedDate, today],
  );
  const yearCells = useMemo(
    () => buildYearCells({ events, locale, marks, selectedDate, today, yearDate: currentMonth }),
    [currentMonth, events, locale, marks, selectedDate, today],
  );

  const selectedKey = toDateKey(selectedDate);
  const focusedKey = toDateKey(focusedDate);
  const focusableKey = cells.some((cell) => cell.dateKey === focusedKey)
    ? focusedKey
    : cells.some((cell) => cell.dateKey === selectedKey)
      ? selectedKey
      : (cells.find((cell) => cell.isCurrentMonth) ?? cells[0])?.dateKey;
  const focusableMonthKey = toDateKey(startOfMonth(focusedDate));

  function selectCell(cell: CalendarCell) {
    const info: CalendarDateInfo = {
      date: cell.date,
      dateKey: cell.dateKey,
      events: cell.events,
      isCurrentMonth: cell.isCurrentMonth,
      isSelected: true,
      isToday: cell.isToday,
      marks: cell.marks,
    };
    setSelectedDate(cell.date);
    setFocusedDate(cell.date);
    onChange?.(cell.date, info);
  }

  function setFocusDate(date: Date) {
    if (isSameMonth(date, currentMonth)) {
      setFocusedDate(date);
    }
  }

  function moveFocusDate(date: Date) {
    setFocusedDate(date);
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toDateKey(date)}"]`)?.focus();
    });
  }

  function focusMonth(date: Date) {
    const month = startOfMonth(date);
    setFocusedDate(month);
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-month="${toDateKey(month)}"]`)?.focus();
    });
  }

  function changeMonth(monthDelta: number) {
    setFocusedDate(addMonths(currentMonth, monthDelta));
  }

  function goToToday() {
    setSelectedDate(today);
    setFocusedDate(today);
    onChange?.(today, {
      date: today,
      dateKey: toDateKey(today),
      events: groupByDate(events)[toDateKey(today)] ?? [],
      isCurrentMonth: true,
      isSelected: true,
      isToday: true,
      marks: groupByDate(marks)[toDateKey(today)] ?? [],
    });
  }

  function selectMonth(cell: CalendarMonthCell) {
    setFocusedDate(cell.date);
    const selectedDayInMonth = isSameMonth(selectedDate, cell.date) ? selectedDate : cell.date;
    setSelectedDate(selectedDayInMonth);
    onChange?.(selectedDayInMonth, {
      date: selectedDayInMonth,
      dateKey: toDateKey(selectedDayInMonth),
      events: groupByDate(events)[toDateKey(selectedDayInMonth)] ?? [],
      isCurrentMonth: true,
      isSelected: true,
      isToday: toDateKey(selectedDayInMonth) === toDateKey(today),
      marks: groupByDate(marks)[toDateKey(selectedDayInMonth)] ?? [],
    });
  }

  return (
    <div className={cx("c-calendar", `c-calendar--${size}`, `c-calendar--${viewMode}`, className)} data-view-mode={viewMode} ref={rootRef} {...props}>
      <div className="c-calendar__header">
        <div>
          <span className="c-calendar__eyebrow">{labels.calendar}</span>
          <h2 className="c-calendar__title">{viewMode === "year" ? labels.yearLabel(currentMonth) : labels.monthLabel(currentMonth)}</h2>
        </div>
        <div className="c-calendar__controls">
          <button aria-label={labels.previousMonth} className="c-calendar__nav" type="button" onClick={() => changeMonth(viewMode === "year" ? -12 : -1)}>
            <span aria-hidden="true">{"<"}</span>
          </button>
          <button className="c-calendar__today" type="button" onClick={goToToday}>
            {labels.today}
          </button>
          <button aria-label={labels.nextMonth} className="c-calendar__nav" type="button" onClick={() => changeMonth(viewMode === "year" ? 12 : 1)}>
            <span aria-hidden="true">{">"}</span>
          </button>
        </div>
      </div>

      {viewMode === "year" ? (
        <div aria-label={labels.yearLabel(currentMonth)} className="c-calendar__year-grid" role="grid">
          {yearCells.map((cell) => (
            <div aria-selected={cell.isSelected} className="c-calendar__month-cell" key={cell.dateKey} role="gridcell">
              <MonthButton cell={cell} labels={labels} tabIndex={cell.dateKey === focusableMonthKey ? 0 : -1} onFocusMonth={focusMonth} onSelect={selectMonth} />
            </div>
          ))}
        </div>
      ) : (
        <div aria-label={labels.monthLabel(currentMonth)} className="c-calendar__grid" role="grid">
          {weekdayLabels.map((weekday) => (
            <div className="c-calendar__weekday" key={weekday} role="columnheader">
              {weekday}
            </div>
          ))}
          {cells.map((cell) => (
            <div aria-selected={cell.isSelected} className="c-calendar__cell" key={cell.dateKey} role="gridcell">
              <DayButton
                cell={cell}
                labels={labels}
                locale={locale}
                firstDayOfWeek={firstDayOfWeek}
                maxEventsPerDay={eventLimit}
                showOutsideDays={showOutsideDays}
                tabIndex={cell.dateKey === focusableKey ? 0 : -1}
                onFocusDate={setFocusDate}
                onMoveDate={moveFocusDate}
                onSelect={selectCell}
              >
                {renderDate?.({
                  date: cell.date,
                  dateKey: cell.dateKey,
                  events: cell.events,
                  isCurrentMonth: cell.isCurrentMonth,
                  isSelected: cell.isSelected,
                  isToday: cell.isToday,
                  marks: cell.marks,
                })}
              </DayButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
