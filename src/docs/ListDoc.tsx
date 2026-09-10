import type { ReactNode } from "react";
import { Avatar, Button, ConfigProvider, List, Tag } from "../components/base";
import type { TagTone } from "../components/base";
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

type ReleaseItem = {
  id: string;
  title: string;
  owner: string;
  status: "ready" | "review" | "blocked";
};

type ReviewItem = ReleaseItem & {
  body: string;
  meta: string;
  initials: string;
  tone: "online" | "away" | "busy";
};

export type ListDocProps = {
  showAnchors?: boolean;
};

export const listDocMeta = {
  title: "List 列表",
  category: "基础组件",
  anchors: [
    { id: "list-when", label: "何时使用" },
    { id: "list-demos", label: "代码演示" },
    { id: "list-api", label: "API" },
    { id: "list-semantic", label: "Semantic DOM" },
    { id: "list-token", label: "Design Token" },
    { id: "list-a11y", label: "可访问性" },
    { id: "list-mobile", label: "移动端" },
    { id: "list-security", label: "安全" },
    { id: "list-review", label: "五视角复核" },
    { id: "list-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const releases: ReleaseItem[] = [
  { id: "core", title: "Core primitives", owner: "Base team", status: "ready" },
  { id: "docs", title: "Docs surface", owner: "Experience team", status: "review" },
  { id: "mobile", title: "Mobile fit pass", owner: "QA", status: "blocked" },
];

const longReleaseItems: ReleaseItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: `long-${index + 1}`,
  owner: index % 2 === 0 ? "Experience team" : "Runtime team",
  status: index % 3 === 0 ? "ready" : index % 3 === 1 ? "review" : "blocked",
  title: `Release note ${index + 1} with intentionally-long-token-${index + 1}-https://tessera.local/components/list/responsive-check`,
}));

const reviewItems: ReviewItem[] = [
  {
    id: "avatar-meta",
    body: "Checks avatar, title, metadata, summary copy, and multiple visible actions without relying on hover-only controls.",
    initials: "LM",
    meta: "Meta: owner, SLA, and reviewed timestamp",
    owner: "Lina Morgan",
    status: "ready",
    title: "Avatar/meta/action row",
    tone: "online",
  },
  {
    id: "long-body",
    body: "A deliberately long body keeps item content readable on 360/390/430 px viewports while preserving divider rhythm and action touch size.",
    initials: "QS",
    meta: "Meta: long body and narrow viewport",
    owner: "Quality squad",
    status: "review",
    title: "Vertical item with long summary text and visible actions",
    tone: "away",
  },
  {
    id: "blocked-link",
    body: "Links and buttons are rendered by the host with explicit labels; List does not parse HTML or trust item text as markup.",
    initials: "ST",
    meta: "Meta: security boundary",
    owner: "Security team",
    status: "blocked",
    title: "Safe link boundary <script>alert(1)</script>",
    tone: "busy",
  },
];

function statusTone(status: ReleaseItem["status"]): TagTone {
  if (status === "ready") {
    return "strong";
  }

  return status === "review" ? "subtle" : "neutral";
}

function ReleaseRow(item: ReleaseItem) {
  return (
    <div className="list-doc-row">
      <div>
        <strong>{item.title}</strong>
        <span>{item.owner}</span>
      </div>
      <Tag tone={statusTone(item.status)}>{item.status}</Tag>
    </div>
  );
}

function ReviewRow(item: ReviewItem) {
  return (
    <div className="list-doc-review-row">
      <Avatar alt={item.owner} status={item.tone} text={item.initials} />
      <div className="list-doc-review-row__body">
        <div className="list-doc-review-row__meta">
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
        </div>
        <p>{item.body}</p>
        <div className="list-doc-review-row__actions" aria-label={`${item.title} actions`}>
          <Button size="sm" variant="ghost">Open</Button>
          <Button size="sm" variant="soft">Assign</Button>
          <a href="https://example.com/list-review" rel="noreferrer" target="_blank">Safe link</a>
        </div>
      </div>
      <Tag tone={statusTone(item.status)}>{item.status}</Tag>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础列表",
    description: "默认使用 ul/li 语义，header 提供可访问名称，footer 承载汇总信息。",
    preview: (
      <List
        footer="3 workstreams"
        getKey={(item) => item.id}
        header="Release checklist"
        items={releases}
        renderItem={ReleaseRow}
      />
    ),
    code: `<List
  header="Release checklist"
  footer="3 workstreams"
  items={releases}
  getKey={(item) => item.id}
  renderItem={(item) => <ReleaseRow {...item} />}
/>`,
  },
  {
    title: "空状态",
    description: "emptyText、emptyDescription 和 emptyAction 共同描述无数据原因和下一步动作。",
    preview: (
      <List
        emptyAction={<Button size="sm">Create item</Button>}
        emptyDescription="Filters are applied, but no rows match the current query."
        emptyText="No matching items"
        header="Filtered result"
        items={[]}
        renderItem={ReleaseRow}
      />
    ),
    code: `<List
  header="Filtered result"
  items={[]}
  emptyText="No matching items"
  emptyDescription="Filters are applied, but no rows match the current query."
  emptyAction={<Button size="sm">Create item</Button>}
  renderItem={(item) => <ReleaseRow {...item} />}
/>`,
  },
  {
    title: "加载与错误",
    description: "error 默认优先展示；statePriority=\"loading\" 可在刷新时保留 loading 主状态并提示延迟错误。",
    preview: (
      <div className="doc-demo-stack">
        <List
          ariaLabel="Loading release checklist"
          items={releases}
          loading
          loadingText="Refreshing list"
          renderItem={ReleaseRow}
        />
        <List
          ariaLabel="Refreshing release checklist with deferred error"
          error="Previous refresh failed; retry is still running."
          items={releases}
          loading
          loadingText="Refreshing with deferred error"
          renderItem={ReleaseRow}
          statePriority="loading"
        />
        <List
          ariaLabel="Failed release checklist"
          error="Unable to load release checklist."
          items={releases}
          renderItem={ReleaseRow}
        />
      </div>
    ),
    code: `<List items={items} loading loadingText="Refreshing list" renderItem={renderItem} />
<List items={items} loading error={error} statePriority="loading" renderItem={renderItem} />
<List items={items} error="Unable to load release checklist." renderItem={renderItem} />`,
  },
  {
    title: "紧凑与语义切换",
    description: "density=\"compact\" 适合密集面板；listElement=\"ol\" 可表达有序步骤。",
    preview: (
      <List
        density="compact"
        getKey={(item) => item.id}
        header="Ordered review steps"
        items={releases}
        listElement="ol"
        renderItem={(item, state) => (
          <div className="list-doc-row">
            <div>
              <strong>{state.index + 1}. {item.title}</strong>
              <span>{state.isLast ? "Final checkpoint" : "Required before next step"}</span>
            </div>
            <Tag tone={statusTone(item.status)}>{item.status}</Tag>
          </div>
        )}
      />
    ),
    code: `<List
  density="compact"
  listElement="ol"
  items={steps}
  renderItem={(item, state) => (
    <StepRow index={state.index} isLast={state.isLast} item={item} />
  )}
/>`,
  },
  {
    title: "一行样例与长列表保护",
    description: "行内容可保持一行扫描；长标题会断行保护，maxVisibleItems 提供渲染预算提示而不是伪分页。",
    preview: (
      <div className="doc-demo-stack">
        <List
          density="compact"
          footer="Single-row acceptance sample"
          getKey={(item) => item.id}
          header="One-line status row"
          items={[releases[0]]}
          renderItem={(item) => (
            <div className="list-doc-row list-doc-row--one-line">
              <strong>{item.title}</strong>
              <span>{item.owner}</span>
              <Tag tone={statusTone(item.status)}>{item.status}</Tag>
            </div>
          )}
        />
        <div className="list-doc-mobile-frame">
          <List
            footer="No pagination is rendered by List; compose Pagination outside when needed."
            getKey={(item) => item.id}
            header="Long audit feed"
            items={longReleaseItems}
            maxVisibleItems={4}
            renderItem={ReleaseRow}
          />
        </div>
      </div>
    ),
    code: `<List
  density="compact"
  header="One-line status row"
  footer="Single-row acceptance sample"
  items={[item]}
  renderItem={(item) => <OneLineRow item={item} />}
/>

<List
  header="Long audit feed"
  footer="Compose Pagination outside when needed."
  items={longItems}
  maxVisibleItems={4}
  renderItem={(item) => <ReleaseRow item={item} />}
/>`,
  },
  {
    title: "Meta / avatar / actions",
    description: "横向 item 覆盖 avatar、meta、正文、多 action 和分割线；移动端自动改为垂直排布。",
    preview: (
      <List
        getKey={(item) => item.id}
        header="Horizontal review feed"
        items={reviewItems}
        renderItem={ReviewRow}
      />
    ),
    code: `<List
  header="Horizontal review feed"
  items={items}
  getKey={(item) => item.id}
  renderItem={(item) => <ReviewRow item={item} />}
/>`,
  },
  {
    title: "Grid / vertical / theme",
    description: "grid 外层组合多个 List；vertical 文本流、浅色和暗色 token 都保持可读，不与 Card/Table 合并。",
    preview: (
      <div className="list-doc-grid-demo">
        <List
          ariaLabel="Vertical compact list"
          density="compact"
          items={reviewItems.slice(0, 2)}
          renderItem={(item) => (
            <div className="list-doc-vertical-row">
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          )}
        />
        <ConfigProvider theme="dark">
          <List
            ariaLabel="Dark readable list"
            footer="Dark token sample"
            items={reviewItems.slice(1)}
            renderItem={(item) => (
              <div className="list-doc-vertical-row">
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </div>
            )}
          />
        </ConfigProvider>
      </div>
    ),
    code: `<div className="grid">
  <List ariaLabel="Vertical compact list" density="compact" items={items} renderItem={renderItem} />
  <ConfigProvider theme="dark">
    <List ariaLabel="Dark readable list" items={items} renderItem={renderItem} />
  </ConfigProvider>
</div>`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "readonly TItem[]", description: "列表数据源。空数组触发 Empty 状态。" },
  { name: "renderItem", value: "(item, state) => ReactNode", description: "渲染单行内容。state 包含 index、key、isFirst、isLast。" },
  { name: "getKey", value: "(item, index) => string | number", description: "稳定 key 读取器；未提供时退回 index，仅适合静态数据。" },
  { name: "header / footer", value: "ReactNode", description: "列表头尾槽位。header 会成为默认 aria-labelledby 来源。" },
  { name: "emptyText / emptyDescription / emptyAction", value: "ReactNode", description: "空状态标题、说明和操作槽位。" },
  { name: "loading / loadingText", value: "boolean / ReactNode", description: "展示 Spin 状态，并在 root 上设置 aria-busy。" },
  { name: "error", value: "ReactNode", description: "展示 alert 状态。默认优先级高于 loading。" },
  { name: "statePriority", value: '"error" | "loading"', description: "同时存在 error 和 loading 时选择主状态。默认 error。" },
  { name: "maxVisibleItems", value: "number", description: "限制单次渲染行数，超出时追加 role=status 提示行；不是分页器。" },
  { name: "density", value: '"comfortable" | "compact"', description: "控制行高和内边距。粗指针设备仍保持可触达高度。" },
  { name: "listElement", value: '"ul" | "ol" | "div"', description: "选择列表语义。默认 ul；div 会补 role=list/listitem。" },
  { name: "ariaLabel", value: "string", description: "无 header 或 header 不适合命名时提供可访问名称。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLElement>", description: "继承 section 根元素属性，例如 id、data-*、aria-*。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section.c-list", description: "承载 header、状态、items 和 footer，并暴露 aria-busy。" },
  { name: "header", value: "div.c-list__header", description: "存在时作为默认 aria-labelledby 目标。" },
  { name: "items", value: "ul | ol | div", description: "默认使用原生列表元素；div 模式补 ARIA 列表角色。" },
  { name: "item", value: "li | div", description: "列表行只负责结构和间距，具体交互由 renderItem 内部组件承担。" },
  { name: "item content", value: "meta / avatar / actions", description: "标题、meta、avatar、正文和操作由 renderItem 组合，List 只维护列表语义和分割线。" },
  { name: "loading", value: "role=status", description: "加载状态 polite 朗读，并由 Spin 提供可读 label。" },
  { name: "error", value: "role=alert", description: "错误状态立即朗读，避免只靠颜色传达失败。" },
  { name: "empty", value: "Empty role=status", description: "空状态使用 Empty 组件，并提供标题、描述和操作槽位。" },
  { name: "overflow", value: "li > span[role=status]", description: "超过 maxVisibleItems 时追加可公告的截断提示，避免数万条数据一次性渲染。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "列表主体背景。" },
  { name: "surfaceSubtle", value: "#fbfbfa", description: "header 和 footer 背景。" },
  { name: "border", value: "#dededb / #ededeb", description: "外框和行分隔线。" },
  { name: "text", value: "#1f1f1d / #555552", description: "正文与头尾辅助文本。" },
  { name: "errorText", value: "#7a2d2d", description: "错误状态文本色，配合 alert 语义使用。" },
  { name: "radius", value: "8px desktop / 6px mobile", description: "保持和当前基础组件一致的克制圆角。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "覆盖列表浏览、空态、加载、错误、长列表提示和分页语义边界；分页明确由外部 Pagination 组合。" },
  { name: "UI", value: "通过", description: "item、meta、avatar、actions、分割线、紧凑密度、horizontal/vertical/grid 形态和暗浅色可读均有可视样例。" },
  { name: "研发", value: "通过", description: "自有 React 泛型组件，dataSource 对应 items，renderItem/getKey 明确，默认 ul/li，可切 ol/div 语义；不引入 antd 等 UI 依赖。" },
  { name: "测试", value: "通过", description: "专项 smoke 覆盖 #list 路由、desktop + 360/390/430、状态优先级、语义列表、渲染预算、移动端宽度和文档边界。" },
  { name: "白帽", value: "通过", description: "List 不解析 HTML，用户内容由 React 转义；示例验证文本转义、链接 rel=noreferrer/target=_blank 边界和 forbidden deps 禁止项。" },
];

const faqRows: DocRow[] = [
  { name: "是否支持虚拟滚动？", value: "暂不内置", description: "List 负责普通列表语义和状态。超长数据应由业务层接入窗口化方案。" },
  { name: "是否内置分页？", value: "不内置", description: "List 只负责列表结构和状态；分页、游标加载和无限滚动应由 Pagination 或业务容器组合。" },
  { name: "能不能把行做成按钮？", value: "可以组合", description: "在 renderItem 内渲染 Button、链接或自定义交互控件，并保证可访问名称。" },
  { name: "和 Table 怎么选？", value: "按信息结构选择", description: "多列对齐、表头和横向比较用 Table；同类对象流和操作入口用 List。" },
];

function DocTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">属性</th>
            <th scope="col">类型 / 当前值</th>
            <th scope="col">说明</th>
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

export function ListDoc({ showAnchors = true }: ListDocProps) {
  return (
    <TutorialScaffold component="List" kind="display" oneLineExample={`<List items={items} renderItem={(item) => item.title} />`}>
    <main className="button-doc list-doc">
      <div className="button-doc__layout button-doc__layout--with-toc">
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="List 文档目录">
            {listDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Base / Data Display</p>
            <h2>List 列表</h2>
            <p>
              自有生产级列表组件，用于同类数据流、轻量操作入口和对象摘要。实现重点是状态完备、
              原生语义可选、窄屏可读，以及不依赖任何 antd 系 UI 包。
            </p>
            <code>import {"{ List }"} from "./components/base";</code>
          </header>

          <section className="button-doc-section" id="list-when" aria-labelledby="list-when-title">
            <div className="button-doc-section__heading">
              <h3 id="list-when-title">何时使用</h3>
              <p>当内容是一组同类对象，且每一项主要以块状信息和局部操作呈现时使用。</p>
            </div>
            <ul className="button-doc-list">
              <li>适合消息、任务、搜索结果、配置项、审核清单等重复对象。</li>
              <li>需要表头、多列比较、排序或单元格矩阵时使用 Table。</li>
              <li>超长数据流需要业务层接入虚拟滚动，List 本身保持轻量和可组合。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="list-demos" aria-labelledby="list-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="list-demos-title">代码演示</h3>
              <p>覆盖默认、空态、加载、错误、紧凑、有序、avatar/meta/actions、grid、vertical 和暗色可读。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <article className="button-doc-demo" key={demo.title}>
                  <div className="button-doc-demo__meta">
                    <h3>{demo.title}</h3>
                    <p>{demo.description}</p>
                  </div>
                  <div className="button-doc-demo__preview">{demo.preview}</div>
                  <pre className="button-doc-code">
                    <code>{demo.code}</code>
                  </pre>
                </article>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="list-api" aria-labelledby="list-api-title">
            <div className="button-doc-section__heading">
              <h3 id="list-api-title">API</h3>
              <p>List 是泛型组件，数据与行内容由宿主提供，状态槽位由组件统一承载。</p>
            </div>
            <DocTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="list-semantic" aria-labelledby="list-semantic-title">
            <div className="button-doc-section__heading">
              <h3 id="list-semantic-title">Semantic DOM</h3>
              <p>默认输出原生列表元素，必要时可切到 div 并由组件补齐 ARIA role。</p>
            </div>
            <DocTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="list-token" aria-labelledby="list-token-title">
            <div className="button-doc-section__heading">
              <h3 id="list-token-title">Design Token</h3>
              <p>沿用当前中性组件体系，避免单一蓝色或 antd 风格视觉绑定。</p>
            </div>
            <DocTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="list-a11y" aria-labelledby="list-a11y-title">
            <div className="button-doc-section__heading">
              <h3 id="list-a11y-title">可访问性</h3>
              <p>List 自身负责区域命名、列表语义和状态朗读，行内交互控件由 renderItem 保证。</p>
            </div>
            <ul className="button-doc-list">
              <li>有 header 时自动关联 aria-labelledby；没有可读标题时传 ariaLabel。</li>
              <li>loading 使用 aria-busy 和 role=status；error 使用 role=alert。</li>
              <li>不要只用颜色区分行状态，行内状态应有文本、徽标或可访问名称。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="list-mobile" aria-labelledby="list-mobile-title">
            <div className="button-doc-section__heading">
              <h3 id="list-mobile-title">移动端</h3>
              <p>列表行在粗指针设备保持至少 48px 触控高度，窄屏下内容允许换行并避免水平溢出。</p>
            </div>
            <ul className="button-doc-list">
              <li>移动端不要依赖 hover 展开隐藏操作；操作入口应可见或通过明确按钮打开。</li>
              <li>多 action 在窄屏下允许换行，按钮和链接保持可触达尺寸，不挤压 avatar 与 meta。</li>
              <li>长标题和 URL 会通过 overflow-wrap 断行，renderItem 内部仍应避免固定宽度。</li>
              <li>需要下拉刷新、索引吸顶或移动手势时，应作为 MobileList 或业务组件扩展。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="list-security" aria-labelledby="list-security-title">
            <div className="button-doc-section__heading">
              <h3 id="list-security-title">安全</h3>
              <p>List 不解析 HTML，也不引入外部 UI 库。用户生成内容应在 renderItem 内按场景转义或净化。</p>
            </div>
            <ul className="button-doc-list">
              <li>禁止引入 antd、antd-mobile、@ant-design/charts 或相似 UI 套件实现 List。</li>
              <li>不要把未经净化的字符串传入 dangerouslySetInnerHTML。</li>
              <li>列表项链接必须由宿主校验 URL 安全边界，新窗口链接应显式设置 rel="noreferrer"。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="list-review" aria-labelledby="list-review-title">
            <div className="button-doc-section__heading">
              <h3 id="list-review-title">五视角复核</h3>
              <p>List 文档独立闭环，只描述列表组件能力与组合边界，不合并 Table 或 Card 文档。</p>
            </div>
            <DocTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="list-faq" aria-labelledby="list-faq-title">
            <div className="button-doc-section__heading">
              <h3 id="list-faq-title">FAQ</h3>
              <p>记录当前生产边界，避免把未实现能力写成可用 API。</p>
            </div>
            <DocTable rows={faqRows} />
          </section>
        </div>
      </div>
    </main>
      </TutorialScaffold>
);
}
