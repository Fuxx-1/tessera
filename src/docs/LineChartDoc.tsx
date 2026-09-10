import { LineChart } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { ChartDocShowcase } from "./ChartDocShowcase";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type LineChartDocProps = {
  showAnchors?: boolean;
};

export const lineChartDocMeta = {
  title: "LineChart 折线图",
  category: "可视化组件",
  anchors: [
    { id: "line-when", label: "何时使用" },
    { id: "line-demos", label: "代码演示" },
    { id: "line-api", label: "API" },
    { id: "line-states", label: "状态" },
    { id: "line-mobile", label: "移动端" },
    { id: "line-security", label: "安全" },
    { id: "line-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const weeklyData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 76 },
  { label: "Fri", value: 68 },
  { label: "Sat", value: 92 },
  { label: "Sun", value: 84 },
];

const signedData = [
  { label: "Baseline", value: -8 },
  { label: "Pilot", value: -2 },
  { label: "Launch", value: 12 },
  { label: "Ramp", value: 24 },
  { label: "Scale", value: 18 },
  { label: "Review", value: 31 },
];

const defensiveData = [
  { label: "Imported A", value: 28 },
  { label: "NaN ignored", value: Number.NaN },
  { label: "Duplicate", value: 37 },
  { label: "Duplicate", value: 43 },
  { label: "Infinity ignored", value: Number.POSITIVE_INFINITY },
  { label: "Recovery", value: 36 },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "按顺序绘制单序列点位。label 会压缩空白并限制长度；NaN / Infinity 会被过滤。",
  },
  {
    name: "height / margin",
    value: "number / Partial<ChartMargin>",
    description: "控制 SVG viewBox 和绘图区边距。尺寸与 margin 都会收敛，避免异常输入导致不可绘制区域。",
  },
  {
    name: "scale",
    value: "{ yDomain, includeZero, clamp, tickCount }",
    description: "控制 Y 轴数值域、是否包含 0、超域点是否夹取，以及 2-8 个网格刻度。",
  },
  {
    name: "showGrid / showPoints",
    value: "boolean",
    description: "控制网格线和点位。关闭点位可降低密集趋势的视觉噪声，但仍保留 SVG title/desc。",
  },
  {
    name: "maxDataPoints",
    value: "number",
    description: "默认按 SVG 性能预算最多绘制 160 点；数万级原始序列应先聚合或抽样，组件会保留首尾趋势点并显示 notice。",
  },
  {
    name: "tooltip / legend",
    value: "not included",
    description: "当前为单序列静态 SVG，不承诺交互 tooltip 或 legend；点位 title、SVG desc 和外层 summary 承载读数与趋势说明。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "进入 ChartFrame 和 SVG title/desc；生产场景建议传入人工 summary，说明趋势含义。",
  },
  {
    name: "valueFormatter",
    value: "(value, datum) => string",
    description: "复用于刻度、点位 title 和默认 desc；formatter 抛错或返回空文本时回退默认数字格式。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "data=[] 或全非法数值",
    description: "显示 emptyText，并把底层 SVG 从辅助技术树隐藏，避免读到空图形。",
  },
  {
    name: "loading",
    value: "loading",
    description: "外层 figure 设置 aria-busy，状态层使用 polite status，图形尺寸保持稳定。",
  },
  {
    name: "error",
    value: "ReactNode",
    description: "错误态使用 alert；错误文本按 React 节点渲染，不解析 HTML 字符串。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "responsive SVG",
    description: "LineChart 保持固定 viewBox 并在图表容器内缩放，不撑破文档页面。",
  },
  {
    name: "touch",
    value: "no hover dependency",
    description: "移动端不依赖 tooltip。可见轴标签、点位 SVG title、desc 与外层 summary 共同承载信息。",
  },
  {
    name: "density",
    value: "5-12 points",
    description: "移动卡片建议控制在 5-12 个点；更长时间序列应抽样、分页或进入专门分析视图。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "dependencies",
    value: "self-owned SVG",
    description: "实现只使用 React、自有 ChartFrame 和 chart utils，不引入 antd、antd-mobile、@ant-design/charts 或外部图表库。",
  },
  {
    name: "text",
    value: "React text nodes",
    description: "label、summary、error 和 formatter 输出都作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。",
  },
  {
    name: "numbers",
    value: "finite only",
    description: "非法数值在 normalize 阶段过滤；height、margin、domain 和 tickCount 都有边界收敛。",
  },
  {
    name: "colors",
    value: "tone enum",
    description: "LineChart 不接收任意颜色字符串，避免 url()、var() 或脚本协议进入 SVG style。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "定位为单序列趋势判断，适合阶段变化、峰谷和方向感；多序列、预测区间和交互分析暂不承诺。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "网格、线、点和轴标签层次清楚；移动端不依赖 hover，点位可关闭以降低密集噪声。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "自有 SVG 实现，复用 ChartFrame、scale、path 和数据规范化工具；重复 label 按索引定位。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "文档与验收覆盖默认趋势、正负值、无点模式、防御性输入、空态、加载态、错误态和窄屏。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "无 HTML 注入路径、无外部图表库、无任意颜色输入；状态层出现时底层 SVG 从辅助技术隐藏。",
  },
];

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

const oneLineExample = "<LineChart data={weeklyData} title=\"Weekly usage\" summary=\"Usage rises through Saturday.\" />";

export function LineChartDoc({ showAnchors = false }: LineChartDocProps) {
  return (
    <TutorialScaffold component="LineChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc line-chart-doc" aria-labelledby="line-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="LineChart 文档目录">
            {lineChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="line-chart-doc-title">{lineChartDocMeta.title}</h2>
            <p>
              自有 SVG 折线图组件，用于小中型单序列趋势，包含 a11y 标题、desc 和状态语义。它是独立 LineChartDoc，不合并到 ChartsDoc，也不依赖 antd、
              antd-mobile、@ant-design/charts 或外部图表库。
            </p>
          </header>

          <section className="button-doc-section" id="line-when" aria-labelledby="line-when-title">
            <h3 id="line-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于 5-12 个有顺序的时间、阶段或版本点，判断上升、回落、峰值和波动。</li>
              <li>当重点是累计面积或强度时使用 AreaChart；当重点是分类比较时使用 BarChart。</li>
              <li>不要把当前 LineChart 当作多序列分析、预测区间或交互 tooltip 图表。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="line-demos" aria-labelledby="line-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="line-demos-title">代码演示</h3>
              <p>示例覆盖默认趋势、正负域、无点模式、防御性输入和状态层。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Weekly trend</h3>
                  <p>默认折线、网格和点位，summary 写出趋势结论。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <LineChart
                    data={weeklyData}
                    scale={{ tickCount: 4, yDomain: [0, 100] }}
                    summary="Weekly usage rises from Monday to Saturday, then eases on Sunday."
                    title="Weekly usage"
                    valueFormatter={(value) => `${Math.round(value)}%`}
                    xLabelMaxLength={8}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Default LineChart 代码">
                  <code>{`<LineChart data={weeklyData} title="Weekly usage" scale={{ yDomain: [0, 100] }} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Signed movement</h3>
                  <p>包含负值和零基线附近变化，适合环比或净增量。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <LineChart
                    data={signedData}
                    scale={{ yDomain: [-12, 36], tickCount: 5 }}
                    summary="Metric movement crosses above zero at Launch and peaks at Review."
                    title="Metric movement"
                    tone="plum"
                    valueFormatter={(value) => `${value > 0 ? "+" : ""}${value} pts`}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Signed LineChart 代码">
                  <code>{`<LineChart data={signedData} scale={{ yDomain: [-12, 36] }} valueFormatter={formatDelta} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo line-chart-doc__quiet-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Quiet line</h3>
                  <p>关闭点位降低密集视图噪声，仍保留 SVG title/desc。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <LineChart data={weeklyData} showPoints={false} summary="Quiet line keeps the weekly direction without point markers." title="Quiet usage" tone="amber" />
                </div>
                <pre className="button-doc-code" aria-label="Quiet LineChart 代码">
                  <code>{`<LineChart data={weeklyData} showPoints={false} title="Quiet usage" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Defensive input</h3>
                  <p>非法数值被过滤，重复标签按索引分布，不会叠在同一个 x 坐标。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <LineChart
                    data={defensiveData}
                    summary="Invalid numeric values are ignored; duplicate labels remain separate points."
                    title="Imported trend"
                    valueFormatter={(value) => {
                      if (value === 43) throw new Error("formatter failed");
                      return `${value} pts`;
                    }}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Defensive LineChart 代码">
                  <code>{`<LineChart data={defensiveData} valueFormatter={safeFormatter} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>States</h3>
                  <p>空态、加载态和错误态复用 ChartFrame，底层 SVG 不再暴露给辅助技术。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <div className="charts-doc-state-grid line-chart-doc__states">
                    <LineChart data={[]} emptyText="No trend points" title="Empty line" />
                    <LineChart data={weeklyData} loading loadingText="Loading trend" title="Loading line" />
                    <LineChart data={weeklyData} error="Line service unavailable." title="Error line" />
                  </div>
                </div>
                <pre className="button-doc-code" aria-label="LineChart states 代码">
                  <code>{`<LineChart data={[]} emptyText="No trend points" />`}</code>
                </pre>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="line-api" aria-labelledby="line-api-title">
            <h3 id="line-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="line-states" aria-labelledby="line-states-title">
            <h3 id="line-states-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="line-mobile" aria-labelledby="line-mobile-title">
            <h3 id="line-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="line-security" aria-labelledby="line-security-title">
            <h3 id="line-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="line-review" aria-labelledby="line-review-title">
            <h3 id="line-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
            <ul className="button-doc-list">
              <li>LineChartDoc 独立于 ChartsDoc 维护；ChartsDoc 可概览或链接，但不承载 LineChart 的完整专项文档。</li>
              <li>验收脚本包含 LineChart 专项 smoke：SVG 数量、状态语义、重复标签、无点模式、移动端溢出和无 antd 约束。</li>
              <li>已知缺口：多序列、键盘可达 tooltip、交互选点、数据表 fallback 和预测区间仍待后续版本设计。</li>
            </ul>
          </section>

          <ChartDocShowcase focus="line-chart" showAnchors={false} />
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
