import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./style.css";

export type StepStatus = "wait" | "process" | "finish" | "error";
export type StepsDirection = "horizontal" | "vertical";

export interface StepItem {
  ariaLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  key?: string;
  status?: StepStatus;
  subTitle?: ReactNode;
  title: ReactNode;
}

export interface StepsProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  ariaLabel?: string;
  current?: number;
  direction?: StepsDirection;
  items: StepItem[];
  onChange?: (index: number) => void;
}

function resolveStatus(item: StepItem, index: number, current: number): StepStatus {
  if (item.status) {
    return item.status;
  }

  if (index < current) {
    return "finish";
  }

  if (index === current) {
    return "process";
  }

  return "wait";
}

const statusLabels: Record<StepStatus, string> = {
  error: "Error",
  finish: "Finished",
  process: "Current",
  wait: "Waiting",
};

function clampCurrent(current: number, itemCount: number) {
  if (itemCount === 0) {
    return -1;
  }

  return Math.min(Math.max(current, 0), itemCount - 1);
}

export function Steps({
  ariaLabel = "Steps",
  className,
  current = 0,
  direction = "horizontal",
  items,
  onChange,
  ...props
}: StepsProps) {
  const activeIndex = clampCurrent(current, items.length);

  return (
    <nav aria-label={ariaLabel} className={cx("c-steps", `c-steps--${direction}`, className)} {...props}>
      <ol className="c-steps__list">
        {items.map((item, index) => {
          const status = resolveStatus(item, index, activeIndex);
          const canSelect = Boolean(onChange) && !item.disabled;
          const isCurrent = index === activeIndex;
          const statusLabel = statusLabels[status];
          const itemLabel = item.ariaLabel;
          const content = (
            <>
              <span aria-hidden="true" className="c-steps__marker">
                {status === "finish" ? "✓" : status === "error" ? "!" : index + 1}
              </span>
              <span className="c-steps__body">
                <span className="c-steps__title">
                  <span>{item.title}</span>
                  {item.subTitle ? <span className="c-steps__subtitle">{item.subTitle}</span> : null}
                </span>
                {item.description ? <span className="c-steps__description">{item.description}</span> : null}
                <span className="c-sr-only">{statusLabel}</span>
              </span>
            </>
          );

          return (
            <li
              className={cx("c-steps__item", `c-steps__item--${status}`, item.disabled && "c-steps__item--disabled")}
              data-current={isCurrent || undefined}
              data-status={status}
              key={item.key ?? index}
            >
              {canSelect ? (
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={itemLabel}
                  className="c-steps__button"
                  onClick={() => onChange?.(index)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={item.disabled ? "true" : undefined}
                  aria-label={itemLabel}
                  className="c-steps__static"
                  role="group"
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
