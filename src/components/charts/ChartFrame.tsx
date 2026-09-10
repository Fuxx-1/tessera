import { useId, type ReactNode } from "react";
import type { HTMLAttributes } from "react";
import { cx } from "../../utils/cx";
import "./styles/chart-frame.css";

type ChartFrameProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children: ReactNode;
  title?: string;
  summary?: string;
  loading?: boolean;
  error?: ReactNode;
  empty?: boolean;
  emptyText?: string;
  loadingText?: string;
  notice?: ReactNode;
};

export function ChartFrame({
  children,
  className,
  empty,
  emptyText = "No chart data",
  error,
  loading,
  loadingText = "Loading chart",
  notice,
  summary,
  title,
  ...props
}: ChartFrameProps) {
  const titleId = useId();
  const summaryId = useId();
  const hasState = loading || error || empty;

  return (
    <div
      aria-busy={loading || undefined}
      aria-describedby={summary ? summaryId : undefined}
      aria-labelledby={title ? titleId : undefined}
      className={cx("c-chart", hasState && "c-chart--has-state", className)}
      role="figure"
      {...props}
    >
      {title || summary ? (
        <div className="c-chart__header">
          {title ? <h3 id={titleId}>{title}</h3> : null}
          {summary ? <p id={summaryId}>{summary}</p> : null}
        </div>
      ) : null}

      <div className="c-chart__body">
        {children}
        {notice && !hasState ? (
          <p aria-live="polite" className="c-chart__notice">
            {notice}
          </p>
        ) : null}
        {hasState ? (
          <div aria-live={error ? "assertive" : "polite"} className="c-chart__state" role={error ? "alert" : "status"}>
            <strong>{error ? "Chart error" : loading ? loadingText : emptyText}</strong>
            {error ? <p>{error}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
