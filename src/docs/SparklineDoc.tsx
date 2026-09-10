import type { ReactNode } from "react";
import { Sparkline } from "../components/charts";
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

export type SparklineDocProps = {
  showAnchors?: boolean;
};

export const sparklineDocMeta = {
  title: "Sparkline 迷你趋势图",
  category: "Charts",
  anchors: [
    { id: "sparkline-when", label: "何时使用" },
    { id: "sparkline-demos", label: "代码演示" },
    { id: "sparkline-embedding", label: "嵌入场景" },
    { id: "sparkline-density", label: "移动密度" },
    { id: "sparkline-api", label: "API" },
    { id: "sparkline-states", label: "状态" },
    { id: "sparkline-semantic", label: "Semantic DOM" },
    { id: "sparkline-mobile", label: "移动端" },
    { id: "sparkline-security", label: "安全" },
    { id: "sparkline-a11y", label: "可访问性" },
    { id: "sparkline-gaps", label: "缺口" },
    { id: "sparkline-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const weeklyActivationData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 76 },
  { label: "Fri", value: 68 },
  { label: "Sat", value: 92 },
  { label: "Sun", value: 84 },
];

const latencyData = [
  { label: "Mon", value: 176 },
  { label: "Tue", value: 164 },
  { label: "Wed", value: 151 },
  { label: "Thu", value: 146 },
  { label: "Fri", value: 139 },
  { label: "Sat", value: 132 },
  { label: "Sun", value: 128 },
];

const qualityScoreData = [
  { label: "Mon", value: 72 },
  { label: "Tue", value: 74 },
  { label: "Wed", value: 71 },
  { label: "Thu", value: 78 },
  { label: "Fri", value: 81 },
  { label: "Sat", value: 79 },
  { label: "Sun", value: 83 },
];

const queueDepthData = [
  { label: "00:00", value: 18 },
  { label: "04:00", value: 24 },
  { label: "08:00", value: 31 },
  { label: "12:00", value: 28 },
  { label: "16:00", value: 22 },
  { label: "20:00", value: 16 },
];

const signedDeltaData = [
  { label: "Jan", value: -4 },
  { label: "Feb", value: -1 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 8 },
  { label: "May", value: 6 },
  { label: "Jun", value: 11 },
];

const singlePointData = [{ label: "Now", value: 64 }];

const denseSparklineData = Array.from({ length: 96 }, (_, index) => ({
  label: `P${index + 1}`,
  value: Math.round(52 + Math.sin(index / 4) * 18 + index * 0.22),
}));

const demos: Demo[] = [
  {
    title: "Metric card trend",
    description: "有标题和摘要的 md 尺寸适合指标卡片，图形只承担趋势，业务值由卡片主体呈现。",
    preview: (
      <Sparkline
        data={weeklyActivationData}
        size="md"
        summary="Weekly activation rose from Monday to Sunday and peaked on Saturday."
        title="Activation trend"
        tone="sage"
        trendLabel="+18%"
        valueFormatter={(value) => `${value}%`}
      />
    ),
    code: `<Sparkline
  data={activationData}
  size="md"
  title="Activation trend"
  summary="Weekly activation rose from Monday to Sunday and peaked on Saturday."
  trendLabel="+18%"
  valueFormatter={(value) => value + "%"}
/>`,
  },
  {
    title: "Compact table cell",
    description: "无可见标题时进入 compact 模式，必须传 ariaLabel 或 summary，适合表格和密集列表。",
    preview: <Sparkline ariaLabel="Weekly activation trend" data={weeklyActivationData} size="xs" tone="amber" trendLabel="+6.4%" />,
    code: `<Sparkline ariaLabel="Weekly activation trend" data={activationData} size="xs" trendLabel="+6.4%" />`,
  },
  {
    title: "Baseline guardrail",
    description: "showBaseline 用于目标值、零线或阈值附近的快速判断，不替代完整坐标轴。",
    preview: (
      <Sparkline
        ariaLabel="Quality score drift"
        baselineValue={75}
        data={qualityScoreData}
        showBaseline
        summary="Quality score stays close to and then above the 75 point baseline."
        tone="sage"
        trendLabel="+11 pts"
      />
    ),
    code: `<Sparkline ariaLabel="Quality score drift" data={qualityData} showBaseline baselineValue={75} />`,
  },
  {
    title: "Quiet line",
    description: "关闭面积和端点后保留低干扰趋势线，适合告警列表、队列深度等辅助信息。",
    preview: (
      <Sparkline
        ariaLabel="Queue depth trend"
        data={queueDepthData}
        showArea={false}
        showEndpoint={false}
        size="sm"
        tone="neutral"
        trendLabel="-2"
      />
    ),
    code: `<Sparkline ariaLabel="Queue depth trend" data={queueDepthData} showArea={false} showEndpoint={false} />`,
  },
  {
    title: "Tiny bars",
    description: "variant=bar 用同一个 SVG 预算表达离散脉冲或日桶数据，适合吞吐、失败数等非连续走势。",
    preview: (
      <Sparkline
        ariaLabel="Queue depth daily buckets"
        data={queueDepthData}
        showEndpoint={false}
        size="sm"
        tone="clay"
        trendLabel="-2"
        variant="bar"
      />
    ),
    code: `<Sparkline ariaLabel="Queue depth daily buckets" data={queueDepthData} variant="bar" showEndpoint={false} />`,
  },
  {
    title: "Signed baseline",
    description: "baselineValue 默认为 0；正负变化可用基线解释方向，仍由宿主文案说明业务含义。",
    preview: (
      <Sparkline
        ariaLabel="Monthly net delta"
        data={signedDeltaData}
        showBaseline
        summary="Monthly delta moves from negative to positive and ends at plus eleven."
        tone="plum"
        trendLabel="+15"
        valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}`}
      />
    ),
    code: `<Sparkline ariaLabel="Monthly net delta" data={deltaData} showBaseline valueFormatter={formatDelta} />`,
  },
  {
    title: "Single point",
    description: "只有一个点时居中显示端点和可访问摘要，不生成 NaN path，也不拉伸布局。",
    preview: <Sparkline ariaLabel="Current quality score" data={singlePointData} size="xs" summary="Single point sparkline with current value 64." tone="sage" trendLabel="64" />,
    code: `<Sparkline ariaLabel="Current quality score" data={[{ label: "Now", value: 64 }]} size="xs" trendLabel="64" />`,
  },
  {
    title: "Large series budget",
    description: "大量数据通过 maxDataPoints 等距采样，保留首尾趋势并显示 SVG 性能提示。",
    preview: <Sparkline ariaLabel="Dense sparkline sample" data={denseSparklineData} maxDataPoints={12} size="xs" tone="plum" trendLabel="+21" />,
    code: `<Sparkline ariaLabel="Dense sparkline sample" data={denseData} maxDataPoints={12} size="xs" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "顺序点位数据。组件会过滤非法数值，重复 label 仍按索引分布，适合小中型趋势片段。",
  },
  {
    name: "size / height",
    value: '"xs" | "sm" | "md" / number',
    description: "默认 sm。xs 用于表格和移动列表，md 用于指标卡片；height 会被收敛到 32..240。",
  },
  {
    name: "ariaLabel / title / summary",
    value: "string",
    description: "无可见标题的 compact 实例使用 ariaLabel 命名；SVG 内始终输出 title 和 desc。",
  },
  {
    name: "tone",
    value: '"neutral" | "sage" | "clay" | "plum" | "amber"',
    description: "使用自有图表色板，不依赖外部图表库；状态判断不能只靠颜色。",
  },
  {
    name: "showArea / showEndpoint",
    value: "boolean",
    description: "控制面积填充和最后点标记。关闭装饰元素后仍保留可访问摘要。",
  },
  {
    name: "variant",
    value: '"area" | "line" | "bar"',
    description: "默认按 showArea 兼容为 area 或 line。bar 用 SVG rect 表达离散桶，不引入图表库。",
  },
  {
    name: "showBaseline / baselineValue",
    value: "boolean / number",
    description: "显示目标线、零线或阈值线。baselineValue 默认 0，非法值回退为 0。",
  },
  {
    name: "maxDataPoints",
    value: "number",
    description: "大量数据的 SVG 点位预算。默认 48 点，超出后等距采样并输出性能 notice，保留首尾趋势。",
  },
  {
    name: "trendLabel",
    value: "string",
    description: "渲染在 compact 图右侧的短文本，应保持短且可截断，例如 +6.4%、-12 ms。",
  },
  {
    name: "loading / error / emptyText",
    value: "boolean / ReactNode / string",
    description: "内置状态层，状态文案进入 role=status 或 role=alert，图形保持稳定尺寸。",
  },
];

const stateRows: DocRow[] = [
  {
    name: "empty",
    value: "data=[]",
    description: "空数据时显示 emptyText，底层 SVG 仍保留可访问命名但视觉弱化。",
  },
  {
    name: "single",
    value: "data.length=1",
    description: "单点数据居中渲染端点，可访问摘要仍包含首尾和值域，不产生非法 SVG path。",
  },
  {
    name: "large",
    value: "maxDataPoints",
    description: "长序列默认按 48 点预算采样，也可显式传 maxDataPoints；页面展示 notice，避免大量 path 点位拖慢文档和移动端渲染。",
  },
  {
    name: "loading",
    value: "loading",
    description: "外层 figure 设置 aria-busy，状态层使用 polite live region。",
  },
  {
    name: "error",
    value: "error",
    description: "错误状态使用 role=alert，错误内容由 React 渲染，不解析 HTML 字符串。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: 'div[role="figure"].c-sparkline',
    description: "复用 ChartFrame，title/summary 存在时通过 aria-labelledby / aria-describedby 关联。",
  },
  {
    name: "svg",
    value: 'svg[role="img"][aria-labelledby]',
    description: "每个 SVG 都有 title 和 desc；desc 来自 summary 或自动生成的首尾、方向和范围摘要。",
  },
  {
    name: "endpoint",
    value: "circle > title",
    description: "最后点标记提供原生 SVG title，帮助鼠标用户和辅助技术理解点位值。",
  },
  {
    name: "bar",
    value: "rect.c-sparkline__bar",
    description: "bar 变体使用 SVG rect 和子 title，仍在同一个 role=img 的 SVG 语义内。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "density",
    value: "xs + compact",
    description: "移动列表使用 xs，strip 在窄屏改为单列，图形换到整行，避免横向溢出。",
  },
  {
    name: "instances",
    value: "48 points default",
    description: "数千行密集列表不应挂载逐点交互；默认点位预算限制每个 SVG 的节点和 path 长度。",
  },
  {
    name: "touch",
    value: "non-interactive",
    description: "Sparkline 本身不抢焦点、不提供 hover-only 交互；触控页面仍可自然滚动。",
  },
  {
    name: "text",
    value: "trendLabel truncate",
    description: "趋势短文案最大宽度受控并截断，业务指标名称和值允许在移动容器内收缩。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "dependency",
    value: "no antd / charts package",
    description: "实现只使用 React、自有 SVG 工具和本地色板，不引入 antd、antd-mobile 或 @ant-design/charts。",
  },
  {
    name: "content",
    value: "React text nodes",
    description: "label、summary、trendLabel、error 均按 React 内容渲染，不使用 dangerouslySetInnerHTML。",
  },
  {
    name: "data",
    value: "sanitized numbers",
    description: "非法数值和尺寸会被过滤或收敛，避免 NaN 进入 SVG path 造成空白或异常布局。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "Sparkline 定位为指标趋势辅助，不承担完整分析图能力；文档明确适用边界和宿主责任。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "覆盖 xs/sm/md、compact、baseline、quiet line 和移动密度列表，视觉层级不与主指标抢夺注意力。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "组件从 charts barrel export，独立文档路由可达；area/line/bar 均为 SVG，无需外部 UI 或图表依赖。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "验收覆盖多示例、compact 数量、状态层、SVG title/desc、baseline、endpoint、trendLabel 和移动不溢出。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "不解析 HTML 字符串，输入值收敛，错误内容由 React 渲染，依赖扫描禁止外部 UI/图表包。",
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
      <pre className="button-doc-code">
        <code>{code}</code>
      </pre>
    </article>
  );
}

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="detail-doc-table-wrap">
      <table className="detail-doc-table">
        <thead>
          <tr>
            <th scope="col">项目</th>
            <th scope="col">当前值</th>
            <th scope="col">验收说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.value}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const oneLineExample = `<Sparkline ariaLabel="Orders trend" data={orders} size="xs" variant="line" trendLabel="+8%" />`;

export function SparklineDoc({ showAnchors = false }: SparklineDocProps) {
  return (
    <TutorialScaffold component="Sparkline" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc sparkline-doc" aria-labelledby="sparkline-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Sparkline 文档目录">
            {sparklineDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="sparkline-doc-title">{sparklineDocMeta.title}</h2>
            <p>
              Sparkline 是独立生产组件，用于卡片、表格和移动密集列表中的轻量趋势表达。它不合并到 ChartsDoc，也不依赖 antd、
              antd-mobile 或 @ant-design/charts。
            </p>
          </header>

          <section className="button-doc-section" id="sparkline-when" aria-labelledby="sparkline-when-title">
            <h3 id="sparkline-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于指标值旁边的趋势辅助，例如活跃率、延迟、队列深度、质量分等小范围时间序列。</li>
              <li>一行样例：<code>{oneLineExample}</code></li>
              <li>当用户需要坐标轴、tooltip、刷选、缩放、多序列对比或精确读数时，应使用完整图表而不是 Sparkline。</li>
              <li>业务侧必须提供指标值、单位和结论文案；Sparkline 只负责趋势形状、状态和可访问摘要。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sparkline-demos" aria-labelledby="sparkline-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="sparkline-demos-title">代码演示</h3>
              <p>覆盖生产尺寸、compact、baseline、端点、无装饰趋势线和正负基线。</p>
            </div>
            <div className="charts-doc-demo-grid charts-doc-demo-grid--compact">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="sparkline-embedding" aria-labelledby="sparkline-embedding-title">
            <div className="button-doc-section__heading">
              <h3 id="sparkline-embedding-title">嵌入场景</h3>
              <p>同一个组件在行内文本、指标卡和表格单元格中保持固定尺寸、短标签截断和安全文本渲染。</p>
            </div>
            <div className="sparkline-doc-embedding">
              <div className="sparkline-doc-inline">
                <span>Orders recovered</span>
                <Sparkline ariaLabel="Inline orders recovery trend" data={weeklyActivationData} showArea={false} size="xs" tone="sage" trendLabel="+8%" variant="line" />
                <span>after the retry queue drained.</span>
              </div>
              <article className="sparkline-doc-card">
                <span>Revenue risk</span>
                <strong>$18.4k</strong>
                <Sparkline
                  ariaLabel="Revenue risk bucket sparkline"
                  data={signedDeltaData}
                  showBaseline
                  showEndpoint={false}
                  summary="Revenue risk moved from negative to positive buckets and ends higher."
                  tone="plum"
                  trendLabel="+15"
                  variant="bar"
                />
              </article>
              <div className="sparkline-doc-table-wrap">
                <table className="sparkline-doc-table">
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Now</th>
                      <th scope="col">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Activation</td>
                      <td>84%</td>
                      <td><Sparkline ariaLabel="Activation table cell trend" data={weeklyActivationData} size="xs" tone="sage" trendLabel="+6.4%" /></td>
                    </tr>
                    <tr>
                      <td>Latency</td>
                      <td>128 ms</td>
                      <td><Sparkline ariaLabel="Latency table cell trend" data={latencyData} showArea={false} size="xs" tone="clay" trendLabel="-12 ms" variant="line" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="button-doc-section" id="sparkline-density" aria-labelledby="sparkline-density-title">
            <div className="button-doc-section__heading">
              <h3 id="sparkline-density-title">移动密度</h3>
              <p>xs 尺寸用于移动列表和表格单元格；窄屏下每行自动收敛，避免图形或短标签溢出视口。</p>
            </div>
            <div className="sparkline-doc-strip" aria-label="Sparkline mobile density examples">
              <div>
                <span>Activation</span>
                <strong>42.8%</strong>
                <Sparkline ariaLabel="Activation mobile row trend" data={weeklyActivationData} size="xs" trendLabel="+6.4%" valueFormatter={(value) => `${value}%`} />
              </div>
              <div>
                <span>Latency</span>
                <strong>128 ms</strong>
                <Sparkline ariaLabel="Latency mobile row trend" data={latencyData} showArea={false} size="xs" tone="clay" trendLabel="-12 ms" valueFormatter={(value) => `${value} ms`} />
              </div>
              <div>
                <span>Quality</span>
                <strong>83 pts</strong>
                <Sparkline ariaLabel="Quality mobile row trend" data={qualityScoreData} size="xs" tone="sage" trendLabel="+11 pts" />
              </div>
              <div>
                <span>Queue</span>
                <strong>16</strong>
                <Sparkline ariaLabel="Queue mobile row trend" data={queueDepthData} showArea={false} size="xs" tone="neutral" trendLabel="-2" />
              </div>
            </div>
          </section>

          <section className="button-doc-section" id="sparkline-api" aria-labelledby="sparkline-api-title">
            <h3 id="sparkline-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="sparkline-states" aria-labelledby="sparkline-states-title">
            <h3 id="sparkline-states-title">状态</h3>
            <DataTable rows={stateRows} />
            <div className="charts-doc-state-grid">
              <Sparkline ariaLabel="Empty sparkline state" data={[]} emptyText="No compact trend" />
              <Sparkline ariaLabel="Loading sparkline state" data={weeklyActivationData} loading loadingText="Loading trend" />
              <Sparkline ariaLabel="Error sparkline state" data={weeklyActivationData} error="Trend service unavailable." />
            </div>
          </section>

          <section className="button-doc-section" id="sparkline-semantic" aria-labelledby="sparkline-semantic-title">
            <h3 id="sparkline-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="sparkline-mobile" aria-labelledby="sparkline-mobile-title">
            <h3 id="sparkline-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="sparkline-security" aria-labelledby="sparkline-security-title">
            <h3 id="sparkline-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="sparkline-a11y" aria-labelledby="sparkline-a11y-title">
            <h3 id="sparkline-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>每个 SVG 使用 role=img、title、desc 和 aria-labelledby；无 summary 时自动生成首尾、方向和范围摘要。</li>
              <li>compact 模式没有可见标题，必须通过 ariaLabel 或上层文案给出可访问名称。</li>
              <li>loading、empty、error 使用状态层表达，不要求用户从图形中猜测系统状态。</li>
              <li>trendLabel 是视觉短标签，不应成为唯一语义；关键业务结论写入 summary 或相邻指标文案。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sparkline-gaps" aria-labelledby="sparkline-gaps-title">
            <h3 id="sparkline-gaps-title">缺口</h3>
            <ul className="button-doc-list">
              <li>当前不提供逐点 tooltip、键盘点位浏览、刷选、缩放、多序列或动画入场。</li>
              <li>不展示坐标轴和刻度；需要精确读数时应切换 LineChart / AreaChart 等完整图表。</li>
              <li>超大数据集应由业务层预聚合或抽样，Sparkline 面向短序列概览。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="sparkline-review" aria-labelledby="sparkline-review-title">
            <h3 id="sparkline-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
