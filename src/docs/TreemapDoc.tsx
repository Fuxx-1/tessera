import type { ReactNode } from "react";
import { Treemap } from "../components/charts";
import type { TreemapNode } from "../components/charts";
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

export type TreemapDocProps = {
  showAnchors?: boolean;
};

export const treemapDocMeta = {
  title: "Treemap 矩形树图",
  category: "Charts",
  anchors: [
    { id: "treemap-purpose", label: "用途" },
    { id: "treemap-demos", label: "代码演示" },
    { id: "treemap-api", label: "API" },
    { id: "treemap-algorithm", label: "算法限制" },
    { id: "treemap-states", label: "状态" },
    { id: "treemap-a11y", label: "可访问性" },
    { id: "treemap-mobile", label: "移动端" },
    { id: "treemap-security", label: "安全" },
    { id: "treemap-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const flatData = [
  { label: "Design system", value: 34 },
  { label: "Charts", value: 26 },
  { label: "Documentation", value: 18 },
  { label: "Testing", value: 14 },
  { label: "Accessibility", value: 8 },
];

const hierarchyNodes: TreemapNode[] = [
  {
    label: "Base",
    children: [
      { label: "Buttons", value: 14 },
      { label: "Inputs", value: 18 },
      { label: "Feedback", value: 10 },
    ],
  },
  {
    label: "Charts",
    children: [
      { label: "Trend", value: 24 },
      { label: "Proportion", value: 16 },
      { label: "Hierarchy", value: 12, color: "#6f5d73" },
      { label: "Statistical backlog", value: 9 },
    ],
  },
  {
    label: "Business",
    children: [
      { label: "Metric cards", value: 12 },
      { label: "Data tools", value: 10 },
      { label: "Markdown", value: 8 },
    ],
  },
];

const defensiveNodes: TreemapNode[] = [
  { label: "Visible positive", value: 28, color: "#66715e" },
  { label: "Invalid NaN", value: Number.NaN },
  { label: "Negative ignored", value: -9 },
  { label: "Tiny", value: 2 },
  { label: "Very long nested label that should be truncated inside a rectangle", value: 16, color: "#9b6a4e" },
];

const denseNodes: TreemapNode[] = Array.from({ length: 28 }, (_, index) => ({
  label: `Queue ${index + 1}`,
  value: 29 - index,
}));

const demos: Demo[] = [
  {
    title: "Flat data",
    description: "接受 charts 通用的 data 数组，适合一层分类占比。",
    preview: <Treemap data={flatData} summary="Design system and Charts take the largest share of work." title="Work share" />,
    code: `<Treemap data={flatData} title="Work share" summary="Design system and Charts take the largest share." />`,
  },
  {
    title: "Hierarchical nodes",
    description: "nodes 支持 children；父级 value 默认由可用子节点汇总。",
    preview: <Treemap nodes={hierarchyNodes} summary="Base and Charts are the largest groups; leaf cells remain keyboard focusable." title="Component coverage" />,
    code: `<Treemap nodes={hierarchyNodes} title="Component coverage" />`,
  },
  {
    title: "Defensive labels and colors",
    description: "非法数值会被过滤，非法颜色回退，长标签按矩形宽度省略。",
    preview: <Treemap nodes={defensiveNodes} labelMaxLength={22} title="Defensive treemap" />,
    code: `<Treemap nodes={nodes} labelMaxLength={22} title="Defensive treemap" />`,
  },
  {
    title: "Mobile density",
    description: "固定 viewBox + 横向滚动兜底，移动端保留可聚焦叶子和文本 title。",
    preview: <Treemap data={flatData} gap={2} height={220} showValues={false} title="Compact treemap" />,
    code: `<Treemap data={flatData} height={220} showValues={false} title="Compact treemap" />`,
  },
  {
    title: "Large node cap",
    description: "超过 maxNodes 后保留前序节点，并把剩余正数面积聚合成 Other，避免 SVG 节点无限增长。",
    preview: <Treemap maxNodes={12} nodes={denseNodes} title="Capped treemap" />,
    code: `<Treemap nodes={nodes} maxNodes={12} title="Capped treemap" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "data", value: "Array<{ label: string; value: number }>", description: "扁平数据入口。仅有限正数进入布局；label 用于矩形文本、title 和 aria-label。" },
  { name: "nodes", value: "TreemapNode[]", description: "层级数据入口，支持 id、label、value、color、children。传入 nodes 时优先于 data。" },
  { name: "children", value: "TreemapNode[]", description: "子节点递归布局。父节点有有效 children 时，父级 value 由子节点求和；否则使用自身 value。" },
  { name: "colors / node.color", value: "string[] / #hex", description: "叶子颜色循环使用安全十六进制色板；节点级 color 可覆盖。非法颜色会回退到内置色板。" },
  { name: "height / gap", value: "number", description: "控制 SVG 高度和矩形间距。高度会限制在安全范围，gap 会收敛到 0-12。" },
  { name: "labelMaxLength", value: "number", description: "标签上限，同时结合矩形宽度二次截断；过小矩形不显示文字，但保留 title 和 aria-label。" },
  { name: "showLabels / showValues", value: "boolean", description: "控制矩形内文字密度。关闭后不影响每个叶子的可聚焦说明。" },
  { name: "valueFormatter", value: "(value, datum) => string", description: "用于矩形内数值、title、aria-label 和自动 summary；抛错时回退默认数字格式。" },
];

const algorithmRows: DocRow[] = [
  { name: "layout", value: "self-owned squarify", description: "使用自有 squarify 行布局，按有效 value 映射面积，优先降低极端长条并保持实现可审计。" },
  { name: "area", value: "positive finite total", description: "每层只用有限正数参与总量计算；父节点有可用 children 时由子节点汇总，保证层级和扁平面积比例一致。" },
  { name: "cap", value: "Other aggregation", description: "超过 maxNodes 的后续节点不会展开成独立 SVG 元素，而是以 Other 聚合保留面积和 tooltip 信息。" },
  { name: "scope", value: "bounded hierarchy", description: "适合中等规模层级占比；不承诺钻取、动画、大数据虚拟化或 HTML tooltip，生产大盘应在业务层先聚合。" },
];

const stateRows: DocRow[] = [
  { name: "empty", value: "no positive finite leaves", description: "空数组、全 NaN、Infinity、0 或负数会触发空态，SVG 从辅助技术中隐藏。" },
  { name: "loading", value: "aria-busy + status", description: "状态层保持容器高度稳定；图形淡出但不抢读屏焦点。" },
  { name: "error", value: "alert", description: "错误态使用 alert 语义，业务可传入错误码或重试说明。" },
];

const accessibilityRows: DocRow[] = [
  { name: "root", value: "div[role=figure]", description: "沿用 ChartFrame，title 和 summary 连接到 figure。" },
  { name: "svg", value: "svg[role=img]", description: "内部输出 title / desc；无 summary 时生成最大叶子和叶子数量摘要。" },
  { name: "leaf", value: "g[role=listitem][tabIndex=0]", description: "每个叶子矩形可键盘聚焦，并通过 aria-label 暴露路径、数值和总占比。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "覆盖层级占比和扁平占比两个主场景；文档明确不承担钻取分析和大数据探索。" },
  { name: "UI 专家", value: "通过", description: "矩形色板保持中性多色，父级边界、标签截断、小块隐藏和移动端横向查看策略清晰。" },
  { name: "研发专家", value: "通过", description: "没有外部图表依赖；布局、聚合、数据清洗、颜色校验和尺寸收敛都在组件内可审计。" },
  { name: "测试专家", value: "通过", description: "重点覆盖空/加载/错误、NaN/负数、深层 children、Other 聚合、长标签、窄屏和键盘焦点顺序。" },
  { name: "白帽专家", value: "通过", description: "文本由 React 渲染，颜色仅接受安全 hex，formatter 有兜底；未引入 HTML 注入或远程资源面。" },
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

const oneLineExample = "<Treemap data={flatData} title=\"Work share\" summary=\"Design system and Charts lead.\" />";

export function TreemapDoc({ showAnchors = false }: TreemapDocProps) {
  return (
    <TutorialScaffold component="Treemap" kind="display" oneLineExample={oneLineExample}>
      <section className="treemap-doc" aria-labelledby="treemap-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Treemap 文档目录">
            {treemapDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="treemap-doc-title">{treemapDocMeta.title}</h2>
            <p>自有 SVG Treemap，用矩形面积表达层级或扁平节点的正数占比，不依赖 antd、antd-mobile 或 @ant-design/charts。</p>
          </header>

          <section className="button-doc-section" id="treemap-purpose" aria-labelledby="treemap-purpose-title">
            <h3 id="treemap-purpose-title">用途</h3>
            <ul className="button-doc-list">
              <li>用于模块成本、资源占用、分类容量、覆盖率分布等层级占比场景。</li>
              <li>当用户需要精确排序或差值比较时，优先使用 BarChart；当需要趋势时使用 LineChart / AreaChart。</li>
              <li>Treemap 只把面积作为第一信号，关键结论仍应写入 summary。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="treemap-demos" aria-labelledby="treemap-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="treemap-demos-title">代码演示</h3>
              <p>覆盖扁平数据、层级 children、标签截断、颜色覆盖、移动端密度和大量节点聚合。</p>
            </div>
            <div className="charts-doc-demo-grid treemap-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="treemap-api" aria-labelledby="treemap-api-title">
            <h3 id="treemap-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="treemap-algorithm" aria-labelledby="treemap-algorithm-title">
            <h3 id="treemap-algorithm-title">算法限制</h3>
            <DataTable rows={algorithmRows} />
          </section>

          <section className="button-doc-section" id="treemap-states" aria-labelledby="treemap-states-title">
            <h3 id="treemap-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <Treemap data={[]} emptyText="No hierarchy data" title="Empty treemap" />
              <Treemap data={flatData} loading title="Loading treemap" />
              <Treemap data={flatData} error="Unable to load hierarchy." title="Error treemap" />
            </div>
          </section>

          <section className="button-doc-section" id="treemap-a11y" aria-labelledby="treemap-a11y-title">
            <h3 id="treemap-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="treemap-mobile" aria-labelledby="treemap-mobile-title">
            <h3 id="treemap-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>SVG 使用稳定 viewBox，容器继承 ChartFrame 的横向滚动能力，避免窄屏文字互相挤压。</li>
              <li>小矩形自动隐藏内部文字，但保留可聚焦 aria-label 和 SVG title。</li>
              <li>移动端建议降低 height、关闭 showValues，并用 summary 写明最大项和业务结论。</li>
              <li>高密度数据建议设置 maxNodes；组件会把超出节点聚合为 Other，避免移动端渲染过量 SVG 元素。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="treemap-security" aria-labelledby="treemap-security-title">
            <h3 id="treemap-security-title">安全</h3>
            <ul className="button-doc-list">
              <li>label、title、summary 和 formatter 输出都作为 React 文本渲染，不使用 innerHTML。</li>
              <li>仅有限正数参与布局；NaN、Infinity、0 和负数不会进入 SVG 坐标计算。</li>
              <li>自定义颜色只接受 #RGB、#RRGGBB 或 #RRGGBBAA，其他输入回退内置色板。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="treemap-review" aria-labelledby="treemap-review-title">
            <h3 id="treemap-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
