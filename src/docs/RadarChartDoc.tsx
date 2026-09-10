import { RadarChart } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type RadarChartDocProps = {
  showAnchors?: boolean;
};

export const radarChartDocMeta = {
  title: "RadarChart 雷达图",
  category: "可视化组件",
  anchors: [
    { id: "radar-when", label: "何时使用" },
    { id: "radar-demos", label: "代码演示" },
    { id: "radar-api", label: "API" },
    { id: "radar-labels", label: "坐标与图例" },
    { id: "radar-a11y", label: "可访问性" },
    { id: "radar-mobile", label: "移动端" },
    { id: "radar-security", label: "安全" },
    { id: "radar-review", label: "五专家小组" },
  ],
} satisfies ComponentDocMeta;

const capabilityAxes = [
  { key: "product", label: "Product fit" },
  { key: "design", label: "UI clarity" },
  { key: "engineering", label: "Engineering readiness with extended rollout label" },
  { key: "testing", label: "Testing" },
  { key: "security", label: "Security" },
  { key: "mobile", label: "Mobile" },
];

const releaseSeries = [
  {
    name: "Current sprint",
    values: { product: 82, design: 76, engineering: 88, testing: 72, security: 84, mobile: 69 },
    fill: "#66715e",
    stroke: "#66715e",
  },
  {
    name: "Target",
    values: { product: 90, design: 84, engineering: 86, testing: 88, security: 92, mobile: 80 },
    fill: "#9b6a4e",
    stroke: "#9b6a4e",
  },
];

const categorySeries = [
  { name: "Design review", values: [72, 88, 64, 78, 70], stroke: "#6f5d73", fill: "#6f5d73" },
  { name: "QA review", values: [80, 68, 82, 92, 76], stroke: "#b48639", fill: "#b48639" },
];

const defensiveSeries = [
  { name: "Imported profile", values: { product: 105, design: Number.NaN, engineering: 67, testing: -20, security: 94 } },
  { name: "Unsafe color ignored", values: [62, 72, 83, 58, 91, 64], stroke: "url(#bad)", fill: "javascript:red" },
];

const apiRows: DocRow[] = [
  {
    name: "axes",
    value: "Array<{ key: string; label: string; max?: number }>",
    description: "定义雷达维度。至少 3 个维度才会绘制；最多取前 12 个，默认 max 为 100。",
  },
  {
    name: "categories",
    value: "string[]",
    description: "axes 的简写形式，适合每个维度都使用 0-100 的同构评分场景。",
  },
  {
    name: "series",
    value: "Array<{ name; values; fill?; stroke? }>",
    description: "支持按数组顺序或按 axis key/label 的对象传值。数值会裁切到 0 和 axis.max 之间。",
  },
  {
    name: "fill / stroke",
    value: "safe hex color",
    description: "每条序列可定制填充和描边，只接受十六进制颜色；非法颜色回退到内置色板。",
  },
  {
    name: "showGrid / showGridLabels",
    value: "boolean",
    description: "控制多边形网格和 25/50/75/100% 等环形刻度标签。",
  },
  {
    name: "showLabels / axisLabelMaxLength",
    value: "boolean / number",
    description: "控制维度标签显示和截断长度。标签按象限自动调整锚点，完整文本保留在 SVG title 中。",
  },
  {
    name: "showLegend / legendMaxItems",
    value: "boolean / number",
    description: "控制右侧图例和可见项数。超出时展示 +N more，避免窄屏堆叠。",
  },
  {
    name: "showTooltip",
    value: "boolean",
    description: "控制点位原生 SVG title。默认开启；移动端不把 hover tooltip 作为唯一读数入口。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "连接外层 figure 与 SVG title/desc；未传 summary 时会生成每条序列最强维度摘要。",
  },
];

const labelRows: DocRow[] = [
  {
    name: "axis limit",
    value: "3-12 axes",
    description: "少于 3 个维度不构成雷达轮廓；超过 12 个会使标签难以阅读，因此主动截断。",
  },
  {
    name: "grid labels",
    value: "percent rings",
    description: "网格从 12 点方向起算，标签表达相对半径比例。若各轴 max 不同，业务应在 summary 说明口径。",
  },
  {
    name: "legend",
    value: "series identity",
    description: "颜色只用于区分序列，不承载唯一结论；图例项有上限，关键差异必须出现在 summary 或邻近说明中。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stable viewBox + horizontal pan",
    description: "RadarChart 使用固定 viewBox 和最小宽度；窄屏可在容器内横向平移，不撑破文档页面。",
  },
  {
    name: "labels",
    value: "truncate + SVG title",
    description: "轴标签按左右象限避让并在视觉上截断，完整文本进入 title；移动端不依赖 hover tooltip。",
  },
  {
    name: "density",
    value: "small series count",
    description: "建议 1-3 条序列、5-8 个维度；更密集的数据应改用表格或分面柱图。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "dependencies",
    value: "self-owned SVG",
    description: "仅使用 React、自有 ChartFrame 和 chart utils，不引入 antd、antd-mobile、@ant-design/charts 或外部图表库。",
  },
  {
    name: "text",
    value: "React text nodes",
    description: "axis label、series name、summary 和 formatter 输出均作为文本渲染，不使用 dangerouslySetInnerHTML。",
  },
  {
    name: "numbers",
    value: "finite + clamped",
    description: "NaN / Infinity 按 0 兜底，负值裁切为 0，超过 axis.max 的值裁切到 max，避免非法 SVG 坐标。",
  },
  {
    name: "colors",
    value: "hex whitelist",
    description: "fill / stroke 仅接受安全十六进制颜色，阻断 url()、var()、脚本协议或其他 CSS 注入形态。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "定位为多维能力轮廓比较，不替代明细表；默认摘要会指出每条序列最强维度，适合评审和健康度场景。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "轮廓、网格、轴标签和图例层次清晰；色板保持 neutral minimal 中性克制，不落入单一蓝色主题。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "实现为自有 SVG，复用 ChartFrame 状态层和极坐标工具；支持 axes/categories、对象/数组两种 values 和颜色白名单。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "文档覆盖多序列、categories 简写、tooltip、非法数值裁切、非法颜色回退、空态、加载态、错误态和窄屏平移。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "无 HTML 注入路径，文本由 React 转义；数值、尺寸、标签长度和颜色均有限制，降低异常输入污染 SVG 的风险。",
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

const oneLineExample = "<RadarChart axes={capabilityAxes} series={releaseSeries} title=\"Release readiness\" />";

export function RadarChartDoc({ showAnchors = false }: RadarChartDocProps) {
  return (
    <TutorialScaffold component="RadarChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc radar-chart-doc" aria-labelledby="radar-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="RadarChart 文档目录">
            {radarChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="radar-chart-doc-title">{radarChartDocMeta.title}</h2>
            <p>
              自有 SVG 雷达图组件，用于对比多维能力轮廓和相对强弱。它是独立文档页，不与 ChartsDoc 合并，不依赖 antd、
              @ant-design/charts 或外部图表库。
            </p>
          </header>

          <section className="button-doc-section" id="radar-when" aria-labelledby="radar-when-title">
            <h3 id="radar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于 3-12 个同类维度的能力画像、评审评分、健康度对比和目标差距判断。</li>
              <li>当需要精确读取每个数值时，应搭配表格或改用 BarChart；雷达图负责轮廓，不负责明细审计。</li>
              <li>不用于时间趋势、占比构成、大量维度或颜色必须承载结论的场景。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="radar-demos" aria-labelledby="radar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="radar-demos-title">代码演示</h3>
              <p>示例覆盖 axes、categories、series、fill/stroke、网格标签、图例、状态层和防御性输入。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Multi-series profile</h3>
                  <p>按 axis key 传值，适合评审画像和目标差距对比。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <RadarChart axes={capabilityAxes} series={releaseSeries} summary="Current sprint is strongest on Engineering; Target is strongest on Security." title="Release readiness profile" />
                </div>
                <pre className="button-doc-code" aria-label="RadarChart axes 代码">
                  <code>{`<RadarChart axes={axes} series={series} title="Release readiness profile" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Categories shortcut</h3>
                  <p>categories 是 0-100 同构评分的简写入口，数组 values 按顺序对应维度。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <RadarChart
                    categories={["Scope", "Visual", "API", "A11y", "Mobile"]}
                    series={categorySeries}
                    showGridLabels={false}
                    summary="QA review is strongest on A11y while Design review is strongest on Visual."
                    title="Review dimensions"
                  />
                </div>
                <pre className="button-doc-code" aria-label="RadarChart categories 代码">
                  <code>{`<RadarChart categories={["Scope", "Visual", "API", "A11y", "Mobile"]} series={series} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Defensive input</h3>
                  <p>非法数值裁切，缺失值按 0 兜底，非法颜色回退；完整长标签仍通过 SVG title 保留。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <RadarChart axes={capabilityAxes} legendMaxItems={1} series={defensiveSeries} title="Imported radar profile" valueFormatter={(value) => `${value}/100`} />
                </div>
                <pre className="button-doc-code" aria-label="RadarChart defensive 代码">
                  <code>{`<RadarChart axes={axes} series={series} legendMaxItems={1} valueFormatter={(value) => value + "/100"} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>States</h3>
                  <p>空态、加载态、错误态复用 ChartFrame，保持稳定尺寸和语义。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <div className="charts-doc-state-grid">
                    <RadarChart axes={capabilityAxes.slice(0, 2)} emptyText="Need at least three axes" series={[]} title="Empty radar" />
                    <RadarChart axes={capabilityAxes} loading loadingText="Loading profile" series={releaseSeries.slice(0, 1)} title="Loading radar" />
                    <RadarChart axes={capabilityAxes} error="Radar profile service unavailable." series={releaseSeries.slice(0, 1)} title="Error radar" />
                  </div>
                </div>
                <pre className="button-doc-code" aria-label="RadarChart states 代码">
                  <code>{`<RadarChart axes={axes} series={[]} emptyText="Need at least three axes" />`}</code>
                </pre>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="radar-api" aria-labelledby="radar-api-title">
            <h3 id="radar-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="radar-labels" aria-labelledby="radar-labels-title">
            <h3 id="radar-labels-title">坐标与图例</h3>
            <DataTable rows={labelRows} />
          </section>

          <section className="button-doc-section" id="radar-a11y" aria-labelledby="radar-a11y-title">
            <h3 id="radar-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层使用 ChartFrame 的 figure 语义，title / summary 连接 aria-labelledby 和 aria-describedby。</li>
              <li>SVG 内部输出 title / desc；每个序列点位都有原生 SVG title，包含序列、维度和值。</li>
              <li>状态层出现时底层 SVG 从辅助技术隐藏，避免同时读到状态和陈旧图形。</li>
              <li>颜色只用于辅助区分，业务结论应写进 summary 或邻近正文。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="radar-mobile" aria-labelledby="radar-mobile-title">
            <h3 id="radar-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="radar-security" aria-labelledby="radar-security-title">
            <h3 id="radar-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="radar-review" aria-labelledby="radar-review-title">
            <h3 id="radar-review-title">五专家小组</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
