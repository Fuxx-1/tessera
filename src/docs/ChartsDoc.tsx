import type { ReactNode } from "react";
import { AreaChart, BarChart, FunnelChart, LineChart, PieChart, SankeyChart, Sparkline, WordCloud } from "../components/charts";
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

export type ChartsDocProps = {
  showAnchors?: boolean;
};

export const chartsDocMeta = {
  title: "Charts 图表",
  category: "可视化组件",
  anchors: [
    { id: "charts-when", label: "何时使用" },
    { id: "charts-demos", label: "代码演示" },
    { id: "charts-sparkline", label: "SparklineDoc" },
    { id: "charts-api", label: "API" },
    { id: "charts-line-area-api", label: "Line/Area API" },
    { id: "charts-bar-api", label: "BarChart API" },
    { id: "charts-pie-api", label: "PieChart API" },
    { id: "charts-funnel", label: "FunnelChart" },
    { id: "charts-sankey", label: "SankeyChart" },
    { id: "charts-word-cloud-api", label: "WordCloud API" },
    { id: "charts-states", label: "状态" },
    { id: "charts-semantic", label: "Semantic DOM" },
    { id: "charts-mobile", label: "移动端" },
    { id: "charts-performance", label: "性能边界" },
    { id: "charts-security", label: "安全" },
    { id: "charts-token", label: "Design Token" },
    { id: "charts-a11y", label: "可访问性" },
    { id: "charts-gaps", label: "缺口" },
    { id: "charts-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const trendData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 76 },
  { label: "Fri", value: 68 },
  { label: "Sat", value: 92 },
  { label: "Sun", value: 84 },
];

const barData = [
  { label: "Docs", value: 38 },
  { label: "Tests", value: 56 },
  { label: "Design", value: 28 },
  { label: "Build", value: 71 },
  { label: "Review", value: 46 },
];

const signedBarData = [
  { label: "North America", value: 32 },
  { label: "Europe", value: -12 },
  { label: "Asia Pacific", value: 46 },
  { label: "Latin America", value: 18 },
  { label: "Middle East", value: -7 },
  { label: "Africa", value: 14 },
];

const pieData = [
  { label: "Base", value: 42 },
  { label: "Business", value: 26 },
  { label: "Docs", value: 22 },
  { label: "Research", value: 10 },
];

const pieDataWithIgnoredValues = [
  { label: "Base", value: 42 },
  { label: "Business", value: 26 },
  { label: "Deprecated", value: 0 },
  { label: "Blocked", value: -4 },
  { label: "Docs", value: 22 },
  { label: "Invalid sample", value: Number.NaN },
];

const funnelData = [
  { stage: "Visitors", value: 12800 },
  { stage: "Signup started", value: 6400 },
  { stage: "Account verified", value: 4200 },
  { stage: "Workspace created", value: 2680 },
  { stage: "Paid plan", value: 940 },
];

const wordCloudData = [
  { label: "Accessibility", value: 96 },
  { label: "Responsive", value: 84 },
  { label: "SVG", value: 78 },
  { label: "Deterministic", value: 72 },
  { label: "Fallback", value: 64 },
  { label: "Mobile", value: 58 },
  { label: "Tokens", value: 52 },
  { label: "No overlap", value: 48 },
  { label: "Charts", value: 44 },
  { label: "React", value: 40 },
  { label: "Docs", value: 32 },
  { label: "Security", value: 28 },
];

const sankeyNodes = [
  { id: "source", label: "Traffic source", layer: 0 },
  { id: "organic", label: "Organic", layer: 1, order: 0 },
  { id: "campaign", label: "Campaign", layer: 1, order: 1 },
  { id: "signup", label: "Signup", layer: 2 },
  { id: "trial", label: "Trial", layer: 3 },
  { id: "paid", label: "Paid", layer: 4, order: 0 },
  { id: "lost", label: "Lost", layer: 4, order: 1 },
];

const sankeyLinks = [
  { source: "source", target: "organic", value: 6200 },
  { source: "source", target: "campaign", value: 3800 },
  { source: "organic", target: "signup", value: 2600 },
  { source: "campaign", target: "signup", value: 1900 },
  { source: "signup", target: "trial", value: 2700 },
  { source: "signup", target: "lost", value: 1800 },
  { source: "trial", target: "paid", value: 940 },
  { source: "trial", target: "lost", value: 1760 },
];

const defensiveData = [
  { label: "Very long discovery and validation label", value: 34 },
  { label: "Invalid NaN", value: Number.NaN },
  { label: "Duplicate", value: -18 },
  { label: "Duplicate", value: 48 },
  { label: "Infinite sample", value: Number.POSITIVE_INFINITY },
  { label: "Mobile acceptance", value: 63 },
];

const demos: Demo[] = [
  {
    title: "LineChart",
    description: "用于趋势变化和连续阶段对比，点位自带 SVG title 提示。",
    preview: (
      <LineChart
        data={trendData}
        scale={{ tickCount: 4, yDomain: [0, 100] }}
        summary="Weekly usage rises from Monday to Saturday, then eases on Sunday."
        title="Weekly usage"
        xLabelMaxLength={8}
      />
    ),
    code: `<LineChart data={trendData} title="Weekly usage" scale={{ yDomain: [0, 100], tickCount: 4 }} xLabelMaxLength={8} />`,
  },
  {
    title: "AreaChart",
    description: "用于表达累计量、覆盖范围或趋势强度。",
    preview: (
      <AreaChart
        data={trendData}
        fillOpacity={0.24}
        scale={{ includeZero: true, tickCount: 4 }}
        summary="The filled area highlights the strength of the trend."
        title="Coverage trend"
      />
    ),
    code: `<AreaChart data={trendData} title="Coverage trend" fillOpacity={0.24} scale={{ includeZero: true, tickCount: 4 }} />`,
  },
  {
    title: "BarChart",
    description: "用于少量分类对比，默认包含零基线和网格辅助阅读。",
    preview: <BarChart data={barData} summary="Build has the largest count, followed by Tests and Review." title="Workload by area" />,
    code: `<BarChart data={barData} title="Workload by area" summary="Build has the largest count." />`,
  },
  {
    title: "BarChart signed values",
    description: "支持正负值、固定 yDomain、自定义刻度密度和数值标签。",
    preview: (
      <BarChart
        data={signedBarData}
        labelFormatter={(label) => label.split(" ")[0]}
        showValues
        summary="Asia Pacific leads at 46, while Europe and Middle East are below zero."
        tickCount={5}
        title="Regional delta"
        valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}%`}
        yDomain={[-20, 60]}
      />
    ),
    code: `<BarChart data={signedBarData} showValues tickCount={5} yDomain={[-20, 60]} valueFormatter={(value) => (value > 0 ? "+" : "") + value + "%"} />`,
  },
  {
    title: "PieChart",
    description: "用于小数量占比展示，自动过滤非正数切片并生成 legend。",
    preview: <PieChart data={pieDataWithIgnoredValues} summary="Only positive component counts are included in the share." title="Component mix" />,
    code: `<PieChart data={pieData} title="Component mix" summary="Only positive component counts are included." />`,
  },
  {
    title: "FunnelChart",
    description: "用于阶段转化和流失阅读，percent 相对首阶段，dropoff 相对上一阶段。",
    preview: (
      <FunnelChart
        data={funnelData}
        summary="Paid plan conversion is 7.3% from visitors."
        title="Signup funnel"
        valueFormatter={(value) => `${Math.round(value).toLocaleString("en-US")}`}
      />
    ),
    code: `<FunnelChart data={funnelData} title="Signup funnel" summary="Paid plan conversion is 7.3% from visitors." />`,
  },
  {
    title: "Sparkline",
    description: "用于卡片和表格中的轻量趋势，支持紧凑语义、端点标记和状态层。",
    preview: <Sparkline data={trendData} summary="Compact weekly trend sparkline." title="Usage sparkline" trendLabel="+18%" />,
    code: `<Sparkline data={trendData} title="Usage sparkline" summary="Compact weekly trend sparkline." trendLabel="+18%" />`,
  },
  {
    title: "WordCloud",
    description: "用于关键词权重探索，字号线性映射，确定性放置并提供列表兜底。",
    preview: <WordCloud data={wordCloudData} summary="Accessibility and Responsive are the strongest terms." title="Component keywords" />,
    code: `<WordCloud data={wordCloudData} title="Component keywords" summary="Accessibility and Responsive lead." />`,
  },
  {
    title: "SankeyChart",
    description: "用于小中型分层流向，支持 nodes/links/value、link 宽度和移动端横向滚动。",
    preview: (
      <SankeyChart
        height={300}
        links={sankeyLinks}
        nodes={sankeyNodes}
        summary="Traffic splits by source, flows through signup and trial, then reaches paid or lost outcomes."
        title="Acquisition flow"
        valueFormatter={(value) => value.toLocaleString("en-US")}
      />
    ),
    code: `<SankeyChart nodes={nodes} links={links} title="Acquisition flow" />`,
  },
  {
    title: "Defensive data",
    description: "过滤 NaN / Infinity，保留负数和重复标签，并截断长标签。",
    preview: <BarChart data={defensiveData} summary="Invalid numeric values are ignored while duplicate labels remain positioned by index." title="Defensive bar chart" />,
    code: `<BarChart data={dataWithInvalidValues} title="Defensive bar chart" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "所有图表共享的小中型数据结构。label 用于分类或顺序点位，value 用于数值映射。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "图表可访问名称和摘要，同时输出到 figure 与 SVG title / desc。",
  },
  {
    name: "loading / error / emptyText",
    value: "boolean / ReactNode / string",
    description: "覆盖加载、错误和空数据状态。状态层保持容器尺寸稳定。",
  },
  {
    name: "valueFormatter",
    value: "(value, datum) => string",
    description: "用于坐标刻度、点位 title、柱图 title 和占比说明中的数值格式化。",
  },
  {
    name: "height / margin",
    value: "number / Partial<ChartMargin>",
    description: "Cartesian 图表可调整高度和绘图区边距；非法高度和过大边距会被收敛，保证绘图区不空白。",
  },
  {
    name: "maxDataPoints",
    value: "number",
    description: "LineChart、AreaChart、BarChart 和 Sparkline 的 SVG 点/柱预算。默认 160，超出后按顺序抽样并显示性能提示。",
  },
  {
    name: "tone",
    value: "neutral / sage / clay / plum / amber",
    description: "LineChart、AreaChart、BarChart、Sparkline 支持中性色板 tone，避免只依赖一种蓝色主色。",
  },
  {
    name: "showGrid / showPoints / showArea",
    value: "boolean",
    description: "控制网格、折线点位和 Sparkline 面积填充。关闭装饰元素后仍保留 SVG title / desc。",
  },
  {
    name: "Sparkline: size",
    value: '"xs" | "sm" | "md"',
    description: "Sparkline 专属紧凑尺寸。默认 sm；xs 用于表格和移动列表，md 用于指标卡片。",
  },
  {
    name: "Sparkline: ariaLabel / trendLabel",
    value: "string",
    description: "ariaLabel 为无可见标题的紧凑实例提供名称；trendLabel 展示紧凑趋势文字。",
  },
  {
    name: "Sparkline: showEndpoint / showBaseline",
    value: "boolean",
    description: "控制最后一个点标记和基线。基线数值由 baselineValue 提供。",
  },
  {
    name: "colors / showLegend",
    value: "string[] / boolean",
    description: "PieChart / FunnelChart / SankeyChart 支持自定义十六进制色板；空色板或非法颜色会回退到内置色板。",
  },
];

const pieApiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "仅有限正数会进入扇区计算；value <= 0、NaN 和 Infinity 会被过滤，不参与百分比。",
  },
  {
    name: "colors",
    value: "string[]",
    description: "切片色板按顺序循环使用。传入空数组时回退到内置 chartSeriesColors，避免出现无填充切片。",
  },
  {
    name: "showLegend",
    value: "boolean",
    description: "控制 legend 显隐。关闭后饼图自动居中，SVG title / desc 和切片 title 仍可用。",
  },
  {
    name: "legendMaxItems",
    value: "number",
    description: "默认 8，限制 legend 可见项数。超出时显示 +N more，避免窄屏或长数据下文字堆叠。",
  },
  {
    name: "maxSlices",
    value: "number",
    description: "默认 40。正值切片超出预算时会聚合为 Other，避免一次性绘制大量 path 和 legend。",
  },
  {
    name: "height",
    value: "number",
    description: "控制 SVG viewBox 高度，内部最小高度为 180，保证移动端和状态层有稳定空间。",
  },
];

const lineAreaApiRows: DocRow[] = [
  {
    name: "scale.yDomain",
    value: "[number, number]",
    description: "LineChart / AreaChart 可显式锁定 Y 轴范围；非法、相等或倒序 domain 会被规范化或回退到数据域。",
  },
  {
    name: "scale.includeZero",
    value: "boolean",
    description: "默认纳入 0，适合运营趋势和面积图 baseline；纯变化率图可关闭后让数据域更贴近实际波动。",
  },
  {
    name: "scale.clamp",
    value: "boolean",
    description: "默认裁切越界值，避免自定义 domain 时点线或面积路径跑出绘图区。",
  },
  {
    name: "scale.tickCount",
    value: "number",
    description: "生成 2-8 个线性网格刻度。移动端建议 3-4，减少标签拥挤。",
  },
  {
    name: "xLabelMaxLength",
    value: "number",
    description: "控制 X 轴标签显示长度；完整 label 仍在 SVG title 中保留。",
  },
  {
    name: "showPoints / fillOpacity",
    value: "boolean / number",
    description: "showPoints 为 LineChart 专属，fillOpacity 为 AreaChart 专属；两者都不改变可访问 title / desc 链路。",
  },
  {
    name: "series / colors / showLegend",
    value: "AreaChart only",
    description: "AreaChart 支持多序列叠加、hex 色板和图例开关；空序列会忽略，非法颜色回退到安全色板。",
  },
];

const barApiRows: DocRow[] = [
  {
    name: "barPadding / minBarWidth",
    value: "number",
    description: "控制柱间距和移动端最小柱宽。数据较多时 SVG 自动扩展最小宽度，容器横向滚动。",
  },
  {
    name: "yDomain / tickCount",
    value: "[number, number] / number",
    description: "手动锁定数值域或调整 2-8 个网格刻度。未传 yDomain 时会按数据生成含 0 的 padded domain。",
  },
  {
    name: "labelFormatter / maxLabelLength",
    value: "(label, datum, index) => string / number",
    description: "格式化 x 轴分类标签，并按最大长度截断；完整标签仍保留在 SVG title 中。",
  },
  {
    name: "showValues / valueFormatter",
    value: "boolean / (value, datum) => string",
    description: "展示柱顶数值标签，并复用 valueFormatter 生成刻度、title 和 a11y 描述。",
  },
  {
    name: "barRadius / tone",
    value: "number / ChartTone",
    description: "调整柱圆角和色板。颜色只做辅助区分，结论应写入 summary。",
  },
];

const wordCloudApiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "仅有限正数会参与词云布局；label 规范空白并限制长度，value 线性映射字号。",
  },
  {
    name: "minFontSize / maxFontSize",
    value: "number",
    description: "控制字号范围。非法值会被收敛，默认 14 到 48。",
  },
  {
    name: "maxWords",
    value: "number",
    description: "控制参与布局的词数，默认 36，上限 80；超出后保留权重最高词并显示性能提示，业务侧仍应预聚合长文档词频。",
  },
  {
    name: "padding / height",
    value: "number",
    description: "控制词间留白和 SVG 高度；移动端仍使用稳定 viewBox 与横向安全滚动。",
  },
  {
    name: "colors / showFallbackList",
    value: "string[] / boolean",
    description: "颜色只接受安全十六进制；fallback list 默认开启，保证布局失败词和辅助技术仍可读取完整数据。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "sanitized data is empty",
    description: "空数组、全 NaN、全 Infinity 会触发空状态。状态出现时 LineChart / AreaChart 的 SVG 从辅助技术中隐藏。",
  },
  {
    name: "non-positive values",
    value: "PieChart / FunnelChart / SankeyChart / WordCloud",
    description: "PieChart、FunnelChart 和 SankeyChart 会过滤 value <= 0 的项；WordCloud 仅布局有限正数，并通过列表保留可读权重。",
  },
  {
    name: "loading",
    value: "loading",
    description: "根节点设置 aria-busy，并显示 status 状态层；图层保留尺寸占位，不抢读屏焦点。",
  },
  {
    name: "error",
    value: "error",
    description: "状态层使用 alert 语义展示错误内容；业务可传入 ReactNode 保留错误码、重试说明或工单链接。",
  },
  {
    name: "sparkline compact",
    value: "ariaLabel + summary",
    description: "无可见 title 时必须提供 ariaLabel 或 summary，让紧凑图仍有可读名称和趋势描述。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "外层容器通过 title / summary 连接 aria-labelledby 和 aria-describedby，并在 loading 时设置 aria-busy。",
  },
  {
    name: "svg",
    value: "svg[role=img]",
    description: "每个 SVG 都有内部 title / desc，且通过 aria-labelledby 指向稳定 id。无 title 时使用组件类型作为兜底名称。",
  },
  {
    name: "marks",
    value: "path / rect / circle / text",
    description: "点、柱、扇区、漏斗阶段和词云文本提供原生 SVG title；长轴标签和 legend 标签用短文本显示，并保留完整 title。",
  },
  {
    name: "state",
    value: "status / alert",
    description: "加载和空态使用 status，错误态使用 alert；LineChart / AreaChart 在状态下将 SVG 标记为 aria-hidden。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stable viewBox + safe scroll",
    description: "图表 SVG 使用稳定 viewBox 和最小宽度；窄屏容器允许横向轻量滚动，避免坐标、legend 和状态层互相挤压。",
  },
  {
    name: "touch",
    value: "native SVG title + pan",
    description: "当前不依赖 hover tooltip；移动端可平移滚动查看长图，业务摘要负责表达关键结论。",
  },
  {
    name: "labels",
    value: "truncate + full title",
    description: "轴标签和 legend 标签默认截断显示；WordCloud 通过 fallback list 保留完整排名和数值。",
  },
];

const performanceRows: DocRow[] = [
  {
    name: "Line / Area / Bar / Sparkline",
    value: "160 render marks",
    description: "默认仅渲染 160 个点或柱，并对坐标标签做首尾保留的均匀抽样；超长时间序列应在业务层按时间窗口聚合。",
  },
  {
    name: "Pie / Funnel / Radar",
    value: "40 slices or stages / 12 series",
    description: "占比、漏斗和雷达适合小集合阅读；超出预算会聚合或截断，详细排名应切换 Table 或 BarChart。",
  },
  {
    name: "Heatmap",
    value: "30 x-axis + 30 y-axis, 900 cells",
    description: "热图限制轴类目和数据表行数，避免 X×Y 矩阵在移动端生成成千上万个 rect / td。",
  },
  {
    name: "Treemap / Sankey / Organization / MindMap",
    value: "120 nodes / 180 links",
    description: "关系和层级图只承担摘要浏览；连接线使用 SVG path / Bezier，超大图应分页、搜索、折叠或服务端布局后再传入组件。",
  },
  {
    name: "WordCloud",
    value: "36 default, 80 hard cap",
    description: "词云是 best-effort SVG 文本布局；数万词长文档必须先分词、去停用词、聚合，再传入权重最高词。",
  },
  {
    name: "Gauge",
    value: "single value",
    description: "Gauge 固定为单值、少量 segment 和 threshold；批量状态应使用列表、表格或小倍图，不循环渲染大量 Gauge。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "labels",
    value: "React text nodes",
    description: "label、title、summary 和 error 不通过 dangerouslySetInnerHTML 注入，React 会按文本转义。",
  },
  {
    name: "numbers",
    value: "finite-only rendering",
    description: "Cartesian 图过滤 NaN / Infinity，scale、path、baseline、height 和 margin 都有有限值兜底，避免非法 SVG 坐标或空白绘图区。",
  },
  {
    name: "formatters",
    value: "try/catch + string limit",
    description: "valueFormatter 抛错时回退默认格式化，返回值会转成字符串并截断，降低异常内容污染 UI 的风险。",
  },
  {
    name: "dependencies",
    value: "no external chart library",
    description: "当前图表仅使用 React + 自有 SVG / HTML / utils，不依赖 antd、antd-mobile、@ant-design/charts、d3-sankey 或重型布局库。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "series",
    value: "neutral / sage / clay / plum / amber",
    description: "中性、鼠尾草、陶土、梅紫、琥珀色板；自定义 Pie 色板只接受安全十六进制颜色。",
  },
  {
    name: "surface / grid",
    value: "#fbfbfa / text 10%",
    description: "图表容器主背景、网格线和辅助基线；暗色模式提升文字对比，但仍保持低透明辅助线。",
  },
  {
    name: "textMuted",
    value: "#696967 / #8a8a86",
    description: "坐标标签、legend 次级数值和摘要文字。",
  },
  {
    name: "frame",
    value: "1px border + weak shadow",
    description: "ChartFrame 与 Mermaid viewer 共用中性 surface、细边框和弱阴影，避免图表在文档页里显得像营销卡片。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "LineChart",
    value: "产品: 趋势; UI: 点线清晰; 研发: 有限值过滤; 测试: 空/异常/窄屏; 白帽: 文本转义",
    description: "适合单序列趋势阅读；保留点位 title，过滤非法数值，height/margin 收敛后仍保持稳定 viewBox。",
  },
  {
    name: "AreaChart",
    value: "产品: 趋势强度; UI: 填充低干扰; 研发: baseline 防御; 测试: 负数/空态; 白帽: 无 HTML 注入",
    description: "适合强调趋势下的体量；面积路径只基于可渲染点位和安全 baseline 生成，避免异常值导致路径不可用。",
  },
  {
    name: "BarChart",
    value: "产品: 分类对比; UI: 零基线; 研发: 重名按索引; 测试: 长标签/负数; 白帽: formatter 兜底",
    description: "适合少量分类比较；重复标签不再叠位，负数围绕零基线绘制，非法值进入空态或被忽略。",
  },
  {
    name: "PieChart",
    value: "产品: 少量占比; UI: legend 对齐; 研发: 单切片闭合; 测试: 非正过滤; 白帽: 空色板回退",
    description: "适合 2-6 个正数分类；单个 100% 切片可正确绘制，非正、非法值和非法颜色不会进入扇区计算。",
  },
  {
    name: "FunnelChart",
    value: "产品: 阶段转化; UI: 标签分区; 研发: 自有 SVG; 测试: 流失/空态/窄屏; 白帽: 颜色白名单",
    description: "适合有序转化链路；percent 相对首阶段，dropoff 相对上一阶段，非法值与非法颜色不会进入绘制。",
  },
  {
    name: "Sparkline",
    value: "产品: 指标趋势; UI: 紧凑; 研发: 无坐标依赖; 测试: 小高度; 白帽: summary 兜底",
    description: "适合 MetricCard / 表格内嵌；不承担完整坐标解释，必须由 title 或 summary 给出业务含义。",
  },
  {
    name: "WordCloud",
    value: "产品: 关键词权重; UI: 字号层级; 研发: 确定性放置; 测试: 密集/移动/状态; 白帽: 文本转义",
    description: "适合几十个关键词的探索性阅读；采用 best effort 矩形碰撞避让，失败词通过 fallback list 保留。",
  },
  {
    name: "SankeyChart",
    value: "产品: 分层流向; UI: 节点链路清晰; 研发: 自有 SVG; 测试: layer/非法边/窄屏; 白帽: 颜色白名单",
    description: "适合小中型流量路径；支持显式 layer 和简单推断，明确不是复杂自动布局全覆盖。",
  },
  {
    name: "Codex.app visual pass",
    value: "产品: 摘要清晰; UI: 克制中性; 研发: 轻量 SVG; 测试: 360/390/430; 白帽: 无危险 HTML",
    description: "所有图表 owner 以低干扰网格、有限色板、暗色可读、标签避让、Bezier 连接线和渲染预算作为统一验收口径。",
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

const oneLineExample = "<LineChart data={trendData} title=\"Weekly usage\" summary=\"Usage rises through Saturday.\" />";

export function ChartsDoc({ showAnchors = false }: ChartsDocProps) {
  return (
    <TutorialScaffold component="Charts" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc" aria-labelledby="charts-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Charts 文档目录">
            {chartsDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="charts-doc-title">{chartsDocMeta.title}</h2>
            <p>
              自有 SVG / HTML 图表组件，用于小中型数据展示。当前覆盖 LineChart、AreaChart、BarChart、PieChart、
              FunnelChart、SankeyChart、Sparkline 和 WordCloud，不依赖外部 UI 或图表库；统一采用 Codex.app 克制风格：
              中性底、低透明网格线、有限调色、暗色可读和移动端安全滚动。
            </p>
          </header>

          <section className="button-doc-section" id="charts-when" aria-labelledby="charts-when-title">
            <h3 id="charts-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当数据规模较小，需要在文档、卡片、设置页或内部工具中快速表达趋势和对比时使用。</li>
              <li>需要复杂交互、上万点渲染、图布局或高级统计图时，应先扩展底层计算能力再进入生产使用。</li>
              <li>MetricCard 等业务组件应消费这些 chart primitive，而不是复制 SVG 逻辑。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="charts-demos" aria-labelledby="charts-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-demos-title">代码演示</h3>
              <p>示例展示当前生产入口、响应式 viewBox、状态层和可访问摘要。</p>
            </div>
            <div className="charts-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="charts-sparkline" aria-labelledby="charts-sparkline-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-sparkline-title">Sparkline 独立文档</h3>
              <p>Sparkline 的生产 API、compact、baseline、状态、移动密度和五角色审查已拆到独立页面维护，ChartsDoc 只保留入口。</p>
            </div>
            <a className="button-doc-link" href="#/sparkline">
              打开 SparklineDoc
            </a>
          </section>

          <section className="button-doc-section" id="charts-api" aria-labelledby="charts-api-title">
            <h3 id="charts-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="charts-line-area-api" aria-labelledby="charts-line-area-api-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-line-area-api-title">LineChart / AreaChart 生产 API</h3>
              <p>LineChart 覆盖单序列趋势；AreaChart 覆盖单/多序列面积趋势。两者均支持可控 scale、状态语义、标签截断、移动端滚动和 SVG 可访问描述。</p>
            </div>
            <DataTable rows={lineAreaApiRows} />
          </section>

          <section className="button-doc-section" id="charts-bar-api" aria-labelledby="charts-bar-api-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-bar-api-title">BarChart 生产 API</h3>
              <p>BarChart 覆盖分类对比的核心生产能力：可控 scale、标签格式化、状态层、移动端滚动和 SVG 可访问描述。</p>
            </div>
            <DataTable rows={barApiRows} />
          </section>

          <section className="button-doc-section" id="charts-pie-api" aria-labelledby="charts-pie-api-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-pie-api-title">PieChart 生产 API</h3>
              <p>PieChart 面向少量占比：只计算正值、可定制色板、可关闭或截断 legend，并保持状态层和 SVG 语义一致。</p>
            </div>
            <DataTable rows={pieApiRows} />
          </section>

          <section className="button-doc-section" id="charts-funnel" aria-labelledby="charts-funnel-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-funnel-title">FunnelChart 专项</h3>
              <p>FunnelChart 有独立文档页，覆盖 stage/value/percent/dropoff labels、legend、accessibility、mobile 和五专家审查结论。</p>
            </div>
            <a className="button-doc-link" href="#/funnel-chart">
              打开 FunnelChartDoc
            </a>
          </section>

          <section className="button-doc-section" id="charts-sankey" aria-labelledby="charts-sankey-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-sankey-title">SankeyChart 专项</h3>
              <p>SankeyChart 有独立文档页，覆盖 nodes/links/value、简单分层布局、link 宽度、标签、accessibility、mobile 和五专家审查结论。</p>
            </div>
            <a className="button-doc-link" href="#/sankey-chart">
              打开 SankeyChartDoc
            </a>
          </section>

          <section className="button-doc-section" id="charts-word-cloud-api" aria-labelledby="charts-word-cloud-api-title">
            <div className="button-doc-section__heading">
              <h3 id="charts-word-cloud-api-title">WordCloud 生产 API</h3>
              <p>WordCloud 面向关键词权重探索：字号线性缩放、确定性 simple placement、best effort 避让和列表兜底。</p>
            </div>
            <DataTable rows={wordCloudApiRows} />
          </section>

          <section className="button-doc-section" id="charts-states" aria-labelledby="charts-states-title">
            <h3 id="charts-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <LineChart data={[]} emptyText="No trend yet" title="Empty line chart" />
              <AreaChart data={trendData} loading title="Loading area chart" />
              <LineChart data={trendData} error="Unable to read trend data." title="Error line chart" />
              <PieChart data={pieDataWithIgnoredValues} legendMaxItems={2} title="Filtered values" />
              <SankeyChart emptyText="No flows yet" links={[]} nodes={[]} title="Empty Sankey" />
              <WordCloud data={[]} emptyText="No keywords yet" title="Empty word cloud" />
            </div>
          </section>

          <section className="button-doc-section" id="charts-semantic" aria-labelledby="charts-semantic-title">
            <h3 id="charts-semantic-title">语义 DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="charts-mobile" aria-labelledby="charts-mobile-title">
            <h3 id="charts-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="charts-performance" aria-labelledby="charts-performance-title">
            <h3 id="charts-performance-title">性能边界</h3>
            <DataTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="charts-security" aria-labelledby="charts-security-title">
            <h3 id="charts-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="charts-token" aria-labelledby="charts-token-title">
            <h3 id="charts-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="charts-a11y" aria-labelledby="charts-a11y-title">
            <h3 id="charts-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>外层使用 figure 语义，title 和 summary 会连接到 aria-labelledby / aria-describedby。</li>
              <li>SVG 内部同步输出 title / desc；点、柱、切片也提供原生 SVG title。</li>
              <li>BarChart 在无 summary 时会生成最高值和最低值摘要；业务关键图表仍应传入人工 summary。</li>
              <li>LineChart / AreaChart 在 loading、error 或 empty 状态下隐藏底层 SVG，避免屏幕阅读器同时读到状态层和陈旧图形。</li>
              <li>PieChart 在 loading、error 或 empty 状态下隐藏底层 SVG，避免屏幕阅读器同时读到状态层和陈旧图形。</li>
              <li>SankeyChart 节点和 link 都提供 SVG title；loading、error 或 empty 状态下隐藏底层 SVG。</li>
              <li>WordCloud 在 SVG 外提供有序 fallback list，辅助技术可直接读取完整词和数值，不依赖视觉位置。</li>
              <li>Sparkline 在无可见标题时使用 ariaLabel 命名，并自动生成首尾、方向和范围摘要。</li>
              <li>复杂图表仍需要业务侧提供明确 summary，避免只靠颜色传达结论。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="charts-gaps" aria-labelledby="charts-gaps-title">
            <h3 id="charts-gaps-title">缺口</h3>
            <ul className="button-doc-list">
              <li>BarChart 已补生产 API，但横向柱、堆叠柱、分组柱和键盘 tooltip 尚未实现。</li>
              <li>LineChart 已补单序列生产 API；AreaChart 已补单/多序列生产 API。局部标注和键盘 tooltip 尚未覆盖。</li>
              <li>WordCloud 只做轻量确定性布局，不支持旋转、形状蒙版、动画退火或全局最优排布。</li>
              <li>SankeyChart 只覆盖小中型分层流向，不支持复杂自动布局全覆盖、交叉最小化、循环图和键盘 tooltip。</li>
              <li>GaugeChart 和 Heatmap 已拆为独立生产专页；下一批基础图表继续补 Radar 等，关系图和树图需独立布局模块。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="charts-review" aria-labelledby="charts-review-title">
            <h3 id="charts-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
            <ul className="button-doc-list">
              <li>GaugeChart 不与 Progress 合并文档；Heatmap 也已拆为独立生产专页，后续继续补 Radar 和更高阶统计图。</li>
              <li>后续补充键盘可达 tooltip、组合图、双轴和更完整的 tick 生成。</li>
              <li>关系图、流程图和树图应独立建图布局模块，不混入当前 Cartesian / Pie 工具。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
