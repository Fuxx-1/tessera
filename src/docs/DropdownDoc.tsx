import { useState, type ReactNode } from "react";
import { Button } from "../components/base/Button";
import { Dropdown, type DropdownMenuItem } from "../components/base/Dropdown";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
};

type ComponentDocMeta = {
  anchors: Array<{ id: string; label: string }>;
  category: string;
  title: string;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type DropdownDocProps = {
  showAnchors?: boolean;
};

export const dropdownDocMeta = {
  title: "Dropdown 下拉菜单",
  category: "基础组件",
  anchors: [
    { id: "dropdown-purpose", label: "用途" },
    { id: "dropdown-demos", label: "代码演示" },
    { id: "dropdown-api", label: "API" },
    { id: "dropdown-keyboard", label: "键盘与焦点" },
    { id: "dropdown-semantic", label: "Semantic DOM" },
    { id: "dropdown-style", label: "主题与结构 style" },
    { id: "dropdown-mobile", label: "移动端" },
    { id: "dropdown-security", label: "安全与层级" },
    { id: "dropdown-boundary", label: "边界" },
    { id: "dropdown-review", label: "五专家结论" },
    { id: "dropdown-matrix", label: "四点矩阵" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Dropdown items={items} menuLabel="Actions"><Button>Actions</Button></Dropdown>`;

const baseItems: DropdownMenuItem[] = [
  { key: "copy", label: "Copy link", description: "Copy the component URL" },
  {
    key: "rename",
    label: "Rename this draft with an unusually long menu label that wraps safely",
    description: "Edit the display name",
  },
  { key: "divider-1", type: "separator" },
  { key: "archive", label: "Archive", description: "Move out of active review", disabled: true },
  { key: "delete", label: "Delete draft", description: "Remove this local draft", danger: true },
];

const compactItems: DropdownMenuItem[] = [
  { key: "open", label: "Open" },
  { key: "duplicate", label: "Duplicate" },
  { key: "share", label: "Share" },
];

const allDisabledItems: DropdownMenuItem[] = [
  { key: "locked", label: "Locked action", description: "Available after review unlocks", disabled: true },
  { key: "needs-owner", label: "Assign owner first", disabled: true },
];

const collisionItems: DropdownMenuItem[] = [
  { key: "top", label: "Move to top edge" },
  { key: "right", label: "Align to right edge without clipping" },
  { key: "audit", label: "Run collision audit" },
];

const apiRows: DocRow[] = [
  {
    name: "items",
    value: "DropdownMenuItem[]",
    description: "必填。支持普通 action item 和 separator；首版不接受任意 overlay children，避免和 Popover 混用。",
  },
  {
    name: "children",
    value: "ReactElement",
    description: "触发器元素，推荐 Button 或 IconButton。组件会注入 aria-haspopup、aria-expanded、aria-controls 和键盘打开行为。",
  },
  {
    name: "open / defaultOpen",
    value: "boolean",
    description: "支持受控和非受控打开状态。disabled 为 true 时会强制关闭。",
  },
  {
    name: "onOpenChange",
    value: "(open: boolean) => void",
    description: "打开状态变化回调，点击触发器、Escape、外点关闭和选择菜单项都会触发。",
  },
  {
    name: "onSelect",
    value: "(key: string, item: DropdownItem) => void",
    description: "选择可用菜单项后的回调。disabled item 不会触发。",
  },
  {
    name: "closeOnSelect",
    value: "boolean",
    description: "默认 true。选择菜单项后关闭菜单并把焦点回到触发器。",
  },
  {
    name: "placement",
    value: '"bottom-start" | "bottom-end" | "top-start" | "top-end"',
    description: "控制菜单相对触发器的起始方向；空间不足时会夹紧或向上展示。",
  },
  {
    name: "trigger",
    value: '"click" | "hover" | Array',
    description: "默认 click；桌面可用 hover 或 hover+click，移动触控场景保留 click 作为稳定入口。",
  },
  {
    name: "menuLabel",
    value: "string",
    description: "菜单的 aria-label，默认 Actions。多个 Dropdown 同屏时建议提供具体名称。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用整个 Dropdown，触发器不会打开菜单，已打开状态也会被关闭。",
  },
];

const keyboardRows: DocRow[] = [
  { name: "Trigger Enter / Space", value: "open", description: "从触发器打开菜单，并聚焦第一个可用项。" },
  { name: "Trigger ArrowDown", value: "first item", description: "打开并聚焦第一个可用 menuitem。" },
  { name: "Trigger ArrowUp", value: "last item", description: "打开并聚焦最后一个可用 menuitem。" },
  { name: "Menu ArrowUp / ArrowDown", value: "roving focus", description: "在可用项之间循环移动，跳过 disabled 和 separator。" },
  { name: "Home / End", value: "first / last", description: "跳到首个或末个可用项。" },
  { name: "Escape", value: "close", description: "关闭菜单并把焦点回到触发器。" },
  { name: "Tab", value: "natural flow", description: "关闭菜单，让浏览器继续正常移焦；Dropdown 不做焦点陷阱。" },
  { name: "Focus leave", value: "close", description: "焦点移出触发器和菜单边界时关闭，避免浮层残留在页面上。" },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-dropdown",
    description: "包裹触发器和菜单，避免 span 内嵌 div 的无效结构；菜单不 portal 到 body，外点关闭仍以组件根节点判断。",
  },
  {
    name: "trigger",
    value: 'aria-haspopup="menu"',
    description: "触发器保留原事件处理器，并补充 menu button 所需的 expanded 和 controls 关系。",
  },
  {
    name: "menu",
    value: 'div[role="menu"]',
    description: "菜单容器只承载命令项，不使用 Popover 的 dialog 语义。",
  },
  {
    name: "item",
    value: 'button[role="menuitem"]',
    description: "菜单项使用按钮承载动作；disabled 项为原生 disabled，不进入 roving focus。",
  },
  {
    name: "separator",
    value: 'role="separator"',
    description: "分隔线不可聚焦，不参与键盘循环。",
  },
];

const styleRows: DocRow[] = [
  {
    name: "theme style / 主题 style",
    value: "--ct-surface-elevated / --ct-border / --ct-shadow-xl",
    description: "菜单面、边框、低透明 hover、active、danger 前景和蓝色 focus ring 都读取 --ct-* token，亮/暗主题下保持中性浮层质感。",
  },
  {
    name: "structure style / 结构 style",
    value: "fixed menu / viewport clamp / roving focus",
    description: "placement、minMenuWidth、视口夹紧、菜单项 44px 触控高度、separator 和键盘焦点循环属于结构样式。",
  },
];

const mobileRows: DocRow[] = [
  { name: "viewport clamp", value: "12px padding", description: "fixed 定位会夹紧到视口内，避免窄屏左右裁切。" },
  { name: "width", value: "trigger / min width", description: "菜单宽度至少覆盖触发器和 minMenuWidth，小屏最大为视口宽度减安全边距。" },
  { name: "touch target", value: "44px coarse pointer", description: "触控设备下菜单项最小高度提升到 44px。" },
  { name: "scroll / resize", value: "reposition", description: "窗口 resize 或滚动容器滚动时重新计算位置。" },
];

const boundaryRows: DocRow[] = [
  {
    name: "不是 Popover",
    value: "menu, not dialog",
    description: "Dropdown 是动作菜单，语义是 menu/menuitem；Popover 用于富内容卡片或轻量 dialog。",
  },
  {
    name: "不是 Menu",
    value: "temporary actions",
    description: "Menu 面向站点导航、侧栏层级和当前项；Dropdown 首版只覆盖短列表操作菜单。",
  },
  {
    name: "不是 Select",
    value: "action, not value",
    description: "Dropdown 触发动作，不承担表单 value/defaultValue/onValueChange 模型。",
  },
  {
    name: "暂不支持",
    value: "submenu / checkbox item / link item",
    description: "子菜单、可勾选菜单项、链接渲染和分组标题留给后续自有 Menu/Dropdown 扩展。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Dependency boundary",
    value: "No antd / antd-mobile / @ant-design/charts",
    description: "Dropdown 是自有 React + CSS 实现，不包装外部 UI 库，也不复用 Popover 的 dialog 行为。",
  },
  {
    name: "Text safety",
    value: "ReactNode only",
    description: "label 和 description 作为 ReactNode 渲染，不解析字符串 HTML，不使用 dangerouslySetInnerHTML。",
  },
  {
    name: "Portal",
    value: "inline fixed overlay",
    description: "菜单保留在 Dropdown 根节点内，使用 fixed 定位；外点关闭边界仍以组件根节点判断。",
  },
  {
    name: "z-index",
    value: "60",
    description: "与轻量浮层层级一致，高于普通页面内容，低于 Modal、Tour 等强反馈覆盖层。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "覆盖短列表命令、打开关闭、disabled/danger、受控打开和边界说明；不承担 Select 表单值或 Menu 导航职责。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "菜单宽度、视口夹紧、hover/active、危险项颜色和移动端 44px 触控目标均保持克制且可扫描。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "自有状态、定位、键盘 roving focus、滚动/resize 重算和打开态监听清理；未引入 antd 系依赖。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "专项 smoke 覆盖 #dropdown 路由、打开关闭、定位、键盘、hover/click、disabled、移动端、z-index 和一行样例。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "无 HTML 注入入口、无危险链接执行面、disabled 项不可触发；文本由 React 默认转义边界承载。",
  },
];

const matrixRows: DocRow[] = [
  {
    name: "教程壳层",
    value: "PASS",
    description: "DropdownDoc 使用 TutorialScaffold 和 DemoContainer；复制入口、真实预览和一行 TSX 示例保持一致。",
  },
  {
    name: "生产交互",
    value: "PASS",
    description: "覆盖 click、hover、disabled、placement/collision、keyboard、focus 回收、ARIA 和 closeOnSelect。",
  },
  {
    name: "布局可靠性",
    value: "PASS",
    description: "菜单 fixed 定位、视口夹紧、内部滚动、移动端 12px 安全边距和触控高度避免溢出遮挡。",
  },
  {
    name: "安全边界",
    value: "PASS",
    description: "ReactNode 文本边界、无 dangerouslySetInnerHTML、无外部 UI 依赖，z-index 低于阻断型浮层。",
  },
];

function ControlledDropdownDemo() {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState("none");

  return (
    <div className="demo-stack">
      <Dropdown
        items={compactItems}
        menuLabel="Controlled actions"
        onOpenChange={setOpen}
        onSelect={setLastAction}
        open={open}
        placement="bottom-end"
      >
        <Button variant="ghost">{open ? "Close actions" : "Open actions"}</Button>
      </Dropdown>
      <span className="demo-kicker">Last action: {lastAction}</span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础动作菜单",
    description: "点击触发器打开；菜单项点击后关闭，disabled 项不会触发，danger 项保持克制红色。",
    preview: (
      <Dropdown items={baseItems} menuLabel="Draft actions">
        <Button variant="solid">Draft actions</Button>
      </Dropdown>
    ),
    code: `<Dropdown items={items} menuLabel="Draft actions"><Button variant="solid">Draft actions</Button></Dropdown>`,
  },
  {
    title: "Hover 触发",
    description: "桌面 hover 可打开，移入菜单不会误关；移动触控仍推荐 click 或 hover+click。",
    preview: (
      <Dropdown items={compactItems} menuLabel="Hover actions" trigger={["hover", "click"]}>
        <Button variant="ghost">Hover actions</Button>
      </Dropdown>
    ),
    code: `<Dropdown trigger={["hover", "click"]} items={compactItems} menuLabel="Hover actions"><Button variant="ghost">Hover actions</Button></Dropdown>`,
  },
  {
    title: "Placement 与碰撞",
    description: "bottom-end、top-end 会按触发器对齐；视口不足时夹紧或翻到可见方向。",
    preview: (
      <div className="dropdown-doc-collision-demo">
        <Dropdown items={collisionItems} menuLabel="Bottom end actions" placement="bottom-end">
          <Button>bottom-end</Button>
        </Dropdown>
        <Dropdown items={collisionItems} menuLabel="Top end actions" placement="top-end">
          <Button variant="ghost">top-end</Button>
        </Dropdown>
      </div>
    ),
    code: `<Dropdown placement="bottom-end" items={items} menuLabel="Bottom end actions"><Button>bottom-end</Button></Dropdown>`,
  },
  {
    title: "受控打开",
    description: "open/onOpenChange 由宿主控制，onSelect 返回 key 与 item。",
    preview: <ControlledDropdownDemo />,
    code: `<Dropdown open={open} onOpenChange={setOpen} onSelect={(key, item) => saveAction(key, item)} items={items}><Button>Open actions</Button></Dropdown>`,
  },
  {
    title: "全部禁用",
    description: "没有可用项时菜单容器自身可聚焦，Escape 和外点关闭仍然有效。",
    preview: (
      <Dropdown items={allDisabledItems} menuLabel="Locked actions">
        <Button variant="ghost">Locked actions</Button>
      </Dropdown>
    ),
    code: `<Dropdown items={allDisabledItems} menuLabel="Locked actions"><Button variant="ghost">Locked actions</Button></Dropdown>`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      <div className="button-doc-demo__preview dropdown-doc-demo__preview">{preview}</div>
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

export function DropdownDoc({ showAnchors = false }: DropdownDocProps) {
  return (
    <TutorialScaffold component="Dropdown" kind="action" oneLineExample={oneLineExample} overlay>
    <section className="button-doc dropdown-doc" aria-labelledby="dropdown-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Dropdown 文档目录">
            {dropdownDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="dropdown-doc-title">{dropdownDocMeta.title}</h2>
            <p>
              面向短列表命令的自有基础组件。Dropdown 使用 menu button 模型，不依赖 antd 系组件，
              不复用 Popover 的 dialog 语义，也不承担 Menu 的站点导航职责。教程页统一使用 TutorialScaffold 和
              DemoContainer 承载真实预览、一行/紧凑样例，并明确 theme style 与 structure style。
            </p>
          </header>

          <section className="button-doc-section" id="dropdown-purpose" aria-labelledby="dropdown-purpose-title">
            <h3 id="dropdown-purpose-title">用途</h3>
            <ul className="button-doc-list">
              <li>当一个触发器后面有多项临时操作，例如复制、重命名、归档、删除。</li>
              <li>当操作列表需要 disabled、danger、分隔线和键盘方向键导航。</li>
              <li>当内容是富信息卡片、表单或导航树时，应分别使用 Popover 或未来 Menu。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="dropdown-demos" aria-labelledby="dropdown-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="dropdown-demos-title">代码演示</h3>
              <p>覆盖点击触发、键盘菜单项、disabled/danger 和受控打开状态。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="dropdown-api" aria-labelledby="dropdown-api-title">
            <h3 id="dropdown-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="dropdown-keyboard" aria-labelledby="dropdown-keyboard-title">
            <h3 id="dropdown-keyboard-title">键盘与焦点</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="dropdown-semantic" aria-labelledby="dropdown-semantic-title">
            <h3 id="dropdown-semantic-title">Semantic DOM / a11y</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="dropdown-style" aria-labelledby="dropdown-style-title">
            <h3 id="dropdown-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="dropdown-mobile" aria-labelledby="dropdown-mobile-title">
            <h3 id="dropdown-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="dropdown-security" aria-labelledby="dropdown-security-title">
            <h3 id="dropdown-security-title">安全与层级</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="dropdown-boundary" aria-labelledby="dropdown-boundary-title">
            <h3 id="dropdown-boundary-title">边界</h3>
            <DataTable rows={boundaryRows} />
          </section>

          <section className="button-doc-section" id="dropdown-review" aria-labelledby="dropdown-review-title">
            <h3 id="dropdown-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="dropdown-matrix" aria-labelledby="dropdown-matrix-title">
            <h3 id="dropdown-matrix-title">四点矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
