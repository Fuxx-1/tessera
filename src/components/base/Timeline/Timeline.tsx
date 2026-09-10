import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type TimelineStatus = "default" | "success" | "processing" | "pending" | "warning" | "error";
export type TimelineMode = "left" | "right" | "alternate";

export interface TimelineItem {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  dot?: ReactNode;
  key?: string;
  pending?: boolean;
  status?: TimelineStatus;
  time?: ReactNode;
  title: ReactNode;
}

export interface TimelineProps extends Omit<HTMLAttributes<HTMLOListElement>, "dangerouslySetInnerHTML"> {
  ariaLabel?: string;
  items: TimelineItem[];
  mode?: TimelineMode;
  pending?: ReactNode | boolean;
  pendingDot?: ReactNode;
  reverse?: boolean;
}

const statusLabels: Record<TimelineStatus, string> = {
  default: "Default",
  error: "Error",
  pending: "Pending",
  processing: "Processing",
  success: "Success",
  warning: "Warning",
};

function getItemAriaLabel(item: TimelineItem, visualIndex: number, total: number, status: TimelineStatus) {
  return item.ariaLabel ?? `Timeline item ${visualIndex + 1} of ${total}: ${statusLabels[status]}`;
}

export function Timeline({
  ariaLabel = "Timeline",
  className,
  items,
  mode = "left",
  pending,
  pendingDot,
  reverse = false,
  ...props
}: TimelineProps) {
  const renderedItems = pending
    ? [
        ...items,
        {
          key: "__timeline_pending__",
          pending: true,
          status: "pending" as const,
          title: pending === true ? "Pending" : pending,
          dot: pendingDot,
        },
      ]
    : items;
  const orderedItems = reverse ? [...renderedItems].reverse() : renderedItems;

  return (
    <ol
      aria-label={ariaLabel}
      className={cx("c-timeline", `c-timeline--${mode}`, reverse && "c-timeline--reverse", className)}
      {...props}
    >
      {orderedItems.map((item, index) => {
        const status = item.status ?? (item.pending ? "pending" : "default");
        const hasCustomDot = item.dot !== undefined;

        return (
          <li
            aria-label={getItemAriaLabel(item, index, orderedItems.length, status)}
            className={cx(
              "c-timeline__item",
              `c-timeline__item--${status}`,
              hasCustomDot && "c-timeline__item--custom-dot",
              item.className,
            )}
            data-status={status}
            key={item.key ?? index}
          >
            <div aria-hidden="true" className="c-timeline__rail">
              <span className="c-timeline__dot">{hasCustomDot ? item.dot : null}</span>
            </div>
            <div className="c-timeline__content">
              {item.time !== undefined ? <span className="c-timeline__time">{item.time}</span> : null}
              <div className="c-timeline__title">{item.title}</div>
              {item.children !== undefined ? <div className="c-timeline__body">{item.children}</div> : null}
              <span className="c-sr-only">{statusLabels[status]}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
