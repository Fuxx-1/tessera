import type { CSSProperties, ReactNode } from "react";
import { Masonry, MasonryItem, Tag } from "../components/base";
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

type MasonrySpecimen = {
  id: string;
  title: string;
  meta: string;
  body: string;
  height: number;
};

export type MasonryDocProps = {
  showAnchors?: boolean;
};

export const masonryDocMeta = {
  title: "Masonry 瀑布流",
  category: "布局",
  anchors: [
    { id: "masonry-when", label: "何时使用" },
    { id: "masonry-demos", label: "代码演示" },
    { id: "masonry-api", label: "API" },
    { id: "masonry-order", label: "排序模型" },
    { id: "masonry-semantic", label: "Semantic DOM" },
    { id: "masonry-token", label: "Design Token" },
    { id: "masonry-a11y", label: "可访问性" },
    { id: "masonry-mobile", label: "移动端" },
    { id: "masonry-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const galleryItems: MasonrySpecimen[] = [
  {
    id: "research",
    title: "Research notes",
    meta: "insight",
    body: "Uneven cards can form a compact exploratory feed without cropping the content.",
    height: 92,
  },
  {
    id: "system",
    title: "System snapshot",
    meta: "ops",
    body: "Short status blocks stay visually close to longer notes.",
    height: 46,
  },
  {
    id: "design",
    title: "Design reference",
    meta: "asset",
    body: "Image-like media can reserve its natural height while text still wraps safely.",
    height: 128,
  },
  {
    id: "audit",
    title: "Audit trail",
    meta: "review",
    body: "The source order remains stable for keyboard and assistive technology.",
    height: 72,
  },
  {
    id: "brief",
    title: "Long identifier",
    meta: "mobile",
    body: "release-candidate-build-2026-06-07-masonry-layout-no-overflow-check",
    height: 58,
  },
  {
    id: "media",
    title: "Media card",
    meta: "gallery",
    body: "Columns mode is best for browseable sets where visual proximity is not rank.",
    height: 110,
  },
];

const apiRows: DocRow[] = [
  { name: "as", value: "ElementType", description: "根元素，默认 ul。传 div 时组件会补 role=list。" },
  { name: "columns", value: '1 | 2 | 3 | 4 | 5 | 6 | "auto"', description: "桌面列数；auto 通过 minItemWidth 推导列宽。" },
  { name: "columnsMd / columnsSm", value: "MasonryColumns", description: "900px 与 760px 以下的列数覆盖；移动端默认单列。" },
  { name: "gap", value: "SpaceSize | number", description: "列间距和项间距，数值会转成非负 px。" },
  { name: "minItemWidth", value: "number", description: "auto 模式的最小项目宽度；小屏默认单列以避免横向溢出。" },
  { name: "order", value: '"columns" | "rows"', description: "columns 使用 CSS columns 做瀑布流；rows 使用 CSS grid 保留行优先视觉顺序。" },
  { name: "ariaLabel", value: "string", description: "没有可见标题时给列表组提供可访问名称。" },
  { name: "MasonryItem breakInside", value: '"avoid" | "auto"', description: "默认 avoid，避免项目被 CSS columns 拆开。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "ul | ol | role=list", description: "默认 ul。非列表根元素会自动设置 role=list，除非调用方显式传 role。" },
  { name: "item", value: "li | role=listitem", description: "MasonryItem 默认 li。非 li 根元素会自动设置 role=listitem。" },
  { name: "order", value: "source order", description: "组件不使用 CSS order 重排内容；屏幕阅读器和键盘顺序始终来自 DOM。" },
  { name: "interactive card", value: "nested controls", description: "项目包装层保持结构语义，按钮、链接和表单控件应放在卡片内部并自带 label。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-masonry-gap", value: "0 | 4 | 8 | 12 | 18 | 24px | custom", description: "由 gap prop 写入，统一列间距与项目底部间距。" },
  { name: "--c-masonry-columns", value: "1..6", description: "由 columns / columnsMd / columnsSm 类控制。" },
  { name: "--c-masonry-min", value: "min(100%, minItemWidth px)", description: "auto 模式列宽下限会被容器宽度包裹，最低输入保护为 1px。" },
  { name: "item wrapper", value: "min-width: 0", description: "项目允许长文本换行，不把页面横向撑开。" },
  {
    name: "主题 style",
    value: "none / inherit",
    description: "Masonry 不生成主题 surface，列表和 item 继承宿主主题；文档卡片示例用 --ct-surface、--ct-border、--ct-shadow-sm 呈现亮/暗边界。",
  },
  {
    name: "结构 style",
    value: "CSS columns/grid / break-inside / responsive columns",
    description: "columns、rows、columnsMd、columnsSm、minItemWidth、breakInside 和 list semantics 属于结构样式，小屏默认单列。",
  },
];

function MasonryCard({ body, height, meta, title }: MasonrySpecimen) {
  return (
    <article className="masonry-doc-card">
      <div className="masonry-doc-card__visual" style={{ "--masonry-doc-visual": `${height}px` } as CSSProperties} />
      <span>{meta}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}

const demos: Demo[] = [
  {
    title: "瀑布流列表",
    description: "默认 ul/li 语义，columns 模式按列填充；一行样例为 <Masonry columns={3} gap=\"md\"><MasonryItem>...</MasonryItem></Masonry>。",
    preview: (
      <Masonry ariaLabel="Masonry gallery examples" columns={3} columnsMd={2} gap="md">
        {galleryItems.map((item) => (
          <MasonryItem key={item.id}>
            <MasonryCard {...item} />
          </MasonryItem>
        ))}
      </Masonry>
    ),
    code: `<Masonry ariaLabel="Masonry gallery examples" columns={3} columnsMd={2} gap="md">
  {items.map((item) => (
    <MasonryItem key={item.id}>
      <article>...</article>
    </MasonryItem>
  ))}
</Masonry>`,
  },
  {
    title: "自适应列宽",
    description: "auto 使用 column-width 或 grid auto-fit，minItemWidth 会被小屏安全包裹。",
    preview: (
      <Masonry as="div" ariaLabel="Responsive masonry feed" columns="auto" gap="sm" minItemWidth={180}>
        {galleryItems.slice(0, 5).map((item) => (
          <MasonryItem as="div" key={item.id}>
            <MasonryCard {...item} height={Math.max(42, item.height - 26)} />
          </MasonryItem>
        ))}
      </Masonry>
    ),
    code: `<Masonry as="div" ariaLabel="Responsive masonry feed" columns="auto" minItemWidth={180} gap="sm">
  <MasonryItem as="div">...</MasonryItem>
</Masonry>`,
  },
  {
    title: "行优先视觉顺序",
    description: "order=\"rows\" 切换到 CSS grid，适合用户会按横向扫描的卡片矩阵。",
    preview: (
      <Masonry ariaLabel="Row ordered card examples" columns={3} columnsMd={2} gap="sm" order="rows">
        {galleryItems.slice(0, 6).map((item, index) => (
          <MasonryItem key={item.id}>
            <article className="masonry-doc-card masonry-doc-card--soft">
              <span>#{index + 1}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          </MasonryItem>
        ))}
      </Masonry>
    ),
    code: `<Masonry columns={3} columnsMd={2} gap="sm" order="rows">
  <MasonryItem>...</MasonryItem>
</Masonry>`,
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

export function MasonryDoc({ showAnchors = true }: MasonryDocProps) {
  return (
    <TutorialScaffold
      component="Masonry"
      kind="display"
      oneLineExample={`<Masonry columns={3} columnsSm={1} gap="md"><MasonryItem>Card</MasonryItem></Masonry>`}
    >
      <section className="button-doc masonry-doc" aria-labelledby="masonry-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Masonry 文档目录">
              {masonryDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc / layout</p>
              <h2 id="masonry-doc-title">{masonryDocMeta.title}</h2>
              <p>
                Masonry 是独立瀑布流布局组件，用自有 CSS columns/grid 实现高度不一内容的紧凑排列。
                它默认保留列表语义，并在移动端收敛为单列。
                五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；风险集中在视觉顺序、键盘顺序、移动端列数和外部内容安全。
              </p>
            </header>

          <section className="button-doc-section" id="masonry-when" aria-labelledby="masonry-when-title">
            <h3 id="masonry-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于图片墙、灵感板、探索型动态、资料卡和高度不一致的非线性集合。</li>
              <li>不用于排行榜、步骤、时间线、审批流或任何横向相邻关系带有业务含义的内容。</li>
              <li>需要行优先扫描时使用 <code>order="rows"</code>；需要真正瀑布流紧凑排列时使用默认 columns。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="masonry-demos" aria-labelledby="masonry-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="masonry-demos-title">代码演示</h3>
              <p>覆盖 columns、auto、rows、响应式列数、数值宽度保护和 list semantics。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="masonry-api" aria-labelledby="masonry-api-title">
            <h3 id="masonry-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="masonry-order" aria-labelledby="masonry-order-title">
            <h3 id="masonry-order-title">排序模型</h3>
            <div className="masonry-doc-note-grid">
              <article className="masonry-doc-note">
                <h4>columns</h4>
                <p>使用 CSS columns，视觉上向下填充再进入下一列。DOM、键盘和读屏顺序不变，适合无严格顺序的浏览集合。</p>
              </article>
              <article className="masonry-doc-note">
                <h4>rows</h4>
                <p>使用 CSS grid，视觉上按行扫描。它不是瀑布流压缩算法，但更适合编号、横向比较和有序卡片矩阵。</p>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="masonry-semantic" aria-labelledby="masonry-semantic-title">
            <h3 id="masonry-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="masonry-token" aria-labelledby="masonry-token-title">
            <h3 id="masonry-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="masonry-a11y" aria-labelledby="masonry-a11y-title">
            <h3 id="masonry-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>有可见标题时使用 <code>aria-labelledby</code>，没有标题时使用 <code>ariaLabel</code>。</li>
              <li>Masonry 保留 DOM 顺序；视觉列位置不能作为排名、状态或下一步动作的唯一表达。</li>
              <li>不要给容器使用 <code>role="grid"</code>，除非业务实现完整的网格键盘模型。</li>
              <li>交互控件放在 item 内部，并为每个按钮、链接和输入提供自己的可访问名称。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="masonry-mobile" aria-labelledby="masonry-mobile-title">
            <h3 id="masonry-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>760px 以下默认单列，避免多列压缩造成横向滚动或难以阅读。</li>
              <li><code>columnsSm</code> 可显式覆盖小屏列数，但应只用于图片密集型、低文本内容。</li>
              <li><code>minItemWidth</code> 只控制 auto 列宽下限，并会限制在容器宽度内；长文本仍需允许换行。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="masonry-gaps" aria-labelledby="masonry-gaps-title">
            <h3 id="masonry-gaps-title">缺口与扩展</h3>
            <ul className="button-doc-list">
              <li>暂不内置虚拟滚动、拖拽排序、图片懒加载和高度测量算法。</li>
              <li>columns 模式不保证行对齐；需要跨列精确对齐时应使用 Grid。</li>
              <li>
                <Tag tone="subtle">no antd</Tag> 当前实现只依赖 React、TypeScript 和自有 CSS。
              </li>
            </ul>
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
