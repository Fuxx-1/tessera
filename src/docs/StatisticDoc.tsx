import type { ReactNode } from "react";
import { Badge, Statistic, Tag } from "../components/base";
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

type ReviewRow = {
  role: string;
  conclusion: string;
};

export type StatisticDocProps = {
  showAnchors?: boolean;
};

export const statisticDocMeta = {
  title: "Statistic 统计数值",
  category: "基础组件",
  anchors: [
    { id: "statistic-purpose", label: "用途" },
    { id: "statistic-demos", label: "代码演示" },
    { id: "statistic-api", label: "API" },
    { id: "statistic-semantic", label: "Semantic DOM" },
    { id: "statistic-token", label: "Design Token" },
    { id: "statistic-a11y", label: "可访问性" },
    { id: "statistic-mobile", label: "移动端" },
    { id: "statistic-review", label: "五角色审查" },
    { id: "statistic-coverage", label: "覆盖范围" },
  ],
} satisfies ComponentDocMeta;

const countdownTarget = Date.now() + 1000 * 60 * 64;

const demos: Demo[] = [
  {
    title: "基础数值",
    description: "value、prefix、suffix 和 precision 组合展示金额、比例、单位等关键数值。",
    preview: (
      <div className="statistic-doc-strip">
        <Statistic title="Revenue" value={1289342.5} prefix="$" precision={2} />
        <Statistic title="Conversion" value={7.28} precision={2} suffix="%" tone="positive" />
        <Statistic title="Queue" value={4096} suffix="jobs" />
      </div>
    ),
    code: `<Statistic title="Revenue" value={1289342.5} prefix="$" precision={2} /> <Statistic title="Conversion" value={7.28} precision={2} suffix="%" tone="positive" /> <Statistic title="Queue" value={4096} suffix="jobs" />`,
  },
  {
    title: "趋势语义",
    description: "trend 输出明确方向图标，tone 输出业务严重度；状态不只依赖颜色。",
    preview: (
      <div className="statistic-doc-strip">
        <Statistic title="Active sessions" value={24918} trend="up" suffix="online" valueLabel="Active sessions up to 24,918 online" />
        <Statistic title="Error rate" value={1.42} trend="down" precision={2} suffix="%" valueLabel="Error rate down to 1.42 percent" />
        <Statistic title="SLA" value={99.95} trend="flat" precision={2} suffix="%" valueLabel="SLA flat at 99.95 percent" />
      </div>
    ),
    code: `<Statistic title="Active sessions" value={24918} trend="up" suffix="online" valueLabel="Active sessions up to 24,918 online" /> <Statistic title="Error rate" value={1.42} trend="down" precision={2} suffix="%" valueLabel="Error rate down to 1.42 percent" /> <Statistic title="SLA" value={99.95} trend="flat" precision={2} suffix="%" valueLabel="SLA flat at 99.95 percent" />`,
  },
  {
    title: "大数字换行",
    description: "超出安全整数的数字字符串会按原文本展示并允许换行，避免订单号、余额和长单位在移动端撑破容器。",
    preview: (
      <Statistic
        description="360/390/430px 下不产生页面横向滚动。"
        prefix="ID"
        size="lg"
        suffix="events/minute"
        title="Ingest throughput"
        value="98765432109876543210"
        valueLabel="Ingest throughput ID 98765432109876543210 events per minute"
      />
    ),
    code: `<Statistic title="Ingest throughput" description="360/390/430px 下不产生页面横向滚动。" prefix="ID" value="98765432109876543210" suffix="events/minute" size="lg" valueLabel="Ingest throughput ID 98765432109876543210 events per minute" />`,
  },
  {
    title: "Countup / Countdown",
    description: "countup 是可选增强，只对数值生效；countdown 用 target 明确倒计时目标并输出 timer 语义。",
    preview: (
      <div className="statistic-doc-strip">
        <Statistic title="Deploys" value={128} countup suffix="runs" />
        <Statistic title="Window closes" countdown={{ target: countdownTarget, format: "short" }} valueLabel="Deployment window countdown" />
        <Statistic title="Loading" loading loadingLabel="Loading statistic value" />
      </div>
    ),
    code: `<Statistic title="Deploys" value={128} countup suffix="runs" /> <Statistic title="Window closes" countdown={{ target: Date.now() + 3840000, format: "short" }} valueLabel="Deployment window countdown" /> <Statistic title="Loading" loading loadingLabel="Loading statistic value" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title", value: "ReactNode", description: "统计项标题，存在时会绑定 aria-labelledby。" },
  { name: "description", value: "ReactNode", description: "统计项说明，存在时会绑定 aria-describedby。" },
  { name: "value", value: "number | string", description: "核心展示值。安全十进制数字和规范分组数字字符串会按 precision 和分组符格式化，超出安全整数或非十进制输入按原文本展示，NaN/Infinity 降级为空值文本。" },
  { name: "prefix / suffix", value: "ReactNode", description: "数值前后缀，可放货币符号、单位、短文本或状态 Tag。" },
  { name: "precision", value: "number", description: "小数位，范围被限制到 0-12，避免异常精度撑破布局。" },
  { name: "trend", value: '"up" | "down" | "flat" | "positive" | "negative"', description: "输出趋势方向图标和方向类名，配合 valueLabel 给读屏完整语义。" },
  { name: "tone", value: '"neutral" | "positive" | "warning" | "critical"', description: "控制业务状态颜色，不改变数值含义。" },
  { name: "size", value: '"sm" | "md" | "lg"', description: "控制字号和内边距，默认 md。" },
  { name: "formatter / formatValue", value: "(value) => ReactNode", description: "自定义展示格式；formatter 兼容常见 Statistic API，使用后由调用方负责可读文本和 valueLabel。" },
  { name: "valueStyle", value: "CSSProperties", description: "只作用于数值文本，适合少量内联覆盖；状态色优先使用 tone/trend。" },
  { name: "valueLabel", value: "string", description: "为 output 提供完整可访问名称，特别适合趋势、单位和自定义格式。" },
  { name: "countup", value: "boolean | { from, duration, startOnMount }", description: "可选数值动效，只在 value 可解析为数字时启用。" },
  { name: "countdown", value: "{ target, format, now, onFinish }", description: "可选倒计时，target 支持 timestamp、Date 或 ISO 字符串，输出 role=timer。" },
  { name: "loading / empty", value: "boolean / ReactNode", description: "内置加载骨架和空值文本，缺失值不会直出到界面。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section.c-statistic", description: "统计块根节点；title/description 会自动成为可访问名称和说明。" },
  { name: "output", value: "output.c-statistic__output", description: "核心语义节点，承载 prefix、value、suffix 和趋势图标。" },
  { name: "timer", value: "output[role=timer]", description: "启用 countdown 时标记为计时器，便于辅助技术理解动态倒计时。" },
  { name: "value", value: "span.c-statistic__value", description: "数值文本使用 tabular-nums，并允许长数字换行。" },
  { name: "loading", value: "div[role=status]", description: "loading 时输出状态骨架，根节点同步 aria-busy。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白表面和细边框，和当前 neutral minimal 基础组件一致。" },
  { name: "value", value: "30px / 720", description: "默认数值字号与权重，sm/lg 只改变密度，不改变布局模型。" },
  { name: "neutral", value: "#1f1f1d / #696967", description: "中性色用于默认数值、标题和单位。" },
  { name: "positive", value: "#2f6d4a", description: "增长、成功或正向指标。" },
  { name: "warning", value: "#8a6724", description: "持平、注意或阈值附近指标。" },
  { name: "critical", value: "#8a3434", description: "下降、异常或危险指标。" },
];

const a11yRows: DocRow[] = [
  { name: "Readable name", value: "title + valueLabel", description: "复杂趋势推荐提供 valueLabel，例如 Error rate down to 1.42 percent。" },
  { name: "No color-only state", value: "trend icon + text label", description: "趋势图标是视觉方向；读屏语义应由 valueLabel 明确补齐。" },
  { name: "Timer", value: "role=timer", description: "倒计时使用 timer 语义；onFinish 只触发一次。" },
  { name: "Formatting safety", value: "safe decimal only", description: "只自动格式化安全十进制数字，不把科学计数法、十六进制或超大整数转换成失真数值；NaN/Infinity number 不直出。" },
  { name: "Motion", value: "countup optional", description: "countup 是可选增强；关键数值仍以文本 output 呈现。" },
];

const mobileRows: DocRow[] = [
  { name: "Large number", value: "overflow-wrap:anywhere", description: "超长数字、订单号和单位允许换行，避免横向滚动。" },
  { name: "Layout", value: "flex-wrap", description: "prefix、value、suffix 在窄屏自动换行，不挤压相邻内容。" },
  { name: "Density", value: "sm / md / lg", description: "移动列表可用 sm，详情头部可用 md，关键首屏指标可用 lg。" },
];

const reviewRows: ReviewRow[] = [
  {
    role: "产品",
    conclusion: "Statistic 只负责突出单个关键数值，MetricCard 继续负责卡片级标题、图表槽位和复杂状态组合；前后缀、趋势、精度、占位和空态都在单值边界内说明，两者文档不合并。",
  },
  {
    role: "UI",
    conclusion: "采用近白表面、细边框、低阴影和中性字号层级；趋势色不使用蓝色主调，移动端保持可换行输出。",
  },
  {
    role: "研发",
    conclusion: "组件零外部 UI 依赖，countup/countdown 都是可选增强；formatter、precision、valueStyle、语义 output 和非有限数字兜底在组件边界内完成。",
  },
  {
    role: "测试",
    conclusion: "验收覆盖 value/prefix/suffix/precision/trend/countup/countdown、semantic output、loading、空值、大数字换行和 360/390/430px 移动端。",
  },
  {
    role: "白帽",
    conclusion: "不使用 innerHTML，不执行格式字符串；仅自动格式化安全十进制数字，用户输入只作为 ReactNode 或文本输出，倒计时 target 解析失败时降级为空值文案。",
  },
];

const coverageRows: DocRow[] = [
  { name: "已覆盖", value: "value / prefix / suffix / precision / trend / countup / countdown", description: "满足本轮 Statistic 专项要求，并有独立文档页。" },
  { name: "数值安全", value: "safe decimal / MAX_SAFE_INTEGER", description: "自动格式化前校验十进制格式和安全整数边界，避免金额、订单号和异常字符串被隐式改写。" },
  { name: "不支持", value: "card chart slot / remote polling / tooltip drilldown", description: "这些属于 MetricCard、Charts 或业务容器能力，不放入 Statistic。" },
  { name: "依赖边界", value: "no antd / antd-mobile / @ant-design/charts", description: "实现只使用 React 和项目工具函数。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview">{preview}</div>
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
              <td><code>{row.name}</code></td>
              <td><code>{row.value}</code></td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatisticDoc({ showAnchors = false }: StatisticDocProps) {
  return (
    <TutorialScaffold component="Statistic" kind="display" oneLineExample={`<Statistic title="Success rate" value={98.6} suffix="%" />`}>
    <section className="button-doc" aria-labelledby="statistic-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Statistic 文档目录">
            {statisticDocMeta.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>)}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="statistic-doc-title">{statisticDocMeta.title}</h2>
            <p>用于展示单个关键数值、单位、趋势和轻量计时。Statistic 是基础数据展示组件，不承担 MetricCard 的图表槽位和卡片级业务状态。</p>
          </header>

          <section className="button-doc-section" id="statistic-purpose" aria-labelledby="statistic-purpose-title">
            <h3 id="statistic-purpose-title">用途</h3>
            <ul className="button-doc-list">
              <li>需要突出金额、比例、数量、耗时、倒计时等单个关键数值时使用。</li>
              <li>需要将指标与图表、delta、footer、error/empty 组合成业务卡片时，继续使用 MetricCard。</li>
              <li>数值状态必须可被文本理解，趋势色和方向图标不能作为唯一语义来源。</li>
            </ul>
            <div className="doc-demo-row" aria-label="Statistic scope badges">
              <Badge status="success" text="semantic output" />
              <Badge status="processing" text="mobile wrapping" />
              <Tag tone="subtle">independent from MetricCard</Tag>
            </div>
          </section>

          <section className="button-doc-section" id="statistic-demos" aria-labelledby="statistic-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="statistic-demos-title">代码演示</h3>
              <p>示例覆盖基础数值、趋势语义、大数字换行、countup、countdown、loading 和移动端密度。</p>
            </div>
            <div className="statistic-doc-demo-grid">{demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}</div>
          </section>

          <section className="button-doc-section" id="statistic-api" aria-labelledby="statistic-api-title"><h3 id="statistic-api-title">API</h3><DataTable rows={apiRows} /></section>
          <section className="button-doc-section" id="statistic-semantic" aria-labelledby="statistic-semantic-title"><h3 id="statistic-semantic-title">Semantic DOM</h3><DataTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="statistic-token" aria-labelledby="statistic-token-title"><h3 id="statistic-token-title">Design Token</h3><DataTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="statistic-a11y" aria-labelledby="statistic-a11y-title"><h3 id="statistic-a11y-title">可访问性</h3><DataTable rows={a11yRows} /></section>
          <section className="button-doc-section" id="statistic-mobile" aria-labelledby="statistic-mobile-title"><h3 id="statistic-mobile-title">移动端</h3><DataTable rows={mobileRows} /></section>

          <section className="button-doc-section" id="statistic-review" aria-labelledby="statistic-review-title">
            <div className="button-doc-section__heading">
              <h3 id="statistic-review-title">五角色审查</h3>
              <p>产品、UI、研发、测试、白帽同步确认边界和验收重点。</p>
            </div>
            <div className="statistic-doc-review-grid">
              {reviewRows.map((row) => (
                <article className="statistic-doc-review" key={row.role}>
                  <h4>{row.role}</h4>
                  <p>{row.conclusion}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="statistic-coverage" aria-labelledby="statistic-coverage-title"><h3 id="statistic-coverage-title">覆盖范围</h3><DataTable rows={coverageRows} /></section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
