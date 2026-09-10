import type { ReactNode } from "react";
import { PieChart } from "../components/charts";
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

export type PieChartDocProps = {
  showAnchors?: boolean;
};

export const pieChartDocMeta = {
  title: "PieChart 饼图",
  category: "可视化组件",
  anchors: [
    { id: "pie-when", label: "何时使用" },
    { id: "pie-demos", label: "代码演示" },
    { id: "pie-api", label: "API" },
    { id: "pie-semantics", label: "语义" },
    { id: "pie-mobile", label: "移动端" },
    { id: "pie-states", label: "状态" },
    { id: "pie-security", label: "安全" },
    { id: "pie-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const componentMixData = [
  { label: "Base", value: 42 },
  { label: "Business", value: 18 },
  { label: "Charts", value: 11 },
  { label: "Docs", value: 9 },
];

const releaseFocusData = [
  { label: "Ready", value: 56 },
  { label: "Visual QA", value: 16 },
  { label: "A11y", value: 12 },
  { label: "Mobile", value: 10 },
  { label: "Security", value: 6 },
];

const defensiveData = [
  { label: "Positive shipped", value: 32 },
  { label: "Zero ignored", value: 0 },
  { label: "Negative ignored", value: -8 },
  { label: "Invalid ignored", value: Number.NaN },
  { label: "Positive backlog", value: 14 },
];

const longLegendData = [
  { label: "Revenue dashboard north region", value: 24 },
  { label: "Revenue dashboard south region", value: 18 },
  { label: "Operational analytics workspace", value: 14 },
  { label: "Customer success review", value: 12 },
  { label: "Executive snapshot", value: 9 },
  { label: "Internal enablement", value: 7 },
];

const manyCategoryData = [
  { label: "Core", value: 32 },
  { label: "Platform", value: 24 },
  { label: "Ops", value: 18 },
  { label: "AI", value: 14 },
  { label: "Docs", value: 10 },
  { label: "Billing", value: 8 },
  { label: "Mobile", value: 7 },
  { label: "Growth", value: 6 },
  { label: "Research", value: 5 },
];

const safeTextData = [
  { label: "<img src=x onerror=alert(1)>", value: 23 },
  { label: "Normal slice", value: 17 },
  { label: "Literal script text", value: 9 },
];

const customColors = ["#66715e", "#8a6f52", "#9b6a4e", "#6f6b8a"];

const demos: Demo[] = [
  {
    title: "Component mix",
    description: "展示少量分类占比，title 和 summary 同步进入 ChartFrame 与 SVG 语义。",
    preview: <PieChart data={componentMixData} summary="Base components hold the largest share of the current implementation." title="Component mix" />,
    code: `<PieChart data={componentMixData} title="Component mix" summary="Base components hold the largest share." />`,
  },
  {
    title: "Custom palette",
    description: "支持十六进制色板；空色板或非法颜色会回退到内置 token 色板。",
    preview: (
      <PieChart
        colors={customColors}
        data={releaseFocusData}
        summary="Ready work is the largest release segment, followed by visual QA."
        title="Release focus"
        valueFormatter={(value) => `${value} items`}
      />
    ),
    code: `<PieChart data={releaseFocusData} colors={customColors} valueFormatter={(value) => value + " items"} />`,
  },
  {
    title: "Legend cap",
    description: "legendMaxItems 截断长列表，保留 +N more 提示，避免密集场景挤压图形。",
    preview: <PieChart data={longLegendData} legendMaxItems={3} summary="Only the first three legend rows are shown." title="Legend capped" />,
    code: `<PieChart data={longLegendData} legendMaxItems={3} title="Legend capped" />`,
  },
  {
    title: "Other aggregation",
    description: "maxSlices 会保留前 N-1 个正值分类，并把剩余正值聚合为 Other，控制 SVG 节点量。",
    preview: <PieChart data={manyCategoryData} maxSlices={5} summary="Smaller categories are aggregated into Other for render budget." title="Aggregated share" />,
    code: `<PieChart data={manyCategoryData} maxSlices={5} title="Aggregated share" />`,
  },
  {
    title: "Compact share",
    description: "关闭 legend 后图形居中，适合移动卡片和旁路摘要；完整解释交给 summary。",
    preview: <PieChart data={releaseFocusData} height={220} showLegend={false} summary="Compact pie chart without legend." title="Compact share" />,
    code: `<PieChart data={releaseFocusData} height={220} showLegend={false} title="Compact share" />`,
  },
  {
    title: "Defensive data",
    description: "只计算正数有限值，非正数和非法值会被忽略，并在默认 SVG desc 中说明。",
    preview: <PieChart data={defensiveData} legendMaxItems={2} title="Filtered values" />,
    code: `<PieChart data={defensiveData} legendMaxItems={2} title="Filtered values" />`,
  },
  {
    title: "Safe text",
    description: "label 和 formatter 输出用于 SVG title、legend 文本和 data 属性时都不解析 HTML。",
    preview: <PieChart data={safeTextData} title="Safe labels" valueFormatter={(value, datum) => `${datum?.label}: ${value}`} />,
    code: `<PieChart data={safeTextData} title="Safe labels" valueFormatter={(value, datum) => datum.label + ": " + value} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "ChartDatum[]",
    description: "分类数据入口。label 会规范化并截断到安全长度；只有有限且大于 0 的 value 参与占比计算。",
  },
  {
    name: "colors",
    value: "string[]",
    description: "可选十六进制色板。非法颜色、空数组和非 hex 输入会回退到内置 chartSeriesColors。",
  },
  {
    name: "showLegend / legendMaxItems",
    value: "boolean / number",
    description: "控制图例显示与最大行数；超出部分以 +N more 呈现，legendMaxItems 会规范化为非负整数。",
  },
  {
    name: "maxSlices",
    value: "number",
    description: "大量分类的渲染上限；超出时把尾部正值聚合为 Other，默认遵守 UI_RENDER_BUDGETS.chartPieSlices。",
  },
  {
    name: "height",
    value: "number",
    description: "控制 SVG viewBox 高度，低于安全下限会回退，避免小屏或异常输入导致扇区不可读。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "进入 ChartFrame 和 SVG title/desc；没有 summary 时组件会生成正值切片和被忽略数据的摘要。",
  },
  {
    name: "valueFormatter",
    value: "(value, datum) => string",
    description: "格式化 slice title 中的值；formatter 抛错或返回空文本时回退默认数字格式。",
  },
  {
    name: "loading / error / emptyText",
    value: "boolean / ReactNode / string",
    description: "状态层由 ChartFrame 承载；loading/empty 使用 status，error 使用 alert。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "ChartFrame 在有 title/summary 时建立 aria-labelledby 和 aria-describedby。",
  },
  {
    name: "svg",
    value: "svg[role=img]",
    description: "正常态输出 aria-labelledby、title 和 desc；每个 slice 通过 SVG title 暴露 label、值和百分比。",
  },
  {
    name: "states",
    value: "aria-hidden svg + status/alert",
    description: "loading、error、empty 时底层 SVG 对辅助技术隐藏，避免读到状态层和陈旧图形两套信息。",
  },
  {
    name: "legend",
    value: "svg text",
    description: "图例用于视觉扫描，长标签视觉截断，完整内容保留在 legend aria-label 中；百分比右对齐便于比较。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "no positive finite data",
    description: "data 为空、全为 0、负数或 NaN 时进入空态，并保留稳定图层占位。",
  },
  {
    name: "loading",
    value: "loading",
    description: "根节点设置 aria-busy，状态层使用 polite status，SVG 从辅助技术树隐藏。",
  },
  {
    name: "error",
    value: "ReactNode",
    description: "错误态使用 alert；业务错误文本按 React 节点渲染，不解析 HTML 字符串。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "少量占比",
    description: "PieChart 只用于 2-6 个可解释分类的份额判断；排序、趋势和大量分类不应交给饼图。",
  },
  {
    name: "UI",
    value: "图形与图例平衡",
    description: "默认 donut 形态减轻厚重感，legend 截断和紧凑模式用于移动或密集卡片。",
  },
  {
    name: "研发",
    value: "自有 SVG",
    description: "实现不依赖 antd、antd-mobile、@ant-design/charts；路径、色板、尺寸和数据都经过规范化。",
  },
  {
    name: "测试",
    value: "路由与边界",
    description: "覆盖基础、自定义色板、legend 截断、关闭 legend、防御数据、empty/loading/error 和移动无页面溢出。",
  },
  {
    name: "白帽",
    value: "文本转义与颜色白名单",
    description: "label、summary、formatter 输出都作为 React 文本节点；颜色只接受 hex，非法数值不会进入 SVG path。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="charts-doc-demo">
      <div className="charts-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="charts-doc-demo__preview">{preview}</div>
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

const oneLineExample = "<PieChart data={componentMixData} title=\"Component mix\" summary=\"Base holds the largest share.\" />";

export function PieChartDoc({ showAnchors = false }: PieChartDocProps) {
  return (
    <TutorialScaffold component="PieChart" kind="display" oneLineExample={oneLineExample}>
      <section className="pie-chart-doc" aria-labelledby="pie-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="PieChart 文档目录">
            {pieChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="pie-doc-title">{pieChartDocMeta.title}</h2>
            <p>
              自有 SVG 饼图组件，用于小规模分类占比展示。文档独立维护，不合并到 ChartsDoc，
              并按产品、UI、研发、测试、白帽五个视角记录生产级边界。
            </p>
          </header>

          <section className="button-doc-section" id="pie-when" aria-labelledby="pie-when-title">
            <h3 id="pie-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要表达少量分类在整体中的占比，并且用户主要判断份额大小而不是精确排序时使用。</li>
              <li>分类超过 6 个、标签很长或需要精确比较时优先使用 BarChart、Table 或排序列表。</li>
              <li>不要把 0、负数或未知值作为占比的一部分；这些数据应在业务文案或状态中解释。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pie-demos" aria-labelledby="pie-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="pie-demos-title">代码演示</h3>
              <p>覆盖基础占比、自定义色板、图例截断、Other 聚合、紧凑模式、防御数据和安全文本。</p>
            </div>
            <div className="charts-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="pie-api" aria-labelledby="pie-api-title">
            <h3 id="pie-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="pie-semantics" aria-labelledby="pie-semantics-title">
            <h3 id="pie-semantics-title">语义</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="pie-mobile" aria-labelledby="pie-mobile-title">
            <h3 id="pie-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>SVG 使用稳定 viewBox；窄屏时图表容器内部可横向平移，页面本身不得出现横向溢出。</li>
              <li>移动卡片建议设置 legendMaxItems 或关闭 showLegend，让图形和可见文案保持扫描效率。</li>
              <li>长标签由 legend 视觉截断，完整内容保留在 legend aria-label；业务可在 summary 或表格中提供完整解释。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pie-states" aria-labelledby="pie-states-title">
            <h3 id="pie-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <PieChart data={[]} emptyText="No positive slices" title="Empty pie" />
              <PieChart data={componentMixData} loading loadingText="Loading proportions" title="Loading pie" />
              <PieChart data={componentMixData} error="Pie data service unavailable." title="Error pie" />
            </div>
          </section>

          <section className="button-doc-section" id="pie-security" aria-labelledby="pie-security-title">
            <h3 id="pie-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>不引入 antd、antd-mobile、@ant-design/charts 或外部图表库。</li>
              <li>所有用户可控文本都作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。</li>
              <li>颜色只接受安全 hex；非法色板回退内置色板，避免 CSS 注入和不可读颜色。</li>
              <li>NaN、Infinity、0 和负数不会进入扇区路径计算，避免非法 SVG 坐标和不可预测渲染。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pie-review" aria-labelledby="pie-review-title">
            <h3 id="pie-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
