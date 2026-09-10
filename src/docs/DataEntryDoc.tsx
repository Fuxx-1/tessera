import { useState, type ReactNode } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Cascader,
  Checkbox,
  ColorPicker,
  DatePicker,
  Descriptions,
  Field,
  Fieldset,
  Form,
  Input,
  InputNumber,
  Mentions,
  RadioGroup,
  Rate,
  Select,
  Slider,
  Switch,
  Tag,
  Textarea,
  TimePicker,
  Toolbar,
  ToolbarGroup,
  Transfer,
  TreeSelect,
  Upload,
  type CascaderOption,
  type DescriptionsItem,
  type TransferItem,
  type TreeSelectNode,
} from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

type DataEntryDocProps = {
  showAnchors?: boolean;
};

type TutorialDemo = {
  code: string;
  component: string;
  lesson: string;
  preview: ReactNode;
  route: string;
  status: string;
  tags: string[];
};

const dataEntryComponents = [
  "AutoComplete",
  "Cascader",
  "Checkbox",
  "ColorPicker",
  "DatePicker",
  "Form",
  "Input",
  "InputNumber",
  "Mentions",
  "Radio",
  "Rate",
  "Select",
  "Slider",
  "Switch",
  "Textarea",
  "TimePicker",
  "Transfer",
  "TreeSelect",
  "Upload",
];

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Ready", value: "ready" },
  { disabled: true, label: "Frozen", value: "frozen" },
];

const ownerOptions = [
  { description: "Platform owner", label: "Ada Lovelace", value: "ada" },
  { description: "Design systems", label: "Grace Hopper", value: "grace" },
  { description: "Disabled candidate", disabled: true, label: "Readonly Bot", value: "bot" },
  { description: "Rendered as text", label: "<img src=x onerror=alert(1)>", value: "unsafe" },
];

const regionOptions: CascaderOption[] = [
  {
    label: "China",
    value: "cn",
    children: [
      { label: "Hangzhou", value: "hangzhou" },
      { disabled: true, label: "Shanghai freeze window", value: "shanghai" },
    ],
  },
  {
    label: "Europe",
    value: "eu",
    children: [{ label: "Frankfurt", value: "frankfurt" }],
  },
];

const mentionOptions = [
  { avatar: "AL", label: "Ada Lovelace", value: "ada" },
  { avatar: "GH", label: "Grace Hopper", value: "grace" },
  { disabled: true, label: "Locked Room", value: "locked-room" },
  { label: "XSS text <script>alert(1)</script>", value: "<script>alert(1)</script>" },
];

const transferItems: TransferItem[] = [
  { description: "Can move between lists", key: "audit-log", label: "Audit log" },
  { description: "Disabled source item", disabled: true, key: "billing", label: "Billing export" },
  { description: "Long labels wrap inside the panel", key: "customer-health", label: "Customer health metrics" },
  { description: "Already selected", key: "release-note", label: "Release note" },
];

const treeData: TreeSelectNode[] = [
  {
    label: "Engineering",
    value: "engineering",
    children: [
      { label: "Components", value: "engineering-components" },
      { label: "Quality", value: "engineering-quality" },
    ],
  },
  {
    label: "Operations",
    value: "operations",
    children: [{ disabled: true, label: "Locked queue", value: "operations-locked" }],
  },
];

const reviewItems: DescriptionsItem[] = [
  { key: "product", label: "产品专家", value: "路径明确：聚合页给起步教程，单组件页给完整边界。" },
  { key: "ui", label: "UI 专家", value: "教程容器统一用 DemoContainer、Card、Tag、Descriptions 和 Toolbar。" },
  { key: "engineering", label: "研发专家", value: "19 个组件均给一行样例代码与真实可操作预览。" },
  { key: "test", label: "测试专家", value: "范围内 smoke 使用 #component 路由分批执行，覆盖 360/390/430。" },
  { key: "security", label: "白帽专家", value: "危险 label、上传文件名、禁用项、键盘焦点和弹层边界进入核验。" },
  { key: "theme", label: "暗色", value: "聚合页复用令牌驱动组件，单组件页保留 dark/mobile 说明。" },
];

const mobileItems: DescriptionsItem[] = [
  { key: "dropdown", label: "下拉类", value: "AutoComplete、Cascader、Select、Mentions、TreeSelect、TimePicker 弹层限制在视口内。" },
  { key: "date", label: "日期类", value: "DatePicker 面板使用内部滚动和只读输入，避免移动键盘遮挡日历。" },
  { key: "upload", label: "上传类", value: "Upload 只触发原生 file picker，文件名换行，不读取内容或生成 object URL。" },
  { key: "layout", label: "360/390/430", value: "教程网格降为单列，代码块内部滚动，预览不撑出页面主体。" },
];

export const dataEntryDocMeta = {
  title: "Data Entry 数据录入",
  category: "基础组件",
  anchors: [
    { id: "data-entry-scope", label: "范围" },
    { id: "data-entry-demos", label: "组件教程" },
    { id: "data-entry-form", label: "表单语义" },
    { id: "data-entry-mobile", label: "移动端" },
    { id: "data-entry-review", label: "五角色审查" },
    { id: "data-entry-risks", label: "风险" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Form><Field label="Project" required><Input name="project" /></Field></Form>`;

export function DataEntryDoc({ showAnchors = true }: DataEntryDocProps) {
  const [autoCompleteValue, setAutoCompleteValue] = useState("Ada");
  const [cascadeValue, setCascadeValue] = useState(["cn", "hangzhou"]);
  const [checked, setChecked] = useState(true);
  const [color, setColor] = useState("#246bfe");
  const [date, setDate] = useState("2026-06-19");
  const [numberValue, setNumberValue] = useState<number | "">(24);
  const [mentionValue, setMentionValue] = useState("Assign @ada for review");
  const [radioValue, setRadioValue] = useState("ready");
  const [rating, setRating] = useState(3);
  const [selectValue, setSelectValue] = useState("ready");
  const [sliderValue, setSliderValue] = useState(42);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [textareaValue, setTextareaValue] = useState("Ship the tutorial with mobile and keyboard evidence.");
  const [timeValue, setTimeValue] = useState("09:30");
  const [transferKeys, setTransferKeys] = useState(["release-note"]);
  const [treeValue, setTreeValue] = useState("engineering-components");

  const demos: TutorialDemo[] = [
    {
      code: '<AutoComplete label="Owner" options={ownerOptions} value={owner} onValueChange={setOwner} />',
      component: "AutoComplete",
      lesson: "输入时过滤候选；受控 value 和 onValueChange 适合搜索栏、指派人和命令入口。",
      preview: (
        <AutoComplete
          helpText="输入 ada / grace；危险文本按普通 label 渲染。"
          label="Owner"
          onValueChange={setAutoCompleteValue}
          options={ownerOptions}
          placeholder="Search owner"
          value={autoCompleteValue}
        />
      ),
      route: "#auto-complete",
      status: "受控 / 键盘 / 安全文本",
      tags: ["combobox", "controlled", "keyboard"],
    },
    {
      code: '<Cascader label="Region" options={regionOptions} value={path} onValueChange={setPath} />',
      component: "Cascader",
      lesson: "逐级选择路径值，禁用节点不能被鼠标、触控或键盘提交。",
      preview: (
        <Cascader
          helpText="路径值是 string[]；禁用分支保留可见但不可提交。"
          label="Region"
          onValueChange={setCascadeValue}
          options={regionOptions}
          value={cascadeValue}
        />
      ),
      route: "#cascader",
      status: "路径值 / 禁用节点 / 移动弹层",
      tags: ["dropdown", "path", "mobile"],
    },
    {
      code: '<Checkbox label="Enable audit log" checked={checked} onCheckedChange={setChecked} />',
      component: "Checkbox",
      lesson: "布尔值用 checked/defaultChecked；说明和错误由字段文本与 aria 共同表达。",
      preview: (
        <Checkbox
          checked={checked}
          helpText="Space 可切换；disabled 时不响应。"
          label="Enable audit log"
          onCheckedChange={setChecked}
        />
      ),
      route: "#checkbox",
      status: "布尔 / 说明 / Space",
      tags: ["native", "boolean", "keyboard"],
    },
    {
      code: '<ColorPicker label="Accent" value={color} onValueChange={setColor} swatches={["#246bfe", "#22c55e"]} />',
      component: "ColorPicker",
      lesson: "保留原生颜色选择器和 hex 输入；错误色值会用 aria-invalid 暴露。",
      preview: (
        <ColorPicker
          helpText="原生 picker 在移动端交给系统处理。"
          label="Accent"
          onValueChange={setColor}
          swatches={["#246bfe", "#22c55e", "#f59e0b"]}
          value={color}
        />
      ),
      route: "#color-picker",
      status: "受控 / 色板 / 原生 picker",
      tags: ["native", "hex", "mobile"],
    },
    {
      code: '<DatePicker label="Launch date" value={date} onValueChange={setDate} min="2026-06-01" />',
      component: "DatePicker",
      lesson: "单日期值使用 YYYY-MM-DD；min/max 与 disabledDate 同时约束鼠标和键盘选择。",
      preview: (
        <DatePicker
          helpText="只读输入避免移动端软键盘遮挡日历。"
          label="Launch date"
          min="2026-06-01"
          onValueChange={setDate}
          value={date}
        />
      ),
      route: "#date-picker",
      status: "YYYY-MM-DD / 日历网格 / 移动",
      tags: ["calendar", "controlled", "mobile"],
    },
    {
      code: '<Form><Field label="Project" required help="Shown in audit logs."><Input name="project" /></Field></Form>',
      component: "Form",
      lesson: "Form 负责 label、required、helper text、error、disabled 与原生提交，不内置规则引擎。",
      preview: (
        <Form className="data-entry-doc-mini-form" onSubmit={() => undefined}>
          <Field help="Shown in audit logs and release notes." label="Project" required>
            <Input name="project" placeholder="Tessera docs" />
          </Field>
          <Field error="Slug is required before launch." label="Slug" required>
            <Input name="slug" placeholder="tessera-data-entry" />
          </Field>
        </Form>
      ),
      route: "#form",
      status: "label / error / helper / required",
      tags: ["form", "a11y", "error"],
    },
    {
      code: '<Input label="Project slug" error helpText="Use lowercase letters, numbers, and hyphen." />',
      component: "Input",
      lesson: "单行文本保留原生 input、自动填充、required、disabled、readOnly 和 aria 描述。",
      preview: (
        <Input
          defaultValue="tessera-data-entry"
          error
          helpText="Use lowercase letters, numbers, and hyphen."
          label="Project slug"
          name="projectSlug"
        />
      ),
      route: "#input",
      status: "单行 / 错误 / 原生输入",
      tags: ["native", "error", "text"],
    },
    {
      code: '<InputNumber label="Limit" value={limit} onValueChange={setLimit} min={0} max={100} />',
      component: "InputNumber",
      lesson: "数字输入允许清空中间态；blur、按钮和键盘步进再按 min/max/precision 归一化。",
      preview: (
        <InputNumber
          helpText="清空时返回空字符串，便于表单展示未填写。"
          label="Limit"
          max={100}
          min={0}
          onValueChange={setNumberValue}
          value={numberValue}
        />
      ),
      route: "#input-number",
      status: "范围 / 清空 / 数字键盘",
      tags: ["number", "controlled", "mobile"],
    },
    {
      code: '<Mentions label="Comment" value={text} onValueChange={setText} options={mentionOptions} />',
      component: "Mentions",
      lesson: "textarea 中输入 @ 触发建议；禁用候选不能通过点击或 Enter 插入。",
      preview: (
        <Mentions
          helpText="输入 @ 选择成员；XSS 文本只作为普通字符串插入。"
          label="Comment"
          onValueChange={setMentionValue}
          options={mentionOptions}
          value={mentionValue}
        />
      ),
      route: "#mentions",
      status: "textarea / 建议 / 安全文本",
      tags: ["textarea", "dropdown", "keyboard"],
    },
    {
      code: '<RadioGroup label="Status" options={statusOptions} value={status} onValueChange={setStatus} />',
      component: "Radio",
      lesson: "互斥选择使用共享 name 的原生 radio；水平布局在移动端自动换行。",
      preview: (
        <RadioGroup
          helpText="Frozen 是禁用项。"
          label="Status"
          onValueChange={setRadioValue}
          options={statusOptions}
          orientation="horizontal"
          value={radioValue}
        />
      ),
      route: "#radio",
      status: "互斥 / 禁用项 / 原生 radio",
      tags: ["native", "group", "disabled"],
    },
    {
      code: '<Rate label="Confidence" value={rating} onValueChange={setRating} allowHalf />',
      component: "Rate",
      lesson: "评分可用 radio 语义或 slider 语义；半星和清除都需要明确可访问值。",
      preview: (
        <Rate
          allowHalf
          helpText="再次点击当前值可清除。"
          label="Confidence"
          onValueChange={setRating}
          value={rating}
        />
      ),
      route: "#rate",
      status: "评分 / 半星 / 可清除",
      tags: ["rating", "keyboard", "a11y"],
    },
    {
      code: '<Select label="Status" options={statusOptions} value={status} onValueChange={setStatus} />',
      component: "Select",
      lesson: "下拉选择支持单选/多选、搜索、清除和隐藏字段提交，禁用项不可提交。",
      preview: (
        <Select
          helpText="弹层受视口约束；name 存在时生成隐藏字段。"
          label="Status"
          onValueChange={setSelectValue}
          options={statusOptions}
          value={selectValue}
        />
      ),
      route: "#select",
      status: "combobox / 提交 / 禁用项",
      tags: ["dropdown", "form", "mobile"],
    },
    {
      code: '<Slider label="Sample" value={sample} onValueChange={setSample} min={0} max={100} />',
      component: "Slider",
      lesson: "滑动输入用原生 range，移动端触控和键盘方向键都按 step 调整。",
      preview: (
        <Slider
          helpText="当前值会被 min/max 夹紧。"
          label="Sample"
          max={100}
          min={0}
          onValueChange={(nextValue) => {
            if (typeof nextValue === "number") setSliderValue(nextValue);
          }}
          value={sliderValue}
        />
      ),
      route: "#slider",
      status: "range / step / 触控",
      tags: ["native", "touch", "number"],
    },
    {
      code: '<Switch label="Realtime sync" checked={enabled} onCheckedChange={setEnabled} />',
      component: "Switch",
      lesson: "立即生效的二元状态用 role=switch；loading 和 disabled 都阻止切换。",
      preview: (
        <Switch
          checked={switchChecked}
          helpText="Space 或 Enter 可切换。"
          label="Realtime sync"
          onCheckedChange={setSwitchChecked}
        />
      ),
      route: "#switch",
      status: "二元状态 / role switch / 键盘",
      tags: ["boolean", "keyboard", "a11y"],
    },
    {
      code: '<Textarea label="Release note" value={note} onChange={(event) => setNote(event.currentTarget.value)} showCount />',
      component: "Textarea",
      lesson: "多行文本支持计数、错误说明、resize 策略和移动端 16px 字号。",
      preview: (
        <Textarea
          helpText="长文本在控件内部滚动，不撑破移动宽度。"
          label="Release note"
          maxLength={160}
          minRows={3}
          onChange={(event) => setTextareaValue(event.currentTarget.value)}
          showCount
          value={textareaValue}
        />
      ),
      route: "#textarea",
      status: "多行 / 计数 / 移动键盘",
      tags: ["native", "text", "mobile"],
    },
    {
      code: '<TimePicker label="Start time" value={time} onValueChange={setTime} min="09:00" max="18:00" />',
      component: "TimePicker",
      lesson: "时间值使用 HH:mm 或 HH:mm:ss；step、min/max 和 disabledTime 会约束候选项。",
      preview: (
        <TimePicker
          helpText="ArrowUp / ArrowDown 按 step 调整。"
          label="Start time"
          max="18:00"
          min="09:00"
          onValueChange={setTimeValue}
          value={timeValue}
        />
      ),
      route: "#time-picker",
      status: "时间 / step / 原生 fallback",
      tags: ["time", "keyboard", "mobile"],
    },
    {
      code: '<Transfer dataSource={items} targetKeys={targetKeys} onChange={setTargetKeys} showSearch />',
      component: "Transfer",
      lesson: "左右集合迁移适合权限、成员、字段分配；移动端双栏会堆叠并保留搜索。",
      preview: (
        <Transfer
          dataSource={transferItems}
          leftTitle="Available"
          onChange={setTransferKeys}
          rightTitle="Selected"
          showSearch
          targetKeys={transferKeys}
        />
      ),
      route: "#transfer",
      status: "双列表 / 搜索 / 禁用项",
      tags: ["list", "keyboard", "mobile"],
    },
    {
      code: '<TreeSelect label="Team" treeData={treeData} value={team} onValueChange={setTeam} mobileMode="sheet" />',
      component: "TreeSelect",
      lesson: "树选择适合组织、分类和权限范围；移动端可用底部 sheet 防止被顶部/侧栏遮挡。",
      preview: (
        <TreeSelect
          allowClear
          helpText="搜索只过滤真实节点，不把输入值直接提交。"
          label="Team"
          mobileMode="sheet"
          onValueChange={(nextValue) => setTreeValue(Array.isArray(nextValue) ? (nextValue[0] ?? "") : nextValue)}
          treeData={treeData}
          value={treeValue}
        />
      ),
      route: "#tree-select",
      status: "树 / 搜索 / mobile sheet",
      tags: ["tree", "dropdown", "mobile"],
    },
    {
      code: '<Upload label="Evidence" accept=".png,.jpg,.pdf" maxSize={5 * 1024 * 1024} multiple />',
      component: "Upload",
      lesson: "Upload 只做本地选择与校验；文件名作为文本节点展示，真实上传由业务显式处理。",
      preview: (
        <Upload
          accept=".png,.jpg,.pdf"
          description="选择或拖入文件；不会读取内容、预览或自动上传。"
          label="Evidence"
          maxSize={5 * 1024 * 1024}
          multiple
        />
      ),
      route: "#upload",
      status: "文件 picker / 校验 / 文件名安全",
      tags: ["file", "security", "mobile"],
    },
  ];

  return (
    <TutorialScaffold component="Data Entry" kind="data-entry" oneLineExample={oneLineExample}>
    <main className="button-doc data-entry-doc">
      <div className="button-doc__layout button-doc__layout--with-toc">
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Data Entry 页面目录">
            {dataEntryDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Base / 数据录入 / tutorial owner</p>
            <h2 id="data-entry-doc-title">{dataEntryDocMeta.title}</h2>
            <p>
              本页是数据录入教程的入口，覆盖 {dataEntryComponents.length} 个组件。每个组件都有一行样例代码和真实可操作预览；
              详细 API、状态、移动端和安全边界继续下钻到对应组件页。
            </p>
            <Toolbar className="data-entry-doc-toolbar" compact aria-label="Data entry tutorial routes">
              <ToolbarGroup aria-label="Core routes">
                <Tag tone="info">19 components</Tag>
                <Tag tone="success">one-line samples</Tag>
                <Tag tone="warning">360 / 390 / 430</Tag>
              </ToolbarGroup>
            </Toolbar>
          </header>

          <section className="button-doc-section" id="data-entry-scope" aria-labelledby="data-entry-scope-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-scope-title">范围与教程路径</h3>
              <p>先用聚合页快速理解选择哪一个组件，再进入单组件页学习完整状态和边界。</p>
            </div>
            <Card
              className="data-entry-doc-scope-card"
              description="产品路径按真实组件拆分，不把 Tree、Select、Cascader、Transfer、Upload 混成一个教程。"
              title="教程覆盖组件"
            >
              <div className="data-entry-doc-tags">
                {dataEntryComponents.map((component) => (
                  <Tag key={component} tone="neutral">
                    {component}
                  </Tag>
                ))}
              </div>
            </Card>
          </section>

          <section className="button-doc-section" id="data-entry-demos" aria-labelledby="data-entry-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-demos-title">组件教程</h3>
              <p>每张卡片先给一行代码，再给可交互预览；常见状态写在说明里，避免只展示默认态。</p>
            </div>
            <div className="data-entry-doc-demo-grid">
              {demos.map((demo) => (
                <DemoContainer
                  background="surface"
                  code={demo.code}
                  description={demo.lesson}
                  key={demo.component}
                  title={`${demo.component} - ${demo.status}`}
                >
                  <div className="data-entry-doc-demo">
                    <div className="data-entry-doc-demo__meta">
                      <a href={demo.route}>{demo.component} docs</a>
                      <div className="data-entry-doc-demo__tags">
                        {demo.tags.map((tag) => (
                          <Tag key={tag} size="sm" tone="subtle">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    <div className="data-entry-doc-demo__preview">{demo.preview}</div>
                  </div>
                </DemoContainer>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="data-entry-form" aria-labelledby="data-entry-form-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-form-title">表单语义</h3>
              <p>Form 教程必须讲清 label、error、disabled、required 和 helper text；聚合页也给最小可执行样例。</p>
            </div>
            <DemoContainer
              background="surface"
              code={'<Field label="Release slug" required help="Used in URL." error={error}><Input name="slug" disabled={locked} /></Field>'}
              description="Field 自动关联 label、help、error 和 required；Fieldset 适合成组复选项。"
              title="Form field states"
            >
              <Form className="data-entry-doc-form-demo" layout="vertical">
                <Field help="Used in URLs and audit logs." label="Release slug" required>
                  <Input name="releaseSlug" placeholder="customer-billing-q3" />
                </Field>
                <Field error="Owner is required before submitting." label="Owner" required>
                  <Input name="owner" placeholder="ada" />
                </Field>
                <Field help="Locked while production freeze is active." label="Freeze window">
                  <Input disabled name="freezeWindow" defaultValue="2026-06-19 09:00" />
                </Field>
                <Fieldset description="At least one channel should be selected." legend="Notify channels">
                  <Checkbox defaultChecked label="Email" name="channel" value="email" />
                  <Checkbox label="In-app" name="channel" value="app" />
                </Fieldset>
              </Form>
            </DemoContainer>
          </section>

          <section className="button-doc-section" id="data-entry-mobile" aria-labelledby="data-entry-mobile-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-mobile-title">移动端与暗色</h3>
              <p>下拉、日期、树和上传类组件是移动端高风险点，教程样例必须能在 360/390/430 宽度内操作。</p>
            </div>
            <Descriptions bordered column={{ default: 2, md: 2, sm: 1 }} items={mobileItems} title="Mobile checklist" />
          </section>

          <section className="button-doc-section" id="data-entry-review" aria-labelledby="data-entry-review-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-review-title">五角色审查</h3>
              <p>本 owner 小组把五个角色结论集中在教程入口，组件页继续保留逐项说明。</p>
            </div>
            <Descriptions bordered column={{ default: 2, md: 2, sm: 1 }} items={reviewItems} title="Owner review" />
          </section>

          <section className="button-doc-section" id="data-entry-risks" aria-labelledby="data-entry-risks-title">
            <div className="button-doc-section__heading">
              <h3 id="data-entry-risks-title">剩余风险</h3>
              <p>当前教程不掩盖能力边界，避免用户把基础组件误当完整业务方案。</p>
            </div>
            <ul className="button-doc-list">
              <li>Upload 不自动上传、不读取文件内容、不做服务端安全校验；业务后端必须重新验证 MIME、扩展名、大小、内容和权限。</li>
              <li>Transfer、TreeSelect、Cascader 的大数据、远端搜索和虚拟化由业务侧扩展；当前教程只承诺本地中小规模交互。</li>
              <li>Form 不内置规则引擎；label、helper、error、required 和 disabled 已覆盖，具体校验策略由宿主管理。</li>
              <li>移动端 smoke 需要配合真实浏览器执行；若 Chrome 不可用，应明确记录阻塞而不是口头通过。</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
    </TutorialScaffold>
  );
}

export type { DataEntryDocProps };
