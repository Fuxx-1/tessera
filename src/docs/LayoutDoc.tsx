import { useState, type ReactNode } from "react";
import { Button, Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutSider, Tag } from "../components/base";
import type { ComponentDocAnchor, ComponentDocMeta } from "./ButtonDoc";
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

export type LayoutDocProps = {
  showAnchors?: boolean;
};

export const layoutDocMeta = {
  title: "Layout 布局",
  category: "基础组件",
  anchors: [
    { id: "layout-when", label: "何时使用" },
    { id: "layout-demos", label: "代码演示" },
    { id: "layout-api", label: "API" },
    { id: "layout-responsive", label: "Responsive" },
    { id: "layout-semantic", label: "Semantic DOM" },
    { id: "layout-token", label: "Design Token" },
    { id: "layout-a11y", label: "Accessibility" },
  ] satisfies ComponentDocAnchor[],
} satisfies ComponentDocMeta;

const navItems = ["Home", "Docs", "Use"];

function ControlledCollapsiblePreview() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout
      aria-label="响应式可折叠布局示例"
      collapseAt="md"
      collapsed={collapsed}
      collapsible
      gap="sm"
      onCollapsedChange={setCollapsed}
      sidebar={
        <LayoutSider aria-label="筛选条件">
          <div className="layout-doc-filter-list">
            <Tag>owner</Tag>
            <Tag>status</Tag>
            <Tag>date</Tag>
          </div>
        </LayoutSider>
      }
      sidebarMinWidth={88}
      sidebarWidth={104}
      tone="plain"
    >
      <LayoutContent as="section" className="layout-doc-plain-content" aria-label="响应式主体">
        <strong>Responsive content</strong>
        <p>移动端堆叠为单列，长内容在主体内滚动，不被侧栏遮挡或挤爆。</p>
      </LayoutContent>
    </Layout>
  );
}

const demos: Demo[] = [
  {
    title: "基础页面骨架",
    description: "组合 Header、Sidebar、Content、Footer，形成常见后台或文档页面结构。",
    preview: (
      <Layout
        aria-label="基础页面骨架示例"
        sidebar={
          <LayoutSider aria-label="示例侧边导航">
            <nav className="layout-doc-sider-nav" aria-label="示例导航">
              {navItems.map((item) => (
                <a href="#layout-demos" key={item}>
                  {item}
                </a>
              ))}
            </nav>
          </LayoutSider>
        }
        sidebarMinWidth={88}
        sidebarWidth={96}
        tone="surface"
      >
        <LayoutHeader>
          <strong>Workspace</strong>
          <Button size="sm" variant="solid">
            New
          </Button>
        </LayoutHeader>
        <LayoutContent as="section" aria-label="示例主体任务">
          <div className="layout-doc-content-sample">
            <Tag tone="strong">Ready</Tag>
            <h4>Component review</h4>
            <p>内容区保留 main 语义，适合承载页面主体任务。</p>
          </div>
        </LayoutContent>
        <LayoutFooter>Updated just now</LayoutFooter>
      </Layout>
    ),
    code: `<Layout tone="surface" sidebar={<LayoutSider aria-label="侧边导航">...</LayoutSider>} sidebarWidth={96}><LayoutHeader>...</LayoutHeader><LayoutContent>...</LayoutContent><LayoutFooter>...</LayoutFooter></Layout>`,
  },
  {
    title: "右侧辅助栏",
    description: "sidebarPosition=\"end\" 用于详情、目录、属性面板等辅助信息，主内容仍在前。",
    preview: (
      <Layout
        aria-label="右侧辅助栏示例"
        sidebar={
          <LayoutSider aria-label="页面状态">
            <div className="layout-doc-aside-stack">
              <span>Status</span>
              <strong>Stable</strong>
              <Tag>compact</Tag>
            </div>
          </LayoutSider>
        }
        sidebarMinWidth={104}
        sidebarPosition="end"
        sidebarWidth="150px"
        tone="surface"
      >
        <LayoutHeader>
          <strong>Release notes</strong>
          <Tag tone="subtle">v0.1</Tag>
        </LayoutHeader>
        <LayoutContent as="section" aria-label="发布说明主体">
          <p className="layout-doc-muted">右侧栏不会改变 Content 的 main 语义，适合补充上下文。</p>
        </LayoutContent>
      </Layout>
    ),
    code: `<Layout tone="surface" sidebarPosition="end" sidebar={<LayoutSider aria-label="页面状态">...</LayoutSider>}><LayoutHeader>Release notes</LayoutHeader><LayoutContent>...</LayoutContent></Layout>`,
  },
  {
    title: "受控可折叠侧栏",
    description: "collapsible 提供按钮，collapsed 可受控；collapseAt=\"md\" 让窄屏侧栏堆叠到主内容上方。",
    preview: <ControlledCollapsiblePreview />,
    code: `<Layout collapsible collapsed={collapsed} onCollapsedChange={setCollapsed} collapseAt="md" sidebar={<LayoutSider aria-label="筛选条件">...</LayoutSider>}><LayoutContent>...</LayoutContent></Layout>`,
  },
];

const layoutApiRows: DocRow[] = [
  {
    name: "tone",
    value: '"plain" | "surface"',
    description: "布局承载面的视觉模式。plain 不加外框，surface 提供边框、白底和轻微阴影。",
  },
  {
    name: "sidebar",
    value: "ReactNode",
    description: "可选侧栏插槽。建议传入 LayoutSider，并提供 aria-label 或可见标题。",
  },
  {
    name: "hasSider",
    value: "boolean",
    description: "显式启用侧栏网格。默认根据 sidebar 是否存在推断，用于侧栏由子元素自行组合的场景。",
  },
  {
    name: "collapsible",
    value: "boolean",
    description: "启用侧栏折叠按钮。按钮自带 aria-expanded、aria-controls 和可访问名称。",
  },
  {
    name: "collapsed",
    value: "boolean",
    description: "受控折叠状态。传入后由 onCollapsedChange 回调驱动外部状态更新。",
  },
  {
    name: "defaultCollapsed",
    value: "boolean",
    description: "非受控初始折叠状态，适合无需外部同步的页面骨架。",
  },
  {
    name: "onCollapsedChange",
    value: "(collapsed: boolean) => void",
    description: "点击折叠按钮时触发。受控与非受控模式都会回调下一次状态。",
  },
  {
    name: "collapsedWidth",
    value: "number | string",
    description: "折叠后的侧栏轨道宽度，默认 56px，数字会转为 px。",
  },
  {
    name: "sidebarPosition",
    value: '"start" | "end"',
    description: "侧栏位置。start 为左侧/前置，end 为右侧/后置。默认 start。",
  },
  {
    name: "sidebarWidth",
    value: "number | string",
    description: "侧栏最大轨道宽度。数字会转成 px，也可传入 CSS 长度。",
  },
  {
    name: "sidebarMinWidth",
    value: "number | string",
    description: "侧栏最小轨道宽度，用于控制 minmax 下限。",
  },
  {
    name: "gap",
    value: '"none" | "sm" | "md" | "lg"',
    description: "主区域和侧栏之间的网格间距。surface 模式通常使用 none。",
  },
  {
    name: "responsive",
    value: "boolean",
    description: "是否启用内置折叠规则。默认 true。",
  },
  {
    name: "collapseAt",
    value: '"never" | "sm" | "md"',
    description: "响应式折叠断点。md 在 780px 以下折叠，sm 在 430px 以下折叠，never 不折叠。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLDivElement>",
    description: "Layout 根节点继承 div 属性，可传入 id、aria-label、data-* 和 style。",
  },
];

const regionApiRows: DocRow[] = [
  {
    name: "LayoutHeader",
    value: "header by default",
    description: "页头区域。可通过 as 覆盖标签，保留 className 和原生属性透传。",
  },
  {
    name: "LayoutSider",
    value: "aside by default",
    description: "侧栏区域。用于导航、筛选、目录或辅助元信息。",
  },
  {
    name: "LayoutContent",
    value: "main by default",
    description: "主体内容区域。默认渲染 main；在文档、弹层或嵌套示例中可通过 as 改为 section。",
  },
  {
    name: "LayoutFooter",
    value: "footer by default",
    description: "页脚区域。可用于版权、更新时间、次级状态或辅助链接。",
  },
];

const responsiveRows: DocRow[] = [
  {
    name: "md",
    value: "@media (max-width: 780px)",
    description: "默认折叠点。侧栏和主内容变为单列，侧栏边框转为底部分隔。",
  },
  {
    name: "sm",
    value: "@media (max-width: 430px)",
    description: "延迟折叠点。适合宽度较窄的目录或只含短标签的辅助栏。",
  },
  {
    name: "never",
    value: "no collapse class",
    description: "不启用内置折叠。只在调用方已经有外层容器查询或自定义断点时使用。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "--c-layout-sidebar-min-width",
    value: "190px",
    description: "侧栏轨道最小宽度，可由 sidebarMinWidth 覆盖。",
  },
  {
    name: "--c-layout-sidebar-width",
    value: "260px",
    description: "侧栏轨道最大宽度，可由 sidebarWidth 覆盖。",
  },
  {
    name: "border",
    value: "#dededb",
    description: "surface 外框、区域分隔线和折叠后的侧栏分隔。",
  },
  {
    name: "surface",
    value: "#ffffff",
    description: "surface 模式主承载面。",
  },
  {
    name: "surfaceSubtle",
    value: "#fbfbfa",
    description: "Header、Footer、Sidebar 默认背景。",
  },
  {
    name: "focusRing",
    value: "#555552",
    description: "Layout 区域内链接和按钮的键盘焦点轮廓。",
  },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-surface-muted / --ct-border / --ct-shadow-sm",
    description: "surface、header、footer、sider、toggle、border、weak shadow 和 focus ring 读取 --ct-* token，亮/暗主题下保持中性层级。",
  },
  {
    name: "结构 style",
    value: "grid tracks / sider slot / collapseAt",
    description: "侧栏轨道、折叠宽度、start/end、header/content/footer padding 和 sm/md 响应式堆叠都由结构 class 控制。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "定位为应用级页面骨架，只承载 Header、Sider、Content、Footer 边界，不合并 Grid、Flex、Space 或 Splitter。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "覆盖页头、侧栏、内容区、页脚、右侧辅助栏和响应式折叠，移动端堆叠后不重叠、不被侧栏撑破。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "SSR 无 window 依赖，响应式由 CSS 媒体查询完成；受控 collapsed、CSS 变量、min-width: 0 和插槽边界完整。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "覆盖 desktop 与 mobile 360/390/430，断言无页面级横向 overflow、无未定义文案、示例一行且独立。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "title、nav、children 均走 React 文本与节点插槽，不使用 dangerouslySetInnerHTML，依赖边界排除 antd 系列。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo layout-doc-demo">
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

export function LayoutDoc({ showAnchors = false }: LayoutDocProps) {
  return (
    <TutorialScaffold
      component="Layout"
      kind="display"
      oneLineExample={`<Layout sidebar={<LayoutSider>Nav</LayoutSider>}><LayoutContent>Content</LayoutContent></Layout>`}
    >
      <section className="button-doc layout-doc" aria-labelledby="layout-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Layout 文档目录">
              {layoutDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className={showAnchors ? "button-doc__content" : "button-doc__content layout-doc__content"}>
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="layout-doc-title">{layoutDocMeta.title}</h2>
              <p>
                用于搭建应用级页面骨架。Layout 负责网格、侧栏轨道和响应式折叠，Header、Sidebar、Content、Footer
                负责区域语义与稳定的视觉边界。
                五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认侧栏折叠、移动端单列、语义区域和安全依赖边界。
              </p>
            </header>

          <section className="button-doc-section" id="layout-when" aria-labelledby="layout-when-title">
            <h3 id="layout-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要长期存在的页头、侧栏、内容区和页脚结构时使用。</li>
              <li>需要在桌面端保留侧栏，在移动端自动堆叠为单列时使用。</li>
              <li>只需要局部卡片排布时优先使用 Grid、Flex 或 Space，不把 Layout 嵌成小卡片。</li>
              <li>白帽安全边界：实现为自有 React + CSS，不依赖 antd、antd-mobile 或 @ant-design/charts，也不解析 HTML 字符串。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="layout-demos" aria-labelledby="layout-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="layout-demos-title">代码演示</h3>
              <p>示例覆盖基础骨架、右侧辅助栏和响应式折叠。</p>
            </div>
            <div className="button-doc-demo-grid layout-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="layout-api" aria-labelledby="layout-api-title">
            <h3 id="layout-api-title">API</h3>
            <DataTable rows={layoutApiRows} />
            <DataTable rows={regionApiRows} />
          </section>

          <section className="button-doc-section" id="layout-responsive" aria-labelledby="layout-responsive-title">
            <h3 id="layout-responsive-title">Responsive</h3>
            <DataTable rows={responsiveRows} />
          </section>

          <section className="button-doc-section" id="layout-semantic" aria-labelledby="layout-semantic-title">
            <h3 id="layout-semantic-title">Semantic DOM</h3>
            <DataTable rows={regionApiRows} />
          </section>

          <section className="button-doc-section" id="layout-review" aria-labelledby="layout-review-title">
            <h3 id="layout-review-title">Production Review</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="layout-token" aria-labelledby="layout-token-title">
            <h3 id="layout-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="layout-a11y" aria-labelledby="layout-a11y-title">
            <h3 id="layout-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>当 Layout 根节点代表一个命名区域时，传入 aria-label 或 aria-labelledby。</li>
              <li>LayoutSider 默认是 aside，若承载导航，请在内部使用 nav 并提供可访问名称。</li>
              <li>LayoutContent 默认渲染 main，单个页面避免出现多个并列 main；文档示例可使用 as="section"。</li>
              <li>区域内链接和按钮继承键盘焦点轮廓，移动端折叠不改变 DOM 阅读顺序。</li>
            </ul>
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
