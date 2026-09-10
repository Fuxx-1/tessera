import type { ReactNode } from "react";
import { Input, Segmented, Switch } from "../components/base";
import { FilterPanel } from "../components/business";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
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

export type FilterPanelDocProps = {
  showAnchors?: boolean;
};

const noop = () => {};
const unsafeFilterText = "<img src=x onerror=alert(1)>";
const oneLineExample = `<FilterPanel title="Deployment filters" activeCount={3} fields={fields} onApply={applyFilters} onReset={resetFilters} />`;

export const filterPanelDocMeta = {
  title: "FilterPanel 筛选面板",
  category: "业务组件",
  anchors: [
    { id: "filter-panel-when", label: "何时使用" },
    { id: "filter-panel-demos", label: "代码演示" },
    { id: "filter-panel-api", label: "API" },
    { id: "filter-panel-states", label: "状态" },
    { id: "filter-panel-semantic", label: "Semantic DOM" },
    { id: "filter-panel-token", label: "Design Token" },
    { id: "filter-panel-mobile", label: "mobile" },
    { id: "filter-panel-security", label: "security" },
    { id: "filter-panel-review", label: "五专家结论" },
    { id: "filter-panel-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "筛选一行验收",
    description: "同一个 FilterPanel 覆盖文本、分段展示、开关、活跃计数、应用和重置动作；移动端收敛为单列。",
    preview: (
      <div className="filter-panel-doc__one-line" aria-label="FilterPanel single row acceptance example">
        <FilterPanel
          activeCount={3}
          description="Combine stable field layout, status copy, and submit/reset controls without owning the data model."
          fields={[
            {
              id: "filter-owner",
              label: "Owner",
              control: <Input id="filter-owner" name="owner" defaultValue="platform" />,
              help: "Text controls are provided by the host form.",
            },
            {
              id: "filter-status",
              label: "Status",
              control: (
                <Segmented
                  aria-label="Deployment status"
                  options={[
                    { label: "All", value: "all" },
                    { label: "Ready", value: "ready" },
                    { label: "Blocked", value: "blocked" },
                  ]}
                  value="ready"
                />
              ),
            },
            {
              id: "filter-region",
              label: "Region",
              control: <Input id="filter-region" name="region" defaultValue="ap-southeast-1" />,
              span: 2,
            },
            {
              id: "filter-critical",
              label: "Critical only",
              control: <Switch id="filter-critical" label="Only incidents with customer impact" name="critical" />,
              span: 2,
            },
            {
              id: "filter-long-field",
              label: `Very long owner label ${unsafeFilterText} with regional audit scope`,
              control: (
                <Input
                  id="filter-long-field"
                  name="longField"
                  defaultValue={`mobile-release-window-${unsafeFilterText}-north-america-enterprise-escalation`}
                />
              ),
              help: "Long label/value content wraps inside the field without creating page overflow.",
              span: 2,
            },
          ]}
          onApply={noop}
          onReset={noop}
          title="Deployment filters"
        />
      </div>
    ),
    code: `<FilterPanel title="Deployment filters" activeCount={3} fields={[{ id: "filter-owner", label: "Owner", control: <Input id="filter-owner" name="owner" /> }, { id: "filter-status", label: "Status", control: <Segmented options={statusOptions} value="ready" /> }, { id: "filter-long-field", label: \`Very long owner label \${unsafeFilterText}\`, control: <Input id="filter-long-field" name="longField" defaultValue={unsafeFilterText} />, span: 2 }]} onApply={(formData) => applyFilters(formData)} onReset={resetFilters} />`,
  },
  {
    title: "折叠和移动策略",
    description: "collapsible 提供可审计的展开状态；drawer-ready 只改变布局契约，不创建全局弹层副作用。",
    preview: (
      <FilterPanel
        activeCount={2}
        collapsible
        defaultCollapsed
        description="Collapsed content remains owned by the filter form and can be reopened without losing uncontrolled values."
        fields={[
          { id: "filter-team", label: "Team", control: <Input id="filter-team" name="team" defaultValue="console" /> },
          { id: "filter-priority", label: "Priority", control: <Input id="filter-priority" name="priority" defaultValue="p1" /> },
        ]}
        mobileMode="drawer-ready"
        onApply={noop}
        onReset={noop}
        title="Incident filters"
      />
    ),
    code: `<FilterPanel collapsible defaultCollapsed mobileMode="drawer-ready" fields={incidentFields} onApply={applyFilters} onReset={resetFilters} />`,
  },
  {
    title: "状态和字段错误",
    description: "加载、错误、空态和字段级错误都在面板内具备明确语义，不需要业务方另造状态壳。",
    preview: (
      <div className="filter-panel-doc__states">
        <FilterPanel loading loadingText="Loading saved filters" title="Loading state" />
        <FilterPanel error="Filter schema service is unavailable." title="Error state" />
        <FilterPanel empty="No filters are configured for this view." title="Empty state" />
        <FilterPanel
          fields={[
            {
              id: "filter-invalid-window",
              label: "Window",
              control: <Input id="filter-invalid-window" name="window" defaultValue="99 days" error />,
              error: "Window must be 30 days or less.",
            },
          ]}
          title="Field error"
        />
      </div>
    ),
    code: `<FilterPanel loading loadingText="Loading saved filters" /><FilterPanel error="Filter schema service is unavailable." /><FilterPanel empty="No filters are configured for this view." /><FilterPanel fields={[{ id: "window", label: "Window", control: <Input error />, error: "Window must be 30 days or less." }]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title / description", value: "ReactNode", description: "命名筛选区域并解释当前筛选口径；title 默认渲染为 h2。" },
  { name: "fields", value: "FilterPanelField[]", description: "结构化字段入口；每项需要稳定 id、label、control，可选 help、error、required 和 span。" },
  { name: "children", value: "ReactNode", description: "保留自定义字段槽，用于组合复杂但仍受业务方控制的控件。" },
  { name: "activeCount", value: "number", description: "显示活跃筛选数量，不负责计算筛选模型。" },
  { name: "columns", value: "1 | 2", description: "桌面字段列数；移动断点统一收敛，span=2 可横跨两列。" },
  { name: "collapsible / collapsed / defaultCollapsed", value: "boolean", description: "支持受控和非受控折叠；aria-controls 与 aria-expanded 自动关联内容区域。" },
  { name: "mobileMode", value: "stack | drawer-ready", description: "声明移动端布局策略；drawer-ready 只提供结构，不内置全局 Drawer。" },
  { name: "onApply", value: "(formData: FormData) => void", description: "提交时返回原生 FormData；字段值、校验和跨字段联动归宿主管理。" },
  { name: "onReset", value: "() => void", description: "触发宿主重置；组件只渲染按钮，不修改外部筛选状态。" },
  { name: "loading / error / empty", value: "boolean / ReactNode", description: "面板边界内表达数据状态；loading 优先级最高。" },
];

const stateRows: DocRow[] = [
  { name: "ready", value: "section > form", description: "字段、帮助、错误和 footer 都在同一个 form 边界内。" },
  { name: "collapsed", value: "aria-expanded=false", description: "折叠时隐藏 form 内容，但 header、activeCount 和展开按钮保持可达。" },
  { name: "loading", value: "aria-busy + role=status", description: "根节点同步 aria-busy，加载骨架带 loadingText。" },
  { name: "error", value: "role=alert", description: "面板级错误优先于字段和空态，阻断不可信 schema 渲染。" },
  { name: "empty", value: "role=status", description: "无字段且无 children 时展示可读空态。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "筛选区域是独立业务区块，不与 DataToolbar 合并成一个不可拆组件。" },
  { name: "form", value: "form", description: "提交使用原生 FormData，便于宿主做校验、持久化和审计。" },
  { name: "field", value: "label + control + help/error", description: "字段 label 通过 htmlFor 连接具体控件；字段错误使用 role=alert。" },
  { name: "actions", value: "footer buttons", description: "应用和重置动作使用自有 Button，loading 或禁用时自动阻断提交。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白业务面和细边框，保持 neutral minimal 工具面板质感。" },
  { name: "field gap", value: "12px / 16px", description: "字段之间保持可扫描间距，移动端不依赖横向滚动。" },
  { name: "radius", value: "8px max", description: "面板和内部控件遵循 8px 以内圆角约束。" },
  { name: "active count", value: "subtle badge text", description: "活跃数量是状态提示，不使用高饱和主色。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "FilterPanel 独立承担结构化筛选面板、应用/重置动作、活动条件计数和状态提示，不与 DataToolbar、Form 或 Drawer 合并。" },
  { name: "UI 专家", value: "通过", description: "桌面两列可扫描，360px/390px/430px 收敛为单列；长标签、chips、错误和 footer 不撑破容器。" },
  { name: "研发专家", value: "通过", description: "只消费 React、自有 Button 和基础控件，提交走原生 FormData；未引入 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "smoke:filter-panel 覆盖 desktop + mobile 360/390/430、折叠、FormData、重置、长字段、无横向 overflow 和无未定义占位文本。" },
  { name: "白帽专家", value: "通过", description: "组件按 ReactNode 渲染 label/value/options，不解析 HTML 字符串；危险文本样例按普通文本展示，不上传或读取文件。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack filter-panel-doc-demo">{preview}</div>
    </DemoContainer>
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

export function FilterPanelDoc({ showAnchors = false }: FilterPanelDocProps) {
  return (
    <TutorialScaffold component="FilterPanel" kind="data-entry" oneLineExample={oneLineExample}>
      <section className="button-doc filter-panel-doc" aria-labelledby="filter-panel-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="FilterPanel 文档目录">
              {filterPanelDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">business component</p>
              <h2 id="filter-panel-doc-title">{filterPanelDocMeta.title}</h2>
              <p>
                FilterPanel 是生产级业务筛选面板，用于承载结构化字段、活跃计数、提交/重置动作和面板状态。
                它不是 Form、DataToolbar 或 Drawer 的合并页，筛选数据模型仍由宿主业务显式管理。
              </p>
            </header>

            <section className="button-doc-section" id="filter-panel-when" aria-labelledby="filter-panel-when-title">
              <h3 id="filter-panel-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>用于表格、列表、运营视图和审计页面中的结构化筛选区域。</li>
                <li>需要统一标题、说明、活跃数量、折叠、状态和提交/重置动作时使用 FilterPanel。</li>
                <li>只需要顶部搜索和动作入口时使用 DataToolbar；只需要普通字段布局时使用 Form。</li>
                <li>需要移动端弹层容器时，可由宿主把 FilterPanel 放入 Drawer，而不是让 FilterPanel 自己创建全局弹层。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="filter-panel-demos" aria-labelledby="filter-panel-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="filter-panel-demos-title">代码演示</h3>
                <p>示例覆盖一行验收、折叠、移动策略、字段错误和加载/错误/空态。</p>
              </div>
              <div className="button-doc-demo-grid filter-panel-doc__demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="filter-panel-api" aria-labelledby="filter-panel-api-title">
              <h3 id="filter-panel-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="filter-panel-states" aria-labelledby="filter-panel-states-title">
              <h3 id="filter-panel-states-title">状态</h3>
              <DataTable rows={stateRows} />
            </section>

            <section className="button-doc-section" id="filter-panel-semantic" aria-labelledby="filter-panel-semantic-title">
              <h3 id="filter-panel-semantic-title">Semantic DOM / a11y</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="filter-panel-token" aria-labelledby="filter-panel-token-title">
              <h3 id="filter-panel-token-title">Design Token</h3>
              <DataTable rows={tokenRows} />
            </section>

            <section className="button-doc-section" id="filter-panel-mobile" aria-labelledby="filter-panel-mobile-title">
              <h3 id="filter-panel-mobile-title">mobile</h3>
              <ul className="button-doc-list">
                <li>360px/390px/430px 下字段和 footer 收敛为单列，不要求页面横向滚动。</li>
                <li>触摸目标来自自有 Button、Input、Segmented 和 Switch 控件，至少保持可点按尺寸。</li>
                <li>mobileMode="drawer-ready" 只声明适配形态；宿主负责真正的 Drawer、safe-area 和焦点隔离。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="filter-panel-security" aria-labelledby="filter-panel-security-title">
              <h3 id="filter-panel-security-title">security</h3>
              <ul className="button-doc-list">
                <li>字段值通过 FormData 暴露给宿主，不在组件内拼接 URL、执行脚本或发起网络请求。</li>
                <li>字段 label、value、options 作为 React 文本或节点渲染；危险字符串只会作为文本显示，不会被当作 HTML 执行。</li>
                <li>长 label/value/options 和 {unsafeFilterText} 类危险文本必须留在文本节点中，不能撑破字段或生成真实 HTML 元素。</li>
                <li>title、description、help、error 和 custom control 都是 ReactNode，不解析字符串 HTML。</li>
                <li>onApply/onReset 是显式事件边界，组件不自动保存筛选、不上传数据、不写入外部存储。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="filter-panel-review" aria-labelledby="filter-panel-review-title">
              <h3 id="filter-panel-review-title">五专家结论</h3>
              <DataTable rows={reviewRows} />
            </section>

            <section className="button-doc-section" id="filter-panel-gaps" aria-labelledby="filter-panel-gaps-title">
              <h3 id="filter-panel-gaps-title">缺口</h3>
              <ul className="button-doc-list">
                <li>不内置字段 schema、跨字段校验、保存视图、权限过滤或 URL query 同步。</li>
                <li>不内置 Drawer 弹层、日期范围、远程 options 或高级表达式编辑器。</li>
                <li>大规模字段分组、字段搜索和虚拟化需要由业务筛选构建器补充。</li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
