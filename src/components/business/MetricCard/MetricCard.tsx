import { useId, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "../../../utils/cx";
import "./MetricCard.css";

export type MetricCardTone = "neutral" | "positive" | "warning" | "critical";
export type MetricCardDeltaDirection = "up" | "down" | "flat";
export type MetricCardDensity = "comfortable" | "compact";

export interface MetricCardDelta {
  label: ReactNode;
  tone?: MetricCardTone;
  direction?: MetricCardDeltaDirection;
  description?: ReactNode;
}

export interface MetricCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  eyebrow?: ReactNode;
  value?: ReactNode;
  unit?: ReactNode;
  description?: ReactNode;
  delta?: MetricCardDelta;
  chart?: ReactNode;
  chartLabel?: string;
  density?: MetricCardDensity;
  extra?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  error?: ReactNode;
  empty?: ReactNode;
  emptyDescription?: ReactNode;
}

export function MetricCard({
  chart,
  chartLabel = "Metric trend",
  className,
  density = "comfortable",
  delta,
  description,
  emptyDescription,
  empty = "No metric data",
  eyebrow,
  error,
  extra,
  footer,
  loading = false,
  loadingText = "Loading metric",
  title,
  unit,
  value,
  ...props
}: MetricCardProps) {
  const titleId = useId();
  const isEmpty = !loading && !error && (value === undefined || value === null || value === "");
  const deltaTone = delta?.tone ?? "neutral";
  const deltaDirection = delta?.direction ?? "flat";
  const stateLabel = loading ? loadingText : error ? "Metric error" : isEmpty ? "Metric empty" : undefined;
  const directionLabel = deltaDirection === "up" ? "increased" : deltaDirection === "down" ? "decreased" : "unchanged";

  return (
    <section
      className={cx("b-metric-card", `b-metric-card--${density}`, className)}
      aria-busy={loading || undefined}
      aria-labelledby={props["aria-label"] || props["aria-labelledby"] ? undefined : titleId}
      data-state={loading ? "loading" : error ? "error" : isEmpty ? "empty" : "ready"}
      {...props}
    >
      <header className="b-metric-card__header">
        <div>
          {eyebrow ? <span className="b-metric-card__eyebrow">{eyebrow}</span> : null}
          <h2 className="b-metric-card__title" id={titleId}>
            {title}
          </h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="b-metric-card__header-actions">
          {delta && !loading && !error ? (
            <span
              className={cx(
                "b-metric-card__delta",
                `b-metric-card__delta--${deltaTone}`,
                `b-metric-card__delta--${deltaDirection}`,
              )}
              aria-label={`Trend ${directionLabel}: ${getAccessibleText(delta.label)}${delta.description ? `. ${getAccessibleText(delta.description)}` : ""}`}
              title={typeof delta.description === "string" ? delta.description : undefined}
            >
              <span aria-hidden="true" className="b-metric-card__delta-icon" />
              <span className="b-metric-card__delta-label">{delta.label}</span>
              {delta.description ? <span className="b-metric-card__delta-description">{delta.description}</span> : null}
            </span>
          ) : null}
          {extra ? <div className="b-metric-card__extra">{extra}</div> : null}
        </div>
      </header>

      {loading ? (
        <div className="b-metric-card__skeleton" role="status" aria-label={stateLabel}>
          <span />
          <span />
          <span />
          <strong>{loadingText}</strong>
        </div>
      ) : error ? (
        <div className="b-business-state b-business-state--error" role="alert" aria-label={stateLabel}>
          {error}
        </div>
      ) : isEmpty ? (
        <div className="b-business-state" role="status" aria-label={stateLabel}>
          <strong>{empty}</strong>
          {emptyDescription ? <span>{emptyDescription}</span> : null}
        </div>
      ) : (
        <>
          <div className="b-metric-card__value-row">
            <strong>{value}</strong>
            {unit ? <span>{unit}</span> : null}
          </div>
          {chart ? (
            <div className="b-metric-card__chart" role="group" aria-label={chartLabel}>
              {chart}
            </div>
          ) : (
            <div className="b-metric-card__chart b-metric-card__chart--fallback" role="img" aria-label={`${chartLabel} unavailable`}>
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {footer ? <div className="b-metric-card__footer">{footer}</div> : null}
        </>
      )}
    </section>
  );
}

function getAccessibleText(value: ReactNode) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "custom content";
}
