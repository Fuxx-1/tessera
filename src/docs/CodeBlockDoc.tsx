import { CodeBlock } from "../components/business/CodeBlock";
import { TutorialScaffold } from "./TutorialScaffold";

type CodeBlockDocProps = {
  showAnchors?: boolean;
};

type CodeBlockDocMeta = {
  title: string;
  category: string;
  anchors: Array<{ id: string; label: string }>;
};

const anchors = [
  { id: "purpose", label: "用途" },
  { id: "examples", label: "示例" },
  { id: "states", label: "状态" },
  { id: "acceptance", label: "验收" },
  { id: "api", label: "API" },
  { id: "semantic", label: "Semantic DOM" },
  { id: "mobile", label: "Mobile" },
  { id: "security", label: "Security" },
  { id: "gaps", label: "缺口" },
] satisfies CodeBlockDocMeta["anchors"];

const apiRows = [
  ["code", "string", "必填。作为纯文本渲染和复制，不会作为 HTML 注入。"],
  ["language", "string", "展示语言标签，并生成安全归一化后的 language-* class，默认 text。"],
  ["title / description", "ReactNode", "标题和辅助描述，用于给代码片段建立上下文。"],
  ["copyLabel / copiedLabel / copyErrorLabel", "string", "复制按钮在 idle、成功和失败时展示的文案。"],
  ["loading / loadingLabel", "boolean / ReactNode", "展示加载态并禁用复制。"],
  ["error", "ReactNode", "展示错误态并禁用复制。"],
  ["empty", "ReactNode", "空代码时的占位内容。"],
  ["showLineNumbers", "boolean", "按纯文本行渲染行号，行号不进入可访问读序。"],
  ["wrap", "boolean", "允许长行换行；默认保留横向滚动，适合代码审查。"],
  ["onCopy / onCopyError", "function", "复制成功或失败后的宿主回调。"],
];

const expertRows = [
  ["产品专家", "PASS", "覆盖文档代码、命令片段、配置片段、复制反馈、空/加载/错误态和独立详情页。"],
  ["UI 专家", "PASS", "中性色、细边框、低阴影；desktop 与 375/390 小屏下标题、语言、按钮和代码区不互相遮挡。"],
  ["研发专家", "PASS", "自有 React/TypeScript 实现，不依赖 antd、antd-mobile、@ant-design/charts；轻量 token 着色有字符和行数上限。"],
  ["测试专家", "PASS", "验收覆盖横滚、wrap、行号、复制、键盘 Tab/Enter、空/加载/错误和超长代码性能降级。"],
  ["白帽专家", "PASS", "code 只作为 React 文本节点渲染，props 排除 dangerouslySetInnerHTML，language 归一化后进入 class。"],
];

const oneLineCommand = "rtk bun run build";
const oneLineExample = `<CodeBlock code="rtk bun run build" language="sh" title="Build command" />`;
const highlightedSnippet = `import { CodeBlock } from "./components/business";

const snippet = "<script>alert('escaped')</script>";
return <CodeBlock code={snippet} language="tsx" showLineNumbers />;`;
const longScrollSnippet = `const token = "not-executed";
const longLine = "this line intentionally stays readable inside the scroll container instead of resizing the page layout and it keeps moving horizontally on desktop and mobile viewports for review workflows";`;
const performanceSnippet = Array.from({ length: 560 }, (_, index) => `line_${index + 1}: value_${index + 1}`).join("\n");

function ApiTable() {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">属性</th>
            <th scope="col">类型</th>
            <th scope="col">说明</th>
          </tr>
        </thead>
        <tbody>
          {apiRows.map(([name, type, description]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{type}</td>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpertTable() {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">角色</th>
            <th scope="col">结论</th>
            <th scope="col">证据</th>
          </tr>
        </thead>
        <tbody>
          {expertRows.map(([role, result, evidence]) => (
            <tr key={role}>
              <td>{role}</td>
              <td>{result}</td>
              <td>{evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toc() {
  return (
    <aside className="button-doc__toc" aria-label="CodeBlock 页面锚点">
      <span>On this page</span>
      <ul>
        {anchors.map((anchor) => (
          <li key={anchor.id}>
            <a href={`#code-block-${anchor.id}`}>{anchor.label}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export const codeBlockDocMeta: CodeBlockDocMeta = {
  title: "CodeBlock 代码块",
  category: "业务组件",
  anchors,
};

const codeBlockDescription = "展示不可执行的代码文本，提供复制、行号、加载、错误、空态和移动端溢出边界。";

export function CodeBlockDoc({ showAnchors = false }: CodeBlockDocProps) {
  return (
    <TutorialScaffold component="CodeBlock" kind="display" oneLineExample={oneLineExample}>
    <section className="component-doc-page button-doc" aria-labelledby="code-block-title">
      <div className="button-doc__layout">
        <main className="button-doc__content">
          <header className="component-doc-page__header">
            <p className="eyebrow">Business / 自有业务组件</p>
            <h1 id="code-block-title">CodeBlock 代码块</h1>
            <p>{codeBlockDescription}</p>
          </header>

          <section className="button-doc-section" id="code-block-purpose" aria-labelledby="code-block-purpose-title">
            <h2 id="code-block-purpose-title">用途</h2>
            <p>
              CodeBlock 面向文档、审查、配置片段和命令片段展示。它只渲染文本，不解析 HTML，不执行脚本；语法着色是受限的轻量
              token 分段，超出预算会自动退回纯文本渲染。
            </p>
          </section>

          <section className="button-doc-section" id="code-block-examples" aria-labelledby="code-block-examples-title">
            <h2 id="code-block-examples-title">示例</h2>
            <div className="button-doc-demo-grid">
              <div className="button-doc-demo">
                <div>
                  <h3>基础复制</h3>
                  <p>Clipboard API 可用时直接写入剪贴板，不可用时使用隐藏 textarea fallback。</p>
                </div>
                <CodeBlock
                  code={highlightedSnippet}
                  language="tsx"
                  showLineNumbers
                  title="Import snippet"
                />
              </div>
              <div className="button-doc-demo">
                <div>
                  <h3>行号和长行</h3>
                  <p>审查场景默认横向滚动；移动端保持容器内滚动，不撑破页面。</p>
                </div>
                <CodeBlock
                  code={longScrollSnippet}
                  language="ts"
                  showLineNumbers
                  title="Review snippet"
                />
              </div>
              <div className="button-doc-demo">
                <div>
                  <h3>一行命令</h3>
                  <p>单行样例用于验证复制内容精确、键盘操作直达按钮。</p>
                </div>
                <CodeBlock code={oneLineCommand} language="sh" title="Build command" />
              </div>
              <div className="button-doc-demo">
                <div>
                  <h3>超长代码性能</h3>
                  <p>超过轻量着色预算时保留滚动和复制，避免为每个 token 生成额外节点。</p>
                </div>
                <CodeBlock code={performanceSnippet} language="yaml" title="Generated fixture" />
              </div>
            </div>
          </section>

          <section className="button-doc-section" id="code-block-states" aria-labelledby="code-block-states-title">
            <h2 id="code-block-states-title">状态</h2>
            <div className="button-doc-demo-grid">
              <CodeBlock code="" empty="No snippet selected" language="text" title="Empty" />
              <CodeBlock code="" language="json" loading title="Loading" />
              <CodeBlock code="throw new Error()" error="Snippet could not be loaded." language="js" title="Error" />
              <CodeBlock code={`<img src=x onerror=alert(1)>\n<script>alert("nope")</script>`} language="html" title="Escaped text" wrap />
            </div>
          </section>

          <section className="button-doc-section" id="code-block-acceptance" aria-labelledby="code-block-acceptance-title">
            <h2 id="code-block-acceptance-title">验收</h2>
            <ExpertTable />
          </section>

          <section className="button-doc-section" id="code-block-api" aria-labelledby="code-block-api-title">
            <h2 id="code-block-api-title">API</h2>
            <ApiTable />
          </section>

          <section className="button-doc-section" id="code-block-semantic" aria-labelledby="code-block-semantic-title">
            <h2 id="code-block-semantic-title">Semantic DOM</h2>
            <ul className="button-doc-list">
              <li>根节点为 section，可透传 aria-label、aria-labelledby、data-* 和其他 HTMLElement 属性。</li>
              <li>代码内容使用 pre/code，保留换行、空格和审查语境。</li>
              <li>复制结果通过 role=status 的屏幕阅读器文本宣布，错误内容使用 role=alert。</li>
              <li>轻量语法着色只增加 span 文本节点，不使用 HTML 字符串注入。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="code-block-mobile" aria-labelledby="code-block-mobile-title">
            <h2 id="code-block-mobile-title">Mobile</h2>
            <ul className="button-doc-list">
              <li>复制按钮在小屏保持 40px 以上触控高度。</li>
              <li>默认长行在 pre 内横向滚动，wrap=true 时按容器换行。</li>
              <li>header 在窄屏切成单列，语言标签和按钮不会覆盖标题。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="code-block-security" aria-labelledby="code-block-security-title">
            <h2 id="code-block-security-title">Security</h2>
            <ul className="button-doc-list">
              <li>code 作为 React 文本节点渲染，不使用 dangerouslySetInnerHTML。</li>
              <li>language 只进入文本展示和归一化 class，不允许构造任意 class 片段。</li>
              <li>复制内容等于传入 code；组件不改写命令、不自动执行、不拼接 shell 前缀。</li>
              <li>复制失败不静默：按钮和 live region 会进入 copyErrorLabel 状态，宿主可用 onCopyError 记录。</li>
              <li>超长代码不做 token 分段，降低由异常大输入导致的渲染节点放大风险。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="code-block-gaps" aria-labelledby="code-block-gaps-title">
            <h2 id="code-block-gaps-title">缺口</h2>
            <p>暂不内置完整语言高亮引擎、diff gutter、虚拟滚动和文件下载。需要这些能力时应在不引入 UI 库的前提下单独评估重量和安全边界。</p>
          </section>
        </main>

        {showAnchors ? <Toc /> : null}
      </div>
    </section>
    </TutorialScaffold>
  );
}
