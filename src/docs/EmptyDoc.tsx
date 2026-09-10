import type { ReactNode } from "react";
import { Button, Empty } from "../components/base";
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

export type EmptyDocProps = {
  showAnchors?: boolean;
};

export const emptyDocMeta = {
  title: "Empty 空状态",
  category: "数据展示",
  anchors: [
    { id: "empty-when", label: "何时使用" },
    { id: "empty-demos", label: "代码演示" },
    { id: "empty-api", label: "API" },
    { id: "empty-semantic", label: "Semantic DOM" },
    { id: "empty-token", label: "Design Token" },
    { id: "empty-a11y", label: "可访问性" },
    { id: "empty-mobile", label: "移动端" },
    { id: "empty-security", label: "安全" },
    { id: "empty-review", label: "五专家结论" },
    { id: "empty-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const customImage = (
  <span className="doc-empty-mark">
    <span />
    <span />
    <span />
  </span>
);

const demos: Demo[] = [
  {
    title: "一行验收",
    description: "标题、说明、操作和紧凑尺寸在一行卡片内可扫描，窄屏自动收敛。",
    preview: (
      <div className="empty-doc-one-line" aria-label="Empty single row acceptance example">
        <Empty size="sm" title="No invoices" description="Clear filters or create the first invoice." action={<Button size="sm">Clear filters</Button>} />
      </div>
    ),
    code: `<Empty size="sm" title="No invoices" description="Clear filters or create the first invoice." action={<Button size="sm">Clear filters</Button>} />`,
  },
  {
    title: "基础空状态",
    description: "默认 role=status，适合无数据、无结果或初始化为空。",
    preview: <Empty title="No deployments" description="Create a deployment to start tracking release status." action={<Button size="sm">Create</Button>} />,
    code: `<Empty title="No deployments" description="Create a deployment to start tracking release status." action={<Button size="sm">Create</Button>} />`,
  },
  {
    title: "状态语气",
    description: "status 只调整视觉语义，不把空状态提升为错误警报。",
    preview: (
      <div className="doc-empty-grid">
        <Empty size="sm" status="empty" title="No rows" description="The table has not received data." />
        <Empty size="sm" status="search" title="No matches" description="Try a shorter keyword." />
        <Empty size="sm" status="error" title="Unable to load" description="Refresh or check the source." />
      </div>
    ),
    code: `<Empty size="sm" status="empty" title="No rows" /> <Empty size="sm" status="search" title="No matches" /> <Empty size="sm" status="error" title="Unable to load" />`,
  },
  {
    title: "自定义图片",
    description: "image 插槽可传自有视觉；如果图片承载信息，传入 imageDescription。",
    preview: <Empty image={customImage} imageDescription="Three neutral stacked blocks" title="No saved views" description="Save a filter to reuse this workspace." />,
    code: `<Empty image={customImage} imageDescription="Three neutral stacked blocks" title="No saved views" />`,
  },
  {
    title: "密集区域",
    description: "size=sm 用于表格、列表、弹层或图表状态层，减少垂直占用。",
    preview: <Empty size="sm" title="No chart data" description="Select a wider date range." />,
    code: `<Empty size="sm" title="No chart data" description="Select a wider date range." />`,
  },
  {
    title: "ReactNode 边界",
    description: "description 和 action 支持 ReactNode；长文本与链接会换行，不撑破移动端。",
    preview: (
      <Empty
        size="sm"
        title={<span>Archived queue is empty</span>}
        description={(
          <span>
            No archived jobs matched <strong>release-validation-super-long-keyword-2026-06-08</strong>; adjust filters or open the runbook link.
          </span>
        )}
        action={<Button size="sm">Open runbook</Button>}
      />
    ),
    code: `<Empty size="sm" title={<span>Archived queue is empty</span>} description={<span>No archived jobs matched <strong>release-validation-super-long-keyword-2026-06-08</strong>; adjust filters.</span>} action={<Button size="sm">Open runbook</Button>} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title", value: "ReactNode", description: "空状态标题。默认 Empty。" },
  { name: "description", value: "ReactNode", description: "补充说明。默认 No data；传入 null 可隐藏；块级 ReactNode 不会被包进 p 标签。" },
  { name: "action", value: "ReactNode", description: "底部动作插槽，通常放 Button 或链接。" },
  { name: "size", value: '"sm" | "md"', description: "控制内边距和图形尺寸。默认 md。" },
  { name: "status", value: '"empty" | "search" | "error"', description: "视觉语气。默认 empty。" },
  { name: "image", value: "ReactNode", description: "自定义图片或图形插槽；未传时使用默认中性图形。" },
  { name: "imageDescription", value: "string", description: "自定义图片的可访问说明。未传时图片 aria-hidden。" },
  { name: "role", value: "HTMLAttributes role", description: "默认 status；可按业务语义降级为 presentation 或改为 region。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "透传 id、className、aria-*、data-* 等 div 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div[role=status]", description: "空状态是非紧急信息，默认用 status 语义。" },
  { name: "image", value: "aria-hidden / role=img", description: "默认装饰图隐藏；自定义图片提供 imageDescription 后会成为可读图片。" },
  { name: "content", value: "strong + div", description: "标题和说明分别渲染，description 可承载 ReactNode，便于读屏和视觉扫描。" },
  { name: "action", value: "ReactNode", description: "动作由调用方提供，组件不强制按钮或链接类型。" },
];

const tokenRows: DocRow[] = [
  { name: "text", value: "#1f1f1d", description: "标题文本颜色。" },
  { name: "textMuted", value: "#696967", description: "说明文字和整体弱化语气。" },
  { name: "surfaceSubtle", value: "#fbfbfa", description: "默认图形背景。" },
  { name: "border", value: "#dededb", description: "默认图形边框。" },
  { name: "radius", value: "8px", description: "图形容器圆角。" },
  { name: "maxWidth", value: "360px", description: "正文最大宽度，避免长句过宽。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Live region", value: "role=status", description: "空状态更新时可被辅助技术识别，但不会像错误一样打断用户。" },
  { name: "Action", value: "visible label", description: "动作按钮应使用明确动词，例如 Create、Clear filters、Retry。" },
  { name: "Image", value: "decorative by default", description: "默认图形不进入读屏；只有承载信息的图片才需要 imageDescription。" },
  { name: "Copy", value: "short title + useful description", description: "标题说明状态，描述给出下一步或原因。" },
  { name: "Color", value: "icon + copy", description: "search/error 视觉不只依赖颜色，标题和说明必须独立表达状态。" },
];

const mobileRows: DocRow[] = [
  { name: "Padding", value: "responsive", description: "窄屏下减少内边距，避免空状态占满整个视口。" },
  { name: "Action", value: "wrap", description: "动作区域允许换行，按钮不会挤压标题和说明。" },
  { name: "Text", value: "max-width: 360px", description: "正文保持短行，移动端自动收缩。" },
  { name: "Compact", value: "size=sm", description: "表格、列表和弹层内部使用紧凑图形与内边距，避免局部状态过重。" },
];

const securityRows: DocRow[] = [
  { name: "ReactNode", value: "safe boundary", description: "title、description、action 和 image 只接收 ReactNode，不解析 HTML 字符串。" },
  { name: "dangerouslySetInnerHTML", value: "never", description: "组件类型层面移除 HTML 注入入口，文档样例不使用原始 HTML。" },
  { name: "dependency", value: "self-owned", description: "Empty 不依赖 antd、antd-mobile、@ant-design/charts 或外部 UI 套件。" },
  { name: "remote assets", value: "caller owned", description: "默认图形纯 CSS；自定义 image 由调用方负责来源和替代说明。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖无数据、搜索无结果、轻量失败和下一步动作，不把 Empty 扩展成 Result 页面。" },
  { name: "UI 专家", value: "PASS", description: "默认图形、search/error 语气、紧凑尺寸和移动收缩统一，动作区可换行。" },
  { name: "研发专家", value: "PASS", description: "自有 React + CSS 实现，API 面聚焦 title/description/action/image/status/size，无外部 UI 依赖。" },
  { name: "测试专家", value: "PASS", description: "专项 smoke 覆盖 #empty 路由、独立锚点、图形/插画/action/description、compact/mobile、a11y 和一行样例。" },
  { name: "白帽专家", value: "PASS", description: "安全边界为 ReactNode，不执行 HTML、不访问网络、不引入远程资源；默认插画对读屏隐藏。" },
];

const faqItems = [
  { question: "Empty 是错误状态吗？", answer: "不是。Empty 默认是非紧急状态；加载失败可以用 status=error 变更视觉，但是否需要 Alert 取决于业务严重性。" },
  { question: "什么时候使用 action？", answer: "当用户有明确下一步时使用，例如创建、清除筛选或重试。纯展示型空状态可以不提供 action。" },
  { question: "可以放复杂插画吗？", answer: "可以通过 image 传入，但应保持轻量、自有、可响应，不依赖外部 UI 套件或远程资源。" },
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

export function EmptyDoc({ showAnchors = false }: EmptyDocProps) {
  return (
    <TutorialScaffold component="Empty" kind="display" oneLineExample={`<Empty title="No results" action={<Button>Reset</Button>} />`}>
    <section className="button-doc empty-doc" aria-labelledby="empty-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Empty 文档目录">
            {emptyDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="empty-doc-title">{emptyDocMeta.title}</h2>
            <p>用于在无数据、无搜索结果或轻量失败时提供可读状态和下一步动作。EmptyDoc 独立维护，不合并 Result 文档；当前 Empty 覆盖 icon/illustration、description、action、compact、mobile 和安全 ReactNode 边界。</p>
          </header>

          <section className="button-doc-section" id="empty-when" aria-labelledby="empty-when-title">
            <h3 id="empty-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>列表、表格、图表或面板没有可展示内容时使用。</li>
              <li>搜索无结果时说明原因并提供清除筛选或调整条件的动作。</li>
              <li>不要用 Empty 替代骨架屏、加载中、全页错误或权限拒绝页面。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="empty-demos" aria-labelledby="empty-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="empty-demos-title">代码演示</h3>
              <p>示例覆盖一行验收、基础、状态、图片插槽、密集尺寸和 action。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="empty-api" aria-labelledby="empty-api-title">
            <h3 id="empty-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="empty-semantic" aria-labelledby="empty-semantic-title">
            <h3 id="empty-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="empty-token" aria-labelledby="empty-token-title">
            <h3 id="empty-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="empty-a11y" aria-labelledby="empty-a11y-title">
            <h3 id="empty-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="empty-mobile" aria-labelledby="empty-mobile-title">
            <h3 id="empty-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="empty-security" aria-labelledby="empty-security-title">
            <h3 id="empty-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="empty-review" aria-labelledby="empty-review-title">
            <h3 id="empty-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="empty-faq" aria-labelledby="empty-faq-title">
            <h3 id="empty-faq-title">FAQ</h3>
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
