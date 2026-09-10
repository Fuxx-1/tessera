import type { ReactNode } from "react";
import { MermaidSvgViewer } from "../components/business";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

type Demo = {
  code: string;
  description: string;
  preview: ReactNode;
  title: string;
};

export type MermaidSvgViewerDocProps = {
  showAnchors?: boolean;
};

export const mermaidSvgViewerDocMeta = {
  title: "MermaidSvgViewer Mermaid SVG 查看器",
  category: "业务组件",
  anchors: [
    { id: "mermaid-svg-viewer-when", label: "何时使用" },
    { id: "mermaid-svg-viewer-demos", label: "代码演示" },
    { id: "mermaid-svg-viewer-api", label: "API" },
    { id: "mermaid-svg-viewer-semantic", label: "Semantic DOM" },
    { id: "mermaid-svg-viewer-token", label: "Design Token" },
    { id: "mermaid-svg-viewer-matrix", label: "四点矩阵" },
    { id: "mermaid-svg-viewer-a11y", label: "a11y" },
    { id: "mermaid-svg-viewer-mobile", label: "mobile" },
    { id: "mermaid-svg-viewer-performance", label: "性能" },
    { id: "mermaid-svg-viewer-security", label: "security" },
    { id: "mermaid-svg-viewer-review", label: "五角色结论" },
  ],
} satisfies ComponentDocMeta;

const flowchartSource = `flowchart LR
  Input[Mermaid source] --> Render[Strict render]
  Render --> Sanitize[Sanitized SVG]
  Sanitize --> Inspect[Pan / zoom]`;
const compactSource = `flowchart LR; A[Paste Mermaid]-->B[Render SVG]-->C[Fit view]`;
const sequenceSource = `sequenceDiagram
  participant User
  participant Viewer
  User->>Viewer: Load source
  Viewer-->>User: Sanitized SVG
  User->>Viewer: Zoom in
  Viewer-->>User: Updated transform`;
const classSource = `classDiagram
  class MermaidSvgViewer {
    +zoomIn()
    +resetFit()
  }
  class SanitizeSvg
  MermaidSvgViewer --> SanitizeSvg : cleans output`;
const stateSource = `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: source changes
  Loading --> Ready: render ok
  Loading --> Error: invalid
  Ready --> Manual: pan or zoom
  Manual --> Ready: reset`;
const styledFlowSource = `flowchart LR
  A[Neutral node]:::warm -.-> B[Styled node]:::cool
  B --> C[Sanitized marker]
  classDef warm fill:#f8f1ec,stroke:#bd9479,color:#3d3a36
  classDef cool fill:#f6f3f7,stroke:#a99aad,color:#1f1f1d
  linkStyle 0 stroke:#8a2f2a,stroke-width:3px,stroke-dasharray:6 4`;
const themeStyleSource = `flowchart LR
  A[Theme style]:::primary --> B[Token driven SVG]:::accent
  B --> C[Dark and light]
  classDef primary fill:#eef4ff,stroke:#5470c6,color:#182033
  classDef accent fill:#f6f2ff,stroke:#7c5cba,color:#1f1930
  linkStyle 0 stroke:#5470c6,stroke-width:2.5px`;
const structureStyleSource = `flowchart TB
  subgraph Pipeline
    A[Source] --> B{Sanitize}
    B -->|safe| C[Inline SVG]
    B -->|blocked| D[Error state]
  end
  C --> E[Zoom and pan]
  classDef gate fill:#fff8e8,stroke:#a36b00,color:#2f2410
  class B gate`;
const xssSafetySource = `flowchart LR
  A["img src=x onerror=alert(1)"] --> B["javascript alert(1)"]
  B --> C["Rendered as inert SVG text"]`;
const longFlowSource = `flowchart LR; ${Array.from({ length: 30 }, (_, index) => {
  const next = index + 1;
  return `N${index}[${index === 0 ? "Start" : `Step ${index}`}] --> N${next}[${next === 30 ? "Review" : `Step ${next}`}]`;
}).join("; ")}`;
const mindmapSource = `mindmap
  root((Viewer))
    Render
      Flowchart
      Sequence
      Class
      State
    Inspect
      Zoom
      Pan
      Reset`;

const demos: Demo[] = [
  {
    title: "Compact one-line",
    description: "一行 Mermaid 源码样例，验证教程壳层、代码区和真实 SVG 预览都保持紧凑。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--compact" minHeight={220} source={compactSource} title="Compact one-line" />,
    code: `<MermaidSvgViewer source="flowchart LR; A[Paste Mermaid]-->B[Render SVG]-->C[Fit view]" title="Compact one-line" />`,
  },
  {
    title: "Flowchart markers",
    description: "流程图是最小独立使用样例，必须保留 path、marker-end、defs 和节点 class 样式。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--flowchart" source={flowchartSource} title="Flowchart markers" />,
    code: `<MermaidSvgViewer source={flowchartSource} title="Flowchart markers" />`,
  },
  {
    title: "Sequence arrows",
    description: "时序图连接线和消息箭头在 SVG 中保留，虚线返回消息不能丢失 stroke-dasharray。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--sequence" minHeight={300} source={sequenceSource} title="Sequence arrows" />,
    code: `<MermaidSvgViewer source={sequenceSource} title="Sequence arrows" />`,
  },
  {
    title: "Class relations",
    description: "类图关系线、箭头和方法文本要通过 sanitizer，不退化成无连接的文本块。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--class" minHeight={300} source={classSource} title="Class relations" />,
    code: `<MermaidSvgViewer source={classSource} title="Class relations" />`,
  },
  {
    title: "State transitions",
    description: "状态图覆盖 transition path 和 marker，复核重置适配后是否仍完整居中。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--state" minHeight={300} source={stateSource} title="State transitions" />,
    code: `<MermaidSvgViewer source={stateSource} title="State transitions" />`,
  },
  {
    title: "Theme style",
    description: "theme style 关注颜色、文字和连接线 token，清洗后保留安全 fill、stroke 与 marker 引用。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--theme-style" minHeight={280} source={themeStyleSource} title="Theme style" />,
    code: `<MermaidSvgViewer source={themeStyleSource} title="Theme style" />`,
  },
  {
    title: "Structure style",
    description: "structure style 关注 subgraph、条件分支、错误态和长标签结构，不用主题色掩盖结构线。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--structure-style" minHeight={300} source={structureStyleSource} title="Structure style" />,
    code: `<MermaidSvgViewer source={structureStyleSource} title="Structure style" />`,
  },
  {
    title: "Sanitized link style",
    description: "classDef、linkStyle、虚线边和 marker 引用都应在清洗后保留安全的颜色与线型。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--styled" minHeight={280} source={styledFlowSource} title="Sanitized semantic styles" />,
    code: `<MermaidSvgViewer source={styledFlowSource} title="Sanitized semantic styles" />`,
  },
  {
    title: "XSS text safety",
    description: "危险标签和协议只作为 Mermaid 文本渲染，最终 SVG DOM 不得出现 img、script、事件属性或外链协议。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--xss" minHeight={260} source={xssSafetySource} title="XSS text safety" />,
    code: `<MermaidSvgViewer source={xssSafetySource} title="XSS text safety" />`,
  },
  {
    title: "Ultra wide flow",
    description: "长流程图验证初始 fit、平移、缩放和 transform 性能，不把 SVG 转成 canvas 或图片。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--long" minHeight={300} source={longFlowSource} title="Ultra wide flow" />,
    code: `<MermaidSvgViewer source={longFlowSource} minHeight={300} title="Ultra wide flow" />`,
  },
  {
    title: "Mindmap layout",
    description: "mindmap 作为独立 Mermaid 类型复核文本层和分支连接，不与自有 MindMap 图表组件合并。",
    preview: <MermaidSvgViewer className="mermaid-doc-viewer mermaid-doc-viewer--mindmap" minHeight={320} source={mindmapSource} title="Mindmap layout" />,
    code: `<MermaidSvgViewer source={mindmapSource} title="Mindmap layout" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "source", value: "string", description: "必填 Mermaid 文本。空字符串、解析失败、超预算源码都进入错误态。" },
  { name: "title", value: "string", description: "figure caption、viewport aria-label 和状态上下文；默认 Mermaid SVG。" },
  { name: "minHeight", value: "number", description: "控制 viewport 最小高度，实际高度会按 SVG 比例与 680px 上限适配。" },
  { name: "maxSourceLength", value: "number", description: "默认使用 UI_RENDER_BUDGETS.mermaidSourceCharacters，阻断超长源码。" },
  { name: "className", value: "string", description: "挂在 figure 根节点上，用于文档或业务壳样式，不进入 SVG sanitizer。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "figure.b-mermaid-viewer", description: "独立查看器边界，包含标题栏、控制区和 SVG viewport。" },
  { name: "caption", value: "figcaption", description: "展示 title 和当前缩放百分比，避免 SVG 失去上下文。" },
  { name: "viewport", value: "div[role=img]", description: "可聚焦，可用键盘缩放/平移，loading 时同步 aria-busy。" },
  { name: "svg", value: "sanitized inline svg", description: "Mermaid 输出经过白名单清洗后注入，SVG 根设置 aria-hidden，由 viewport 对外命名。" },
  { name: "controls", value: "button", description: "Zoom out、Zoom in、Fit view 使用原生按钮，ready 前禁用。" },
];

const tokenRows: DocRow[] = [
  { name: "theme style", value: "themeVariables + safe classDef", description: "主题变量控制默认节点、文字、边和背景；业务 classDef 只保留安全 SVG/CSS 属性。" },
  { name: "structure style", value: "subgraph / branch / edge", description: "结构样式用于表达层级、分支、状态和连接线，不依赖图片或 canvas。" },
  { name: "surface", value: "#ffffff / #fbfbfa", description: "viewer 使用近白表面和浅灰标题栏，与文档体系一致。" },
  { name: "line", value: "#66715e", description: "默认 Mermaid 连接线色，sanitize 仅在缺失或 none 时补齐。" },
  { name: "border", value: "#dededb / #ececea", description: "外框、标题栏和按钮使用细边界，不依赖蓝色主色。" },
  { name: "focus", value: "#555552", description: "viewport focus-visible 使用中性描边，键盘复核时可见。" },
  { name: "control radius", value: "5px", description: "工具按钮保持紧凑，不做营销式圆角控件。" },
];

const performanceRows: DocRow[] = [
  { name: "source cap", value: "12000 chars", description: "默认单图源码长度预算，业务可通过 maxSourceLength 收紧。" },
  { name: "statement cap", value: "260 statements", description: "按换行和分号估算 Mermaid 语句数量，超限直接错误态。" },
  { name: "svg node cap", value: "1200 nodes", description: "sanitizeSvg 会拒绝异常庞大的 SVG DOM，长流程仍在有限预算内通过 pan/zoom 审阅。" },
  { name: "viewport cap", value: "680px height", description: "长图通过 pan/zoom 审阅，不让页面被单个 SVG 无限撑高。" },
  { name: "render surface", value: "SVG only", description: "连接线、marker、文本和颜色保留在 SVG DOM 中，便于语义复核和高性能 transform。" },
];

const securityRows: DocRow[] = [
  { name: "Mermaid", value: "securityLevel strict", description: "Mermaid 禁止宽松 HTML 注入，flowchart htmlLabels=false。" },
  { name: "SVG tags", value: "allowlist", description: "只保留 svg/g/path/shape/text/tspan/defs/marker/filter/gradient/use 等静态 SVG 标签。" },
  { name: "SVG attrs", value: "allowlist + URL guard", description: "移除事件属性、style、data-*、外链 href、危险协议和非本地 url(...) 引用。" },
  { name: "style preservation", value: "safe CSS inline", description: "安全 CSS 声明会映射为 SVG 属性；marker、stroke、fill、dasharray、font 等保留。" },
  { name: "foreignObject", value: "text fallback", description: "foreignObject 文本岛转成 SVG text，脚本、iframe、template、style 等被剔除。" },
];

const matrixRows: DocRow[] = [
  { name: "真实预览", value: "SVG DOM", description: "所有教程样例渲染 inline SVG，不转 canvas、图片或伪截图，便于 path/marker/text 检查。" },
  { name: "交互", value: "focus / fit / zoom / pan", description: "按钮、键盘、wheel 和 pointer 都作用在同一 transform 层，fit view 可回到初始适配。" },
  { name: "移动端", value: "360 / 390 / 430", description: "标题栏和工具按钮在小屏换行，长图只在 viewer 内平移缩放，不产生页面横向溢出。" },
  { name: "安全", value: "strict + allowlist", description: "Mermaid strict 渲染后再做 SVG 白名单清洗，拒绝事件属性、危险协议和外链 url。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "独立 viewer 覆盖流程图、时序图、类图、状态图、mindmap、长图和错误态，不依赖 MarkdownEditor。" },
  { name: "UI 专家", value: "PASS", description: "桌面和 360/390/430 小屏下标题栏、按钮、viewport、错误态和长图 fit 保持可读且无横向页面溢出。" },
  { name: "研发专家", value: "PASS", description: "渲染保留 SVG path/marker/text，不转 canvas；修复安全 CSS 声明解析和 Mermaid edge 语义归一化。" },
  { name: "测试专家", value: "PASS", description: "文档 fixtures 可被 acceptance 和浏览器脚本直接抽样，覆盖 marker、stroke、dash、viewBox、zoom/pan/reset。" },
  { name: "白帽专家", value: "PASS", description: "Mermaid 输出二次白名单清洗，危险节点和协议剔除，同时安全颜色、线型和 marker 样式保留。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack mermaid-doc-demo">{preview}</div>
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

export function MermaidSvgViewerDoc({ showAnchors = false }: MermaidSvgViewerDocProps) {
  return (
    <TutorialScaffold
      component="MermaidSvgViewer"
      kind="display"
      oneLineExample={`<MermaidSvgViewer source="flowchart LR; A[Paste Mermaid]-->B[Render SVG]-->C[Fit view]" title="Compact one-line" />`}
    >
      <section className="button-doc mermaid-doc" aria-labelledby="mermaid-svg-viewer-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="MermaidSvgViewer 文档目录">
              {mermaidSvgViewerDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">business component</p>
              <h2 id="mermaid-svg-viewer-doc-title">{mermaidSvgViewerDocMeta.title}</h2>
              <p>
                独立 Mermaid SVG 查看器，负责 Mermaid 文本渲染、SVG 安全清洗、连接线与 marker 保真、缩放平移和移动端审阅。
              </p>
            </header>

          <section className="button-doc-section" id="mermaid-svg-viewer-when" aria-labelledby="mermaid-svg-viewer-when-title">
            <h3 id="mermaid-svg-viewer-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要把 Mermaid 源码作为独立组件渲染和审阅，而不是嵌在 MarkdownEditor 里。</li>
              <li>需要保留 SVG 连接线、marker、颜色、虚线和文本语义，供测试或安全扫描定位。</li>
              <li>不用于自有 MindMap 图表组件，不接受任意 SVG 字符串，也不执行 Mermaid 以外的图形语言。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-demos" aria-labelledby="mermaid-svg-viewer-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="mermaid-svg-viewer-demos-title">代码演示</h3>
              <p>每个代码片段保持一行调用；source fixture 作为常量维护，文档页本身独立于 MarkdownEditor。</p>
            </div>
            <div className="button-doc-demo-grid mermaid-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-api" aria-labelledby="mermaid-svg-viewer-api-title">
            <h3 id="mermaid-svg-viewer-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-semantic" aria-labelledby="mermaid-svg-viewer-semantic-title">
            <h3 id="mermaid-svg-viewer-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-token" aria-labelledby="mermaid-svg-viewer-token-title">
            <h3 id="mermaid-svg-viewer-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-matrix" aria-labelledby="mermaid-svg-viewer-matrix-title">
            <h3 id="mermaid-svg-viewer-matrix-title">四点矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-a11y" aria-labelledby="mermaid-svg-viewer-a11y-title">
            <h3 id="mermaid-svg-viewer-a11y-title">a11y</h3>
            <ul className="button-doc-list">
              <li>viewport 是具名 role=img，内部 SVG 对读屏隐藏，避免重复朗读复杂路径和文本。</li>
              <li>ready 后 viewport 可聚焦，+、-、Home/0 和方向键分别支持缩放、重置和平移。</li>
              <li>加载、错误、超预算和解析失败都展示可读消息，不留下空白画布。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-mobile" aria-labelledby="mermaid-svg-viewer-mobile-title">
            <h3 id="mermaid-svg-viewer-mobile-title">mobile</h3>
            <ul className="button-doc-list">
              <li>360px、390px 和 430px 视口下标题栏转为竖向，控制按钮均分整行，不覆盖 viewport。</li>
              <li>SVG 初始 fit 会按容器宽高居中；长图通过拖拽和按钮缩放查看，不造成页面横向滚动。</li>
              <li>viewport 设置 touch-action:none，触摸拖拽优先用于图形平移。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-performance" aria-labelledby="mermaid-svg-viewer-performance-title">
            <h3 id="mermaid-svg-viewer-performance-title">性能</h3>
            <DataTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-security" aria-labelledby="mermaid-svg-viewer-security-title">
            <h3 id="mermaid-svg-viewer-security-title">security</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="mermaid-svg-viewer-review" aria-labelledby="mermaid-svg-viewer-review-title">
            <h3 id="mermaid-svg-viewer-review-title">五角色结论</h3>
            <DataTable rows={reviewRows} />
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
