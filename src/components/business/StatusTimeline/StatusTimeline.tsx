import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./StatusTimeline.css";

export type StatusTimelineState = "complete" | "current" | "pending" | "error" | "warning";
export type StatusTimelineDensity = "comfortable" | "compact";

export interface StatusTimelineItem {
  id: string;
  title: ReactNode;
  time?: ReactNode;
  dateTime?: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  state?: StatusTimelineState;
  stateLabel?: string;
  ariaLabel?: string;
}

export interface StatusTimelineProps extends Omit<HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  items: StatusTimelineItem[];
  density?: StatusTimelineDensity;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  loadingLabel?: string;
  stateLabels?: Partial<Record<StatusTimelineState, string>>;
}

const defaultStateLabels: Record<StatusTimelineState, string> = {
  complete: "Complete",
  current: "Current",
  pending: "Pending",
  error: "Error",
  warning: "Warning",
};

function getTimelineAriaLabel(title: ReactNode, stateLabel: string) {
  if (typeof title === "string" || typeof title === "number") {
    return `${stateLabel}: ${title}`;
  }

  return stateLabel;
}

export function StatusTimeline({
  actions,
  className,
  density = "comfortable",
  description,
  empty = "No timeline events",
  error,
  items,
  loading = false,
  loadingLabel = "Loading timeline",
  stateLabels,
  title,
  ...props
}: StatusTimelineProps) {
  const resolvedStateLabels = { ...defaultStateLabels, ...stateLabels };

  return (
    <section
      className={cx("b-status-timeline", `b-status-timeline--${density}`, className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {title || description || actions ? (
        <header className="b-status-timeline__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? (
            <div className="b-status-timeline__actions" aria-label="Timeline actions">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      {loading ? (
        <div className="b-status-timeline__skeleton" role="status" aria-label={loadingLabel}>
          <span />
          <span />
          <span />
        </div>
      ) : error ? (
        <div className="b-business-state b-business-state--error" role="alert">{error}</div>
      ) : items.length === 0 ? (
        <div className="b-business-state" role="status">{empty}</div>
      ) : (
        <ol className="b-status-timeline__list">
          {items.map((item) => {
            const state = item.state ?? "pending";
            const stateLabel = item.stateLabel ?? resolvedStateLabels[state];
            return (
              <li
                className={cx("b-status-timeline__item", `b-status-timeline__item--${state}`)}
                key={item.id}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={item.ariaLabel ?? getTimelineAriaLabel(item.title, stateLabel)}
              >
                <span className="b-status-timeline__marker" aria-hidden="true" />
                <div className="b-status-timeline__content">
                  <div className="b-status-timeline__row">
                    <div className="b-status-timeline__title">
                      <strong>{item.title}</strong>
                      <span>{stateLabel}</span>
                    </div>
                    {item.time ? <time dateTime={item.dateTime}>{item.time}</time> : null}
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.meta || item.actions ? (
                    <div className="b-status-timeline__meta">
                      {item.meta ? <div className="b-status-timeline__meta-items">{item.meta}</div> : null}
                      {item.actions ? (
                        <div className="b-status-timeline__item-actions" aria-label={`${stateLabel} item actions`}>
                          {item.actions}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
