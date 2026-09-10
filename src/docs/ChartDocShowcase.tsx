import type { ReactNode } from "react";
import { AreaChart, BarChart, LineChart, PieChart, Sparkline } from "../components/charts";

export type ChartDocFocus = "line-chart" | "area-chart" | "bar-chart" | "pie-chart" | "sparkline";

type ChartDocShowcaseProps = {
  focus: ChartDocFocus;
  showAnchors?: boolean;
};

type DemoCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const trendData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 76 },
  { label: "Fri", value: 68 },
  { label: "Sat", value: 92 },
  { label: "Sun", value: 84 },
];

const signedData = [
  { label: "North America", value: 32 },
  { label: "Europe", value: -12 },
  { label: "Asia Pacific", value: 46 },
  { label: "Latin America", value: 18 },
  { label: "Middle East", value: -7 },
  { label: "Africa", value: 14 },
];

const mixData = [
  { label: "Base", value: 42 },
  { label: "Business", value: 26 },
  { label: "Docs", value: 22 },
  { label: "Research", value: 10 },
];

const compactTrends = [
  {
    label: "Activation",
    value: "42.8%",
    trend: "+6.4%",
    tone: "sage" as const,
    data: trendData,
  },
  {
    label: "Latency",
    value: "128 ms",
    trend: "-12 ms",
    tone: "clay" as const,
    data: [
      { label: "Mon", value: 144 },
      { label: "Tue", value: 138 },
      { label: "Wed", value: 132 },
      { label: "Thu", value: 126 },
      { label: "Fri", value: 128 },
    ],
  },
  {
    label: "Coverage",
    value: "91%",
    trend: "+3%",
    tone: "amber" as const,
    data: [
      { label: "Mon", value: 72 },
      { label: "Tue", value: 76 },
      { label: "Wed", value: 84 },
      { label: "Thu", value: 88 },
      { label: "Fri", value: 91 },
    ],
  },
  {
    label: "Errors",
    value: "0.18%",
    trend: "-0.04%",
    tone: "plum" as const,
    data: [
      { label: "Mon", value: 0.29 },
      { label: "Tue", value: 0.24 },
      { label: "Wed", value: 0.22 },
      { label: "Thu", value: 0.17 },
      { label: "Fri", value: 0.18 },
    ],
  },
];

const focusLabel: Record<ChartDocFocus, string> = {
  "line-chart": "LineChart",
  "area-chart": "AreaChart",
  "bar-chart": "BarChart",
  "pie-chart": "PieChart",
  sparkline: "Sparkline",
};

function DemoCard({ children, description, title }: DemoCardProps) {
  return (
    <article className="charts-doc-demo">
      <div className="charts-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="charts-doc-demo__preview">{children}</div>
    </article>
  );
}

export function ChartDocShowcase({ focus, showAnchors = false }: ChartDocShowcaseProps) {
  const titleId = `${focus}-rendered-examples-title`;
  const className = showAnchors ? "chart-doc-showcase chart-doc-showcase--with-anchors" : "chart-doc-showcase";

  return (
    <section className={className} aria-labelledby={titleId}>
      <div className="button-doc__content">
        <section className="button-doc-section" id={`${focus}-rendered-examples`} aria-labelledby={titleId}>
          <div className="button-doc-section__heading">
            <h3 id={titleId}>{focusLabel[focus]} 独立渲染示例</h3>
            <p>每个图表文档页都直接渲染自有 SVG 组件，用于验证生产入口、状态语义和移动端横向滚动边界。</p>
          </div>
          <div className="charts-doc-demo-grid">
            <DemoCard title="LineChart trend" description="连续趋势、网格、点位 title 与可访问 summary。">
              <LineChart
                data={trendData}
                scale={{ tickCount: 4, yDomain: [0, 100] }}
                summary="Weekly usage rises from Monday to Saturday, then eases on Sunday."
                title="Weekly usage"
                xLabelMaxLength={8}
              />
            </DemoCard>
            <DemoCard title="AreaChart coverage" description="面积填充表达趋势强度，零基线收敛。">
              <AreaChart
                data={trendData}
                fillOpacity={0.24}
                scale={{ includeZero: true, tickCount: 4 }}
                summary="Coverage strengthens during the week and remains above the starting level."
                title="Coverage trend"
              />
            </DemoCard>
            <DemoCard title="BarChart signed values" description="正负值、零基线、截断长标签和数值格式化。">
              <BarChart
                data={signedData}
                labelFormatter={(label) => label.split(" ")[0]}
                showValues
                summary="Asia Pacific leads at 46, while Europe and Middle East are below zero."
                tickCount={5}
                title="Regional delta"
                valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}%`}
                yDomain={[-20, 60]}
              />
            </DemoCard>
            <DemoCard title="PieChart share" description="少量占比、legend、正值过滤和切片 title。">
              <PieChart data={mixData} summary="Base and business components make up the largest share." title="Component mix" />
            </DemoCard>
            <DemoCard title="Sparkline compact" description="指标列表中的紧凑趋势，端点和趋势标签保留。">
              <Sparkline ariaLabel="Release confidence compact trend" data={trendData} showBaseline size="xs" trendLabel="+12%" />
            </DemoCard>
          </div>
        </section>
      </div>
    </section>
  );
}

export function SparklineProductionShowcase() {
  return (
    <section className="chart-doc-showcase" aria-labelledby="sparkline-production-title">
      <div className="button-doc__content">
        <section className="button-doc-section" id="sparkline-production" aria-labelledby="sparkline-production-title">
          <div className="button-doc-section__heading">
            <h3 id="sparkline-production-title">Sparkline 移动密度与状态</h3>
            <p>专项样例覆盖 xs 紧凑高度、端点、基线、趋势标签，以及 empty/loading/error 状态文案。</p>
          </div>
          <div className="sparkline-doc-strip" aria-label="Sparkline mobile density examples">
            {compactTrends.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <Sparkline
                  ariaLabel={`${item.label} mobile row trend`}
                  data={item.data}
                  showBaseline
                  size="xs"
                  tone={item.tone}
                  trendLabel={item.trend}
                />
              </div>
            ))}
          </div>
          <div className="charts-doc-state-grid">
            <Sparkline ariaLabel="Baseline sparkline example" baselineValue={58} data={trendData} showBaseline size="xs" trendLabel="+18%" />
            <Sparkline ariaLabel="Empty sparkline state" data={[]} emptyText="No compact trend" size="xs" />
            <Sparkline ariaLabel="Loading sparkline state" data={trendData} loading loadingText="Loading trend" size="xs" />
            <Sparkline ariaLabel="Error sparkline state" data={trendData} error="Trend service unavailable." size="xs" />
          </div>
        </section>
      </div>
    </section>
  );
}
