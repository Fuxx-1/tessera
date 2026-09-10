import { useState, type ReactNode } from "react";
import { Button } from "../components/base/Button";
import { Tabs } from "../components/base/Tabs";
import { TutorialScaffold } from "./TutorialScaffold";

type ComponentDocMeta = {
  id?: string;
  title: string;
  category?: string;
  description?: string;
  anchors: Array<{
    id: string;
    label: string;
  }>;
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

export type TabsDocProps = {
  showAnchors?: boolean;
};

const noop = () => {};
const oneLineExample = `<Tabs items={items} defaultValue="overview" />`;

export const tabsDocMeta = {
  title: "Tabs 标签页",
  category: "基础组件",
  anchors: [
    { id: "tabs-when", label: "何时使用" },
    { id: "tabs-demos", label: "代码演示" },
    { id: "tabs-api", label: "API" },
    { id: "tabs-semantic", label: "Semantic DOM" },
    { id: "tabs-token", label: "Design Token" },
    { id: "tabs-a11y", label: "Accessibility" },
    { id: "tabs-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const baseItems = [
  {
    id: "overview",
    label: "Overview",
    content: <p>Tabs group peer panels behind one compact navigation surface.</p>,
  },
  {
    id: "activity",
    label: "Activity",
    content: <p>The selected panel stays linked to its tab through aria-controls and aria-labelledby.</p>,
  },
  {
    id: "settings",
    label: "Settings",
    content: <p>Arrow keys, Home, and End move between enabled tabs.</p>,
  },
];

function ControlledTabsDemo() {
  const [value, setValue] = useState("usage");

  return (
    <div className="tabs-doc-controlled">
      <Tabs
        aria-label="Controlled Tabs demo"
        items={[
          { id: "usage", label: "Usage", content: <p>Controlled Tabs read active state from value.</p> },
          { id: "api", label: "API", content: <p>onValueChange is the only callback needed to mirror state.</p> },
          { id: "audit", label: "Audit", content: <p>External controls can safely switch tabs without remounting the list.</p> },
        ]}
        onValueChange={setValue}
        value={value}
      />
      <div className="doc-demo-row" aria-label="外部切换标签">
        <Button size="sm" variant={value === "usage" ? "solid" : "ghost"} onClick={() => setValue("usage")}>
          Usage
        </Button>
        <Button size="sm" variant={value === "api" ? "solid" : "ghost"} onClick={() => setValue("api")}>
          API
        </Button>
      </div>
    </div>
  );
}

function ControlledFallbackTabsDemo() {
  return (
    <Tabs
      aria-label="Controlled fallback Tabs demo"
      items={[
        { id: "ready", label: "Ready", content: <p>Disabled controlled values fall back to the first enabled tab.</p> },
        { id: "blocked", label: "Blocked", disabled: true, content: <p>This disabled panel is never selected.</p> },
      ]}
      onValueChange={noop}
      value="blocked"
    />
  );
}

const demos: Demo[] = [
  {
    title: "非受控标签页",
    description: "defaultValue 只负责初始选择；之后由组件内部维护 active tab。",
    preview: <Tabs aria-label="Uncontrolled Tabs demo" defaultValue="activity" items={baseItems} />,
    code: `<Tabs aria-label="Section switcher" defaultValue="activity" items={[{ id: "overview", label: "Overview", content: <p>...</p> }, { id: "activity", label: "Activity", content: <p>...</p> }, { id: "settings", label: "Settings", content: <p>...</p> }]} />`,
  },
  {
    title: "受控标签页",
    description: "value 和 onValueChange 适合路由、表单步骤、外部按钮同步的场景。",
    preview: <ControlledTabsDemo />,
    code: `const [value, setValue] = useState("usage"); <Tabs aria-label="Controlled Tabs demo" value={value} onValueChange={setValue} items={items} />`,
  },
  {
    title: "禁用项",
    description: "禁用标签不会参与箭头键移动，也不会成为默认 fallback。",
    preview: (
      <Tabs
        aria-label="Disabled tab demo"
        items={[
          { id: "stable", label: "Stable", content: <p>Enabled tabs keep keyboard focus predictable.</p> },
          { id: "locked", label: "Locked", disabled: true, content: <p>This panel is not selectable.</p> },
          { id: "next", label: "Next", content: <p>Arrow keys skip disabled tabs.</p> },
        ]}
      />
    ),
    code: `<Tabs aria-label="Release tabs" items={[{ id: "stable", label: "Stable", content: <p>...</p> }, { id: "locked", label: "Locked", disabled: true, content: <p>...</p> }, { id: "next", label: "Next", content: <p>...</p> }]} />`,
  },
  {
    title: "受控回退",
    description: "value 指向 disabled 或缺失项时，视觉与语义都回退到第一个可用标签。",
    preview: <ControlledFallbackTabsDemo />,
    code: `<Tabs aria-label="Controlled fallback Tabs demo" value="blocked" onValueChange={setValue} items={items} />`,
  },
  {
    title: "移动横向滚动",
    description: "tablist 保持单行横滚，长标签不会挤压 panel 或造成页面整体横向溢出。",
    preview: (
      <div className="tabs-doc-mobile-frame">
        <Tabs
          aria-label="Mobile horizontal Tabs demo"
          items={[
            { id: "summary", label: "Summary", content: <p>Compact panel copy remains readable.</p> },
            { id: "deployments", label: "Deployments", content: <p>Longer labels scroll inside the list.</p> },
            { id: "incidents", label: "Incidents", content: <p>The surrounding layout keeps its width.</p> },
            { id: "permissions", label: "Permissions", content: <p>Focus styles stay visible while scrolling.</p> },
            { id: "automation", label: "Automation", content: <p>Touch and keyboard behavior share one structure.</p> },
          ]}
        />
      </div>
    ),
    code: `.c-tabs__list { display: inline-flex; max-width: 100%; overflow-x: auto; white-space: nowrap; }`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "items",
    value: "TabItem[]",
    description: "标签与面板配置。每项包含 id、label、content，可选 disabled。",
  },
  {
    name: "value",
    value: "string",
    description: "受控激活项。若指向缺失或 disabled 项，界面回退展示第一个可用 tab。",
  },
  {
    name: "defaultValue",
    value: "string",
    description: "非受控初始激活项。缺省时选择第一个非 disabled 项。",
  },
  {
    name: "onValueChange",
    value: "(value: string) => void",
    description: "用户点击或键盘切换到新标签时触发。",
  },
  {
    name: "aria-label / aria-labelledby",
    value: "string",
    description: "为 tablist 提供可访问名称。没有可见标题时应传 aria-label。",
  },
  {
    name: "id",
    value: "string",
    description: "用于生成 tab 和 tabpanel 的稳定 id。未传时使用 React useId。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-tabs",
    description: "负责布局，不承载交互语义。",
  },
  {
    name: "list",
    value: 'div[role="tablist"]',
    description: "承载同级 tab。支持 aria-label 或 aria-labelledby。",
  },
  {
    name: "tab",
    value: 'button[role="tab"]',
    description: "原生 button 提供点击、禁用和焦点能力，并声明 aria-selected、aria-controls。",
  },
  {
    name: "panel",
    value: 'div[role="tabpanel"]',
    description: "当前面板通过 aria-labelledby 回连激活 tab，并可被键盘聚焦。",
  },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "选中标签和面板所在的主承载面。" },
  { name: "surfaceSubtle", value: "#f0f0ee", description: "tablist 背景，帮助 tab 成组。" },
  { name: "text", value: "#1f1f1d", description: "选中标签和面板正文。" },
  { name: "textMuted", value: "#696967", description: "未选中标签文字。" },
  { name: "border", value: "#dededb", description: "tablist 和文档表格边界。" },
  { name: "focus", value: "2px #1f1f1d", description: "键盘焦点环，和其他基础组件保持一致。" },
  {
    name: "主题 style",
    value: "--ct-surface-sunken / --ct-surface-selected / --ct-focus-ring",
    description: "tablist、selected tab、hover、disabled、panel 和 focus ring 读取 --ct-* token；亮/暗主题下选中态保持中性。",
  },
  {
    name: "结构 style",
    value: "tablist / tab / panel / horizontal scroll",
    description: "roving focus、aria-controls、panel id、disabled、lazy/keepMounted 和移动端横向滚动属于结构样式。",
  },
];

const faqItems = [
  {
    question: "Tabs 会不会像路由一样卸载所有未选中内容？",
    answer: "不会。当前组件会渲染所有 panel，并用 hidden 隐藏未选中内容，因此面板内的本地状态会保留。",
  },
  {
    question: "是否支持 editable-card、card、line 等 AntD 类型？",
    answer: "暂不支持。这一版聚焦稳定 tablist、受控模型、可访问关联和移动横滚，不提供 AntD 样式模式映射。",
  },
  {
    question: "为什么箭头键会直接切换而不只移动焦点？",
    answer: "Tabs 采用自动激活模式，适合本组件当前的轻量内容面板。若未来面板切换成本变高，可增加 manual activation 模式。",
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

export function TabsDoc({ showAnchors = false }: TabsDocProps) {
  return (
    <TutorialScaffold component="Tabs" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc" aria-labelledby="tabs-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Tabs 文档目录">
            {tabsDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tabs-doc-title">{tabsDocMeta.title}</h2>
            <p>
              用于在同级内容面板之间切换。当前 Tabs 采用自有中性视觉，核心验收集中在{" "}
              <code>tablist</code> / <code>tab</code> / <code>tabpanel</code> 语义、受控与非受控模型、键盘导航和移动横向滚动。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；安全边界确认 tab id 会做 DOM id 归一化，内容仍由 React 节点安全渲染。
            </p>
          </header>

          <section className="button-doc-section" id="tabs-when" aria-labelledby="tabs-when-title">
            <h3 id="tabs-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于同一上下文下互斥展示的平级内容，例如详情、活动、设置。</li>
              <li>少量标签适合 Tabs；需要跳转页面、层级导航或大规模菜单时不使用 Tabs。</li>
              <li>移动端标签较多时允许 tablist 自身横向滚动，页面主体不应横向溢出。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tabs-demos" aria-labelledby="tabs-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tabs-demos-title">代码演示</h3>
              <p>示例覆盖非受控、受控、禁用项、受控回退和移动横滚五个生产入口。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="tabs-api" aria-labelledby="tabs-api-title">
            <h3 id="tabs-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="tabs-semantic" aria-labelledby="tabs-semantic-title">
            <h3 id="tabs-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="tabs-token" aria-labelledby="tabs-token-title">
            <h3 id="tabs-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="tabs-a11y" aria-labelledby="tabs-a11y-title">
            <h3 id="tabs-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>Tab 键进入当前选中 tab，ArrowLeft / ArrowRight 在可用标签间移动并激活。</li>
              <li>Home / End 直接跳到第一个或最后一个可用 tab。</li>
              <li>每个 tab 通过 aria-controls 指向对应 panel，当前 panel 通过 aria-labelledby 回指 tab。</li>
              <li>禁用 tab 使用 disabled 和 aria-disabled，并从 roving focus 中排除。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tabs-faq" aria-labelledby="tabs-faq-title">
            <h3 id="tabs-faq-title">FAQ / 安全</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article className="button-doc-faq__item" key={item.question}>
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
