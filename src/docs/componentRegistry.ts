export type RegistryGroupId =
  | "general"
  | "layout"
  | "navigation"
  | "data-entry"
  | "data-display"
  | "feedback"
  | "other";

export type RegistryGroupName = "通用" | "布局" | "导航" | "数据录入" | "数据展示" | "反馈" | "其他";

export type ComponentCategoryId = "base" | "business" | "charts";
export type ComponentCategoryName = "Base" | "Business" | "Charts";
export type ComponentLayer = "foundation" | "base" | "business" | "charts";
export type ImplementationStatus = "production" | "stub" | "planned";
export type DocsStatus = "ready" | "stub" | "planned";
export type CapabilityStatus = "covered" | "partial" | "planned";

export type ComponentId =
  | "button"
  | "float-button"
  | "icon"
  | "typography"
  | "divider"
  | "flex"
  | "grid"
  | "layout"
  | "masonry"
  | "space"
  | "splitter"
  | "anchor"
  | "breadcrumb"
  | "dropdown"
  | "menu"
  | "pagination"
  | "steps"
  | "tabs"
  | "auto-complete"
  | "cascader"
  | "checkbox"
  | "color-picker"
  | "date-picker"
  | "form"
  | "input"
  | "input-number"
  | "mentions"
  | "radio"
  | "rate"
  | "select"
  | "slider"
  | "switch"
  | "time-picker"
  | "transfer"
  | "tree-select"
  | "upload"
  | "avatar"
  | "badge"
  | "calendar"
  | "card"
  | "carousel"
  | "collapse"
  | "descriptions"
  | "empty"
  | "image"
  | "list"
  | "popover"
  | "qr-code"
  | "segmented"
  | "statistic"
  | "table"
  | "tag"
  | "timeline"
  | "tooltip"
  | "tour"
  | "tree"
  | "alert"
  | "drawer"
  | "message"
  | "modal"
  | "notification"
  | "popconfirm"
  | "progress"
  | "result"
  | "skeleton"
  | "spin"
  | "watermark"
  | "util"
  | "affix"
  | "app"
  | "border-beam"
  | "config-provider";

export type CustomComponentId =
  | "textarea"
  | "icon-button"
  | "toolbar";

export type BusinessComponentId =
  | "metric-card"
  | "mini-chart-card"
  | "data-toolbar"
  | "filter-panel"
  | "property-list"
  | "status-timeline"
  | "command-palette"
  | "code-block"
  | "markdown-editor"
  | "mermaid-svg-viewer"
  | "mobile-preview-frame";

export type ChartComponentId =
  | "line-chart"
  | "bar-chart"
  | "pie-chart"
  | "area-chart"
  | "sparkline"
  | "scatter-chart"
  | "radar-chart"
  | "heatmap"
  | "treemap"
  | "funnel-chart"
  | "gauge-chart"
  | "sankey-chart"
  | "organization-chart"
  | "mind-map"
  | "word-cloud";

export type DocsComponentId = ComponentId | CustomComponentId | BusinessComponentId | ChartComponentId;
export type DocsPageId = "overview" | "playground" | DocsComponentId;

export type ComponentItem = {
  id: ComponentId;
  name: string;
  chineseName: string;
  componentGroup: RegistryGroupName;
  layer: ComponentLayer;
  description: string;
  implementationStatus: ImplementationStatus;
  docsStatus: DocsStatus;
  capabilityStatus: CapabilityStatus;
  source: `llms-full-cn:${string}`;
};

export type DocsComponentSource = `llms-full-cn:${string}` | "custom" | `charts:${string}`;

export type DocsComponentItem = {
  id: DocsComponentId;
  name: string;
  chineseName: string;
  category: ComponentCategoryName;
  categoryId: ComponentCategoryId;
  group: string;
  layer: ComponentLayer;
  description: string;
  implementationStatus: ImplementationStatus;
  docsStatus: DocsStatus;
  capabilityStatus: CapabilityStatus;
  source: DocsComponentSource;
  tags: string[];
  risk: string;
};

export type ComponentGroup = {
  id: RegistryGroupId;
  title: RegistryGroupName;
  description: string;
  items: ComponentItem[];
};

export type CustomComponentItem = {
  id: CustomComponentId;
  name: string;
  chineseName: string;
  layer: "base" | "business";
  description: string;
  implementationStatus: ImplementationStatus;
  docsStatus: DocsStatus;
  capabilityStatus: CapabilityStatus;
  source: "custom";
  tags: string[];
  risk: string;
};

const groupDefinitions: Array<Omit<ComponentGroup, "items">> = [
  {
    id: "general",
    title: "通用",
    description: "覆盖动作、文本、图标等最基础的产品表达入口。",
  },
  {
    id: "layout",
    title: "布局",
    description: "覆盖页面结构、间距、栅格、拆分与瀑布流等排布能力。",
  },
  {
    id: "navigation",
    title: "导航",
    description: "覆盖站内跳转、层级路径、菜单、分页、步骤与内容切换。",
  },
  {
    id: "data-entry",
    title: "数据录入",
    description: "覆盖表单、选择、上传、日期时间和各类输入控制。",
  },
  {
    id: "data-display",
    title: "数据展示",
    description: "覆盖列表、表格、状态、统计、提示和复杂信息展示。",
  },
  {
    id: "feedback",
    title: "反馈",
    description: "覆盖提示、弹层、加载、进度、结果与系统反馈。",
  },
  {
    id: "other",
    title: "其他",
    description: "覆盖全局能力、固定定位、应用包裹和补充视觉能力。",
  },
];

export const componentItems: ComponentItem[] = [
  {
    id: "button",
    name: "Button",
    chineseName: "按钮",
    componentGroup: "通用",
    layer: "base",
    description: "触发即时操作、提交动作和命令入口。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:Button",
  },
  {
    id: "float-button",
    name: "FloatButton",
    chineseName: "悬浮按钮",
    componentGroup: "通用",
    layer: "base",
    description: "承载固定在视口边缘的快捷操作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:FloatButton",
  },
  {
    id: "icon",
    name: "Icon",
    chineseName: "图标",
    componentGroup: "通用",
    layer: "base",
    description: "提供可识别的视觉符号和状态提示。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Icon",
  },
  {
    id: "typography",
    name: "Typography",
    chineseName: "排版",
    componentGroup: "通用",
    layer: "base",
    description: "组织标题、正文、内联代码、键盘标记、省略、复制和语义文本。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Typography",
  },
  {
    id: "divider",
    name: "Divider",
    chineseName: "分割线",
    componentGroup: "布局",
    layer: "base",
    description: "分隔内容区块并辅助信息层次。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Divider",
  },
  {
    id: "flex",
    name: "Flex",
    chineseName: "弹性布局",
    componentGroup: "布局",
    layer: "base",
    description: "按方向、间距和对齐组织弹性容器。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Flex",
  },
  {
    id: "grid",
    name: "Grid",
    chineseName: "栅格",
    componentGroup: "布局",
    layer: "base",
    description: "建立响应式列宽和页面网格规则。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Grid",
  },
  {
    id: "layout",
    name: "Layout",
    chineseName: "布局",
    componentGroup: "布局",
    layer: "base",
    description: "搭建页头、侧栏、内容区和页脚骨架。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Layout",
  },
  {
    id: "masonry",
    name: "Masonry",
    chineseName: "瀑布流",
    componentGroup: "布局",
    layer: "base",
    description: "排列高度不一的卡片或媒体内容。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Masonry",
  },
  {
    id: "space",
    name: "Space",
    chineseName: "间距",
    componentGroup: "布局",
    layer: "base",
    description: "为一组相邻元素提供稳定间距。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Space",
  },
  {
    id: "splitter",
    name: "Splitter",
    chineseName: "分隔面板",
    componentGroup: "布局",
    layer: "base",
    description: "将区域拆成可调整尺寸的面板。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Splitter",
  },
  {
    id: "anchor",
    name: "Anchor",
    chineseName: "锚点",
    componentGroup: "导航",
    layer: "base",
    description: "在长页面中定位章节和当前位置。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Anchor",
  },
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    chineseName: "面包屑",
    componentGroup: "导航",
    layer: "base",
    description: "展示当前位置的层级路径。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Breadcrumb",
  },
  {
    id: "dropdown",
    name: "Dropdown",
    chineseName: "下拉菜单",
    componentGroup: "导航",
    layer: "base",
    description: "通过触发器展开一组菜单操作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:Dropdown",
  },
  {
    id: "menu",
    name: "Menu",
    chineseName: "导航菜单",
    componentGroup: "导航",
    layer: "base",
    description: "组织站点导航、侧栏导航和操作分组。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Menu",
  },
  {
    id: "pagination",
    name: "Pagination",
    chineseName: "分页",
    componentGroup: "导航",
    layer: "base",
    description: "在分页数据集之间切换和定位。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Pagination",
  },
  {
    id: "steps",
    name: "Steps",
    chineseName: "步骤条",
    componentGroup: "导航",
    layer: "base",
    description: "展示流程步骤、进度和当前阶段。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Steps",
  },
  {
    id: "tabs",
    name: "Tabs",
    chineseName: "标签页",
    componentGroup: "导航",
    layer: "base",
    description: "在同级内容面板之间切换。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Tabs",
  },
  {
    id: "auto-complete",
    name: "AutoComplete",
    chineseName: "自动完成",
    componentGroup: "数据录入",
    layer: "base",
    description: "在输入过程中提供候选项补全，支持过滤、受控展开和键盘 combobox。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:AutoComplete",
  },
  {
    id: "cascader",
    name: "Cascader",
    chineseName: "级联选择",
    componentGroup: "数据录入",
    layer: "base",
    description: "从层级选项中逐级选择目标值。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Cascader",
  },
  {
    id: "checkbox",
    name: "Checkbox",
    chineseName: "多选框",
    componentGroup: "数据录入",
    layer: "base",
    description: "表达布尔选择或多项选择。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Checkbox",
  },
  {
    id: "color-picker",
    name: "ColorPicker",
    chineseName: "颜色选择器",
    componentGroup: "数据录入",
    layer: "base",
    description: "选择、预览和输入颜色值。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:ColorPicker",
  },
  {
    id: "date-picker",
    name: "DatePicker",
    chineseName: "日期选择框",
    componentGroup: "数据录入",
    layer: "base",
    description: "选择单个日期，支持日历网格、月份导航、边界和禁用日期规则。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:DatePicker",
  },
  {
    id: "form",
    name: "Form",
    chineseName: "表单",
    componentGroup: "数据录入",
    layer: "base",
    description: "组织字段、字段组、错误说明、布局和原生提交。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:Form",
  },
  {
    id: "input",
    name: "Input",
    chineseName: "输入框",
    componentGroup: "数据录入",
    layer: "base",
    description: "承载单行文本、前后缀和输入状态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Input",
  },
  {
    id: "input-number",
    name: "InputNumber",
    chineseName: "数字输入框",
    componentGroup: "数据录入",
    layer: "base",
    description: "录入、调整和校验数值。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:InputNumber",
  },
  {
    id: "mentions",
    name: "Mentions",
    chineseName: "提及",
    componentGroup: "数据录入",
    layer: "base",
    description: "在文本输入中插入人员或对象提及。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:Mentions",
  },
  {
    id: "radio",
    name: "Radio",
    chineseName: "单选框",
    componentGroup: "数据录入",
    layer: "base",
    description: "在互斥选项中选择一个值。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Radio",
  },
  {
    id: "rate",
    name: "Rate",
    chineseName: "评分",
    componentGroup: "数据录入",
    layer: "base",
    description: "用离散等级表达评分或偏好。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Rate",
  },
  {
    id: "select",
    name: "Select",
    chineseName: "选择器",
    componentGroup: "数据录入",
    layer: "base",
    description: "从有限候选项中选择单个值，保留原生表单和移动端选择器能力。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Select",
  },
  {
    id: "slider",
    name: "Slider",
    chineseName: "滑动输入条",
    componentGroup: "数据录入",
    layer: "base",
    description: "通过滑动位置在连续或等距范围内选择单个值或范围。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Slider",
  },
  {
    id: "switch",
    name: "Switch",
    chineseName: "开关",
    componentGroup: "数据录入",
    layer: "base",
    description: "切换即时生效的二元状态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Switch",
  },
  {
    id: "time-picker",
    name: "TimePicker",
    chineseName: "时间选择框",
    componentGroup: "数据录入",
    layer: "base",
    description: "选择一天内的时间点，支持秒、步长、范围和原生移动端选择器。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:TimePicker",
  },
  {
    id: "transfer",
    name: "Transfer",
    chineseName: "穿梭框",
    componentGroup: "数据录入",
    layer: "base",
    description: "在两个集合之间移动选中项，支持搜索、批量选择、禁用项、键盘和长列表渲染预算。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Transfer",
  },
  {
    id: "tree-select",
    name: "TreeSelect",
    chineseName: "树选择",
    componentGroup: "数据录入",
    layer: "base",
    description: "从树形结构中选择一个或多个节点，支持搜索、键盘导航和可选勾选。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:TreeSelect",
  },
  {
    id: "upload",
    name: "Upload",
    chineseName: "上传",
    componentGroup: "数据录入",
    layer: "base",
    description: "选择本地文件、校验类型和大小，并呈现文件列表与移除操作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Upload",
  },
  {
    id: "avatar",
    name: "Avatar",
    chineseName: "头像",
    componentGroup: "数据展示",
    layer: "base",
    description: "展示用户、组织或对象的识别图形。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Avatar",
  },
  {
    id: "badge",
    name: "Badge",
    chineseName: "徽标数",
    componentGroup: "数据展示",
    layer: "base",
    description: "在目标旁展示数量、状态或提醒。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Badge",
  },
  {
    id: "calendar",
    name: "Calendar",
    chineseName: "日历",
    componentGroup: "数据展示",
    layer: "base",
    description: "按日期网格展示日程和日期信息。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Calendar",
  },
  {
    id: "card",
    name: "Card",
    chineseName: "卡片",
    componentGroup: "数据展示",
    layer: "base",
    description: "承载独立内容块、操作和状态摘要。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Card",
  },
  {
    id: "carousel",
    name: "Carousel",
    chineseName: "走马灯",
    componentGroup: "数据展示",
    layer: "base",
    description: "轮播展示一组图片、卡片或内容页。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Carousel",
  },
  {
    id: "collapse",
    name: "Collapse",
    chineseName: "折叠面板",
    componentGroup: "数据展示",
    layer: "base",
    description: "折叠或展开分组内容区域。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Collapse",
  },
  {
    id: "descriptions",
    name: "Descriptions",
    chineseName: "描述列表",
    componentGroup: "数据展示",
    layer: "base",
    description: "以标签和值展示对象详情。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Descriptions",
  },
  {
    id: "empty",
    name: "Empty",
    chineseName: "空状态",
    componentGroup: "数据展示",
    layer: "base",
    description: "在无数据或无结果时提供状态表达。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Empty",
  },
  {
    id: "image",
    name: "Image",
    chineseName: "图片",
    componentGroup: "数据展示",
    layer: "base",
    description: "展示图片内容并承载预览场景。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Image",
  },
  {
    id: "list",
    name: "List",
    chineseName: "列表",
    componentGroup: "数据展示",
    layer: "base",
    description: "按行展示同类数据和操作入口。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:List",
  },
  {
    id: "popover",
    name: "Popover",
    chineseName: "气泡卡片",
    componentGroup: "数据展示",
    layer: "base",
    description: "在触发目标旁展示补充内容卡片。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Popover",
  },
  {
    id: "qr-code",
    name: "QRCode",
    chineseName: "二维码",
    componentGroup: "数据展示",
    layer: "base",
    description: "生成可扫描的信息二维码区域。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:QRCode",
  },
  {
    id: "segmented",
    name: "Segmented",
    chineseName: "分段控制器",
    componentGroup: "数据展示",
    layer: "base",
    description: "在少量互斥选项之间切换。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Segmented",
  },
  {
    id: "statistic",
    name: "Statistic",
    chineseName: "统计数值",
    componentGroup: "数据展示",
    layer: "base",
    description: "突出展示关键数字、单位和趋势。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Statistic",
  },
  {
    id: "table",
    name: "Table",
    chineseName: "表格",
    componentGroup: "数据展示",
    layer: "base",
    description: "展示结构化数据、列配置、状态和横向滚动。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Table",
  },
  {
    id: "tag",
    name: "Tag",
    chineseName: "标签",
    componentGroup: "数据展示",
    layer: "base",
    description: "展示轻量标签、分类和状态元信息。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Tag",
  },
  {
    id: "timeline",
    name: "Timeline",
    chineseName: "时间轴",
    componentGroup: "数据展示",
    layer: "base",
    description: "按时间顺序展示事件节点。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Timeline",
  },
  {
    id: "tooltip",
    name: "Tooltip",
    chineseName: "文字提示",
    componentGroup: "数据展示",
    layer: "base",
    description: "在悬停或聚焦时展示短提示文本。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Tooltip",
  },
  {
    id: "tour",
    name: "Tour",
    chineseName: "漫游式引导",
    componentGroup: "数据展示",
    layer: "base",
    description: "分步引导用户理解关键界面区域。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Tour",
  },
  {
    id: "tree",
    name: "Tree",
    chineseName: "树形控件",
    componentGroup: "数据展示",
    layer: "base",
    description: "展示可展开的层级数据结构。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Tree",
  },
  {
    id: "alert",
    name: "Alert",
    chineseName: "警告提示",
    componentGroup: "反馈",
    layer: "base",
    description: "展示页面内的提示、警告或成功信息。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Alert",
  },
  {
    id: "drawer",
    name: "Drawer",
    chineseName: "抽屉",
    componentGroup: "反馈",
    layer: "base",
    description: "从屏幕边缘展开临时面板。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Drawer",
  },
  {
    id: "message",
    name: "Message",
    chineseName: "全局提示",
    componentGroup: "反馈",
    layer: "base",
    description: "展示短暂的全局操作反馈。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Message",
  },
  {
    id: "modal",
    name: "Modal",
    chineseName: "对话框",
    componentGroup: "反馈",
    layer: "base",
    description: "阻断当前流程并要求用户处理重点内容。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Modal",
  },
  {
    id: "notification",
    name: "Notification",
    chineseName: "通知提醒框",
    componentGroup: "反馈",
    layer: "base",
    description: "在页面边缘展示较完整的系统通知。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Notification",
  },
  {
    id: "popconfirm",
    name: "Popconfirm",
    chineseName: "气泡确认框",
    componentGroup: "反馈",
    layer: "base",
    description: "在轻量场景中确认危险或关键操作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Popconfirm",
  },
  {
    id: "progress",
    name: "Progress",
    chineseName: "进度条",
    componentGroup: "反馈",
    layer: "base",
    description: "展示任务进度、完成比例和状态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Progress",
  },
  {
    id: "result",
    name: "Result",
    chineseName: "结果",
    componentGroup: "反馈",
    layer: "base",
    description: "在流程结束后展示结果状态和下一步动作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Result",
  },
  {
    id: "skeleton",
    name: "Skeleton",
    chineseName: "骨架屏",
    componentGroup: "反馈",
    layer: "base",
    description: "在内容加载前展示结构占位。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Skeleton",
  },
  {
    id: "spin",
    name: "Spin",
    chineseName: "加载中",
    componentGroup: "反馈",
    layer: "base",
    description: "展示局部或全局加载状态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Spin",
  },
  {
    id: "watermark",
    name: "Watermark",
    chineseName: "水印",
    componentGroup: "反馈",
    layer: "base",
    description: "在内容区域上叠加所有权、审阅或环境标识。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Watermark",
  },
  {
    id: "util",
    name: "Util",
    chineseName: "工具类",
    componentGroup: "其他",
    layer: "foundation",
    description: "沉淀跨组件复用的 cx、URL、SVG、Markdown 安全工具能力和辅助方法。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Util",
  },
  {
    id: "affix",
    name: "Affix",
    chineseName: "固钉",
    componentGroup: "其他",
    layer: "base",
    description: "让内容在滚动时固定在指定位置。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:Affix",
  },
  {
    id: "app",
    name: "App",
    chineseName: "包裹组件",
    componentGroup: "其他",
    layer: "foundation",
    description: "提供应用级上下文和全局反馈承载点。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:App",
  },
  {
    id: "border-beam",
    name: "BorderBeam",
    chineseName: "边框流光",
    componentGroup: "其他",
    layer: "base",
    description: "提供中性、低干扰的独立边框流光装饰层。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "llms-full-cn:BorderBeam",
  },
  {
    id: "config-provider",
    name: "ConfigProvider",
    chineseName: "全局化配置",
    componentGroup: "其他",
    layer: "foundation",
    description: "集中配置主题、国际化和组件上下文。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "llms-full-cn:ConfigProvider",
  },
];

export const componentGroups: ComponentGroup[] = groupDefinitions.map((group) => ({
  ...group,
  items: componentItems.filter((item) => item.componentGroup === group.title),
}));

export const customComponents: CustomComponentItem[] = [
  {
    id: "textarea",
    name: "Textarea",
    chineseName: "多行输入",
    layer: "base",
    description: "自有基础组件，用于长文本录入场景。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["input", "form", "resize", "autosize", "count", "error", "aria", "mobile"],
    risk: "复杂表单校验、富文本编辑和异步保存不在 Textarea 内建范围，需由业务表单层组合。",
  },
  {
    id: "icon-button",
    name: "IconButton",
    chineseName: "图标按钮",
    layer: "base",
    description: "自有基础组件，用于固定尺寸图标操作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["action", "icon", "accessibility", "tooltip", "pressed"],
    risk: "图标图形仍由调用方提供，需要确保符号含义和 label 文案一致。",
  },
  {
    id: "toolbar",
    name: "Toolbar",
    chineseName: "工具栏",
    layer: "base",
    description: "自有基础组件，用于组织紧凑命令组。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["commands", "grouping", "editor", "mobile"],
    risk: "键盘快捷键和复合方向键模型由业务编辑器按命令语义接管。",
  },
];

export const businessComponents: DocsComponentItem[] = [
  {
    id: "metric-card",
    name: "MetricCard",
    chineseName: "指标卡片",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "展示核心指标、趋势状态和可降级的图表槽位。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["metric", "trend", "loading", "error", "empty", "mobile"],
    risk: "生产 API 覆盖指标值、delta、状态、chart slot 和移动密度；宿主仍需为自定义 chart 提供可读摘要。",
  },
  {
    id: "mini-chart-card",
    name: "MiniChartCard",
    chineseName: "迷你图表卡片",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "组合 MetricCard 与 Sparkline 的小型指标趋势卡片。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["metric", "sparkline", "status", "loading", "a11y", "mobile"],
    risk: "仅服务小型单指标趋势摘要；复杂图表分析仍应使用 Charts 组件，纯数值摘要仍应使用 MetricCard。",
  },
  {
    id: "data-toolbar",
    name: "DataToolbar",
    chineseName: "数据工具栏",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "组织搜索、筛选、结果计数、动作和数据状态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["search", "filters", "actions", "loading", "error", "mobile"],
    risk: "批量选择模型仍由宿主表格或列表管理，Toolbar 只承载动作入口、查询入口和状态表达。",
  },
  {
    id: "filter-panel",
    name: "FilterPanel",
    chineseName: "筛选面板",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "承载结构化筛选项、活跃计数和应用/重置动作。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["filters", "form", "fields", "apply", "reset", "mobile"],
    risk: "字段值、校验规则和跨字段联动仍归宿主表单模型，FilterPanel 负责布局、提交和状态壳。",
  },
  {
    id: "property-list",
    name: "PropertyList",
    chineseName: "属性列表",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "展示业务对象属性摘要，覆盖键值、状态、复制/动作槽位、徽标和补充说明。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["properties", "status", "copy", "actions", "empty", "mobile"],
    risk: "DescriptionList 仅为兼容别名；暂未内置剪贴板写入、可编辑字段和折叠分组，超大数据量应拆分页或虚拟化。",
  },
  {
    id: "status-timeline",
    name: "StatusTimeline",
    chineseName: "状态时间线",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "展示流程节点、当前状态、异常节点和附加元信息。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["workflow", "timeline", "status", "error", "warning", "a11y"],
    risk: "长列表虚拟化、分组时间轴和交互式审批操作暂未内置，应由上层业务组合。",
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    chineseName: "命令面板",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "提供桌面命令搜索、键盘选择和 dialog 交互。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["commands", "search", "dialog", "keyboard", "focus", "mobile"],
    risk: "权限、审计和异步命令生命周期仍由宿主管理，组件只负责显式激活边界。",
  },
  {
    id: "code-block",
    name: "CodeBlock",
    chineseName: "代码块",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "展示不可执行代码文本，提供复制降级、行号、加载、错误和空态。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["code", "copy", "fallback", "loading", "error", "mobile"],
    risk: "暂未内置语法高亮、diff gutter 和虚拟滚动，避免新增重量依赖。",
  },
  {
    id: "markdown-editor",
    name: "MarkdownEditor",
    chineseName: "Markdown 编辑器",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "组合编辑、预览、Markdown 渲染和 Mermaid SVG 查看。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["markdown", "preview", "mermaid", "split"],
    risk: "Mermaid 渲染依赖 heavy runtime；长文档性能仍需按产品场景补分块或懒渲染。",
  },
  {
    id: "mermaid-svg-viewer",
    name: "MermaidSvgViewer",
    chineseName: "Mermaid SVG 查看器",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "渲染、安全清洗并提供平移/缩放/适配控制的 Mermaid SVG 查看器。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["mermaid", "svg", "sanitize", "pan", "zoom"],
    risk: "仅接受 Mermaid 文本；超长 source 默认拒绝渲染以降低前端阻塞和资源滥用风险。",
  },
  {
    id: "mobile-preview-frame",
    name: "MobilePreviewFrame",
    chineseName: "移动预览框",
    category: "Business",
    categoryId: "business",
    group: "自有业务组件",
    layer: "business",
    description: "在无 iframe 安全复杂度下模拟移动 viewport、device chrome 和可滚动预览画布。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "custom",
    tags: ["mobile", "preview", "viewport", "device-chrome", "scroll", "a11y"],
    risk: "不提供第三方页面嵌入或跨域隔离；宿主传入的 React children 仍需按自身组件安全契约审查。",
  },
];

export const chartComponents: DocsComponentItem[] = [
  {
    id: "line-chart",
    name: "LineChart",
    chineseName: "折线图",
    category: "Charts",
    categoryId: "charts",
    group: "基础图表",
    layer: "charts",
    description: "展示单序列连续数据趋势、阶段变化和峰谷波动。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Line",
    tags: ["trend", "svg", "responsive", "state"],
    risk: "默认按 160 点抽样，适合单序列趋势摘要；多序列、插值、键盘 tooltip 和原始大数据审计需另配表格或聚合层。",
  },
  {
    id: "bar-chart",
    name: "BarChart",
    chineseName: "条形图",
    category: "Charts",
    categoryId: "charts",
    group: "基础图表",
    layer: "charts",
    description: "比较少量分类数值，支持正负值、重复标签、状态层和移动端横向滚动。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Bar",
    tags: ["comparison", "category", "signed-values", "svg", "mobile", "state"],
    risk: "默认按 160 柱抽样并横向滚动；横向柱、堆叠柱、分组柱、键盘 tooltip 和数据表 fallback 仍需补齐。",
  },
  {
    id: "pie-chart",
    name: "PieChart",
    chineseName: "饼图",
    category: "Charts",
    categoryId: "charts",
    group: "基础图表",
    layer: "charts",
    description: "表达少量分类的占比关系。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Pie",
    tags: ["proportion", "legend", "svg", "state"],
    risk: "默认最多 40 个正值切片并聚合为 Other；外部标签、扇区选中和小切片避让仍需后续扩展。",
  },
  {
    id: "area-chart",
    name: "AreaChart",
    chineseName: "面积图",
    category: "Charts",
    categoryId: "charts",
    group: "基础图表",
    layer: "charts",
    description: "强调趋势下的累计量、区间变化和对比。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Area",
    tags: ["trend", "volume", "multi-series", "svg", "state"],
    risk: "默认按 160 点总预算抽样，支持单/多序列面积趋势；堆叠、区间带、极值标注和原始大数据审计需另配聚合层。",
  },
  {
    id: "sparkline",
    name: "Sparkline",
    chineseName: "迷你趋势图",
    category: "Charts",
    categoryId: "charts",
    group: "指标图表",
    layer: "charts",
    description: "在紧凑空间展示指标趋势，不承载完整坐标轴。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Tiny",
    tags: ["metric", "tiny", "svg", "state"],
    risk: "当前只表达趋势，不提供坐标轴和逐点交互，需由宿主提供摘要。",
  },
  {
    id: "scatter-chart",
    name: "ScatterChart",
    chineseName: "散点图",
    category: "Charts",
    categoryId: "charts",
    group: "统计分析",
    layer: "charts",
    description: "展示两个变量之间的分布、相关性和离群点。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Scatter",
    tags: ["distribution", "correlation", "analysis", "svg", "table-fallback"],
    risk: "当前面向小中型点集，支持原生 SVG title 和 table fallback；框选、缩放、聚合和大量数据策略待补。",
  },
  {
    id: "radar-chart",
    name: "RadarChart",
    chineseName: "雷达图",
    category: "Charts",
    categoryId: "charts",
    group: "基础图表",
    layer: "charts",
    description: "比较多个维度的轮廓和相对强弱。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Radar",
    tags: ["polar", "profile", "comparison", "svg", "legend"],
    risk: "当前面向 3-12 个维度和最多 12 条序列画像；精确数值审计、多轴异构口径和键盘 tooltip 仍需宿主补充说明或表格。",
  },
  {
    id: "heatmap",
    name: "Heatmap",
    chineseName: "热力图",
    category: "Charts",
    categoryId: "charts",
    group: "统计分析",
    layer: "charts",
    description: "用色阶展示二维矩阵中的强弱分布。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "charts:Heatmap",
    tags: ["matrix", "density", "analysis", "svg", "legend", "table"],
    risk: "默认限制到 30x30 类目和 900 单元格；超大热力图仍需虚拟化、canvas 或业务聚合策略。",
  },
  {
    id: "treemap",
    name: "Treemap",
    chineseName: "矩形树图",
    category: "Charts",
    categoryId: "charts",
    group: "统计分析",
    layer: "charts",
    description: "用嵌套矩形表达层级数据的占比。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "charts:Treemap",
    tags: ["hierarchy", "proportion", "analysis", "svg", "keyboard", "squarify"],
    risk: "默认最多 120 个显式层级节点，超出部分聚合为 Other；暂未支持钻取、动画和大数据虚拟化。",
  },
  {
    id: "funnel-chart",
    name: "FunnelChart",
    chineseName: "漏斗图",
    category: "Charts",
    categoryId: "charts",
    group: "统计分析",
    layer: "charts",
    description: "展示流程阶段转化、损耗和排序。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "charts:Funnel",
    tags: ["conversion", "process", "analysis", "svg", "state"],
    risk: "默认最多 40 个正值阶段；percent 为相对首阶段，dropoff 为相对上一阶段；尚未支持多漏斗对比和键盘 tooltip。",
  },
  {
    id: "gauge-chart",
    name: "GaugeChart",
    chineseName: "仪表盘",
    category: "Charts",
    categoryId: "charts",
    group: "指标图表",
    layer: "charts",
    description: "展示单个指标的区间、阈值和当前值。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "covered",
    source: "charts:Gauge",
    tags: ["indicator", "threshold", "metric", "meter", "svg", "responsive"],
    risk: "仅承载单指标区间和阈值判断，不替代 Progress 的任务完成度；尚未支持多指针、环形满圆和键盘 tooltip。",
  },
  {
    id: "sankey-chart",
    name: "SankeyChart",
    chineseName: "桑基图",
    category: "Charts",
    categoryId: "charts",
    group: "关系与流向",
    layer: "charts",
    description: "展示节点之间的流量、路径和损耗。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:Sankey",
    tags: ["flow", "relation", "svg", "layered", "state"],
    risk: "默认最多 120 节点 / 180 链路，支持简单 layer 推断；不是复杂自动布局全覆盖，尚未支持交叉最小化、循环图和键盘 tooltip。",
  },
  {
    id: "organization-chart",
    name: "OrganizationChart",
    chineseName: "组织架构图",
    category: "Charts",
    categoryId: "charts",
    group: "关系与流向",
    layer: "charts",
    description: "展示组织、岗位或树状层级关系。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:OrganizationChart",
    tags: ["tree", "relation", "business", "svg", "html", "mobile"],
    risk: "默认最多 120 归一化节点和 8 层，支持 SVG 连接线、折叠、缩放、平移、可见叶子窗口和移动端堆叠；搜索定位属于后续增强。",
  },
  {
    id: "mind-map",
    name: "MindMap",
    chineseName: "思维导图",
    category: "Charts",
    categoryId: "charts",
    group: "关系与流向",
    layer: "charts",
    description: "展示中心主题向外展开的层级内容。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:MindMap",
    tags: ["hierarchy", "knowledge", "collapse", "svg"],
    risk: "默认最多 120 节点和 6 层，适合小中型思维导图；大规模画布、搜索定位和自由拖拽仍需后续补齐。",
  },
  {
    id: "word-cloud",
    name: "WordCloud",
    chineseName: "词云",
    category: "Charts",
    categoryId: "charts",
    group: "文本分布",
    layer: "charts",
    description: "用字号和布局表达关键词权重。",
    implementationStatus: "production",
    docsStatus: "ready",
    capabilityStatus: "partial",
    source: "charts:WordCloud",
    tags: ["text", "distribution", "svg", "fallback"],
    risk: "默认布局 36 词、硬上限 80 词；当前为轻量确定性 best effort 布局，不支持旋转、形状蒙版、动画退火和千级词表。",
  },
];

export const docsComponentItems: DocsComponentItem[] = [
  ...componentItems.map((item): DocsComponentItem => ({
    ...item,
    category: "Base",
    categoryId: "base",
    group: item.componentGroup,
    tags:
      item.id === "menu"
        ? ["navigation", "items", "groups", "submenu", "selected", "disabled", "keyboard", "mobile"]
        : item.id === "popconfirm"
          ? ["feedback", "confirm", "keyboard", "escape", "outside-click", "focus-return", "mobile"]
        : item.id === "app"
          ? ["provider", "shell", "message", "notification", "overlay", "safe-area"]
        : [item.layer, item.componentGroup, item.capabilityStatus],
    risk:
      item.id === "menu"
        ? "Submenu focus, roving tabindex, horizontal overflow, and mobile behavior must stay independent from Dropdown trigger/popover semantics."
        : item.id === "popconfirm"
          ? "保持轻量确认边界；复杂表单、长说明和阻断流程应升级为 Modal 或 Drawer。"
        : item.id === "table"
          ? "当前是基础展示表格，已覆盖状态、横向滚动、行数预算和长文本策略；排序、筛选、分页、选择和固定列仍由业务层组合。"
        : item.id === "app"
          ? "App 只提供 feedback 与 overlay 边界；主题 token、locale 和组件默认值必须保持在 ConfigProvider 文档与实现之外。"
        : item.implementationStatus === "planned"
        ? "尚未实现，当前仅作为能力规划登记。"
        : item.docsStatus === "ready"
          ? "已进入生产文档框架，仍需按验收项持续补齐覆盖。"
          : "已有组件实现，但详细文档仍是占位。",
  })),
  ...customComponents.map((item): DocsComponentItem => ({
    ...item,
    category: "Base",
    categoryId: "base",
    group: "自有基础扩展",
  })),
  ...businessComponents,
  ...chartComponents,
];

export type DocsComponentGroup = {
  id: string;
  title: string;
  description: string;
  category: ComponentCategoryName;
  categoryId: ComponentCategoryId;
  items: DocsComponentItem[];
};

const docsComponentGroupItems: DocsComponentGroup[] = [
  ...componentGroups.map((group): DocsComponentGroup => ({
    id: `base-${group.id}`,
    title: group.title,
    description: group.description,
    category: "Base",
    categoryId: "base",
    items: docsComponentItems.filter((item) => item.categoryId === "base" && item.group === group.title),
  })),
  {
    id: "base-custom",
    title: "自有基础扩展",
    description: "覆盖非 AntD 顶级条目的自有基础组件，保留生产状态和文档占位。",
    category: "Base",
    categoryId: "base",
    items: docsComponentItems.filter((item) => item.categoryId === "base" && item.group === "自有基础扩展"),
  },
  {
    id: "business-custom",
    title: "自有业务组件",
    description: "组合基础组件和领域能力的业务层组件。",
    category: "Business",
    categoryId: "business",
    items: docsComponentItems.filter((item) => item.categoryId === "business"),
  },
  ...["基础图表", "统计分析", "指标图表", "关系与流向", "文本分布"].map((title): DocsComponentGroup => ({
    id: `charts-${title}`,
    title,
    description: "Charts 能力登记为一等文档入口；未实现项保持 planned。",
    category: "Charts" as const,
    categoryId: "charts" as const,
    items: docsComponentItems.filter((item) => item.categoryId === "charts" && item.group === title),
  })),
];

export const docsComponentGroups: DocsComponentGroup[] = docsComponentGroupItems.filter(
  (group): group is DocsComponentGroup => group.items.length > 0,
);

export function isComponentId(value: string): value is ComponentId {
  return componentItems.some((item) => item.id === value);
}

export function getComponentItem(id: ComponentId): ComponentItem {
  return componentItems.find((item) => item.id === id) ?? componentItems[0];
}

export function isDocsComponentId(value: string): value is DocsComponentId {
  return docsComponentItems.some((item) => item.id === value);
}

export function getDocsComponentItem(id: DocsComponentId): DocsComponentItem {
  return docsComponentItems.find((item) => item.id === id) ?? docsComponentItems[0];
}
