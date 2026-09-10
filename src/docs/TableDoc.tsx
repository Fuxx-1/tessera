import type { ReactNode } from "react";
import { Button, ConfigProvider, Table, Tag, type TableColumn, type TagTone } from "../components/base";
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

type ReleaseRow = {
  id: string;
  service: string;
  owner: string;
  status: "Ready" | "Running" | "Blocked";
  latency: string;
  updated: string;
};

type IncidentRow = {
  id: string;
  service: string;
  summary: string;
  age: string;
};

type TextSafetyRow = {
  id: string;
  field: string;
  value: string;
  owner: string;
};

type ScaleRow = {
  id: string;
  job: string;
  owner: string;
  shard: string;
};

export type TableDocProps = {
  showAnchors?: boolean;
};

export const tableDocMeta = {
  title: "Table 表格",
  category: "基础组件",
  anchors: [
    { id: "table-when", label: "何时使用" },
    { id: "table-demos", label: "代码演示" },
    { id: "table-api", label: "API" },
    { id: "table-column", label: "Column" },
    { id: "table-row-key", label: "rowKey" },
    { id: "table-state", label: "状态" },
    { id: "table-review", label: "生产复核" },
    { id: "table-interaction", label: "交互边界" },
    { id: "table-semantic", label: "Semantic DOM" },
    { id: "table-token", label: "Design Token" },
    { id: "table-a11y", label: "可访问性" },
    { id: "table-mobile", label: "响应式" },
    { id: "table-performance", label: "性能" },
    { id: "table-security", label: "安全" },
    { id: "table-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const releaseRows: ReleaseRow[] = [
  { id: "api", service: "API Gateway", owner: "Platform", status: "Ready", latency: "48 ms", updated: "09:42" },
  { id: "worker", service: "Sync Worker", owner: "Data", status: "Running", latency: "116 ms", updated: "09:37" },
  { id: "billing", service: "Billing Core", owner: "Revenue", status: "Blocked", latency: "304 ms", updated: "09:18" },
];

const incidentRows: IncidentRow[] = [
  {
    id: "inc-4821",
    service: "Billing Core",
    summary:
      "Customer export request retained queue ownership across region failover because retry metadata was not compacted before replay.",
    age: "26 min",
  },
  {
    id: "inc-4822",
    service: "Realtime Sync",
    summary:
      "A single tenant emitted an unusually long stream identifier: tenant-prod-us-east-1-analytics-rollup-sync-worker-shard-0004096.",
    age: "9 min",
  },
];

const textSafetyRows: TextSafetyRow[] = [
  {
    id: "safe-text",
    field: "Customer note",
    value: '<script>alert("owned")</script>',
    owner: "Support",
  },
];

const scaleRows: ScaleRow[] = Array.from({ length: 24 }, (_, index) => ({
  id: `scale-${index + 1}`,
  job: `Backfill shard ${String(index + 1).padStart(2, "0")}`,
  owner: index % 2 === 0 ? "Data Platform" : "Billing Analytics",
  shard: `tenant-prod-us-east-1-analytics-rollup-shard-${String(index + 1).padStart(5, "0")}`,
}));

function getReleaseTone(status: ReleaseRow["status"]): TagTone {
  if (status === "Ready") {
    return "strong";
  }

  return status === "Blocked" ? "subtle" : "neutral";
}

const releaseColumns: Array<TableColumn<ReleaseRow>> = [
  {
    key: "service",
    title: "Service",
    dataIndex: "service",
    scope: "row",
    render: (value) => <strong>{value as string}</strong>,
  },
  { key: "owner", title: "Owner", dataIndex: "owner" },
  {
    key: "status",
    title: "Status",
    dataIndex: "status",
    render: (value) => (
      <Tag tone={getReleaseTone(value as ReleaseRow["status"])}>{value as string}</Tag>
    ),
  },
  { key: "latency", title: "Latency", dataIndex: "latency", align: "right" },
  { key: "updated", title: "Updated", dataIndex: "updated", align: "right" },
];

const wideColumns: Array<TableColumn<ReleaseRow>> = [
  ...releaseColumns,
  { key: "region", title: "Region", render: () => "us-east-1", width: 140 },
  {
    key: "deploy",
    title: "Deployment identifier with unusually long release header",
    render: (_, record) => `${record.id}-2026-06-07`,
    width: 260,
  },
  { key: "action", title: "Action", render: () => <Button size="sm">Review</Button>, width: 120 },
];

const incidentColumns: Array<TableColumn<IncidentRow>> = [
  { key: "service", title: "Service", dataIndex: "service", scope: "row", width: 150 },
  { key: "summary", title: "Summary", dataIndex: "summary", textWrap: "wrap", width: 420 },
  { key: "age", title: "Age", dataIndex: "age", align: "right", width: 96 },
];

const textSafetyColumns: Array<TableColumn<TextSafetyRow>> = [
  { key: "field", title: "Field", dataIndex: "field", scope: "row", width: 150 },
  { key: "value", title: "Value", dataIndex: "value", textWrap: "wrap", width: 280 },
  { key: "owner", title: "Owner", dataIndex: "owner", align: "right", width: 120 },
];

const scaleColumns: Array<TableColumn<ScaleRow>> = [
  { key: "job", title: "Job", dataIndex: "job", scope: "row", width: 170 },
  { key: "owner", title: "Owner", dataIndex: "owner", width: 150 },
  { key: "shard", title: "Shard key", dataIndex: "shard", textWrap: "truncate", width: 320 },
];

const demos: Demo[] = [
  {
    title: "基础表格",
    description: "columns 描述列，data 提供行，rowKey 必填并稳定映射到每一行。",
    preview: (
      <Table
        caption="Release health summary"
        columns={releaseColumns}
        data={releaseRows}
        rowKey="id"
        scrollLabel="Release health summary columns"
      />
    ),
    code: `<Table caption="Release health summary" columns={columns} data={rows} rowKey="id" />`,
  },
  {
    title: "长表头、横向滚动与 sticky 表头",
    description: "窄屏、多列数据和长表头使用 scrollX，滚动容器有可访问名称并可键盘聚焦。",
    preview: (
      <Table
        caption="Wide deployment table"
        columns={wideColumns}
        data={releaseRows}
        rowKey={(record) => record.id}
        scrollLabel="Wide deployment table columns"
        scrollX={1080}
        stickyHeader
      />
    ),
    code: `<Table caption="Wide deployment table" columns={wideColumns} data={rows} rowKey={(record) => record.id} scrollLabel="Wide deployment table columns" scrollX={1080} stickyHeader />`,
  },
  {
    title: "紧凑密度",
    description: "compact 适合弹层、侧栏和高频扫描区域，不改变表格语义。",
    preview: (
      <Table
        caption="Compact release summary"
        density="compact"
        columns={releaseColumns}
        data={releaseRows.slice(0, 2)}
        rowKey="id"
      />
    ),
    code: `<Table density="compact" columns={columns} data={rows} rowKey="id" />`,
  },
  {
    title: "空状态",
    description: "无数据时在 tbody 中渲染跨列状态单元格，保持表头和 caption 可见。",
    preview: <Table caption="Empty release queue" columns={releaseColumns} data={[]} rowKey="id" emptyText="No releases queued" />,
    code: `<Table caption="Empty release queue" columns={columns} data={[]} rowKey="id" emptyText="No releases queued" />`,
  },
  {
    title: "超长文本",
    description: "列可用 textWrap 控制 wrap、truncate 或默认 nowrap；生产宽表仍优先由 scrollX 保持字段可读。",
    preview: (
      <Table
        caption="Active incident notes"
        columns={incidentColumns}
        data={incidentRows}
        rowKey="id"
        scrollLabel="Active incident note columns"
        scrollX={720}
      />
    ),
    code: `<Table caption="Active incident notes" columns={columns} data={rows} rowKey="id" scrollX={720} />`,
  },
  {
    title: "一行样例与文本安全",
    description: "单行数据也保持 caption、rowKey、scope=row 和 React 文本转义；不把字符串当 HTML 执行。",
    preview: (
      <Table
        caption="Single row text safety sample"
        columns={textSafetyColumns}
        data={textSafetyRows}
        rowKey="id"
        scrollLabel="Single row text safety columns"
        scrollX={560}
      />
    ),
    code: `<Table caption="Single row text safety sample" columns={columns} data={[row]} rowKey="id" />`,
  },
  {
    title: "加载状态",
    description: "loading 使用 aria-busy 和 role=status，表格结构不被替换。",
    preview: <Table caption="Loading release queue" columns={releaseColumns} data={[]} rowKey="id" loading loadingText="Loading releases" />,
    code: `<Table caption="Loading release queue" columns={columns} data={[]} rowKey="id" loading loadingText="Loading releases" />`,
  },
  {
    title: "错误状态",
    description: "error 使用 role=alert，业务可以传入可读文本或受控重试操作。",
    preview: (
      <Table
        caption="Release health summary"
        columns={releaseColumns}
        data={releaseRows}
        rowKey="id"
        error={
          <span>
            Failed to load release health. <Button size="sm">Retry</Button>
          </span>
        }
      />
    ),
    code: `<Table caption="Release health summary" columns={columns} data={rows} rowKey="id" error={<span>Failed to load release health. <Button size="sm">Retry</Button></span>} />`,
  },
  {
    title: "暗色主题",
    description: "在 ConfigProvider dark 边界中保持表头、行分隔、hover 和状态色可读；结构尺寸不由主题覆盖。",
    preview: (
      <ConfigProvider className="table-doc-dark-surface" theme="dark">
        <Table
          caption="Dark theme release health"
          columns={releaseColumns}
          data={releaseRows.slice(0, 2)}
          rowKey="id"
          scrollLabel="Dark theme release health columns"
        />
      </ConfigProvider>
    ),
    code: `<ConfigProvider theme="dark"><Table caption="Dark theme release health" columns={columns} data={rows} rowKey="id" /></ConfigProvider>`,
  },
  {
    title: "大数据边界",
    description: "maxVisibleRows 是保护阀，不是分页；超出预算时只渲染前 N 行并公告截断状态。",
    preview: (
      <Table
        caption="Large data render budget sample"
        columns={scaleColumns}
        data={scaleRows}
        maxVisibleRows={8}
        rowKey="id"
        scrollLabel="Large data render budget columns"
        scrollX={720}
      />
    ),
    code: `<Table caption="Large data render budget sample" columns={columns} data={rows} maxVisibleRows={8} rowKey="id" scrollX={720} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "columns", value: "TableColumn<T>[]", description: "必填。声明列顺序和列语义；它不会在移动端自动改成卡片，也不会从 data 推断字段。" },
  { name: "data", value: "T[]", description: "必填。只传当前页、当前筛选或当前排序后的行；Table 不内置排序、筛选、分页或远程请求。" },
  { name: "rowKey", value: "keyof T | (record, index) => string | number", description: "必填。每行稳定 key，避免 React 重排错误和读屏上下文跳动。" },
  { name: "caption", value: "ReactNode", description: "表格标题或摘要，渲染为原生 caption。" },
  { name: "density", value: '"comfortable" | "compact"', description: "行高和内边距密度，默认 comfortable。" },
  { name: "loading / loadingText", value: "boolean / ReactNode", description: "加载状态。设置 aria-busy，并在 tbody 内渲染 role=status。" },
  { name: "error", value: "ReactNode", description: "错误状态。优先级高于 loading 和 empty，渲染 role=alert。" },
  { name: "emptyText", value: "ReactNode", description: "空状态文案，默认 No rows。" },
  { name: "scrollX", value: "boolean | number | string", description: "横向滚动控制。true 使用内容宽度，number 转 px，string 作为 min-inline-size；滚动发生在组件 scroller 内。" },
  { name: "scrollLabel", value: "string", description: "横向滚动 region 的可访问名称，默认 Scrollable table region。" },
  { name: "stickyHeader", value: "boolean", description: "让 th 在滚动容器内 sticky top。适合长表格和宽表格。" },
  { name: "maxVisibleRows", value: "number", description: "渲染行数上限，默认使用 UI_RENDER_BUDGETS.tableRows。超出时展示截断提示，避免数万行一次性阻塞页面。" },
  { name: "getRowProps", value: "(record, index) => safe tr props", description: "给行补充 aria、data-*、className 或事件；不开放 children 与 dangerouslySetInnerHTML。" },
  { name: "rowClassName", value: "string | function", description: "行 className。函数模式可根据 record 和 index 返回样式。" },
  { name: "TableHTMLAttributes", value: "table attributes", description: "透传原生 table 属性，例如 aria-label、aria-describedby、id 和 data-*；children 与 dangerouslySetInnerHTML 被排除。" },
];

const columnRows: DocRow[] = [
  { name: "key", value: "string", description: "必填。列的稳定标识。" },
  { name: "title", value: "ReactNode", description: "必填。列头内容。" },
  { name: "dataIndex", value: "keyof T", description: "从 record 中读取单元格值；复杂内容使用 render。" },
  { name: "render", value: "(value, record, index) => ReactNode", description: "返回 React 节点，组件不解析 HTML 字符串。" },
  { name: "align", value: '"left" | "center" | "right"', description: "设置列头和单元格文本对齐，数字列通常 right。" },
  { name: "width", value: "number | string", description: "设置列宽；配合 scrollX 让宽表格在窄屏保持可读。" },
  { name: "minWidth / maxWidth", value: "number | string", description: "设置列的最小/最大宽度；长列可配合 textWrap=wrap 在移动端保持可读。" },
  { name: "className / headerClassName", value: "string", description: "分别作用于数据单元格和列头，用于受控的局部样式。" },
  { name: "ariaLabel", value: "string", description: "给图标列、操作列等非文本列头补充可访问名称。" },
  { name: "scope", value: '"col" | "row"', description: "默认列头；实体名称列可设为 row，输出 th scope=row。" },
  { name: "textWrap", value: '"nowrap" | "wrap" | "truncate"', description: "控制单元格长文本策略。基础样式允许连续文本断行；nowrap 用于短值，wrap 用于说明列，truncate 单行省略。" },
  { name: "getCellProps", value: "(value, record, index) => safe td props", description: "补充 aria、data-*、title、className、style 或事件；不开放 children 与 dangerouslySetInnerHTML。" },
  { name: "headerProps", value: "safe th props", description: "补充列头 aria、data-*、className、style 或 scope；不开放 children 与 dangerouslySetInnerHTML，内部会合并列宽与对齐。" },
];

const rowKeyRows: DocRow[] = [
  { name: "推荐", value: 'rowKey="id"', description: "后端稳定 id、slug、code 等字段是首选。" },
  { name: "可接受", value: "rowKey={(record) => record.id}", description: "需要组合字段或转换类型时使用函数。" },
  { name: "避免", value: "index only", description: "仅用 index 会在排序、插入、删除后造成状态串行，除非数据永远静态。" },
];

const stateRows: DocRow[] = [
  { name: "error", value: "最高优先级", description: "请求失败时覆盖数据行，避免用户误读旧数据。" },
  { name: "loading", value: "第二优先级", description: "设置 aria-busy，状态单元格跨越所有列。" },
  { name: "empty", value: "data.length === 0", description: "无错误且未加载时显示 Empty，保留表头说明数据结构。" },
  { name: "ready", value: "data rows", description: "正常数据行由 columns 顺序渲染，scope=row 的列会输出行头。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "data / rowKey", description: "确认数据扫描路径清晰；排序和分页不由 Table 隐式接管，交给业务层组合。" },
  { name: "UI", value: "density / align / empty", description: "核对 comfortable 与 compact 密度、数字右对齐、空状态保留表头与 caption。" },
  { name: "研发", value: "scrollX / maxVisibleRows", description: "覆盖大数据渲染上限、横向滚动、导出前置的数据归属；Table 只渲染当前 data。" },
  { name: "测试", value: "desktop / 360 / 390 / 430", description: "验收脚本覆盖桌面和移动窄屏，检查无页面级横向 overflow。" },
  { name: "白帽", value: "ReactNode / ARIA", description: "确认单元格字符串不作为 HTML 执行，滚动 region、caption、scope 与状态 ARIA 可读。" },
];

const semanticRows: DocRow[] = [
  { name: "wrapper", value: "div.c-table-wrap", description: "视觉边框和滚动裁切容器。" },
  { name: "scroller", value: 'div[role="region"]', description: "scrollX 开启时可聚焦并使用 scrollLabel 命名，便于键盘横向滚动。" },
  { name: "root", value: "table", description: "保留原生 table 语义，caption、thead、tbody、th、td 全部真实存在。" },
  { name: "caption", value: "caption", description: "表格名称或摘要，优先于外部纯文本标题。" },
  { name: "column header", value: 'th[scope="col"]', description: "默认列头语义，column.scope 可改为 row 用于第一列行头。" },
  { name: "state row", value: "tr > td[colSpan]", description: "loading、empty、error 在 tbody 中跨列渲染，不移除表头。" },
];

const tokenRows: DocRow[] = [
  { name: "theme style", value: "--ct-surface / --ct-surface-muted", description: "表格面、表头、hover 与暗色主题读取语义 token，不在组件里写死浅色。" },
  { name: "theme style", value: "--ct-text / --ct-text-secondary", description: "正文、行头、caption 和表头文字跟随亮/暗主题保持对比度。" },
  { name: "theme style", value: "--ct-border / --ct-focus-ring", description: "外框、行分隔和 scroller focus ring 使用全局主题边界。" },
  { name: "structure style", value: "table-layout / scrollX", description: "列宽、内部横向滚动、stickyHeader 和截断策略属于结构样式，不由主题改变。" },
  { name: "structure style", value: "density / padding", description: "comfortable 与 compact 控制行高和内边距；移动端可选 compact，但不牺牲字号可读性。" },
  { name: "structure style", value: "radius <= 8px", description: "表格外层使用克制圆角，避免工具型数据表变成营销卡片。" },
];

const accessibilityRows: DocRow[] = [
  { name: "name", value: "caption / aria-label", description: "优先提供 caption；无 caption 时可给 table 传 aria-label。" },
  { name: "scroll", value: "scrollLabel", description: "横向滚动容器必须可被读屏识别，不只靠视觉阴影提示。" },
  { name: "busy", value: "aria-busy", description: "loading 时 table 标记 busy，状态内容用 role=status 读出。" },
  { name: "error", value: "role=alert", description: "错误状态即时公告。错误内容应包含下一步动作或恢复信息。" },
  { name: "row header", value: 'scope="row"', description: "第一列承载实体名称时应设置 scope=row，改善单元格关联。" },
];

const mobileRows: DocRow[] = [
  { name: "horizontal scroll", value: "scrollX", description: "宽表在内部 scroller 横向滚动；组件外层 max-inline-size=100%，不得把页面撑出横向 overflow。" },
  { name: "small widths", value: "360px / 390px / 430px smoke", description: "文档示例进入验收脚本，检查页面无整体横向溢出，宽表只在组件内部滚动。" },
  { name: "sticky", value: "stickyHeader", description: "宽表格和长表格可保留表头上下文，仍需注意滚动容器高度。" },
  { name: "density", value: "compact", description: "移动或弹层里可减少垂直占用，但不应低于可读字号。" },
];

const performanceRows: DocRow[] = [
  { name: "default budget", value: "500 rows", description: "默认只渲染前 UI_RENDER_BUDGETS.tableRows 行，并在 tbody 末尾用 role=status / aria-live 提示已截断。" },
  { name: "large data", value: "paginate / virtualize", description: "数万行应由业务层分页、远程排序或虚拟滚动；Table 不在基础层内建窗口化状态机。" },
  { name: "virtualization", value: "explicit boundary", description: "当前 Table 提供渲染上限保护，不提供虚拟列表测量、动态行高或滚动位置恢复。" },
  { name: "expensive render", value: "caller-owned", description: "render 中的复杂计算应提前 memo 或聚合，Table 只做行数保护。" },
];

const interactionRows: DocRow[] = [
  { name: "columns", value: "declarative only", description: "Table 只按 columns 顺序渲染列，不推断业务字段、格式化规则或远程 schema。" },
  { name: "sort", value: "not built in", description: "当前不渲染排序按钮，也不接管 aria-sort；业务可组合 Button/DataToolbar 后传入已排序 data。" },
  { name: "selection", value: "not built in", description: "当前不内建复选列或 selectedRowKeys；需要批量选择时由宿主管理 Checkbox、Toolbar 和行状态。" },
  { name: "expand", value: "not built in", description: "当前不内建展开行、树形行或嵌套详情；需要时由宿主管理 expandedKeys、rowKey 和详情区域语义。" },
  { name: "action column", value: "render-owned", description: "操作列由 columns.render 显式渲染 Button/链接等动作，Table 不推断业务操作或导出行为。" },
  { name: "pagination", value: "not built in", description: "Table 接收当前页 data；页码、pageSize、总数和远程请求由 Pagination 或宿主页面管理。" },
  { name: "filter", value: "not built in", description: "筛选、远程请求和 URL 状态由业务层组合 FilterPanel、DataToolbar 或路由状态。" },
  { name: "fixed columns", value: "not built in", description: "当前只支持 stickyHeader 和 scrollX；固定左右列涉及宽度测量、阴影层级和双向滚动同步，留给上层专用表格。" },
];

const securityRows: DocRow[] = [
  { name: "text", value: "React escaping", description: "dataIndex 读取到的普通字符串按 React 文本节点渲染，示例中的 script 字符串只显示文本。" },
  { name: "render", value: "ReactNode", description: "render 返回 React 节点，Table 不解析 HTML 字符串；Table、getRowProps、headerProps 和 getCellProps 均禁止并剥离 dangerouslySetInnerHTML。" },
  { name: "data", value: "caller-owned", description: "组件不发起网络请求、不缓存远程数据、不执行动态代码。" },
  { name: "dependencies", value: "self-owned", description: "不依赖 antd、antd-mobile 或 @ant-design/charts。" },
];

const faqItems = [
  { question: "为什么不内置分页、排序和选择？", answer: "Table 当前是基础展示组件。分页、筛选、排序、批量选择会涉及远程数据、URL 状态和业务策略，先由业务层组合 Pagination、DataToolbar、FilterPanel、Checkbox 等组件。" },
  { question: "是否支持固定列？", answer: "不内建固定左右列。固定列需要列宽测量、阴影层级、RTL 和横向滚动同步策略；当前基础 Table 只承诺 scrollX 与 stickyHeader。" },
  { question: "什么时候用 scope=row？", answer: "当第一列是行实体名称，例如服务名、用户、订单号时使用；这样读屏读取其他单元格时能关联到行头。" },
  { question: "空状态为什么还保留表头？", answer: "用户仍需要知道这张表期望展示哪些字段，尤其在筛选后无结果或权限受限时。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      <div className="table-doc-demo__preview">{preview}</div>
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
            <tr key={`${row.name}-${row.value}`}>
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

export function TableDoc({ showAnchors = false }: TableDocProps) {
  return (
    <TutorialScaffold component="Table" kind="display" oneLineExample={`<Table caption="Release health" columns={columns} data={rows} rowKey="id" />`}>
    <section className="button-doc table-doc" aria-labelledby="table-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Table 文档目录">
            {tableDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="table-doc-title">{tableDocMeta.title}</h2>
            <p>
              用于展示结构化数据。当前 Table 保留原生 <code>{"<table>"}</code> 语义，优先覆盖稳定
              rowKey、caption、空/加载/错误状态、sticky 表头、横向滚动和窄屏可读性。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认列语义、移动端横滚、渲染预算和文本安全。
            </p>
          </header>

          <section className="button-doc-section" id="table-when" aria-labelledby="table-when-title">
            <h3 id="table-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当数据天然由行和列组成，用户需要对比多个字段时使用。</li>
              <li>当第一列是实体名称时，把该列设置为 scope=row。</li>
              <li>数据更适合摘要、键值对或时间线时，优先使用 Card、PropertyList 或 StatusTimeline。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="table-demos" aria-labelledby="table-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="table-demos-title">代码演示</h3>
              <p>示例覆盖基础数据、横向滚动、密度、空状态、单行文本安全、加载状态和错误状态。</p>
            </div>
            <div className="button-doc-demo-grid table-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="table-api" aria-labelledby="table-api-title">
            <h3 id="table-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="table-column" aria-labelledby="table-column-title">
            <h3 id="table-column-title">Column</h3>
            <DataTable rows={columnRows} />
          </section>

          <section className="button-doc-section" id="table-row-key" aria-labelledby="table-row-key-title">
            <h3 id="table-row-key-title">rowKey</h3>
            <DataTable rows={rowKeyRows} />
          </section>

          <section className="button-doc-section" id="table-state" aria-labelledby="table-state-title">
            <h3 id="table-state-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="table-review" aria-labelledby="table-review-title">
            <h3 id="table-review-title">生产复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="table-interaction" aria-labelledby="table-interaction-title">
            <h3 id="table-interaction-title">交互边界</h3>
            <DataTable rows={interactionRows} />
          </section>

          <section className="button-doc-section" id="table-semantic" aria-labelledby="table-semantic-title">
            <h3 id="table-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="table-token" aria-labelledby="table-token-title">
            <h3 id="table-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="table-a11y" aria-labelledby="table-a11y-title">
            <h3 id="table-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="table-mobile" aria-labelledby="table-mobile-title">
            <h3 id="table-mobile-title">响应式</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="table-performance" aria-labelledby="table-performance-title">
            <h3 id="table-performance-title">性能</h3>
            <DataTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="table-security" aria-labelledby="table-security-title">
            <h3 id="table-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="table-faq" aria-labelledby="table-faq-title">
            <h3 id="table-faq-title">FAQ</h3>
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
