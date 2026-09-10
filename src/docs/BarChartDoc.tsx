import { BarChart } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type BarChartDocProps = {
  showAnchors?: boolean;
};

export const barChartDocMeta = {
  title: "BarChart 柱状图",
  category: "可视化组件",
  anchors: [
    { id: "bar-when", label: "何时使用" },
    { id: "bar-demos", label: "代码演示" },
    { id: "bar-api", label: "API" },
    { id: "bar-labels", label: "标签与数值" },
    { id: "bar-a11y", label: "可访问性" },
    { id: "bar-mobile", label: "移动端" },
    { id: "bar-security", label: "安全" },
    { id: "bar-review", label: "五专家小组" },
  ],
} satisfies ComponentDocMeta;

const releaseData = [
  { label: "Spec", value: 42 },
  { label: "Design", value: 58 },
  { label: "Build", value: 96 },
  { label: "Review", value: 64 },
  { label: "Tests", value: 72 },
];

const signedData = [
  { label: "Activation", value: 18 },
  { label: "Retention", value: -12 },
  { label: "Latency", value: 34 },
  { label: "Incidents", value: -7 },
  { label: "Revenue", value: 51 },
];

const denseData = [
  { label: "North America", value: 128 },
  { label: "Latin America", value: 84 },
  { label: "Europe West", value: 116 },
  { label: "Europe East", value: 63 },
  { label: "Middle East", value: 48 },
  { label: "India", value: 94 },
  { label: "Japan", value: 57 },
  { label: "Korea", value: 39 },
  { label: "Southeast Asia", value: 103 },
  { label: "Australia", value: 44 },
  { label: "New Zealand", value: 28 },
  { label: "Africa South", value: 34 },
  { label: "Africa North", value: 41 },
  { label: "Global Online", value: 73 },
];

const defensiveData = [
  { label: "Imported A", value: 52 },
  { label: "NaN ignored", value: Number.NaN },
  { label: "Duplicate", value: 37 },
  { label: "Duplicate", value: 43 },
  { label: "Infinity ignored", value: Number.POSITIVE_INFINITY },
  { label: "Negative valid", value: -18 },
];

const largeData = Array.from({ length: 10000 }, (_, index) => ({
  label: `SKU ${String(index + 1).padStart(5, "0")}`,
  value: Math.round(Math.sin(index / 19) * 42 + (index % 89) + 80),
}));

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "按传入顺序绘制分类柱。label 会压缩空白并限制长度；NaN / Infinity 会被过滤。",
  },
  {
    name: "height / margin",
    value: "number / Partial<ChartMargin>",
    description: "控制 SVG viewBox 与绘图区边距。尺寸和 margin 都会收敛，避免异常输入导致不可绘制区域。",
  },
  {
    name: "yDomain / tickCount",
    value: "[number, number] / number",
    description: "锁定 Y 轴数值域或调整 2-8 个网格刻度。倒序、相等或非法 domain 会规范化或回退。",
  },
  {
    name: "barPadding / minBarWidth",
    value: "number",
    description: "控制柱间距和移动端最小柱宽。分类较多时 SVG 自动扩展最小宽度，容器内部横向滚动。",
  },
  {
    name: "dataWindow / maxDataPoints",
    value: "{ start?: number; end?: number } / number",
    description: "先按原始数组索引窗口裁剪，再对窗口内有限数值等距采样；默认最多绘制 160 根柱，适配万级数据。",
  },
  {
    name: "barRadius / tone",
    value: "number / ChartTone",
    description: "控制柱圆角与内置色板。tone 限定在中性、sage、clay、plum、amber，不开放任意 CSS 色值。",
  },
  {
    name: "showValues / valueFormatter",
    value: "boolean / (value, datum) => string",
    description: "显示柱顶数值标签，并复用于刻度、SVG title、desc 和读屏摘要；formatter 异常会回退默认格式化。",
  },
  {
    name: "labelFormatter / maxLabelLength",
    value: "(label, datum, index) => string / number",
    description: "格式化分类轴标签并按最大长度截断；完整标签保留在 SVG title，不依赖 hover tooltip。",
  },
];

const labelRows: DocRow[] = [
  {
    name: "zero baseline",
    value: "positive and negative",
    description: "正值从零基线向上绘制，负值从零基线向下绘制；不把负数静默丢弃。",
  },
  {
    name: "duplicate labels",
    value: "position by index",
    description: "重复 label 按索引定位，不会因为 band scale 查找首个同名标签而叠在同一根柱上。",
  },
  {
    name: "visible values",
    value: "showValues",
    description: "适合小数据集和审计场景。密集分类建议关闭可见值，把核心结论写入 summary。",
  },
  {
    name: "truncation",
    value: "maxLabelLength",
    description: "视觉标签截断保护窄屏排版，完整分类名进入 SVG title；业务关键分类应在邻近说明或表格中补全。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stable viewBox + horizontal pan",
    description: "BarChart 保持固定 viewBox；多分类时只让 chart body 横向滚动，不撑破文档页面。",
  },
  {
    name: "touch",
    value: "no hover dependency",
    description: "移动端不依赖 tooltip。可见标签、SVG title、desc 与外层 summary 共同承载信息。",
  },
  {
    name: "density",
    value: "6-12 categories",
    description: "移动卡片建议 6-12 个分类；更多分类应排序、分页、分组或改用表格。",
  },
  {
    name: "large data",
    value: "window then sample",
    description: "数万级分类必须传 dataWindow 或上游聚合；组件会先裁剪窗口，再采样，避免一次性输出上万 SVG 节点。",
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
    description: "非法数值在 normalize 阶段过滤；height、margin、domain、tickCount、barPadding 和 minBarWidth 都有边界收敛。",
  },
  {
    name: "colors",
    value: "tone enum",
    description: "BarChart 不接收任意颜色字符串，避免 url()、var() 或脚本协议进入 SVG style。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "定位为少量分类数值比较，支持排名、差值和正负变化判断；不承诺横向柱、堆叠柱或分组柱。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "零基线、网格、柱体、数值和分类标签层次清楚；中性色板避免单一蓝色主题，移动端使用内部滚动。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "自有 SVG 实现，复用 ChartFrame 和 scale 工具；重复标签按索引定位，窗口裁剪、采样、formatter 异常和非法数据有兜底。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "文档与验收覆盖默认柱图、负值、长标签、密集分类、万级窗口、重复标签、空态、加载态、错误态和窄屏。",
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

const oneLineExample = "<BarChart data={releaseData} title=\"Release workload\" summary=\"Build has the largest workload.\" />";

export function BarChartDoc({ showAnchors = false }: BarChartDocProps) {
  return (
    <TutorialScaffold component="BarChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc bar-chart-doc" aria-labelledby="bar-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="BarChart 文档目录">
            {barChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="bar-chart-doc-title">{barChartDocMeta.title}</h2>
            <p>
              自有 SVG 柱状图组件，用于分类数值比较、正负变化和小型排名判断。它是独立 BarChartDoc，不合并到
              ChartsDoc，也不依赖 antd、antd-mobile、@ant-design/charts 或外部图表库。
            </p>
          </header>

          <section className="button-doc-section" id="bar-when" aria-labelledby="bar-when-title">
            <h3 id="bar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于 3-12 个分类之间的数量、得分、工单、容量或变化率对比。</li>
              <li>当重点是时间趋势时使用 LineChart / AreaChart；当重点是占比构成时使用 PieChart。</li>
              <li>不要把当前 BarChart 当作横向条形、堆叠柱或分组柱；堆叠或分组边界会改变 domain、legend 和 tooltip 语义，需独立设计。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="bar-demos" aria-labelledby="bar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="bar-demos-title">代码演示</h3>
              <p>示例覆盖默认比较、正负值、密集移动分类、防御性输入和状态层。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Default comparison</h3>
                  <p>少量分类比较，summary 写出最高值和业务结论。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <BarChart
                    data={releaseData}
                    summary="Build has the largest workload at 96, followed by Tests at 72."
                    title="Release workload"
                    valueFormatter={(value) => `${Math.round(value)} tasks`}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Default BarChart 代码">
                  <code>{`<BarChart data={releaseData} title="Release workload" summary="Build has the largest workload." />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Signed values</h3>
                  <p>负值围绕零基线向下绘制，适合环比变化和质量指标。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <BarChart
                    data={signedData}
                    showValues
                    summary="Revenue is up 51% while retention is down 12%."
                    tickCount={5}
                    title="Metric movement"
                    tone="plum"
                    valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}%`}
                    yDomain={[-20, 60]}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Signed BarChart 代码">
                  <code>{`<BarChart data={signedData} showValues yDomain={[-20, 60]} valueFormatter={(value) => (value > 0 ? "+" : "") + value + "%"} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Dense mobile categories</h3>
                  <p>分类较多时保持最小柱宽，图表容器内部横向滚动。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <div className="bar-chart-doc-mobile-card">
                    <BarChart
                      data={denseData}
                      labelFormatter={(label) => label.replace(" America", " Am.").replace("Southeast ", "SE ")}
                      maxLabelLength={8}
                      minBarWidth={28}
                      summary="North America, Europe West, and Southeast Asia are the largest regions."
                      title="Regional volume"
                      tone="sage"
                    />
                  </div>
                </div>
                <pre className="button-doc-code" aria-label="Dense BarChart 代码">
                  <code>{`<BarChart data={denseData} minBarWidth={28} maxLabelLength={8} tone="sage" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Defensive input</h3>
                  <p>非法数值被过滤，重复标签按索引定位，formatter 异常回退默认格式。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <BarChart
                    data={defensiveData}
                    showValues
                    summary="Invalid numeric values are ignored; duplicate labels remain separate bars."
                    title="Imported comparison"
                    valueFormatter={(value) => {
                      if (value === 43) throw new Error("formatter failed");
                      return `${value} pts`;
                    }}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Defensive BarChart 代码">
                  <code>{`<BarChart data={defensiveData} showValues valueFormatter={safeFormatter} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Large data window</h3>
                  <p>10,000 条输入先窗口裁剪，再把窗口采样到 48 根可绘制柱。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <div className="bar-chart-doc-large-window">
                    <BarChart
                      data={largeData}
                      dataWindow={{ start: 4200, end: 5200 }}
                      maxDataPoints={48}
                      maxLabelLength={9}
                      minBarWidth={20}
                      summary="Rows 4,201-5,200 are sampled to 48 visible bars for SVG rendering."
                      title="SKU window"
                      tone="amber"
                      valueFormatter={(value) => `${value} units`}
                    />
                  </div>
                </div>
                <pre className="button-doc-code" aria-label="Large BarChart 代码">
                  <code>{`<BarChart data={largeData} dataWindow={{ start: 4200, end: 5200 }} maxDataPoints={48} minBarWidth={20} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>States</h3>
                  <p>空态、加载态和错误态复用 ChartFrame，底层 SVG 不再暴露给辅助技术。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <div className="charts-doc-state-grid bar-chart-doc__states">
                    <BarChart data={[]} emptyText="No bar categories" title="Empty bars" />
                    <BarChart data={releaseData} loading loadingText="Loading bars" title="Loading bars" />
                    <BarChart data={releaseData} error="Bar service unavailable." title="Error bars" />
                  </div>
                </div>
                <pre className="button-doc-code" aria-label="BarChart states 代码">
                  <code>{`<BarChart data={[]} emptyText="No bar categories" />`}</code>
                </pre>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="bar-api" aria-labelledby="bar-api-title">
            <h3 id="bar-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="bar-labels" aria-labelledby="bar-labels-title">
            <h3 id="bar-labels-title">标签与数值</h3>
            <DataTable rows={labelRows} />
          </section>

          <section className="button-doc-section" id="bar-a11y" aria-labelledby="bar-a11y-title">
            <h3 id="bar-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层使用 ChartFrame 的 figure 语义，title 与 summary 连接 aria-labelledby / aria-describedby。</li>
              <li>SVG 输出 title / desc；每根柱都有原生 SVG title，包含分类和值。</li>
              <li>未传 summary 时 SVG desc 会自动生成最高值与最低值摘要；生产业务仍建议传入人工 summary。</li>
              <li>loading、error 或 empty 状态出现时底层 SVG 设置 aria-hidden，避免读屏同时读到状态层和旧图形。</li>
              <li>颜色只做辅助识别；数值、零基线、summary 和标题承担主要信息表达。</li>
              <li>当前没有自定义 HTML tooltip；原生 SVG title 只作为补充，移动端不依赖悬停才能读懂图表。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="bar-mobile" aria-labelledby="bar-mobile-title">
            <h3 id="bar-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="bar-security" aria-labelledby="bar-security-title">
            <h3 id="bar-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="bar-review" aria-labelledby="bar-review-title">
            <h3 id="bar-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
            <ul className="button-doc-list">
              <li>BarChartDoc 独立于 ChartsDoc 维护；ChartsDoc 可链接或概览，但不承载 BarChart 的完整专项文档。</li>
              <li>验收脚本包含 BarChart 专项 smoke：SVG 数量、状态语义、重复标签、负值、万级窗口、移动端溢出和无 antd 约束。</li>
              <li>已知缺口：横向柱、堆叠柱、分组柱、键盘可达 tooltip 和数据表 fallback 仍待后续版本设计，不能用当前 API 伪装实现。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
