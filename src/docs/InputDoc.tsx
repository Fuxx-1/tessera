import { useState, type ReactNode } from "react";
import { Input } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

export type InputDocProps = {
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

const noop = () => {};

const xssProbe = `<img src=x onerror=alert("xss")><script>alert("xss")</script>`;
const longPlaceholder = "请输入很长的搜索词、工单编号、客户域名或审计追踪 ID";
const longPrefix = "workspace/releases/production";
const longSuffix = "characters remaining before sync";

export const inputDocMeta = {
  title: "Input 输入框",
  category: "数据录入",
  anchors: [
    { id: "input-when", label: "何时使用" },
    { id: "input-demos", label: "代码演示" },
    { id: "input-api", label: "API" },
    { id: "input-semantic", label: "Semantic DOM" },
    { id: "input-token", label: "Design Token" },
    { id: "input-a11y", label: "Accessibility" },
    { id: "input-unsupported", label: "扩展建议" },
    { id: "input-review", label: "五角色复核" },
    { id: "input-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

function ClearableDemo() {
  const [controlledValue, setControlledValue] = useState("release-candidate");
  const [clearCount, setClearCount] = useState(0);

  return (
    <div className="doc-demo-stack input-doc-demo-line">
      <Input
        allowClear
        clearLabel="清空受控字段"
        data-testid="input-controlled-clearable"
        label="受控字段"
        name="controlledInput"
        onChange={(event) => setControlledValue(event.currentTarget.value)}
        onClear={() => setClearCount((count) => count + 1)}
        prefix="@"
        suffix={`${controlledValue.length} chars`}
        value={controlledValue}
      />
      <Input
        allowClear
        clearLabel="清空非受控字段"
        data-testid="input-uncontrolled-clearable"
        defaultValue="draft-search"
        label="非受控字段"
        name="uncontrolledInput"
        prefix="#"
        suffix="search"
      />
      <output className="input-doc__output" data-testid="input-clear-count">
        清除次数：{clearCount}
      </output>
    </div>
  );
}

function FormDataDemo() {
  return (
    <form className="doc-demo-stack" data-testid="input-formdata-demo">
      <Input defaultValue="Tessera" label="表单字段" name="inputFormDataProject" />
    </form>
  );
}

const demos: Demo[] = [
  {
    title: "基础输入",
    description: "label、placeholder 和 helpText 构成标准单行字段。",
    preview: (
      <div className="doc-demo-stack">
        <Input label="项目名称" name="projectName" placeholder="输入项目名称" helpText="用于列表、详情页和审计记录。" />
      </div>
    ),
    code: `<Input label="项目名称" name="projectName" placeholder="输入项目名称" helpText="用于列表、详情页和审计记录。" />`,
  },
  {
    title: "前后缀与清除",
    description: "prefix、suffix 和 allowClear 保持同一行控制区，受控与非受控输入都可清空。",
    preview: <ClearableDemo />,
    code: `<Input allowClear prefix="@" suffix="chars" value={value} onChange={handleChange} />; <Input allowClear prefix="#" suffix="search" defaultValue="draft-search" />`,
  },
  {
    title: "错误提示",
    description: "errorText 会设置 aria-invalid，并把提示文本关联到输入框。",
    preview: (
      <div className="doc-demo-stack">
        <Input
          invalid
          label="邮箱"
          name="email"
          placeholder="name@example.com"
          value="name@example"
          onChange={noop}
          errorText="请输入完整邮箱地址。"
        />
      </div>
    ),
    code: `<Input label="邮箱" name="email" placeholder="name@example.com" errorText="请输入完整邮箱地址。" />`,
  },
  {
    title: "FormData 提交",
    description: "组件保留真实 input 与 name，业务表单可直接通过 FormData 读取当前值。",
    preview: <FormDataDemo />,
    code: `<form><Input defaultValue="Tessera" label="表单字段" name="inputFormDataProject" /></form>`,
  },
  {
    title: "XSS 文本",
    description: "输入值作为 input.value 渲染，不使用 innerHTML；可疑文本只作为普通字符串出现。",
    preview: (
      <div className="doc-demo-stack">
        <Input
          allowClear
          data-testid="input-xss-probe"
          defaultValue={xssProbe}
          label="安全文本"
          name="xssProbe"
          suffix="plain text"
        />
      </div>
    ),
    code: `<Input defaultValue={'<img src=x onerror=alert("xss")>'} suffix="plain text" />`,
  },
  {
    title: "禁用状态",
    description: "禁用状态沿用原生 disabled，桌面和移动端都保留清晰的不可编辑视觉。",
    preview: (
      <div className="doc-demo-stack">
        <Input disabled label="所有者" name="owner" value="Readonly owner" onChange={noop} />
      </div>
    ),
    code: `<Input disabled label="所有者" name="owner" value="Readonly owner" />`,
  },
  {
    title: "原生输入类型",
    description: "组件继承 input 原生属性，可使用 search、email、password、inputMode 和 autoComplete。",
    preview: (
      <div className="doc-demo-stack">
        <Input
          allowClear
          autoComplete="email"
          inputMode="email"
          label="登录邮箱"
          name="loginEmail"
          placeholder="mail@company.com"
          type="email"
        />
        <Input allowClear label="搜索" name="query" placeholder={longPlaceholder} type="search" />
        <Input
          autoComplete="current-password"
          label="密码"
          name="password"
          placeholder="输入登录密码"
          type="password"
        />
      </div>
    ),
    code: `<Input type="email" inputMode="email" autoComplete="email" label="登录邮箱" />; <Input allowClear type="search" label="搜索" placeholder="按名称筛选" />; <Input type="password" autoComplete="current-password" label="密码" />`,
  },
  {
    title: "长前后缀",
    description: "prefix 与 suffix 很长时会在控制区内省略，input 仍保留可编辑宽度。",
    preview: (
      <div className="doc-demo-stack">
        <Input
          data-testid="input-long-affix"
          defaultValue="release-channel"
          label="命名空间"
          name="longAffix"
          prefix={longPrefix}
          suffix={longSuffix}
        />
      </div>
    ),
    code: `<Input label="命名空间" prefix="workspace/releases/production" suffix="characters remaining before sync" defaultValue="release-channel" />`,
  },
  {
    title: "只读长值",
    description: "readOnly 保留可选中文本和表单语义，但隐藏清除按钮，长值在输入框内自然滚动。",
    preview: (
      <div className="doc-demo-stack">
        <Input
          allowClear
          label="追踪 ID"
          name="traceId"
          readOnly
          value="trace_01JY0KQH5M2W3VTZ9R4N6P7S8A_trace_01JY0KQH5M2W3VTZ9R4N6P7S8A"
          onChange={noop}
        />
      </div>
    ),
    code: `<Input allowClear readOnly label="追踪 ID" value="trace_01JY0KQH5M2W3VTZ9R4N6P7S8A" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "label", value: "ReactNode", description: "字段标签。存在时通过 label/htmlFor 绑定输入框。" },
  { name: "helpText", value: "ReactNode", description: "字段说明。组件会自动生成 id 并写入 aria-describedby。" },
  { name: "errorText", value: "ReactNode", description: "错误提示。存在时会默认输出 aria-invalid=true。" },
  { name: "hint", value: "ReactNode", description: "helpText 的兼容别名。新代码优先使用 helpText。" },
  { name: "error", value: "boolean", description: "开启错误视觉，并默认设置 aria-invalid=true。" },
  { name: "invalid", value: "boolean", description: "error 的语义别名，用于表单校验结果直接映射到 Input。" },
  { name: "prefix", value: "ReactNode", description: "输入框前缀。用于短符号或单位提示，不参与可访问名称。" },
  { name: "suffix", value: "ReactNode", description: "输入框后缀。用于短单位、计数或状态提示，不参与可访问名称。" },
  { name: "allowClear", value: "boolean", description: "有值、非 disabled、非 readOnly 时展示清除按钮。" },
  { name: "clearLabel", value: "string", description: "清除按钮的 aria-label，默认 Clear input。" },
  { name: "onClear", value: "() => void", description: "点击清除后触发；清空行为通过真实 input 事件进入 React onChange。" },
  {
    name: "InputHTMLAttributes",
    value: "InputHTMLAttributes<HTMLInputElement>",
    description: "继承原生 input 属性，例如 type、name、disabled、required、autoComplete、inputMode、aria-label。",
  },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-field.c-input-field", description: "字段容器承载 label、控制区、输入框、清除按钮和说明文本。" },
  { name: "label", value: "label.c-field__label", description: "通过 htmlFor 关联真实 input，点击 label 可聚焦输入框。" },
  { name: "control", value: "span.c-input-field__control", description: "同一行放置 prefix、input、clear button 和 suffix，窄屏保持不溢出。" },
  { name: "input", value: "input.c-input", description: "实际输入控件保留原生键盘、表单、自动填充和 disabled 行为。" },
  { name: "clear", value: "button.c-input-field__clear", description: "清除按钮是 type=button，有独立 aria-label，不提交表单。" },
  { name: "description", value: "span.c-field__hint", description: "帮助或错误文本通过 aria-describedby 与 input 关联。" },
  { name: "invalid", value: "aria-invalid", description: "error 或 errorText 存在时默认输出 aria-invalid=true，也允许调用方显式覆盖。" },
];

const tokenRows: DocRow[] = [
  { name: "theme style", value: "--ct-data-control-bg / --ct-text", description: "输入面、输入文字、placeholder 和前后缀颜色读取语义 token，亮暗色由主题切换。" },
  { name: "theme style", value: "--ct-data-control-border / --ct-focus-ring", description: "边框、hover、focus ring 与错误色都由主题 token 驱动，不在组件内写死浅色。" },
  { name: "theme style", value: "--ct-surface-sunken / --ct-surface-muted", description: "disabled 与 readOnly 使用不同主题面色，保证暗色主题仍能区分状态。" },
  { name: "structure style", value: "height 36px / touch 44px", description: "桌面保持 36px 紧凑密度，430px 及触控环境提升到 44px 命中区。" },
  { name: "structure style", value: "padding 11px / clear 32-40px", description: "输入 padding、清除按钮尺寸和同一行排列属于结构样式，不随主题改变。" },
  { name: "structure style", value: "affix max-width 42% / paired 32%", description: "单侧前后缀最多 42%，两侧同时存在时各收敛到 32%，长内容省略，避免挤压 input 或制造页面 overflow。" },
  { name: "structure style", value: "radius <= 8px", description: "输入框圆角保持工具型克制，不使用营销式大圆角。" },
];

const unsupportedRows: DocRow[] = [
  { name: "prefix / suffix", value: "已支持", description: "当前覆盖短文本、符号、单位和状态后缀；复杂交互元素应拆成组合字段。" },
  { name: "allowClear", value: "已支持", description: "受控和非受控模式均通过原生 input 事件通知清空，并提供 onClear 钩子。" },
  { name: "password", value: "原生支持", description: "通过 type=password、autoComplete 透传密码输入语义；密码显隐由后续组合字段单独承接。" },
  { name: "textarea", value: "独立组件", description: "多行文本使用 Textarea，不由 Input 通过 type 或 variant 切换。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖文本录入、搜索、密码、错误态、禁用和只读语义，不把 Textarea/Form/Select/DatePicker 合并进本页。" },
  { name: "UI 专家", value: "PASS", description: "前后缀、清除按钮、错误和禁用状态保持同一控制区；360/390/430 窄屏控制区不产生页面级 overflow。" },
  { name: "研发专家", value: "PASS", description: "InputProps 继承原生 input 属性，受控与非受控均可清除；组件和类型从 base barrel 独立导出。" },
  { name: "测试专家", value: "PASS", description: "验收覆盖 desktop、mobile 360/390/430、clear/search/password、FormData、长值、长 placeholder、label 和 aria-describedby。" },
  { name: "白帽专家", value: "PASS", description: "用户输入只进入 input.value，不使用 dangerouslySetInnerHTML；不依赖 antd、antd-mobile 或 @ant-design/charts。" },
];

const faqItems = [
  {
    question: "为什么 label 是组件 API，而不是只靠 placeholder？",
    answer: "placeholder 在输入后会消失，也不适合承载字段名称。Input 优先提供稳定 label，让表单扫描和读屏体验都更可靠。",
  },
  {
    question: "移动端需要额外配置吗？",
    answer: "常规文本不需要。邮箱、数字、搜索等场景建议传入 type、inputMode 和 autoComplete，让移动键盘和浏览器能力参与体验。",
  },
  {
    question: "error 会拦截提交吗？",
    answer: "不会。error 只表达当前字段状态和可访问语义，校验、提交拦截和错误生成由业务表单层负责。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      <div className="button-doc-demo__preview">{preview}</div>
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
          {rows.map((row, index) => (
            <tr key={`${row.name}-${row.value}-${index}`}>
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

export function InputDoc({ showAnchors = false }: InputDocProps) {
  return (
    <TutorialScaffold
      component="Input"
      kind="data-entry"
      oneLineExample={`<Input allowClear label="项目名称" name="projectName" placeholder="输入项目名称" helpText="用于审计记录。" />`}
    >
    <section className="button-doc input-doc" aria-labelledby="input-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Input 文档目录">
            {inputDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="input-doc-title">{inputDocMeta.title}</h2>
            <p>
              用于录入单行文本。当前 Input 保留原生 <code>{"<input>"}</code>{" "}
              能力，并把标签、帮助文本、错误状态、前后缀、清除按钮和禁用状态生产化为稳定字段结构。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认移动端输入体验、清除按钮命中区、React 文本转义和原生属性透传。
            </p>
          </header>

          <section className="button-doc-section" id="input-when" aria-labelledby="input-when-title">
            <h3 id="input-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要录入短文本、邮箱、搜索词、密码或其他单行值时使用。</li>
              <li>每个业务字段优先提供 label，并用 helpText 承载说明或校验提示。</li>
              <li>需要短单位、账号符号、计数提示或一键清空时，可使用 prefix、suffix 与 allowClear。</li>
              <li>长文本、多行备注或富文本编辑不要使用 Input，改用 Textarea 或业务编辑器。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="input-demos" aria-labelledby="input-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="input-demos-title">代码演示</h3>
              <p>示例统一一行展示，使用统一教程壳层和真实预览，覆盖 label、helpText、errorText、disabled、readOnly、invalid、prefix/suffix、长 prefix/suffix、allowClear、FormData、受控/非受控、XSS 文本和原生输入类型。</p>
            </div>
            <div className="button-doc-demo-grid input-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="input-api" aria-labelledby="input-api-title">
            <h3 id="input-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="input-semantic" aria-labelledby="input-semantic-title">
            <h3 id="input-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="input-token" aria-labelledby="input-token-title">
            <h3 id="input-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="input-a11y" aria-labelledby="input-a11y-title">
            <h3 id="input-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>没有传入 id 或 name 时，组件会使用 useId 生成稳定 id，避免 label 失效。</li>
              <li>helpText、errorText 和错误提示会写入 aria-describedby，读屏用户能听到字段说明。</li>
              <li>error 或 errorText 会默认输出 aria-invalid=true，但不会替代业务校验逻辑。</li>
              <li>prefix 和 suffix 默认 aria-hidden，避免把装饰性单位重复读成字段名称。</li>
              <li>allowClear 使用真实 button，可键盘聚焦；disabled 和 readOnly 时不会展示。</li>
              <li>移动端建议按业务类型传入 type、inputMode 和 autoComplete，减少输入成本。</li>
              <li>触控设备在 430px 及以下会把控制区提升到 44px，清除按钮随之扩大，适配软键盘场景。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="input-unsupported" aria-labelledby="input-unsupported-title">
            <div className="button-doc-section__heading">
              <h3 id="input-unsupported-title">扩展建议</h3>
              <p>以下列出当前边界：已覆盖能力可直接使用，未覆盖能力后续要作为组合字段单独验收。</p>
            </div>
            <DataTable rows={unsupportedRows} />
          </section>

          <section className="button-doc-section" id="input-review" aria-labelledby="input-review-title">
            <h3 id="input-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="input-faq" aria-labelledby="input-faq-title">
            <h3 id="input-faq-title">FAQ</h3>
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
