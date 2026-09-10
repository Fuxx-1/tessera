import { useState, type FormEvent, type ReactNode } from "react";
import { Textarea } from "../components/base";
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

export type TextareaDocProps = {
  showAnchors?: boolean;
};

export const textareaDocMeta = {
  title: "Textarea 多行输入",
  category: "基础组件",
  anchors: [
    { id: "textarea-when", label: "何时使用" },
    { id: "textarea-demos", label: "代码演示" },
    { id: "textarea-style", label: "样式分层" },
    { id: "textarea-api", label: "API" },
    { id: "textarea-semantic", label: "Semantic DOM" },
    { id: "textarea-token", label: "Design Token" },
    { id: "textarea-a11y", label: "Accessibility" },
    { id: "textarea-review", label: "五角色复核" },
    { id: "textarea-matrix", label: "治理矩阵" },
    { id: "textarea-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Textarea label="Prompt notes" name="promptNotes" minRows={5} />`;

const xssProbe = `<img src=x onerror=alert(1)> <script>alert("textarea")</script>`;
const longText =
  "tessera_textarea_long_content_acceptance_2026_06_20 ".repeat(14) +
  "\nSecond paragraph keeps wrapping inside the textarea without widening the page.";

const demos: Demo[] = [
  {
    title: "基础长文本",
    description: "教程壳层使用 DemoContainer；预览是真实 textarea，默认 vertical resize。",
    preview: (
      <Textarea
        defaultValue="Describe behavior, edge cases, acceptance notes, rollback plan, and reviewer questions."
        helpText="支持原生 textarea 属性；rows 未传时使用 minRows。"
        label="Prompt notes"
        minRows={5}
        name="promptNotesDoc"
        placeholder="Describe scope, decisions, rollback plan, and unresolved reviewer questions without widening the sidebar."
      />
    ),
    code: `<Textarea label="Prompt notes" name="promptNotes" minRows={5} helpText="支持原生 textarea 属性；rows 未传时使用 minRows。" defaultValue="Describe behavior..." />`,
  },
  {
    title: "自动高度与计数",
    description: "autoSize 随内容增长，maxRows 到顶后保留内部滚动；showCount 会接入描述关系。",
    preview: (
      <Textarea
        autoSize={{ minRows: 2, maxRows: 6 }}
        defaultValue={"First line\nSecond line\nThird line"}
        helpText="继续输入会自动增高，超过 6 行后 textarea 内部滚动。"
        label="Autosize notes"
        maxLength={280}
        name="autosizeCountTextareaDoc"
        placeholder="Add release notes"
        showCount
      />
    ),
    code: `<Textarea label="Autosize notes" name="autosizeCountTextarea" autoSize={{ minRows: 2, maxRows: 6 }} showCount maxLength={280} />`,
  },
  {
    title: "错误提示",
    description: "errorText 会展示错误文案、设置 aria-invalid，并接入 aria-describedby。",
    preview: (
      <Textarea
        defaultValue="Needs concrete acceptance criteria before handoff."
        errorText="请补充验收标准和回滚条件。"
        label="Review blocker"
        maxLength={160}
        minRows={3}
        name="errorTextareaDoc"
        showCount
      />
    ),
    code: `<Textarea label="Review blocker" name="errorTextarea" errorText="请补充验收标准和回滚条件。" showCount maxLength={160} />`,
  },
  {
    title: "Resize 策略",
    description: "生产表单推荐 vertical；密集移动页可关闭 resize，水平拖拽仍受 max-width 约束。",
    preview: (
      <div className="doc-textarea-stack">
        <Textarea label="Vertical" minRows={3} name="resizeVerticalDoc" resize="vertical" />
        <Textarea helpText="移动端保持 100% 宽度。" label="No resize" minRows={3} name="resizeNoneDoc" resize="none" />
        <Textarea helpText="仅用于专项验收：横向 resize 不允许撑出教程容器。" label="Bounded horizontal" minRows={3} name="resizeHorizontalDoc" resize="horizontal" />
      </div>
    ),
    code: `<Textarea label="Bounded horizontal" name="resizeHorizontal" resize="horizontal" helpText="横向 resize 不允许撑出容器。" />`,
  },
  {
    title: "受控与非受控",
    description: "受控 value 由宿主状态管理；非受控 defaultValue 仍可自行输入并更新计数。",
    preview: <TextareaControlledDemo />,
    code: `<Textarea value={value} onChange={(event) => setValue(event.currentTarget.value)} showCount />`,
  },
  {
    title: "禁用与只读状态",
    description: "disabled 不可聚焦或编辑；readOnly 可聚焦、可选择文本，但不允许修改。",
    preview: (
      <div className="doc-textarea-stack">
        <Textarea
          disabled
          defaultValue="Disabled review note remains readable but cannot be edited."
          helpText="disabled 由原生 textarea 承担交互限制。"
          label="Locked comment"
          minRows={3}
          name="disabledTextareaDoc"
          showCount
        />
        <Textarea
          defaultValue="Readonly audit note can be selected and copied while remaining immutable."
          helpText="readOnly 保留焦点、选择和表单值语义。"
          label="Readonly comment"
          minRows={3}
          name="readonlyTextareaDoc"
          readOnly
          showCount
        />
      </div>
    ),
    code: `<Textarea label="Readonly comment" name="readonlyComment" readOnly defaultValue="Readonly audit note" showCount />`,
  },
  {
    title: "超长文本与 XSS 字符串",
    description: "长内容在控件内换行/滚动；HTML-like 文本作为普通字符串渲染，不解析为 DOM。",
    preview: (
      <div className="doc-textarea-stack">
        <Textarea
          autoSize={{ minRows: 3, maxRows: 5 }}
          defaultValue={longText}
          helpText="验收长文本不撑破 360/390/430px 移动宽度。"
          label="Long content"
          name="longTextareaDoc"
          showCount={{ formatter: ({ count }) => `${count} chars` }}
        />
        <Textarea
          defaultValue={xssProbe}
          helpText="XSS 字符串不会被 dangerouslySetInnerHTML 解析。"
          label="XSS text probe"
          minRows={3}
          name="xssTextareaDoc"
          showCount
        />
      </div>
    ),
    code: `<Textarea label="XSS text probe" name="xssTextarea" defaultValue={'<script>alert("textarea")</script>'} showCount />`,
  },
  {
    title: "表单提交",
    description: "name 透传到真实 textarea，FormData 能稳定提交 defaultValue 与编辑后的 value。",
    preview: <TextareaFormSubmitDemo />,
    code: `<form onSubmit={handleSubmit}><Textarea label="Submit notes" name="submitNotes" defaultValue="Ready" /><button type="submit">Capture FormData</button></form>`,
  },
  {
    title: "外部描述合并",
    description: "组件会保留调用方传入的 aria-describedby，再附加内部帮助文案 id。",
    preview: (
      <div className="doc-native-form">
        <p className="c-sr-only" id="textareaExternalDoc">
          External instruction: content is saved as draft.
        </p>
        <Textarea
          aria-describedby="textareaExternalDoc"
          helpText="此字段离开页面前会自动保存。"
          label="Draft details"
          minRows={4}
          name="draftDetailsDoc"
          placeholder="Write the draft details"
        />
      </div>
    ),
    code: `<Textarea aria-describedby="textareaExternal" helpText="此字段离开页面前会自动保存。" label="Draft details" name="draftDetails" />`,
  },
];

const styleRows: DocRow[] = [
  {
    name: "theme style",
    value: "颜色 / surface / border / focus",
    description: "全部来自 --ct-* 主题令牌，亮色、暗色和 ConfigProvider 暗色只切换语义 token，不改变结构。",
  },
  {
    name: "structure style",
    value: "width / rows / resize / footer",
    description: "结构样式负责 100% 宽度、min/max rows、内部滚动、label/control/helper/count 换行和移动端 360/390/430 收敛。",
  },
  {
    name: "tutorial shell",
    value: "DemoContainer",
    description: "所有教程示例统一由 DemoContainer 承载真实预览、源码工具和一行/紧凑 TSX 样例。",
  },
  {
    name: "component boundary",
    value: "独立基础组件",
    description: "Textarea 不并入 Input、Form 或 MarkdownEditor；表单校验、富文本和异步保存由宿主组合。",
  },
];

const apiRows: DocRow[] = [
  { name: "label", value: "ReactNode", description: "显示在 textarea 上方的字段标签；无可见 label 时应传 aria-label 或 aria-labelledby。" },
  { name: "autoSize", value: "boolean | { minRows, maxRows }", description: "按内容自动调整高度；到 maxRows 后内部滚动并关闭手动 resize。" },
  { name: "helpText", value: "ReactNode", description: "普通帮助文案，会连接到 aria-describedby。" },
  { name: "hint", value: "ReactNode", description: "旧别名，保留兼容；新代码优先使用 helpText。" },
  { name: "error", value: "boolean", description: "仅标记错误态，自动设置 aria-invalid。" },
  { name: "errorText", value: "ReactNode", description: "错误文案；存在时优先展示并标记错误态。" },
  { name: "minRows", value: "number = 4", description: "rows 未传入时的默认行数；小于 1 或非法值会归一到可用行数。" },
  { name: "resize", value: "none | both | horizontal | vertical", description: "映射到 CSS resize，默认 vertical；autoSize 开启时固定为 none。" },
  { name: "showCount", value: "boolean | { formatter }", description: "展示字符计数；存在 maxLength 时默认输出 count / maxLength。" },
  { name: "value / defaultValue", value: "string | number | readonly string[]", description: "支持受控与非受控文本值；受控且未传 onChange 时自动进入 readOnly，避免误编辑。" },
  { name: "textarea props", value: "TextareaHTMLAttributes", description: "透传 name、form、placeholder、disabled、required、maxLength、readOnly 等原生属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "label.c-field.c-textarea-field", description: "包裹字段标签、控件和帮助/错误文本；点击标签可聚焦真实控件。" },
  { name: "label", value: "span.c-field__label", description: "可见标签文本；无标签时 aria-label/aria-labelledby 由调用方提供。" },
  { name: "control", value: "textarea.c-textarea", description: "真实原生 textarea，保留键盘、表单提交、选择、复制和移动输入法行为。" },
  { name: "footer", value: "span.c-textarea-field__footer", description: "承载帮助/错误文本与计数器，移动端自动换行。" },
  { name: "description", value: "span.c-field__hint", description: "帮助或错误文本，id 自动接入 aria-describedby。" },
  { name: "count", value: "span.c-textarea-field__count", description: "showCount 的可读计数文本，也会加入 aria-describedby。" },
];

const tokenRows: DocRow[] = [
  { name: "control surface", value: "--ct-surface / --ct-surface-muted", description: "普通、只读和暗色输入面。" },
  { name: "border", value: "--ct-border / --ct-border-heavy / --ct-danger", description: "默认、hover、focus/error 边界。" },
  { name: "radius", value: "--ct-radius-md", description: "与 Input 等字段控件保持一致。" },
  { name: "focus", value: "--ct-focus-ring", description: "键盘焦点在亮色和暗色下都保持可见。" },
  { name: "mobile font", value: "16px below 760px", description: "降低移动浏览器聚焦时自动放大的风险。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "Textarea 独立覆盖多行、长文本、计数、禁用、只读、受控/非受控、表单提交与错误提示场景，不并入 Input、Form 或 MarkdownEditor。" },
  { name: "UI 专家", value: "PASS", description: "统一 DemoContainer 教程壳层，明确 theme style 与 structure style；resize、计数器、帮助文案和长内容在 desktop 与 360/390/430 mobile 保持可读。" },
  { name: "研发专家", value: "PASS", description: "自有 React + CSS 实现，透传原生 textarea 属性，autoSize min/max rows 有边界，无 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "PASS", description: "smoke:textarea 覆盖 value/defaultValue、focus、ARIA、FormData、autoSize、长文档、亮暗色和移动端 overflow。" },
  { name: "白帽专家", value: "PASS", description: "字符串内容由 React 文本/textarea value 渲染，不解析 HTML；外部 ReactNode HTML 仍需宿主净化。" },
];

const matrixRows: DocRow[] = [
  { name: "教程壳层", value: "PASS", description: "全部示例使用 DemoContainer，预览区是真实 Textarea，源码为一行/紧凑可复制样例。" },
  { name: "生产状态", value: "PASS", description: "覆盖 value/defaultValue、disabled、readOnly、invalid、resize、autoSize、showCount、focus、ARIA、name/form submit。" },
  { name: "布局可靠性", value: "PASS", description: "label/control/helper/count 不外溢，长文档内部滚动或换行，页面无横向 overflow，360/390/430 可用。" },
  { name: "安全边界", value: "PASS", description: "XSS 字符串只作为 value 渲染，不创建 DOM；不引入外部 UI 依赖，不扩大到其它组件治理。" },
];

const faqItems = [
  {
    question: "为什么默认只允许 vertical resize？",
    answer: "多行文本最常见的需求是增加高度。水平拖拽容易破坏表单栅格，尤其在移动端和窄侧栏里。",
  },
  {
    question: "error 和 errorText 同时传时如何处理？",
    answer: "errorText 优先显示并自动产生错误态；error 适合外部已经有错误摘要、这里只需要标记字段的场景。",
  },
  {
    question: "需要计数字数吗？",
    answer: "可以传 showCount。存在 maxLength 时默认显示 count / maxLength，也可以用 formatter 输出业务文案。",
  },
];

function TextareaControlledDemo() {
  const [value, setValue] = useState("Controlled draft");

  return (
    <div className="doc-textarea-stack">
      <Textarea
        helpText="受控值由文档 demo 状态驱动。"
        label="Controlled value"
        maxLength={120}
        minRows={3}
        name="controlledTextareaDoc"
        onChange={(event) => setValue(event.currentTarget.value)}
        showCount
        value={value}
      />
      <Textarea
        defaultValue="Uncontrolled draft"
        helpText="非受控值可直接编辑，组件内部同步计数。"
        label="Uncontrolled value"
        minRows={3}
        name="uncontrolledTextareaDoc"
        showCount
      />
    </div>
  );
}

function TextareaFormSubmitDemo() {
  const [submitted, setSubmitted] = useState("not submitted");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitted(String(formData.get("submitNotes") ?? ""));
  }

  return (
    <form className="doc-textarea-form" aria-label="Textarea FormData example" onSubmit={handleSubmit}>
      <Textarea
        defaultValue="Textarea FormData initial value"
        helpText="提交时通过 name=submitNotes 写入 FormData。"
        label="Submit notes"
        minRows={3}
        name="submitNotes"
      />
      <div className="doc-textarea-form__footer">
        <button className="c-button c-button--soft" type="submit">
          Capture FormData
        </button>
        <output aria-live="polite" className="doc-textarea-form__output" data-testid="textarea-form-output">
          {submitted}
        </output>
      </div>
    </form>
  );
}

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      {preview}
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

export function TextareaDoc({ showAnchors = false }: TextareaDocProps) {
  return (
    <TutorialScaffold component="Textarea" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="button-doc textarea-doc" aria-labelledby="textarea-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Textarea 文档目录">
            {textareaDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="textarea-doc-title">{textareaDocMeta.title}</h2>
            <p>
              用于收集多行文本。组件以原生 <code>{"<textarea>"}</code> 为核心，补齐标签、帮助文案、错误态、计数和描述关系，
              同时支持自动高度、受控/非受控文本值、name/form submit 和移动端布局防护。教程统一使用 DemoContainer 壳层，
              真实预览与一行 TSX 样例并排呈现。
            </p>
          </header>

          <section className="button-doc-section" id="textarea-when" aria-labelledby="textarea-when-title">
            <h3 id="textarea-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要输入备注、提示词、评论、长配置或多行说明时使用。</li>
              <li>单行值、短筛选条件或命令输入优先使用 Input。</li>
              <li>移动端和窄容器默认使用 vertical 或 none，避免横向 resize 造成页面溢出。</li>
              <li>需要自动展开的备注、发布说明或提示词草稿可开启 autoSize，并用 maxRows 控制最大高度。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="textarea-demos" aria-labelledby="textarea-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="textarea-demos-title">代码演示</h3>
              <p>示例覆盖多行、autoSize、showCount、resize、禁用、只读、受控/非受控、长文档、XSS 字符串、FormData 和外部 aria 描述合并。</p>
            </div>
            <div className="button-doc-demo-grid textarea-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="textarea-style" aria-labelledby="textarea-style-title">
            <h3 id="textarea-style-title">样式分层</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="textarea-api" aria-labelledby="textarea-api-title">
            <h3 id="textarea-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="textarea-semantic" aria-labelledby="textarea-semantic-title">
            <h3 id="textarea-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="textarea-token" aria-labelledby="textarea-token-title">
            <h3 id="textarea-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="textarea-a11y" aria-labelledby="textarea-a11y-title">
            <h3 id="textarea-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>有 label 时通过原生 label 关联控件，点击标签可聚焦 textarea。</li>
              <li>无可见 label 时，调用方必须通过 aria-label 或 aria-labelledby 提供可访问名称；仅有 name 时组件会用 name 作为兜底 aria-label。</li>
              <li>helpText、hint、errorText 自动生成描述 id，并与外部 aria-describedby 合并去重。</li>
              <li>showCount 计数文本也会加入 aria-describedby，辅助技术可读到当前字符数。</li>
              <li>error 或 errorText 会设置 aria-invalid；错误态应提供 errorText 或外部错误摘要，避免只靠颜色表达。</li>
              <li>移动端字号提升到 16px，并保持 max-width: 100%，降低聚焦放大和横向溢出风险。</li>
              <li>label、helpText、errorText 由 React 渲染；若传入含 dangerouslySetInnerHTML 的节点，不可信 HTML 需要在宿主侧净化。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="textarea-review" aria-labelledby="textarea-review-title">
            <h3 id="textarea-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="textarea-matrix" aria-labelledby="textarea-matrix-title">
            <h3 id="textarea-matrix-title">治理矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>

          <section className="button-doc-section" id="textarea-faq" aria-labelledby="textarea-faq-title">
            <h3 id="textarea-faq-title">FAQ</h3>
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
