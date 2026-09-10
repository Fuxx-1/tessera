import type { ReactNode } from "react";
import { Button, Tooltip } from "../components/base";
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

export type TooltipDocProps = {
  showAnchors?: boolean;
};

export const tooltipDocMeta = {
  title: "Tooltip 文字提示",
  category: "基础组件",
  anchors: [
    { id: "tooltip-when", label: "何时使用" },
    { id: "tooltip-demos", label: "代码演示" },
    { id: "tooltip-api", label: "API" },
    { id: "tooltip-semantic", label: "Semantic DOM" },
    { id: "tooltip-token", label: "Design Token" },
    { id: "tooltip-a11y", label: "可访问性" },
    { id: "tooltip-mobile", label: "移动端" },
    { id: "tooltip-security", label: "安全" },
    { id: "tooltip-review", label: "五专家结论" },
    { id: "tooltip-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const longTooltipContent =
  "Long helper copy wraps inside the viewport instead of forcing horizontal scroll or being clipped by the page edge.";

const demos: Demo[] = [
  {
    title: "Hover 与 focus",
    description: "默认 trigger 为 hover + focus；触发器打开时才写入 aria-describedby。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="Last scanned 2 minutes ago" placement="top">
          <Button data-tooltip-case="hover-focus" variant="ghost">
            Hover or focus
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Last scanned 2 minutes ago"><Button>Hover or focus</Button></Tooltip>`,
  },
  {
    title: "四向定位与箭头",
    description: "top、bottom、left、right 使用 fixed 坐标并按视口夹紧，箭头指向触发器中心。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="Top hint" defaultOpen placement="top">
          <Button data-tooltip-case="placement-top" size="sm" variant="ghost">
            Top
          </Button>
        </Tooltip>
        <Tooltip content="Bottom hint" defaultOpen placement="bottom">
          <Button data-tooltip-case="placement-bottom" size="sm" variant="ghost">
            Bottom
          </Button>
        </Tooltip>
        <Tooltip content="Left hint" defaultOpen placement="left">
          <Button data-tooltip-case="placement-left" size="sm" variant="ghost">
            Left
          </Button>
        </Tooltip>
        <Tooltip content="Right hint" defaultOpen placement="right">
          <Button data-tooltip-case="placement-right" size="sm" variant="ghost">
            Right
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Top hint" placement="top"><Button>Top</Button></Tooltip>`,
  },
  {
    title: "触控开关",
    description: "非鼠标 pointerdown 会把默认 hover 型提示转成点按开关，外点或 Escape 关闭。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="Tap once to show; tap outside to close" placement="bottom">
          <Button data-tooltip-case="touch" variant="ghost">
            Touch target
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Tap once to show; tap outside to close"><Button>Touch target</Button></Tooltip>`,
  },
  {
    title: "Click trigger",
    description: "需要显式点按触发时使用 click，但仍只承载非交互短说明。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="Clicked tooltip" placement="right" trigger="click">
          <Button data-tooltip-case="click" variant="ghost">
            Click
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Clicked tooltip" trigger="click"><Button>Click</Button></Tooltip>`,
  },
  {
    title: "暗色提示",
    description: "tone=\"dark\" 用于深色工作区或需要更强浮层对比的短说明，仍保留 role=tooltip 与箭头。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="Dark tooltip remains readable" defaultOpen placement="top" tone="dark">
          <Button data-tooltip-case="dark" variant="ghost">
            Dark tone
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Dark tooltip remains readable" tone="dark"><Button>Dark tone</Button></Tooltip>`,
  },
  {
    title: "长内容不溢出",
    description: "内容最大宽度受视口限制，长英文串和长句都会换行。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content={longTooltipContent} defaultOpen placement="bottom">
          <Button data-tooltip-case="long" variant="ghost">
            Long content
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="Long helper copy wraps inside the viewport"><Button>Long content</Button></Tooltip>`,
  },
  {
    title: "禁用状态",
    description: "disabled 会强制关闭提示并不再触发 onOpenChange(true)。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content="This tooltip is disabled" disabled placement="top">
          <Button data-tooltip-case="disabled" variant="ghost">
            Disabled tooltip
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content="This tooltip is disabled" disabled><Button>Disabled tooltip</Button></Tooltip>`,
  },
  {
    title: "ReactNode 安全渲染",
    description: "content 接收 ReactNode；类似脚本的字符串只会作为文本节点呈现，不解析为 HTML。",
    preview: (
      <div className="tooltip-doc-demo-line">
        <Tooltip content={<span data-tooltip-safe-node>{`Literal <script>alert(1)</script>`}</span>} defaultOpen placement="top">
          <Button data-tooltip-case="safe-react-node" variant="ghost">
            Safe node
          </Button>
        </Tooltip>
      </div>
    ),
    code: `<Tooltip content={<span>{\`Literal <script>alert(1)</script>\`}</span>}><Button>Safe node</Button></Tooltip>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactElement", description: "单个可聚焦触发元素。Tooltip 会 cloneElement 注入事件和 aria-describedby。" },
  { name: "content", value: "ReactNode", description: "提示内容。只用于短文本或非交互说明，不解析 HTML 字符串。" },
  { name: "placement", value: '"top" | "bottom" | "left" | "right"', description: "浮层方向，默认 top；实际坐标会按视口夹紧。" },
  { name: "tone", value: '"light" | "dark"', description: "视觉色调，默认 light；dark 用于深色工作区或需要更高浮层对比的短提示。" },
  { name: "trigger", value: '"hover" | "focus" | "click" | TooltipTrigger[]', description: "默认 hover + focus；触控 pointer 会让 hover 型提示通过点按开关。" },
  { name: "container", value: "HTMLElement | null", description: "可选 portal 容器；默认优先使用 App overlay root，否则挂载到 document.body。" },
  { name: "open / defaultOpen", value: "boolean", description: "受控或非受控打开状态；disabled=true 时会收敛为关闭。" },
  { name: "onOpenChange", value: "(open: boolean) => void", description: "打开、关闭、Escape、外点关闭都会通过该回调通知宿主。" },
  { name: "closeDelay", value: "number", description: "鼠标离开后的关闭延迟，默认 80ms，降低快速划过时的闪烁。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLSpanElement>", description: "根节点继承 className、style、data-*、aria-* 等 span 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "span.c-tooltip", description: "包裹触发元素与固定定位气泡，根节点不承担按钮或链接语义。" },
  { name: "trigger", value: "cloned child", description: "触发器保留自身语义与可访问名称，Tooltip 只补充描述关系。" },
  { name: "bubble", value: "span[role=tooltip]", description: "提示气泡通过 portal 渲染到 overlay/body，只在打开时可见，关闭时 hidden=true。" },
  { name: "relationship", value: "aria-describedby", description: "打开时把触发器连接到 tooltip id，关闭后移除新增描述。" },
  { name: "keyboard", value: "focus opens, blur/Escape closes", description: "键盘用户可通过 Tab 聚焦查看提示，并用 Escape 撤销临时浮层。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "白色气泡与细边框延续 neutral minimal 中性浮层风格。" },
  { name: "dark surface", value: "#1f1f1d / #ffffff", description: "暗色气泡保持白字高对比，箭头继承同一 surface 和 border。" },
  { name: "border", value: "#dededb / 8px", description: "低对比边框和 8px 圆角，避免变成重卡片。" },
  { name: "shadow", value: "0 8px 24px rgba(17,17,16,.12)", description: "轻量层级阴影，仅表达悬浮，不制造强品牌色。" },
  { name: "size", value: "12px / 1.35 / max 280px", description: "小字号短提示；长内容换行并受视口最大宽度约束。" },
  { name: "z-index", value: "60 + portal", description: "气泡自身层级为 60，并通过 App overlay root 或 body portal 避开局部 stacking context。" },
];

const accessibilityRows: DocRow[] = [
  { name: "名称来源", value: "host owned", description: "Tooltip 不是按钮或图标的唯一名称来源，触发器必须自身有可访问名称。" },
  { name: "键盘", value: "Tab / Escape", description: "focus 可打开，blur 和 Escape 可关闭；不要求鼠标悬停。" },
  { name: "非交互内容", value: "pointer-events: none", description: "气泡不接收焦点，也不放按钮、链接、表单；需要交互内容时使用 Popover。" },
  { name: "关系时机", value: "open only", description: "只在气泡可见时添加 aria-describedby，避免隐藏说明被持续朗读。" },
];

const mobileRows: DocRow[] = [
  { name: "触控", value: "pointerType !== mouse", description: "默认 hover 型提示在触屏上通过点按开关，外点和 Escape 可关闭。" },
  { name: "视口", value: "320px+", description: "fixed 坐标按视口 padding 夹紧，375/390 宽度下左右 placement 不应被裁剪。" },
  { name: "长内容", value: "max-width + overflow-wrap", description: "长句和长 token 会换行，不制造横向页面滚动。" },
  { name: "样例", value: "single-line snippets", description: "文档示例保持一行代码，移动端预览允许自然换行以保阅读性。" },
];

const securityRows: DocRow[] = [
  { name: "依赖", value: "self-owned", description: "不使用 antd、antd-mobile、@ant-design/charts，也不复用 Popover 实现。" },
  { name: "渲染", value: "ReactNode", description: "组件不解析 HTML 字符串，不写入 innerHTML，不提供 dangerouslySetInnerHTML 入口。" },
  { name: "挂载", value: "portal", description: "打开或关闭状态的气泡都在 portal 容器内渲染，定位用 fixed 坐标和视口夹紧。" },
  { name: "事件", value: "document listeners", description: "打开时才挂载 Escape 与 pointerdown 监听，关闭后清理，降低泄漏风险。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "定位为短文本提示，不承载结构化信息或操作，和 Popover 明确分工。" },
  { name: "UI 专家", value: "PASS", description: "四向定位、箭头、轻阴影、浅色/暗色可读性完整，长内容在小屏不溢出。" },
  { name: "研发专家", value: "PASS", description: "独立 Tooltip 实现，portal 挂载、受控/非受控、延迟关闭、Escape、外点关闭和视口夹紧都在组件内闭环。" },
  { name: "测试专家", value: "PASS", description: "文档样例覆盖 hover、focus、touch、click、定位、箭头、ARIA、长内容和 disabled 分支。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入入口，无新增外链或脚本依赖；事件监听生命周期可控。" },
];

const gapRows: DocRow[] = [
  { name: "auto placement", value: "not implemented", description: "当前会夹紧视口但不会自动翻转 placement；极端边缘场景可能出现箭头偏移。" },
  { name: "rich content", value: "out of scope", description: "交互内容、标题、焦点管理、表单和链接属于 Popover，不并入 Tooltip。" },
];

function DemoCard({ title, description, preview, code }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview">{preview}</div>
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

export function TooltipDoc({ showAnchors = false }: TooltipDocProps) {
  return (
    <TutorialScaffold component="Tooltip" kind="display" oneLineExample={`<Tooltip content="Copied"><Button>Hover me</Button></Tooltip>`} overlay>
    <section className="button-doc tooltip-doc" aria-labelledby="tooltip-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Tooltip 文档目录">
            {tooltipDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tooltip-doc-title">{tooltipDocMeta.title}</h2>
            <p>
              用于在触发元素旁展示短说明。Tooltip 是独立基础组件，不和 Popover 合并；它只补充描述关系，
              不承载可交互内容，也不替代触发器自身的可访问名称。
            </p>
          </header>

          <section className="button-doc-section" id="tooltip-when" aria-labelledby="tooltip-when-title">
            <h3 id="tooltip-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当按钮、图标、状态或截断文本需要一条短辅助说明时使用。</li>
              <li>触发器必须可以聚焦，且自身已经有明确的可访问名称。</li>
              <li>需要按钮、链接、表单、标题或可停留内容时使用 Popover，不使用 Tooltip。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tooltip-demos" aria-labelledby="tooltip-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tooltip-demos-title">代码演示</h3>
              <p>示例均为真实 Tooltip，代码片段保持单行，覆盖桌面与移动端验收路径。</p>
            </div>
            <div className="button-doc-demo-grid tooltip-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="tooltip-api" aria-labelledby="tooltip-api-title">
            <h3 id="tooltip-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="tooltip-semantic" aria-labelledby="tooltip-semantic-title">
            <h3 id="tooltip-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="tooltip-token" aria-labelledby="tooltip-token-title">
            <h3 id="tooltip-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="tooltip-a11y" aria-labelledby="tooltip-a11y-title">
            <h3 id="tooltip-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="tooltip-mobile" aria-labelledby="tooltip-mobile-title">
            <h3 id="tooltip-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="tooltip-security" aria-labelledby="tooltip-security-title">
            <h3 id="tooltip-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="tooltip-review" aria-labelledby="tooltip-review-title">
            <h3 id="tooltip-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="tooltip-gaps" aria-labelledby="tooltip-gaps-title">
            <h3 id="tooltip-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
