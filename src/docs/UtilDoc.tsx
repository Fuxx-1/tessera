import type { ReactNode } from "react";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type UtilDocProps = {
  showAnchors?: boolean;
};

type ApiRow = {
  name: string;
  signature: string;
  boundary: string;
  security: string;
};

type Demo = {
  title: string;
  description: string;
  code: string;
};

const anchors = [
  { id: "util-positioning", label: "定位" },
  { id: "util-api", label: "API" },
  { id: "util-boundaries", label: "边界" },
  { id: "util-security", label: "安全" },
  { id: "util-testing", label: "测试" },
  { id: "util-panel", label: "专家结论" },
] satisfies ComponentDocMeta["anchors"];

export const utilDocMeta = {
  title: "Util 工具类",
  category: "基础能力",
  anchors,
} satisfies ComponentDocMeta;

const oneLineExample = `import { getSafeHref } from "./utils"; const href = getSafeHref(candidateHref);`;

const apiRows: ApiRow[] = [
  {
    name: "cx",
    signature: "cx(...values: Array<string | false | null | void | 0 | 0n>): string",
    boundary: "只做 className 拼接，过滤 falsy 值；不做对象语法、数组展开、去重或样式策略判断。",
    security: "不执行输入、不解析 CSS。调用方仍需避免把用户输入直接作为未审计的 class token。",
  },
  {
    name: "normalizeUrlLikeValue",
    signature: "normalizeUrlLikeValue(value: string): string",
    boundary: "trim、lowercase，并移除控制字符和空白，用于协议检测前的归一化。",
    security: "用于识别拆分或混淆的 javascript/data/vbscript 协议，不等于完整 URL parser。",
  },
  {
    name: "isSafeHref",
    signature: "isSafeHref(href: string): boolean",
    boundary: "允许 http、https、mailto、tel、hash、站内绝对路径和相对路径；拒绝空值和危险协议。",
    security: "阻断 javascript、vbscript、data 协议；未知 scheme 默认拒绝，非 scheme 文本按相对链接处理。",
  },
  {
    name: "getSafeHref",
    signature: "getSafeHref(href?: string): string | void",
    boundary: "对可选链接做安全过滤，安全时返回原始 href，不安全或缺失时返回空结果。",
    security: "适合 JSX href 透传前最后一道保护；不会重写为 about:blank，避免制造误导目标。",
  },
  {
    name: "splitMarkdownBlocks",
    signature: "splitMarkdownBlocks(source: string): MarkdownBlock[]",
    boundary: "只识别 fenced mermaid/mmd 块，把 Markdown 与 Mermaid source 分开，不渲染、不清洗。",
    security: "分块结果不能直接注入 DOM；Markdown 和 Mermaid 后续必须分别走对应 sanitizer。",
  },
  {
    name: "renderMarkdownToSafeHtml",
    signature: "renderMarkdownToSafeHtml(source: string): string",
    boundary: "通过 markdown-it 渲染，禁用原始 HTML，再用 DOMPurify 输出可用于预览的安全 HTML。",
    security: "禁止 script/style/iframe/object/embed/form/svg/math、事件属性、style 和 data-*；链接协议再校验。",
  },
  {
    name: "sanitizeSvg",
    signature: "sanitizeSvg(svg: string): SanitizedSvgResult",
    boundary: "解析 SVG 字符串，只保留静态图形标签与显式属性白名单，并补齐尺寸和 viewBox。",
    security: "移除事件属性、data-*、危险协议、外部 url(...) 和不在白名单内的节点；Mermaid foreignObject 文本岛转为 SVG text。",
  },
  {
    name: "getSvgMetrics",
    signature: "getSvgMetrics(svgElement: Element): SvgMetrics",
    boundary: "从 viewBox 或 width/height 推导正数尺寸，缺失时使用 640x360 fallback。",
    security: "只读取属性并做数字归一化；不校验 SVG 内容安全，需与 sanitizeSvg 分工使用。",
  },
];

const expertConclusions = [
  {
    role: "产品",
    conclusion: "Util 不是 UI 组件，登记为 foundation 能力；独立成页能避免和 App、ConfigProvider 的上下文职责混淆。",
  },
  {
    role: "UI",
    conclusion: "页面不展示伪造视觉控件，只用文档表格说明使用面；避免把无 DOM 输出的工具包装成组件 specimen。",
  },
  {
    role: "研发",
    conclusion: "新增 `src/utils/index.ts` 作为稳定导出面，覆盖 cx、URL、SVG、Markdown 四类已有工具，不引入 antd 系依赖。",
  },
  {
    role: "测试",
    conclusion: "验收以 API 边界、危险输入、ready registry、路由可达、build、依赖 scan 和 smoke 路由检查为准。",
  },
  {
    role: "白帽",
    conclusion: "重点风险在 href、Markdown HTML 和 Mermaid SVG；文档必须持续要求协议白名单、DOMPurify 和 SVG 白名单三层复核。",
  },
];

const demos: Demo[] = [
  {
    title: "一行安全导出",
    description: "Util 不渲染 UI；示例只展示稳定 barrel import 和调用边界，避免把纯函数包装成假 specimen。",
    code: `import { cx, getSafeHref, renderMarkdownToSafeHtml, sanitizeSvg } from "./utils"; const result = { className: cx("c-link", isActive && "c-link--active"), href: getSafeHref(candidateHref), html: renderMarkdownToSafeHtml(markdownSource), diagram: sanitizeSvg(mermaidSvg) };`,
  },
];

function DataTable({ rows }: { rows: ApiRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">API</th>
            <th scope="col">签名</th>
            <th scope="col">边界</th>
            <th scope="col">安全注意</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.signature}</td>
              <td>{row.boundary}</td>
              <td>{row.security}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toc() {
  return (
    <aside className="button-doc__toc" aria-label="Util 页面锚点">
      <span>On this page</span>
      <ul>
        {anchors.map((anchor) => (
          <li key={anchor.id}>
            <a href={`#${anchor.id}`}>{anchor.label}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CodeSample({ children, label }: { children: ReactNode; label: string }) {
  return (
    <pre className="button-doc-code" aria-label={label}>
      <code>{children}</code>
    </pre>
  );
}

function DemoCard({ code, description, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">
        <CodeSample label={`${title} 代码`}>{code}</CodeSample>
      </div>
    </article>
  );
}

export function UtilDoc({ showAnchors = false }: UtilDocProps) {
  return (
    <TutorialScaffold component="Util" kind="display" oneLineExample={oneLineExample}>
    <section className="component-doc-page button-doc" aria-labelledby="util-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        <main className="button-doc__content">
          <header className="component-doc-page__header">
            <p className="eyebrow">Base / foundation</p>
            <h1 id="util-title">Util 工具类</h1>
            <p>
              Util 是跨组件复用的基础工具导出面，不是 UI 组件，不提供可交互 DOM、样式 token 或视觉状态。它独立记录 cx、URL、SVG、Markdown
              等安全工具的 API、边界和验收注意事项。
              移动端复核结论：Util 不渲染布局，移动风险来自调用方组件；本页只验证工具输出不会制造页面溢出或不安全链接。
            </p>
          </header>

          <section className="button-doc-section" id="util-positioning" aria-labelledby="util-positioning-title">
            <h2 id="util-positioning-title">定位</h2>
            <ul className="button-doc-list">
              <li>Util 只承载纯函数和安全处理函数；不要把它合并进 App 或 ConfigProvider 文档。</li>
              <li>App 负责应用级上下文和全局反馈承载点；ConfigProvider 负责主题、国际化和运行时配置。</li>
              <li>Util 不感知 React context，不持有全局状态，不渲染 UI，也不声明设计 token；移动端行为由调用它的组件承载。</li>
              <li>当前稳定导出入口为 `src/utils/index.ts`，调用方优先从该 barrel 引入。</li>
            </ul>
            <CodeSample label="Util import 示例">{`import { cx, getSafeHref, renderMarkdownToSafeHtml, sanitizeSvg } from "./utils";`}</CodeSample>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="util-api" aria-labelledby="util-api-title">
            <h2 id="util-api-title">API</h2>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="util-boundaries" aria-labelledby="util-boundaries-title">
            <h2 id="util-boundaries-title">语义边界 / Semantic</h2>
            <ul className="button-doc-list">
              <li>cx 是 className 拼接工具，不替代样式系统、variant resolver 或 CSS module 约束。</li>
              <li>URL 工具只判断 href 是否可透传，不负责请求鉴权、跳转确认、下载策略或 open redirect 业务策略。</li>
              <li>Markdown 工具输出的是已清洗 HTML 字符串，只允许进入受控预览容器；编辑器仍需管理空态、错误态和可访问标签。</li>
              <li>SVG 工具面向 Mermaid 等受控来源输出，不承诺支持任意复杂 SVG 编辑器产物。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="util-security" aria-labelledby="util-security-title">
            <h2 id="util-security-title">安全注意事项</h2>
            <ul className="button-doc-list">
              <li>所有用户输入进入 href 前必须经过 isSafeHref 或 getSafeHref；不要手写协议正则绕过现有工具。</li>
              <li>Markdown preview 必须保持 markdown-it html=false，并继续通过 DOMPurify 禁止危险标签和事件属性。</li>
              <li>Mermaid SVG 渲染后必须再走 sanitizeSvg；不要直接把 Mermaid 输出传入 dangerouslySetInnerHTML。</li>
              <li>sanitizeSvg 的 ok=false 必须进入错误态，不能 fallback 到原始 SVG。</li>
              <li>新增允许标签、属性或协议时，需要同步补充攻击样例和 smoke 验收。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="util-testing" aria-labelledby="util-testing-title">
            <h2 id="util-testing-title">测试与验收</h2>
            <ul className="button-doc-list">
              <li>URL：覆盖空字符串、大小写混淆、控制字符、javascript/data/vbscript、hash、相对路径、http/https/mailto/tel。</li>
              <li>Markdown：覆盖原始 HTML、事件属性、危险链接、普通链接、Mermaid fence 分块和空文档。</li>
              <li>SVG：覆盖 parsererror、script/style、foreignObject 文本转换、事件属性、危险协议、外部 url(...)、缺失 viewBox 和非正尺寸。</li>
              <li>路由：#/util 必须从 registry 导航可达，且 docsStatus 为 ready。</li>
              <li>专项验收执行 `bun run smoke:util`，批量验收继续执行 build、forbidden dependency scan 和 smoke acceptance。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="util-panel" aria-labelledby="util-panel-title">
            <h2 id="util-panel-title">五专家小组结论</h2>
            <div className="button-doc-table-wrap">
              <table className="button-doc-table">
                <thead>
                  <tr>
                    <th scope="col">角色</th>
                    <th scope="col">结论</th>
                  </tr>
                </thead>
                <tbody>
                  {expertConclusions.map((item) => (
                    <tr key={item.role}>
                      <td>{item.role}</td>
                      <td>{item.conclusion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {showAnchors ? <Toc /> : null}
      </div>
    </section>
    </TutorialScaffold>
  );
}
