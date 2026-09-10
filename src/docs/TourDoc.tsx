import { useState, type ReactNode } from "react";
import { Button, Tour } from "../components/base";
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

export type TourDocProps = {
  showAnchors?: boolean;
};

export const tourDocMeta = {
  title: "Tour 漫游式引导",
  category: "数据展示",
  anchors: [
    { id: "tour-when", label: "何时使用" },
    { id: "tour-demos", label: "代码演示" },
    { id: "tour-api", label: "API" },
    { id: "tour-semantic", label: "Semantic DOM" },
    { id: "tour-token", label: "Design Token" },
    { id: "tour-a11y", label: "可访问性" },
    { id: "tour-mobile", label: "移动端" },
    { id: "tour-security", label: "安全" },
    { id: "tour-review", label: "五专家结论" },
    { id: "tour-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const tourSteps = [
  {
    target: "#tour-doc-entry",
    title: "Start from the primary action",
    description: "The panel is positioned near a safe target lookup. Focus moves into the guide when it opens.",
    placement: "bottom" as const,
  },
  {
    target: "#tour-doc-status",
    title: "Explain the status area",
    description: "The mask is visual only and the target remains untouched by the component.",
    placement: "left" as const,
  },
  {
    target: "#tour-doc-offscreen",
    title: "Fallback when target is unavailable",
    description: "When a target is missing or outside the viewport, the step becomes a centered guide.",
    placement: "right" as const,
  },
];

function ControlledTourDemo() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  return (
    <div className="tour-doc-preview">
      <div className="tour-doc-preview__toolbar">
        <Button
          id="tour-doc-entry"
          variant="solid"
          onClick={() => {
            setCurrent(0);
            setOpen(true);
          }}
        >
          Start guide
        </Button>
        <span id="tour-doc-status">3 steps ready</span>
      </div>
      <div className="tour-doc-preview__panel">
        <strong>Release workspace</strong>
        <p>Open the guide to review target lookup, controlled current, keyboard focus, and finish behavior.</p>
      </div>
      <Tour
        current={current}
        onCurrentChange={setCurrent}
        onOpenChange={setOpen}
        open={open}
        steps={tourSteps}
        finishLabel="Done"
      />
    </div>
  );
}

function FallbackTourDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="doc-demo-stack">
      <Button onClick={() => setOpen(true)}>Open fallback step</Button>
      <Tour
        open={open}
        onOpenChange={setOpen}
        onClose={() => setOpen(false)}
        steps={[
          {
            target: "#tour-doc-missing-target",
            title: "Missing target",
            description: "Invalid selectors and missing nodes are ignored safely, then rendered as centered guidance.",
          },
        ]}
      />
    </div>
  );
}

function MasklessTourDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="doc-demo-stack">
      <Button onClick={() => setOpen(true)}>Open maskless guide</Button>
      <Tour
        open={open}
        onOpenChange={setOpen}
        mask={false}
        showProgress={false}
        steps={[
          {
            title: "Centered guide",
            description: "No target is required. This variant works as a lightweight guided dialog.",
            placement: "center",
          },
        ]}
      />
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "受控流程",
    description: "steps/current/open/onCurrentChange/onOpenChange 组合用于产品级新手引导和功能导览。",
    preview: <ControlledTourDemo />,
    code: `const [open, setOpen] = useState(false);
const [current, setCurrent] = useState(0);

<Tour
  open={open}
  current={current}
  onOpenChange={setOpen}
  onCurrentChange={setCurrent}
  steps={[
    { target: "#primary", title: "Primary action", description: "Start here." },
    { target: () => document.querySelector("#status"), title: "Status", placement: "left" },
  ]}
/>`,
  },
  {
    title: "关闭与完成",
    description: "Escape、外部点击、关闭按钮和最后一步完成都会走 onClose/onOpenChange，便于埋点和恢复。",
    preview: <FallbackTourDemo />,
    code: `<Tour
  open={open}
  onOpenChange={setOpen}
  closeOnEscape
  closeOnOutsideClick
  onClose={(reason) => console.log(reason)}
  steps={[{ target: "#missing", title: "Missing target" }]}
/>`,
  },
  {
    title: "无遮罩模式",
    description: "mask=false 适合低干扰说明。弹层仍保持 dialog、focus trap、Escape 与外部点击关闭能力。",
    preview: <MasklessTourDemo />,
    code: `<Tour
  open={open}
  onOpenChange={setOpen}
  mask={false}
  showProgress={false}
  steps={[{ title: "Centered guide", placement: "center" }]}
/>`,
  },
];

const apiRows: DocRow[] = [
  { name: "steps", value: "TourStep[]", description: "引导步骤。每步包含 title、description、target、placement 和按钮文案。" },
  { name: "open / defaultOpen", value: "boolean", description: "受控或非受控打开状态。" },
  { name: "current / defaultCurrent", value: "number", description: "受控或非受控当前步骤，从 0 开始并自动限制在 steps 范围内。" },
  { name: "onCurrentChange", value: "(current) => void", description: "点击上一步/下一步时触发，用于持久化或埋点。" },
  { name: "onOpenChange", value: "(open) => void", description: "打开状态变化回调。" },
  { name: "onClose", value: "(reason) => void", description: "关闭原因：escape、outside、close-button、finish。" },
  { name: "target", value: "string | HTMLElement | () => HTMLElement | null", description: "安全查找目标。非法 selector、空节点和断开节点都会进入 fallback。" },
  { name: "placement", value: '"top" | "bottom" | "left" | "right" | "center"', description: "默认 bottom；target 不可用或不可见时强制 center。" },
  { name: "mask", value: "boolean", description: "是否展示非侵入遮罩和目标高亮。默认 true。" },
  { name: "closeOnEscape", value: "boolean", description: "是否允许 Escape 关闭。默认 true。" },
  { name: "closeOnOutsideClick", value: "boolean", description: "是否允许点击面板外关闭。默认 true。" },
  { name: "container", value: "HTMLElement | null", description: "Portal 容器，默认 document.body。" },
];

const semanticRows: DocRow[] = [
  { name: "portal", value: "div.c-tour", description: "固定定位引导层，挂载到 container 或 body。" },
  { name: "panel", value: "section[role=dialog][aria-modal=true]", description: "面板具备可访问名称和描述关系，并限制键盘焦点。" },
  { name: "mask", value: "aria-hidden", description: "遮罩和 spotlight 都是纯视觉层，不进入读屏顺序。" },
  { name: "controls", value: "button", description: "上一步、下一步、完成和关闭均使用原生 button。" },
  { name: "fallback", value: "role=status", description: "target 不可用时通过状态文本说明已切换到居中引导。" },
];

const tokenRows: DocRow[] = [
  { name: "panelSurface", value: "#ffffff", description: "面板背景。" },
  { name: "maskColor", value: "rgba(17, 17, 16, 0.42)", description: "非侵入遮罩，不修改目标元素样式。" },
  { name: "spotlightBorder", value: "#ffffff", description: "目标高亮边界，配合阴影从遮罩中分离。" },
  { name: "radius", value: "8px", description: "面板和 spotlight 统一紧凑圆角。" },
  { name: "zIndex", value: "70", description: "高于 Tooltip/Popover 和 Modal 基础层，避免被页面内容压住。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Focus", value: "trap + restore", description: "打开后聚焦下一步按钮或 initialFocusRef，关闭后恢复先前焦点。" },
  { name: "Keyboard", value: "Escape / Tab", description: "Escape 可关闭，Tab/Shift+Tab 在面板内循环。" },
  { name: "Target", value: "non-invasive", description: "不为目标节点添加 class、tabindex、aria 或 inline style。" },
  { name: "Progress", value: "text", description: "默认显示步骤进度，并用 aria-label 表达当前序号。" },
];

const mobileRows: DocRow[] = [
  { name: "Offscreen target", value: "center fallback", description: "目标在视口外、缺失或 selector 非法时，面板自动居中显示。" },
  { name: "Panel width", value: "calc(100vw - 32px)", description: "窄屏下稳定收敛，按钮允许换行且不溢出。" },
  { name: "Viewport units", value: "100dvh", description: "移动端限制最大高度，正文可滚动，避开地址栏变化。" },
  { name: "Touch", value: "native button", description: "所有动作保持原生按钮触达和 focus-visible。" },
];

const securityRows: DocRow[] = [
  { name: "HTML", value: "ReactNode only", description: "title/description 由 React 渲染，不解析 HTML 字符串。" },
  { name: "Selector", value: "try/catch", description: "target selector 使用安全查询，非法 selector 不会抛到宿主页面。" },
  { name: "Dependencies", value: "self-owned", description: "无 antd、antd-mobile、@ant-design/charts 或新 UI 依赖。" },
  { name: "Target mutation", value: "none", description: "不写入目标 DOM 属性，不劫持目标事件，不触发滚动副作用。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "steps/current/open 支持可控导览、暂停恢复和完成埋点，适合功能发布和新手任务。" },
  { name: "UI 专家", value: "通过", description: "独立 Tour 视觉，不与 Tooltip/Popover 文档混合；遮罩和 spotlight 保持低侵入。" },
  { name: "研发专家", value: "通过", description: "自有 React 实现，target 安全查找，面板定位和 fallback 独立于 Popover/Tooltip。" },
  { name: "测试专家", value: "通过", description: "覆盖 open/current、next/prev/close、Escape、外部点击、缺失目标和移动兜底。" },
  { name: "白帽专家", value: "通过", description: "无 HTML 注入入口、无外部 UI 包、无动态脚本执行，selector 异常被本地吞掉。" },
];

const faqItems = [
  { question: "Tour 是否会自动滚动到目标？", answer: "不会。本组件本轮保持非侵入，不内置 scrollIntoView；目标不可见时展示移动/离屏 fallback。" },
  { question: "Tour 和 Popover/Tooltip 有什么边界？", answer: "Tour 是多步骤引导 dialog；Popover 是触发点旁的补充内容；Tooltip 只做短文本说明。" },
  { question: "可以没有 target 吗？", answer: "可以。没有 target 的步骤会作为居中引导展示，适合概览或收尾。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
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
              <td><code>{row.name}</code></td>
              <td><code>{row.value}</code></td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TourDoc({ showAnchors = false }: TourDocProps) {
  return (
    <TutorialScaffold component="Tour" kind="display" oneLineExample={`<Tour open steps={steps} onClose={() => setOpen(false)} />`} overlay>
    <section className="button-doc tour-doc" aria-labelledby="tour-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Tour 文档目录">
            {tourDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tour-doc-title">{tourDocMeta.title}</h2>
            <p>用于分步骤解释界面关键区域。当前 Tour 是独立自有组件，覆盖受控流程、焦点管理、关闭行为、安全 target 查找和移动端 fallback。</p>
          </header>

          <section className="button-doc-section" id="tour-when" aria-labelledby="tour-when-title">
            <h3 id="tour-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要串联多个页面区域，引导用户理解一个完整功能流程。</li>
              <li>需要保存步骤进度、记录完成或允许用户中断后恢复。</li>
              <li>不要把 Tour 用作普通 tooltip、popover 或强确认弹窗。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tour-demos" aria-labelledby="tour-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tour-demos-title">代码演示</h3>
              <p>示例覆盖受控步骤、关闭原因、无 target fallback、无遮罩模式和 focus trap。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="tour-api" aria-labelledby="tour-api-title">
            <h3 id="tour-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="tour-semantic" aria-labelledby="tour-semantic-title">
            <h3 id="tour-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="tour-token" aria-labelledby="tour-token-title">
            <h3 id="tour-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="tour-a11y" aria-labelledby="tour-a11y-title">
            <h3 id="tour-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="tour-mobile" aria-labelledby="tour-mobile-title">
            <h3 id="tour-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="tour-security" aria-labelledby="tour-security-title">
            <h3 id="tour-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="tour-review" aria-labelledby="tour-review-title">
            <h3 id="tour-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="tour-faq" aria-labelledby="tour-faq-title">
            <h3 id="tour-faq-title">FAQ</h3>
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
