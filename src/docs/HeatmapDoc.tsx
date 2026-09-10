import { Heatmap } from "../components/charts";
import type { HeatmapDatum } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type HeatmapDocProps = {
  showAnchors?: boolean;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export const heatmapDocMeta = {
  title: "Heatmap 热力图",
  category: "可视化组件",
  anchors: [
    { id: "heatmap-when", label: "何时使用" },
    { id: "heatmap-demo", label: "代码演示" },
    { id: "heatmap-api", label: "API" },
    { id: "heatmap-states", label: "状态" },
    { id: "heatmap-mobile", label: "移动端" },
    { id: "heatmap-a11y", label: "可访问性" },
    { id: "heatmap-security", label: "安全" },
    { id: "heatmap-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const channels = ["Search", "Docs", "Console", "API", "Support"];

const usageData: HeatmapDatum[] = [
  { x: "Mon", y: "Search", value: 42 },
  { x: "Tue", y: "Search", value: 58 },
  { x: "Wed", y: "Search", value: 61 },
  { x: "Thu", y: "Search", value: 74 },
  { x: "Fri", y: "Search", value: 68 },
  { x: "Sat", y: "Search", value: 38 },
  { x: "Sun", y: "Search", value: 29 },
  { x: "Mon", y: "Docs", value: 36 },
  { x: "Tue", y: "Docs", value: 44 },
  { x: "Wed", y: "Docs", value: 57 },
  { x: "Thu", y: "Docs", value: 63 },
  { x: "Fri", y: "Docs", value: 72 },
  { x: "Sat", y: "Docs", value: 41 },
  { x: "Sun", y: "Docs", value: 33 },
  { x: "Mon", y: "Console", value: 28 },
  { x: "Tue", y: "Console", value: 34 },
  { x: "Wed", y: "Console", value: 49 },
  { x: "Thu", y: "Console", value: 67 },
  { x: "Fri", y: "Console", value: 83 },
  { x: "Sat", y: "Console", value: 52 },
  { x: "Sun", y: "Console", value: 45 },
  { x: "Mon", y: "API", value: 18 },
  { x: "Tue", y: "API", value: 26 },
  { x: "Wed", y: "API", value: 48 },
  { x: "Thu", y: "API", value: 71 },
  { x: "Fri", y: "API", value: 88 },
  { x: "Sat", y: "API", value: 69 },
  { x: "Sun", y: "API", value: 55 },
  { x: "Mon", y: "Support", value: 22 },
  { x: "Tue", y: "Support", value: 31 },
  { x: "Wed", y: "Support", value: 39 },
  { x: "Thu", y: "Support", value: 46 },
  { x: "Fri", y: "Support", value: 54 },
  { x: "Sat", y: "Support", value: 61 },
  { x: "Sun", y: "Support", value: 43 },
];

const nullSafetyData: HeatmapDatum[] = [
  { x: "Mon", y: "API", value: 18 },
  { x: "Tue", y: "API", value: null },
  { x: "Wed", y: "API", value: null },
  { x: "Thu", y: "API", value: 71 },
  { x: "Fri", y: "API", value: Number.NaN },
  { x: "Mon", y: "Docs", value: 36 },
  { x: "Tue", y: "Docs", value: 44 },
  { x: "Wed", y: "Docs", value: 57 },
];

const largeMatrixData: HeatmapDatum[] = Array.from({ length: 48 }, (_, xIndex) =>
  Array.from({ length: 38 }, (_, yIndex) => ({
    x: `Sprint ${xIndex + 1}`,
    y: `Service ${yIndex + 1}`,
    value: ((xIndex * 17 + yIndex * 11) % 100) + (yIndex % 5),
  })),
).flat();

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ x: string; y: string; value?: number | null }>",
    description: "二维矩阵数据入口。只有有限 number 参与颜色域、tooltip 数值 formatter 和聚合；null、未传值、NaN、Infinity 作为空值处理。",
  },
  {
    name: "xCategories / yCategories",
    value: "string[]",
    description: "显式锁定横轴和纵轴顺序，也可展示没有数据的空白单元格。",
  },
  {
    name: "colorDomain / colorStops",
    value: "[number, number] / HeatmapColorStop[]",
    description: "锁定色阶数值域并配置色阶；颜色只接受安全十六进制，非法颜色自动回退。",
  },
  {
    name: "showLegend / showTooltip / showDataTable",
    value: "boolean",
    description: "控制色阶图例、SVG title 提示和可访问数据表。数据表默认开启。",
  },
  {
    name: "height / margin / minCellSize / cellGap",
    value: "number",
    description: "控制 SVG 尺寸、绘图区、最小单元格和间距；窄屏下通过容器横向滚动保护布局。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "no finite cells",
    description: "空数组、全 null、全缺省值、全 NaN、全 Infinity 或没有有效类别时触发 ChartFrame 空态。",
  },
  {
    name: "missing cell",
    value: "x/y category without finite datum",
    description: "显式类别中缺失或只有空值的数据会显示为浅色空白格，并在数据表中标为 n/a，不调用 valueFormatter。",
  },
  {
    name: "large matrix",
    value: "sampled + averaged",
    description: "超过 SVG 预算时采样 x/y 类别；落入同一渲染桶的有限值取平均，表格以 avg n 标记聚合数量。",
  },
  {
    name: "loading / error",
    value: "ChartFrame state layer",
    description: "加载设置 aria-busy，错误使用 alert 状态层，底层 SVG 在状态期间对辅助技术隐藏。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "覆盖二维分类强弱分布、缺失单元格、聚合提示和结论摘要；适合渠道 x 日期、模块 x 阶段等矩阵。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "默认色阶为冷浅底到蓝绿再到深紫；legend、标签和格子间距在窄屏可滚动。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "使用自有 React + SVG，无 antd、antd-mobile、@ant-design/charts；类别、尺寸、domain、颜色和空值均有收敛。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "覆盖正常矩阵、空态、加载、错误、空值缺失格、聚合、移动横向滚动和数据表核对路径。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "文本由 React 转义，颜色限定为安全 hex，formatter 异常回退；不解析 HTML 字符串。",
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

const oneLineExample = "<Heatmap data={usageData} xCategories={days} yCategories={channels} title=\"Channel usage\" />";

export function HeatmapDoc({ showAnchors = false }: HeatmapDocProps) {
  return (
    <TutorialScaffold component="Heatmap" kind="display" oneLineExample={oneLineExample}>
      <section className="heatmap-doc" aria-labelledby="heatmap-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Heatmap 文档目录">
            {heatmapDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">chart doc</p>
            <h2 id="heatmap-doc-title">{heatmapDocMeta.title}</h2>
            <p>自有 SVG Heatmap，用色阶展示二维矩阵强弱，并内置 legend、SVG title 提示、空值缺失格、聚合提示和可访问数据表。</p>
          </header>

          <section className="button-doc-section" id="heatmap-when" aria-labelledby="heatmap-when-title">
            <h3 id="heatmap-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于两个分类维度交叉后的强弱分布，例如日期 x 渠道、功能 x 环境、地区 x 指标。</li>
              <li>万级输入会在 SVG 预算内采样类别并对同桶有限值取平均；需要逐像素审阅时应先做服务端分片或筛选。</li>
              <li>不要只靠颜色表达结论，应提供 summary 或页面说明，并保留数据表核对路径。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="heatmap-demo" aria-labelledby="heatmap-demo-title">
            <div className="button-doc-section__heading">
              <h3 id="heatmap-demo-title">代码演示</h3>
              <p>一行样例覆盖固定 x/y categories、百分比格式化、色阶图例、tooltip title、空值缺失格、聚合提示和可访问数据表。</p>
            </div>
            <div className="charts-doc-demo-grid heatmap-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Channel usage heatmap</h3>
                  <p>矩阵单元格用自有 SVG rect 渲染，数据表在图表下方独立滚动。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <Heatmap
                    colorDomain={[0, 100]}
                    data={usageData}
                    summary="API on Friday is the hottest cell at 88%, while API on Monday is the lowest at 18%."
                    title="Channel usage by weekday"
                    valueFormatter={(value: number) => `${value}%`}
                    xCategories={days}
                    yCategories={channels}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Heatmap 代码">
                  <code>{`<Heatmap data={usageData} xCategories={days} yCategories={channels} colorDomain={[0, 100]} valueFormatter={(value) => value + "%"} title="Channel usage by weekday" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Missing cells and state</h3>
                  <p>显式类别允许展示缺失格；状态层不改变图表容器尺寸。</p>
                </div>
                <div className="charts-doc-demo__preview heatmap-doc-state-stack">
                  <Heatmap
                    data={nullSafetyData}
                    height={260}
                    showDataTable={false}
                    summary="API values for Tuesday, Wednesday, and Friday are empty and do not enter the color domain."
                    title="Null and missing cells"
                    valueFormatter={(value: number) => `${value}%`}
                    xCategories={days}
                    yCategories={["API", "Docs", "Support"]}
                  />
                  <Heatmap data={[]} emptyText="No heatmap cells" height={220} title="Empty heatmap" />
                  <Heatmap data={usageData} height={220} loading loadingText="Loading heatmap" title="Loading heatmap" />
                  <Heatmap data={usageData} error="Heatmap service unavailable." height={220} title="Error heatmap" />
                </div>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Aggregated large matrix</h3>
                  <p>超过 SVG 预算后保留 SVG 渲染并聚合有限值，表格标记平均值来源数量。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <Heatmap
                    data={largeMatrixData}
                    height={340}
                    minCellSize={18}
                    summary="The 48 by 38 source matrix is sampled into the SVG render budget; bucket values are averaged."
                    title="Large service matrix"
                    valueFormatter={(value: number) => `${Math.round(value)}%`}
                  />
                </div>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="heatmap-api" aria-labelledby="heatmap-api-title">
            <h3 id="heatmap-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="heatmap-states" aria-labelledby="heatmap-states-title">
            <h3 id="heatmap-states-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="heatmap-mobile" aria-labelledby="heatmap-mobile-title">
            <h3 id="heatmap-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>SVG 和数据表都设置最小宽度，并由容器横向滚动，避免标签、legend 和单元格压缩重叠。</li>
              <li>长 x/y 标签会截断展示，完整内容保留在 SVG title 和数据表表头中。</li>
              <li>移动端不依赖 hover；关键结论应写入 summary，逐格值可通过数据表核对。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="heatmap-a11y" aria-labelledby="heatmap-a11y-title">
            <h3 id="heatmap-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层 ChartFrame 使用 figure 语义，SVG 内置 title / desc，状态层使用 status 或 alert。</li>
              <li>每个有限值单元格带 aria-label 和可选 SVG title，读出 x、y、格式化后的 value 和聚合数量；空值格读作 No data。</li>
              <li>默认渲染数据表，作为屏幕阅读器、键盘浏览、复制和测试验收的非颜色通道。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="heatmap-security" aria-labelledby="heatmap-security-title">
            <h3 id="heatmap-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>不引入 antd、antd-mobile、@ant-design/charts 或其他图表库。</li>
              <li>所有标签和摘要作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。</li>
              <li>颜色输入限定为安全十六进制；非法颜色、空值、非法数值和异常 formatter 均有回退路径。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="heatmap-review" aria-labelledby="heatmap-review-title">
            <h3 id="heatmap-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
