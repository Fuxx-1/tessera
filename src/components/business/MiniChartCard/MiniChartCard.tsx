import type { HTMLAttributes, ReactNode } from "react";
import { Sparkline, type ChartDatum, type ChartTone } from "../../charts";
import { cx } from "../../../utils/cx";
import { MetricCard, type MetricCardDelta, type MetricCardTone } from "../MetricCard";
import "./MiniChartCard.css";

export type MiniChartCardStatus = "neutral" | "success" | "warning" | "critical";

export type MiniChartCardDelta = MetricCardDelta;

const defaultMaxDataPoints = 64;

export interface MiniChartCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  value?: ReactNode;
  delta?: MiniChartCardDelta;
  sparkline?: ChartDatum[];
  sparklineLabel?: string;
  sparklineSummary?: string;
  maxDataPoints?: number;
  loading?: boolean;
  loadingText?: string;
  status?: MiniChartCardStatus;
  a11yLabel?: string;
  footer?: ReactNode;
}

const statusToDeltaTone: Record<MiniChartCardStatus, MetricCardTone> = {
  neutral: "neutral",
  success: "positive",
  warning: "warning",
  critical: "critical",
};

const statusToSparklineTone: Record<MiniChartCardStatus, ChartTone> = {
  neutral: "neutral",
  success: "sage",
  warning: "amber",
  critical: "clay",
};

const statusLabels: Record<MiniChartCardStatus, string> = {
  neutral: "Stable",
  success: "Healthy",
  warning: "Needs attention",
  critical: "Critical",
};

export function MiniChartCard({
  a11yLabel,
  className,
  delta,
  footer,
  loading = false,
  loadingText = "Loading mini chart metric",
  maxDataPoints = defaultMaxDataPoints,
  sparkline = [],
  sparklineLabel,
  sparklineSummary,
  status = "neutral",
  title,
  value,
  ...props
}: MiniChartCardProps) {
  const resolvedDelta = delta
    ? {
        ...delta,
        tone: delta.tone ?? statusToDeltaTone[status],
      }
    : undefined;
  const resolvedSparklineLabel = sparklineLabel ?? `${typeof title === "string" ? title : "Metric"} sparkline`;

  return (
    <MetricCard
      aria-label={a11yLabel}
      chart={
        <Sparkline
          ariaLabel={resolvedSparklineLabel}
          data={sparkline}
          loading={loading}
          maxDataPoints={maxDataPoints}
          showBaseline={status === "warning" || status === "critical"}
          size="xs"
          summary={sparklineSummary}
          tone={statusToSparklineTone[status]}
          trendLabel={typeof delta?.label === "string" ? delta.label : undefined}
        />
      }
      chartLabel={resolvedSparklineLabel}
      className={cx("b-mini-chart-card", `b-mini-chart-card--${status}`, className)}
      density="compact"
      delta={resolvedDelta}
      eyebrow={
        <span className={cx("b-mini-chart-card__status", `b-mini-chart-card__status--${status}`)}>
          {statusLabels[status]}
        </span>
      }
      footer={footer}
      loading={loading}
      loadingText={loadingText}
      title={title}
      value={value}
      {...props}
    />
  );
}
