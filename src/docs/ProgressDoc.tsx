import type { ReactNode } from "react";
import { Progress } from "../components/base";
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

export type ProgressDocProps = {
  showAnchors?: boolean;
};

export const progressDocMeta = {
  title: "Progress 进度条",
  category: "反馈",
  anchors: [
    { id: "progress-when", label: "何时使用" },
    { id: "progress-demos", label: "代码演示" },
    { id: "progress-api", label: "API" },
    { id: "progress-semantic", label: "Semantic DOM" },
    { id: "progress-token", label: "Design Token" },
    { id: "progress-a11y", label: "可访问性" },
    { id: "progress-mobile", label: "移动端" },
    { id: "progress-security", label: "安全" },
    { id: "progress-review", label: "五专家结论" },
    { id: "progress-gaps", label: "缺口" },
    { id: "progress-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "线形进度",
    description: "默认 type=line，适合上传、导出、批处理等可确定总量的任务。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress label="Export progress" value={68} status="active" />
        <Progress label="Assets synced" value={100} status="success" />
      </div>
    ),
    code: `<Progress label="Export progress" value={68} status="active" />`,
  },
  {
    title: "环形进度",
    description: "type=circle 使用自有 SVG 圆环，根节点仍是 progressbar，SVG 只承担视觉表达。",
    preview: (
      <div className="doc-demo-row progress-doc-circle-row">
        <Progress type="circle" label="Build" value={76} />
        <Progress type="circle" label="Done" value={100} status="success" size="sm" />
        <Progress type="circle" label="Retry" value={42} status="warning" size="lg" />
      </div>
    ),
    code: `<Progress type="circle" label="Build" value={76} />`,
  },
  {
    title: "仪表盘进度",
    description: "type=dashboard 使用同一套 SVG 圆弧，保留底部缺口；根节点仍是 aria progressbar。",
    preview: (
      <div className="doc-demo-row progress-doc-circle-row">
        <Progress type="dashboard" label="Deploy" value={63} />
        <Progress type="dashboard" label="Stable" value={100} status="success" size="sm" />
        <Progress type="dashboard" label="Exception" value={38} status="exception" size="lg" />
      </div>
    ),
    code: `<Progress type="dashboard" label="Deploy" value={63} />`,
  },
  {
    title: "步骤进度",
    description: "steps 将线形轨道切成最多 20 段，适合明确阶段数量的任务；语义仍由根 progressbar 承担。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress label="Package stages" value={60} steps={5} />
        <Progress label="Review gates" value={87} steps={8} status="success" />
      </div>
    ),
    code: `<Progress label="Package stages" value={60} steps={5} />`,
  },
  {
    title: "状态",
    description: "active、success、warning、error/exception 通过中性色系和状态色表达，不依赖蓝色主色。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress label="Running" value={46} status="active" />
        <Progress label="Completed" value={100} status="success" />
        <Progress label="Needs review" value={82} status="warning" />
        <Progress label="Failed at step 4" value={28} status="exception" />
      </div>
    ),
    code: `<Progress label="Failed at step 4" value={28} status="exception" />`,
  },
  {
    title: "未知总量",
    description: "indeterminate 用于等待 worker、排队或服务端未返回总量的场景；不输出 aria-valuenow。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress indeterminate label="Waiting for worker" size="sm" />
        <Progress indeterminate type="circle" label="Queue" />
      </div>
    ),
    code: `<Progress indeterminate label="Waiting for worker" size="sm" />`,
  },
  {
    title: "文本与格式化",
    description: "format/formatValue 会同步可见文本和 aria-valuetext；showValue=false 可用于表格密集行。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress label="Rows imported" value={384} max={512} formatValue={(value, max) => `${value}/${max} rows`} />
        <Progress aria-label="Escaped format text" percent={50} format={(percent) => `${percent}% <script>alert(1)</script> is text only`} strokeColor={{ from: "#555552", to: "#2f6d4a" }} />
        <Progress aria-label="Background compaction" showValue={false} value={54} />
      </div>
    ),
    code: `<Progress percent={50} format={(percent) => \`\${percent}% <script>alert(1)</script> is text only\`} strokeColor={{ from: "#555552", to: "#2f6d4a" }} />`,
  },
  {
    title: "边界值",
    description: "value 会夹取到 0..max；无效 max 回退为 100，避免 aria-valuenow 输出非法值。",
    preview: (
      <div className="doc-demo-stack progress-doc-demo-line">
        <Progress label="Negative value" value={-24} />
        <Progress label="Over max" value={148} />
        <Progress label="NaN percent" value={72} percent={Number.NaN} />
        <Progress label="Infinity value" value={Number.POSITIVE_INFINITY} />
        <Progress label="Invalid max fallback" value={36} max={0} />
      </div>
    ),
    code: `<Progress label="Over max" value={148} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "type", value: '"line" | "circle" | "dashboard"', description: "进度形态。默认 line；circle/dashboard 使用组件内 SVG 绘制。" },
  { name: "shape", value: '"line" | "circle" | "dashboard"', description: "兼容旧调用的形态别名。type 优先级更高。" },
  { name: "percent", value: "number", description: "百分比入口。存在有限数值时优先于 value/max，并夹取到 0..100。" },
  { name: "value", value: "number", description: "当前进度值。确定进度会夹取到 0..max；非有限值按 0 处理。" },
  { name: "max", value: "number", description: "进度最大值。默认 100；非有限值或小于等于 0 时回退为 100。" },
  { name: "label", value: "ReactNode", description: "可见标签。字符串 label 会作为 progressbar 的默认 aria-label。" },
  { name: "indeterminate", value: "boolean", description: "未知总量进度。开启后只输出 aria-valuetext，不输出 aria-valuemin/max/now。" },
  { name: "showValue", value: "boolean", description: "是否显示值文本。默认 true；隐藏后仍保留 aria-valuetext。" },
  { name: "size", value: '"sm" | "md" | "lg"', description: "线形高度或环形直径。默认 md。" },
  { name: "status", value: '"active" | "success" | "warning" | "error" | "exception"', description: "状态语气。默认 active；exception 作为失败状态别名。" },
  { name: "steps", value: "number", description: "线形分段数量。仅确定进度生效，范围收敛为 2..20。" },
  { name: "format", value: "(percent, value, max) => ReactNode", description: "百分比优先的自定义展示。非文本 ReactNode 会用百分比作为 aria-valuetext 回退。" },
  { name: "formatValue", value: "(value, max) => ReactNode", description: "自定义可见值与 aria-valuetext 文本，入参为夹取后的 value 和规范化 max。" },
  { name: "strokeColor", value: "string | { from, to }", description: "自定义进度色或线形渐变色；circle/dashboard 使用终点色作为 SVG stroke。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "透传 id、className、style、aria-*、data-* 等 div 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div[role=progressbar]", description: "线形和环形共享同一个根语义节点，便于辅助技术和测试定位。" },
  { name: "determinate", value: "aria-valuemin/max/now/text", description: "确定进度暴露规范化数值，aria-valuenow 不会低于 0 或高于 max。" },
  { name: "indeterminate", value: "aria-valuetext + aria-busy", description: "未知总量不报告虚假百分比，只提供 In progress 文本。" },
  { name: "visual", value: "track / steps / svg[aria-hidden]", description: "进度条、分段块、圆环 SVG 都是视觉层，不额外进入读屏树。" },
  { name: "name", value: "label or aria-label", description: "label 为字符串时自动成为可访问名称；复杂 label 或隐藏值场景应传入 aria-label。" },
];

const tokenRows: DocRow[] = [
  { name: "track", value: "#e7e7e4", description: "线形轨道和圆形底环色。" },
  { name: "active", value: "#555552", description: "默认进度色，保持 neutral minimal 中性层级。" },
  { name: "success", value: "#2f6d4a", description: "成功进度色。" },
  { name: "warning", value: "#8a6724", description: "警告进度色。" },
  { name: "error", value: "#8a3434", description: "失败进度色。" },
  { name: "lineHeight", value: "5px / 8px / 12px", description: "sm、md、lg 线形轨道高度。" },
  { name: "circleSize", value: "84px / 112px / 136px", description: "sm、md、lg 环形视觉尺寸。" },
  { name: "dashboardGap", value: "24% arc gap", description: "仪表盘用 SVG dasharray 留出底部缺口，不依赖外部图表库。" },
  { name: "steps", value: "2..20", description: "分段数量在组件内收敛，避免过密分段破坏移动端可读性。" },
  { name: "motion", value: "160ms value / 1.2s indeterminate", description: "确定进度只过渡数值；未知总量循环动画尊重 reduced motion。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Progressbar", value: "role", description: "组件不使用 meter 语义，因为它表达任务完成进度而非静态度量。" },
  { name: "Value text", value: "aria-valuetext", description: "百分比、行数或自定义业务文案都能被读屏获取。" },
  { name: "Busy", value: "aria-busy", description: "active 和 indeterminate 默认为 busy，success/warning/error 不额外标记忙碌。" },
  { name: "Reduced motion", value: "@media", description: "系统请求减少动画时禁用 indeterminate 动画和过渡。" },
  { name: "Color", value: "text + status", description: "文档示例同时提供标签和值文本，状态不只依赖色条。" },
];

const mobileRows: DocRow[] = [
  { name: "Width", value: "min-width: 0", description: "线形进度在 375px 和 390px 文档列中随容器收缩，不产生横向溢出。" },
  { name: "Text", value: "overflow-wrap", description: "label 和数值允许换行，长任务名不会挤压轨道。" },
  { name: "Circle", value: "fit-content + max-width", description: "circle/dashboard 按自身尺寸渲染，窄屏内可换行排列。" },
  { name: "Steps", value: "min segment width", description: "分段块有最小宽度并限制最多 20 段，避免移动端碎裂或横向滚动。" },
  { name: "Touch", value: "read-only", description: "Progress 没有拖动或点击操作，不要求触控目标。" },
];

const securityRows: DocRow[] = [
  { name: "Dependencies", value: "self-owned", description: "未使用 antd、antd-mobile、@ant-design/charts，也不依赖外部 SVG/Canvas 库。" },
  { name: "Content", value: "ReactNode", description: "label 由 React 渲染，不解析 HTML 字符串。" },
  { name: "Format", value: "escaped text", description: "format/formatValue 返回字符串时按 React 文本节点渲染，不使用 innerHTML。" },
  { name: "Values", value: "number normalize", description: "非有限数值和非法 max 会收敛到安全区间，不把 NaN/Infinity 输出到 ARIA。" },
  { name: "Side effects", value: "none", description: "组件无网络请求、计时回调或存储副作用；动画仅由 CSS 驱动。" },
];

const expertRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖确定进度、未知总量、状态、文本格式化、steps 和边界值；不承担导航步骤器职责。" },
  { name: "UI 专家", value: "PASS", description: "line、circle、dashboard 都遵循中性表面、细轨道、低干扰状态色；移动端示例可换行。" },
  { name: "研发专家", value: "PASS", description: "实现为自有 React + CSS + SVG，props 合同清晰，数值、steps 和 status alias 都在组件内部规范化。" },
  { name: "测试专家", value: "PASS", description: "文档示例覆盖正常值、超界、无效 max、indeterminate、line、circle、dashboard、steps 和 aria progressbar。" },
  { name: "白帽专家", value: "PASS", description: "无禁用依赖，无 HTML 解析，无外部副作用，ARIA 不泄露非法数值。" },
];

const gapRows: DocRow[] = [
  { name: "interactive steps", value: "out of scope", description: "steps 只表达进度分段，不提供可点击步骤导航或键盘 roving focus。" },
  { name: "multi-segment circle", value: "out of scope", description: "circle/dashboard 不提供多段配色、渐变或图表占比能力。" },
  { name: "theme tokens", value: "planned", description: "颜色和尺寸仍是内部设计规格，尚未开放统一 token override。" },
];

const faqItems = [
  { question: "Progress 和 Spin 怎么选择？", answer: "能知道完成比例时用 Progress；只知道正在等待、无法估计总量时用 Spin 或 indeterminate Progress。" },
  { question: "为什么 indeterminate 没有 aria-valuenow？", answer: "未知总量没有真实数值，输出 aria-valuenow 会让辅助技术误以为进度可量化。" },
  { question: "circle 是否依赖图表库？", answer: "不依赖。圆环由组件内 SVG circle 和 stroke-dashoffset 绘制。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo progress-doc-demo">
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

export function ProgressDoc({ showAnchors = false }: ProgressDocProps) {
  return (
    <TutorialScaffold component="Progress" kind="feedback" oneLineExample={`<Progress value={64} label="Upload progress" />`}>
    <section className="button-doc progress-doc" aria-labelledby="progress-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Progress 文档目录">
            {progressDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="progress-doc-title">{progressDocMeta.title}</h2>
            <p>
              用于展示任务完成比例和执行状态。当前 Progress 是自有 React 实现，覆盖线形、环形、确定进度、未知总量、状态、格式化文本和
              progressbar 语义。
            </p>
          </header>

          <section className="button-doc-section" id="progress-when" aria-labelledby="progress-when-title">
            <h3 id="progress-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>上传、下载、导出、批处理等任务需要展示完成比例。</li>
              <li>任务总量暂不可知，但需要告诉用户流程仍在推进。</li>
              <li>不要用 Progress 表达步骤导航、评分或静态占比图表。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="progress-demos" aria-labelledby="progress-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="progress-demos-title">代码演示</h3>
              <p>示例覆盖线形、环形、状态、文本、边界值、未知总量和 ARIA 可验收结构。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="progress-api" aria-labelledby="progress-api-title">
            <h3 id="progress-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="progress-semantic" aria-labelledby="progress-semantic-title">
            <h3 id="progress-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="progress-token" aria-labelledby="progress-token-title">
            <h3 id="progress-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="progress-a11y" aria-labelledby="progress-a11y-title">
            <h3 id="progress-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="progress-mobile" aria-labelledby="progress-mobile-title">
            <h3 id="progress-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="progress-security" aria-labelledby="progress-security-title">
            <h3 id="progress-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="progress-review" aria-labelledby="progress-review-title">
            <h3 id="progress-review-title">五专家结论</h3>
            <DataTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="progress-gaps" aria-labelledby="progress-gaps-title">
            <h3 id="progress-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>

          <section className="button-doc-section" id="progress-faq" aria-labelledby="progress-faq-title">
            <h3 id="progress-faq-title">FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article className="button-doc-faq__item" key={item.question}>
                  <h4>{item.question}</h4>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
