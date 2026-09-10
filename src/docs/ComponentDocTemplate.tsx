import {
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Grid,
  GridItem,
  Input,
  Modal,
  Popover,
  Progress,
  RadioGroup,
  Skeleton,
  Space,
  Spin,
  Tag,
  Tooltip,
} from "../components/base";
import {
  DataToolbar,
  FilterPanel,
  MetricCard,
  MermaidSvgViewer,
  PropertyList,
  StatusTimeline,
} from "../components/business";
import { AreaChart, Sparkline } from "../components/charts";
import { DemoContainer } from "./DemoContainer";
import type { DocsComponentItem } from "./componentRegistry";

type DetailRow = {
  name: string;
  value: string;
  description: string;
};

type ComponentDetailDocProps = {
  item: DocsComponentItem;
};

const noop = () => {};

const statusLabels = {
  production: "生产可用",
  stub: "占位",
  planned: "计划中",
  ready: "文档就绪",
  covered: "能力覆盖",
  partial: "部分覆盖",
};

const anchors = [
  { id: "purpose", label: "用途" },
  { id: "usage", label: "何时使用" },
  { id: "examples", label: "示例" },
  { id: "api", label: "API" },
  { id: "semantic", label: "Semantic DOM" },
  { id: "token", label: "Design Token" },
  { id: "a11y", label: "a11y" },
  { id: "mobile", label: "mobile" },
  { id: "security", label: "security" },
  { id: "gaps", label: "缺口" },
];

function getStatusLabel(status: keyof typeof statusLabels) {
  return statusLabels[status] ?? status;
}

function getSourcePath(item: DocsComponentItem) {
  if (item.categoryId === "business") {
    return `src/components/business/${item.name}/${item.name}.tsx`;
  }

  if (item.categoryId === "charts") {
    return item.implementationStatus === "production"
      ? `src/components/charts/${item.name}.tsx`
      : "src/components/charts";
  }

  if (item.group === "自有基础扩展") {
    return `src/components/base/${item.name}/${item.name}.tsx`;
  }

  return item.implementationStatus === "production"
    ? `src/components/base/${item.name}/${item.name}.tsx`
    : "src/components/base";
}

function getExampleGuidance(item: DocsComponentItem) {
  if (item.implementationStatus === "production") {
    return "生产实现已进入 registry。当前详情页先提供验收型结构化文档，具体交互 specimen 可在 Specimen Appendix 或对应专页中复核。";
  }

  if (item.implementationStatus === "stub") {
    return "当前仅保留静态 specimen 或登记占位，不应被业务当作稳定组件 API 引用。";
  }

  return "当前只作为能力规划登记，代码示例和 API 需要等真实实现落地后补齐。";
}

function getSemanticRoot(item: DocsComponentItem) {
  if (item.id === "modal" || item.id === "drawer") {
    return "portal > role=dialog";
  }

  if (item.id === "tooltip") {
    return "trigger element + role=tooltip";
  }

  if (item.id === "popover") {
    return "trigger element + role=dialog";
  }

  if (item.id === "property-list") {
    return "section > dl";
  }

  if (item.id === "status-timeline") {
    return "section > ol";
  }

  if (item.id === "skeleton") {
    return "div[role=status][aria-busy]";
  }

  if (item.id === "spin") {
    return "status node or aria-busy wrapper";
  }

  if (item.id === "progress") {
    return "div[role=progressbar]";
  }

  if (item.categoryId === "charts") {
    return "figure / svg";
  }

  if (item.categoryId === "business") {
    return "section / composite";
  }

  return item.implementationStatus === "production" ? "native or primitive root" : "待实现后确认";
}

function isLoadingFeedbackItem(item: DocsComponentItem) {
  return item.id === "skeleton" || item.id === "spin" || item.id === "progress";
}

function isOverlayItem(item: DocsComponentItem) {
  return item.id === "tooltip" || item.id === "popover";
}

function getBusinessApiRows(item: DocsComponentItem): DetailRow[] {
  if (item.id === "data-toolbar") {
    return [
      {
        name: "search",
        value: "DataToolbarSearch | false",
        description: "结构化控制 value/defaultValue、placeholder、submitLabel、onChange 和 onSubmit；false 可关闭搜索区。",
      },
      {
        name: "actions",
        value: "primaryAction / secondaryActions / actions",
        description: "主动作、次动作和自定义动作槽可组合；loading 时内建动作自动禁用。",
      },
      {
        name: "states",
        value: "loadingText / error / empty / activeFilters",
        description: "搜索、筛选、动作、加载、错误、空态和活跃筛选都在组件边界内可表达。",
      },
    ];
  }

  if (item.id === "filter-panel") {
    return [
      {
        name: "fields",
        value: "FilterPanelField[]",
        description: "字段支持 id、label、control、help、error、required 和 span，control 由宿主传入基础输入组件。",
      },
      {
        name: "submit",
        value: "onApply(formData) / onReset",
        description: "面板内部用 form 提交收集字段，复杂取值和校验仍由宿主模型负责。",
      },
      {
        name: "layout / states",
        value: "columns / mobileMode / activeCount / loading / error / empty",
        description: "桌面 1-2 列布局、移动堆叠、活跃计数和完整状态壳都有稳定入口。",
      },
    ];
  }

  if (item.id === "property-list") {
    return [
      {
        name: "items",
        value: "PropertyListItem[]",
        description: "稳定数据入口；每项需要 id、label，可选 value、description、badge 和 item 级 emptyValue。",
      },
      {
        name: "columns / layout / density",
        value: "1 | 2 | 3 / grid | stack / comfortable | compact",
        description: "控制属性网格、强制单列和密度；移动端会收敛为单列以避免横向溢出。",
      },
      {
        name: "loading / error / empty",
        value: "boolean / ReactNode / ReactNode",
        description: "内置加载骨架、错误 alert 和空态 status；section 同步 aria-busy。",
      },
      {
        name: "emptyValue / loadingLabel",
        value: "ReactNode / string",
        description: "统一缺省值文案和加载状态可访问名称，避免渲染未定义值。",
      },
    ];
  }

  if (item.id === "status-timeline") {
    return [
      {
        name: "items",
        value: "StatusTimelineItem[]",
        description: "稳定节点入口；每项需要 id、title，可选 time、dateTime、description、meta、state 和 ariaLabel。",
      },
      {
        name: "state",
        value: "complete | current | pending | error | warning",
        description: "每个节点都渲染文本状态徽标；current 节点带 aria-current=\"step\"，不只依赖颜色。",
      },
      {
        name: "density / stateLabels",
        value: "comfortable | compact / Partial<Record<State, string>>",
        description: "支持紧凑时间线和本地化状态文案；item.stateLabel 可覆盖单个节点。",
      },
      {
        name: "loading / error / empty",
        value: "boolean / ReactNode / ReactNode",
        description: "内置加载骨架、错误 alert 和空态 status；section 同步 aria-busy。",
      },
    ];
  }

  return [];
}

function getBusinessA11yNotes(item: DocsComponentItem) {
  if (item.id === "data-toolbar") {
    return [
      "搜索区使用 form role=search，输入通过 placeholder 或 label 获得可访问名称。",
      "loading 时 section 同步 aria-busy，内建动作和搜索提交自动禁用，错误状态使用 role=alert。",
      "活跃筛选使用独立 aria-label 区域，避免和筛选入口混读。",
    ];
  }

  if (item.id === "filter-panel") {
    return [
      "筛选内容使用 form 提交，字段 label 通过 htmlFor 绑定宿主 control 的 id。",
      "字段级错误使用 role=alert，面板级错误使用 role=alert，空态和加载态使用 role=status。",
      "Apply 是 submit 按钮，Reset 是 button，避免 Enter 键误触发重置。",
    ];
  }

  if (item.id === "property-list") {
    return [
      "根节点是 section，宿主可通过 aria-label 或 aria-labelledby 提供可访问名称。",
      "真实内容使用 dl/dt/dd 表达属性名和值，loading/error/empty 分别使用 status、alert、status。",
      "缺省值通过 emptyValue 渲染为可读文本，避免屏幕阅读器遇到空白或未定义值。",
    ];
  }

  if (item.id === "status-timeline") {
    return [
      "真实内容使用有序列表 ol/li 表达流程顺序。",
      "当前节点设置 aria-current=\"step\"，每个节点都有文本状态徽标，状态不只靠颜色。",
      "time 支持 dateTime 传入机器可读时间；复杂 title 可用 item.ariaLabel 补可访问名称。",
    ];
  }

  return [];
}

function getBusinessMobileNote(item: DocsComponentItem) {
  if (item.id === "data-toolbar") {
    return "移动端主网格收敛为单列，search、filters、activeFilters 和 actions 可换行，按钮保持 40px 以上触控高度。";
  }

  if (item.id === "filter-panel") {
    return "移动端字段网格收敛为单列，span 字段自然占满宽度，footer 按钮拉伸以保证触控和窄屏可读性。";
  }

  if (item.id === "property-list") {
    return "移动端按单列属性流验收，标签和值允许换行并使用 overflow-wrap，badge 保持不撑破容器。";
  }

  if (item.id === "status-timeline") {
    return "移动端保持单列时间线，标题、状态、时间允许换行；紧凑 density 用于任务抽屉和详情页窄栏。";
  }

  return "";
}

function getOverlayApiRows(item: DocsComponentItem, sourcePath: string): DetailRow[] {
  if (item.id === "modal") {
    return [
      { name: "open", value: "boolean", description: "受控显示状态；false 时不渲染 portal 内容。" },
      {
        name: "onClose",
        value: "(reason: ModalCloseReason) => void",
        description: "关闭请求回调区分 escape、backdrop、close-button，便于业务审计关闭来源。",
      },
      {
        name: "title / aria-label / description",
        value: "ReactNode / string",
        description: "title 建立 aria-labelledby；无 title 时由 aria-label 命名；description 进入 aria-describedby。",
      },
      {
        name: "close behavior",
        value: "closeOnEscape / closeOnOutsideClick",
        description: "默认开启 Escape 与 backdrop 关闭；backdrop 禁用时不进入 Tab 顺序。",
      },
      {
        name: "portal / focus",
        value: "container / initialFocusRef",
        description: `默认挂载到 document.body 并聚焦关闭按钮，可指定容器和初始焦点；源码入口：${sourcePath}。`,
      },
      {
        name: "layout",
        value: "size / footer / bodyClassName / className",
        description: "支持 sm、md、lg 三档宽度和 body/footer 组合，内容区独立滚动。",
      },
    ];
  }

  if (item.id === "drawer") {
    return [
      { name: "open", value: "boolean", description: "受控显示状态；false 时不渲染 portal 内容。" },
      {
        name: "onClose",
        value: "(reason: DrawerCloseReason) => void",
        description: "关闭请求回调区分 escape、backdrop、close-button，便于业务审计关闭来源。",
      },
      {
        name: "placement",
        value: "left | right | top | bottom",
        description: "支持四个屏幕边缘；默认 right，宽高按视口限制。",
      },
      {
        name: "title / aria-label / description",
        value: "ReactNode / string",
        description: "title 建立 aria-labelledby；无 title 时由 aria-label 命名；description 进入 aria-describedby。",
      },
      {
        name: "close behavior",
        value: "closeOnEscape / closeOnOutsideClick",
        description: "默认开启 Escape 与 backdrop 关闭；backdrop 禁用时不进入 Tab 顺序。",
      },
      {
        name: "portal / focus / size",
        value: "container / initialFocusRef / sm | md | lg",
        description: `默认挂载到 document.body 并聚焦关闭按钮，可指定容器、初始焦点和尺寸；源码入口：${sourcePath}。`,
      },
    ];
  }

  return [];
}

function getOverlayA11yNotes(item: DocsComponentItem) {
  if (item.id !== "modal" && item.id !== "drawer") {
    return [];
  }

  return [
    "打开后锁定 body 滚动，初始焦点进入 dialog，Tab/Shift+Tab 在浮层内部循环。",
    "Escape 默认触发关闭请求，关闭按钮与 backdrop 会分别带上 close-button / backdrop 来源。",
    "根节点使用 role=dialog 与 aria-modal=true，并通过 title 或 aria-label 提供可访问名称。",
  ];
}

function getOverlayMobileNote(item: DocsComponentItem) {
  if (item.id === "modal") {
    return "Modal 按 320px 以上视口验收，宽度和最大高度受视口约束，内容区独立滚动，关闭按钮在粗指针设备上满足 44px 触控尺寸。";
  }

  if (item.id === "drawer") {
    return "Drawer 的 left/right/top/bottom 均限制在视口内；窄屏左右抽屉保留边缘余量，上下抽屉按视口高度收敛。";
  }

  return "";
}

function DataTable({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="detail-doc-table-wrap">
      <table className="detail-doc-table">
        <thead>
          <tr>
            <th scope="col">项目</th>
            <th scope="col">当前值</th>
            <th scope="col">验收说明</th>
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

const compactTrendData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 53 },
  { label: "Wed", value: 49 },
  { label: "Thu", value: 67 },
  { label: "Fri", value: 72 },
];

const areaSpecimenData = [
  { label: "Alpha", value: 18 },
  { label: "Beta", value: 32 },
  { label: "Gamma", value: 26 },
  { label: "Delta", value: 44 },
  { label: "Epsilon", value: 39 },
];

const mermaidSpecimen = `flowchart LR
  Idea[Design note] --> Build[Component]
  Build --> Verify[Docs specimen]`;

function SpecimenCard({
  children,
  code,
  description,
  title,
}: {
  children: React.ReactNode;
  code: string;
  description: string;
  title: string;
}) {
  return (
    <DemoContainer
      background="sunken"
      code={code}
      description={description}
      title={title}
    >
      <div className="detail-doc-specimen__preview">{children}</div>
    </DemoContainer>
  );
}

function renderDetailSpecimens(item: DocsComponentItem) {
  if (item.id === "grid") {
    return [
      <SpecimenCard
        code={`<Grid columns="auto" minItemWidth={140} gap="sm">
  <GridItem><Card title="Backlog">24</Card></GridItem>
  <GridItem><Card title="Review">8</Card></GridItem>
  <GridItem><Card title="Done">41</Card></GridItem>
</Grid>`}
        description="自动列宽在 360/390px 下自然收敛，真实 GridItem 不依赖文档网格伪装。"
        key="grid-auto"
        title="Auto-fit cards"
      >
        <Grid columns="auto" gap="sm" minItemWidth={140}>
          <GridItem>
            <Card title="Backlog" description="Open work">
              <strong>24</strong>
            </Card>
          </GridItem>
          <GridItem>
            <Card title="Review" description="Needs attention">
              <strong>8</strong>
            </Card>
          </GridItem>
          <GridItem>
            <Card title="Done" description="This week">
              <strong>41</strong>
            </Card>
          </GridItem>
        </Grid>
      </SpecimenCard>,
    ];
  }

  if (item.id === "radio") {
    return [
      <SpecimenCard
        code={`<RadioGroup
  label="Release channel"
  defaultValue="beta"
  options={[{ label: "Stable", value: "stable" }, ...]}
/>`}
        description="独立 Radio 页面使用真实 RadioGroup，覆盖 helpText、禁用项和纵向移动布局。"
        key="radio-group"
        title="Release channel"
      >
        <RadioGroup
          defaultValue="beta"
          helpText="Keyboard arrows move between options."
          label="Release channel"
          name="detail-radio-channel"
          options={[
            { label: "Stable", value: "stable", helpText: "Recommended for production tenants." },
            { label: "Beta", value: "beta", helpText: "Includes feature flags for validation." },
            { disabled: true, label: "Canary", value: "canary", helpText: "Paused for this release window." },
          ]}
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "checkbox") {
    return [
      <SpecimenCard
        code={`<Checkbox defaultChecked label="Include generated summaries" helpText="Shown in export." />`}
        description="保留 Checkbox 独立页，直接展示真实勾选、帮助文本和禁用状态。"
        key="checkbox"
        title="Export options"
      >
        <Space direction="vertical">
          <Checkbox defaultChecked label="Include generated summaries" helpText="Shown in export." />
          <Checkbox label="Send notification after export" />
          <Checkbox disabled label="Archive source dataset" helpText="Requires administrator approval." />
        </Space>
      </SpecimenCard>,
    ];
  }

  if (item.id === "divider") {
    return [
      <SpecimenCard
        code={`<Divider>Review boundary</Divider>`}
        description="展示文字分割线和纯分割线，避免该页只有 API 表格。"
        key="divider"
        title="Section boundary"
      >
        <div className="detail-doc-specimen__surface">
          <strong>Release notes</strong>
          <p>Reviewed items stay above the divider.</p>
          <Divider>Review boundary</Divider>
          <p>Follow-up work remains visible below.</p>
        </div>
      </SpecimenCard>,
    ];
  }

  if (item.id === "flex") {
    return [
      <SpecimenCard
        code={`<Flex wrap gap="sm" align="center">
  <Tag>queued</Tag><Button size="sm">Assign</Button>
</Flex>`}
        description="真实 Flex 展示换行、对齐和操作组合，窄屏保持一行样例区域内自适应。"
        key="flex"
        title="Wrapped actions"
      >
        <Flex align="center" gap="sm" wrap>
          <Tag>queued</Tag>
          <Tag tone="subtle">owner: design systems</Tag>
          <Button size="sm">Assign</Button>
          <Button size="sm" variant="ghost">Defer</Button>
        </Flex>
      </SpecimenCard>,
    ];
  }

  if (item.id === "space") {
    return [
      <SpecimenCard
        code={`<Space direction="vertical" size="sm">
  <Tag>ready</Tag>
  <Button size="sm">Open</Button>
</Space>`}
        description="真实 Space 展示垂直间距，避免把 Space 合并进布局总览。"
        key="space"
        title="Vertical rhythm"
      >
        <Space direction="vertical" size="sm">
          <Tag tone="strong">ready</Tag>
          <span className="detail-doc-specimen__note">Spacing remains stable when text wraps on mobile.</span>
          <Button size="sm">Open review</Button>
        </Space>
      </SpecimenCard>,
    ];
  }

  if (item.id === "tooltip") {
    return [
      <SpecimenCard
        code={`<Tooltip content="Last scanned 2 minutes ago" defaultOpen>
  <Button>Hover or focus</Button>
</Tooltip>`}
        description="使用真实 Tooltip，defaultOpen 让浮层在文档样例中可见并可验收定位。"
        key="tooltip"
        title="Visible hint"
      >
        <Tooltip content="Last scanned 2 minutes ago" defaultOpen placement="bottom">
          <Button variant="ghost">Hover or focus</Button>
        </Tooltip>
      </SpecimenCard>,
    ];
  }

  if (item.id === "popover") {
    return [
      <SpecimenCard
        code={`<Popover defaultOpen title="Release summary" content={<PropertyList ... />}>
  <Button>Open summary</Button>
</Popover>`}
        description="使用真实 Popover 承载可交互内容，和 Tooltip 的短说明职责分离。"
        key="popover"
        title="Structured overlay"
      >
        <Popover
          defaultOpen
          placement="bottom"
          title="Release summary"
          content={
            <PropertyList
              columns={1}
              density="compact"
              items={[
                { id: "status", label: "Status", value: "Ready" },
                { id: "owner", label: "Owner", value: "Component team" },
              ]}
            />
          }
        >
          <Button variant="ghost">Open summary</Button>
        </Popover>
      </SpecimenCard>,
    ];
  }

  if (item.id === "modal") {
    return [
      <SpecimenCard
        code={`<Modal open title="Publish checklist" footer={<Button>Confirm</Button>}>...</Modal>`}
        description="在文档页内打开真实 Modal，覆盖 title、description、footer 和移动视口收敛。"
        key="modal"
        title="Blocking dialog"
      >
        <div className="detail-doc-specimen__modal-host">
          <Modal
            closeOnEscape={false}
            closeOnOutsideClick={false}
            description="Confirm the documentation specimen before publishing."
            footer={
              <>
                <Button size="sm" variant="ghost">Cancel</Button>
                <Button size="sm">Confirm</Button>
              </>
            }
            open
            title="Publish checklist"
          >
            <p>Build, dependency scan, and mobile overflow checks must pass before release.</p>
          </Modal>
        </div>
      </SpecimenCard>,
    ];
  }

  if (item.id === "drawer") {
    return [
      <SpecimenCard
        code={`<Card title="Drawer content model">
  <PropertyList items={items} />
</Card>`}
        description="Drawer 的 portal 交互在专项页保留说明；这里用真实业务内容展示抽屉正文模型。"
        key="drawer-content"
        title="Drawer content model"
      >
        <Card title="Release detail" description="Content used inside a Drawer body.">
          <PropertyList
            columns={2}
            density="compact"
            items={[
              { id: "owner", label: "Owner", value: "Docs" },
              { id: "stage", label: "Stage", value: "Verification" },
            ]}
          />
        </Card>
      </SpecimenCard>,
    ];
  }

  if (item.id === "skeleton") {
    return [
      <SpecimenCard
        code={`<Skeleton avatar={{ size: "md" }} title={{ width: "46%" }} paragraph={{ rows: 3 }} />`}
        description="真实骨架屏展示头像、标题和段落结构，读屏只获得状态语义。"
        key="skeleton"
        title="Profile loading"
      >
        <Skeleton avatar={{ size: "md" }} paragraph={{ rows: 3, widths: ["100%", "84%", "58%"] }} title={{ width: "46%" }} />
      </SpecimenCard>,
    ];
  }

  if (item.id === "spin") {
    return [
      <SpecimenCard
        code={`<Spin label="Syncing records"><Card title="Deployment records">...</Card></Spin>`}
        description="真实 Spin 包裹内容，内容不卸载且外层同步 aria-busy。"
        key="spin"
        title="Wrapped loading"
      >
        <Spin label="Syncing records" size="sm">
          <Card title="Deployment records" description="Wrapped content remains mounted.">
            <Tag>syncing</Tag>
          </Card>
        </Spin>
      </SpecimenCard>,
    ];
  }

  if (item.id === "progress") {
    return [
      <SpecimenCard
        code={`<Progress label="Export progress" value={68} status="active" />`}
        description="真实 Progress 覆盖确定进度和未知总量状态。"
        key="progress"
        title="Task progress"
      >
        <Space direction="vertical">
          <Progress label="Export progress" status="active" value={68} />
          <Progress indeterminate label="Waiting for worker" size="sm" />
        </Space>
      </SpecimenCard>,
    ];
  }

  if (item.id === "data-toolbar") {
    return [
      <SpecimenCard
        code={`<DataToolbar title="Deployments" search={{ showSubmit: true }} primaryAction={{ label: "Create" }} />`}
        description="独立业务组件页直接展示真实搜索、筛选、活跃条件和动作区。"
        key="data-toolbar"
        title="Data operations bar"
      >
        <DataToolbar
          activeFilters={<><Tag tone="subtle">status: ready</Tag><Tag tone="subtle">owner: docs</Tag></>}
          filters={<Tag tone="subtle">2 filters</Tag>}
          primaryAction={{ id: "create", label: "Create", priority: "primary" }}
          resultCount={128}
          search={{ defaultValue: "release", placeholder: "Search deployments", showSubmit: true }}
          secondaryActions={[{ id: "export", label: "Export", priority: "ghost" }]}
          title="Deployments"
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "filter-panel") {
    return [
      <SpecimenCard
        code={`<FilterPanel fields={[{ id: "owner", label: "Owner", control: <Input id="owner" /> }]} />`}
        description="真实 FilterPanel 组合基础 Input、Segmented/Tag 等控件，移动端字段单列。"
        key="filter-panel"
        title="Query filters"
      >
        <FilterPanel
          activeCount={2}
          description="Reusable query panel."
          fields={[
            { id: "detail-owner", label: "Owner", control: <Input id="detail-owner" placeholder="Owner name" /> },
            { id: "detail-status", label: "Status", control: <Input id="detail-status" defaultValue="ready" /> },
          ]}
          onApply={noop}
          onReset={noop}
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "property-list") {
    return [
      <SpecimenCard
        code={`<PropertyList columns={3} items={[{ label: "Owner", value: "Component team" }]} />`}
        description="真实 dl 结构展示属性、badge、缺省值和窄屏单列。"
        key="property-list"
        title="Release metadata"
      >
        <PropertyList
          columns={3}
          density="compact"
          emptyValue="Unscheduled"
          items={[
            { id: "env", label: "Environment", value: "Production", badge: <Tag tone="strong">live</Tag> },
            { id: "owner", label: "Owner", value: "Component team" },
            { id: "window", label: "Maintenance window" },
          ]}
          title="Release metadata"
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "status-timeline") {
    return [
      <SpecimenCard
        code={`<StatusTimeline items={[{ title: "Build running", state: "current" }]} />`}
        description="真实有序列表时间线展示 current、complete、warning 状态，不只靠颜色传达。"
        key="status-timeline"
        title="Deployment status"
      >
        <StatusTimeline
          density="compact"
          items={[
            { id: "queued", title: "Queued", time: "09:12", state: "complete", description: "Request accepted." },
            { id: "build", title: "Build running", time: "09:18", state: "current", meta: <Tag>CI</Tag> },
            { id: "verify", title: "Verification", state: "warning", stateLabel: "Needs review" },
          ]}
          title="Deployment status"
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "metric-card") {
    return [
      <SpecimenCard
        code={`<MetricCard title="Active sessions" value="24,918" chart={<Sparkline data={trend} />} />`}
        description="真实 MetricCard 展示趋势、delta、footer 和图表 fallback 边界。"
        key="metric-card"
        title="Realtime metric"
      >
        <MetricCard
          chart={<Sparkline data={compactTrendData} height={68} summary="Active sessions trend rises through Friday." title="Active sessions trend" />}
          chartLabel="Active sessions weekly trend"
          delta={{ description: "week over week", direction: "up", label: "+12.8%", tone: "positive" }}
          description="Compared with last week"
          eyebrow="Realtime"
          footer="Updated 2 minutes ago"
          title="Active sessions"
          unit="sessions"
          value="24,918"
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "area-chart") {
    return [
      <SpecimenCard
        code={`<AreaChart data={data} title="AreaChart specimen" summary="Trend rises into Delta." />`}
        description="图表详情页也先给真实 AreaChart，再进入后续专项 showcase。"
        key="area-chart"
        title="Area trend"
      >
        <AreaChart
          data={areaSpecimenData}
          fillOpacity={0.28}
          summary="Trend rises into Delta and finishes slightly lower."
          title="AreaChart specimen"
          xLabelMaxLength={7}
        />
      </SpecimenCard>,
    ];
  }

  if (item.id === "mermaid-svg-viewer") {
    return [
      <SpecimenCard
        code={`<MermaidSvgViewer source={source} title="Specimen flow" />`}
        description="真实 MermaidSvgViewer 渲染 Mermaid 源，不再只靠文档说明表示能力。"
        key="mermaid"
        title="Mermaid flow"
      >
        <MermaidSvgViewer source={mermaidSpecimen} title="Specimen flow" />
      </SpecimenCard>,
    ];
  }

  return [
    <SpecimenCard
      code={`<Card title="${item.name} specimen"><Tag>${item.category}</Tag></Card>`}
      description="通用 fallback 使用真实基础组件渲染，避免模板页退化为纯占位文案。"
      key="fallback"
      title={`${item.name} specimen`}
    >
      <Card title={`${item.name} specimen`} description={item.description}>
        <Space>
          <Tag tone="strong">{item.category}</Tag>
          <Tag tone="subtle">{item.layer}</Tag>
          <Button size="sm" variant="ghost">
            Review
          </Button>
        </Space>
      </Card>
    </SpecimenCard>,
  ];
}

export function ComponentDetailDoc({ item }: ComponentDetailDocProps) {
  const detailId = `${item.id}-detail`;
  const sourcePath = getSourcePath(item);
  const businessApiRows = getBusinessApiRows(item);
  const businessA11yNotes = getBusinessA11yNotes(item);
  const businessMobileNote = getBusinessMobileNote(item);
  const overlayApiRows = getOverlayApiRows(item, sourcePath);
  const overlayA11yNotes = getOverlayA11yNotes(item);
  const overlayMobileNote = getOverlayMobileNote(item);
  const specimens = renderDetailSpecimens(item);
  const apiRows: DetailRow[] = overlayApiRows.length > 0 ? overlayApiRows : businessApiRows.length > 0 ? businessApiRows : [
    {
      name: "status contract",
      value: `${getStatusLabel(item.implementationStatus)} / ${getStatusLabel(item.docsStatus)} / ${getStatusLabel(item.capabilityStatus)}`,
      description: "实现、文档、能力覆盖必须同步更新；不得把 planned 或 stub 描述成 production。",
    },
    {
      name: "source",
      value: sourcePath,
      description: "registry 与源码路径按当前导出面核对。生产项应能从对应 barrel export 进入应用。",
    },
    {
      name: "tags",
      value: item.tags.join(", "),
      description: "用于 Overview 快速筛选能力面，标签不等于稳定 API。",
    },
  ];

  if (item.id === "skeleton") {
    apiRows.push(
      {
        name: "loading / children",
        value: "loading?: boolean; children?: ReactNode",
        description: "loading=false 时直接渲染 children，避免业务额外分支；loading=true 时输出 role=status 占位结构。",
      },
      {
        name: "shape controls",
        value: "avatar, title, paragraph, size, round, active",
        description: "支持头像、标题宽度、段落行数/宽度、尺寸、圆角和动画开关，覆盖列表、详情、卡片占位。",
      },
    );
  }

  if (item.id === "spin") {
    apiRows.push(
      {
        name: "loading controls",
        value: "spinning?: boolean; delay?: number; fullscreen?: boolean",
        description: "spinning 控制显示，delay 抑制短闪烁，fullscreen 用于整页等待态。",
      },
      {
        name: "composition",
        value: "children?: ReactNode; indicator?: ReactNode; label?: ReactNode",
        description: "可包裹局部内容并给外层设置 aria-busy，也允许替换指示器和状态文本。",
      },
    );
  }

  if (item.id === "progress") {
    apiRows.push(
      {
        name: "value contract",
        value: "percent?: number; value?: number; max?: number; indeterminate?: boolean",
        description: "percent 会 clamp 到 0..100；value/max 会 clamp 到 0..max；indeterminate 不输出 aria-valuenow。",
      },
      {
        name: "display controls",
        value: "label, showValue, status, size, format, formatValue, strokeColor",
        description: "支持状态色、尺寸、自定义展示、无标签场景和自定义进度色，文本与 aria-valuetext 保持一致。",
      },
    );
  }

  if (item.id === "tooltip") {
    apiRows.push(
      {
        name: "content",
        value: "ReactNode",
        description: "提示内容由 React 渲染，不解析 HTML 字符串，不接收 dangerouslySetInnerHTML，避免提示内容注入。",
      },
      {
        name: "trigger",
        value: "hover | focus | click | array",
        description: "默认 hover + focus；触控场景会把 hover 型提示切换为点按开关。",
      },
      {
        name: "open controls",
        value: "open, defaultOpen, onOpenChange",
        description: "支持受控和非受控状态；Escape 与外部点击会走 onOpenChange(false)。",
      },
      {
        name: "placement controls",
        value: "placement, disabled, closeDelay",
        description: "浮层使用 fixed 坐标并按视口夹紧，降低父级 overflow 裁剪和屏幕边缘遮挡。",
      },
    );
  }

  if (item.id === "popover") {
    apiRows.push(
      {
        name: "content / title",
        value: "ReactNode",
        description: "内容以 React 子树组合，组件不解析用户 HTML，标题会连接 aria-labelledby。",
      },
      {
        name: "trigger",
        value: "click | hover | focus | array",
        description: "默认 click；Enter、Space、ArrowDown 可打开，触控设备沿用点按触发。",
      },
      {
        name: "open controls",
        value: "open, defaultOpen, onOpenChange",
        description: "支持受控和非受控状态；外部点击、Escape 和 disabled 都会收敛关闭状态。",
      },
      {
        name: "dialog controls",
        value: "initialFocus, closeOnEscape, placement",
        description: "打开后可聚焦面板或首个可聚焦控件，Tab 在面板内循环，关闭后恢复触发器焦点。",
      },
    );
  }

  const semanticRows: DetailRow[] = [
    {
      name: "root",
      value: getSemanticRoot(item),
      description: "生产项需要明确根元素、可访问名称来源，以及与原生语义的关系。",
    },
    {
      name: "state",
      value: item.implementationStatus === "production" ? "visible states required" : "implementation pending",
      description: "ready、disabled、loading、error、empty 等状态按组件职责选择，不虚构未实现状态。",
    },
    {
      name: "composition",
      value: item.layer,
      description: "foundation/base/business/charts 层级用于限制依赖方向，业务组件可组合基础组件，基础组件不反向依赖业务组件。",
    },
  ];

  if (item.id === "skeleton") {
    semanticRows.push(
      {
        name: "busy state",
        value: "aria-busy mirrors active",
        description: "视觉占位节点 aria-hidden，读屏只读到状态文案，避免重复朗读装饰结构。",
      },
      {
        name: "motion",
        value: "active shimmer + reduced motion fallback",
        description: "active=true 启用 shimmer；系统 reduced motion 下禁用动画并保留静态层次。",
      },
    );
  }

  if (item.id === "spin") {
    semanticRows.push(
      {
        name: "status",
        value: "role=status aria-live=polite",
        description: "裸 spinner 输出 polite 状态；包裹内容时外层容器同步 aria-busy。",
      },
      {
        name: "content overlay",
        value: "content remains mounted",
        description: "局部加载不会卸载已有内容，避免焦点和布局突然丢失。",
      },
    );
  }

  if (item.id === "progress") {
    semanticRows.push(
      {
        name: "determinate",
        value: "aria-valuemin/max/now/text",
        description: "确定进度暴露完整 progressbar 数值，并由 formatValue 控制可读文本。",
      },
      {
        name: "indeterminate",
        value: "aria-valuetext only",
        description: "未知总量时不输出 aria-valuenow，避免向辅助技术报告虚假的百分比。",
      },
    );
  }

  if (item.id === "tooltip") {
    semanticRows.push(
      {
        name: "relationship",
        value: "aria-describedby",
        description: "仅在打开时把触发器连接到 role=tooltip，关闭时恢复触发器原有描述。",
      },
      {
        name: "keyboard",
        value: "Focus opens, Blur/Escape closes",
        description: "键盘用户不依赖鼠标悬停；Escape 可撤销临时提示。",
      },
      {
        name: "interaction boundary",
        value: "non-interactive bubble",
        description: "Tooltip 只承载短说明，pointer-events 为 none；需要交互内容时使用 Popover。",
      },
    );
  }

  if (item.id === "popover") {
    semanticRows.push(
      {
        name: "relationship",
        value: "aria-haspopup=dialog + aria-controls + aria-expanded",
        description: "触发器明确声明弹出 dialog 的展开状态，title 存在时作为 aria-labelledby 来源。",
      },
      {
        name: "keyboard",
        value: "Enter/Space/ArrowDown open, Escape close, Tab loop",
        description: "面板打开后焦点进入内容区，Tab 不会漏到背景控件，关闭后回到原触发器。",
      },
      {
        name: "dismissal",
        value: "outside pointer + Escape",
        description: "点击浮层外部或按 Escape 关闭，防止浮层长期遮挡主要操作区域。",
      },
    );
  }

  const tokenRows: DetailRow[] = [
    {
      name: "surface",
      value: "--ct-surface / --ct-surface-muted / --ct-surface-sunken",
      description: "文档和组件承载面只读取语义面层，亮暗主题通过同名 token 切换。",
    },
    {
      name: "border",
      value: "--ct-border-light / --ct-border / --ct-border-heavy",
      description: "使用低透明细边框表达层级，hover 或强调态提升到 heavy，不把选中态默认染蓝。",
    },
    {
      name: "radius",
      value: "--ct-radius-sm / --ct-radius-md / --ct-radius-xl",
      description: "控件保持 6-8px，卡片和文档样例使用 12px，浮层按现有圆角刻度取值。",
    },
    {
      name: "focus",
      value: "--ct-focus-ring",
      description: "键盘焦点统一使用蓝色焦点环，蓝色只承担焦点、链接和必要强调。",
    },
    {
      name: "theme style",
      value: "color, surface, border, focus token only",
      description: "主题样式只通过 --ct-* 语义令牌改变颜色、面层、描边和焦点；教程示例不在组件页硬编码全局色板。",
    },
    {
      name: "structure style",
      value: "spacing, density, responsive containment",
      description: "结构样式负责间距、密度、换行、内部滚动和移动端收敛；DemoContainer 承载真实 preview 与格式化源码，不再叠套旧示例卡片。",
    },
  ];

  return (
    <section className="component-doc-page detail-doc" aria-labelledby={`${detailId}-title`}>
      <div className="component-doc-page__main">
        <header className="component-doc-page__header">
          <p className="eyebrow">
            {item.category} / {item.group} / {item.layer}
          </p>
          <h1 id={`${detailId}-title`}>
            {item.name} {item.chineseName}
          </h1>
          <p>{item.description}</p>
          <div className="detail-doc__status" aria-label={`${item.name} production status`}>
            <span>{getStatusLabel(item.implementationStatus)}</span>
            <span>{getStatusLabel(item.docsStatus)}</span>
            <span>{getStatusLabel(item.capabilityStatus)}</span>
          </div>
        </header>

        <section className="detail-doc__section" id={`${item.id}-purpose`} aria-labelledby={`${item.id}-purpose-title`}>
          <h2 id={`${item.id}-purpose-title`}>用途</h2>
          <p>
            {item.name} 用于{item.description}。当前登记来源为 {item.source}，文档状态必须跟随源码和导出面变化。
          </p>
        </section>

        <section className="detail-doc__section" id={`${item.id}-usage`} aria-labelledby={`${item.id}-usage-title`}>
          <h2 id={`${item.id}-usage-title`}>何时使用</h2>
          <ul className="button-doc-list">
            {item.id === "modal" ? (
              <>
                <li>需要阻断当前流程、要求用户确认、填写或处理重点内容时使用。</li>
                <li>内容较长时保持 body 滚动，避免把关闭按钮和页脚操作推离视口。</li>
                <li>非阻断提示不使用 Modal，应选择 Message、Notification 或页面内 Alert。</li>
              </>
            ) : item.id === "drawer" ? (
              <>
                <li>需要在不离开当前页面的情况下查看详情、编辑配置或承载临时任务流时使用。</li>
                <li>左右抽屉适合详情和表单，上下抽屉适合移动端或横向工具面板。</li>
                <li>需要强确认且遮断主流程时优先使用 Modal，而不是 Drawer。</li>
              </>
            ) : businessA11yNotes.length > 0 ? (
              businessA11yNotes.map((note) => <li key={note}>{note}</li>)
            ) : isOverlayItem(item) ? (
              <>
                <li>Tooltip 只用于短提示和补充说明，不承载按钮、链接、表单等交互内容。</li>
                <li>Popover 用于需要承载轻量交互、结构化信息或操作入口的浮层卡片。</li>
                <li>触发器必须是可聚焦元素；被 disabled 原生按钮触发时应由宿主包一层可聚焦代理。</li>
              </>
            ) : isLoadingFeedbackItem(item) ? (
              <>
                <li>Skeleton 用于结构已知但数据未返回的内容占位，不用于提交、同步等需要持续状态文本的任务。</li>
                <li>Spin 用于短时局部等待、全屏等待或包裹已有内容的加载态，长任务应搭配 Progress 或业务状态文案。</li>
                <li>Progress 用于可量化或未知总量的任务进展，成功、警告、错误状态必须有文本或语义属性支撑。</li>
              </>
            ) : (
              <>
                <li>当业务场景与组件职责、层级和标签一致时使用。</li>
                <li>当 registry 标记为 production 时，可进入业务组合验收；stub 只允许用于文档和 specimen 讨论。</li>
                <li>当需求依赖未登记能力时，应先补组件能力和验收项，再补示例。</li>
              </>
            )}
          </ul>
        </section>

        <section className="detail-doc__section" id={`${item.id}-examples`} aria-labelledby={`${item.id}-examples-title`}>
          <h2 id={`${item.id}-examples-title`}>示例</h2>
          <p>{getExampleGuidance(item)}</p>
          <div className="button-doc-demo-grid detail-doc-specimen-grid">
            {specimens}
          </div>
        </section>

        <section className="detail-doc__section" id={`${item.id}-api`} aria-labelledby={`${item.id}-api-title`}>
          <h2 id={`${item.id}-api-title`}>API</h2>
          <DataTable rows={apiRows} />
        </section>

        <section className="detail-doc__section" id={`${item.id}-semantic`} aria-labelledby={`${item.id}-semantic-title`}>
          <h2 id={`${item.id}-semantic-title`}>Semantic DOM</h2>
          <DataTable rows={semanticRows} />
        </section>

        <section className="detail-doc__section" id={`${item.id}-token`} aria-labelledby={`${item.id}-token-title`}>
          <h2 id={`${item.id}-token-title`}>Design Token</h2>
          <DataTable rows={tokenRows} />
        </section>

        <section className="detail-doc__section" id={`${item.id}-a11y`} aria-labelledby={`${item.id}-a11y-title`}>
          <h2 id={`${item.id}-a11y-title`}>a11y</h2>
          <ul className="button-doc-list">
            {overlayA11yNotes.length > 0 ? (
              overlayA11yNotes.map((note) => <li key={note}>{note}</li>)
            ) : isOverlayItem(item) ? (
              <>
                <li>触发器必须自身可聚焦并有可访问名称；组件只补充浮层关系，不替宿主生成名称。</li>
                <li>Tooltip 使用 aria-describedby，Popover 使用 dialog 关系、焦点进入、Tab 循环和关闭后焦点恢复。</li>
                <li>Escape、外部点击和 blur 都必须能关闭临时浮层，避免键盘用户被遮挡。</li>
              </>
            ) : isLoadingFeedbackItem(item) ? (
              <>
                <li>loading 容器使用 aria-busy，状态节点使用 role=status 或 progressbar，不把装饰动画暴露给辅助技术。</li>
                <li>Progress 的 status 色只是辅助信号，aria-valuetext 或可见文本必须表达真实进度和状态。</li>
                <li>遵循 prefers-reduced-motion：Spin、Skeleton shimmer、Progress indeterminate 在减弱动态下停止动画。</li>
              </>
            ) : (
              <>
                <li>交互组件必须有键盘可达路径、可见 focus-visible 和可访问名称。</li>
                <li>状态组件必须避免只靠颜色传达信息，文本或语义属性要能表达状态。</li>
                <li>Charts 和复杂业务组件必须由宿主提供可读 summary 或 title。</li>
              </>
            )}
          </ul>
        </section>

        <section className="detail-doc__section" id={`${item.id}-mobile`} aria-labelledby={`${item.id}-mobile-title`}>
          <h2 id={`${item.id}-mobile-title`}>mobile</h2>
          {overlayMobileNote ? (
            <p>{overlayMobileNote}</p>
          ) : businessMobileNote ? (
            <p>{businessMobileNote}</p>
          ) : isOverlayItem(item) ? (
            <p>
              浮层按 320px 以上视口验收：fixed 坐标会夹紧到屏幕内，左右 placement 在小屏仍可见；Tooltip 的触控 hover
              会转为点按开关，Popover 默认 click 适配触控。
            </p>
          ) : isLoadingFeedbackItem(item) ? (
            <p>
              Skeleton、Spin、Progress 均按 320px 以上宽度验收。文本允许换行，条形进度和骨架行使用 min-width: 0 与 overflow-wrap，
              包裹式 Spin 保持内容挂载并避免移动端横向溢出。
            </p>
          ) : (
            <p>
              当前文档站按 320px 以上宽度验收可读性。组件进入移动场景前，需要补触控尺寸、换行、横向溢出和弹层定位复核。
            </p>
          )}
        </section>

        <section className="detail-doc__section" id={`${item.id}-security`} aria-labelledby={`${item.id}-security-title`}>
          <h2 id={`${item.id}-security-title`}>security</h2>
          <p>
            {isOverlayItem(item)
              ? "不允许引入 antd、antd-mobile 或 @ant-design/charts。Tooltip/Popover 只渲染 ReactNode，不解析 HTML 字符串，也不写入 innerHTML；宿主若传入富内容，净化责任在内容生成侧。"
              : "不允许引入 antd、antd-mobile 或 @ant-design/charts。渲染用户输入、HTML、Markdown、SVG、URL 或文件内容时必须做转义、净化或宿主侧边界声明。"}
          </p>
        </section>

        <section className="detail-doc__section" id={`${item.id}-gaps`} aria-labelledby={`${item.id}-gaps-title`}>
          <h2 id={`${item.id}-gaps-title`}>缺口</h2>
          <p>{item.risk}</p>
        </section>
      </div>

      <aside className="component-doc-page__anchor-slot" aria-label={`${item.name} 页面锚点`}>
        <span>验收维度</span>
        <ul>
          {anchors.map((anchor) => (
            <li key={anchor.id}>
              <a href={`#${item.id}-${anchor.id}`}>{anchor.label}</a>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
