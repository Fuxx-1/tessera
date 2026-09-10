import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import { UI_RENDER_BUDGETS, clampRenderLimit, limitItems } from "../../../utils/performance";
import { Empty } from "../Empty";
import { Spin } from "../Spin";
import "./style.css";

export interface ListRenderState {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  key: string | number;
}

export type ListElement = "div" | "ol" | "ul";
export type ListStatePriority = "error" | "loading";
type SafeListRootProps = Omit<HTMLAttributes<HTMLElement>, "children" | "dangerouslySetInnerHTML">;

export interface ListProps<TItem> extends SafeListRootProps {
  items: readonly TItem[];
  renderItem: (item: TItem, state: ListRenderState) => ReactNode;
  getKey?: (item: TItem, index: number) => string | number;
  ariaLabel?: string;
  header?: ReactNode;
  footer?: ReactNode;
  emptyText?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  bordered?: boolean;
  density?: "comfortable" | "compact";
  listElement?: ListElement;
  maxVisibleItems?: number;
  statePriority?: ListStatePriority;
}

type InternalListProps<TItem> = ListProps<TItem> & {
  dangerouslySetInnerHTML?: never;
};

export function List<TItem>({
  ariaLabel,
  bordered = true,
  className,
  density = "comfortable",
  emptyAction,
  emptyDescription = "There is nothing to show yet.",
  emptyText = "No items",
  error,
  footer,
  getKey,
  header,
  items,
  listElement = "ul",
  loading = false,
  loadingText = "Loading list",
  maxVisibleItems = UI_RENDER_BUDGETS.listItems,
  renderItem,
  statePriority = "error",
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: InternalListProps<TItem>) {
  const isEmpty = items.length === 0;
  const generatedLabelId = useId();
  const headerId = header ? props["aria-labelledby"] ?? generatedLabelId : undefined;
  const showError = Boolean(error) && statePriority === "error";
  const showLoading = loading && (!error || statePriority === "loading");
  const showDeferredError = Boolean(error) && showLoading && statePriority === "loading";
  const ListTag = listElement;
  const itemTag = listElement === "div" ? "div" : "li";
  const ItemTag = itemTag;
  const visibleItems = limitItems(items, clampRenderLimit(maxVisibleItems, UI_RENDER_BUDGETS.listItems, 1, UI_RENDER_BUDGETS.listItems));

  return (
    <section
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      aria-labelledby={headerId}
      className={cx("c-list", bordered && "c-list--bordered", `c-list--${density}`, className)}
      {...props}
    >
      {header ? (
        <div className="c-list__header" id={headerId}>
          {header}
        </div>
      ) : null}
      {showError ? (
        <div className="c-list__state c-list__state--error" role="alert">
          {error}
        </div>
      ) : showLoading ? (
        <div className="c-list__state" role="status" aria-live="polite">
          <Spin label={loadingText} />
          {showDeferredError ? <span className="c-list__deferred-error">{error}</span> : null}
        </div>
      ) : isEmpty ? (
        <Empty
          action={emptyAction}
          description={emptyDescription}
          role="status"
          size="sm"
          title={emptyText}
        />
      ) : (
        <ListTag className="c-list__items" role={listElement === "div" ? "list" : undefined}>
          {visibleItems.items.map((item, index) => {
            const key = getKey ? getKey(item, index) : index;

            return (
              <ItemTag
                className="c-list__item"
                key={key}
                role={listElement === "div" ? "listitem" : undefined}
              >
                {renderItem(item, {
                  index,
                  isFirst: index === 0,
                  isLast: index === visibleItems.items.length - 1,
                  key,
                })}
              </ItemTag>
            );
          })}
          {visibleItems.hiddenCount > 0 ? (
            <ItemTag
              aria-live="polite"
              className="c-list__item c-list__item--overflow"
              role={listElement === "div" ? "listitem" : undefined}
            >
              <span role="status">
                Showing first {visibleItems.items.length.toLocaleString()} of {items.length.toLocaleString()} items.
              </span>
            </ItemTag>
          ) : null}
        </ListTag>
      )}
      {footer ? <div className="c-list__footer">{footer}</div> : null}
    </section>
  );
}
