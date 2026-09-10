import { useState, type ReactNode } from "react";
import { Button, Menu } from "../components/base";
import type { MenuNode } from "../components/base";
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

export type MenuDocProps = {
  showAnchors?: boolean;
};

export const menuDocMeta = {
  title: "Menu 导航菜单",
  category: "基础组件",
  description: "独立 Menu 文档，覆盖导航菜单的结构、状态、键盘和移动端溢出，不与 Dropdown 文档合并。",
  anchors: [
    { id: "menu-purpose", label: "组件目的" },
    { id: "menu-when", label: "何时使用" },
    { id: "menu-demos", label: "代码演示" },
    { id: "menu-api", label: "API" },
    { id: "menu-semantic", label: "Semantic DOM" },
    { id: "menu-token", label: "Design Token" },
    { id: "menu-a11y", label: "Accessibility" },
    { id: "menu-composition", label: "组合关系" },
    { id: "menu-review", label: "角色复核" },
    { id: "menu-gaps", label: "缺口" },
    { id: "menu-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const verticalItems: MenuNode[] = [
  { key: "overview", label: "Overview", href: "#menu" },
  {
    key: "components",
    label: "Components",
    type: "submenu",
    children: [
      { key: "base", label: "Base components", href: "#overview" },
      { key: "business", label: "Business components", href: "#overview" },
      { key: "mobile", label: "Mobile mapping", disabled: true },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    type: "group",
    children: [
      { key: "tokens", label: "Design tokens" },
      { key: "accessibility", label: "Accessibility" },
    ],
  },
  { key: "sep", type: "separator" },
  { key: "settings", label: "Settings" },
];

const horizontalItems: MenuNode[] = [
  { key: "home", label: "Home", href: "#overview" },
  {
    key: "library",
    label: "Library",
    type: "submenu",
    children: [
      { key: "button", label: "Button", href: "#button" },
      { key: "tabs", label: "Tabs", href: "#tabs" },
      { key: "menu", label: "Menu", href: "#menu" },
    ],
  },
  { key: "docs", label: "Docs", href: "https://example.com/docs", linkProps: { target: "_blank", rel: "external" } },
  { key: "disabled", label: "Archived", disabled: true },
];

function ControlledMenuDemo() {
  const [selectedKey, setSelectedKey] = useState("tasks");
  const [openKeys, setOpenKeys] = useState(["workspace"]);

  return (
    <div className="menu-doc-controlled">
      <Menu
        aria-label="Controlled workspace menu"
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        onSelect={setSelectedKey}
        selectedKey={selectedKey}
        items={[
          {
            key: "workspace",
            label: "Workspace",
            type: "submenu",
            children: [
              { key: "tasks", label: "Tasks" },
              { key: "incidents", label: "Incidents" },
              { key: "automation", label: "Automation" },
            ],
          },
          { key: "reports", label: "Reports" },
        ]}
      />
      <div className="doc-demo-row" aria-label="External Menu controls">
        <Button size="sm" variant={selectedKey === "tasks" ? "solid" : "ghost"} onClick={() => setSelectedKey("tasks")}>
          Tasks
        </Button>
        <Button size="sm" variant={selectedKey === "reports" ? "solid" : "ghost"} onClick={() => setSelectedKey("reports")}>
          Reports
        </Button>
      </div>
      <p className="menu-doc-state">Selected: {selectedKey}; open: {openKeys.join(", ") || "none"}</p>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "垂直导航",
    description: "适合侧栏和局部导航。一行样例：<Menu aria-label=\"Workspace\" items={items} />。",
    preview: <Menu aria-label="Vertical Menu demo" defaultOpenKeys={["components"]} defaultSelectedKey="overview" items={verticalItems} />,
    code: `<Menu
  aria-label="Workspace navigation"
  defaultOpenKeys={["components"]}
  defaultSelectedKey="overview"
  items={items}
/>`,
  },
  {
    title: "水平菜单",
    description: "适合页头主导航。窄屏时 viewport 横向滚动，避免页面整体溢出。",
    preview: (
      <div className="menu-doc-mobile-frame">
        <Menu
          aria-label="Horizontal Menu demo"
          defaultOpenKeys={["library"]}
          defaultSelectedKey="menu"
          orientation="horizontal"
          items={horizontalItems}
        />
      </div>
    ),
    code: `<Menu
  orientation="horizontal"
  defaultOpenKeys={["library"]}
  defaultSelectedKey="menu"
  items={items}
/>`,
  },
  {
    title: "受控选择与展开",
    description: "selectedKey/openKeys 适合路由同步、侧栏状态持久化和外部按钮联动。",
    preview: <ControlledMenuDemo />,
    code: `const [selectedKey, setSelectedKey] = useState("tasks");
const [openKeys, setOpenKeys] = useState(["workspace"]);

<Menu
  selectedKey={selectedKey}
  onSelect={setSelectedKey}
  openKeys={openKeys}
  onOpenChange={setOpenKeys}
  items={items}
/>`,
  },
  {
    title: "分组、禁用与分隔",
    description: "group 使用 role=\"group\"，disabled 项不参与 roving tabindex，separator 只暴露为分隔语义。",
    preview: (
      <Menu
        aria-label="Grouped Menu demo"
        defaultSelectedKey="production"
        items={[
          {
            key: "environments",
            label: "Environments",
            type: "group",
            children: [
              { key: "production", label: "Production" },
              { key: "staging", label: "Staging" },
              { key: "unsafe", label: "Blocked unsafe href", href: "javascript:alert(1)" },
              { key: "sandbox", label: "Sandbox", disabled: true },
            ],
          },
          { key: "line", type: "separator" },
          { key: "settings", label: "Environment settings with a very long operations review label that should stay inside the menu" },
        ]}
      />
    ),
    code: `<Menu
  items={[
    {
      key: "environments",
      label: "Environments",
      type: "group",
      children: [
        { key: "production", label: "Production" },
        { key: "unsafe", label: "Blocked unsafe href", href: "javascript:alert(1)" },
        { key: "sandbox", label: "Sandbox", disabled: true },
      ],
    },
    { key: "line", type: "separator" },
    { key: "settings", label: "Environment settings" },
  ]}
/>`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "MenuNode[]", description: "必填。支持 item、group、submenu、separator 四类节点。" },
  { name: "orientation", value: '"vertical" | "horizontal"', description: "默认 vertical。影响根层箭头键方向和布局。" },
  { name: "selectedKey / defaultSelectedKey", value: "string", description: "受控或非受控当前叶子项。链接项会同步 aria-current=\"page\"。" },
  { name: "onSelect", value: "(key, item) => void", description: "用户点击或键盘激活叶子项时触发，disabled 项不会触发。" },
  { name: "openKeys / defaultOpenKeys", value: "string[]", description: "受控或非受控展开的 submenu key 列表。" },
  { name: "onOpenChange", value: "(openKeys) => void", description: "submenu 展开或收起时触发。" },
  { name: "mobileOverflow", value: "boolean", description: "默认 true。启用 c-menu__viewport 横向溢出控制和 data-overflowing hook。" },
  { name: "items[].href", value: "string", description: "叶子项可渲染为链接；内部通过 getSafeHref 过滤 javascript:/vbscript:/data: 等危险协议，选中安全链接时使用 aria-current。" },
  { name: "items[].linkProps", value: "AnchorHTMLAttributes", description: '链接项透传 target/rel 等属性；target="_blank" 会自动补 noopener noreferrer。' },
  { name: "items[].disabled", value: "boolean", description: "禁用项不可点击、不可键盘激活，并从 roving tabindex 中跳过。" },
  { name: "items[].children", value: "MenuNode[]", description: "submenu/group 的子节点。submenu 可展开，group 只做语义分组。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "nav.c-menu", description: "菜单作为导航地标，可通过 aria-label 命名。" },
  { name: "viewport", value: "div.c-menu__viewport", description: "移动端和窄容器横向滚动边界，不让页面产生横向溢出。" },
  { name: "list", value: 'ul[role="menu"]', description: "声明 menu 语义和 aria-orientation。" },
  { name: "item", value: 'button/a[role="menuitem"]', description: "叶子项使用原生 button 或安全链接，并提供 data-selected hook。" },
  { name: "submenu", value: "button + ul[role='menu']", description: "触发器使用 aria-haspopup、aria-expanded、aria-controls 关联子菜单。" },
  { name: "group", value: 'ul[role="group"]', description: "分组通过 aria-labelledby 关联可见组名。" },
  { name: "separator", value: 'li[role="separator"]', description: "只表达分隔，不进入焦点顺序。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "菜单根面和展开子菜单背景。" },
  { name: "surfaceSubtle", value: "#f7f7f5", description: "hover 和分组区域的轻量底色。" },
  { name: "text", value: "#1f1f1d", description: "选中项、标题和主要标签。" },
  { name: "textMuted", value: "#696967", description: "普通项、分组标签和辅助文本。" },
  { name: "border", value: "#dededb", description: "菜单外框、分隔线和子菜单边界。" },
  { name: "focus", value: "2px #555552", description: "键盘焦点环，与基础组件保持一致。" },
  {
    name: "主题 style",
    value: "--ct-surface-elevated / --ct-surface-hover / --ct-surface-selected",
    description: "菜单面、hover、selected、submenu shadow、separator 和 disabled 都读取 --ct-* token；亮/暗主题下选中态保持中性。",
  },
  {
    name: "结构 style",
    value: "nav / menu list / submenu / viewport scroll",
    description: "vertical/horizontal、group、submenu、depth padding、roving focus、viewport 横向滚动和 label ellipsis 属于结构样式。",
  },
];

const gapRows: DocRow[] = [
  { name: "multiple", value: "未覆盖", description: "当前 selectedKey 是单选模型，多选菜单需要独立 checked item 语义。" },
  { name: "inlineCollapsed", value: "未覆盖", description: "侧栏折叠只保留图标的体验需要 Layout/Sider 联动设计。" },
  { name: "virtual scroll", value: "未覆盖", description: "超大菜单和搜索过滤不属于本轮基础导航菜单范围。" },
  { name: "deep tree", value: "不建议", description: "超过两级层级应考虑 Tree、Cascader 或重新整理信息架构。" },
  { name: "Dropdown placement", value: "不覆盖", description: "触发器、portal、placement、click outside 等浮层行为由 Dropdown 文档承担。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖持久在线导航、分组、二级入口、当前项和禁用项；边界明确不与 Dropdown 合并。" },
  { name: "UI 专家", value: "PASS", description: "菜单使用近白表面、细边框和稳定 32px 行高；horizontal 示例在窄容器内横向滚动，不撑开页面。" },
  { name: "研发专家", value: "PASS", description: "实现为自有 React/TypeScript 组件，支持受控/非受控 selectedKey 与 openKeys，未引入 antd 系依赖。" },
  { name: "测试专家", value: "PASS", description: "验收覆盖 desktop、360/390/430 移动宽度、选择/展开、submenu、分组、disabled、键盘和一行示例布局。" },
  { name: "白帽专家", value: "PASS", description: "href 经过安全过滤，javascript:/data: 不会落到 anchor；target=_blank 自动补 rel；disabled 项不可触发。" },
];

const faqItems = [
  {
    question: "Menu 和 Dropdown 为什么不合并文档？",
    answer: "Menu 是持久在线导航结构，关注选中、层级和 roving tabindex；Dropdown 是触发器打开的临时浮层，焦点陷阱、定位和关闭策略不同。",
  },
  {
    question: "为什么不用 aria-selected？",
    answer: "role=\"menuitem\" 不使用 aria-selected。导航链接项用 aria-current=\"page\"，按钮项使用 data-selected 和样式表达当前状态。",
  },
  {
    question: "是否支持 AntD 的 inlineCollapsed、theme、multiple？",
    answer: "暂不支持。这一版覆盖基础导航菜单所需的方向、层级、分组、选择、禁用、键盘和移动溢出能力。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
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
              <td>{row.name}</td>
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

export function MenuDoc({ showAnchors = false }: MenuDocProps) {
  return (
    <TutorialScaffold
      component="Menu"
      kind="display"
      oneLineExample={`<Menu aria-label="Workspace" items={items} selectedKey="overview" onSelect={setSelectedKey} />`}
    >
      <section className="button-doc menu-doc" aria-labelledby="menu-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Menu 文档目录">
              {menuDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="menu-doc-title">{menuDocMeta.title}</h2>
              <p>
                用于组织站点导航、侧栏导航和分组操作。它是独立 Menu 组件，不复用或合并 Dropdown 文档，
                也不依赖 antd 系组件。
              </p>
            </header>

          <section className="button-doc-section" id="menu-purpose" aria-labelledby="menu-purpose-title">
            <h3 id="menu-purpose-title">组件目的</h3>
            <ul className="button-doc-list">
              <li>把稳定导航项、分组和二级入口组织成一个可扫描、可键盘操作的菜单结构。</li>
              <li>通过 selectedKey 表达当前页面或模块，通过 openKeys 表达 submenu 展开状态。</li>
              <li>在桌面和移动端复用同一语义结构，移动端只通过 viewport 处理横向溢出。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="menu-when" aria-labelledby="menu-when-title">
            <h3 id="menu-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要展示一组稳定导航项，并表达当前所在页面或模块时使用。</li>
              <li>存在二级导航、分组、分隔、禁用项，且需要键盘在菜单项间移动时使用。</li>
              <li>只有少量互斥内容面板时使用 Tabs；展示当前位置路径时使用 Breadcrumb。</li>
              <li>临时操作浮层、点击触发后自动关闭的场景应使用 Dropdown，而不是把 Menu 文档合并进去。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="menu-demos" aria-labelledby="menu-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="menu-demos-title">代码演示</h3>
              <p>覆盖 vertical、horizontal、items、groups、submenu、selected、disabled 和 mobile overflow。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="menu-api" aria-labelledby="menu-api-title">
            <h3 id="menu-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="menu-semantic" aria-labelledby="menu-semantic-title">
            <h3 id="menu-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="menu-token" aria-labelledby="menu-token-title">
            <h3 id="menu-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="menu-a11y" aria-labelledby="menu-a11y-title">
            <h3 id="menu-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>每个可用项参与 roving tabindex，disabled 和 separator 不进入焦点顺序。</li>
              <li>Vertical 使用 ArrowUp/ArrowDown；horizontal 根层使用 ArrowLeft/ArrowRight；Home/End 跳到边界项。</li>
              <li>Enter/Space 激活叶子项或切换 submenu，Escape 在子菜单中关闭并回到触发项。</li>
              <li>Submenu 触发器声明 aria-haspopup、aria-expanded 和 aria-controls。</li>
              <li>危险 href 不渲染为 anchor；外链 target="_blank" 会通过 getSafeLinkRel 补齐 noopener noreferrer。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="menu-composition" aria-labelledby="menu-composition-title">
            <h3 id="menu-composition-title">组合关系</h3>
            <ul className="button-doc-list">
              <li>Menu 可以放入 Layout.Sider 或 Header，作为持续导航结构。</li>
              <li>Menu 不负责弹层定位、点击外部关闭或触发器行为；这些属于 Dropdown 或 Popover。</li>
              <li>图标、Tag、Badge 可以作为 label 或 icon 组合，但应保持菜单项高度稳定。</li>
            </ul>
          </section>

          <section className="button-doc-section menu-doc-review" id="menu-review" aria-labelledby="menu-review-title">
            <h3 id="menu-review-title">角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="menu-gaps" aria-labelledby="menu-gaps-title">
            <h3 id="menu-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>

          <section className="button-doc-section" id="menu-faq" aria-labelledby="menu-faq-title">
            <h3 id="menu-faq-title">FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article key={item.question}>
                  <h4>{item.question}</h4>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
