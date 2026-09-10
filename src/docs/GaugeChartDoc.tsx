import type { ReactNode } from "react";
import { GaugeChart } from "../components/charts";
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

export type GaugeChartDocProps = {
  showAnchors?: boolean;
};

export const gaugeChartDocMeta = {
  title: "GaugeChart 仪表盘",
  category: "可视化组件",
  anchors: [
    { id: "gauge-when", label: "何时使用" },
    { id: "gauge-demos", label: "代码演示" },
    { id: "gauge-api", label: "API" },
    { id: "gauge-semantics", label: "语义" },
    { id: "gauge-mobile", label: "移动端" },
    { id: "gauge-states", label: "状态" },
    { id: "gauge-security", label: "安全" },
    { id: "gauge-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const qualitySegments = [
  { label: "Risk", from: 0, to: 55, color: "#9b6a4e" },
  { label: "Watch", from: 55, to: 78, color: "#b48639" },
  { label: "Healthy", from: 78, to: 100, color: "#66715e" },
];

const qualityThresholds = [
  { label: "SLO", value: 75, color: "#2c2c2a" },
  { label: "Goal", value: 90, color: "#66715e" },
];

const signedSegments = [
  { label: "Loss", from: -40, to: -8, color: "#9b6a4e" },
  { label: "Flat", from: -8, to: 8, color: "#8a6f52" },
  { label: "Gain", from: 8, to: 40, color: "#66715e" },
];

const demos: Demo[] = [
  {
    title: "Basic gauge",
    description: "展示单个健康度指标，默认区间和当前值会输出到 SVG desc 与 meter 语义。",
    preview: (
      <GaugeChart
        label="Quality score"
        summary="Quality score is 82.4, above the SLO threshold and inside the healthy range."
        title="Quality score"
        value={82.4}
      />
    ),
    code: `<GaugeChart title="Quality score" label="Quality score" value={82.4} summary="Quality score is above SLO." />`,
  },
  {
    title: "Segments and thresholds",
    description: "自定义区间、阈值标记和数值格式化，适合 SLO、容量水位和风险评分。",
    preview: (
      <GaugeChart
        label="Availability"
        segments={qualitySegments}
        summary="Availability is 88.2%; SLO remains above 75% and close to the 90% goal."
        thresholds={qualityThresholds}
        title="Availability guardrail"
        value={88.2}
        valueFormatter={(value) => `${value.toFixed(1)}%`}
      />
    ),
    code: `<GaugeChart value={88.2} segments={segments} thresholds={thresholds} valueFormatter={(value) => value.toFixed(1) + "%"} />`,
  },
  {
    title: "Signed range",
    description: "支持非 0-100 范围和负值；倒序 min/max 会规范化，当前值会 clamp 在区间内。",
    preview: (
      <GaugeChart
        label="Release delta"
        max={40}
        min={-40}
        segments={signedSegments}
        summary="Release delta is +18 points, inside the gain range."
        thresholds={[{ label: "Guard", value: 0 }]}
        title="Release delta"
        value={18}
        valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}`}
      />
    ),
    code: `<GaugeChart min={-40} max={40} value={18} segments={signedSegments} thresholds={[{ label: "Guard", value: 0 }]} />`,
  },
  {
    title: "Compact mobile",
    description: "窄屏中保持稳定 viewBox 和文本层级，适合指标卡片里的单值状态。",
    preview: (
      <div className="gauge-doc-mobile-card">
        <div>
          <span>Capacity</span>
          <strong>71%</strong>
        </div>
        <GaugeChart
          height={210}
          label="Capacity"
          segments={qualitySegments}
          showValue={false}
          summary="Capacity is 71%, near the watch range."
          thresholds={[{ label: "Limit", value: 80 }]}
          value={71}
          valueFormatter={(value) => `${Math.round(value)}%`}
        />
      </div>
    ),
    code: `<GaugeChart height={210} label="Capacity" value={71} showValue={false} thresholds={[{ label: "Limit", value: 80 }]} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "value",
    value: "number",
    description: "当前指标值。NaN / Infinity 会触发空态且不写 aria-valuenow；有限值会 clamp 到 min/max 区间内。",
  },
  {
    name: "min / max",
    value: "number",
    description: "数值域，默认 0 / 100。相等、倒序或非法输入会被规范化，避免非法角度和空白 SVG。",
  },
  {
    name: "segments",
    value: "Array<{ label?, from, to, color? }>",
    description: "区间弧段。只接受有限 from/to，零长度段会被忽略；全部非法时回退默认分段，非法颜色回退内置色板。",
  },
  {
    name: "thresholds",
    value: "Array<{ label?, value, color? }>",
    description: "阈值刻度线。非法 value 会被忽略，超出 min/max 的阈值会 clamp 到边界。",
  },
  {
    name: "label / title / summary",
    value: "string",
    description: "label 用于 meter 语义和中心标签；title/summary 进入 ChartFrame、SVG title/desc 和辅助技术描述。",
  },
  {
    name: "height / showValue",
    value: "number / boolean",
    description: "height 控制 viewBox 高度，showValue 可关闭中心数值以适配紧凑指标卡。",
  },
  {
    name: "valueFormatter",
    value: "(value) => string",
    description: "格式化中心值、端点、阈值 title 和 aria-valuetext；抛错时回退默认数字格式。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "沿用 ChartFrame；title / summary 会连接到 aria-labelledby / aria-describedby。",
  },
  {
    name: "svg",
    value: "svg[role=img]",
    description: "SVG 内置 title / desc，弧段、阈值和针都有原生 SVG title。",
  },
  {
    name: "meter",
    value: "div[role=meter]",
    description: "有效数据时额外输出可访问 meter 语义，包含 aria-valuemin、aria-valuemax、aria-valuenow 和 aria-valuetext。",
  },
  {
    name: "state",
    value: "status / alert",
    description: "loading/empty 使用 status，error 使用 alert；有状态时底层 SVG 对辅助技术隐藏。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "value is not finite",
    description: "当前值为 NaN 或 Infinity 时进入空态，仍保留稳定图层占位。",
  },
  {
    name: "loading",
    value: "loading",
    description: "根节点设置 aria-busy，状态层使用 polite status。",
  },
  {
    name: "error",
    value: "ReactNode",
    description: "错误态使用 alert，不解析 HTML 字符串，业务可传错误码或说明文本。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "单指标阈值判断",
    description: "GaugeChart 只用于单值、区间和阈值，不替代 Progress 的任务完成度，也不替代 Statistic 的纯数字陈列。",
  },
  {
    name: "UI",
    value: "弧段、阈值、中心值",
    description: "默认多色区间避免一色图；移动端保持稳定 viewBox，中心值和标签不使用 hero 级字号。",
  },
  {
    name: "研发",
    value: "自有 SVG",
    description: "实现不依赖 antd、antd-mobile、@ant-design/charts；min/max、segments、thresholds 和颜色都经过规范化。",
  },
  {
    name: "测试",
    value: "边界与路由 smoke",
    description: "覆盖基本值、阈值、自定义范围、紧凑移动、empty/loading/error，以及 #gauge-chart 路由验收。",
  },
  {
    name: "白帽",
    value: "文本转义与颜色白名单",
    description: "label、summary、formatter 输出均走 React 文本节点；颜色只接受 hex，非法值回退内置 token。",
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

const oneLineExample = "<GaugeChart title=\"Quality score\" label=\"Quality score\" value={82.4} />";

export function GaugeChartDoc({ showAnchors = false }: GaugeChartDocProps) {
  return (
    <TutorialScaffold component="GaugeChart" kind="display" oneLineExample={oneLineExample}>
      <section className="gauge-doc" aria-labelledby="gauge-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="GaugeChart 文档目录">
            {gaugeChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="gauge-doc-title">{gaugeChartDocMeta.title}</h2>
            <p>
              自有 SVG 仪表盘组件，用于单个指标的区间、阈值和当前值展示。文档独立于 Progress，
              语义上提供 figure、SVG img 与 meter。
            </p>
          </header>

          <section className="button-doc-section" id="gauge-when" aria-labelledby="gauge-when-title">
            <h3 id="gauge-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在有限区间内判断单个指标是否达标、接近阈值或进入风险区时使用。</li>
              <li>不要用于任务完成进度；进度条、步骤流和加载反馈仍由 Progress / Steps / Spin 承担。</li>
              <li>不要只依赖颜色表达结论，业务必须提供 label、summary 或周边文案。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="gauge-demos" aria-labelledby="gauge-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="gauge-demos-title">代码演示</h3>
              <p>覆盖基础值、区间阈值、非 0-100 范围和移动紧凑布局。</p>
            </div>
            <div className="charts-doc-demo-grid gauge-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="gauge-api" aria-labelledby="gauge-api-title">
            <h3 id="gauge-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="gauge-semantics" aria-labelledby="gauge-semantics-title">
            <h3 id="gauge-semantics-title">语义</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="gauge-mobile" aria-labelledby="gauge-mobile-title">
            <h3 id="gauge-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>SVG 使用稳定 viewBox 和最小宽度；窄屏可在图表容器内横向平移，不撑破页面。</li>
              <li>紧凑卡片可以关闭中心值，把数值交给宿主标题区展示，减少文字拥挤。</li>
              <li>阈值 label 保持短文本，完整解释写入 summary 和 SVG title。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="gauge-states" aria-labelledby="gauge-states-title">
            <h3 id="gauge-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <GaugeChart emptyText="No gauge value" title="Empty gauge" value={Number.NaN} />
              <GaugeChart label="Loading gauge" loading loadingText="Loading gauge" value={64} />
              <GaugeChart error="Gauge service unavailable." label="Error gauge" value={64} />
            </div>
          </section>

          <section className="button-doc-section" id="gauge-security" aria-labelledby="gauge-security-title">
            <h3 id="gauge-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>不引入 antd、antd-mobile、@ant-design/charts 或外部图表库。</li>
              <li>所有用户可控文本都作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。</li>
              <li>segments / thresholds 的颜色只接受 hex；formatter 异常会回退默认数字格式。</li>
              <li>非法数值不会进入 SVG 坐标计算，避免 NaN path、无限坐标和页面空白。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="gauge-review" aria-labelledby="gauge-review-title">
            <h3 id="gauge-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
