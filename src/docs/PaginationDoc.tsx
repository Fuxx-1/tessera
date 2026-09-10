import type { ReactNode } from "react";
import { Pagination } from "../components/base";
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

export type PaginationDocProps = {
  showAnchors?: boolean;
};

export const paginationDocMeta = {
  title: "Pagination 分页",
  category: "导航组件",
  anchors: [
    { id: "pagination-when", label: "何时使用" },
    { id: "pagination-demos", label: "代码演示" },
    { id: "pagination-api", label: "API" },
    { id: "pagination-semantic", label: "Semantic DOM" },
    { id: "pagination-token", label: "Design Token" },
    { id: "pagination-a11y", label: "Accessibility" },
    { id: "pagination-mobile", label: "Mobile" },
    { id: "pagination-unsupported", label: "扩展边界" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Pagination current={4} total={128} onChange={setPage} />`;

const demos: Demo[] = [
  {
    title: "基础分页",
    description: "使用 current 或 defaultCurrent 控制当前页，页码按钮通过 aria-current 标记当前页。",
    preview: <Pagination current={4} total={128} />,
    code: `<Pagination current={4} total={128} onChange={setPage} />`,
  },
  {
    title: "总量、跳转与每页条数",
    description: "showTotal 展示当前数据范围，showQuickJumper 允许键入页码跳转，showSizeChanger 可切换每页条数。",
    preview: <Pagination defaultCurrent={3} defaultPageSize={20} showQuickJumper showSizeChanger showTotal total={416} />,
    code: `<Pagination defaultCurrent={3} defaultPageSize={20} showQuickJumper showSizeChanger showTotal total={416} />`,
  },
  {
    title: "简洁模式",
    description: "simple 适合空间紧张的页脚、抽屉或移动端工具面，仍保留上一页和下一页按钮。",
    preview: <Pagination defaultCurrent={8} pageSize={10} simple total={240} />,
    code: `<Pagination defaultCurrent={8} pageSize={10} simple total={240} />`,
  },
  {
    title: "禁用状态",
    description: "disabled 会禁用所有交互控件，并在根节点提供 aria-disabled。",
    preview: <Pagination current={6} disabled showQuickJumper showSizeChanger showTotal total={220} />,
    code: `<Pagination current={6} disabled showQuickJumper showSizeChanger showTotal total={220} />`,
  },
  {
    title: "移动横向滚动",
    description: "页码列表默认不换行，容器变窄时只让页码区域横向滚动，上一页和下一页保持可见。",
    preview: (
      <div className="pagination-doc-mobile-frame">
        <Pagination current={18} pageSize={5} siblingCount={2} total={220} />
      </div>
    ),
    code: `<Pagination current={18} pageSize={5} siblingCount={2} total={220} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "current",
    value: "number",
    description: "受控当前页。组件会把非法页码夹到 1 到 pageCount 之间。",
  },
  {
    name: "defaultCurrent",
    value: "number",
    description: "非受控初始页。没有传 current 时使用。",
  },
  {
    name: "total",
    value: "number",
    description: "数据总条数。小于 0 时按 0 处理，页数至少为 1。",
  },
  {
    name: "pageSize",
    value: "number",
    description: "受控每页条数。非法值会回落到 1 以上。",
  },
  {
    name: "defaultPageSize",
    value: "number",
    description: "非受控初始每页条数。默认 10。",
  },
  {
    name: "onChange",
    value: "(page: number) => void",
    description: "页码变化回调。点击当前页、禁用态或越界后无变化时不会触发。",
  },
  {
    name: "siblingCount",
    value: "number",
    description: "当前页两侧保留的相邻页码数量。默认 1。",
  },
  {
    name: "showTotal",
    value: "boolean | ((total, range) => ReactNode)",
    description: "展示总量文案。传函数时可自定义范围和总量的展示。",
  },
  {
    name: "showQuickJumper",
    value: "boolean",
    description: "显示页码输入和 Go 按钮，提交后跳转到目标页。",
  },
  {
    name: "showSizeChanger",
    value: "boolean",
    description: "显示每页条数选择器，使用原生 select 并支持键盘操作。",
  },
  {
    name: "pageSizeOptions",
    value: "number[]",
    description: "每页条数候选项。当前 pageSize 会自动补入候选并去重排序。",
  },
  {
    name: "onPageSizeChange",
    value: "(pageSize: number, page: number) => void",
    description: "每页条数变化回调。第二个参数是切换后夹取到合法范围的当前页。",
  },
  {
    name: "simple",
    value: "boolean",
    description: "只展示上一页、当前页状态和下一页。",
  },
  {
    name: "size",
    value: '"sm" | "md"',
    description: "控制分页项高度和字体。默认 md。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用所有可交互控件，并设置根节点 aria-disabled。",
  },
  {
    name: "hideOnSinglePage",
    value: "boolean",
    description: "只有一页时不渲染分页导航。",
  },
  {
    name: "itemLabel",
    value: '(page, type) => string',
    description: "自定义上一页、下一页和页码按钮的可访问名称。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "nav",
    description: "根节点是带 aria-label 的分页导航区域。",
  },
  {
    name: "page list",
    value: "ol > li",
    description: "普通模式使用有序列表承载页码，省略号为 aria-hidden 的装饰文本。",
  },
  {
    name: "page item",
    value: "button / select / input",
    description: "页码、上一页、下一页和跳转动作都是原生 button；每页条数使用原生 select。",
  },
  {
    name: "current page",
    value: 'aria-current="page"',
    description: "当前页按钮使用 aria-current 表示所在页。",
  },
  {
    name: "disabled",
    value: "disabled / aria-disabled",
    description: "按钮使用原生 disabled，根导航通过 aria-disabled 暴露整体禁用状态。",
  },
];

const tokenRows: DocRow[] = [
  { name: "itemHeight", value: "34px / 30px", description: "md 和 sm 分页项高度。" },
  { name: "itemMinWidth", value: "34px / 30px", description: "保证数字、状态和 hover 不引发布局跳动。" },
  { name: "itemRadius", value: "6px", description: "与 Button、Tag 等基础控件保持紧凑圆角。" },
  { name: "itemBorder", value: "#dededb", description: "默认边框颜色。" },
  { name: "itemHoverBg", value: "low-alpha neutral", description: "hover 使用低透明中性背景，不抢占当前页。" },
  { name: "itemActiveBg", value: "neutral selected surface", description: "当前页使用中性 selected 面和弱阴影，不使用大面积反相填充。" },
  { name: "itemActiveText", value: "current text", description: "当前页文字保持主题文本色，亮/暗主题都由 token 保证对比。" },
  { name: "selectWidth", value: "112px / 104px", description: "每页条数选择器固定宽度，避免文案变化挤压页码。" },
  { name: "textMuted", value: "#696967 / #8a8a86", description: "总量、标签和省略号颜色。" },
  { name: "focus", value: "#555552", description: "键盘聚焦轮廓颜色。" },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-surface-hover / --ct-surface-selected",
    description: "按钮、当前页、ellipsis、jumper、size changer、disabled 和 focus ring 都读取 --ct-* token；亮/暗主题无额外 DOM。",
  },
  {
    name: "结构 style",
    value: "nowrap scroller / fixed controls / simple mode",
    description: "页码列表、上一页下一页、跳转输入、每页选择器、simple 模式和移动端横向滚动都属于结构样式。",
  },
];

const unsupportedRows: DocRow[] = [
  {
    name: "responsive 自动折叠",
    value: "暂不支持",
    description: "当前策略是页码横向滚动和 simple 模式，暂不根据断点自动改变结构。",
  },
  {
    name: "locale 包",
    value: "暂不支持",
    description: "可通过 itemLabel 和 showTotal 函数自定义文案，暂不接入全局国际化上下文。",
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

export function PaginationDoc({ showAnchors = false }: PaginationDocProps) {
  return (
    <TutorialScaffold component="Pagination" kind="action" oneLineExample={oneLineExample}>
    <section className="button-doc pagination-doc" aria-labelledby="pagination-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Pagination 文档目录">
            {paginationDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="pagination-doc-title">{paginationDocMeta.title}</h2>
            <p>
              用于在分页数据集中定位和切换页码。当前实现是自有 React 组件，不依赖 Ant Design 或 rc-pagination，
              覆盖受控/非受控、当前页语义、禁用态、快速跳转、每页条数切换和移动横向滚动。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；安全边界确认页码输入只归一化为数字，不拼接 URL 或执行外部脚本。
            </p>
          </header>

          <section className="button-doc-section" id="pagination-when" aria-labelledby="pagination-when-title">
            <h3 id="pagination-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>数据量较大，需要以页为单位请求、浏览或定位时使用。</li>
              <li>列表、表格、搜索结果和审计日志等重复数据视图适合使用 Pagination。</li>
              <li>只需要加载更多或无限滚动时，不应强行使用分页导航。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pagination-demos" aria-labelledby="pagination-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="pagination-demos-title">代码演示</h3>
              <p>示例展示当前组件已经支持的当前页、页码省略、禁用、快速跳转、每页条数、简洁模式和移动横滚。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="pagination-api" aria-labelledby="pagination-api-title">
            <h3 id="pagination-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="pagination-semantic" aria-labelledby="pagination-semantic-title">
            <h3 id="pagination-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="pagination-token" aria-labelledby="pagination-token-title">
            <h3 id="pagination-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="pagination-a11y" aria-labelledby="pagination-a11y-title">
            <h3 id="pagination-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>所有动作使用原生 button，可通过键盘聚焦和触发。</li>
              <li>当前页使用 aria-current=&quot;page&quot;，读屏用户能明确当前位置。</li>
              <li>快速跳转输入框提供 aria-label，并用表单提交触发跳转。</li>
              <li>每页条数使用原生 select，禁用态会随根 disabled 同步。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pagination-mobile" aria-labelledby="pagination-mobile-title">
            <h3 id="pagination-mobile-title">Mobile</h3>
            <ul className="button-doc-list">
              <li>页码列表不换行，窄容器下横向滚动，避免压缩数字或遮挡按钮。</li>
              <li>上一页和下一页在移动端保持固定可见，适合表格页脚和列表页脚。</li>
              <li>空间更紧张时使用 simple 模式，保留当前页状态和前后翻页。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="pagination-unsupported" aria-labelledby="pagination-unsupported-title">
            <div className="button-doc-section__heading">
              <h3 id="pagination-unsupported-title">扩展边界</h3>
              <p>安全边界：以下能力暂未作为可用 API 暴露，不应在业务中按已支持能力引用；分页值仍需服务端校验。</p>
            </div>
            <DataTable rows={unsupportedRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
