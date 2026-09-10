import type { ReactNode } from "react";
import { Tag } from "../components/base";
import { MetricCard } from "../components/business";
import { Sparkline } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
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

export type MetricCardDocProps = {
  showAnchors?: boolean;
};

export const metricCardDocMeta = {
  title: "MetricCard 指标卡片",
  category: "业务组件",
  anchors: [
    { id: "metric-card-when", label: "何时使用" },
    { id: "metric-card-demos", label: "代码演示" },
    { id: "metric-card-api", label: "API" },
    { id: "metric-card-status", label: "状态" },
    { id: "metric-card-semantic", label: "Semantic DOM" },
    { id: "metric-card-token", label: "Design Token" },
    { id: "metric-card-a11y", label: "a11y" },
    { id: "metric-card-mobile", label: "mobile" },
    { id: "metric-card-security", label: "security" },
    { id: "metric-card-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<MetricCard title="Net revenue" value="$1.28M" unit="USD" />`;

const revenueTrend = [
  { label: "Mon", value: 128 },
  { label: "Tue", value: 136 },
  { label: "Wed", value: 142 },
  { label: "Thu", value: 151 },
  { label: "Fri", value: 169 },
  { label: "Sat", value: 164 },
  { label: "Sun", value: 178 },
];

const qualityTrend = [
  { label: "W1", value: 96 },
  { label: "W2", value: 93 },
  { label: "W3", value: 90 },
  { label: "W4", value: 87 },
  { label: "W5", value: 83 },
  { label: "W6", value: 79 },
];

const demos: Demo[] = [
  {
    title: "指标一行验收",
    description: "同一行覆盖 ready、loading、error、empty 和长数字，便于桌面与移动断点复核。",
    preview: (
      <div className="metric-card-doc__one-line" aria-label="MetricCard single row acceptance examples">
        <MetricCard
          chart={
            <Sparkline
              data={revenueTrend}
              height={66}
              summary="Revenue rose during the week and ended at the weekly high."
              title="Revenue weekly trend"
            />
          }
          chartLabel="Revenue weekly trend"
          density="compact"
          delta={{ description: "week over week", direction: "up", label: "+12.8%", tone: "positive" }}
          description="Net revenue, seven day window"
          eyebrow="Revenue"
          footer="Updated 2 minutes ago"
          title="Net revenue"
          unit="USD"
          value="$1,284,932,018.45"
        />
        <MetricCard
          chart={
            <Sparkline
              data={qualityTrend}
              height={66}
              summary="Quality score moved down across six weekly checkpoints."
              title="Quality score trend"
              tone="clay"
            />
          }
          chartLabel="Quality score weekly trend"
          density="compact"
          delta={{ description: "below SLO", direction: "down", label: "-6.3%", tone: "critical" }}
          description="Synthetic checkout health"
          eyebrow="Quality"
          extra={<Tag tone="subtle">Needs review</Tag>}
          footer="SLO target 90%"
          title="Checkout score"
          unit="pts"
          value="79.4"
        />
        <MetricCard density="compact" description="Fetching latest pipeline numbers" loading loadingText="Loading pipeline metric" title="Pipeline" />
        <MetricCard density="compact" description="Vendor feed failed validation" error="Metric source returned invalid totals." title="Forecast" />
        <MetricCard
          density="compact"
          empty="No usage yet"
          emptyDescription="This tenant has no billable events in the selected window."
          title="Billable usage"
        />
      </div>
    ),
    code: `<MetricCard title="Net revenue" eyebrow="Revenue" value="$1,284,932,018.45" unit="USD" delta={{ label: "+12.8%", direction: "up", tone: "positive" }} chart={<Sparkline data={revenueTrend} title="Revenue weekly trend" />} />`,
  },
  {
    title: "无图表降级",
    description: "未传入 chart 时显示自有 fallback，不依赖外部图表库，也不会退化成空白区域。",
    preview: (
      <MetricCard
        chartLabel="Fallback trend"
        delta={{ description: "period over period", direction: "flat", label: "0.0%", tone: "neutral" }}
        description="Fallback preserves chart rhythm while upstream chart data is withheld."
        footer="Fallback is presentational and labelled as unavailable."
        title="Retention"
        unit="%"
        value="86.2"
      />
    ),
    code: `<MetricCard title="Retention" value="86.2" unit="%" delta={{ label: "0.0%", direction: "flat" }} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title", value: "ReactNode", description: "必填指标标题；组件内部渲染为 h2 并默认命名 section。" },
  { name: "eyebrow / description", value: "ReactNode", description: "上方业务域和标题下方口径说明，用于建立指标层级。" },
  { name: "value / unit", value: "ReactNode", description: "核心数值与单位。value 为空时进入 empty 状态，长数字允许换行。" },
  { name: "delta", value: "MetricCardDelta", description: "趋势文案、方向、tone 与补充说明；方向有形状符号，tone 只作辅助。" },
  { name: "chart / chartLabel", value: "ReactNode / string", description: "图表槽位可消费 Sparkline 等自有 Charts；chartLabel 命名图表区域。" },
  { name: "density", value: "comfortable | compact", description: "控制卡片间距和图表高度，适合仪表盘网格或移动摘要。" },
  { name: "extra / footer", value: "ReactNode", description: "extra 放状态标签或动作片段，footer 放刷新时间、口径或阈值说明。" },
  { name: "loading / error / empty", value: "boolean / ReactNode", description: "组件边界内处理加载、错误和空态，不要求业务方拼装状态壳。" },
];

const stateRows: DocRow[] = [
  { name: "ready", value: 'data-state="ready"', description: "展示标题层级、指标值、趋势、图表和 footer。" },
  { name: "loading", value: 'data-state="loading"', description: "根节点同步 aria-busy，骨架带 loadingText 可访问名称和可见文本。" },
  { name: "error", value: 'data-state="error"', description: "错误态优先于空态和 ready 内容，role=alert 明确提示数据不可用。" },
  { name: "empty", value: 'data-state="empty"', description: "当 value 未传、为 null 或为空字符串时出现，role=status 可带 emptyDescription。" },
  { name: "fallback chart", value: "role=img", description: "无 chart 时保留趋势区结构，并声明 chartLabel unavailable。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "业务指标是独立区域；无外部 aria 名称时由内部 h2 命名。" },
  { name: "title", value: "h2", description: "保留仪表盘中可扫描的指标标题层级，不并入 Card 标题。" },
  { name: "delta", value: "visible text + shape", description: "上升、下降、持平通过形状、可见文本和 aria-label 表达，不只靠颜色。" },
  { name: "chart", value: "role=group / role=img", description: "自定义 chart 区域带 chartLabel；fallback 是具名图片语义。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白底、细边框、低阴影，保持 neutral minimal 中性视觉。" },
  { name: "value", value: "30px / 24px compact", description: "核心数值大于标题和说明，compact 下收敛。" },
  { name: "tone", value: "positive / warning / critical", description: "趋势色为低饱和状态色，仅作为文本和形状的辅助。" },
  { name: "radius", value: "8px max", description: "业务卡片保持 8px 圆角边界，不向营销卡片样式扩张。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "独立承担指标、趋势、状态和 chart slot，不与 Statistic/Card 合并。" },
  { name: "UI 专家", value: "通过", description: "层级清晰；长数字、delta、状态标签和图表区在窄屏可换行收敛。" },
  { name: "研发专家", value: "通过", description: "仅消费自有 React 组件和 Sparkline；未引入 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "文档示例覆盖 ready/loading/error/empty/fallback/long number/mobile 断点。" },
  { name: "白帽专家", value: "通过", description: "不解析 HTML 字符串、不执行动态代码；chart 作为 ReactNode 由宿主显式传入。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
    </DemoContainer>
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

export function MetricCardDoc({ showAnchors = false }: MetricCardDocProps) {
  return (
    <TutorialScaffold component="MetricCard" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc metric-card-doc" aria-labelledby="metric-card-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="MetricCard 文档目录">
            {metricCardDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component</p>
            <h2 id="metric-card-doc-title">{metricCardDocMeta.title}</h2>
            <p>
              MetricCard 是生产级业务指标卡片，用于把指标层级、核心数值、趋势、图表槽位和数据状态放在一个稳定边界内。
              它不是 Statistic 的别名，也不是基础 Card 的包装文档。
            </p>
          </header>

          <section className="button-doc-section" id="metric-card-when" aria-labelledby="metric-card-when-title">
            <h3 id="metric-card-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于仪表盘、运营首页、详情摘要中的单个业务指标。</li>
              <li>需要图表槽、delta、状态、刷新口径或移动密度时使用 MetricCard。</li>
              <li>只突出一个数值且不需要卡片级图表或状态组合时，使用 Statistic。</li>
              <li>只需要通用容器、标题和 actions 时，使用 Card。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="metric-card-demos" aria-labelledby="metric-card-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="metric-card-demos-title">代码演示</h3>
              <p>示例覆盖指标层级、趋势、状态、长数字、fallback 和一行验收。</p>
            </div>
            <div className="button-doc-demo-grid metric-card-doc__demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="metric-card-api" aria-labelledby="metric-card-api-title">
            <h3 id="metric-card-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="metric-card-status" aria-labelledby="metric-card-status-title">
            <h3 id="metric-card-status-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="metric-card-semantic" aria-labelledby="metric-card-semantic-title">
            <h3 id="metric-card-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="metric-card-token" aria-labelledby="metric-card-token-title">
            <h3 id="metric-card-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="metric-card-a11y" aria-labelledby="metric-card-a11y-title">
            <h3 id="metric-card-a11y-title">a11y</h3>
            <p>
              根节点默认由标题命名，也允许宿主传入 <code>aria-label</code> 或 <code>aria-labelledby</code> 覆盖。
              loading、error、empty 分别使用 <code>aria-busy</code>、<code>role=alert</code> 和 <code>role=status</code>。
              delta 始终有可见文本、方向形状和读屏可理解的趋势方向。
            </p>
          </section>

          <section className="button-doc-section" id="metric-card-mobile" aria-labelledby="metric-card-mobile-title">
            <h3 id="metric-card-mobile-title">mobile</h3>
            <p>
              360px、390px 与 430px 下，示例一行会收敛为单列；header、delta、extra、长标题、长数字和单位允许换行，
              图表槽保持固定最小高度并裁切内部溢出，避免横向滚动。
            </p>
          </section>

          <section className="button-doc-section" id="metric-card-security" aria-labelledby="metric-card-security-title">
            <h3 id="metric-card-security-title">security</h3>
            <p>
              MetricCard 不使用 dangerouslySetInnerHTML，不解析外部 HTML，不执行字符串代码。自定义 chart 是显式 ReactNode，
              由宿主负责选择可信组件；当前文档只使用自有 Sparkline。
            </p>
          </section>

          <section className="button-doc-section" id="metric-card-review" aria-labelledby="metric-card-review-title">
            <h3 id="metric-card-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
