import type { ReactNode } from "react";
import { Button, Icon, iconNames, type IconName } from "../components/base";
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

export type IconDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Icon decorative name="search" size="md" />`;

export const iconDocMeta = {
  title: "Icon 图标",
  category: "基础组件",
  anchors: [
    { id: "icon-when", label: "何时使用" },
    { id: "icon-demos", label: "代码演示" },
    { id: "icon-registry", label: "Registry" },
    { id: "icon-api", label: "API" },
    { id: "icon-semantic", label: "Semantic DOM" },
    { id: "icon-token", label: "Design Token" },
    { id: "icon-a11y", label: "可访问性" },
    { id: "icon-mobile", label: "移动端" },
    { id: "icon-security", label: "安全" },
    { id: "icon-review", label: "专家结论" },
    { id: "icon-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const namedIcons: IconName[] = ["search", "filter", "settings", "check", "alert", "download", "user", "more"];

const demos: Demo[] = [
  {
    title: "白名单图标",
    description: "name 只能来自本地 iconRegistry，调用方不能传任意 SVG 字符串。",
    preview: (
      <div className="doc-demo-row doc-demo-row--single-line">
        {namedIcons.map((name) => (
          <span className="icon-doc-swatch" key={name}>
            <Icon decorative name={name} />
            <span>{name}</span>
          </span>
        ))}
      </div>
    ),
    code: `<Icon decorative name="search" /> <Icon decorative name="filter" /> <Icon decorative name="settings" />`,
  },
  {
    title: "尺寸",
    description: "内置 sm、md、lg 三档；数字尺寸会被转换为 CSS 变量，并限制最小 8px。",
    preview: (
      <div className="doc-demo-row doc-demo-row--single-line">
        <Icon name="search" size="sm" title="Small search" />
        <Icon name="search" size="md" title="Medium search" />
        <Icon name="search" size="lg" title="Large search" />
        <Icon name="search" size={32} title="Custom search" />
      </div>
    ),
    code: `<Icon name="search" size="sm" title="Small search" /> <Icon name="search" size="md" title="Medium search" /> <Icon name="search" size="lg" title="Large search" /> <Icon name="search" size={32} title="Custom search" />`,
  },
  {
    title: "Tone",
    description: "默认继承宿主 currentColor；显式 tone 只改变颜色，状态语义仍需文本或宿主控件说明。",
    preview: (
      <div className="doc-demo-row doc-demo-row--single-line">
        <Icon name="info" title="Inherited information" />
        <Icon name="info" title="Muted information" tone="muted" />
        <Icon name="check" title="Success" tone="success" />
        <Icon name="alert" title="Warning" tone="warning" />
        <Icon name="close" title="Danger" tone="danger" />
      </div>
    ),
    code: `<Icon name="info" title="Inherited information" /> <Icon name="check" title="Success" tone="success" /> <Icon name="alert" title="Warning" tone="warning" /> <Icon name="close" title="Danger" tone="danger" />`,
  },
  {
    title: "颜色继承与深浅底",
    description: "未传 tone 的图标跟随父级文字颜色，深色底与浅色底都不需要额外覆盖。",
    preview: (
      <div className="icon-doc-contrast-row">
        <span className="icon-doc-tone-chip icon-doc-tone-chip--light"><Icon decorative name="search" /> Light inherit</span>
        <span className="icon-doc-tone-chip icon-doc-tone-chip--dark"><Icon decorative name="check" /> Dark inherit</span>
        <span className="icon-doc-tone-chip icon-doc-tone-chip--accent"><Icon decorative name="download" /> Accent inherit</span>
      </div>
    ),
    code: `<span className="icon-doc-tone-chip--dark"><Icon decorative name="check" /> Dark inherit</span>`,
  },
  {
    title: "装饰与可读名称",
    description: "装饰图标对辅助技术隐藏；承担含义的图标必须传 title，或显式 decorative={false} 后传 aria-label。",
    preview: (
      <div className="doc-demo-stack">
        <p className="icon-doc-inline">
          <Icon decorative name="calendar" /> 2026-06-07 评审窗口
        </p>
        <p className="icon-doc-inline">
          <Icon name="alert" title="Blocked" tone="warning" /> 缺少白名单登记的图标不得进入发布。
        </p>
        <p className="icon-doc-inline">
          <Icon aria-label="Download report" decorative={false} name="download" tone="accent" /> aria-label 语义图标
        </p>
      </div>
    ),
    code: `<Icon decorative name="calendar" /> 2026-06-07 <Icon name="alert" title="Blocked" tone="warning" /> <Icon aria-label="Download report" decorative={false} name="download" />`,
  },
  {
    title: "一行与按钮内对齐",
    description: "Icon 保持固定盒模型、currentColor 和 flex-shrink:0；在文本行与 Button 内都不改变控件高度。",
    preview: (
      <div className="doc-demo-stack">
        <p className="icon-doc-inline icon-doc-inline--single">
          <Icon decorative name="check" tone="success" /> Release checklist passed in one readable line.
        </p>
        <div className="icon-doc-button-row">
          <Button size="sm"><Icon decorative name="download" /> Export</Button>
          <Button><Icon decorative name="search" /> Search</Button>
          <Button variant="ghost"><Icon decorative name="external-link" /> Open</Button>
        </div>
      </div>
    ),
    code: `<Icon decorative name="check" tone="success" /> Release checklist passed. <Button><Icon decorative name="search" /> Search</Button>`,
  },
];

const registryRows: DocRow[] = [
  {
    name: "iconNames",
    value: iconNames.join(", "),
    description: "当前允许渲染的图标名称。新增图标必须进入该 registry 并经过评审。",
  },
  {
    name: "iconRegistry",
    value: "Record<IconName, IconDefinition>",
    description: "只保存 viewBox 与 path d，不保存外部 SVG、HTML、事件属性、style 字符串或脚本。",
  },
  {
    name: "isIconName(value)",
    value: "value is IconName",
    description: "给动态配置使用的类型守卫；未命中白名单时由宿主选择 fallback，不渲染未知 SVG。",
  },
];

const apiRows: DocRow[] = [
  { name: "name", value: "IconName", description: "必填。只能是本地 registry 中的安全白名单名称。" },
  { name: "size", value: '"sm" | "md" | "lg" | number', description: "图标尺寸。数字会写入 --icon-size，最小值限制为 8px。" },
  { name: "tone", value: '"neutral" | "muted" | "accent" | "success" | "warning" | "danger"', description: "可选中性和状态色入口；不传时继承 currentColor，不承载业务状态本身。" },
  { name: "title", value: "string", description: "非装饰图标的可访问名称，会渲染为 svg 内部 title。" },
  { name: "aria-label", value: "string", description: "仅在 decorative={false} 且没有 title 时作为可访问名称。" },
  { name: "decorative", value: "boolean", description: "true 时设置 aria-hidden；默认在没有 title 时视为装饰图标。" },
  { name: "SVG props", value: "Omit<SVGAttributes, children | dangerouslySetInnerHTML>", description: "允许受控 SVG 原生属性，但禁止 children 和 dangerouslySetInnerHTML。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "svg.c-icon", description: "固定 viewBox=0 0 24 24，path 来自 registry。" },
  { name: "meaningful", value: 'role="img" + title/aria-label', description: "图标本身传达信息时暴露图像语义；aria-label 路径需 decorative={false}。" },
  { name: "decorative", value: 'aria-hidden="true"', description: "装饰图标不进入辅助技术读序，语义由相邻文本承担。" },
];

const tokenRows: DocRow[] = [
  { name: "--icon-size", value: "16px / 20px / 24px / custom", description: "尺寸通过 CSS 变量稳定控制，避免行内图标撑开布局。" },
  { name: "color", value: "currentColor + optional tone class", description: "默认继承文本颜色；tone class 提供有限状态色。" },
  { name: "stroke", value: "1.8 round", description: "线性图标统一描边、端点和连接样式，保证小尺寸清晰。" },
  {
    name: "主题 style",
    value: "currentColor / --ct-text-* / status token",
    description: "图标默认继承宿主文本色，muted/status tone 读取 --ct-* 语义 token；亮/暗主题由宿主边界自然切换。",
  },
  {
    name: "结构 style",
    value: "inline-flex svg / fixed viewBox / no layout shift",
    description: "尺寸、描边、viewBox、aria-hidden/title 和 min-width 控制在 SVG class 内，移动端作为文本图形不制造额外 overflow。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "decorative", value: "默认安全", description: "没有 title 时默认隐藏，避免屏幕阅读器朗读无意义的 SVG。" },
  { name: "title", value: "必要时提供", description: "当图标单独表达状态或对象时必须提供 title，或显式 decorative={false} 后提供 aria-label。" },
  { name: "not color-only", value: "宿主责任", description: "tone 不能作为唯一状态表达；需配合文本、Badge、Alert 或按钮 label。" },
];

const mobileRows: DocRow[] = [
  { name: "readability", value: "16px min", description: "内置最小 sm 为 16px，数字尺寸也限制不低于 8px；移动端正文建议 md 起步。" },
  { name: "touch", value: "IconButton/Button", description: "Icon 本身不扩大触控区；可点击图标必须放入 IconButton 或 Button，图标在按钮内居中对齐。" },
  { name: "wrapping", value: "inline-flex safe", description: "文档示例使用可换行容器；一行示例和长 registry 名称在窄屏不会横向溢出。" },
];

const securityRows: DocRow[] = [
  { name: "no external library", value: "self-owned", description: "不使用 antd、antd-mobile、@ant-design/icons、lucide-react 或其它 UI icon 库。" },
  { name: "no raw SVG", value: "registry only", description: "调用方不能传 svg path、HTML 字符串、children 或 dangerouslySetInnerHTML。" },
  { name: "path whitelist", value: "hardcoded d", description: "新增 path 需要代码评审；registry 不读取远程资产或用户输入。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "Icon 只负责符号表达，交互入口仍由 Button/IconButton 承担，边界清晰。" },
  { name: "UI 专家", value: "PASS", description: "尺寸、继承色、显式 tone 和线性描边统一；浅色与深色底场景保持可读。" },
  { name: "研发专家", value: "PASS", description: "类型从 registry 推导，导出 iconNames/isIconName 支持动态配置安全 fallback。" },
  { name: "测试专家", value: "PASS", description: "#icon smoke 覆盖 desktop 与 360/390/430，检查装饰/语义、尺寸、颜色继承、无溢出和无空值字面量。" },
  { name: "白帽专家", value: "PASS", description: "无外部 UI icon 库，无 raw SVG/children/innerHTML 入口，路径来源固定白名单。" },
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

export function IconDoc({ showAnchors = false }: IconDocProps) {
  return (
    <TutorialScaffold component="Icon" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc icon-doc" aria-labelledby="icon-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Icon 文档目录">
            {iconDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="icon-doc-title">{iconDocMeta.title}</h2>
            <p>
              用于渲染自有 SVG 符号。Icon 是独立视觉基础组件，不提供点击、tooltip 或 pressed
              状态；可交互图标请组合 IconButton，并继续在 IconButton 文档中验收。
            </p>
          </header>

          <section className="button-doc-section" id="icon-when" aria-labelledby="icon-when-title">
            <h3 id="icon-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于状态、对象、动作前缀和信息层级辅助，不把图标当作唯一说明。</li>
              <li>静态或行内图标使用 Icon；图标按钮、工具栏按钮和可点击图标使用 IconButton。</li>
              <li>需要新增图形时先进入 path registry 白名单，不从外部 UI icon 包复制运行时依赖。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="icon-demos" aria-labelledby="icon-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="icon-demos-title">代码演示</h3>
              <p>示例覆盖白名单、尺寸、tone、装饰隐藏和非装饰可访问名称。</p>
            </div>
            <div className="button-doc-demo-grid">{demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}</div>
          </section>

          <section className="button-doc-section" id="icon-registry" aria-labelledby="icon-registry-title"><h3 id="icon-registry-title">Registry</h3><DataTable rows={registryRows} /></section>
          <section className="button-doc-section" id="icon-api" aria-labelledby="icon-api-title"><h3 id="icon-api-title">API</h3><DataTable rows={apiRows} /></section>
          <section className="button-doc-section" id="icon-semantic" aria-labelledby="icon-semantic-title"><h3 id="icon-semantic-title">Semantic DOM</h3><DataTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="icon-token" aria-labelledby="icon-token-title"><h3 id="icon-token-title">Design Token</h3><DataTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="icon-a11y" aria-labelledby="icon-a11y-title"><h3 id="icon-a11y-title">可访问性</h3><DataTable rows={accessibilityRows} /></section>
          <section className="button-doc-section" id="icon-mobile" aria-labelledby="icon-mobile-title"><h3 id="icon-mobile-title">移动端</h3><DataTable rows={mobileRows} /></section>
          <section className="button-doc-section" id="icon-security" aria-labelledby="icon-security-title"><h3 id="icon-security-title">安全</h3><DataTable rows={securityRows} /></section>
          <section className="button-doc-section" id="icon-review" aria-labelledby="icon-review-title"><h3 id="icon-review-title">专家结论</h3><DataTable rows={reviewRows} /></section>

          <section className="button-doc-section" id="icon-gaps" aria-labelledby="icon-gaps-title">
            <h3 id="icon-gaps-title">缺口</h3>
            <p>
              当前不支持外部 symbol sprite、双色图标、动画图标和运行时 path 注入。新增图标需要扩展 registry、
              补充文档示例，并通过构建、依赖扫描和移动端无溢出验收。
            </p>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
