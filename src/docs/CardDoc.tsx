import type { ReactNode } from "react";
import { Button, Card, Tag } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type CardDocProps = {
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

export const cardDocMeta = {
  title: "Card 卡片",
  category: "数据展示",
  anchors: [
    { id: "card-when", label: "何时使用" },
    { id: "card-demos", label: "代码演示" },
    { id: "card-api", label: "API" },
    { id: "card-semantic", label: "Semantic DOM" },
    { id: "card-composition", label: "组合边界" },
    { id: "card-mobile", label: "Mobile" },
    { id: "card-review", label: "五视角复核" },
    { id: "card-token", label: "Design Token" },
    { id: "card-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "标题与描述",
    description: "Card 自动把标题和描述关联到 section，适合独立内容块或列表中的重复项。",
    preview: (
      <Card title="Build health" description="Last checked 2 minutes ago">
        <div className="card-doc-stack">
          <strong>All checks passed</strong>
          <span>TypeScript, Vite build, and docs smoke are green.</span>
        </div>
      </Card>
    ),
    code: `<Card title="Build health" description="Last checked 2 minutes ago"><strong>All checks passed</strong><span>TypeScript, Vite build, and docs smoke are green.</span></Card>`,
  },
  {
    title: "操作区",
    description: "extra 放标题补充状态，actions 用于局部命令；小屏会自然换行并拉伸按钮。",
    preview: (
      <Card
        title="Release draft"
        description="Ready for reviewer handoff"
        extra={<Tag tone="info">Review</Tag>}
        actions={
          <>
            <Button size="sm" variant="ghost">
              Archive
            </Button>
            <Button size="sm" variant="solid">
              Submit
            </Button>
          </>
        }
      >
        <div className="card-doc-stack">
          <span>2 changed files</span>
          <span>Docs and component implementation updated together.</span>
        </div>
      </Card>
    ),
    code: `<Card title="Release draft" description="Ready for reviewer handoff" extra={<Tag tone="info">Review</Tag>} actions={<><Button size="sm" variant="ghost">Archive</Button><Button size="sm" variant="solid">Submit</Button></>}><span>2 changed files</span></Card>`,
  },
  {
    title: "封面与悬停",
    description: "cover 承载媒体或状态画面；hoverable 只用于可点击或可进入详情的卡片。",
    preview: (
      <Card
        hoverable
        title="Workspace snapshot"
        description="Cover with subtle hover affordance"
        cover={
          <img src="/image-demo-workspace.svg" alt="Workspace snapshot cover" />
        }
      >
        <div className="card-doc-stack">
          <strong>Review queue</strong>
          <span>Cover, header, body, and hover state stay within one card surface.</span>
        </div>
      </Card>
    ),
    code: `<Card hoverable title="Workspace snapshot" description="Cover with subtle hover affordance" cover={<img src="/image-demo-workspace.svg" alt="" />}><strong>Review queue</strong></Card>`,
  },
  {
    title: "列表承载",
    description: "padding=\"none\" 用于列表、表格、图表等已经自带留白的内容；footer 承载汇总或次级命令。",
    preview: (
      <Card title="Queue" description="Compact rows" padding="none" footer="3 items ready for review">
        <div className="card-doc-list" role="list">
          {["Design review", "Implementation", "Browser smoke"].map((item) => (
            <div role="listitem" key={item}>
              <span>{item}</span>
              <Tag tone="neutral">ready</Tag>
            </div>
          ))}
        </div>
      </Card>
    ),
    code: `<Card title="Queue" description="Compact rows" padding="none" footer="3 items ready for review"><div role="list"><div role="listitem">Design review</div><div role="listitem">Implementation</div></div></Card>`,
  },
  {
    title: "弱化背景",
    description: "meta 承载标题下方的对象摘要；tone=\"muted\" 用于页面中的辅助内容。",
    preview: (
      <Card
        tone="muted"
        title="Reviewer note with very long title that wraps instead of squeezing actions or body content"
        description="Secondary surface with long readable body copy"
        meta={
          <Card.Meta
            avatar={
              <span className="card-doc-avatar" aria-hidden="true">
                C
              </span>
            }
            title="Card.Meta object summary"
            description="Long owner metadata wraps inside the card body without creating a nested card surface."
          />
        }
      >
        <p className="card-doc-note">Use muted cards for notes, summaries, or supporting metadata.</p>
      </Card>
    ),
    code: `<Card tone="muted" title="Reviewer note" meta={<Card.Meta title="Card.Meta object summary" description="Owner metadata" />}><p>Use muted cards for notes, summaries, or supporting metadata.</p></Card>`,
  },
  {
    title: "空内容边界",
    description: "children 为空时仍保留具名 section、header 和 body，不渲染未定义值字样，也不把 Empty 合并进 Card。",
    preview: (
      <Card
        title="Inbox snapshot"
        description="No items assigned"
        extra={<Tag tone="neutral">Empty</Tag>}
        footer="Body is intentionally empty"
      />
    ),
    code: `<Card title="Inbox snapshot" description="No items assigned" extra={<Tag tone="neutral">Empty</Tag>} footer="Body is intentionally empty" />`,
  },
  {
    title: "加载状态",
    description: "loading 保留 header 与 footer，body 使用 role=status，并在根 section 同步 aria-busy。",
    preview: (
      <Card loading title="Deployment metrics" description="Fetching the latest run" footer="Content stays reserved" />
    ),
    code: `<Card loading title="Deployment metrics" description="Fetching the latest run" footer="Content stays reserved" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "cover",
    value: "ReactNode",
    description: "卡片顶部封面区域。适合图片、图表缩略图或状态画面；图片应自行提供 alt。",
  },
  {
    name: "title",
    value: "ReactNode",
    description: "卡片标题。存在时渲染为 h3，并自动作为 section 的 aria-labelledby。",
  },
  {
    name: "description",
    value: "ReactNode",
    description: "标题下的补充说明。存在时自动作为 section 的 aria-describedby。",
  },
  {
    name: "extra",
    value: "ReactNode",
    description: "标题区右侧补充内容。适合状态 Tag、时间戳或轻量摘要；复杂命令仍放入 actions。",
  },
  {
    name: "actions",
    value: "ReactNode",
    description: "标题区域右侧的局部操作。建议放 Button 或 IconButton，数量保持克制。",
  },
  {
    name: "meta / Card.Meta",
    value: "ReactNode / { avatar, title, description }",
    description: "body 顶部对象摘要槽。Card.Meta 是轻量布局助手，不渲染为嵌套卡片。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "主要内容。允许为空；为空时 body 保持存在但不会渲染未定义值字样，也不会自动合并 Empty 组件。",
  },
  {
    name: "footer",
    value: "ReactNode",
    description: "卡片底部区域。适合汇总、状态脚注或低优先级命令，不替代 header actions。",
  },
  {
    name: "hoverable",
    value: "boolean",
    description: "增加悬停/聚焦视觉反馈。仅用于整卡可点击、可选择或可进入详情的场景。",
  },
  {
    name: "loading / loadingText",
    value: "boolean / ReactNode",
    description: "加载态替换 body 内容，根 section 设置 aria-busy，状态节点使用 role=status。loadingText 支持安全 ReactNode。",
  },
  {
    name: "padding",
    value: '"none" | "sm" | "md"',
    description: "控制 body 内边距。默认 md；列表、表格、图表容器可使用 none。",
  },
  {
    name: "tone",
    value: '"default" | "muted"',
    description: "控制承载面层级。default 为白色主卡片，muted 为弱化背景。",
  },
  {
    name: "titleId",
    value: "string",
    description: "覆盖自动生成的标题 id，便于外部测试或复杂组合建立显式关联。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLElement>",
    description: "继承 section 可用属性，例如 id、aria-label、data-*、onClick。title 原生属性被组件标题语义替代，dangerouslySetInnerHTML 被显式排除。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "section.c-card",
    description: "根节点是具名 section。存在 title 时自动获得 aria-labelledby；hoverable 只改变视觉状态。",
  },
  {
    name: "cover",
    value: "div.c-card__cover",
    description: "位于 header 之前，承载媒体或视觉摘要，不替代标题语义。",
  },
  {
    name: "header",
    value: "header.c-card__header",
    description: "承载标题、描述和 actions，移动端会从横向布局切换为纵向布局。",
  },
  {
    name: "title",
    value: "h3",
    description: "标题使用固定层级 h3，避免卡片在不同页面上下文里制造过大的视觉标题。",
  },
  {
    name: "description",
    value: "p",
    description: "描述文字与根 section 自动通过 aria-describedby 关联。",
  },
  {
    name: "extra",
    value: "div.c-card__extra",
    description: "标题区工具栏内的补充信息，与 actions 并列但不承担命令语义。",
  },
  {
    name: "actions",
    value: "div[aria-label=\"Card actions\"]",
    description: "局部操作容器。交互元素的可访问名称仍由按钮自身负责。",
  },
  {
    name: "meta",
    value: "div.c-card__meta / div.c-card-meta",
    description: "位于 body 开头的对象摘要，不使用 section 或 article，避免形成卡中卡页面段落。",
  },
  {
    name: "body",
    value: "div.c-card__body",
    description: "承载主要内容，不额外强制语义，允许列表、表格、图表或表单自行声明结构。",
  },
  {
    name: "loading",
    value: 'div.c-card__loading[role="status"]',
    description: "loading 时替换 body 的可见内容，使用文本和骨架表达忙碌状态，根节点同步 aria-busy。",
  },
  {
    name: "footer",
    value: "footer.c-card__footer",
    description: "可选底部区域，位于 body 之后，以 footer 标签表达卡片局部脚注或收尾操作。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "覆盖标题、extra、actions、cover、loading 和空 children 边界，不把业务卡片或 Empty 状态合并进 Card。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "密度、8px 边框圆角、低阴影、弱化 tone、非嵌套卡片和 360/390/430 移动端换行均保持稳定。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "header/body/actions/footer 语义清楚，ReactNode 边界保留，loading skeleton 使用 role=status 与 aria-busy，不依赖 antd、antd-mobile 或 @ant-design/charts。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "专项 smoke 覆盖 desktop、mobile 360、390、430，无页面级 overflow、无可见空值文本、长内容不撑破。",
  },
  {
    name: "白帽",
    value: "PASS",
    description: "title、extra、children 文本由 React 转义渲染，不使用 dangerouslySetInnerHTML；链接和图片 URL 由调用方显式传入。",
  },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "默认卡片背景。" },
  { name: "surfaceMuted", value: "#fbfbfa", description: "muted 卡片背景。" },
  { name: "border", value: "#dededb", description: "卡片外边界和内部横向分隔线。" },
  { name: "shadow", value: "0 1px 2px rgba(17, 17, 16, 0.05)", description: "低存在感阴影，不制造漂浮卡片堆叠。" },
  { name: "radius", value: "8px", description: "卡片圆角上限，保持工具界面的克制感。" },
  { name: "paddingMd", value: "16px", description: "默认 header/body 留白。" },
  { name: "paddingSm", value: "12px", description: "密集区域留白。" },
  { name: "gapActions", value: "8px", description: "actions 内按钮间距。" },
  { name: "metaGap", value: "10px", description: "Card.Meta 头像与标题说明间距。" },
  { name: "loadingHeight", value: "10px", description: "loading 骨架条高度，降低闪动感并保留卡片高度。" },
];

const faqItems = [
  {
    question: "Card 可以替代所有容器吗？",
    answer: "不建议。Card 只用于独立内容块、摘要或重复单元；页面大区块应使用布局容器或 section。",
  },
  {
    question: "为什么标题固定是 h3？",
    answer: "卡片通常嵌在页面内容中，h3 能避免在示例、列表和文档里反复制造过大的标题层级。",
  },
  {
    question: "actions 放多少个合适？",
    answer: "通常 1 到 2 个。更多操作应移到菜单、工具条或内容内部，避免移动端拥挤。",
  },
  {
    question: "Card 里还能继续套 Card 吗？",
    answer: "除非是在文档对比或可折叠详情等强结构场景，否则应避免嵌套 Card，改用列表、分组或 Divider 保持层级清楚。",
  },
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

export function CardDoc({ showAnchors = false }: CardDocProps) {
  return (
    <TutorialScaffold component="Card" kind="display" oneLineExample={`<Card title="Release health">Ready for review</Card>`}>
    <section className="button-doc card-doc" aria-labelledby="card-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Card 文档目录">
            {cardDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="card-doc-title">{cardDocMeta.title}</h2>
            <p>
              用于承载独立内容块、摘要和局部操作。当前 Card 是自有 React 实现，根节点使用具名{" "}
              <code>{"<section>"}</code>，并自动连接标题与描述的可访问关系。
            </p>
          </header>

          <section className="button-doc-section" id="card-when" aria-labelledby="card-when-title">
            <h3 id="card-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当一组内容需要作为独立对象被扫描、比较或重复展示时使用。</li>
              <li>标题、描述和 actions 属于同一个内容块时，优先放在 Card header。</li>
              <li>内容需要封面或整卡进入详情时，可组合 cover 与 hoverable 表达可进入性。</li>
              <li>页面级大区块、纯装饰边框或复杂表单布局不应默认套 Card。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="card-demos" aria-labelledby="card-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="card-demos-title">代码演示</h3>
              <p>示例覆盖标题、描述、actions、cover、hover、body、footer、loading、空内容、内边距和弱化承载面，代码样例保持单行。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="card-api" aria-labelledby="card-api-title">
            <h3 id="card-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="card-semantic" aria-labelledby="card-semantic-title">
            <h3 id="card-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="card-composition" aria-labelledby="card-composition-title">
            <div className="button-doc-section__heading">
              <h3 id="card-composition-title">组合边界</h3>
              <p>Card 是基础容器，不与 MetricCard、MiniChartCard 等业务卡片合并。</p>
            </div>
            <ul className="button-doc-list">
              <li>业务指标、趋势图和复杂状态摘要应在业务组件中组合 Card 或独立实现。</li>
              <li>空状态内容由业务侧传入，不在 Card 内部合并 Empty、List 或 Descriptions。</li>
              <li>Card 内部避免再套 Card；需要分层时优先使用列表行、描述项、分割线或局部标题。</li>
              <li>hoverable 不是装饰态，只有卡片本身存在点击、选择或详情入口时启用。</li>
              <li>CardDoc 保持独立，不合并 ModalDoc、PopoverDoc 或其它浮层文档。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="card-mobile" aria-labelledby="card-mobile-title">
            <div className="button-doc-section__heading">
              <h3 id="card-mobile-title">Mobile</h3>
              <p>小屏下 header 纵向排列，actions 自动占满可用宽度，避免标题和按钮互相挤压。</p>
            </div>
            <ul className="button-doc-list">
              <li>actions 中的按钮应能换行，单个按钮在窄屏下允许拉伸。</li>
              <li>描述文字保持短句，长状态信息放入 body。</li>
              <li>列表式卡片可以使用 padding="none"，由内部行项目控制点击热区。</li>
              <li>专项 smoke 覆盖 desktop、360px、390px、430px 视口，校验无页面级 overflow。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="card-review" aria-labelledby="card-review-title">
            <div className="button-doc-section__heading">
              <h3 id="card-review-title">五视角复核</h3>
              <p>复核生产可用性、移动端、语义结构、依赖边界和 ReactNode 安全。</p>
            </div>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="card-token" aria-labelledby="card-token-title">
            <h3 id="card-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="card-faq" aria-labelledby="card-faq-title">
            <h3 id="card-faq-title">FAQ</h3>
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
