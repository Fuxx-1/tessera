import { SankeyChart } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type SankeyChartDocProps = {
  showAnchors?: boolean;
};

export const sankeyChartDocMeta = {
  title: "SankeyChart 桑基图",
  category: "可视化组件",
  anchors: [
    { id: "sankey-when", label: "何时使用" },
    { id: "sankey-demos", label: "代码演示" },
    { id: "sankey-api", label: "API" },
    { id: "sankey-layout", label: "布局边界" },
    { id: "sankey-a11y", label: "可访问性" },
    { id: "sankey-mobile", label: "移动端" },
    { id: "sankey-security", label: "安全" },
    { id: "sankey-review", label: "五专家小组" },
  ],
} satisfies ComponentDocMeta;

const flowNodes = [
  { id: "source", label: "Traffic source", layer: 0 },
  { id: "organic", label: "Organic search", layer: 1, order: 0 },
  { id: "campaign", label: "Campaign", layer: 1, order: 1 },
  { id: "signup", label: "Signup", layer: 2, order: 0 },
  { id: "trial", label: "Trial workspace", layer: 3, order: 0 },
  { id: "paid", label: "Paid plan", layer: 4, order: 0 },
  { id: "lost", label: "Lost", layer: 4, order: 1 },
];

const flowLinks = [
  { source: "source", target: "organic", value: 6200 },
  { source: "source", target: "campaign", value: 3800 },
  { source: "organic", target: "signup", value: 2600 },
  { source: "campaign", target: "signup", value: 1900 },
  { source: "signup", target: "trial", value: 2700 },
  { source: "signup", target: "lost", value: 1800 },
  { source: "trial", target: "paid", value: 940 },
  { source: "trial", target: "lost", value: 1760 },
];

const inferredNodes = [
  { id: "raw", label: "Raw intake" },
  { id: "valid", label: "Validated" },
  { id: "review", label: "Manual review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const inferredLinks = [
  { source: "raw", target: "valid", value: 960 },
  { source: "raw", target: "review", value: 240 },
  { source: "valid", target: "approved", value: 820 },
  { source: "review", target: "approved", value: 90 },
  { source: "review", target: "rejected", value: 150 },
];

const defensiveNodes = [
  { id: "a", label: "<script>alert(1)</script> source label for truncation coverage", layer: 0 },
  { id: "b", label: "Clean target", layer: 1 },
  { id: "c", label: "Ignored isolated", layer: 2 },
];

const defensiveLinks = [
  { source: "a", target: "b", value: 42 },
  { source: "a", target: "missing", value: 99 },
  { source: "b", target: "b", value: 12 },
  { source: "a", target: "c", value: Number.NaN },
  { source: "b", target: "a", value: -8 },
  { source: "b", target: "a", value: 6 },
];

const largeFlowNodes = Array.from({ length: 34 }, (_, index) => ({
  id: `large-${index}`,
  label: `Large flow node ${index + 1}`,
  layer: index < 10 ? 0 : index < 24 ? 1 : 2,
  order: index,
}));

const largeFlowLinks = Array.from({ length: 78 }, (_, index) => ({
  source: `large-${index % 10}`,
  target: `large-${10 + (index % 14)}`,
  value: 900 - index * 7,
}));

const apiRows: DocRow[] = [
  {
    name: "nodes",
    value: "Array<{ id; label; layer?; order?; value? }>",
    description: "节点 id 必须唯一且非空。label 会规范化为纯文本；layer/order 用于简单分层排布。",
  },
  {
    name: "links",
    value: "Array<{ source; target; value; label? }>",
    description: "source/target 引用节点 id，value 必须为有限正数。缺失节点、自环、NaN、Infinity、非正数、循环和反向边会被过滤。",
  },
  {
    name: "height / margin",
    value: "number / Partial<ChartMargin>",
    description: "控制 SVG 高度和绘图区边距。组件会收敛非法值，并通过最小宽度支持移动端横向平移。",
  },
  {
    name: "nodeWidth / nodeGap",
    value: "number",
    description: "控制节点矩形宽度和同层节点间距。非法值会收敛到安全区间，避免节点重叠或空白图。",
  },
  {
    name: "minLinkWidth / maxLinkWidth",
    value: "number",
    description: "link 宽度按 value 在 source/target 节点流量带内成比例堆叠，并收敛到安全区间。",
  },
  {
    name: "maxNodes / maxLinks",
    value: "number",
    description: "大数据默认保留最多 120 个节点、180 条最高 value 链路；被采样和被过滤数据会在 notice 中提示。",
  },
  {
    name: "colors",
    value: "string[]",
    description: "节点色板按顺序循环使用。仅接受十六进制颜色，非法颜色回退到内置 chartSeriesColors。",
  },
  {
    name: "valueFormatter",
    value: "(value) => string",
    description: "格式化节点值、link title 和自动摘要中的数值；异常 formatter 会回退默认格式化。",
  },
  {
    name: "showValues / labelMaxLength",
    value: "boolean / number",
    description: "控制节点旁数值和视觉标签截断长度。完整 label 保留在 SVG title 中。",
  },
];

const layoutRows: DocRow[] = [
  {
    name: "explicit layer",
    value: "node.layer",
    description: "推荐业务侧传入 layer，以保证节点列稳定、可复核、可截图验收。",
  },
  {
    name: "inferred layer",
    value: "simple DAG pass",
    description: "未传 layer 时会从无入边节点开始做简单拓扑层级推断；循环/反向边过滤，复杂交叉和最优避让不属于当前覆盖范围。",
  },
  {
    name: "column order",
    value: "node.order / input order",
    description: "同层节点按 order 排序，未传 order 时按输入顺序。当前不做自动交叉最小化。",
  },
  {
    name: "node value",
    value: "max(incoming, outgoing, node.value, 1)",
    description: "节点高度取入流、出流和显式 value 的最大值，用于稳定表达流量规模。",
  },
  {
    name: "link stack",
    value: "value / node total",
    description: "link 的纵向位置按节点累计流量计算，避免多条边只按数量均分导致宽度与位置不一致。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "适合小中型流向解释、来源去向和损耗阅读；文档明确不是复杂自动布局全覆盖，避免误用于大规模网络图。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "节点、link、标签和数值分层清晰；色板延续图表中性多色系统，不使用单一蓝色主题。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "实现为 React + 自有 SVG，未引入 antd、antd-mobile、@ant-design/charts 或外部 Sankey 布局库。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "覆盖显式 layer、自动推断 layer、非法/循环 link 过滤、采样 notice、空态、加载态、错误态、长标签和窄屏横向滚动。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "文本均通过 React 文本节点输出；颜色白名单、有限正数过滤和 formatter 兜底降低 SVG 注入及非法坐标风险。",
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

const oneLineExample = "<SankeyChart nodes={flowNodes} links={flowLinks} title=\"Acquisition flow\" />";

export function SankeyChartDoc({ showAnchors = false }: SankeyChartDocProps) {
  return (
    <TutorialScaffold component="SankeyChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc sankey-chart-doc" aria-labelledby="sankey-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="SankeyChart 文档目录">
            {sankeyChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="sankey-chart-doc-title">{sankeyChartDocMeta.title}</h2>
            <p>
              自有 SVG 桑基图组件，用于小中型节点流向展示。当前支持 nodes、links、value、简单分层布局、
              link 宽度、标签、可访问摘要和移动端安全滚动；它不是复杂自动布局全覆盖。
            </p>
          </header>

          <section className="button-doc-section" id="sankey-when" aria-labelledby="sankey-when-title">
            <h3 id="sankey-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于表达来源、去向、损耗、转化和资源分配等少量节点之间的流量关系。</li>
              <li>推荐传入 layer/order，让图形结构稳定并便于产品、测试和截图验收。</li>
              <li>大规模网络会先按最高流量采样；循环探索、自动避让、交叉最小化和交互探索应进入独立布局模块后再实现。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sankey-demos" aria-labelledby="sankey-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="sankey-demos-title">代码演示</h3>
              <p>示例覆盖显式分层、自动推断、非法/循环 link 过滤、采样和状态层。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Explicit layered flow</h3>
                  <p>业务传入 layer/order，节点列和同层顺序稳定。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <SankeyChart
                    links={flowLinks}
                    nodes={flowNodes}
                    summary="Traffic starts from one source, splits into organic and campaign, then flows through signup and trial toward paid or lost outcomes."
                    title="Acquisition flow"
                    valueFormatter={(value) => value.toLocaleString("en-US")}
                  />
                </div>
                <pre className="button-doc-code" aria-label="Explicit layered flow 代码">
                  <code>{`<SankeyChart nodes={nodes} links={links} title="Acquisition flow" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Inferred simple layers</h3>
                  <p>未传 layer 时按简单有向流推断列，不做复杂交叉优化。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <SankeyChart
                    height={280}
                    links={inferredLinks}
                    nodes={inferredNodes}
                    summary="Raw intake splits into validated and manual review paths before approved or rejected outcomes."
                    title="Review flow"
                  />
                </div>
                <pre className="button-doc-code" aria-label="Inferred simple layers 代码">
                  <code>{`<SankeyChart nodes={nodesWithoutLayer} links={links} title="Review flow" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Defensive links</h3>
                  <p>缺失节点、自环、负值和循环/反向边会被过滤，长标签视觉截断。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <SankeyChart
                    height={240}
                    labelMaxLength={12}
                    links={defensiveLinks}
                    nodes={defensiveNodes}
                    summary="Only valid positive links between existing nodes are rendered."
                    title="Defensive Sankey"
                  />
                </div>
                <pre className="button-doc-code" aria-label="Defensive links 代码">
                  <code>{`<SankeyChart nodes={defensiveNodes} links={defensiveLinks} labelMaxLength={12} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Sampled large flow</h3>
                  <p>大量边按 value 保留最高流量，notice 暴露采样数量。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <SankeyChart
                    height={260}
                    links={largeFlowLinks}
                    maxLinks={18}
                    nodes={largeFlowNodes}
                    showValues={false}
                    summary="Large generated flow keeps the highest-value links within the configured SVG render cap."
                    title="Sampled Sankey"
                  />
                </div>
                <pre className="button-doc-code" aria-label="Sampled large flow 代码">
                  <code>{`<SankeyChart nodes={largeNodes} links={largeLinks} maxLinks={18} showValues={false} />`}</code>
                </pre>
              </article>
            </div>
            <pre className="button-doc-code sankey-chart-doc__one-line" aria-label="SankeyChart single row acceptance example">
              <code>{`<SankeyChart nodes={[{ id: "source", label: "Source", layer: 0 }, { id: "target", label: "Target", layer: 1 }]} links={[{ source: "source", target: "target", value: 42 }]} />`}</code>
            </pre>
            <div className="charts-doc-state-grid">
              <SankeyChart emptyText="No flow data" links={[]} nodes={[]} title="Empty Sankey" />
              <SankeyChart links={flowLinks} loading nodes={flowNodes} title="Loading Sankey" />
              <SankeyChart error="Flow service unavailable." links={flowLinks} nodes={flowNodes} title="Error Sankey" />
            </div>
          </section>

          <section className="button-doc-section" id="sankey-api" aria-labelledby="sankey-api-title">
            <h3 id="sankey-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="sankey-layout" aria-labelledby="sankey-layout-title">
            <div className="button-doc-section__heading">
              <h3 id="sankey-layout-title">布局边界</h3>
              <p>当前目标是可解释、可验收的小中型分层流向图，不承诺覆盖复杂自动布局。</p>
            </div>
            <DataTable rows={layoutRows} />
          </section>

          <section className="button-doc-section" id="sankey-a11y" aria-labelledby="sankey-a11y-title">
            <h3 id="sankey-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层使用 ChartFrame 的 figure 语义，title 和 summary 连接到可访问名称与描述。</li>
              <li>SVG 内部输出 title / desc；节点 rect 和 link path 均提供原生 SVG title。</li>
              <li>loading、error、empty 状态下隐藏底层 SVG，避免辅助技术读到陈旧图形。</li>
              <li>关键业务结论应写入 summary，颜色和 link 宽度只作为辅助表达。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sankey-mobile" aria-labelledby="sankey-mobile-title">
            <h3 id="sankey-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>SVG 使用稳定 viewBox 和 640px 级最小宽度，窄屏由图表容器横向滚动。</li>
              <li>不依赖 hover tooltip；移动端通过可见标签、SVG title 和 summary 读取信息。</li>
              <li>长标签截断显示并保留完整 title，避免撑破 360-430px 宽度的文档布局。</li>
              <li>大量节点/边由 maxNodes/maxLinks 控制 SVG 负载，优先采样高 value 链路，360/390/430px 移动端保持页面本身不横向溢出。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sankey-security" aria-labelledby="sankey-security-title">
            <h3 id="sankey-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>未使用 dangerouslySetInnerHTML；label、summary、formatter 输出均作为 React 文本节点渲染。</li>
              <li>links 只接受有限正数，缺失节点、自环、循环/反向边和非法坐标来源会被过滤。</li>
              <li>colors 仅接受安全十六进制颜色，非法颜色回退内置色板。</li>
              <li>实现不依赖 antd、antd-mobile、@ant-design/charts 或外部图表库。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sankey-review" aria-labelledby="sankey-review-title">
            <h3 id="sankey-review-title">五专家小组结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
