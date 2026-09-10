import type { ReactNode } from "react";
import { MarkdownEditor } from "../components/business";
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

export type MarkdownEditorDocProps = {
  showAnchors?: boolean;
};

export const markdownEditorDocMeta = {
  title: "MarkdownEditor Markdown 编辑器",
  category: "业务组件",
  anchors: [
    { id: "markdown-editor-when", label: "何时使用" },
    { id: "markdown-editor-demos", label: "代码演示" },
    { id: "markdown-editor-api", label: "API" },
    { id: "markdown-editor-semantic", label: "Semantic DOM" },
    { id: "markdown-editor-token", label: "Design Token" },
    { id: "markdown-editor-sanitization", label: "净化策略" },
    { id: "markdown-editor-states", label: "状态" },
    { id: "markdown-editor-performance", label: "性能" },
    { id: "markdown-editor-mobile", label: "移动端" },
    { id: "markdown-editor-security", label: "安全验收" },
    { id: "markdown-editor-review", label: "五角色复核" },
  ],
} satisfies ComponentDocMeta;

const oneLineMarkdown = `# One-line smoke | \`inline code\` | [safe link](#markdown-editor-api) | **strong text** | pipe stays text`;
const oneLineExample = `<MarkdownEditor defaultMode="split" defaultValue={markdown} title="Release draft" />`;

const safeMarkdown = `# Release note

Preview renders Markdown with raw HTML disabled.

\`\`\`mermaid
flowchart LR
  Edit[Edit source] --> Split[Split blocks]
  Split --> Html[Safe HTML preview]
  Split --> Mermaid[Sanitized SVG]
  Mermaid --> Inspect[Pan and zoom]
\`\`\`

- Links allow http, https, mailto, tel, relative paths, and anchors.
- Mermaid fences are rendered through the editor preview as sanitized SVG.

| Item | Status |
| --- | --- |
| Code block | \`ready\` |
| Table | responsive |

\`\`\`ts
const preview = "safe markdown";
\`\`\``;

const unsafeMarkdown = `[blocked](javascript:alert(1))

<img src=x onerror=alert(1)>

\`\`\`mermaid
flowchart TD
  A[Mermaid source] --> B[Strict render]
\`\`\``;

const demos: Demo[] = [
  {
    title: "一行样例",
    description: "短 Markdown 内容保持单行源码输入，预览仍覆盖 inline code、链接和强调文本。",
    preview: <MarkdownEditor defaultMode="split" defaultValue={oneLineMarkdown} minHeight={300} title="One-line smoke" />,
    code: `<MarkdownEditor defaultMode="split" defaultValue={oneLineMarkdown} minHeight={300} title="One-line smoke" />`,
  },
  {
    title: "Split 编辑预览",
    description: "默认 split 模式同时展示源码和预览，Mermaid fence 会在编辑器预览区转换为 SVG。",
    preview: <MarkdownEditor defaultValue={safeMarkdown} minHeight={460} title="Release draft" />,
    code: `<MarkdownEditor defaultValue={markdown} minHeight={460} title="Release draft" />`,
  },
  {
    title: "只读预览",
    description: "传入 value 且不传 onChange 时 textarea 进入 readOnly，适合审阅态或日志快照。",
    preview: <MarkdownEditor mode="preview" value={safeMarkdown} title="Read-only preview" />,
    code: `<MarkdownEditor mode="preview" value={markdown} title="Read-only preview" />`,
  },
  {
    title: "危险输入 smoke",
    description: "示例保留在文档中作为人工复核入口：脚本 URL 和 HTML 事件属性不应出现在预览 DOM。",
    preview: <MarkdownEditor defaultMode="preview" defaultValue={unsafeMarkdown} title="Sanitization smoke" />,
    code: `<MarkdownEditor defaultMode="preview" defaultValue={unsafeMarkdown} title="Sanitization smoke" />`,
  },
];

const editorApiRows: DocRow[] = [
  {
    name: "value / defaultValue / onChange",
    value: "string / string / (value) => void",
    description: "支持受控和非受控编辑。value 存在但没有 onChange 时自动只读。",
  },
  {
    name: "mode / defaultMode / onModeChange",
    value: "edit | preview | split",
    description: "控制编辑、预览或双栏模式；默认 defaultMode 为 split。",
  },
  {
    name: "title / editorLabel / previewLabel",
    value: "string",
    description: "用于组件可访问名称、工具栏标题和分栏标签。",
  },
  {
    name: "minHeight / className",
    value: "number | string / string",
    description: "用于稳定编辑区高度和外层样式扩展。",
  },
  {
    name: "mermaidTitle / maxMermaidSourceLength",
    value: "string / number",
    description: "传递给每个 MermaidSvgViewer，限制单个图源码长度。",
  },
];

const sanitizationRows: DocRow[] = [
  {
    name: "Markdown HTML",
    value: "markdown-it html:false + DOMPurify",
    description: "原始 HTML 不解析，script/style/iframe/object/embed/form/svg/math 被禁止，data-* 和事件属性禁用。",
  },
  {
    name: "URL 协议",
    value: "http/https/mailto/tel/relative/hash",
    description: "javascript、vbscript、data 等协议在 markdown-it validateLink 和 DOMPurify 两层拦截。",
  },
  {
    name: "Mermaid 渲染",
    value: "securityLevel strict + htmlLabels:false",
    description: "先让 Mermaid 在严格模式下渲染，再对输出 SVG 二次白名单清洗。",
  },
  {
    name: "SVG 标签",
    value: "svg/g/path/rect/text/tspan/defs/marker/gradient 等",
    description: "只允许 Mermaid 常用静态图形标签；foreignObject 文本岛会转成 SVG text，script、iframe、audio、video、canvas 不在白名单。",
  },
  {
    name: "SVG 属性",
    value: "显式属性白名单",
    description: "移除事件属性、data-*、外链 href、危险协议和非本地 fragment 的 url(...) 引用。",
  },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "MarkdownEditor 以业务区块承载 toolbar、editor pane 和 preview pane。" },
  { name: "editor", value: "textarea", description: "源码编辑区保留原生 textarea 语义，受控只读时设置 readOnly。" },
  { name: "preview", value: "article", description: "预览区承载净化后的 Markdown HTML 和 Mermaid fence 渲染结果。" },
  { name: "mode switch", value: "tablist / tab", description: "edit、split、preview 作为模式切换入口，aria-selected 表达当前模式。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #fbfbfa", description: "编辑器、预览和工具栏使用近白表面区分层级。" },
  { name: "border", value: "#dededb / #ececea", description: "分栏、状态层和 viewer 控制区使用细边框，不依赖高饱和主题色。" },
  { name: "focus", value: "#555552", description: "textarea、模式切换和 viewer viewport 使用中性色 focus-visible。" },
  { name: "mono", value: "system monospace", description: "源码区、错误消息和代码块沿用系统等宽字体。" },
];

const performanceRows: DocRow[] = [
  { name: "Preview defer", value: "48ms / 180ms", description: "普通输入短延迟刷新，超 10000 字长文档延迟刷新以降低主线程抖动。" },
  { name: "Markdown cap", value: "80000 chars / 80 blocks", description: "预览源码与分块数量有上限，超限后展示截断提示，不阻断继续编辑。" },
  { name: "HTML block cap", value: "24000 chars", description: "单个 Markdown HTML 块二次限长，避免单块超长代码或表格拖慢预览。" },
  { name: "Mermaid cap", value: "8 blocks", description: "单篇文档最多渲染 8 个 Mermaid fence，其余内容留在 Markdown 流里。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "模式切换、只读预览、单行样例、代码/表格/Mermaid 嵌入覆盖编辑器核心使用场景。" },
  { name: "UI 专家", value: "PASS", description: "近白表面、细边框、中性色 focus；移动端 split 堆叠，代码和表格横向滚动不顶出页面。" },
  { name: "研发专家", value: "PASS", description: "自有 React/TypeScript 实现，依赖边界不引入 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "测试专家", value: "PASS", description: "构建、依赖扫描、MarkdownEditor 专项 acceptance 与 desktop/mobile 浏览器 smoke 覆盖主要路径。" },
  { name: "白帽专家", value: "PASS", description: "Markdown 原始 HTML 禁用并经 DOMPurify；Mermaid SVG 严格渲染后二次白名单清洗。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
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

export function MarkdownEditorDoc({ showAnchors = false }: MarkdownEditorDocProps) {
  return (
    <TutorialScaffold component="MarkdownEditor" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="markdown-doc" aria-labelledby="markdown-editor-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="MarkdownEditor 文档目录">
            {markdownEditorDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="markdown-editor-doc-title">{markdownEditorDocMeta.title}</h2>
            <p>
              生产化 Markdown 编辑器，覆盖 Markdown 安全预览、编辑/预览模式、Mermaid fence 嵌入、长文档预算和移动端布局。
            </p>
          </header>

          <section className="button-doc-section" id="markdown-editor-when" aria-labelledby="markdown-editor-when-title">
            <h3 id="markdown-editor-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在产品内编辑 Markdown，并同步查看安全预览。</li>
              <li>内容包含 Mermaid 流程图、时序图或状态图，且需要以 SVG 可视化审阅。</li>
              <li>不用于富文本所见即所得编辑器，不承诺执行用户输入中的任意 HTML，也不替代独立 MermaidSvgViewer 文档。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="markdown-editor-demos" aria-labelledby="markdown-editor-demos-title">
            <h3 id="markdown-editor-demos-title">代码演示</h3>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="markdown-editor-api" aria-labelledby="markdown-editor-api-title">
            <h3 id="markdown-editor-api-title">API</h3>
            <h4>MarkdownEditor</h4>
            <DataTable rows={editorApiRows} />
          </section>

          <section className="button-doc-section" id="markdown-editor-semantic" aria-labelledby="markdown-editor-semantic-title">
            <h3 id="markdown-editor-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="markdown-editor-token" aria-labelledby="markdown-editor-token-title">
            <h3 id="markdown-editor-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section
            className="button-doc-section"
            id="markdown-editor-sanitization"
            aria-labelledby="markdown-editor-sanitization-title"
          >
            <h3 id="markdown-editor-sanitization-title">净化策略</h3>
            <DataTable rows={sanitizationRows} />
          </section>

          <section className="button-doc-section" id="markdown-editor-states" aria-labelledby="markdown-editor-states-title">
            <h3 id="markdown-editor-states-title">状态</h3>
            <ul className="button-doc-list">
              <li>MarkdownEditor 支持 edit、preview、split 三种模式，空预览展示稳定占位。</li>
              <li>value 存在但 onChange 缺失时自动只读，避免受控编辑器产生不可提交的假编辑态。</li>
              <li>预览使用延迟刷新与分块预算，长文档编辑不会立即触发全量同步渲染。</li>
            </ul>
          </section>

          <section
            className="button-doc-section"
            id="markdown-editor-performance"
            aria-labelledby="markdown-editor-performance-title"
          >
            <h3 id="markdown-editor-performance-title">性能</h3>
            <DataTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="markdown-editor-mobile" aria-labelledby="markdown-editor-mobile-title">
            <h3 id="markdown-editor-mobile-title">移动端</h3>
            <ul className="button-doc-list">
              <li>780px 以下 split 自动堆叠，编辑区和预览区保持可读最小高度。</li>
              <li>模式按钮和 viewer 控制按钮拉伸到整行，触控目标不低于 28px。</li>
              <li>SVG viewport 使用 touch-action:none，触控拖拽不会被页面滚动抢占。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="markdown-editor-security" aria-labelledby="markdown-editor-security-title">
            <h3 id="markdown-editor-security-title">安全验收</h3>
            <ul className="button-doc-list">
              <li>源码扫描不得出现 antd、antd-mobile、@ant-design/charts 依赖或导入。</li>
              <li>注入 smoke 覆盖 javascript: 链接、HTML 事件属性、SVG script、foreignObject 文本岛转换和 data URL。</li>
              <li>dangerouslySetInnerHTML 只允许接收 renderMarkdownToSafeHtml 和 sanitizeSvg 的输出。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="markdown-editor-review" aria-labelledby="markdown-editor-review-title">
            <h3 id="markdown-editor-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
