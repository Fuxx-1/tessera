import type { ReactNode } from "react";
import { BorderBeam, Button, Tag } from "../components/base";
import type { BorderBeamProps } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type BorderBeamDocProps = {
  showAnchors?: boolean;
};

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

export const borderBeamDocMeta = {
  title: "BorderBeam 边框流光",
  category: "基础组件",
  anchors: [
    { id: "border-beam-when", label: "何时使用" },
    { id: "border-beam-demos", label: "代码演示" },
    { id: "border-beam-api", label: "API" },
    { id: "border-beam-semantic", label: "Semantic DOM" },
    { id: "border-beam-token", label: "Design Token" },
    { id: "border-beam-a11y", label: "可访问性" },
    { id: "border-beam-mobile", label: "移动端" },
    { id: "border-beam-security", label: "安全" },
    { id: "border-beam-review", label: "五专家结论" },
    { id: "border-beam-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<div className="surface"><BorderBeam radius={8} tone="subtle" /><strong>Ready</strong></div>`;

function BeamPanel({
  beamProps,
  children,
  className,
  title,
}: {
  beamProps?: BorderBeamProps;
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <div className={`border-beam-doc-panel${className ? ` ${className}` : ""}`} aria-label={title}>
      <BorderBeam radius={8} tone="subtle" {...beamProps} />
      {children}
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "独立装饰层",
    description: "BorderBeam 作为绝对定位装饰层叠在普通容器内，宿主负责 position 和内容语义。",
    preview: (
      <BeamPanel title="独立装饰层预览">
        <div className="border-beam-doc-panel__content">
          <span className="demo-kicker">Deploy review</span>
          <strong>Ready for smoke</strong>
          <p>Use a restrained beam for a temporary review target or live region around a neutral surface.</p>
        </div>
      </BeamPanel>
    ),
    code: `<div className="surface">
  <BorderBeam radius={8} tone="subtle" />
  <strong>Ready for smoke</strong>
</div>`,
  },
  {
    title: "尺寸与节奏",
    description: "size 控制线宽，duration/delay 控制节奏；默认节奏偏慢，避免成为页面主视觉。",
    preview: (
      <div className="border-beam-doc-grid">
        <BeamPanel
          beamProps={{ duration: 4400, size: "sm", tone: "subtle" }}
          className="border-beam-doc-panel--compact"
          title="细线预览"
        >
          <span>Subtle</span>
        </BeamPanel>
        <BeamPanel
          beamProps={{ delay: 600, duration: 3200, size: "lg", tone: "contrast" }}
          className="border-beam-doc-panel--compact"
          title="高对比预览"
        >
          <span>Contrast</span>
        </BeamPanel>
      </div>
    ),
    code: `<BorderBeam size="sm" duration={4400} tone="subtle" />
<BorderBeam size="lg" delay={600} duration={3200} tone="contrast" />`,
  },
  {
    title: "状态组合",
    description: "组件不表达业务状态，状态文字仍由 Tag、文本或按钮自己承担，避免把视觉效果当语义。",
    preview: (
      <BeamPanel title="状态组合预览">
        <div className="border-beam-doc-panel__content">
          <div className="border-beam-doc-panel__row">
            <strong>Preview branch</strong>
            <Tag tone="neutral">active</Tag>
          </div>
          <p>Interactive children remain clickable because the beam never captures pointer events.</p>
          <Button size="sm">Open preview</Button>
        </div>
      </BeamPanel>
    ),
    code: `<div className="surface">
  <BorderBeam />
  <Tag tone="neutral">active</Tag>
  <Button size="sm">Open preview</Button>
</div>`,
  },
  {
    title: "移动端密度",
    description: "移动端示例使用更小内边距和 subtle tone；动画只放在必要的单个目标上。",
    preview: (
      <div className="border-beam-doc-phone" aria-label="移动端边框流光预览">
        <BorderBeam duration={4800} radius={10} size="sm" tone="subtle" />
        <div className="border-beam-doc-phone__bar" />
        <strong>Sync checkpoint</strong>
        <span>2 checks pending</span>
      </div>
    ),
    code: `<div className="mobile-surface">
  <BorderBeam size="sm" tone="subtle" duration={4800} radius={10} />
  <strong>Sync checkpoint</strong>
</div>`,
  },
];

const apiRows: DocRow[] = [
  { name: "size", value: '"sm" | "md" | "lg"', description: "控制边框光束线宽。默认 md；密集或移动端建议 sm。" },
  { name: "tone", value: '"neutral" | "subtle" | "contrast"', description: "控制中性视觉强度。默认 neutral，不提供彩色主题预设。" },
  { name: "duration", value: "number", description: "动画周期，单位毫秒。内部会转换为 CSS 时间并限制为非负值。" },
  { name: "delay", value: "number", description: "动画延迟，单位毫秒。用于多个区域错开，但不建议同时放置过多实例。" },
  { name: "paused", value: "boolean", description: "暂停动画并保留静态边界，适合宿主 hover、非活跃态或测试截图。" },
  { name: "radius", value: "number | string", description: "边框圆角。number 会按 px 处理，string 可传 token 值。" },
  { name: "inset", value: "number | string", description: "相对宿主容器内缩或外扩，number 会按 px 处理。" },
  { name: "color", value: "string", description: "可选主光束色。仅写入 CSS 变量，不拼接 style 文本。" },
  { name: "mutedColor", value: "string", description: "静态边框底色。建议保持低对比，避免页面出现多重点。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLSpanElement>", description: "继承 id、data-*、className、style 等 span 属性；children 被排除。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "span.c-border-beam", description: "装饰性 span，默认 aria-hidden=true，不参与可访问树。" },
  { name: "pseudo", value: ".c-border-beam::before", description: "绘制流动边框，不需要额外 DOM 节点。" },
  { name: "host", value: "consumer surface", description: "宿主容器应设置 position: relative，并承担标题、状态、按钮等真实语义。" },
  { name: "events", value: "pointer-events: none", description: "组件和伪元素不捕获鼠标、触摸或键盘交互。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-border-beam-size", value: "1px / 2px / 3px", description: "size 映射后的线宽。" },
  { name: "--c-border-beam-duration", value: "3600ms", description: "默认动画周期，保持慢速、低干扰。" },
  { name: "--c-border-beam-radius", value: "8px", description: "默认圆角，与基础卡片圆角上限一致但不绑定 Card。" },
  { name: "--c-border-beam-color", value: "neutral foreground alpha", description: "默认主光束色沿用黑灰中性前景，暗色主题可通过宿主 token 替换。" },
  { name: "--c-border-beam-muted-color", value: "neutral border alpha", description: "静态边线色用于 reduced motion 和空闲视觉，保持低透明边界。" },
  { name: "--c-border-beam-inset", value: "0px", description: "覆盖层 inset 值，方便宿主处理边界贴合。" },
  { name: "mask", value: "content-box clip", description: "流光只绘制在边框环内，圆角裁剪不进入内容区。" },
  {
    name: "主题 style",
    value: "--ct-border / neutral alpha",
    description: "beam 主色、muted 边线、contrast/subtle tone 均保持中性，不依赖彩色渐变；亮/暗主题由宿主覆盖 CSS 变量。",
  },
  {
    name: "结构 style",
    value: "absolute decorative span / mask / contain: paint",
    description: "定位、inset、radius、mask、pointer-events:none、reduced motion 和 paused 都是结构样式，不参与内容布局。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Reduced motion", value: "supported", description: "prefers-reduced-motion: reduce 下停止动画并保留静态边界。" },
  { name: "Pause", value: "paused", description: "paused=true 时使用 CSS 暂停，不卸载装饰层也不改变宿主内容。" },
  { name: "Meaning", value: "decorative", description: "不承载状态、警告或选择语义；需要语义时配合文本、Tag 或 ARIA 状态。" },
  { name: "Focus", value: "host controlled", description: "不创建可聚焦节点；焦点样式应由宿主交互控件负责。" },
  { name: "Screen reader", value: "aria-hidden", description: "默认隐藏，避免朗读出无意义装饰元素。" },
];

const mobileRows: DocRow[] = [
  { name: "Paint containment", value: "contain: paint", description: "限制装饰层绘制范围，降低移动端复合页面干扰。" },
  { name: "Pointer", value: "no capture", description: "触摸命中透传给宿主内容，不影响按钮、链接、输入控件。" },
  { name: "Density", value: "single target", description: "移动端建议一个视口内只强调一个区域，避免动画噪声和额外耗电。" },
  { name: "Fallback", value: "static border", description: "降级后仍保留边界识别，不依赖动画传达信息。" },
];

const securityRows: DocRow[] = [
  { name: "dangerouslySetInnerHTML", value: "never", description: "组件没有 HTML 注入入口，不解析字符串为 DOM。" },
  { name: "CSS input", value: "typed props", description: "尺寸、时间、颜色只进入 React style 对象和 CSS 变量，不拼接 style 标签。" },
  { name: "Dependencies", value: "none", description: "没有引入 antd、antd-mobile、@ant-design/charts 或任何新 UI 包。" },
  { name: "Pointer capture", value: "none", description: "不调用 pointer capture，不注册全局事件监听。" },
  { name: "ReactNode", value: "safe by boundary", description: "BorderBeam 不接收 children；文档示例内容以 ReactNode 渲染，不解析 HTML 字符串。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "定位为独立装饰组件，用于短期强调可审阅区域，不替代 Card、Tag 或状态组件。" },
  { name: "UI", value: "通过", description: "中性黑灰、低饱和、慢速动效，避免高彩流光和营销化装饰。" },
  { name: "研发", value: "通过", description: "React + CSS 自实现，API 面小，无外部 UI 依赖，导出和路由独立。" },
  { name: "测试", value: "通过", description: "验收关注 build、依赖扫描、文档路由 smoke、reduced motion 与移动端单实例性能。" },
  { name: "白帽", value: "通过", description: "无 HTML 注入、无脚本执行、无 pointer capture，CSS 变量来源受类型约束。" },
];

const gapRows: DocRow[] = [
  { name: "semantic status", value: "不支持", description: "BorderBeam 不表达成功、错误、选中或警告语义；请使用文本和状态组件。" },
  { name: "group choreography", value: "暂不支持", description: "多实例联动、路径编排和滚动触发需要另起专项评估性能与可访问性。" },
  { name: "Card integration", value: "不合并", description: "本组件文档独立维护，不把 Card 扩展成流光卡片。" },
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

export function BorderBeamDoc({ showAnchors = false }: BorderBeamDocProps) {
  return (
    <TutorialScaffold component="BorderBeam" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc border-beam-doc" aria-labelledby="border-beam-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="BorderBeam 文档目录">
            {borderBeamDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="border-beam-doc-title">{borderBeamDocMeta.title}</h2>
            <p>面向审阅、运行中和临时强调场景的独立边框装饰层。它只负责视觉，不承载内容语义，也不与 Card 文档合并。</p>
          </header>

          <section className="button-doc-section" id="border-beam-when" aria-labelledby="border-beam-when-title">
            <h3 id="border-beam-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要把注意力短时间引导到一个容器，例如预览区域、审阅目标、运行中的任务块。</li>
              <li>宿主容器已经有明确语义，BorderBeam 只提供低干扰边界强调。</li>
              <li>不要用它表达错误、成功或选中状态；这些状态需要文本和可访问语义。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="border-beam-demos" aria-labelledby="border-beam-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="border-beam-demos-title">代码演示</h3>
              <p>覆盖独立装饰层、尺寸节奏、状态组合和移动端密度。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="border-beam-api" aria-labelledby="border-beam-api-title">
            <h3 id="border-beam-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>
          <section className="button-doc-section" id="border-beam-semantic" aria-labelledby="border-beam-semantic-title">
            <h3 id="border-beam-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>
          <section className="button-doc-section" id="border-beam-token" aria-labelledby="border-beam-token-title">
            <h3 id="border-beam-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>
          <section className="button-doc-section" id="border-beam-a11y" aria-labelledby="border-beam-a11y-title">
            <h3 id="border-beam-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>
          <section className="button-doc-section" id="border-beam-mobile" aria-labelledby="border-beam-mobile-title">
            <h3 id="border-beam-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>
          <section className="button-doc-section" id="border-beam-security" aria-labelledby="border-beam-security-title">
            <h3 id="border-beam-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>
          <section className="button-doc-section" id="border-beam-review" aria-labelledby="border-beam-review-title">
            <h3 id="border-beam-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
          <section className="button-doc-section" id="border-beam-gaps" aria-labelledby="border-beam-gaps-title">
            <h3 id="border-beam-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
