import { useState, type ReactNode } from "react";
import { Radio, RadioGroup } from "../components/base";
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

export type RadioDocProps = {
  showAnchors?: boolean;
};

export const radioDocMeta = {
  title: "Radio 单选框",
  category: "基础组件",
  anchors: [
    { id: "radio-experts", label: "五专家结论" },
    { id: "radio-when", label: "何时使用" },
    { id: "radio-demos", label: "代码演示" },
    { id: "radio-api", label: "Radio API" },
    { id: "radio-group-api", label: "RadioGroup API" },
    { id: "radio-semantic", label: "Semantic DOM" },
    { id: "radio-a11y", label: "可访问性" },
    { id: "radio-mobile", label: "移动端" },
    { id: "radio-security", label: "安全" },
    { id: "radio-token", label: "Design Token" },
    { id: "radio-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<RadioGroup aria-label="通知范围" orientation="horizontal" defaultValue="mentions" options={options} />`;

const radioApiRows: DocRow[] = [
  {
    name: "checked",
    value: "boolean",
    description: "受控选中状态。单独使用 Radio 时由调用方协调同 name 的互斥关系。",
  },
  {
    name: "defaultChecked",
    value: "boolean",
    description: "非受控初始选中状态。",
  },
  {
    name: "onCheckedChange",
    value: "(checked: boolean) => void",
    description: "选中状态变化时触发；RadioGroup 内部只在变为 true 时更新 value。",
  },
  {
    name: "onChange",
    value: "ChangeEventHandler<HTMLInputElement>",
    description: "原生 input change 事件，保留表单、校验和埋点需要的事件对象。",
  },
  {
    name: "error",
    value: "boolean",
    description: "展示错误边框，并为输入设置 aria-invalid。",
  },
  {
    name: "helpText",
    value: "ReactNode",
    description: "单个选项的说明文本，通过 aria-describedby 与 input 关联。",
  },
  {
    name: "label",
    value: "ReactNode",
    description: "可点击标签内容。无可见 label 时调用方应传入 aria-label。",
  },
  {
    name: "InputHTMLAttributes",
    value: "native input props",
    description: "继承 name、value、required、disabled、form、aria-label 等原生 radio 属性。",
  },
];

const radioGroupApiRows: DocRow[] = [
  {
    name: "options",
    value: "RadioOption[]",
    description: "选项数组，包含 value、label，可选 disabled 和 helpText。",
  },
  {
    name: "value",
    value: "string",
    description: "受控选中值。未传入 value/defaultValue 时默认不选中任何项。",
  },
  {
    name: "defaultValue",
    value: "string",
    description: "非受控初始选中值。",
  },
  {
    name: "onValueChange",
    value: "(value: string) => void",
    description: "选中项变化时触发，返回对应 option.value。",
  },
  {
    name: "onChange",
    value: "ChangeEventHandler<HTMLInputElement>",
    description: "透传每个原生 radio 的 change 事件，便于读取 event.currentTarget.name/value。",
  },
  {
    name: "name",
    value: "string",
    description: "传给每个 radio 的原生 name；未传入时自动生成，确保组内互斥。",
  },
  {
    name: "orientation",
    value: '"vertical" | "horizontal"',
    description: "控制选项排列方向。默认 vertical；horizontal 在窄屏自动换行。",
  },
  {
    name: "label",
    value: "ReactNode",
    description: "组标题，通过 aria-labelledby 与 radiogroup 关联。",
  },
  {
    name: "aria-label",
    value: "string",
    description: "无可见 label 时为 radiogroup 提供可访问名称。",
  },
  {
    name: "helpText",
    value: "ReactNode",
    description: "组级说明或错误文案，通过 aria-describedby 与 radiogroup 关联。",
  },
  {
    name: "error / disabled",
    value: "boolean",
    description: "统一控制组级错误和禁用状态。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "Radio root",
    value: "label",
    description: "单个选项整行可点击，文字和说明都属于同一个选择目标。",
  },
  {
    name: "Radio control",
    value: 'input[type="radio"]',
    description: "原生 input 负责键盘、表单提交、required、checked 和 disabled 语义。",
  },
  {
    name: "RadioGroup root",
    value: 'div[role="radiogroup"]',
    description: "组容器提供 radiogroup 角色，并关联 label 或 aria-label 与 helpText。",
  },
  {
    name: "group name",
    value: "shared input name",
    description: "RadioGroup 会为全部选项共享同一个 name，确保原生互斥选择。",
  },
  {
    name: "checked state",
    value: "checked / unchecked",
    description: "同一组内任意时刻最多一个 input.checked 为 true；未命中 value 时全部保持 unchecked。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "native radio",
    description: "Tab 进入组内当前项；Space 选中当前项；方向键由浏览器在同 name radio 间移动。",
  },
  {
    name: "Focus",
    value: ":focus-visible",
    description: "键盘聚焦时在自绘圆点上显示 2px 中性色焦点环。",
  },
  {
    name: "Name",
    value: "label / aria-label",
    description: "推荐传入可见 label；无可见标题时必须传入 aria-label 或 aria-labelledby。",
  },
  {
    name: "Error",
    value: "aria-invalid + helpText",
    description: "错误状态搭配可读 helpText，避免只依赖颜色提示。",
  },
  {
    name: "Disabled",
    value: "disabled",
    description: "组级 disabled 会透传到每个 input；单项 disabled 保留在选项级配置中。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px min height",
    description: "粗指针设备下整行命中区提升到 44px，自绘圆点仍保持稳定尺寸。",
  },
  {
    name: "Wrapping",
    value: "content grid",
    description: "标签和说明可换行，长文本不会挤压控件本身。",
  },
  {
    name: "Horizontal group",
    value: "row wrap",
    description: "横向 RadioGroup 在 375/390px 移动宽度下自动换行，避免页面横向滚动。",
  },
];

const securityRows: DocRow[] = [
  { name: "HTML injection", value: "ReactNode only", description: "文档与组件不使用 dangerouslySetInnerHTML；label/helpText 由 React 渲染和转义。" },
  { name: "External deps", value: "none", description: "未引入 antd、antd-mobile、@ant-design/charts 或远程脚本。" },
  { name: "Form surface", value: "native radio props", description: "name/value/form 作为原生表单属性透传；宿主负责服务端校验和权限判断。" },
  { name: "Group semantics", value: "radiogroup + shared name", description: "互斥逻辑依赖浏览器原生 radio 行为，不执行字符串、不读取外部资源。" },
];

const tokenRows: DocRow[] = [
  {
    name: "control size",
    value: "18px",
    description: "自绘圆点尺寸固定，触控命中区由外层 label min-height 扩大。",
  },
  {
    name: "border",
    value: "#c8c8c3 / #111110 / #9f2424",
    description: "默认、选中和错误边框均使用中性色与深红提示色，不引入蓝色主色。",
  },
  {
    name: "focus ring",
    value: "2px solid #555552",
    description: "键盘焦点与其它数据录入控件保持一致。",
  },
  {
    name: "group gap",
    value: "10px vertical / 12px 18px horizontal",
    description: "纵向适合表单字段，横向适合一行短选项。",
  },
];

const expertRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "Radio 独立承载互斥选一场景，不再与 Checkbox 合并解释。" },
  { name: "UI专家", value: "PASS", description: "圆形单选控件、选中点、错误态和横向一行样例与 Checkbox 方形勾选视觉边界清晰。" },
  { name: "研发专家", value: "PASS", description: "文档样例只引用 Radio/RadioGroup 真实 API，顶层 meta、样例和页面结构位于 RadioDoc.tsx。" },
  { name: "测试专家", value: "PASS", description: "可按 #radio、role=radiogroup、input[type=radio]、aria-invalid、disabled 定位验收。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入、无外部 UI/图表依赖；风险集中在宿主传入 ReactNode 与表单提交的业务校验。" },
];

const faqItems = [
  {
    question: "Radio 和 Checkbox 的边界是什么？",
    answer: "Radio 只能用于互斥选一；多个条件可以同时成立时使用 Checkbox。两者文档和样例保持独立。",
  },
  {
    question: "为什么不用自定义 roving tabindex？",
    answer: "当前组件保留原生 radio input，让浏览器处理方向键、表单提交和禁用语义，复杂度更低也更稳。",
  },
  {
    question: "可以只使用单个 Radio 吗？",
    answer: "可以，但推荐优先使用 RadioGroup 管理 name、role、label 和 value；单独使用时由业务层维护互斥状态。",
  },
];

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型 / 值</th>
            <th>说明</th>
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

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
      <pre className="button-doc-code">
        <code>{code}</code>
      </pre>
    </article>
  );
}

function ControlledDensityDemo() {
  const [density, setDensity] = useState("comfortable");

  return (
    <div className="radio-doc-stack">
      <RadioGroup
        label="界面密度"
        onValueChange={setDensity}
        options={[
          { label: "紧凑", value: "compact" },
          { label: "舒适", value: "comfortable", helpText: "默认推荐" },
          { label: "宽松", value: "spacious" },
        ]}
        value={density}
      />
      <p className="radio-doc-output" aria-live="polite">
        当前密度：{density === "compact" ? "紧凑" : density === "spacious" ? "宽松" : "舒适"}
      </p>
    </div>
  );
}

function InlineDemo() {
  const [notification, setNotification] = useState("mentions");

  return (
    <RadioGroup
      aria-label="通知范围"
      className="radio-doc-inline-group"
      onValueChange={setNotification}
      options={[
        { label: "全部", value: "all" },
        { label: "仅提及", value: "mentions" },
        { label: "关闭", value: "off" },
      ]}
      orientation="horizontal"
      value={notification}
    />
  );
}

function SafeReactNodeDemo() {
  return (
    <RadioGroup
      defaultValue="text"
      label="标签渲染"
      options={[
        { label: <span>{"<img src=x onerror=alert(1)> 作为纯文本显示"}</span>, value: "text" },
        { label: <strong>允许安全 ReactNode 组合</strong>, value: "node", helpText: "不解析 HTML 字符串。" },
      ]}
    />
  );
}

const demos: Demo[] = [
  {
    title: "RadioGroup 受控",
    description: "RadioGroup 负责 name、role 和组内互斥，业务只维护 value。",
    preview: <ControlledDensityDemo />,
    code: `<RadioGroup label="界面密度" value={density} options={options} onValueChange={setDensity} />`,
  },
  {
    title: "样例统一一行",
    description: "短选项使用 horizontal，适合工具条或紧凑表单区域；窄屏会自动换行。",
    preview: <InlineDemo />,
    code: `<RadioGroup aria-label="通知范围" orientation="horizontal" value={notification} options={options} onValueChange={setNotification} />`,
  },
  {
    title: "禁用与组说明",
    description: "组级说明关联 radiogroup；禁用项保留在选项级，不影响其它选项。",
    preview: (
      <RadioGroup
        defaultValue="beta"
        helpText="Canary 在本发布窗口暂停。"
        label="发布通道"
        name="radio-doc-release-channel"
        options={[
          { label: "Stable", value: "stable", helpText: "推荐生产租户使用。" },
          { label: "Beta", value: "beta", helpText: "包含验证中的功能开关。" },
          { disabled: true, label: "Canary", value: "canary", helpText: "等待下一轮灰度。" },
        ]}
      />
    ),
    code: `<RadioGroup label="发布通道" defaultValue="beta" helpText="Canary 在本发布窗口暂停。" options={options} />`,
  },
  {
    title: "错误状态",
    description: "组级 error 关联 radiogroup 和 helpText，用于必选校验。",
    preview: (
      <RadioGroup
        error
        helpText="请选择一个交付窗口。"
        label="交付窗口"
        options={[
          { label: "今天", value: "today" },
          { label: "本周", value: "week" },
        ]}
      />
    ),
    code: `<RadioGroup error label="交付窗口" helpText="请选择一个交付窗口。" options={options} />`,
  },
  {
    title: "安全 ReactNode",
    description: "label/helpText 接收 ReactNode；字符串内容由 React 转义，不使用 HTML 注入。",
    preview: <SafeReactNodeDemo />,
    code: `<RadioGroup label="标签渲染" defaultValue="text" options={[{ label: "<img src=x onerror=alert(1)> 作为纯文本显示", value: "text" }]} />`,
  },
  {
    title: "单个 Radio",
    description: "单独使用时传入相同 name，由调用方协调 checked 状态。",
    preview: (
      <div className="radio-doc-stack">
        <Radio checked label="主工作区" name="workspace" value="main" />
        <Radio disabled label="归档工作区" name="workspace" value="archive" />
      </div>
    ),
    code: `<><Radio checked name="workspace" value="main" label="主工作区" /><Radio disabled name="workspace" value="archive" label="归档工作区" /></>`,
  },
];

export function RadioDoc({ showAnchors = false }: RadioDocProps) {
  return (
    <TutorialScaffold component="Radio" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="button-doc radio-doc" aria-labelledby="radio-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Radio 文档目录">
            {radioDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="radio-doc-title">{radioDocMeta.title}</h2>
            <p>
              用于从一组互斥选项中选择一个值。当前实现保留原生{" "}
              <code>input[type="radio"]</code>，由 RadioGroup 提供组级语义、说明和受控状态。
            </p>
          </header>

          <section className="button-doc-section" id="radio-experts" aria-labelledby="radio-experts-title">
            <div className="button-doc-section__heading">
              <h3 id="radio-experts-title">五专家小组结论</h3>
              <p>产品、UI、研发、测试、白帽共同确认 Radio 作为独立基础组件文档交付。</p>
            </div>
            <DataTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="radio-when" aria-labelledby="radio-when-title">
            <h3 id="radio-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于明确的一组互斥选项，用户只能选择其中一个值。</li>
              <li>选项数量少且需要完整暴露时优先使用 RadioGroup；选项很多时考虑 Select。</li>
              <li>多项可同时选择时不要使用 Radio，应使用 Checkbox。</li>
              <li>未提供 value/defaultValue 时保持 unchecked；disabled 选项不参与点击或键盘切换。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="radio-demos" aria-labelledby="radio-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="radio-demos-title">代码演示</h3>
              <p>示例覆盖 checked、unchecked、disabled、group、错误、键盘可达、触控命中、安全 ReactNode 和一行横向样例。</p>
            </div>
            <div className="button-doc-demo-grid radio-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="radio-api" aria-labelledby="radio-api-title">
            <h3 id="radio-api-title">Radio API</h3>
            <DataTable rows={radioApiRows} />
          </section>

          <section className="button-doc-section" id="radio-group-api" aria-labelledby="radio-group-api-title">
            <h3 id="radio-group-api-title">RadioGroup API</h3>
            <DataTable rows={radioGroupApiRows} />
          </section>

          <section className="button-doc-section" id="radio-semantic" aria-labelledby="radio-semantic-title">
            <h3 id="radio-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="radio-a11y" aria-labelledby="radio-a11y-title">
            <h3 id="radio-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="radio-mobile" aria-labelledby="radio-mobile-title">
            <h3 id="radio-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="radio-security" aria-labelledby="radio-security-title">
            <h3 id="radio-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="radio-token" aria-labelledby="radio-token-title">
            <h3 id="radio-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="radio-faq" aria-labelledby="radio-faq-title">
            <h3 id="radio-faq-title">FAQ</h3>
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
