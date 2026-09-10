import { useState, type ReactNode } from "react";
import { Button, Segmented, Tag } from "../components/base";
import { DataToolbar } from "../components/business";
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

export type DataToolbarDocProps = {
  showAnchors?: boolean;
};

const noop = () => {};
const oneLineExample = `<DataToolbar title="Users" searchValue={query} onSearchChange={setQuery} />`;

export const dataToolbarDocMeta = {
  title: "DataToolbar 数据工具栏",
  category: "业务组件",
  anchors: [
    { id: "data-toolbar-when", label: "何时使用" },
    { id: "data-toolbar-demos", label: "代码演示" },
    { id: "data-toolbar-api", label: "API" },
    { id: "data-toolbar-states", label: "状态" },
    { id: "data-toolbar-semantic", label: "Semantic DOM" },
    { id: "data-toolbar-token", label: "Design Token" },
    { id: "data-toolbar-a11y", label: "a11y" },
    { id: "data-toolbar-mobile", label: "mobile" },
    { id: "data-toolbar-security", label: "security" },
    { id: "data-toolbar-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

function InteractiveToolbarDemo() {
  const [query, setQuery] = useState("release");
  const [density, setDensity] = useState("comfortable");
  const [message, setMessage] = useState("Ready for keyboard review.");

  return (
    <div className="data-toolbar-doc__interactive">
      <DataToolbar
        activeFilters={
          <>
            <Tag tone="subtle">status: ready</Tag>
            <Tag tone="subtle">owner: platform</Tag>
            <Tag tone="subtle">updated: 7d</Tag>
          </>
        }
        batchActions={[
          { id: "archive", label: "Archive", priority: "ghost" },
          { id: "assign", label: "Assign owner", priority: "secondary" },
        ]}
        batchLabel="3 selected"
        density={density === "compact" ? "compact" : "comfortable"}
        filters={
          <>
            <Button size="sm" variant="soft" onClick={() => setMessage("Filter entry opened.")}>
              Filters
            </Button>
            <Segmented
              aria-label="Status quick filter"
              options={[
                { label: "All", value: "all" },
                { label: "Ready", value: "ready" },
                { label: "Blocked", value: "blocked" },
              ]}
              size="sm"
              value="ready"
            />
          </>
        }
        primaryAction={{ id: "create", label: "Create item", priority: "primary" }}
        refreshAction={{
          ariaLabel: "Refresh deployment data",
          id: "refresh",
          label: "Refresh",
          priority: "ghost",
          onClick: () => setMessage("Refreshed current query."),
        }}
        resultCount={128}
        search={{
          placeholder: "Search deployments",
          showSubmit: true,
          value: query,
          onChange: setQuery,
          onSubmit: (value) => setMessage(`Submitted search: ${value || "empty"}.`),
        }}
        secondaryActions={[{ id: "export", label: "Export", priority: "secondary" }]}
        title="Deployments"
      />
      <div className="data-toolbar-doc__controls" aria-label="DataToolbar doc demo controls">
        <Segmented
          label="Density"
          onValueChange={setDensity}
          options={[
            { label: "Comfort", value: "comfortable" },
            { label: "Compact", value: "compact" },
          ]}
          size="sm"
          value={density}
        />
        <output aria-live="polite">{message}</output>
      </div>
    </div>
  );
}

function MobileToolbarDemo() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <DataToolbar
      activeFilters={
        <>
          <Tag tone="subtle">segment: enterprise-self-service</Tag>
          <Tag tone="subtle">region: north-america-east</Tag>
          <Tag tone="subtle">owner: platform-operations</Tag>
        </>
      }
      batchActions={[
        { id: "retry", label: "Retry selected workflows", priority: "secondary" },
        { id: "assign", label: "Assign owner", priority: "ghost" },
      ]}
      batchLabel="8 selected"
      filters={<Button size="sm" variant="soft">Advanced filters</Button>}
      mobileCollapsed={collapsed}
      mobileMode="wrap"
      mobileToggleLabel={collapsed ? "Show query controls" : "Hide query controls"}
      onMobileCollapsedChange={setCollapsed}
      primaryAction={{ id: "approve", label: "Approve batch", priority: "primary" }}
      refreshAction={{ ariaLabel: "Refresh approval queue", id: "refresh", label: "Refresh", priority: "ghost" }}
      resultLabel="246 queue items"
      search={{ placeholder: "Search workflow, owner, or account", showSubmit: true, onSubmit: noop }}
      title="Approval queue"
    />
  );
}

const demos: Demo[] = [
  {
    title: "生产一行验收",
    description: "同一条工具栏覆盖搜索、筛选入口、结果计数、刷新、批量动作、主次动作和活跃筛选。",
    preview: (
      <div className="data-toolbar-doc__one-line" aria-label="DataToolbar single row acceptance example">
        <DataToolbar
          activeFilters={
            <>
              <Tag tone="subtle">status: ready</Tag>
              <Tag tone="subtle">segment: enterprise</Tag>
              <Tag tone="subtle">owner: platform operations</Tag>
            </>
          }
          batchActions={[
            { id: "bulk-archive", label: "Archive", priority: "ghost" },
            { id: "bulk-label", label: "Add label", priority: "secondary" },
          ]}
          batchLabel="12 selected"
          filters={<Button size="sm" variant="soft">Filters</Button>}
          primaryAction={{ id: "new-view", label: "New view", priority: "primary" }}
          refreshAction={{ ariaLabel: "Refresh records", id: "refresh", label: "Refresh", priority: "ghost" }}
          resultLabel="1,284 records"
          search={{
            defaultValue: "release",
            placeholder: "Search records",
            showSubmit: true,
            onSubmit: noop,
          }}
          secondaryActions={[
            { id: "export", label: "Export", priority: "secondary" },
            { id: "density", label: "Density", priority: "ghost" },
          ]}
          title="Deployment records"
        />
      </div>
    ),
    code: `<DataToolbar title="Deployment records" resultLabel="1,284 records" search={{ defaultValue: "release", showSubmit: true }} filters={<Button size="sm">Filters</Button>} batchLabel="12 selected" batchActions={[{ id: "bulk-archive", label: "Archive" }]} refreshAction={{ id: "refresh", label: "Refresh", priority: "ghost" }} primaryAction={{ id: "new-view", label: "New view", priority: "primary" }} />`,
  },
  {
    title: "键盘与密度",
    description: "受控搜索、Enter 提交、按钮焦点、Segmented 方向键和密度切换在同一处可复核。",
    preview: <InteractiveToolbarDemo />,
    code: `<DataToolbar density="compact" search={{ value: query, onChange: setQuery, onSubmit: submit }} filters={<Segmented options={statusOptions} value="ready" />} refreshAction={{ id: "refresh", label: "Refresh", onClick: refresh }} />`,
  },
  {
    title: "溢出与状态",
    description: "长筛选、长动作、加载、错误和空态都在组件边界内换行，不依赖横向滚动。",
    preview: (
      <div className="data-toolbar-doc__state-stack">
        <DataToolbar
          activeFilters={
            <>
              <Tag tone="subtle">region: north-america-enterprise-east</Tag>
              <Tag tone="subtle">owner: platform-reliability-response</Tag>
            </>
          }
          batchActions={[{ id: "bulk-retry", label: "Retry selected failed jobs", priority: "secondary" }]}
          batchLabel="2 long-name rows selected"
          filters={<Button size="sm" variant="soft">Advanced filters</Button>}
          primaryAction={{ id: "dangerously-long-primary", label: "Create manual remediation task", priority: "primary" }}
          resultLabel="Filtered to 34 records"
          search={{ placeholder: "Search by request id, owner, or deployment name" }}
          secondaryActions={[{ id: "download", label: "Download current filtered result", priority: "ghost" }]}
          title="Long label review"
        />
        <DataToolbar loading loadingText="Refreshing deployment records..." search={{ placeholder: "Disabled while loading" }} title="Loading state" />
        <DataToolbar error="Data source rejected the current query." search={false} title="Error state" />
        <DataToolbar empty="No records match the current filters." search={false} title="Empty state" />
      </div>
    ),
    code: `<DataToolbar title="Long label review" resultLabel="Filtered to 34 records" search={{ placeholder: "Search by request id, owner, or deployment name" }} batchLabel="2 long-name rows selected" error={error} empty={empty} />`,
  },
  {
    title: "移动折叠与触控滚动",
    description: "移动端可折叠查询控制区；wrap 模式让长筛选和动作在组件内横向触控滚动，不制造页面横向溢出。",
    preview: <MobileToolbarDemo />,
    code: `<DataToolbar mobileMode="wrap" mobileCollapsed={collapsed} onMobileCollapsedChange={setCollapsed} search={{ placeholder: "Search workflow" }} activeFilters={<Tag>region: north-america-east</Tag>} batchLabel="8 selected" batchActions={[{ id: "retry", label: "Retry selected workflows" }]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "title / description / resultCount / resultLabel", value: "ReactNode", description: "建立工具栏上下文、查询口径和结果数量；resultLabel 可覆盖数字格式。" },
  { name: "search / searchValue / onSearchChange / onSearchSubmit", value: "DataToolbarSearch | false", description: "支持受控和非受控搜索；false 关闭搜索区，Enter 与提交按钮都走 onSubmit。" },
  { name: "filters / activeFilters", value: "ReactNode", description: "筛选入口和活跃筛选分区独立，适合组合自有 Button、Segmented、Tag 或业务面板触发器。" },
  { name: "primaryAction / secondaryActions / refreshAction", value: "DataToolbarAction", description: "主动作、次动作和刷新动作统一使用自有 Button；loading 时自动禁用；建议总动作保持在刷新、2 个次动作和 1 个主动作内。" },
  { name: "batchLabel / batchActions", value: "ReactNode / DataToolbarAction[]", description: "承载已选行数量和批量动作；选择模型仍由宿主表格或列表管理。" },
  { name: "actions", value: "ReactNode", description: "保留自定义动作槽，适合插入受控菜单、更多按钮或上下文开关。" },
  { name: "density / mobileMode", value: "comfortable | compact / wrap | stack", description: "控制业务密度和移动端收敛策略；wrap 让控制组在组件内触控滚动，stack 让动作全宽堆叠。" },
  { name: "mobileCollapsed / defaultMobileCollapsed", value: "boolean", description: "移动端折叠搜索、筛选、动作、批量和活跃筛选控制区；桌面仍保持完整工具栏扫描效率。" },
  { name: "mobileToggleLabel / onMobileCollapsedChange", value: "ReactNode / callback", description: "自定义移动端展开按钮文案并审计折叠状态变化；按钮通过 aria-controls 关联所有受控区域。" },
  { name: "loading / error / empty", value: "boolean / ReactNode", description: "组件边界内表达数据状态，loading 优先禁用搜索和内建动作。" },
];

const stateRows: DocRow[] = [
  { name: "ready", value: "search + filters + actions", description: "一行完成查询、筛选、刷新、结果计数和主次动作。" },
  { name: "selected", value: "batchLabel + batchActions", description: "批量动作区与主动作区分离，避免选择态挤掉查询入口。" },
  { name: "loading", value: "aria-busy + disabled actions", description: "根节点同步 aria-busy，搜索输入、提交和内建动作禁用，状态文本 role=status。" },
  { name: "error", value: "role=alert", description: "错误态在工具栏下方明确提示，不吞掉可见查询条件。" },
  { name: "empty", value: "role=status", description: "空态用于表达当前查询无结果，宿主仍可保留搜索与筛选入口。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "业务查询工具条作为独立区域；宿主可传 aria-label 或 aria-labelledby。" },
  { name: "search", value: "form[role=search]", description: "输入有 aria-label；提交按钮是原生 submit，Enter 行为可预测。" },
  { name: "actions", value: "div[aria-label]", description: "主动作区和批量动作区分组命名，读屏不会把两类操作混在一起。" },
  { name: "activeFilters", value: "div[aria-label=Active filters]", description: "活跃筛选独立可达，Tag 文案可完整朗读。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白底、细边框、低阴影，保持 neutral minimal 中性业务界面。" },
  { name: "radius", value: "8px max", description: "工具栏边界和文档 demo 保持小圆角，不做营销卡片式膨胀。" },
  { name: "density", value: "14px / 10px padding", description: "comfortable 用于页面顶部查询区，compact 用于表格上方高频工具条。" },
  { name: "wrap", value: "minmax + overflow-wrap", description: "长搜索、长筛选和长动作允许换行，移动端不制造横向页面滚动。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "DataToolbar 独立承担数据查询工具条，不合并 Toolbar/FilterPanel；批量选择由宿主管理。" },
  { name: "UI 专家", value: "通过", description: "桌面一行可扫描，360px/390px/430px 收敛为单列；搜索、筛选、批量、刷新和动作层级清楚。" },
  { name: "研发专家", value: "通过", description: "只消费自有 Button、Input、Segmented、Tag；未引入 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "文档样例覆盖搜索、筛选入口、批量、密度、刷新、溢出、loading/error/empty 和键盘路径。" },
  { name: "白帽专家", value: "通过", description: "组件不执行动态字符串、不解析外部 HTML；自定义槽位是显式 ReactNode，由宿主控制可信来源。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack data-toolbar-doc-demo">{preview}</div>
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

export function DataToolbarDoc({ showAnchors = false }: DataToolbarDocProps) {
  return (
    <TutorialScaffold component="DataToolbar" kind="action" oneLineExample={oneLineExample}>
    <section className="button-doc data-toolbar-doc" aria-labelledby="data-toolbar-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="DataToolbar 文档目录">
            {dataToolbarDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component</p>
            <h2 id="data-toolbar-doc-title">{dataToolbarDocMeta.title}</h2>
            <p>
              DataToolbar 是生产级数据查询工具栏，用于把搜索、筛选入口、结果计数、刷新、批量动作和数据状态放在一个稳定边界内。
              它不是基础 Toolbar 的别名，也不把 FilterPanel 合并进来。
            </p>
          </header>

          <section className="button-doc-section" id="data-toolbar-when" aria-labelledby="data-toolbar-when-title">
            <h3 id="data-toolbar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于表格、列表、审计日志、任务队列等数据视图顶部。</li>
              <li>需要同时表达搜索、筛选入口、结果计数、刷新、主次动作或批量动作时使用。</li>
              <li>只需要通用图标按钮排列时，使用基础 Toolbar。</li>
              <li>需要展开结构化筛选字段时，使用独立 FilterPanel，并由 DataToolbar 的筛选入口触发。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="data-toolbar-demos" aria-labelledby="data-toolbar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="data-toolbar-demos-title">代码演示</h3>
              <p>示例覆盖生产一行、搜索提交、筛选入口、批量动作、密度、刷新、溢出和完整状态。</p>
            </div>
            <div className="button-doc-demo-grid data-toolbar-doc__demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="data-toolbar-api" aria-labelledby="data-toolbar-api-title">
            <h3 id="data-toolbar-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="data-toolbar-states" aria-labelledby="data-toolbar-states-title">
            <h3 id="data-toolbar-states-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="data-toolbar-semantic" aria-labelledby="data-toolbar-semantic-title">
            <h3 id="data-toolbar-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="data-toolbar-token" aria-labelledby="data-toolbar-token-title">
            <h3 id="data-toolbar-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="data-toolbar-a11y" aria-labelledby="data-toolbar-a11y-title">
            <h3 id="data-toolbar-a11y-title">a11y</h3>
            <p>
              搜索使用 <code>form role=search</code>，Enter 会触发提交；刷新、主动作、批量动作都是原生按钮。
              loading 时根节点带 <code>aria-busy</code>，错误使用 <code>role=alert</code>，空态和加载使用 <code>role=status</code>。
              Segmented 快捷筛选支持方向键、Home 和 End。
            </p>
          </section>

          <section className="button-doc-section" id="data-toolbar-mobile" aria-labelledby="data-toolbar-mobile-title">
            <h3 id="data-toolbar-mobile-title">mobile</h3>
            <p>
              360px、390px 与 430px 下，标题和结果计数保持可见，控制区可通过移动端按钮折叠或展开。
              wrap 模式让筛选、动作、批量和活跃条件在组件内部横向触控滚动；stack 模式则全宽纵向堆叠。
              按钮高度保持 40px 以上，长标签限制在组件边界内，避免页面横向滚动。
            </p>
          </section>

          <section className="button-doc-section" id="data-toolbar-security" aria-labelledby="data-toolbar-security-title">
            <h3 id="data-toolbar-security-title">security</h3>
            <p>
              DataToolbar 不使用 dangerouslySetInnerHTML，不解析外部 HTML，也不执行字符串代码。
              search value 只作为输入值传递，自定义 filters/actions 槽位由宿主显式传入可信 ReactNode。
              DataToolbarAction 和根属性都拒绝 dangerouslySetInnerHTML，且不依赖 antd、antd-mobile 或 @ant-design/charts。
            </p>
          </section>

          <section className="button-doc-section" id="data-toolbar-review" aria-labelledby="data-toolbar-review-title">
            <h3 id="data-toolbar-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
