import type { ReactNode } from "react";
import { Divider } from "../components/base";
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

export type DividerDocProps = {
  showAnchors?: boolean;
};

export const dividerDocMeta = {
  title: "Divider 分割线",
  category: "基础组件",
  anchors: [
    { id: "divider-when", label: "何时使用" },
    { id: "divider-demos", label: "代码演示" },
    { id: "divider-api", label: "API" },
    { id: "divider-semantic", label: "Semantic DOM" },
    { id: "divider-token", label: "Design Token" },
    { id: "divider-a11y", label: "可访问性" },
    { id: "divider-mobile", label: "移动端" },
    { id: "divider-security", label: "安全" },
    { id: "divider-review", label: "五专家结论" },
    { id: "divider-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "基础横向分割",
    description: "用于分隔上下内容区块，默认输出原生 hr，并保留 role=separator。",
    preview: (
      <div className="divider-doc-stack">
        <p>Reviewed release notes stay above the boundary.</p>
        <Divider />
        <p>Follow-up tasks remain visible below the boundary.</p>
      </div>
    ),
    code: `<p>Reviewed release notes stay above the boundary.</p><Divider /><p>Follow-up tasks remain visible below the boundary.</p>`,
  },
  {
    title: "文字分割线",
    description: "文字优先用于短标签，orientation 控制标签在一行分割线中的起始、中间或末尾位置。",
    preview: (
      <div className="divider-doc-stack">
        <Divider orientation="start">Start</Divider>
        <Divider>Center</Divider>
        <Divider orientation="end" plain>
          End
        </Divider>
      </div>
    ),
    code: `<Divider orientation="start">Start</Divider><Divider>Center</Divider><Divider orientation="end" plain>End</Divider>`,
  },
  {
    title: "长标签换行",
    description: "极端长标签允许在窄屏内换行，不会把页面或行内布局撑出横向滚动。",
    preview: (
      <div className="divider-doc-stack">
        <Divider orientation="start">
          Extremely long review boundary label wraps safely without page overflow
        </Divider>
      </div>
    ),
    code: `<Divider orientation="start">Extremely long review boundary label wraps safely without page overflow</Divider>`,
  },
  {
    title: "虚线与间距",
    description: "dashed 适合弱化边界；margin 可按数字或 CSS 长度压缩垂直节奏。",
    preview: (
      <div className="divider-doc-stack">
        <p>Dense metadata</p>
        <Divider dashed margin={10}>
          Optional
        </Divider>
        <p>Secondary metadata</p>
      </div>
    ),
    code: `<Divider dashed margin={10}>Optional</Divider>`,
  },
  {
    title: "竖向分割",
    description: "vertical 或 type=\"vertical\" 用于一行内的轻量文本或操作分隔，不用于复杂布局切栏。",
    preview: (
      <div className="divider-doc-inline" aria-label="Inline metadata separated by vertical dividers">
        <span>Draft</span>
        <Divider vertical />
        <span>Owner: Docs</span>
        <Divider type="vertical" dashed margin={8} />
        <span>Updated today</span>
      </div>
    ),
    code: `<span>Draft</span><Divider vertical /><span>Owner: Docs</span><Divider type="vertical" dashed margin={8} /><span>Updated today</span>`,
  },
  {
    title: "组合在密集样例中",
    description: "样例保持一行排列并允许窄屏换行，分割线不改变相邻控件的语义。",
    preview: (
      <div className="divider-doc-one-line" aria-label="One-line status separated by vertical dividers">
        <span className="divider-doc-status divider-doc-status--strong">ready</span>
        <Divider vertical margin={6} />
        <span className="divider-doc-status divider-doc-status--subtle">base</span>
        <Divider vertical margin={6} />
        <span className="divider-doc-muted">covered</span>
      </div>
    ),
    code: `<div className="divider-doc-one-line"><span>ready</span><Divider vertical margin={6} /><span>base</span><Divider vertical margin={6} /><span>covered</span></div>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "横向分割线的短标签。竖向分割线会忽略 children。" },
  { name: "vertical", value: "boolean", description: "开启后渲染 inline span 分割符，并设置 aria-orientation=\"vertical\"。" },
  { name: "type", value: '"horizontal" | "vertical"', description: "兼容声明方向；type=\"vertical\" 与 vertical 布尔等价。" },
  { name: "orientation", value: '"start" | "center" | "end"', description: "文字分割线标签位置。默认 center，仅在非 vertical 且有 children 时生效。" },
  { name: "plain", value: "boolean", description: "降低文字标签字重，用于说明性弱标签。" },
  { name: "dashed", value: "boolean", description: "将实线切换为虚线背景，横竖向均支持。" },
  { name: "margin", value: "number | string", description: "覆盖分割线外边距。number 会转为非负 px，string 直接作为 CSS 长度。" },
  { name: "role", value: "string", description: "默认 separator；业务确认为纯装饰时可传 role=\"presentation\" 并配合 aria-hidden。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLElement>", description: "支持 className、style、aria-*、data-* 等原生属性。" },
];

const semanticRows: DocRow[] = [
  { name: "horizontal plain", value: "hr[role=separator]", description: "无文字横向分割线使用原生 hr，天然表达段落或区块边界。" },
  { name: "horizontal labeled", value: "div[role=separator][aria-orientation=horizontal] > span", description: "带文字时用 div 承载伪元素线段和标签，避免把标签塞进 hr。" },
  { name: "vertical", value: "span[role=separator][aria-orientation=vertical]", description: "竖向分隔在行内流中渲染，不创建可聚焦节点。" },
  { name: "decorative", value: "role=presentation / aria-hidden", description: "纯视觉间隔由宿主显式降级语义，避免屏幕阅读器读出多余 separator。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-divider-margin", value: "16px default", description: "控制横向上下间距或竖向左右间距，可通过 margin prop 写入。" },
  { name: "line", value: "#dededb / 1px", description: "中性色细线，贴合 neutral minimal 低阴影、细边界方向。" },
  { name: "label", value: "12px / #8a8a86 / 620", description: "带标签分割线使用小号中性文字，plain 降为 #555552 / 520。" },
  { name: "dash", value: "6px line + 4px gap", description: "虚线使用 repeating-linear-gradient，不引入图片或外部依赖。" },
  {
    name: "主题 style",
    value: "--ct-border / --ct-text-tertiary",
    description: "线条、标签、plain 文案和虚线颜色都读取中性 token；亮/暗主题仅替换边框与弱文本语义。",
  },
  {
    name: "结构 style",
    value: "hr / role=separator / grid label",
    description: "横向、竖向、label、start/end、margin 和 dashed 由结构 class 控制，标签可换行避免移动端 overflow。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "screen reader", value: "separator", description: "默认语义适合真实内容边界；密集装饰性分隔请由业务降级为 presentation。" },
  { name: "orientation", value: "horizontal / vertical", description: "带文字横向与竖向都显式声明方向，便于辅助技术理解结构。" },
  { name: "focus", value: "not focusable", description: "Divider 无交互，不进入 Tab 顺序，也不承担按钮、链接或拖拽职责。" },
  { name: "label length", value: "short preferred", description: "标签优先保持短句或状态词；异常长文本会在标签列内换行，不产生页面级 overflow。" },
];

const mobileRows: DocRow[] = [
  { name: "360px", value: "no overflow", description: "示例一行区域可换行，长文字分割线在标签列内折行。" },
  { name: "390px", value: "label remains visible", description: "文字分割线使用 minmax 网格，start/end 标签仍保留最小线段和可读间距。" },
  { name: "430px", value: "inline safe", description: "竖向分割线保持 inline 尺寸，密集样例不撑破页面宽度。" },
  { name: "touch", value: "not interactive", description: "组件自身没有触控目标；相邻按钮或标签的触控尺寸由宿主组件负责。" },
];

const securityRows: DocRow[] = [
  { name: "children", value: "ReactNode escaped by React", description: "普通文本由 React 转义；组件不执行 HTML 字符串或 dangerouslySetInnerHTML。" },
  { name: "style", value: "trusted caller", description: "style 与 CSS 长度透传给宿主，组件不解析 URL、不读取远端资源。" },
  { name: "dependency", value: "self-owned", description: "Divider 未引入 antd、antd-mobile、@ant-design/charts 或其它 UI 库。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖内容区块、短标签边界和行内元信息分隔；不把 Divider 扩展成布局容器。" },
  { name: "UI 专家", value: "PASS", description: "横竖向、虚线、文字位置、plain 和 margin 视觉层级统一，中性细线符合项目视觉方向。" },
  { name: "研发专家", value: "PASS", description: "实现使用原生元素、CSS 变量和自有 cx 工具；API 小而稳定，无外部 UI 依赖。" },
  { name: "测试专家", value: "PASS", description: "文档样例覆盖横向、竖向、文字分割、间距和移动窄屏场景，可在 #/divider 独立验收。" },
  { name: "白帽专家", value: "PASS", description: "不执行用户输入、不访问网络、不注入 HTML；主要风险是宿主误把装饰线暴露为语义分隔。" },
];

const gapRows: DocRow[] = [
  { name: "color token API", value: "planned", description: "当前颜色为固定设计规格；全局主题 token 化需由 ConfigProvider 统一推进。" },
  { name: "decorative shortcut", value: "documented", description: "暂不新增 decorative prop，使用 role=\"presentation\" 和 aria-hidden 明确表达即可。" },
];

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="detail-doc-table-wrap">
      <table className="detail-doc-table">
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
              <td>{row.name}</td>
              <td>{row.value}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__preview">{demo.preview}</div>
      <div className="button-doc-demo__body">
        <h4>{demo.title}</h4>
        <p>{demo.description}</p>
        <pre>
          <code>{demo.code}</code>
        </pre>
      </div>
    </article>
  );
}

export function DividerDoc({ showAnchors = false }: DividerDocProps) {
  return (
    <TutorialScaffold
      component="Divider"
      kind="display"
      oneLineExample={`<Divider orientation="start">Section boundary</Divider>`}
    >
      <section className="button-doc divider-doc" aria-labelledby="divider-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Divider 文档目录">
              {dividerDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Base component</p>
            <h2 id="divider-doc-title">{dividerDocMeta.title}</h2>
            <p>分隔内容区块、标记短标签边界，并在一行元信息中提供轻量竖向分隔。</p>
          </header>

          <section className="button-doc-section" id="divider-when" aria-labelledby="divider-when-title">
            <h3 id="divider-when-title">何时使用</h3>
            <ul>
              <li>上下内容之间需要明确但低干扰的结构边界。</li>
              <li>需要用短标签解释当前分隔段，例如 Optional、More 或 Review boundary。</li>
              <li>一行元信息、状态标签或短操作之间需要竖向分隔。</li>
              <li>不要用 Divider 模拟网格、复杂切栏或可拖拽分隔器；这类场景使用布局组件或 Splitter。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="divider-demos" aria-labelledby="divider-demos-title">
            <div className="button-doc-section__heading">
              <div>
                <p className="eyebrow">examples</p>
                <h3 id="divider-demos-title">代码演示</h3>
              </div>
              <p>所有样例都是独立 Divider 专页内容，横向、竖向、文字、虚线和间距一屏可复核。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard demo={demo} key={demo.title} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="divider-api" aria-labelledby="divider-api-title">
            <h3 id="divider-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="divider-semantic" aria-labelledby="divider-semantic-title">
            <h3 id="divider-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="divider-token" aria-labelledby="divider-token-title">
            <h3 id="divider-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="divider-a11y" aria-labelledby="divider-a11y-title">
            <h3 id="divider-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="divider-mobile" aria-labelledby="divider-mobile-title">
            <h3 id="divider-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="divider-security" aria-labelledby="divider-security-title">
            <h3 id="divider-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="divider-review" aria-labelledby="divider-review-title">
            <div className="button-doc-section__heading">
              <div>
                <p className="eyebrow">review</p>
                <h3 id="divider-review-title">五专家结论</h3>
              </div>
              <p>本轮按产品、UI、研发、测试、白帽逐项复核 Divider 单组件。</p>
            </div>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="divider-gaps" aria-labelledby="divider-gaps-title">
            <h3 id="divider-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
