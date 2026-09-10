import { useId, type HTMLAttributes, type ReactNode, type TableHTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cx } from "../../../utils/cx";
import { UI_RENDER_BUDGETS, clampRenderLimit, limitItems } from "../../../utils/performance";
import { Empty } from "../Empty";
import { Spin } from "../Spin";
import "./style.css";

export type TableRowKey<TRecord> = keyof TRecord | ((record: TRecord, index: number) => string | number);
export type TableDensity = "comfortable" | "compact";
type SafeTableProps = Omit<TableHTMLAttributes<HTMLTableElement>, "children" | "dangerouslySetInnerHTML">;
type SafeTableCellProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "children" | "dangerouslySetInnerHTML">;
type SafeTableHeaderProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "children" | "dangerouslySetInnerHTML">;
type SafeTableRowProps = Omit<HTMLAttributes<HTMLTableRowElement>, "children" | "dangerouslySetInnerHTML">;
type DangerousHtmlProp = { dangerouslySetInnerHTML?: unknown };

export interface TableColumn<TRecord> {
  key: string;
  title: ReactNode;
  dataIndex?: keyof TRecord;
  render?: (value: unknown, record: TRecord, index: number) => ReactNode;
  align?: "left" | "center" | "right";
  textWrap?: "nowrap" | "wrap" | "truncate";
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  className?: string;
  headerClassName?: string;
  ariaLabel?: string;
  scope?: "col" | "row";
  getCellProps?: (value: unknown, record: TRecord, index: number) => SafeTableCellProps;
  headerProps?: SafeTableHeaderProps;
}

export interface TableProps<TRecord> extends SafeTableProps {
  columns: Array<TableColumn<TRecord>>;
  data: TRecord[];
  rowKey: TableRowKey<TRecord>;
  density?: TableDensity;
  caption?: ReactNode;
  emptyText?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  loadingText?: ReactNode;
  getRowProps?: (record: TRecord, index: number) => SafeTableRowProps;
  rowClassName?: string | ((record: TRecord, index: number) => string | undefined);
  scrollLabel?: string;
  scrollX?: boolean | number | string;
  scrollerClassName?: string;
  stickyHeader?: boolean;
  wrapperClassName?: string;
  maxVisibleRows?: number;
}

function readRowKey<TRecord>(record: TRecord, index: number, rowKey: TableRowKey<TRecord>) {
  const key = typeof rowKey === "function" ? rowKey(record, index) : record[rowKey];
  return key == null ? `table-row-${index}` : String(key);
}

function readCellValue<TRecord>(record: TRecord, column: TableColumn<TRecord>) {
  if (!column.dataIndex) {
    return undefined;
  }

  return record[column.dataIndex];
}

function getStateColSpan(columnCount: number) {
  return Math.max(columnCount, 1);
}

function getCssLength(value: number | string | undefined) {
  return typeof value === "number" ? `${value}px` : value;
}

function stripDangerousHtmlProp<TProps extends object>(props: TProps | undefined) {
  if (!props) {
    return undefined;
  }

  const { dangerouslySetInnerHTML: _dangerousHtml, ...safeProps } = props as TProps & DangerousHtmlProp;
  return safeProps as Omit<TProps, "dangerouslySetInnerHTML">;
}

export function Table<TRecord>({
  caption,
  className,
  columns,
  data,
  density = "comfortable",
  emptyText = "No rows",
  error,
  getRowProps,
  loading = false,
  loadingText = "Loading table",
  rowClassName,
  scrollerClassName,
  rowKey,
  scrollLabel = "Scrollable table region",
  scrollX = true,
  stickyHeader = false,
  style,
  wrapperClassName,
  maxVisibleRows = UI_RENDER_BUDGETS.tableRows,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TableProps<TRecord>) {
  const generatedId = useId();
  const stateId = `${generatedId}-state`;
  const tableProps = stripDangerousHtmlProp(props);
  const minInlineSize = getCssLength(typeof scrollX === "boolean" ? undefined : scrollX);
  const hasRows = data.length > 0;
  const visibleRows = limitItems(data, clampRenderLimit(maxVisibleRows, UI_RENDER_BUDGETS.tableRows, 1, UI_RENDER_BUDGETS.tableRows));
  const hasState = Boolean(error) || loading || !hasRows;
  const describedBy = [ariaDescribedBy, hasState ? stateId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("c-table-wrap", Boolean(scrollX) && "c-table-wrap--scroll", wrapperClassName)}>
      <div
        aria-label={Boolean(scrollX) ? scrollLabel : undefined}
        className={cx("c-table__scroller", scrollerClassName)}
        role={Boolean(scrollX) ? "region" : undefined}
        tabIndex={Boolean(scrollX) ? 0 : undefined}
      >
        <table
          aria-busy={loading || undefined}
          aria-describedby={describedBy}
          className={cx("c-table", `c-table--${density}`, stickyHeader && "c-table--sticky", className)}
          style={{ minInlineSize, ...style }}
          {...tableProps}
        >
          {caption ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => {
                const {
                  className: headerPropsClassName,
                  scope: headerPropsScope,
                  style: headerPropsStyle,
                  ...headerProps
                } = stripDangerousHtmlProp(column.headerProps) ?? {};

                return (
                  <th
                    aria-label={column.ariaLabel}
                    className={cx(column.headerClassName, headerPropsClassName)}
                    key={column.key}
                    scope={headerPropsScope ?? "col"}
                    style={{
                      maxWidth: getCssLength(column.maxWidth),
                      minWidth: getCssLength(column.minWidth),
                      textAlign: column.align,
                      width: getCssLength(column.width),
                      ...headerPropsStyle,
                    }}
                    {...headerProps}
                  >
                    {column.title}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr className="c-table__state-row">
                <td className="c-table__state-cell c-table__state-cell--error" colSpan={getStateColSpan(columns.length)}>
                  <div className="c-table__state" id={stateId} role="alert">
                    {error}
                  </div>
                </td>
              </tr>
            ) : loading ? (
              <tr className="c-table__state-row">
                <td className="c-table__state-cell" colSpan={getStateColSpan(columns.length)}>
                  <div className="c-table__state" id={stateId} role="status">
                    <Spin label={loadingText} />
                  </div>
                </td>
              </tr>
            ) : hasRows ? (
              visibleRows.items.map((record, rowIndex) => {
                const rowProps = stripDangerousHtmlProp(getRowProps?.(record, rowIndex));
                const computedRowClassName =
                  typeof rowClassName === "function" ? rowClassName(record, rowIndex) : rowClassName;

                return (
                  <tr
                    {...rowProps}
                    className={cx(computedRowClassName, rowProps?.className)}
                    key={readRowKey(record, rowIndex, rowKey)}
                  >
                    {columns.map((column) => {
                      const value = readCellValue(record, column);
                      const cellProps = stripDangerousHtmlProp(column.getCellProps?.(value, record, rowIndex));
                      const Cell = column.scope === "row" ? "th" : "td";

                      return (
                        <Cell
                          {...cellProps}
                          className={cx(
                            column.textWrap && `c-table__cell--${column.textWrap}`,
                            column.className,
                            cellProps?.className,
                          )}
                          key={column.key}
                          scope={column.scope === "row" ? "row" : undefined}
                          style={{
                            maxWidth: getCssLength(column.maxWidth),
                            minWidth: getCssLength(column.minWidth),
                            textAlign: column.align,
                            width: getCssLength(column.width),
                            ...cellProps?.style,
                          }}
                        >
                          {column.render ? column.render(value, record, rowIndex) : (value as ReactNode)}
                        </Cell>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr className="c-table__state-row">
                <td className="c-table__state-cell" colSpan={getStateColSpan(columns.length)}>
                  <div id={stateId}>
                    <Empty size="sm" title={emptyText} />
                  </div>
                </td>
              </tr>
            )}
            {!error && !loading && visibleRows.hiddenCount > 0 ? (
              <tr className="c-table__state-row">
                <td className="c-table__state-cell" colSpan={getStateColSpan(columns.length)}>
                  <div className="c-table__state c-table__state--inline" role="status" aria-live="polite">
                    Showing first {visibleRows.items.length.toLocaleString()} of {data.length.toLocaleString()} rows.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
