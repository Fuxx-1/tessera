import { FunnelChart } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type FunnelChartDocProps = {
  showAnchors?: boolean;
};

export const funnelChartDocMeta = {
  title: "FunnelChart 漏斗图",
  category: "可视化组件",
  anchors: [
    { id: "funnel-when", label: "何时使用" },
    { id: "funnel-demos", label: "代码演示" },
    { id: "funnel-api", label: "API" },
    { id: "funnel-labels", label: "标签与图例" },
    { id: "funnel-a11y", label: "可访问性" },
    { id: "funnel-mobile", label: "移动端" },
    { id: "funnel-security", label: "安全" },
    { id: "funnel-review", label: "五专家小组" },
  ],
} satisfies ComponentDocMeta;

const conversionData = [
  { stage: "Visitors", value: 12800 },
  { stage: "Signup started", value: 6400 },
  { stage: "Account verified", value: 4200 },
  { stage: "Workspace created", value: 2680 },
  { stage: "Paid plan", value: 940 },
];

const campaignData = [
  { stage: "Ad impressions", value: 54000 },
  { stage: "Landing visits", value: 18400 },
  { stage: "Trial installs", value: 5200 },
  { stage: "Activated teams", value: 1680 },
];

const defensiveData = [
  { stage: "Raw import", value: 2500 },
  { stage: "Invalid zero", value: 0 },
  { stage: "Invalid refund", value: -30 },
  { stage: "Qualified", value: 1280 },
  { stage: "Invalid NaN", value: Number.NaN },
  { stage: "Converted", value: 410 },
];

const orderedData = [
  { stage: "1. Invited", value: 1200 },
  { stage: "2. Qualified", value: 820 },
  { stage: "3. Reopened", value: 930 },
  { stage: "4. Won", value: 260 },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ stage?: string; label?: string; value: number }>",
    description: "按传入顺序绘制阶段，不自动排序。stage 为首选字段，label 用于兼容通用 ChartDatum；0、负数、NaN 和 Infinity 不进入漏斗。",
  },
  {
    name: "height",
    value: "number",
    description: "控制 SVG viewBox 高度，内部最小高度为 220，保证移动端和状态层有稳定空间。",
  },
  {
    name: "maxSegments",
    value: "number",
    description: "限制进入 SVG 的正值阶段数，默认 40。超出时截断并展示 notice，长列表会降低内联标签密度。",
  },
  {
    name: "colors",
    value: "string[]",
    description: "阶段色板按顺序循环使用。仅接受安全十六进制颜色，空数组或非法颜色回退到内置 chartSeriesColors。",
  },
  {
    name: "valueFormatter",
    value: "(value, datum) => string",
    description: "格式化阶段 value，复用于 SVG title、中心标签和辅助技术描述。",
  },
  {
    name: "stageFormatter",
    value: "(stage, segment, index) => string",
    description: "格式化阶段名。输出会规范化为空白压缩和长度限制，避免超长标签撑开移动端布局。",
  },
  {
    name: "percentFormatter",
    value: "(percent, segment, index) => string",
    description: "格式化相对首阶段转化率。默认使用百分比，一位小数。",
  },
  {
    name: "dropoffFormatter",
    value: "(dropoff, segment, index) => string",
    description: "格式化相对上一阶段流失率。负值会按 Gain 展示，便于表达阶段回补或补录。",
  },
];

const labelRows: DocRow[] = [
  {
    name: "showStageLabels",
    value: "boolean",
    description: "控制漏斗中心阶段名，默认开启。完整阶段名保留在 SVG title 中。",
  },
  {
    name: "showValueLabels",
    value: "boolean",
    description: "控制中心数值标签，默认开启。关闭后不会影响 polygon title 和图例转化率。",
  },
  {
    name: "showPercentLabels",
    value: "boolean",
    description: "控制相对首阶段百分比，默认开启。该口径适合产品漏斗总转化。",
  },
  {
    name: "showDropoffLabels",
    value: "boolean",
    description: "控制左侧流失标签，默认开启。第一阶段没有上一阶段，不显示 dropoff。",
  },
  {
    name: "showLegend / legendMaxItems",
    value: "boolean / number",
    description: "控制右侧图例和可见项数。超出后展示 +N more，避免密集阶段在窄屏堆叠。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stable viewBox + horizontal pan",
    description: "FunnelChart 使用固定 viewBox 和最小宽度；容器可横向平移，legend 与 dropoff 标签不挤压中心图形。",
  },
  {
    name: "labels",
    value: "truncate + SVG title",
    description: "阶段和 legend 标签在视觉上截断，完整值进入 title；长列表小段会隐藏数值/dropoff 内联文本。业务关键结论应写入 summary。",
  },
  {
    name: "touch",
    value: "no hover dependency",
    description: "不依赖 hover tooltip。移动端通过可见标签、原生 title 和 figure summary 读取核心信息。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "按传入阶段顺序表达转化链路；percent 明确为相对首阶段，dropoff 明确为相对上一阶段，适合业务复盘。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "漏斗使用多色序列和稳定梯形，不使用单一蓝色主题；标签、图例和流失信息分区展示，移动端允许平移。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "实现为自有 SVG + ChartFrame，无 antd、antd-mobile、@ant-design/charts 或外部图表库；输入过滤、formatter 兜底和颜色白名单已覆盖。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "覆盖正常漏斗、无图例、非法值过滤、空态、加载态、错误态、长标签和窄屏横向滚动。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "label、summary 和 formatter 输出均作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML；非法颜色不会进入 style fill。",
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

const oneLineExample = "<FunnelChart data={conversionData} title=\"Signup funnel\" summary=\"Paid conversion is 7.3%.\" />";

export function FunnelChartDoc({ showAnchors = false }: FunnelChartDocProps) {
  return (
    <TutorialScaffold component="FunnelChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc funnel-chart-doc" aria-labelledby="funnel-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="FunnelChart 文档目录">
            {funnelChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="funnel-chart-doc-title">{funnelChartDocMeta.title}</h2>
            <p>
              自有 SVG 漏斗图组件，用于展示阶段转化、流失和最终达成率。它独立于 BarChart 文档，不依赖 antd、
              @ant-design/charts 或外部图表库。
            </p>
          </header>

          <section className="button-doc-section" id="funnel-when" aria-labelledby="funnel-when-title">
            <h3 id="funnel-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于有明确阶段顺序的转化链路，例如注册、支付、营销活动和审核流程。</li>
              <li>当重点是单阶段横向分类对比时使用 BarChart；当重点是阶段递进和损耗时使用 FunnelChart。</li>
              <li>组件保持数据传入顺序，不按 value 自动排序；需要固定业务阶段时请在上游显式排序并命名。</li>
              <li>不要用面积代表精确容量；关键结论应写入 summary，并在页面上下文中注明统计周期。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="funnel-demos" aria-labelledby="funnel-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="funnel-demos-title">代码演示</h3>
              <p>示例覆盖默认标签、无图例紧凑模式、非法值过滤和状态层。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Default conversion funnel</h3>
                  <p>展示 stage、value、相对首阶段 percent 和相对上一阶段 dropoff。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <FunnelChart
                    data={conversionData}
                    summary="Paid plan conversion is 7.3% from visitors, with the largest loss between visitors and signup started."
                    title="Signup conversion"
                    valueFormatter={(value) => `${Math.round(value).toLocaleString("en-US")} users`}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Default FunnelChart 代码">
                  <code>{`<FunnelChart data={conversionData} title="Signup conversion" showDropoffLabels />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Compact without legend</h3>
                  <p>关闭 legend 后漏斗区域自动加宽，适合移动卡片或窄容器。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <FunnelChart
                    data={campaignData}
                    height={260}
                    showLegend={false}
                    summary="Activated teams are 3.1% of impressions and 32.3% of trial installs."
                    title="Campaign funnel"
                    valueFormatter={(value) => `${Math.round(value).toLocaleString("en-US")}`}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Compact FunnelChart 代码">
                  <code>{`<FunnelChart data={campaignData} showLegend={false} height={260} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Defensive data</h3>
                  <p>value 为 0、负数、NaN 或 Infinity 的阶段会被过滤，desc 中保留忽略数量。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <FunnelChart data={defensiveData} legendMaxItems={2} title="Import quality funnel" />
                </div>
                <pre className="button-doc-code" aria-label="Defensive FunnelChart 代码">
                  <code>{`<FunnelChart data={defensiveData} legendMaxItems={2} title="Import quality funnel" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Passed order with recovery</h3>
                  <p>漏斗保持传入顺序；阶段回补时下一段会变宽，dropoff 显示为 Gain。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <FunnelChart
                    data={orderedData}
                    height={260}
                    showLegend={false}
                    summary="The reopened stage is intentionally wider than the qualified stage because FunnelChart preserves business order."
                    title="Pipeline order"
                  />
                </div>
                <pre className="button-doc-code" aria-label="Ordered FunnelChart 代码">
                  <code>{`<FunnelChart data={orderedData} showLegend={false} title="Pipeline order" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>States</h3>
                  <p>加载、错误和空数据沿用 ChartFrame 状态层，并隐藏底层 SVG 语义。</p>
                </div>
                <div className="charts-doc-demo__preview funnel-chart-doc__states">
                  <FunnelChart data={[]} emptyText="No funnel stages" title="Empty funnel" />
                  <FunnelChart data={campaignData} loading loadingText="Loading funnel" title="Loading funnel" />
                  <FunnelChart data={campaignData} error="Funnel service unavailable." title="Error funnel" />
                </div>
                <pre className="button-doc-code" aria-label="FunnelChart 状态代码">
                  <code>{`<FunnelChart data={[]} emptyText="No funnel stages" />`}</code>
                </pre>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="funnel-api" aria-labelledby="funnel-api-title">
            <h3 id="funnel-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="funnel-labels" aria-labelledby="funnel-labels-title">
            <h3 id="funnel-labels-title">标签与图例</h3>
            <DataTable rows={labelRows} />
          </section>

          <section className="button-doc-section" id="funnel-a11y" aria-labelledby="funnel-a11y-title">
            <h3 id="funnel-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层继承 ChartFrame 的 figure 语义，title 和 summary 连接到 aria-labelledby / aria-describedby。</li>
              <li>SVG 内部输出 title / desc；每个 polygon 提供 stage、value、percent 和 dropoff 的 title。</li>
              <li>loading、error 或 empty 状态下 SVG 标记为 aria-hidden，避免读屏同时读到状态层和陈旧图形。</li>
              <li>颜色只做辅助识别；percent、dropoff 和 summary 承担主要信息表达。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="funnel-mobile" aria-labelledby="funnel-mobile-title">
            <h3 id="funnel-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="funnel-security" aria-labelledby="funnel-security-title">
            <h3 id="funnel-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>所有标签、summary、formatter 输出都作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。</li>
              <li>value 只接受有限正数进入绘制；非法阶段触发过滤，不产生非法 SVG 坐标。</li>
              <li>colors 只接受安全十六进制颜色；非法输入回退到内置多色序列。</li>
              <li>实现未引入 antd、antd-mobile、@ant-design/charts 或其他图表依赖。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="funnel-review" aria-labelledby="funnel-review-title">
            <h3 id="funnel-review-title">五专家小组结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
