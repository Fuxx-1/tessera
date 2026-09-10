import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./PropertyList.css";

export type PropertyListColumns = 1 | 2 | 3;
export type PropertyListDensity = "comfortable" | "compact";
export type PropertyListLayout = "grid" | "stack";
export type PropertyListStatusTone = "neutral" | "success" | "warning" | "critical";

export interface PropertyListItem {
  id: string;
  label: ReactNode;
  value?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  status?: ReactNode;
  statusTone?: PropertyListStatusTone;
  copy?: ReactNode;
  action?: ReactNode;
  emptyValue?: ReactNode;
}

export interface PropertyListProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  items: PropertyListItem[];
  columns?: PropertyListColumns;
  density?: PropertyListDensity;
  layout?: PropertyListLayout;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  emptyValue?: ReactNode;
  loadingLabel?: string;
}

type InternalPropertyListProps = PropertyListProps & {
  dangerouslySetInnerHTML?: never;
};

function isEmptyPropertyValue(value: ReactNode) {
  return value === undefined || value === null || value === "" || value === false;
}

export function PropertyList({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  columns = 2,
  density = "comfortable",
  description,
  empty = "No properties",
  emptyValue = "Not set",
  error,
  items,
  layout = "grid",
  loading = false,
  loadingLabel = "Loading properties",
  title,
  dangerouslySetInnerHTML: _dangerouslySetInnerHTML,
  ...props
}: InternalPropertyListProps) {
  const generatedTitleId = useId();
  const titleId = title && !ariaLabel && !ariaLabelledBy ? generatedTitleId : undefined;

  return (
    <section
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? titleId}
      className={cx(
        "b-property-list",
        `b-property-list--${columns}`,
        `b-property-list--${layout}`,
        `b-property-list--${density}`,
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      {title || description ? (
        <header className="b-property-list__header">
          {title ? <h2 id={titleId}>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}

      {loading ? (
        <div className="b-property-list__skeleton" role="status" aria-label={loadingLabel}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : error ? (
        <div className="b-business-state b-business-state--error" role="alert">{error}</div>
      ) : items.length === 0 ? (
        <div className="b-business-state" role="status">{empty}</div>
      ) : (
        <dl className="b-property-list__grid">
          {items.map((item) => (
            <div className="b-property-list__item" key={item.id}>
              <dt>
                <span className="b-property-list__key">{item.label}</span>
                {item.status || item.badge ? (
                  <span className="b-property-list__meta">
                    {item.status ? (
                      <span className={cx("b-property-list__status", `b-property-list__status--${item.statusTone ?? "neutral"}`)}>
                        {item.status}
                      </span>
                    ) : null}
                    {item.badge ? <span className="b-property-list__badge">{item.badge}</span> : null}
                  </span>
                ) : null}
              </dt>
              <dd>
                <span className="b-property-list__value">
                  {isEmptyPropertyValue(item.value)
                    ? <span className="b-property-list__muted">{item.emptyValue ?? emptyValue}</span>
                    : item.value}
                </span>
                {item.copy || item.action ? (
                  <span className="b-property-list__affordances">
                    {item.copy ? <span className="b-property-list__copy">{item.copy}</span> : null}
                    {item.action ? <span className="b-property-list__action">{item.action}</span> : null}
                  </span>
                ) : null}
              </dd>
              {item.description ? <p>{item.description}</p> : null}
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export const DescriptionList = PropertyList;
