import type { ReactNode } from "react";
import { ScatterChart } from "../components/charts";
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

export type ScatterChartDocProps = {
  showAnchors?: boolean;
};

export const scatterChartDocMeta = {
  title: "ScatterChart 散点图",
  category: "可视化组件",
  anchors: [
    { id: "scatter-when", label: "何时使用" },
    { id: "scatter-demos", label: "代码演示" },
    { id: "scatter-api", label: "API" },
    { id: "scatter-states", label: "状态" },
    { id: "scatter-semantic", label: "Semantic DOM" },
    { id: "scatter-mobile", label: "移动端" },
    { id: "scatter-security", label: "安全" },
    { id: "scatter-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const performanceData = [
  { label: "Docs", x: 18, y: 72, radius: 12, group: "Platform", color: "#6f6a5f" },
  { label: "Search", x: 34, y: 86, radius: 20, group: "Product", color: "#6b7d5f" },
  { label: "Review", x: 46, y: 64, radius: 9, group: "Workflow", color: "#9a6a55" },
  { label: "Release", x: 63, y: 78, radius: 16, group: "Platform", color: "#8b6f9e" },
  { label: "Insights", x: 74, y: 92, radius: 24, group: "Product", color: "#b58b3b" },
  { label: "Audit", x: 88, y: 58, radius: 7, group: "Risk", color: "#7a7468" },
];

const compactData = [
  { label: "A", x: 12, y: 22 },
  { label: "B", x: 20, y: 28 },
  { label: "C", x: 28, y: 39 },
  { label: "D", x: 42, y: 43 },
  { label: "E", x: 55, y: 54 },
  { label: "F", x: 64, y: 62 },
];

const denseData = Array.from({ length: 360 }, (_, index) => {
  const x = index % 60;
  const y = 48 + Math.sin(index / 9) * 20 + (index % 11);

  return {
    label: `Sample ${index + 1}`,
    x,
    y,
    radius: 3 + (index % 5),
  };
});

const defensiveData = [
  { label: "Valid low", x: -8, y: 22, radius: 3, color: "#6b7d5f" },
  { label: "Invalid x", x: Number.NaN, y: 40, radius: 8, color: "#ff00ff" },
  { label: "Unsafe color", x: 12, y: 35, radius: 10, color: "url(javascript:alert(1))" },
  { label: "Infinite y", x: 28, y: Number.POSITIVE_INFINITY, radius: 12 },
  { label: "Duplicate", x: 38, y: 44, radius: 7, group: "Kept" },
  { label: "Duplicate", x: 44, y: 32, radius: Number.NaN, group: "Kept" },
];

const oneLineExample = `<ScatterChart data={data} title="Adoption vs quality" xLabel="Adoption" yLabel="Quality" />`;
const dataSample = `const data = [{ label: "Docs", x: 18, y: 72, radius: 12, group: "Platform" }];`;

const demos: Demo[] = [
  {
    title: "Correlation and bubble radius",
    description: "用 x/y 表达相关分布，用 radius 表达第三个量，颜色仅作为分组辅助。",
    preview: (
      <ScatterChart
        data={performanceData}
        radiusFormatter={(value) => `${value} teams`}
        scale={{ xDomain: [0, 100], yDomain: [40, 100], tickCount: 5 }}
        summary="Insights sits in the high adoption and high quality area; Audit is an outlier with high adoption and lower quality."
        title="Adoption vs quality"
        xLabel="Adoption"
        yLabel="Quality"
      />
    ),
    code: `<ScatterChart data={data} title="Adoption vs quality" xLabel="Adoption" yLabel="Quality" scale={{ xDomain: [0, 100], yDomain: [40, 100], tickCount: 5 }} />`,
  },
  {
    title: "Compact scatter",
    description: "关闭 fallback table 可嵌入窄面板，仍保留 SVG title / desc 和点位 title。",
    preview: (
      <ScatterChart
        data={compactData}
        height={220}
        showTable={false}
        summary="Compact points trend upward from A to F."
        title="Compact distribution"
        xLabel="Cycle"
        yLabel="Score"
      />
    ),
    code: `<ScatterChart data={compactData} title="Compact distribution" height={220} showTable={false} />`,
  },
  {
    title: "Dense sampled data",
    description: "超过性能预算时采样渲染点位，并用 notice 告知可见点数，table 继续限制行数。",
    preview: (
      <ScatterChart
        data={denseData}
        height={240}
        scale={{ xDomain: [0, 60], yDomain: [20, 84], tickCount: 4 }}
        showTable={false}
        summary="Dense synthetic points are sampled to keep SVG rendering responsive."
        title="Dense scatter budget"
        xLabel="Sequence"
        yLabel="Signal"
      />
    ),
    code: `<ScatterChart data={denseData} title="Dense scatter budget" showTable={false} />`,
  },
  {
    title: "Defensive data",
    description: "过滤 NaN / Infinity，非法颜色回退到 tone，重复 label 按索引保留。",
    preview: (
      <ScatterChart
        data={defensiveData}
        scale={{ includeZero: true, tickCount: 4 }}
        summary="Only finite x and y points render; unsafe colors are ignored."
        title="Defensive scatter"
        xLabel="Delta"
        yLabel="Confidence"
      />
    ),
    code: `<ScatterChart data={defensiveData} title="Defensive scatter" scale={{ includeZero: true }} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label; x; y; radius?; color?; group? }>",
    description: "x/y 必须是有限数；radius 可映射点大小；color 仅接受安全十六进制颜色，group 进入 fallback table。",
  },
  {
    name: "scale",
    value: "{ xDomain?; yDomain?; includeZero?; clamp?; tickCount? }",
    description: "控制双轴 domain、越界裁切和 2-8 个线性刻度。未传 domain 时按有效点生成 padded domain。",
  },
  {
    name: "xFormatter / yFormatter / radiusFormatter",
    value: "(value, datum) => string",
    description: "格式化坐标刻度、SVG title 和 fallback table；异常会回退默认数字格式并截断过长字符串。",
  },
  {
    name: "showGrid / showTooltip / showTable",
    value: "boolean",
    description: "控制网格线、点位原生 SVG title 和可访问数据表。默认展示 table 作为辅助技术与移动端 fallback。",
  },
  {
    name: "showLegend / legendMaxItems",
    value: "boolean / number",
    description: "按 group 优先生成颜色图例，无 group 时回退 label；默认最多 6 项，超出显示 +N more，避免密集数据挤压图形。",
  },
  {
    name: "minRadius / maxRadius",
    value: "number",
    description: "控制气泡半径映射范围，内部收敛到 1-32，防止异常半径撑破绘图区。",
  },
  {
    name: "xLabel / yLabel / labelMaxLength",
    value: "string / number",
    description: "坐标轴标题和标题截断长度。关键业务含义仍应写入 summary，避免只靠轴名表达结论。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "sanitized data is empty",
    description: "空数组、全 NaN 或全 Infinity 会显示空状态；底层 SVG 和 table 不进入辅助阅读流。",
  },
  {
    name: "loading",
    value: "loading",
    description: "外层 figure 设置 aria-busy，状态层使用 status，并保留图表尺寸占位。",
  },
  {
    name: "error",
    value: "error",
    description: "错误态使用 alert，业务可传入错误码或重试文案；图形层降低透明度并从辅助技术隐藏。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "沿用 ChartFrame，title / summary 连接到 figure 的 aria-labelledby / aria-describedby。",
  },
  {
    name: "svg",
    value: "svg[role=img]",
    description: "SVG 内含 title / desc；有 table 时通过 aria-describedby 关联 table 区域。",
  },
  {
    name: "point",
    value: "circle + title",
    description: "每个点输出 label、x、y 和可选 radius；颜色不作为唯一信息来源。",
  },
  {
    name: "legend",
    value: "div[aria-label]",
    description: "图例由安全文本和 CSS 色块组成，按 group 聚合，长列表受 legendMaxItems 限制。",
  },
  {
    name: "fallback",
    value: "table",
    description: "默认输出数据表，覆盖触屏无法 hover、读屏需要结构化数值和 SVG title 支持不一致的场景。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stable viewBox + horizontal pan",
    description: "SVG 保持稳定 viewBox，容器允许横向滚动；legend 自动换行，fallback table 同样可横向滚动。",
  },
  {
    name: "touch",
    value: "title + table",
    description: "移动端不依赖 hover tooltip；关键点解释写在 summary，明细通过 table 查看。",
  },
  {
    name: "density",
    value: "sampled SVG budget",
    description: "有效点超过 240 时等距采样并展示 notice；table 最多展示 120 行。密度聚合、框选和缩放仍作为后续增强。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "labels",
    value: "React text nodes",
    description: "label、group、legend、summary、axis label 和 error 均通过 React 文本节点输出，不使用 HTML 注入。",
  },
  {
    name: "numbers",
    value: "finite-only x/y",
    description: "x/y 非有限值会被过滤；domain、height、margin、radius 都有收敛逻辑。",
  },
  {
    name: "colors",
    value: "hex-only",
    description: "点颜色只接受 #RGB / #RRGGBB，其他输入回退到 tone，避免 url() 或脚本式 SVG paint server。",
  },
  {
    name: "dependencies",
    value: "no chart libraries",
    description: "实现只使用 React 与自有 SVG / utils，不引入 antd、@ant-design/charts 或 antd 系依赖。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "通过",
    description: "ScatterChart 覆盖双变量分布、相关性和离群点场景；业务结论要求写入 summary，避免误读散点关系。",
  },
  {
    name: "UI",
    value: "通过",
    description: "坐标轴、网格、点半径、legend 和颜色层级清楚；移动端使用滚动与表格 fallback，避免标签挤压。",
  },
  {
    name: "研发",
    value: "通过",
    description: "复用 ChartFrame、scale、tick 和格式化工具；x/y 过滤、radius 收敛、颜色白名单均在组件内完成。",
  },
  {
    name: "测试",
    value: "通过",
    description: "覆盖正常、紧凑、非法数据、空态、加载态、错误态、表格 fallback 和响应式滚动。",
  },
  {
    name: "白帽",
    value: "通过",
    description: "无 dangerouslySetInnerHTML；formatter try/catch；颜色拒绝 url()；不引入外部图表或 antd 系依赖。",
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

export function ScatterChartDoc({ showAnchors = false }: ScatterChartDocProps) {
  return (
    <TutorialScaffold component="ScatterChart" kind="display" oneLineExample={oneLineExample}>
      <section className="scatter-chart-doc" aria-labelledby="scatter-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="ScatterChart 文档目录">
            {scatterChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="scatter-chart-doc-title">{scatterChartDocMeta.title}</h2>
            <p>
              自有 SVG 散点图组件，支持 x/y 数据、可选 radius 与 color、双轴网格、点位提示、空态和可访问 table fallback。
            </p>
          </header>

          <section className="button-doc-section" id="scatter-when" aria-labelledby="scatter-when-title">
            <h3 id="scatter-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于观察两个变量的分布、相关性、聚类和离群点。</li>
              <li>需要用第三个变量表达影响范围时传入 radius；颜色仅用于辅助分组，不承担唯一语义。</li>
              <li>超过数百点、需要刷选、缩放或密度聚合时，应先扩展交互和渲染策略。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="scatter-demos" aria-labelledby="scatter-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="scatter-demos-title">代码演示</h3>
              <p>示例覆盖半径、颜色、双轴 domain、tooltip、table fallback、非法数据过滤和紧凑布局。</p>
            </div>
            <ul className="button-doc-list">
              <li>一行使用样例：<code>{oneLineExample}</code></li>
              <li>数据样例：<code>{dataSample}</code></li>
            </ul>
            <div className="charts-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="scatter-api" aria-labelledby="scatter-api-title">
            <h3 id="scatter-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="scatter-states" aria-labelledby="scatter-states-title">
            <h3 id="scatter-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <ScatterChart data={[]} emptyText="No distribution yet" title="Empty scatter" />
              <ScatterChart data={compactData} loading loadingText="Loading distribution" title="Loading scatter" />
              <ScatterChart data={compactData} error="Unable to read distribution data." title="Error scatter" />
            </div>
          </section>

          <section className="button-doc-section" id="scatter-semantic" aria-labelledby="scatter-semantic-title">
            <h3 id="scatter-semantic-title">语义 DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="scatter-mobile" aria-labelledby="scatter-mobile-title">
            <h3 id="scatter-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="scatter-security" aria-labelledby="scatter-security-title">
            <h3 id="scatter-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="scatter-review" aria-labelledby="scatter-review-title">
            <h3 id="scatter-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
