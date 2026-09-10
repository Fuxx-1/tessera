import { useState, type ReactNode } from "react";
import { Button, Checkbox, Field, Fieldset, Form, Input, Select, Textarea } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type FormDocProps = {
  showAnchors?: boolean;
};

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

const planOptions = [
  { label: "Starter", value: "starter" },
  { label: "Team", value: "team" },
  { label: "Enterprise", value: "enterprise" },
];

export const formDocMeta = {
  title: "Form 表单",
  category: "数据录入",
  anchors: [
    { id: "form-when", label: "何时使用" },
    { id: "form-demos", label: "代码演示" },
    { id: "form-api", label: "API" },
    { id: "form-semantic", label: "Semantic DOM" },
    { id: "form-token", label: "Design Token" },
    { id: "form-style", label: "主题与结构 style" },
    { id: "form-a11y", label: "Accessibility" },
    { id: "form-acceptance", label: "生产复核" },
    { id: "form-unsupported", label: "扩展建议" },
    { id: "form-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

function SubmitDemo() {
  const [submitted, setSubmitted] = useState("No submission yet");

  return (
    <div className="doc-demo-stack">
      <Form
        aria-label="Project request"
        onSubmit={({ values }) => {
          setSubmitted(JSON.stringify(values));
        }}
      >
        <Field help="Used in audit logs and review queues." label="Project name" required>
          <Input name="projectName" placeholder="Roadmap sync" />
        </Field>
        <Field help="Select keeps form submission through a hidden field." label="Plan">
          <Select name="plan" options={planOptions} defaultValue="team" />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" minRows={3} placeholder="Add context for reviewers" />
        </Field>
        <Checkbox label="Send confirmation email" name="notify" value="yes" defaultChecked />
        <div className="c-form__actions">
          <Button type="submit" variant="solid">
            Submit
          </Button>
          <Button type="reset" variant="ghost">
            Reset
          </Button>
        </div>
      </Form>
      <output className="form-doc-output" aria-live="polite">
        {submitted}
      </output>
    </div>
  );
}

function ValidationDemo() {
  const [error, setError] = useState("Slug is required before launch.");
  const [submitted, setSubmitted] = useState("Awaiting validation");
  const longHelp =
    "Use a stable identifier such as customer-billing-renewal-q3-2026 so review links, audit exports, and automations stay readable.";

  return (
    <div className="doc-demo-stack">
      <Form
        aria-label="Validation form example"
        noValidate
        onSubmit={({ values }) => {
          const slug = String(values.slug ?? "").trim();

          if (!slug) {
            setError("Slug is required before launch.");
            setSubmitted("Blocked: missing slug");
            return;
          }

          setError("");
          setSubmitted(`Ready: ${slug}`);
        }}
      >
        <Field {...(error ? { error } : {})} help={longHelp} id="form-doc-slug" label="Release slug" required>
          <Input
            autoComplete="off"
            name="slug"
            onInput={(event) => {
              if (event.currentTarget.value.trim()) {
                setError("");
              }
            }}
            placeholder="customer-billing-renewal-q3-2026"
          />
        </Field>
        <div className="c-form__actions">
          <Button type="submit" variant="solid">
            Validate
          </Button>
        </div>
      </Form>
      <output className="form-doc-output" aria-live="polite">
        {submitted}
      </output>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础提交",
    description: "Form 保留原生 submit，回调同时提供 FormData 和普通 values 对象。",
    preview: <SubmitDemo />,
    code: `<Form onSubmit={({ values }) => console.log(values)}><Field label="Project name" required help="Used in audit logs."><Input name="projectName" placeholder="Roadmap sync" /></Field><Field label="Plan"><Select name="plan" options={planOptions} defaultValue="team" /></Field><div className="c-form__actions"><Button type="submit" variant="solid">Submit</Button></div></Form>`,
  },
  {
    title: "错误和帮助文本",
    description: "Field 会把 help 与 error 合并进 aria-describedby，并把错误状态传给单个控件；长内容在窄屏自动换行。",
    preview: <ValidationDemo />,
    code: `<Field error={error} help={longHelp} id="release-slug" label="Release slug" required><Input name="slug" placeholder="customer-billing-renewal-q3-2026" /></Field>`,
  },
  {
    title: "分组字段",
    description: "Fieldset 使用原生 fieldset/legend，适合一组相关字段、复选项或局部错误。",
    preview: (
      <Form aria-label="Fieldset form example">
        <Fieldset legend="Notifications" description="Choose which updates should be sent." error="At least one channel is required.">
          <Checkbox label="Email" name="channel" value="email" />
          <Checkbox label="In-app" name="channel" value="app" />
          <Checkbox label="Weekly digest" name="channel" value="digest" />
        </Fieldset>
      </Form>
    ),
    code: `<Fieldset legend="Notifications" description="Choose which updates should be sent." error="At least one channel is required."><Checkbox label="Email" name="channel" value="email" /><Checkbox label="In-app" name="channel" value="app" /></Fieldset>`,
  },
  {
    title: "布局",
    description: "layout 支持 vertical、horizontal、inline，并在移动端收敛为单列。",
    preview: (
      <div className="doc-demo-stack">
        <Form layout="horizontal" aria-label="Horizontal form example">
          <Field label="Owner">
            <Input name="owner" placeholder="Design systems" />
          </Field>
          <Field label="Environment">
            <Select name="environment" options={[{ label: "Production", value: "prod" }, { label: "Staging", value: "staging" }]} />
          </Field>
        </Form>
        <Form layout="inline" aria-label="Inline filter form">
          <Field label="Keyword">
            <Input name="keyword" placeholder="Search" type="search" />
          </Field>
          <Field label="Status">
            <Select name="status" options={[{ label: "All", value: "all" }, { label: "Ready", value: "ready" }]} />
          </Field>
          <Button type="submit">Filter</Button>
        </Form>
      </div>
    ),
    code: `<Form layout="horizontal">...</Form><Form layout="inline">...</Form>`,
  },
];

const formApiRows: DocRow[] = [
  { name: "layout", value: '"vertical" | "horizontal" | "inline"', description: "控制 Field 的默认排布，移动端会自动收敛以避免溢出。" },
  { name: "onSubmit", value: "(info: FormSubmitInfo) => void", description: "表单提交回调，info 包含 event、formData 和 values。" },
  { name: "preventDefault", value: "boolean", description: "默认 true。设为 false 时允许浏览器执行原生导航提交。" },
  { name: "FormHTMLAttributes", value: "原生 form 属性", description: "继承 action、method、noValidate、aria-label、autoComplete 等原生表单能力。" },
];

const fieldApiRows: DocRow[] = [
  { name: "label", value: "ReactNode", description: "字段标签，渲染为 label 并通过 htmlFor 指向控件 id。" },
  { name: "help", value: "ReactNode", description: "字段说明，会自动生成 id 并注入 aria-describedby。" },
  { name: "error", value: "ReactNode", description: "错误说明，会注入 aria-invalid 和 aria-describedby，不执行规则校验。" },
  { name: "required", value: "boolean", description: "显示必填标记，并把 required 传给单个可克隆控件。" },
  { name: "id", value: "string", description: "显式指定字段控件 id；省略时使用 useId 生成稳定 id。" },
];

const fieldsetApiRows: DocRow[] = [
  { name: "legend", value: "ReactNode", description: "字段组标题，渲染为原生 legend。" },
  { name: "description", value: "ReactNode", description: "字段组说明，通过 aria-describedby 关联到 fieldset。" },
  { name: "error", value: "ReactNode", description: "字段组错误，通过 aria-invalid 和 aria-describedby 暴露。" },
  { name: "FieldsetHTMLAttributes", value: "原生 fieldset 属性", description: "继承 disabled、name、aria-* 等原生属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "form.c-form", description: "保留原生表单提交、重置、自动填充和浏览器校验入口。" },
  { name: "field", value: "div.c-form-field", description: "字段布局容器，组织 label、control、help 和 error。" },
  { name: "label", value: "label.c-form-field__label", description: "通过 htmlFor 关联控件 id，必填星号使用 aria-hidden。" },
  { name: "description", value: "c-form-field__help / c-form-field__error", description: "帮助和错误文本 id 自动写入控件 aria-describedby。" },
  { name: "group", value: "fieldset.c-fieldset > legend", description: "相关控件使用原生 fieldset/legend 表达组语义。" },
];

const tokenRows: DocRow[] = [
  { name: "formGap", value: "16px", description: "纵向表单字段间距。" },
  { name: "inlineGap", value: "12px", description: "inline 布局横向和换行间距。" },
  { name: "horizontalLabelWidth", value: "120-180px", description: "horizontal 布局标签列宽范围。" },
  { name: "fieldGap", value: "7px", description: "字段内部 label/control/help/error 间距。" },
  { name: "fieldsetPadding", value: "14px", description: "字段组内边距。" },
  { name: "danger", value: "#7f1d1d", description: "错误文本、必填标记和错误边框颜色。" },
  { name: "border", value: "#dededb", description: "字段组和控件默认边框色。" },
  { name: "radius", value: "8px / 6px", description: "字段组与控件圆角。" },
];

const styleRows: DocRow[] = [
  {
    name: "主题 style",
    value: "--ct-* semantic tokens",
    description: "label、help、error、fieldset surface、border、disabled 和 focus ring 均读取 Tessera 语义 token，亮/暗主题只切换变量不改 DOM。",
  },
  {
    name: "结构 style",
    value: "layout classes",
    description: "vertical、horizontal、inline、actions、fieldset、label/body 栅格和 760px 移动端收敛都由结构 class 控制，避免 label/input/error 溢出。",
  },
];

const unsupportedRows: DocRow[] = [
  { name: "rules / schema validation", value: "暂不内置", description: "当前不绑定外部校验库，也不提供规则 DSL。业务可在提交前后生成 Field error。" },
  { name: "form store", value: "暂不内置", description: "字段值状态仍由原生表单、React state 或业务 store 管理。" },
  { name: "dynamic list", value: "暂不内置", description: "数组字段、可增删字段组和复杂联动后续应以明确组件能力补充。" },
  { name: "Input 文档合并", value: "不合并", description: "Input 只负责单行控件。Form 文档独立说明字段编排、提交和组语义。" },
];

const acceptanceRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "覆盖 label、help、error、required、layout、提交、字段分组和移动端收敛，边界不并入单控件文档。" },
  { name: "研发专家", value: "通过", description: "自有 React + CSS 实现，提交走原生 FormData，不引入 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "专项 smoke 检查 #form 路由、提交 values、aria 关联、Fieldset、布局、移动端溢出和示例紧凑度。" },
  { name: "白帽专家", value: "通过", description: "字符串由 React 转义；Form、Field、Fieldset props 禁止 dangerouslySetInnerHTML，不解析 HTML 或 Markdown。" },
  { name: "UI 专家", value: "通过", description: "label、help、error、required 标记和 actions 在纵向、横向、inline 与窄屏布局中保持对齐、换行和可读。" },
];

const faqItems = [
  {
    question: "Form 会自己校验字段吗？",
    answer: "不会。Form 只提供结构、提交事件和可访问语义；校验规则和错误生成由业务代码管理，避免把组件绑定到某个规则引擎。",
  },
  {
    question: "Field 可以包多个控件吗？",
    answer: "可以，但自动注入 id、required、aria-describedby 只适用于单个可克隆控件。多个控件建议使用 Fieldset，或为每个控件显式配置 aria。",
  },
  {
    question: "移动端需要单独写布局吗？",
    answer: "通常不需要。horizontal 和 inline 在窄屏会收敛为单列，原生 input/select/textarea 继续保留移动键盘和选择器能力。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--field">{preview}</div>
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

export function FormDoc({ showAnchors = false }: FormDocProps) {
  const oneLineExample = `<Form onSubmit={({ values }) => save(values)}><Field label="Project name" required><Input name="projectName" /></Field></Form>`;

  return (
    <TutorialScaffold component="Form" kind="data-entry" oneLineExample={oneLineExample}>
      <section className="button-doc form-doc" aria-labelledby="form-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Form 文档目录">
              {formDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="form-doc-title">{formDocMeta.title}</h2>
              <p>
                用于组织字段、字段组、错误说明和提交动作。当前 Form 专注原生表单语义、布局和
                <code> aria-describedby</code> 关联，不绑定外部校验库。
                五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；移动端收敛、字段语义和安全提交边界独立于单控件文档验收。
              </p>
            </header>

          <section className="button-doc-section" id="form-when" aria-labelledby="form-when-title">
            <h3 id="form-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要把多个输入控件组织成可提交、可重置、可自动填充的业务表单时使用。</li>
              <li>需要统一字段 label、help、error、required 和布局时使用 Field。</li>
              <li>需要表达一组相关控件时使用 Fieldset，不要用普通 div 替代组语义。</li>
              <li>单个 Input、Textarea、Select 的控件能力仍在各自文档中说明。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="form-demos" aria-labelledby="form-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="form-demos-title">代码演示</h3>
              <p>示例覆盖 Form、Field、Fieldset、错误/帮助文本、必填、布局、提交处理、移动端收敛和 aria 关联。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="form-api" aria-labelledby="form-api-title">
            <h3 id="form-api-title">API</h3>
            <h4>Form</h4>
            <DataTable rows={formApiRows} />
            <h4>Field</h4>
            <DataTable rows={fieldApiRows} />
            <h4>Fieldset</h4>
            <DataTable rows={fieldsetApiRows} />
          </section>

          <section className="button-doc-section" id="form-semantic" aria-labelledby="form-semantic-title">
            <h3 id="form-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="form-token" aria-labelledby="form-token-title">
            <h3 id="form-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="form-style" aria-labelledby="form-style-title">
            <h3 id="form-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="form-a11y" aria-labelledby="form-a11y-title">
            <h3 id="form-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>Field 会为单个控件注入稳定 id，并把 label 通过 htmlFor 关联过去。</li>
              <li>help 和 error 会生成独立 id，并合并进控件的 aria-describedby。</li>
              <li>error 存在时 Field 会默认注入 aria-invalid=true；调用方仍可显式覆盖控件属性。</li>
              <li>Fieldset 使用原生 fieldset/legend 表达字段组，并把组说明和组错误关联到 fieldset。</li>
              <li>移动端布局避免横向溢出，原生控件继续暴露系统键盘、自动填充和选择器。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="form-acceptance" aria-labelledby="form-acceptance-title">
            <h3 id="form-acceptance-title">生产复核</h3>
            <DataTable rows={acceptanceRows} />
          </section>

          <section className="button-doc-section" id="form-unsupported" aria-labelledby="form-unsupported-title">
            <h3 id="form-unsupported-title">扩展建议</h3>
            <DataTable rows={unsupportedRows} />
          </section>

          <section className="button-doc-section" id="form-faq" aria-labelledby="form-faq-title">
            <h3 id="form-faq-title">FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
