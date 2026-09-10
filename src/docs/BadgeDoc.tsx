import type { ReactNode } from "react";
import { Badge, Button, Card } from "../components/base";
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

export type BadgeDocProps = {
  showAnchors?: boolean;
};

export const badgeDocMeta = {
  title: "Badge 徽标数",
  category: "基础组件",
  anchors: [
    { id: "badge-when", label: "何时使用" },
    { id: "badge-demos", label: "代码演示" },
    { id: "badge-api", label: "API" },
    { id: "badge-ribbon-api", label: "Ribbon API" },
    { id: "badge-semantic", label: "Semantic DOM" },
    { id: "badge-token", label: "Design Token" },
    { id: "badge-a11y", label: "可访问性" },
    { id: "badge-mobile", label: "移动端" },
    { id: "badge-review", label: "专家复核" },
    { id: "badge-coverage", label: "覆盖范围" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "计数徽标",
    description: "覆盖普通计数、封顶计数和 0 值展示。默认 0 不显示，showZero 可显式展示。",
    preview: (
      <div className="doc-demo-row">
        <Badge count={8} ariaLabel="8 unread updates">
          <Button>Inbox</Button>
        </Badge>
        <Badge count={132} maxCount={99} status="error" ariaLabel="99 plus alerts">
          <Button variant="ghost">Alerts</Button>
        </Badge>
        <Badge count={1200} overflowCount={999} status="warning" ariaLabel="999 plus queued jobs">
          <Button>Queue</Button>
        </Badge>
        <Badge count={0} showZero ariaLabel="0 pending reviews">
          <Button>Reviews</Button>
        </Badge>
      </div>
    ),
    code: `<Badge count={8} ariaLabel="8 unread updates"><Button>Inbox</Button></Badge> <Badge count={132} maxCount={99} status="error" ariaLabel="99 plus alerts"><Button variant="ghost">Alerts</Button></Badge> <Badge count={1200} overflowCount={999} status="warning" ariaLabel="999 plus queued jobs"><Button>Queue</Button></Badge> <Badge count={0} showZero ariaLabel="0 pending reviews"><Button>Reviews</Button></Badge>`,
  },
  {
    title: "点状提醒",
    description: "dot 用于无需展示数字的提醒，配合 ariaLabel 给屏幕阅读器提供状态名称。",
    preview: (
      <div className="doc-demo-row">
        <Badge dot status="processing" ariaLabel="Syncing">
          <Card title="Sync" description="Background task">
            <span className="badge-doc-pill">queued</span>
          </Card>
        </Badge>
        <Badge dot status="success" ariaLabel="Online">
          <span className="badge-doc-pill badge-doc-pill--success">worker-1</span>
        </Badge>
      </div>
    ),
    code: `<Badge dot status="processing" ariaLabel="Syncing"><Card title="Sync" /></Badge> <Badge dot status="success" ariaLabel="Online"><span>worker-1</span></Badge>`,
  },
  {
    title: "状态文本",
    description: "没有 children 时 Badge 渲染为状态点和文本，适合列表、表格和属性面板里的状态展示。",
    preview: (
      <div className="doc-demo-row">
        <Badge status="success" text="Ready" />
        <Badge status="warning" text="Needs review" />
        <Badge status="error" text="Blocked" />
        <Badge status="processing" text="Running" size="md" />
      </div>
    ),
    code: `<Badge status="success" text="Ready" /> <Badge status="warning" text="Needs review" /> <Badge status="error" text="Blocked" /> <Badge status="processing" text="Running" size="md" />`,
  },
  {
    title: "独立徽标与安全文本",
    description: "无 children 的 count 渲染为独立计数徽标；长状态文本可收缩，自定义 ReactNode 由 React 转义。",
    preview: (
      <div className="doc-demo-row">
        <Badge count={123456} overflowCount={9999} status="error" ariaLabel="9999 plus critical notifications" />
        <Badge status="warning" text="Review queue with an unusually long status label that should truncate safely" />
        <Badge status="success" text="<img src=x onerror=alert(1)> escaped" />
      </div>
    ),
    code: `<Badge count={123456} overflowCount={9999} status="error" ariaLabel="9999 plus critical notifications" /> <Badge status="warning" text="Review queue with an unusually long status label that should truncate safely" /> <Badge status="success" text="<img src=x onerror=alert(1)> escaped" />`,
  },
  {
    title: "行内布局",
    description: "inline 将徽标放回文档流，避免在表格单元格和移动端窄容器中产生溢出。",
    preview: (
      <div className="doc-demo-row">
        <Badge inline count={24} status="warning" ariaLabel="24 delayed jobs">
          <span>Delayed jobs</span>
        </Badge>
        <Badge inline dot status="error" ariaLabel="Service incident">
          <span>Service incident</span>
        </Badge>
      </div>
    ),
    code: `<Badge inline count={24} status="warning" ariaLabel="24 delayed jobs">Delayed jobs</Badge> <Badge inline dot status="error" ariaLabel="Service incident">Service incident</Badge>`,
  },
  {
    title: "偏移与角标",
    description: "offset 调整 marker 相对目标的位置；Ribbon 用于卡片角标，不改变卡片本身语义。",
    preview: (
      <div className="doc-demo-row">
        <Badge count={5} offset={[-6, 6]} status="success" ariaLabel="5 new deploy notes">
          <Button>Deploy</Button>
        </Badge>
        <Badge.Ribbon text="Beta" status="processing" ariaLabel="Beta feature">
          <Card title="Release channel" description="Public preview">
            <span className="badge-doc-card-line">Feature cohort: preview</span>
          </Card>
        </Badge.Ribbon>
      </div>
    ),
    code: `<Badge count={5} offset={[-6, 6]} status="success" ariaLabel="5 new deploy notes"><Button>Deploy</Button></Badge> <Badge.Ribbon text="Beta" status="processing" ariaLabel="Beta feature"><Card title="Release channel" /></Badge.Ribbon>`,
  },
];

const apiRows: DocRow[] = [
  { name: "count", value: "ReactNode", description: "徽标计数。数字会参与 maxCount 封顶，非数字内容原样渲染。" },
  { name: "maxCount", value: "number", description: "数字计数超过上限时显示为 n+。默认值为 99。" },
  { name: "overflowCount", value: "number", description: "maxCount 的兼容别名；两者同时存在时优先 overflowCount。" },
  { name: "showZero", value: "boolean", description: "为 true 时展示 count={0}；默认 false。" },
  { name: "dot", value: "boolean", description: "展示点状徽标，不渲染 count 文本。" },
  { name: "status", value: '"default" | "success" | "warning" | "error" | "processing"', description: "控制徽标或状态点颜色。" },
  { name: "text", value: "ReactNode", description: "无 children 时渲染状态文字，常用于列表状态。" },
  { name: "size", value: '"sm" | "md"', description: "控制徽标和状态点尺寸。默认 sm。" },
  { name: "inline", value: "boolean", description: "有 children 时将 marker 放入文档流，适合移动端或密集表格。" },
  { name: "offset", value: "number | string | [x, y]", description: "有 children 且非 inline 时调整 marker 偏移；数字按 px 处理。" },
  { name: "hidden", value: "boolean", description: "隐藏 marker，但保留外层元素和 children。" },
  { name: "ariaLabel", value: "string", description: "为 dot、自定义 count 或业务化数字提供可访问名称。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLSpanElement>", description: "透传 span 原生属性，例如 id、title、data-*。" },
];

const ribbonRows: DocRow[] = [
  { name: "Badge.Ribbon", value: "compound", description: "包裹卡片或面板并在右上角或左上角展示角标。" },
  { name: "text", value: "ReactNode", description: "角标内容，建议保持短文本。" },
  { name: "placement", value: '"start" | "end"', description: "角标位置。默认 end。" },
  { name: "status", value: "BadgeStatus", description: "复用 Badge 状态色。" },
  { name: "ariaLabel", value: "string", description: "需要向辅助技术宣布角标业务含义时传入。" },
];

const semanticRows: DocRow[] = [
  { name: "root with children", value: "span.c-badge", description: "包装目标内容并相对定位 marker。" },
  { name: "standalone count", value: "span.c-badge.c-badge--standalone", description: "无 children 且传入 count/dot 时仍渲染徽标 marker，不退化为状态文本。" },
  { name: "marker", value: "span.c-badge__marker", description: "数字或点状提醒。存在 ariaLabel 时使用 role=status 让变化可被宣布。" },
  { name: "status root", value: "span.c-badge-status", description: "无 children 的状态展示根节点。" },
  { name: "status dot", value: "span.c-badge-status__dot", description: "状态点。带 text 时作为视觉装饰；无 text 时可通过 ariaLabel 暴露。" },
  { name: "ribbon root", value: "div.c-badge-ribbon", description: "角标容器只提供视觉定位，不接管被包裹内容的语义。" },
  { name: "ribbon label", value: "span.c-badge-ribbon__label", description: "有 ariaLabel 时可作为轻量 status 宣告。" },
];

const tokenRows: DocRow[] = [
  { name: "default", value: "#111110 / #8a8a86", description: "计数徽标默认反色背景，状态点默认中性灰。" },
  { name: "success", value: "#2f6d4a", description: "成功、在线、已完成状态。" },
  { name: "warning", value: "#8a6724", description: "延迟、待处理、需要关注状态。" },
  { name: "error", value: "#8a3434", description: "阻塞、失败、异常状态。" },
  { name: "processing", value: "#4d5f77", description: "运行中、同步中、处理中状态。" },
  { name: "readability", value: "light / dark", description: "浅色和暗色媒介下保持徽标文字、状态文本与角标可读。" },
  { name: "radius", value: "999px / 4px", description: "计数徽标使用胶囊，Ribbon 使用紧凑角标圆角。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Count name", value: "ariaLabel", description: "业务计数建议传入完整语义，例如 8 unread updates，而不是只读数字。" },
  { name: "Decorative marker", value: "aria-hidden", description: "没有可宣布名称的自定义 marker 会被隐藏，避免读出无意义结构。" },
  { name: "Live status", value: "role=status", description: "有 ariaLabel 的 marker 使用 status 语义，适合轻量状态更新。" },
  { name: "No focus", value: "non-interactive", description: "Badge 本身不可聚焦；交互应放在 children 里的按钮、链接或卡片上。" },
  { name: "ReactNode safety", value: "no HTML parsing", description: "count、text 和 Ribbon text 均作为 ReactNode 渲染，不使用 dangerouslySetInnerHTML。" },
];

const mobileRows: DocRow[] = [
  { name: "Overflow", value: "max-width: 100%", description: "360/390/430 下状态文本和长业务词会省略或换行，避免撑破容器。" },
  { name: "Inline mode", value: "inline", description: "窄屏列表或表格推荐 inline，减少绝对定位徽标被裁切的风险。" },
  { name: "Touch target", value: "children owns target", description: "Badge 不扩大点击区域；移动端触摸尺寸由被包裹的 Button 或链接负责。" },
  { name: "Ribbon", value: "overflow visible", description: "角标不制造页面横向滚动，卡片内容仍按自身布局收缩。" },
  { name: "Clipping", value: "visible marker", description: "计数、点状和独立徽标在窄屏不被页面容器裁切。" },
];

const coverageRows: DocRow[] = [
  { name: "已覆盖", value: "count / dot / status / overflow / offset / ribbon", description: "满足状态、计数、提醒、封顶、偏移和角标展示。" },
  { name: "不支持", value: "animated count", description: "暂不提供数字滚动动画，避免增加不必要的动效和渲染成本。" },
  { name: "组合关系", value: "Button / Card / Table / custom node", description: "Badge 可包裹任意 ReactNode，但交互语义由子组件承担。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "计数、点状提醒、状态文本、独立徽标、封顶、偏移和 Ribbon 覆盖常用生产场景。" },
  { name: "UI 专家", value: "通过", description: "桌面与 360/390/430 移动宽度保持一行示例横向滚动，不挤压宿主内容，暗浅色均可读。" },
  { name: "研发专家", value: "通过", description: "无外部 UI 依赖，API 兼容 maxCount 与 overflowCount，SSR 不读取 window，Ribbon 作为复合子组件导出。" },
  { name: "测试专家", value: "通过", description: "验收覆盖 count、dot、status、overflow、offset、ribbon、standalone、mobile、a11y 和无未定义字样。" },
  { name: "白帽专家", value: "通过", description: "不使用 dangerouslySetInnerHTML，ReactNode 内容由 React 转义，Badge 不接管交互焦点。" },
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

export function BadgeDoc({ showAnchors = false }: BadgeDocProps) {
  return (
    <TutorialScaffold component="Badge" kind="display" oneLineExample={`<Badge count={8}><Button>Inbox</Button></Badge>`}>
    <section className="button-doc badge-doc" aria-labelledby="badge-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Badge 文档目录">
            {badgeDocMeta.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>)}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="badge-doc-title">{badgeDocMeta.title}</h2>
            <p>用于在目标旁展示数量、提醒点或状态文本。Badge 保持非交互语义，交互职责由被包裹的组件承担。</p>
          </header>

          <section className="button-doc-section" id="badge-when" aria-labelledby="badge-when-title">
            <h3 id="badge-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在按钮、卡片、标签或列表项旁提示未读数、异常数或更新数时使用。</li>
              <li>只需要表达状态而不是数量时，使用 dot 或 text 状态模式。</li>
              <li>不要把 Badge 当按钮使用；点击、焦点和键盘行为应放在 children 组件上。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="badge-demos" aria-labelledby="badge-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="badge-demos-title">代码演示</h3>
              <p>示例覆盖计数、封顶、点状提醒、状态文本、行内布局和移动端友好的组合方式。</p>
            </div>
            <div className="button-doc-demo-grid">{demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}</div>
          </section>

          <section className="button-doc-section" id="badge-api" aria-labelledby="badge-api-title"><h3 id="badge-api-title">API</h3><DataTable rows={apiRows} /></section>
          <section className="button-doc-section" id="badge-ribbon-api" aria-labelledby="badge-ribbon-api-title"><h3 id="badge-ribbon-api-title">Ribbon API</h3><DataTable rows={ribbonRows} /></section>
          <section className="button-doc-section" id="badge-semantic" aria-labelledby="badge-semantic-title"><h3 id="badge-semantic-title">Semantic DOM</h3><DataTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="badge-token" aria-labelledby="badge-token-title"><h3 id="badge-token-title">Design Token</h3><DataTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="badge-a11y" aria-labelledby="badge-a11y-title"><h3 id="badge-a11y-title">可访问性</h3><DataTable rows={accessibilityRows} /></section>
          <section className="button-doc-section" id="badge-mobile" aria-labelledby="badge-mobile-title"><h3 id="badge-mobile-title">移动端</h3><DataTable rows={mobileRows} /></section>
          <section className="button-doc-section" id="badge-review" aria-labelledby="badge-review-title"><h3 id="badge-review-title">专家复核</h3><DataTable rows={reviewRows} /></section>
          <section className="button-doc-section" id="badge-coverage" aria-labelledby="badge-coverage-title"><h3 id="badge-coverage-title">覆盖范围</h3><DataTable rows={coverageRows} /></section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
