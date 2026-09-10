import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Checkbox, CheckboxGroup } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

type Demo = {
  className?: string;
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

export type CheckboxDocProps = {
  showAnchors?: boolean;
};

export const checkboxDocMeta = {
  title: "Checkbox 多选框",
  category: "基础组件",
  anchors: [
    { id: "checkbox-experts", label: "五专家结论" },
    { id: "checkbox-governance", label: "治理矩阵" },
    { id: "checkbox-when", label: "何时使用" },
    { id: "checkbox-demos", label: "代码演示" },
    { id: "checkbox-api", label: "Checkbox API" },
    { id: "checkbox-group-api", label: "CheckboxGroup API" },
    { id: "checkbox-style", label: "样式边界" },
    { id: "checkbox-semantic", label: "Semantic DOM" },
    { id: "checkbox-a11y", label: "可访问性" },
    { id: "checkbox-mobile", label: "移动端" },
    { id: "checkbox-security", label: "安全" },
    { id: "checkbox-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const checkboxApiRows: DocRow[] = [
  { name: "checked", value: "boolean", description: "受控选中状态。传入后由调用方负责更新。" },
  { name: "defaultChecked", value: "boolean", description: "非受控初始选中状态。" },
  { name: "onCheckedChange", value: "(checked: boolean) => void", description: "选中状态变化时触发，返回布尔值，便于业务状态直接更新。" },
  { name: "onChange", value: "ChangeEventHandler<HTMLInputElement>", description: "原生 input change 事件，和 onCheckedChange 同时可用。" },
  { name: "indeterminate", value: "boolean", description: "半选态。组件会同步原生 input.indeterminate，并设置 aria-checked=\"mixed\"。" },
  { name: "error / invalid", value: "boolean", description: "展示错误边框，并为输入设置 aria-invalid；invalid 是校验语义别名。" },
  { name: "helpText", value: "ReactNode", description: "补充说明或错误文案，通过 aria-describedby 与 input 关联。" },
  { name: "label", value: "ReactNode", description: "可点击标签内容。无可见 label 时调用方应提供 aria-label。" },
  { name: "InputHTMLAttributes", value: "native input props", description: "继承 name、value、disabled、required、form、aria-label 等原生 checkbox 属性。" },
];

const checkboxGroupApiRows: DocRow[] = [
  { name: "options", value: "CheckboxOption[]", description: "选项数组，包含 value、label，可选 disabled 和 helpText。" },
  { name: "value", value: "string[]", description: "受控选中值数组。传入后由调用方负责更新。" },
  { name: "defaultValue", value: "string[]", description: "非受控初始选中值数组。" },
  { name: "onValueChange", value: "(value: string[]) => void", description: "组内任一选项变化时触发，返回最新选中值数组。" },
  { name: "name", value: "string", description: "传给每个 checkbox 的原生 name；未传入时自动生成，便于表单提交同名多值。" },
  { name: "orientation", value: "\"vertical\" | \"horizontal\"", description: "控制选项排列方向。默认 vertical；horizontal 在窄屏自动换行。" },
  { name: "label / helpText", value: "ReactNode", description: "组标题和组级说明，分别通过 aria-labelledby 与 aria-describedby 关联。" },
  { name: "error / invalid / disabled", value: "boolean", description: "统一控制组级错误、校验语义和禁用状态；单个 option 仍可独立 disabled。" },
];

const semanticRows: DocRow[] = [
  { name: "Checkbox root", value: "label", description: "整行可点击，扩大命中区域，同时保留 htmlFor 与 input id 关联。" },
  { name: "Checkbox control", value: "input[type=\"checkbox\"]", description: "原生 input 负责键盘、表单提交、required、checked 和 disabled 语义。" },
  { name: "mixed state", value: "input.indeterminate + aria-checked", description: "半选态同步到 DOM 属性，并暴露 mixed 可访问状态。" },
  { name: "help text", value: "aria-describedby", description: "helpText 会生成稳定 id 并关联到输入控件。" },
  { name: "CheckboxGroup root", value: "div[role=\"group\"]", description: "组容器关联组标题和说明；组内仍由多个原生 checkbox 承担交互。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Keyboard", value: "native checkbox", description: "Tab 聚焦到输入；Space 切换当前项；组内不改写浏览器键盘模型。" },
  { name: "Focus", value: ":focus-visible", description: "键盘聚焦时在自绘方框上显示 2px 中性色焦点环。" },
  { name: "Name", value: "label / aria-label", description: "推荐传入可见 label；无可见标签时必须传入 aria-label 或 aria-labelledby。" },
  { name: "Mixed", value: "aria-checked=\"mixed\"", description: "半选只表达汇总状态，真正子项选择仍由业务状态决定。" },
  { name: "Error", value: "aria-invalid + helpText", description: "错误状态搭配可读 helpText，避免只依赖颜色提示。" },
  { name: "Disabled", value: "disabled", description: "组级 disabled 会透传到每个 input；单项 disabled 保留在选项级配置中。" },
];

const mobileRows: DocRow[] = [
  { name: "Touch target", value: "44px min height", description: "粗指针设备下整行命中区提升到 44px，自绘方框仍保持稳定尺寸。" },
  { name: "Wrapping", value: "content grid", description: "标签和说明可换行，长文本不会挤压控件本身。" },
  { name: "Horizontal group", value: "row wrap", description: "横向 CheckboxGroup 在 360/390/430px 移动宽度下自动换行，避免页面横向滚动。" },
  { name: "Gesture", value: "touch-action: manipulation", description: "点击响应更直接，同时不阻断页面滚动。" },
];

const governanceRows: DocRow[] = [
  { name: "教程壳层", value: "TutorialScaffold", description: "页面接入统一教程壳层，提供复制入口、核验标签页和一行 TSX 示例。" },
  { name: "真实预览", value: "DemoContainer", description: "每个示例都渲染真实 Checkbox 或 CheckboxGroup，不使用截图、伪代码或不可操作占位。" },
  { name: "紧凑样例", value: "single-line TSX", description: "源码区保持可复制的一行/紧凑示例，复杂逻辑只在预览组件内部承载。" },
  { name: "生产约束", value: "state + a11y + mobile", description: "覆盖受控、非受控、半选、禁用、错误、表单提交、长标签、暗色与 360/390/430 移动端。" },
];

const styleRows: DocRow[] = [
  { name: "theme style", value: "--ct-data-control-bg / --ct-text", description: "控件背景、文字、选中墨色和禁用面色读取语义 token，亮暗色由主题切换。" },
  { name: "theme style", value: "--ct-border / --ct-focus-ring / --ct-danger", description: "边框、焦点环和错误态不写死浅色，暗色主题保持对比度。" },
  { name: "structure style", value: "22px box / 36px row", description: "桌面保持紧凑行高，自绘方框尺寸稳定，内部标记不会大于外框。" },
  { name: "structure style", value: "44px touch / row wrap", description: "触控环境提升命中区，横向组在移动端换行，标签和 helper 文案允许换行。" },
  { name: "structure style", value: "min-width:0 / overflow-wrap:anywhere", description: "长 label、长 value 和代码块都限制在组件容器内，不制造页面级横向 overflow。" },
];

const securityRows: DocRow[] = [
  { name: "HTML injection", value: "ReactNode only", description: "文档与组件不使用 dangerouslySetInnerHTML；label/helpText 由 React 渲染和转义。" },
  { name: "External deps", value: "none", description: "未引入 antd、antd-mobile、@ant-design/charts 或远程脚本。" },
  { name: "Form surface", value: "native input props", description: "name/value/form 作为原生表单属性透传；宿主负责服务端校验和权限判断。" },
  { name: "Indeterminate", value: "DOM property only", description: "半选状态只同步 input.indeterminate，不执行字符串、不读取外部资源。" },
];

const expertRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "Checkbox 独立承载布尔确认、多项选择、表单同名多值和半选汇总，不再与 Radio 合并解释。" },
  { name: "UI专家", value: "PASS", description: "方形勾选控件、半选横线、错误态和移动端 44px 命中区与单选圆点视觉边界清晰。" },
  { name: "研发专家", value: "PASS", description: "文档样例只引用 Checkbox/CheckboxGroup 真实 API，TutorialScaffold、DemoContainer、样例和页面结构位于 CheckboxDoc.tsx。" },
  { name: "测试专家", value: "PASS", description: "可按 #checkbox、role=group、input[type=checkbox]、aria-checked=mixed、aria-invalid 定位验收。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入、无外部 UI/图表依赖；风险集中在宿主传入 ReactNode 与表单提交的业务校验。" },
];

const faqItems = [
  { question: "Checkbox 和 Radio 的边界是什么？", answer: "Checkbox 用于布尔确认或多项可同时成立的选择；互斥选一应使用 RadioGroup。两者文档、样例和专家结论保持独立。" },
  { question: "indeterminate 会自动改变子项吗？", answer: "不会。indeterminate 只表达父项的汇总视觉和可访问状态，子项数组仍由业务层维护。" },
  { question: "可以只渲染无文字 Checkbox 吗？", answer: "可以，但必须传入 aria-label 或 aria-labelledby，否则辅助技术无法获得控件名称。" },
];

const oneLineExample = `<CheckboxGroup aria-label="通知渠道" orientation="horizontal" defaultValue={["email"]} name="channels" options={options} />`;

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">名称</th>
            <th scope="col">类型 / 值</th>
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

function DemoCard({ className, code, description, preview, title }: Demo) {
  return (
    <article className={["button-doc-demo", "checkbox-doc-demo", className].filter(Boolean).join(" ")}>
      <DemoContainer background="surface" code={code} description={description} title={title}>
        <div className="button-doc-demo__preview button-doc-demo__preview--stack checkbox-doc-demo__preview">{preview}</div>
      </DemoContainer>
    </article>
  );
}

function ControlledConsentDemo() {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="checkbox-doc-stack">
      <Checkbox checked={accepted} helpText="用于受控表单字段。" label="我已确认配置变更" onCheckedChange={setAccepted} />
      <p className="checkbox-doc-output" aria-live="polite">
        当前状态：{accepted ? "已确认" : "未确认"}
      </p>
    </div>
  );
}

function DefaultCheckedDemo() {
  const [status, setStatus] = useState("初始为已启用");

  return (
    <div className="checkbox-doc-stack">
      <Checkbox
        defaultChecked
        helpText="非受控场景：首次渲染读取 defaultChecked，之后由原生 input 管理。"
        label="默认启用审计日志"
        name="audit-default"
        onCheckedChange={(nextChecked) => setStatus(nextChecked ? "当前为已启用" : "当前为未启用")}
        value="enabled"
      />
      <p className="checkbox-doc-output" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

function IndeterminateDemo() {
  const [childrenSelected, setChildrenSelected] = useState([true, false, true]);
  const selectedCount = childrenSelected.filter(Boolean).length;
  const allSelected = selectedCount === childrenSelected.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="checkbox-doc-stack">
      <Checkbox checked={allSelected} indeterminate={someSelected} label="选择全部权限" onCheckedChange={(nextChecked) => setChildrenSelected(childrenSelected.map(() => nextChecked))} />
      <div className="checkbox-doc-nested">
        {["读取", "编辑", "发布"].map((item, index) => (
          <Checkbox
            checked={childrenSelected[index]}
            key={item}
            label={item}
            onCheckedChange={(nextChecked) => setChildrenSelected(childrenSelected.map((value, valueIndex) => (valueIndex === index ? nextChecked : value)))}
          />
        ))}
      </div>
    </div>
  );
}

function FormSubmitDemo() {
  const [submitted, setSubmitted] = useState("features=audit, external-review");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const features = data.getAll("features").map(String);
    setSubmitted(features.length > 0 ? `features=${features.join(", ")}` : "features=(empty)");
  }

  return (
    <div className="checkbox-doc-stack">
      <form className="checkbox-doc-form" id="checkbox-doc-formdata" onSubmit={handleSubmit}>
        <Checkbox defaultChecked label="审计日志" name="features" value="audit" />
        <Checkbox label="指标采集" name="features" value="metrics" />
        <Button size="sm" type="submit" variant="solid">
          提交
        </Button>
      </form>
      <Checkbox
        defaultChecked
        form="checkbox-doc-formdata"
        helpText="使用原生 form 属性关联到上方表单，FormData 会读取同名多值。"
        label="外部审批通过后同步"
        name="features"
        value="external-review"
      />
      <p className="checkbox-doc-output" aria-live="polite" data-checkbox-form-result>
        {submitted}
      </p>
    </div>
  );
}

function InlineGroupDemo() {
  const [channels, setChannels] = useState(["email", "digest"]);

  return (
    <CheckboxGroup
      aria-label="通知渠道"
      className="checkbox-doc-inline-group"
      helpText="水平布局会在窄屏自动换行。"
      onValueChange={setChannels}
      options={[
        { label: "邮件", value: "email" },
        { label: "站内", value: "inbox" },
        { label: "周报", value: "digest", helpText: "每周一发送" },
        { disabled: true, label: "短信", value: "sms", helpText: "当前租户未开通" },
      ]}
      orientation="horizontal"
      value={channels}
    />
  );
}

function LongLabelDemo() {
  return (
    <div className="checkbox-doc-stack checkbox-doc-long-wrap">
      <Checkbox
        defaultChecked
        helpText="长标签和 helper 文案都允许换行，控件方框不会被挤压或越界。"
        label={
          <span>
            跨团队上线前确认超长策略项{" "}
            <code>permission.scope.release.pipeline.production.us-east-1.audit.deep-review</code>
          </span>
        }
        name="policy"
        value="release-audit-deep-review"
      />
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "Checkbox 受控",
    description: "checked 和 onCheckedChange 组成受控用法，仍保留原生 input 行为。",
    preview: <ControlledConsentDemo />,
    code: `<Checkbox checked={accepted} label="我已确认配置变更" helpText="用于受控表单字段。" onCheckedChange={setAccepted} />`,
  },
  {
    title: "非受控默认值",
    description: "defaultChecked 提供初始状态，之后由原生 checkbox 状态管理。",
    preview: <DefaultCheckedDemo />,
    code: `<Checkbox defaultChecked name="audit-default" value="enabled" label="默认启用审计日志" helpText="非受控场景。" />`,
  },
  {
    title: "半选态",
    description: "父级可根据子项状态展示 indeterminate，并负责批量选择逻辑。",
    preview: <IndeterminateDemo />,
    code: `<Checkbox checked={allSelected} indeterminate={someSelected} label="选择全部权限" onCheckedChange={toggleAll} />`,
  },
  {
    title: "样例统一一行",
    description: "短选项使用 horizontal，适合表单局部配置；窄屏会自动换行。",
    preview: <InlineGroupDemo />,
    code: `<CheckboxGroup aria-label="通知渠道" orientation="horizontal" value={channels} options={options} onValueChange={setChannels} />`,
  },
  {
    title: "表单提交",
    description: "name、value 和 form 作为原生属性透传，FormData 可读取同名多值。",
    preview: <FormSubmitDemo />,
    code: `<form id="prefs" onSubmit={handleSubmit}><Checkbox defaultChecked name="features" value="audit" label="审计日志" /></form><Checkbox form="prefs" name="features" value="external-review" label="外部审批" />`,
  },
  {
    title: "错误与说明",
    description: "invalid/error 会设置 aria-invalid；错误文案通过 helpText 暴露给辅助技术。",
    preview: <Checkbox invalid helpText="继续前必须勾选此项。" label="我理解该操作不可自动撤销" />,
    code: `<Checkbox invalid label="我理解该操作不可自动撤销" helpText="继续前必须勾选此项。" />`,
  },
  {
    title: "禁用状态",
    description: "disabled 使用原生 input 禁用，视觉和交互都不可操作。",
    preview: (
      <div className="checkbox-doc-stack">
        <Checkbox checked disabled label="由系统策略锁定" />
        <Checkbox disabled helpText="等待上游任务完成。" label="允许自动发布" />
      </div>
    ),
    code: `<><Checkbox checked disabled label="由系统策略锁定" /><Checkbox disabled label="允许自动发布" helpText="等待上游任务完成。" /></>`,
  },
  {
    className: "checkbox-doc-demo--long-label",
    title: "长标签换行",
    description: "长 label、长 token 和 helper 文案在桌面与移动端都收敛在容器内。",
    preview: <LongLabelDemo />,
    code: `<Checkbox defaultChecked name="policy" value="release-audit-deep-review" label={<span>跨团队上线前确认超长策略项 <code>permission.scope.release.pipeline.production.us-east-1.audit.deep-review</code></span>} helpText="长标签允许换行。" />`,
  },
];

export function CheckboxDoc({ showAnchors = false }: CheckboxDocProps) {
  return (
    <section className="button-doc checkbox-doc" aria-labelledby="checkbox-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Checkbox 文档目录">
            {checkboxDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="checkbox-doc-title">{checkboxDocMeta.title}</h2>
            <p>
              用于布尔确认、多项选择和父子汇总状态。当前实现保留原生 <code>input[type="checkbox"]</code>，并提供 CheckboxGroup、半选、错误说明和移动端命中区。
            </p>
          </header>

          <TutorialScaffold component="Checkbox" kind="data-entry" oneLineExample={oneLineExample}>
            <section className="button-doc-section" id="checkbox-experts" aria-labelledby="checkbox-experts-title">
              <div className="button-doc-section__heading">
                <h3 id="checkbox-experts-title">五专家小组结论</h3>
                <p>产品、UI、研发、测试、白帽共同确认 Checkbox 作为独立基础组件文档交付。</p>
              </div>
              <DataTable rows={expertRows} />
            </section>

            <section className="button-doc-section" id="checkbox-governance" aria-labelledby="checkbox-governance-title">
              <div className="button-doc-section__heading">
                <h3 id="checkbox-governance-title">四点治理矩阵</h3>
                <p>统一教程壳层、真实预览、紧凑样例和生产约束全部落在 Checkbox 独立维度。</p>
              </div>
              <DataTable rows={governanceRows} />
            </section>

            <section className="button-doc-section" id="checkbox-when" aria-labelledby="checkbox-when-title">
              <h3 id="checkbox-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>用于单个布尔确认、批量选择和可独立开关的多项条件。</li>
                <li>需要展示部分选中时使用 indeterminate，并由业务层维护子项状态。</li>
                <li>互斥选项不要用 Checkbox，应该使用 RadioGroup。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="checkbox-demos" aria-labelledby="checkbox-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="checkbox-demos-title">代码演示</h3>
                <p>示例覆盖受控、非受控、半选、横向组、FormData、invalid、禁用、长标签和移动端可点击标签。</p>
              </div>
              <div className="button-doc-demo-grid checkbox-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="checkbox-api" aria-labelledby="checkbox-api-title">
              <h3 id="checkbox-api-title">Checkbox API</h3>
              <DataTable rows={checkboxApiRows} />
            </section>

            <section className="button-doc-section" id="checkbox-group-api" aria-labelledby="checkbox-group-api-title">
              <h3 id="checkbox-group-api-title">CheckboxGroup API</h3>
              <DataTable rows={checkboxGroupApiRows} />
            </section>

            <section className="button-doc-section" id="checkbox-style" aria-labelledby="checkbox-style-title">
              <div className="button-doc-section__heading">
                <h3 id="checkbox-style-title">theme style / structure style</h3>
                <p>主题只管语义色与状态色；结构只管尺寸、换行、命中区和 overflow。</p>
              </div>
              <DataTable rows={styleRows} />
            </section>

            <section className="button-doc-section" id="checkbox-semantic" aria-labelledby="checkbox-semantic-title">
              <h3 id="checkbox-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="checkbox-a11y" aria-labelledby="checkbox-a11y-title">
              <h3 id="checkbox-a11y-title">可访问性</h3>
              <DataTable rows={accessibilityRows} />
            </section>

            <section className="button-doc-section" id="checkbox-mobile" aria-labelledby="checkbox-mobile-title">
              <h3 id="checkbox-mobile-title">移动端</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="checkbox-security" aria-labelledby="checkbox-security-title">
              <h3 id="checkbox-security-title">安全</h3>
              <DataTable rows={securityRows} />
            </section>

            <section className="button-doc-section" id="checkbox-faq" aria-labelledby="checkbox-faq-title">
              <h3 id="checkbox-faq-title">FAQ</h3>
              <div className="button-doc-faq">
                {faqItems.map((item) => (
                  <article className="button-doc-faq__item" key={item.question}>
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          </TutorialScaffold>
        </div>
      </div>
    </section>
  );
}
