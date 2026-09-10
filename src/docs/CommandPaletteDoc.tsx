import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../components/base";
import { CommandPalette } from "../components/business";
import type { CommandPaletteItem } from "../components/business";
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

export type CommandPaletteDocProps = {
  showAnchors?: boolean;
};

export const commandPaletteDocMeta = {
  title: "CommandPalette 命令面板",
  category: "业务组件",
  anchors: [
    { id: "command-palette-when", label: "何时使用" },
    { id: "command-palette-demos", label: "代码演示" },
    { id: "command-palette-api", label: "API" },
    { id: "command-palette-keyboard", label: "Keyboard" },
    { id: "command-palette-dialog", label: "Dialog" },
    { id: "command-palette-mobile", label: "Mobile" },
    { id: "command-palette-security", label: "Security" },
    { id: "command-palette-review", label: "五角色结论" },
    { id: "command-palette-gaps", label: "扩展建议" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<CommandPalette items={items} onSelect={handleCommand} triggerLabel="Open commands" />`;

const commandItems: CommandPaletteItem[] = [
  {
    id: "open-docs",
    label: "Open component docs",
    description: "Jump to the selected component detail page.",
    group: "Navigation",
    shortcut: "Enter",
    keywords: ["docs", "component"],
  },
  {
    id: "copy-import",
    label: "Copy import",
    description: "Copy the import snippet for the current component.",
    group: "Navigation",
    shortcut: "C",
    keywords: ["snippet", "import"],
  },
  {
    id: "refresh-data",
    label: "Refresh command source",
    description: "Ask the host page to reload available commands.",
    group: "System",
    shortcut: "R",
  },
  {
    id: "archive-component",
    label: "Archive component",
    description: "Disabled commands stay visible but cannot run.",
    disabled: true,
    group: "System",
  },
  {
    id: "xss-text",
    label: "<img src=x onerror=alert(1)>",
    description: "Rendered as inert text for security review.",
    group: "Security",
    keywords: ["xss", "html", "inert"],
  },
];

const apiRows: DocRow[] = [
  {
    name: "items",
    value: "CommandPaletteItem[]",
    description: "命令数据源。每项需要稳定 id 和可读 label，可选 description、group、shortcut、keywords、disabled、onSelect。",
  },
  {
    name: "open / defaultOpen",
    value: "boolean",
    description: "支持受控和非受控打开状态。受控模式下组件只通过 onOpenChange 通知宿主。",
  },
  {
    name: "onOpenChange",
    value: "(open, reason?) => void",
    description: "打开或关闭时触发。关闭 reason 包括 escape、overlay、close-button、select，便于审计交互来源。",
  },
  {
    name: "onSelect",
    value: "(item) => void",
    description: "用户点击命令或按 Enter 激活当前可用命令时触发。disabled 项不会触发。",
  },
  {
    name: "label",
    value: "string",
    description: "dialog 标题和搜索框可访问名称的来源。默认值为 Command palette。",
  },
  {
    name: "triggerLabel",
    value: "ReactNode",
    description: "默认触发按钮内容。宿主也可用 open 受控模式接入外部触发器。",
  },
  {
    name: "placeholder / empty / loading / error",
    value: "ReactNode / boolean",
    description: "搜索占位、空状态、加载态和错误态。错误态使用 role=alert，加载和空态使用 role=status。",
  },
  {
    name: "maxVisibleItems",
    value: "number",
    description: "单次渲染命令上限，默认使用 UI_RENDER_BUDGETS.commandPaletteItems。超出时展示收敛提示，用户可继续搜索缩小结果。",
  },
  {
    name: "clearOnClose",
    value: "boolean",
    description: "默认关闭后清空搜索词并重置 activeIndex；需要保留查询时可设为 false。",
  },
  {
    name: "enableGlobalShortcut",
    value: "boolean",
    description: "默认关闭。开启后监听 Ctrl/Meta+K，但会避开 input、textarea、select 和 contenteditable。",
  },
  {
    name: "showTrigger",
    value: "boolean",
    description: "默认显示内置触发按钮。外部受控触发器或应用级快捷键场景可设为 false。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "ArrowDown / ArrowUp",
    value: "move active option",
    description: "只在可用命令之间循环移动，disabled 项不会成为 active 命令。",
  },
  {
    name: "Home / End",
    value: "jump active option",
    description: "跳到第一项或最后一项可用命令，适合较长命令列表快速导航。",
  },
  {
    name: "Enter",
    value: "select active option",
    description: "只执行当前可用命令。没有可用命令时不会执行任何回调。",
  },
  {
    name: "Typing",
    value: "filter + highlight",
    description: "输入搜索词会过滤 label/group/shortcut/keywords，并用 mark 高亮文本命中片段；高亮不解析 HTML。",
  },
  {
    name: "Escape",
    value: "close dialog",
    description: "输入框、关闭按钮或 dialog 内其它焦点位置都可关闭，并把焦点恢复到实际打开命令面板的元素。",
  },
  {
    name: "Tab / Shift+Tab",
    value: "trap focus",
    description: "焦点被限制在 dialog 内的输入框和关闭按钮之间，避免浮层打开时跑到页面后方。",
  },
];

const dialogRows: DocRow[] = [
  {
    name: "root",
    value: "section",
    description: "组件根节点承载触发按钮和按需挂载的 overlay。",
  },
  {
    name: "trigger",
    value: "button[aria-haspopup=dialog]",
    description: "内置触发器暴露 aria-expanded 和 aria-controls；外部触发器场景可隐藏内置按钮并恢复到实际打开者。",
  },
  {
    name: "overlay",
    value: "fixed presentation",
    description: "点击遮罩关闭；dialog 内 onMouseDown 会阻止冒泡，避免误关。",
  },
  {
    name: "dialog",
    value: "role=dialog aria-modal=true",
    description: "通过隐藏标题提供可访问名称，搜索框使用 combobox + listbox + activedescendant。",
  },
  {
    name: "option",
    value: "button role=option",
    description: "列表项保留 button 激活语义，但从 Tab 序列移除，键盘选择由输入框统一管理。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Viewport",
    value: "360px+",
    description: "dialog 在窄屏贴近底部并占满可用宽度，最大高度使用 100dvh 防止浏览器工具栏挤压。",
  },
  {
    name: "Input",
    value: "autocomplete off",
    description: "关闭自动大写、自动纠错和浏览器补全，减少命令搜索被输入法策略干扰。",
  },
  {
    name: "Items",
    value: "58px min-height",
    description: "移动端命令项增大触控高度，长描述和快捷键会换行，不制造页面横向滚动。",
  },
  {
    name: "Large set",
    value: "render budget",
    description: "大命令集只渲染预算内结果，过滤保持线性扫描，active 状态按当前可见可用命令计算。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Execution",
    value: "explicit activation only",
    description: "命令只会在用户点击或按 Enter 时执行。过滤、打开、关闭、移动 activeIndex 都不会执行命令。",
  },
  {
    name: "Disabled",
    value: "native disabled",
    description: "disabled 命令使用原生 disabled 阻断点击，并在键盘 active 计算中排除。",
  },
  {
    name: "Content",
    value: "ReactNode",
    description: "组件不解析 HTML 字符串、不使用 dangerouslySetInnerHTML。文本高亮使用 React 文本节点和 mark，示例含 XSS-like 文本。",
  },
  {
    name: "Global shortcut",
    value: "opt-in",
    description: "全局 Ctrl/Meta+K 默认不启用；启用后也不会劫持正在编辑的输入控件。",
  },
  {
    name: "Dependencies",
    value: "self-owned",
    description: "不依赖 antd、antd-mobile、@ant-design/charts 或其它外部 UI 组件库。",
  },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "CommandPalette 独立承载页面级命令搜索，不与 Dropdown、Menu 或 Button 合并。" },
  { name: "UI 专家", value: "PASS", description: "Dialog、搜索框、分组、快捷键、禁用态和移动底部形态均可扫描。" },
  { name: "研发专家", value: "PASS", description: "自有 React + CSS 实现，命令执行只发生在显式激活路径，不默认注册全局快捷键。" },
  { name: "测试专家", value: "PASS", description: "覆盖打开关闭、焦点恢复、键盘移动、disabled、loading/error/empty、移动端和一行样例。" },
  { name: "白帽专家", value: "PASS", description: "命令 label/description 作为 ReactNode 渲染，不解析 HTML，不引入外部 UI 依赖。" },
];

function BasicDemo() {
  const [lastCommand, setLastCommand] = useState("No command selected");

  return (
    <div className="command-palette-doc-stack">
      <CommandPalette
        enableGlobalShortcut
        items={commandItems.map((item) => ({
          ...item,
          onSelect: () => setLastCommand(item.label),
        }))}
        onSelect={(item) => setLastCommand(item.label)}
      />
      <p className="segmented-doc-output" aria-live="polite">{lastCommand}</p>
    </div>
  );
}

function ControlledDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="command-palette-doc-stack">
      <Button onClick={() => setOpen(true)} variant="solid">Open controlled palette</Button>
      <CommandPalette
        items={commandItems}
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="Internal trigger"
      />
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础命令搜索",
    description: "搜索、分组、快捷键、disabled 命令和 Ctrl/Meta+K 在同一个 dialog 中验收。",
    preview: <BasicDemo />,
    code: `<CommandPalette enableGlobalShortcut items={[{ id: "copy-import", label: "Copy import", group: "Navigation", shortcut: "C" }]} onSelect={handleCommand} />`,
  },
  {
    title: "受控打开",
    description: "宿主可以用 open/onOpenChange 接管外部触发器，并通过关闭 reason 做审计。",
    preview: <ControlledDemo />,
    code: `<CommandPalette open={open} onOpenChange={setOpen} showTrigger={false} items={items} />`,
  },
  {
    title: "加载和错误",
    description: "loading、error、empty 是互斥状态，避免命令列表和状态提示同时出现。",
    preview: (
      <div className="doc-demo-row">
        <CommandPalette loading items={[]} triggerLabel="Loading state" />
        <CommandPalette error="Command source failed" items={[]} triggerLabel="Error state" />
      </div>
    ),
    code: `<CommandPalette loading items={[]} />`,
  },
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

export function CommandPaletteDoc({ showAnchors = false }: CommandPaletteDocProps) {
  return (
    <TutorialScaffold component="CommandPalette" kind="action" oneLineExample={oneLineExample} overlay>
    <section className="button-doc command-palette-doc" aria-labelledby="command-palette-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="CommandPalette 文档目录">
            {commandPaletteDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component doc</p>
            <h2 id="command-palette-doc-title">{commandPaletteDocMeta.title}</h2>
            <p>
              用于把页面级命令集中到一个可搜索、可键盘操作的 dialog 中。组件只负责呈现、过滤和显式激活命令，
              不自动执行外部副作用，也不默认注册全局快捷键。
            </p>
          </header>

          <section className="button-doc-section" id="command-palette-when" aria-labelledby="command-palette-when-title">
            <h3 id="command-palette-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>页面命令数量较多，需要用户通过搜索快速定位时使用。</li>
              <li>命令需要兼顾鼠标点击、键盘导航和关闭后的焦点恢复时使用。</li>
              <li>只需要一个普通下拉菜单或单个按钮时不要使用命令面板。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="command-palette-demos" aria-labelledby="command-palette-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="command-palette-demos-title">代码演示</h3>
              <p>示例覆盖基础搜索、受控 dialog、加载态、错误态和 disabled 命令。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="command-palette-api" aria-labelledby="command-palette-api-title">
            <h3 id="command-palette-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="command-palette-keyboard" aria-labelledby="command-palette-keyboard-title">
            <h3 id="command-palette-keyboard-title">Keyboard</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="command-palette-dialog" aria-labelledby="command-palette-dialog-title">
            <h3 id="command-palette-dialog-title">Dialog</h3>
            <DataTable rows={dialogRows} />
          </section>

          <section className="button-doc-section" id="command-palette-mobile" aria-labelledby="command-palette-mobile-title">
            <h3 id="command-palette-mobile-title">Mobile</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="command-palette-security" aria-labelledby="command-palette-security-title">
            <h3 id="command-palette-security-title">Security</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="command-palette-review" aria-labelledby="command-palette-review-title">
            <h3 id="command-palette-review-title">五角色结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="command-palette-gaps" aria-labelledby="command-palette-gaps-title">
            <h3 id="command-palette-gaps-title">扩展建议</h3>
            <ul className="button-doc-list">
              <li>不内置异步命令队列，命令执行生命周期由宿主管理。</li>
              <li>不内置最近命令、收藏命令或远程搜索，避免把业务状态锁进通用组件。</li>
              <li>复杂 command group 排序、权限过滤和审计日志应在传入 items 前完成。</li>
              <li>超过渲染预算的命令通过 maxVisibleItems 收敛展示，远程搜索和虚拟列表由业务侧按场景接入。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
