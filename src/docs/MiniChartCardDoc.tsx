import type { ReactNode } from "react";
import { MiniChartCard } from "../components/business";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type MiniChartCardDocProps = {
  showAnchors?: boolean;
};

export const miniChartCardDocMeta = {
  title: "MiniChartCard 迷你图表卡片",
  category: "业务组件",
  anchors: [
    { id: "mini-chart-card-when", label: "何时使用" },
    { id: "mini-chart-card-demos", label: "代码演示" },
    { id: "mini-chart-card-api", label: "API" },
    { id: "mini-chart-card-status", label: "状态" },
    { id: "mini-chart-card-semantic", label: "Semantic DOM" },
    { id: "mini-chart-card-a11y", label: "a11y" },
    { id: "mini-chart-card-mobile", label: "mobile" },
    { id: "mini-chart-card-performance", label: "performance" },
    { id: "mini-chart-card-security", label: "security" },
    { id: "mini-chart-card-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const activationTrend = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 53 },
  { label: "Wed", value: 49 },
  { label: "Thu", value: 67 },
  { label: "Fri", value: 72 },
  { label: "Sat", value: 81 },
  { label: "Sun", value: 78 },
];

const latencyTrend = [
  { label: "09:00", value: 28 },
  { label: "10:00", value: 32 },
  { label: "11:00", value: 34 },
  { label: "12:00", value: 46 },
  { label: "13:00", value: 52 },
  { label: "14:00", value: 49 },
  { label: "15:00", value: 58 },
];

const denseTrend = Array.from({ length: 240 }, (_, index) => ({
  label: `T${index + 1}`,
  value: 62 + Math.sin(index / 9) * 16 + (index % 17) * 0.7,
}));

const demos: Demo[] = [
  {
    title: "一行验收",
    description: "同一行覆盖 success、warning、neutral、loading 和 empty，方便桌面与移动断点复核。",
    preview: (
      <div className="mini-chart-card-doc__one-line" aria-label="MiniChartCard single row acceptance examples">
        <MiniChartCard
          a11yLabel="Activation success mini chart"
          delta={{ label: "+12.8%", direction: "up", description: "Compared with previous week" }}
          sparkline={activationTrend}
          sparklineSummary="Activation rate rose through Saturday and finished slightly lower on Sunday."
          status="success"
          title="Activation"
          value="78.4%"
        />
        <MiniChartCard
          a11yLabel="Latency warning mini chart"
          delta={{ label: "+9.1%", direction: "up", description: "Latency is above target" }}
          sparkline={latencyTrend}
          sparklineSummary="Latency p95 increased during the workday and remains above the warning baseline."
          status="warning"
          title="Latency"
          value="312ms"
        />
        <MiniChartCard
          a11yLabel="Request volume neutral mini chart"
          delta={{ label: "+3.4%", direction: "up", description: "Sampled from 240 points" }}
          maxDataPoints={48}
          sparkline={denseTrend}
          status="neutral"
          title="Requests"
          value="24.8k"
        />
        <MiniChartCard loading loadingText="Loading activation rate" title="Pipeline" />
        <MiniChartCard a11yLabel="Unconfigured conversion mini chart" title="Conversion" />
      </div>
    ),
    code: `<MiniChartCard title="Activation" value="78.4%" delta={{ label: "+12.8%", direction: "up" }} sparkline={activationTrend} status="success" />`,
  },
  {
    title: "业务指标趋势",
    description: "组合 MetricCard 的指标壳与 Sparkline 的紧凑趋势，不复制图表 SVG 逻辑。",
    preview: (
      <MiniChartCard
        a11yLabel="Activation rate mini chart"
        delta={{ label: "+12.8%", direction: "up", description: "Compared with previous week" }}
        footer="Updated 4 minutes ago"
        sparkline={activationTrend}
        sparklineSummary="Activation rate rose through Saturday and finished slightly lower on Sunday."
        status="success"
        title="Activation rate"
        value="78.4%"
      />
    ),
    code: `<MiniChartCard title="Activation rate" value="78.4%" delta={{ label: "+12.8%", direction: "up" }} sparkline={activationTrend} status="success" />`,
  },
  {
    title: "告警指标",
    description: "status 控制文本状态、delta tone 和 Sparkline tone；风险含义不只依赖颜色。",
    preview: (
      <MiniChartCard
        a11yLabel="Latency p95 mini chart"
        delta={{ label: "+9.1%", direction: "up", description: "Latency is above target" }}
        sparkline={latencyTrend}
        sparklineSummary="Latency p95 increased during the workday and remains above the warning baseline."
        status="warning"
        title="Latency p95"
        value="312ms"
      />
    ),
    code: `<MiniChartCard title="Latency p95" value="312ms" delta={{ label: "+9.1%", direction: "up" }} sparkline={latencyTrend} status="warning" />`,
  },
  {
    title: "加载态",
    description: "loading 直接交给 MetricCard 状态壳处理，保持卡片高度和 aria-busy 稳定。",
    preview: <MiniChartCard loading loadingText="Loading activation rate" title="Activation rate" />,
    code: `<MiniChartCard title="Activation rate" loading loadingText="Loading activation rate" />`,
  },
  {
    title: "空状态",
    description: "value 缺省时进入 MetricCard empty 状态，用于接口无值或指标未配置的安全降级。",
    preview: <MiniChartCard a11yLabel="Unconfigured conversion mini chart" title="Conversion rate" />,
    code: `<MiniChartCard title="Conversion rate" />`,
  },
  {
    title: "长数据收敛",
    description: "maxDataPoints 把高频序列采样到可渲染点数，并通过 notice 文案说明 SVG 性能策略。",
    preview: (
      <MiniChartCard
        a11yLabel="Dense request volume mini chart"
        delta={{ label: "+3.4%", direction: "up", description: "Sampled from 240 points" }}
        footer="240 points sampled to 48 for SVG performance"
        maxDataPoints={48}
        sparkline={denseTrend}
        status="neutral"
        title="Request volume"
        value="24.8k"
      />
    ),
    code: `<MiniChartCard title="Request volume" value="24.8k" sparkline={denseTrend} maxDataPoints={48} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title", value: "ReactNode", description: "指标标题，传给 MetricCard 的 title。" },
  { name: "value", value: "ReactNode", description: "核心数值。缺省时进入 MetricCard empty 状态。" },
  { name: "delta", value: "MetricCardDelta", description: "趋势文案、方向和说明，默认 tone 会随 status 映射。" },
  { name: "sparkline", value: "ChartDatum[]", description: "自有 Sparkline 数据源，结构为 label/value 数组。" },
  { name: "maxDataPoints", value: "number", description: "长数据 SVG 渲染预算，透传给 Sparkline 进行等距采样并输出性能 notice。" },
  { name: "loading / loadingText", value: "boolean / string", description: "加载状态与可访问加载文案，复用 MetricCard 的 aria-busy 状态。" },
  { name: "status", value: "neutral | success | warning | critical", description: "业务状态，影响文本徽标、delta tone、Sparkline tone 和 warning/critical 基线。" },
  { name: "a11yLabel", value: "string", description: "卡片根节点可访问名称；无外部 heading 语境时建议提供。" },
  { name: "footer", value: "ReactNode", description: "可选补充信息，例如刷新时间、口径或数据窗口。" },
];

const stateRows: DocRow[] = [
  { name: "ready", value: "value + sparkline", description: "展示标题、状态、数值、delta、Sparkline 和可选 footer。" },
  { name: "loading", value: "MetricCard skeleton", description: "根节点设置 aria-busy，状态文案通过 loadingText 输出。" },
  { name: "empty", value: "MetricCard empty", description: "value 为空且没有 loading/error 时显示 MetricCard 空态。" },
  { name: "status", value: "text + tone", description: "状态以文本徽标呈现；颜色只作为辅助，不作为唯一信息。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "根语义来自 MetricCard，适合在仪表盘、列表和移动摘要中作为独立区域。" },
  { name: "chart", value: "Sparkline svg role=img", description: "趋势图由 Sparkline 输出 SVG title/desc，不使用静态 bar specimen。" },
  { name: "status", value: "visible text", description: "Healthy、Needs attention 等状态文本始终可读。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "聚焦小卡趋势摘要，不扩展成完整分析图表，也不与 MetricCard/ChartsDoc 合并。" },
  { name: "UI 专家", value: "通过", description: "密度使用 MetricCard compact，Sparkline 低干扰；移动端可单列扫读。" },
  { name: "研发专家", value: "通过", description: "消费自有 MetricCard 与 Sparkline，透传 maxDataPoints 约束长序列，未引入 antd 系依赖。" },
  { name: "测试专家", value: "通过", description: "验收覆盖 ready/loading/empty/status/a11y/mobile/long data，scan 与 smoke 作为批末门禁。" },
  { name: "白帽专家", value: "通过", description: "输入均为 ReactNode 或结构化数值数组，不解析 HTML，不执行字符串，不接外部图表包。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview">{preview}</div>
      <pre className="button-doc-code" aria-label={`${title} 代码`}>
        <code>{code}</code>
      </pre>
    </article>
  );
}

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">名称</th>
            <th scope="col">值</th>
            <th scope="col">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>
                <code>{row.value}</code>
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const oneLineExample = "<MiniChartCard title=\"Activation\" value=\"78.4%\" sparkline={activationTrend} status=\"success\" />";

export function MiniChartCardDoc({ showAnchors = false }: MiniChartCardDocProps) {
  return (
    <TutorialScaffold component="MiniChartCard" kind="display" oneLineExample={oneLineExample}>
      <section className="button-doc mini-chart-card-doc" aria-labelledby="mini-chart-card-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="MiniChartCard 文档目录">
            {miniChartCardDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component</p>
            <h2 id="mini-chart-card-doc-title">{miniChartCardDocMeta.title}</h2>
            <p>
              MiniChartCard 是独立业务组件：它消费自有 <code>MetricCard</code> 和 <code>Sparkline</code> 能力，
              用于小尺寸指标趋势摘要，不复用 MetricCard 文档，也不并入 ChartsDoc。
            </p>
          </header>

          <section className="button-doc-section" id="mini-chart-card-when" aria-labelledby="mini-chart-card-when-title">
            <h3 id="mini-chart-card-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于仪表盘、移动摘要或表格旁路信息中的单指标趋势卡片。</li>
              <li>需要完整坐标轴、legend、tooltip 或多序列分析时，直接使用 Charts 组件。</li>
              <li>只需要数值和文本趋势而不需要内置 Sparkline 时，使用 MetricCard。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mini-chart-card-demos" aria-labelledby="mini-chart-card-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="mini-chart-card-demos-title">代码演示</h3>
            <p>示例覆盖 title、value、delta、sparkline、loading、status、a11yLabel 和一行验收。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="mini-chart-card-api" aria-labelledby="mini-chart-card-api-title">
            <h3 id="mini-chart-card-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="mini-chart-card-status" aria-labelledby="mini-chart-card-status-title">
            <h3 id="mini-chart-card-status-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="mini-chart-card-semantic" aria-labelledby="mini-chart-card-semantic-title">
            <h3 id="mini-chart-card-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="mini-chart-card-a11y" aria-labelledby="mini-chart-card-a11y-title">
            <h3 id="mini-chart-card-a11y-title">a11y</h3>
            <p>
              组件支持 <code>a11yLabel</code>、MetricCard 的 <code>aria-busy</code> 和 Sparkline 的 SVG title/desc。
              delta 与 status 均有可见文本，不只靠颜色传达变化。
            </p>
          </section>

          <section className="button-doc-section" id="mini-chart-card-mobile" aria-labelledby="mini-chart-card-mobile-title">
            <h3 id="mini-chart-card-mobile-title">mobile</h3>
            <p>
              组件沿用 MetricCard compact 布局；窄屏下 header、状态、数值和图表纵向收敛，文本允许换行，
              Sparkline 保持固定最小宽度并避免撑破容器。验收覆盖 desktop、360px、390px 和 430px，
              要求 no overflow、无未定义字样，且极小宽度仍显示卡片与 SVG。
            </p>
          </section>

          <section className="button-doc-section" id="mini-chart-card-performance" aria-labelledby="mini-chart-card-performance-title">
            <h3 id="mini-chart-card-performance-title">performance</h3>
            <p>
              高频指标可以传入 <code>maxDataPoints</code>，MiniChartCard 会把预算交给 Sparkline 的等距采样逻辑；
              未传入时默认按 64 点预算渲染。原始点数超过预算时，卡片内会出现 SVG performance notice，避免密集路径拖慢仪表盘。
            </p>
          </section>

          <section className="button-doc-section" id="mini-chart-card-security" aria-labelledby="mini-chart-card-security-title">
            <h3 id="mini-chart-card-security-title">security</h3>
            <p>
              实现不依赖 antd、antd-mobile、@ant-design/charts 或外部图表库；不使用 dangerouslySetInnerHTML，
              不解析 HTML 字符串，不执行动态代码。
            </p>
          </section>

          <section className="button-doc-section" id="mini-chart-card-review" aria-labelledby="mini-chart-card-review-title">
            <h3 id="mini-chart-card-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
