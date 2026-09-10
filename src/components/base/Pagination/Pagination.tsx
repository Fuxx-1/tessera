import type { ChangeEvent, FormEvent, HTMLAttributes, ReactNode } from "react";
import { useRef, useState } from "react";
import { useControllableState } from "../../../hooks/useControllableState";
import { cx } from "../../../utils/cx";
import "./style.css";

export type PaginationSize = "sm" | "md";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  current?: number;
  defaultCurrent?: number;
  defaultPageSize?: number;
  disabled?: boolean;
  hideOnSinglePage?: boolean;
  itemLabel?: (page: number, type: "page" | "previous" | "next") => string;
  onChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number, page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode);
  simple?: boolean;
  size?: PaginationSize;
  siblingCount?: number;
  total: number;
}

type PageToken = number | "start-ellipsis" | "end-ellipsis";

function clampTotal(total: number) {
  if (!Number.isFinite(total)) {
    return 0;
  }

  return Math.max(Math.trunc(total), 0);
}

function clampPage(page: number, pageCount: number) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(page), 1), Math.max(pageCount, 1));
}

function clampPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) {
    return 10;
  }

  return Math.max(Math.trunc(pageSize), 1);
}

function clampSiblingCount(siblingCount: number) {
  if (!Number.isFinite(siblingCount)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(siblingCount), 0), 5);
}

function normalizePageSizeOptions(options: number[], currentPageSize: number) {
  return Array.from(new Set([...options, currentPageSize].map(clampPageSize))).sort((a, b) => a - b);
}

function getPageTokens(current: number, pageCount: number, siblingCount: number): PageToken[] {
  const boundaryCount = 1;
  const safeSiblingCount = clampSiblingCount(siblingCount);
  const totalNumbers = safeSiblingCount * 2 + 3 + boundaryCount * 2;

  if (pageCount <= totalNumbers) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const leftSibling = Math.max(current - safeSiblingCount, boundaryCount + 2);
  const rightSibling = Math.min(current + safeSiblingCount, pageCount - boundaryCount - 1);
  const showLeftEllipsis = leftSibling > boundaryCount + 2;
  const showRightEllipsis = rightSibling < pageCount - boundaryCount - 1;
  const tokens: PageToken[] = [1];

  if (showLeftEllipsis) {
    tokens.push("start-ellipsis");
  } else {
    for (let page = 2; page < leftSibling; page += 1) {
      tokens.push(page);
    }
  }

  for (let page = leftSibling; page <= rightSibling; page += 1) {
    tokens.push(page);
  }

  if (showRightEllipsis) {
    tokens.push("end-ellipsis");
  } else {
    for (let page = rightSibling + 1; page < pageCount; page += 1) {
      tokens.push(page);
    }
  }

  tokens.push(pageCount);
  return tokens;
}

function defaultItemLabel(page: number, type: "page" | "previous" | "next") {
  if (type === "previous") {
    return "Go to previous page";
  }

  if (type === "next") {
    return "Go to next page";
  }

  return `Go to page ${page}`;
}

function getTotalRange(current: number, pageSize: number, total: number): [number, number] {
  if (total <= 0) {
    return [0, 0];
  }

  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return [start, end];
}

export function Pagination({
  className,
  current: currentProp,
  defaultCurrent,
  defaultPageSize,
  disabled = false,
  hideOnSinglePage = false,
  itemLabel = defaultItemLabel,
  onChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  showQuickJumper = false,
  showSizeChanger = false,
  showTotal = false,
  simple = false,
  size = "md",
  siblingCount = 1,
  total,
  ...props
}: PaginationProps) {
  const pageSizeChangePageRef = useRef(1);
  const [currentPageSize, setCurrentPageSize] = useControllableState({
    defaultValue: defaultPageSize === undefined ? undefined : clampPageSize(defaultPageSize),
    fallbackValue: 10,
    onChange: (nextPageSize) => onPageSizeChange?.(nextPageSize, pageSizeChangePageRef.current),
    value: pageSize === undefined ? undefined : clampPageSize(pageSize),
  });
  const safePageSize = clampPageSize(currentPageSize);
  const safeTotal = clampTotal(total);
  const pageCount = Math.max(Math.ceil(safeTotal / safePageSize), 1);
  const [current, setCurrent] = useControllableState({
    defaultValue: defaultCurrent,
    fallbackValue: 1,
    onChange,
    value: currentProp,
  });
  const activePage = clampPage(current, pageCount);
  pageSizeChangePageRef.current = activePage;
  const tokens = getPageTokens(activePage, pageCount, siblingCount);
  const previousPage = clampPage(activePage - 1, pageCount);
  const nextPage = clampPage(activePage + 1, pageCount);
  const normalizedPageSizeOptions = normalizePageSizeOptions(pageSizeOptions, safePageSize);
  const [jumpValue, setJumpValue] = useState("");
  const totalRange = getTotalRange(activePage, safePageSize, safeTotal);
  const totalNode =
    typeof showTotal === "function"
      ? showTotal(safeTotal, totalRange)
      : showTotal
        ? `${totalRange[0]}-${totalRange[1]} of ${safeTotal}`
        : null;

  function goTo(page: number) {
    const nextPage = clampPage(page, pageCount);

    if (!disabled && nextPage !== activePage) {
      setCurrent(nextPage);
    }
  }

  function handleJumpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedJumpValue = jumpValue.trim();

    if (!normalizedJumpValue) {
      return;
    }

    const nextPage = Number(normalizedJumpValue);

    if (Number.isFinite(nextPage)) {
      goTo(nextPage);
      setJumpValue("");
    }
  }

  function handlePageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextPageSize = clampPageSize(Number(event.target.value));
    const nextPageCount = Math.max(Math.ceil(safeTotal / nextPageSize), 1);
    const nextPage = clampPage(activePage, nextPageCount);

    pageSizeChangePageRef.current = nextPage;
    setCurrentPageSize(nextPageSize);

    if (nextPage !== activePage) {
      setCurrent(nextPage);
    }
  }

  if (hideOnSinglePage && pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-disabled={disabled || undefined}
      aria-label="Pagination"
      className={cx("c-pagination", `c-pagination--${size}`, simple && "c-pagination--simple", className)}
      {...props}
    >
      {totalNode ? <div className="c-pagination__total">{totalNode}</div> : null}
      {showSizeChanger ? (
        <label className="c-pagination__size-changer">
          <span>Per page</span>
          <select
            aria-label="Items per page"
            disabled={disabled}
            onChange={handlePageSizeChange}
            value={safePageSize}
          >
            {normalizedPageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        aria-label={itemLabel(previousPage, "previous")}
        className="c-pagination__button"
        disabled={disabled || activePage <= 1}
        onClick={() => goTo(previousPage)}
        type="button"
      >
        Previous
      </button>

      {simple ? (
        <span className="c-pagination__simple-status" aria-live="polite">
          Page {activePage} of {pageCount}
        </span>
      ) : (
        <ol className="c-pagination__list">
          {tokens.map((token) => (
            <li key={token}>
              {typeof token === "number" ? (
                <button
                  aria-current={token === activePage ? "page" : undefined}
                  aria-label={token === activePage ? `Page ${token}, current page` : itemLabel(token, "page")}
                  className="c-pagination__page"
                  disabled={disabled}
                  onClick={() => goTo(token)}
                  type="button"
                >
                  {token}
                </button>
              ) : (
                <span aria-hidden="true" className="c-pagination__ellipsis">
                  ...
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <button
        aria-label={itemLabel(nextPage, "next")}
        className="c-pagination__button"
        disabled={disabled || activePage >= pageCount}
        onClick={() => goTo(nextPage)}
        type="button"
      >
        Next
      </button>
      {showQuickJumper ? (
        <form className="c-pagination__jumper" onSubmit={handleJumpSubmit}>
          <label>
            <span>Go to</span>
            <input
              aria-label="Page number"
              disabled={disabled}
              inputMode="numeric"
              max={pageCount}
              min={1}
              onChange={(event) => setJumpValue(event.target.value)}
              placeholder={String(activePage)}
              type="number"
              value={jumpValue}
            />
          </label>
          <button className="c-pagination__jump-button" disabled={disabled} type="submit">
            Go
          </button>
        </form>
      ) : null}
    </nav>
  );
}
