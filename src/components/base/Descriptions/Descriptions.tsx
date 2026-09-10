import { Fragment, useId, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type DescriptionsColumn =
  | number
  | {
      default?: number;
      sm?: number;
      md?: number;
      lg?: number;
    };
export type DescriptionsLabelPlacement = "start" | "top";
export type DescriptionsSemantic = "dl" | "table";
export type DescriptionsSize = "sm" | "md" | "lg";

export interface DescriptionsItem {
  key: string;
  label: ReactNode;
  children?: ReactNode;
  value?: ReactNode;
  span?: number;
  className?: string;
  contentClassName?: string;
  labelClassName?: string;
}

export interface DescriptionsProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  bordered?: boolean;
  caption?: ReactNode;
  column?: DescriptionsColumn;
  emptyText?: ReactNode;
  items: DescriptionsItem[];
  labelPlacement?: DescriptionsLabelPlacement;
  responsive?: boolean;
  semantic?: DescriptionsSemantic;
  size?: DescriptionsSize;
  title?: ReactNode;
}

type PackedItem = DescriptionsItem & {
  normalizedSpan: number;
};

type DescriptionStyle = CSSProperties & {
  "--c-descriptions-columns"?: number;
  "--c-descriptions-columns-sm"?: number;
  "--c-descriptions-columns-md"?: number;
  "--c-descriptions-columns-lg"?: number;
};

type DescriptionItemStyle = CSSProperties & {
  "--c-descriptions-item-span"?: number;
  "--c-descriptions-item-span-md"?: number;
  "--c-descriptions-item-span-sm"?: number;
};

const emptyItemsLabel = "No fields";

function clampColumn(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(4, Math.floor(value ?? fallback)));
}

function normalizeColumn(column: DescriptionsColumn | undefined) {
  if (typeof column === "number") {
    const defaultColumn = clampColumn(column, 3);

    return {
      default: defaultColumn,
      lg: defaultColumn,
      md: Math.min(defaultColumn, 2),
      sm: 1,
    };
  }

  const defaultColumn = clampColumn(column?.default ?? column?.lg, 3);

  return {
    default: defaultColumn,
    lg: clampColumn(column?.lg, defaultColumn),
    md: clampColumn(column?.md, Math.min(defaultColumn, 2)),
    sm: clampColumn(column?.sm, 1),
  };
}

function normalizeSpan(span: number | undefined, columnCount: number) {
  if (!Number.isFinite(span)) {
    return 1;
  }

  return Math.max(1, Math.min(columnCount, Math.floor(span ?? 1)));
}

function packRows(items: DescriptionsItem[], columnCount: number) {
  const rows: PackedItem[][] = [];
  let currentRow: PackedItem[] = [];
  let occupied = 0;

  items.forEach((item) => {
    const normalizedSpan = normalizeSpan(item.span, columnCount);

    if (occupied > 0 && occupied + normalizedSpan > columnCount) {
      rows.push(currentRow);
      currentRow = [];
      occupied = 0;
    }

    currentRow.push({ ...item, normalizedSpan });
    occupied += normalizedSpan;

    if (occupied >= columnCount) {
      rows.push(currentRow);
      currentRow = [];
      occupied = 0;
    }
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function readValue(item: DescriptionsItem, emptyText: ReactNode) {
  const value = item.children ?? item.value;

  if (value === undefined || value === null || value === "") {
    return <span className="c-descriptions__empty-value">{emptyText}</span>;
  }

  return value;
}

function getTableRemainingSpan(row: PackedItem[], columnCount: number) {
  return Math.max(columnCount - row.reduce((sum, item) => sum + item.normalizedSpan, 0), 0);
}

function getItemStyle(item: DescriptionsItem, column: ReturnType<typeof normalizeColumn>): DescriptionItemStyle {
  return {
    "--c-descriptions-item-span": normalizeSpan(item.span, column.default),
    "--c-descriptions-item-span-md": normalizeSpan(item.span, column.md),
    "--c-descriptions-item-span-sm": normalizeSpan(item.span, column.sm),
  };
}

export function Descriptions({
  bordered = false,
  caption,
  className,
  column = 3,
  emptyText = "Not set",
  items,
  labelPlacement = "start",
  responsive = true,
  semantic = "dl",
  size = "md",
  style,
  title,
  ...props
}: DescriptionsProps) {
  const generatedId = useId();
  const titleId = title ? props["aria-labelledby"] ?? `${generatedId}-title` : undefined;
  const normalizedColumn = normalizeColumn(column);
  const rows = packRows(items, normalizedColumn.default);
  const hasItems = items.length > 0;
  const mergedStyle: DescriptionStyle = {
    "--c-descriptions-columns": normalizedColumn.default,
    "--c-descriptions-columns-sm": normalizedColumn.sm,
    "--c-descriptions-columns-md": normalizedColumn.md,
    "--c-descriptions-columns-lg": normalizedColumn.lg,
    ...style,
  };

  const rootClassName = cx(
    "c-descriptions",
    `c-descriptions--${size}`,
    `c-descriptions--${labelPlacement}`,
    `c-descriptions--${semantic}`,
    bordered && "c-descriptions--bordered",
    responsive && "c-descriptions--responsive",
    className,
  );

  if (semantic === "table") {
    return (
      <section
        aria-labelledby={titleId}
        className={rootClassName}
        data-columns={normalizedColumn.default}
        data-responsive={responsive ? "true" : "false"}
        data-semantic="table"
        style={mergedStyle}
        {...props}
      >
        {title ? (
          <header className="c-descriptions__header">
            <h2 id={titleId}>{title}</h2>
          </header>
        ) : null}
        <div className="c-descriptions__table-wrap">
          <table className="c-descriptions__table">
            {caption ? <caption>{caption}</caption> : null}
            <tbody>
              {!hasItems ? (
                <tr>
                  <th className="c-descriptions__label" id={`${generatedId}-empty-label`} scope="row">
                    {emptyItemsLabel}
                  </th>
                  <td className="c-descriptions__content c-descriptions__content--empty" colSpan={normalizedColumn.default * 2 - 1} headers={`${generatedId}-empty-label`}>
                    <span className="c-descriptions__empty-value">{emptyText}</span>
                  </td>
                </tr>
              ) : labelPlacement === "top"
                ? rows.map((row, rowIndex) => {
                    const remainingSpan = getTableRemainingSpan(row, normalizedColumn.default);

                    return (
                      <Fragment key={rowIndex}>
                        <tr className="c-descriptions__table-label-row" key={`label-${rowIndex}`}>
                          {row.map((item, itemIndex) => {
                            const headerId = `${generatedId}-${rowIndex}-${itemIndex}-label`;

                            return (
                              <th
                                className={cx("c-descriptions__label", item.labelClassName)}
                                colSpan={item.normalizedSpan * 2}
                                id={headerId}
                                key={item.key}
                                scope="col"
                              >
                                {item.label}
                              </th>
                            );
                          })}
                          {remainingSpan > 0 ? <td aria-hidden="true" className="c-descriptions__table-filler" colSpan={remainingSpan * 2} /> : null}
                        </tr>
                        <tr className="c-descriptions__table-content-row" key={`content-${rowIndex}`}>
                          {row.map((item, itemIndex) => {
                            const headerId = `${generatedId}-${rowIndex}-${itemIndex}-label`;

                            return (
                              <td
                                className={cx("c-descriptions__content", item.contentClassName)}
                                colSpan={item.normalizedSpan * 2}
                                headers={headerId}
                                key={item.key}
                              >
                                <span className="c-descriptions__mobile-label">{item.label}</span>
                                {readValue(item, emptyText)}
                              </td>
                            );
                          })}
                          {remainingSpan > 0 ? <td aria-hidden="true" className="c-descriptions__table-filler" colSpan={remainingSpan * 2} /> : null}
                        </tr>
                      </Fragment>
                    );
                  })
                : rows.map((row, rowIndex) => {
                    const remainingSpan = getTableRemainingSpan(row, normalizedColumn.default);

                    return (
                      <tr key={rowIndex}>
                        {row.map((item, itemIndex) => {
                          const headerId = `${generatedId}-${rowIndex}-${itemIndex}-label`;

                          return (
                            <Fragment key={item.key}>
                              <th
                                className={cx("c-descriptions__label", item.labelClassName)}
                                id={headerId}
                                scope="row"
                              >
                                {item.label}
                              </th>
                              <td
                                className={cx("c-descriptions__content", item.contentClassName)}
                                colSpan={item.normalizedSpan * 2 - 1}
                                headers={headerId}
                              >
                                {readValue(item, emptyText)}
                              </td>
                            </Fragment>
                          );
                        })}
                        {remainingSpan > 0 ? <td aria-hidden="true" className="c-descriptions__table-filler" colSpan={remainingSpan * 2} /> : null}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={rootClassName}
      data-columns={normalizedColumn.default}
      data-responsive={responsive ? "true" : "false"}
      data-semantic="dl"
      style={mergedStyle}
      {...props}
    >
      {title ? (
        <header className="c-descriptions__header">
          <h2 id={titleId}>{title}</h2>
        </header>
      ) : null}
      <dl className="c-descriptions__list">
        {!hasItems ? (
          <div className="c-descriptions__item c-descriptions__item--empty" style={getItemStyle({ key: "__empty", label: emptyItemsLabel, span: normalizedColumn.default }, normalizedColumn)}>
            <dt className="c-descriptions__label">{emptyItemsLabel}</dt>
            <dd className="c-descriptions__content c-descriptions__content--empty">
              <span className="c-descriptions__empty-value">{emptyText}</span>
            </dd>
          </div>
        ) : null}
        {items.map((item) => (
          <div
            className={cx("c-descriptions__item", item.className)}
            data-span={normalizeSpan(item.span, normalizedColumn.default)}
            key={item.key}
            style={getItemStyle(item, normalizedColumn)}
          >
            <dt className={cx("c-descriptions__label", item.labelClassName)}>{item.label}</dt>
            <dd className={cx("c-descriptions__content", item.contentClassName)}>{readValue(item, emptyText)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
