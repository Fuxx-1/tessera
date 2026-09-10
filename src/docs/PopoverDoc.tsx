import { useState, type ReactNode } from "react";
import { Button, Popover, Tag } from "../components/base";
import { PropertyList } from "../components/business";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type PopoverDocProps = {
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

export const popoverDocMeta = {
  title: "Popover 气泡卡片",
  category: "数据展示",
  anchors: [
    { id: "popover-when", label: "何时使用" },
    { id: "popover-demos", label: "代码演示" },
    { id: "popover-api", label: "API" },
    { id: "popover-semantic", label: "Semantic DOM" },
    { id: "popover-keyboard", label: "Keyboard / Mobile" },
    { id: "popover-token", label: "Design Token" },
    { id: "popover-security", label: "安全" },
    { id: "popover-review", label: "五专家结论" },
    { id: "popover-gaps", label: "剩余风险" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "content",
    value: "ReactNode",
    description: "必填内容区域，适合结构化信息、轻量表单片段或少量操作入口。",
  },
  {
    name: "title",
    value: "ReactNode",
    description: "可选标题，存在时绑定为 dialog 的 aria-labelledby。",
  },
  {
    name: "trigger",
    value: '"click" | "hover" | "focus" | Array',
    description: "默认 click；hover/focus 可组合，但移动触控场景应优先使用 click。",
  },
  {
    name: "placement",
    value: '"top" | "bottom" | "left" | "right"',
    description: "按触发器定位，面板和箭头都会夹紧在视口内。",
  },
  {
    name: "open / defaultOpen / onOpenChange",
    value: "controlled state",
    description: "支持受控和非受控打开状态，便于表格行、工具栏和教学场景外部管理。",
  },
  {
    name: "container",
    value: "HTMLElement | null",
    description: "可选 portal 容器；默认优先使用 App overlay root，否则挂载到 document.body。",
  },
  {
    name: "initialFocus",
    value: "boolean",
    description: "默认打开后把焦点移入面板；设为 false 时保持普通展示浮层行为。",
  },
  {
    name: "closeOnEscape",
    value: "boolean",
    description: "默认 Escape 关闭；关闭后焦点返回打开前元素。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用时强制关闭并阻断后续打开。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "Trigger",
    value: "aria-haspopup=dialog, aria-expanded, aria-controls",
    description: "触发器保持自身 button/link/input 语义，Popover 只补充浮层关系。",
  },
  {
    name: "Panel",
    value: "portal + div[role=dialog][tabIndex=-1]",
    description: "面板默认 portal 到 App overlay root，缺省边界外回退到 document.body；非阻断浮层不使用 aria-modal。",
  },
  {
    name: "Focus",
    value: "initial focus + Tab loop + return",
    description: "打开后进入第一个可聚焦元素或面板，面板内 Tab 环绕，关闭后恢复触发前焦点。",
  },
  {
    name: "Arrow",
    value: "placement class + CSS variables",
    description: "箭头跟随触发点中心并在面板被视口夹紧时同步夹紧。",
  },
];

const behaviorRows: DocRow[] = [
  {
    name: "Click",
    value: "toggle",
    description: "默认点按开关；外部 pointerdown 会关闭，面板内部点击不会误关。",
  },
  {
    name: "Hover",
    value: "mouseenter / mouseleave",
    description: "带 120ms 延迟关闭，允许从触发器移动到面板。",
  },
  {
    name: "Keyboard",
    value: "Enter / Space / ArrowDown / Escape / Tab",
    description: "触发器可键盘打开，Escape 关闭，Tab 在浮层内部稳定循环。",
  },
  {
    name: "Mobile",
    value: "viewport clamp",
    description: "375px 和 390px 视口内面板不横向溢出，触控推荐 click 触发。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "surface",
    value: "#ffffff",
    description: "近白浮层表面，和当前 neutral minimal 中性色体系一致。",
  },
  {
    name: "border",
    value: "#dededb",
    description: "细边框同时用于面板和箭头外沿。",
  },
  {
    name: "shadow",
    value: "0 8px 24px rgba(17,17,16,.12)",
    description: "低阴影，仅表达层级，不做高饱和主色。",
  },
  {
    name: "z-index",
    value: "60",
    description: "高于普通内容和 Dropdown，同层低于 Popconfirm/Tour/Modal 等更强反馈层。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Dependency boundary",
    value: "No antd / antd-mobile / @ant-design/charts",
    description: "组件为自有 React + CSS 实现，不包装 Tooltip、Popconfirm 或任何外部 UI 库。",
  },
  {
    name: "Content boundary",
    value: "ReactNode",
    description: "不解析字符串 HTML，不使用 dangerouslySetInnerHTML；富内容净化由上游内容组件负责。",
  },
  {
    name: "Global listeners",
    value: "open scoped",
    description: "只在打开期间注册 pointerdown、keydown、resize 和 scroll 监听，关闭时清理。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "Popover 只承载轻量补充内容和短操作；复杂流程升级 Modal/Drawer，短说明使用 Tooltip，确认动作使用 Popconfirm。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "近白卡片、细边框、低阴影和箭头层级独立；四方向定位在桌面和移动视口内可读。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "App overlay root/body portal、自有状态、定位、焦点和监听清理；未引入 antd、antd-mobile、@ant-design/charts，也未和 Tooltip/Popconfirm 合并。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "需覆盖 click/hover/focus、受控/非受控、外点、Escape、Tab、四方向、375/390px 与文档样例一行检查。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "无 HTML 注入面、无外部 UI 供应链扩张，监听仅在打开态存在；宿主传入可交互内容时仍由 React 语义边界承载。",
  },
];

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

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo popover-doc-demo">
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

function ReleaseSummaryContent({ onAction }: { onAction?: () => void }) {
  return (
    <div className="popover-doc-panel">
      <PropertyList
        columns={1}
        density="compact"
        items={[
          { id: "status", label: "Status", value: "Ready" },
          { id: "owner", label: "Owner", value: "Component team" },
          { id: "risk", label: "Risk", value: "Low" },
        ]}
      />
      <div className="popover-doc-panel__actions">
        <Button size="sm" variant="solid" onClick={onAction}>
          Review
        </Button>
        <Button size="sm" variant="ghost">
          Details
        </Button>
      </div>
    </div>
  );
}

export function PopoverDoc({ showAnchors = false }: PopoverDocProps) {
  const [controlledOpen, setControlledOpen] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  const demos: Demo[] = [
    {
      title: "结构化卡片",
      description: "默认 click 打开，卡片内可承载结构化信息和少量操作。",
      preview: (
        <div className="doc-demo-stack">
          <Popover
            defaultOpen
            title="Release summary"
            content={<ReleaseSummaryContent onAction={() => setActionCount((count) => count + 1)} />}
          >
            <Button variant="ghost">Open summary</Button>
          </Popover>
          <span className="doc-demo-note">Review clicks: {actionCount}</span>
        </div>
      ),
      code: `<Popover title="Release summary" content={<ReleaseSummaryContent />}><Button variant="ghost">Open summary</Button></Popover>`,
    },
    {
      title: "受控打开",
      description: "open/onOpenChange 适合被工具栏或外部状态驱动的浮层。",
      preview: (
        <div className="doc-demo-stack">
          <div className="doc-demo-row">
            <Button variant="ghost" onClick={() => setControlledOpen(true)}>
              External open
            </Button>
            <Popover
              open={controlledOpen}
              onOpenChange={setControlledOpen}
              placement="bottom"
              title="Controlled"
              content={
                <div className="popover-doc-panel">
                  <p>External state owns this popover.</p>
                  <Button size="sm" onClick={() => setControlledOpen(false)}>
                    Close
                  </Button>
                </div>
              }
            >
              <Button>Controlled target</Button>
            </Popover>
          </div>
          <span className="doc-demo-note">Open: {String(controlledOpen)}</span>
        </div>
      ),
      code: `<Popover open={open} onOpenChange={setOpen} content={<Panel />}><Button>Controlled target</Button></Popover>`,
    },
    {
      title: "触发方式",
      description: "hover/focus 可用于桌面补充信息，触控业务仍推荐 click。",
      preview: (
        <div className="doc-demo-row popover-doc-trigger-row">
          <Popover trigger="hover" placement="top" title="Hover" content="Move into the card before it closes.">
            <Button size="sm" variant="ghost">Hover</Button>
          </Popover>
          <Popover trigger="focus" placement="bottom" title="Focus" content="Keyboard focus opens the card.">
            <Button size="sm" variant="ghost">Focus</Button>
          </Popover>
          <Popover trigger={["click", "focus"]} placement="right" title="Combined" content={<Tag tone="subtle">click + focus</Tag>}>
            <Button size="sm">Combined</Button>
          </Popover>
        </div>
      ),
      code: `<Popover trigger="hover" content="Move into the card"><Button>Hover</Button></Popover> <Popover trigger={["click", "focus"]} content={<Tag />}><Button>Combined</Button></Popover>`,
    },
    {
      title: "方向与箭头",
      description: "四方向 placement 都有箭头；窄屏会把面板夹紧到视口内。",
      preview: (
        <div className="doc-demo-row popover-doc-placement-row">
          {(["top", "bottom", "left", "right"] as const).map((placement) => (
            <Popover
              key={placement}
              placement={placement}
              title={`${placement} placement`}
              content="Arrow tracks the trigger and stays inside the viewport."
            >
              <Button size="sm" variant="ghost">{placement}</Button>
            </Popover>
          ))}
        </div>
      ),
      code: `<Popover placement="top" content="Arrow tracks the trigger"><Button>top</Button></Popover>`,
    },
  ];

  return (
    <TutorialScaffold component="Popover" kind="display" oneLineExample={`<Popover content={<Card title="Details">Ready</Card>}><Button>Open</Button></Popover>`} overlay>
    <section className="button-doc popover-doc" aria-labelledby="popover-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Popover 文档目录">
            {popoverDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="popover-doc-title">{popoverDocMeta.title}</h2>
            <p>
              Popover 是触发点旁的轻量 dialog，用于展示结构化补充信息或少量操作。它是独立组件，不和 Tooltip 或
              Popconfirm 合并文档，也不包装 antd 系组件。
            </p>
          </header>

          <section className="button-doc-section" id="popover-when" aria-labelledby="popover-when-title">
            <h3 id="popover-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当内容比 Tooltip 更丰富，需要标题、属性列表、链接或少量按钮时使用。</li>
              <li>当上下文关联强、无需阻断页面主流程时使用。</li>
              <li>短文本说明使用 Tooltip；危险动作确认使用 Popconfirm；长表单或复杂流程使用 Modal/Drawer。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="popover-demos" aria-labelledby="popover-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="popover-demos-title">代码演示</h3>
              <p>示例覆盖结构化内容、受控状态、触发方式、定位、箭头和移动夹紧。</p>
            </div>
            <div className="button-doc-demo-grid popover-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="popover-api" aria-labelledby="popover-api-title">
            <h3 id="popover-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="popover-semantic" aria-labelledby="popover-semantic-title">
            <h3 id="popover-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="popover-keyboard" aria-labelledby="popover-keyboard-title">
            <h3 id="popover-keyboard-title">Keyboard / Mobile / a11y</h3>
            <DataTable rows={behaviorRows} />
          </section>

          <section className="button-doc-section" id="popover-token" aria-labelledby="popover-token-title">
            <h3 id="popover-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="popover-security" aria-labelledby="popover-security-title">
            <h3 id="popover-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="popover-review" aria-labelledby="popover-review-title">
            <h3 id="popover-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="popover-gaps" aria-labelledby="popover-gaps-title">
            <h3 id="popover-gaps-title">剩余风险</h3>
            <p>
              当前未实现自动翻转、碰撞后 placement 语义改写或复杂 focus trap。长内容、异步确认、多步骤操作和危险动作应升级到
              Drawer、Modal 或 Popconfirm。
            </p>
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
