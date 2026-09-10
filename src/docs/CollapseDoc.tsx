import { useState, type ReactNode } from "react";
import { Button, Collapse, Tag } from "../components/base";
import type { CollapseActiveKey } from "../components/base";
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

export type CollapseDocProps = {
  showAnchors?: boolean;
};

export const collapseDocMeta = {
  title: "Collapse 折叠面板",
  category: "基础组件",
  anchors: [
    { id: "collapse-when", label: "何时使用" },
    { id: "collapse-demos", label: "代码演示" },
    { id: "collapse-api", label: "API" },
    { id: "collapse-semantic", label: "Semantic DOM" },
    { id: "collapse-token", label: "Design Token" },
    { id: "collapse-a11y", label: "Accessibility" },
    { id: "collapse-mobile", label: "Mobile" },
    { id: "collapse-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const releaseItems = [
  {
    key: "scope",
    header: "Scope and ownership",
    extra: <Tag size="sm">Base</Tag>,
    children: (
      <p>
        Collapse owns disclosure state and accessible wiring. Content rendering remains caller-owned, so nested forms,
        lists, and custom copy keep their native semantics.
      </p>
    ),
  },
  {
    key: "keyboard",
    header: "Keyboard contract",
    extra: <Tag size="sm" tone="success">Ready</Tag>,
    children: <p>Enter and Space follow native button behavior. ArrowUp, ArrowDown, Home, and End move between enabled headers.</p>,
  },
  {
    key: "locked",
    header: "Locked audit trail",
    disabled: true,
    extra: <Tag size="sm" tone="neutral">Disabled</Tag>,
    children: <p>Disabled panels cannot be opened by pointer or keyboard interaction.</p>,
  },
];

function ControlledCollapseDemo() {
  const [activeKey, setActiveKey] = useState<CollapseActiveKey>("design");

  return (
    <div className="collapse-doc-controlled">
      <Collapse
        aria-label="Controlled single Collapse demo"
        activeKey={activeKey}
        mode="single"
        onActiveKeyChange={setActiveKey}
        items={[
          {
            key: "design",
            header: "Design review",
            extra: <Tag size="sm">UI</Tag>,
            children: <p>Single mode keeps one visible answer in dense review surfaces.</p>,
          },
          {
            key: "qa",
            header: "QA review",
            extra: <Tag size="sm" tone="success">Test</Tag>,
            children: <p>External state can drive open panels from route, filters, or checklist controls.</p>,
          },
          {
            key: "security",
            header: "Security review",
            extra: <Tag size="sm" tone="warning">Whitehat</Tag>,
            children: <p>Panel content is React children; Collapse never parses HTML strings.</p>,
          },
        ]}
      />
      <div className="doc-demo-row" aria-label="外部控制折叠项">
        <Button size="sm" variant={activeKey === "design" ? "solid" : "ghost"} onClick={() => setActiveKey("design")}>
          Design
        </Button>
        <Button size="sm" variant={activeKey === "qa" ? "solid" : "ghost"} onClick={() => setActiveKey("qa")}>
          QA
        </Button>
      </div>
    </div>
  );
}

function NestedCollapseDemo() {
  return (
    <Collapse
      aria-label="Nested Collapse demo"
      defaultActiveKey={["parent"]}
      items={[
        {
          key: "parent",
          header: "Parent panel",
          extra: <Tag size="sm">Nested safe</Tag>,
          children: (
            <div className="doc-demo-stack">
              <p>Nested panels keep their own border and spacing without merging with the parent surface.</p>
              <Collapse
                aria-label="Inner Collapse demo"
                defaultActiveKey="inner-a"
                mode="single"
                items={[
                  { key: "inner-a", header: "Inner details", children: <p>Inner content stays visually scoped.</p> },
                  { key: "inner-b", header: "Inner notes", children: <p>Header buttons remain full-width touch targets.</p> },
                ]}
              />
            </div>
          ),
        },
        {
          key: "summary",
          header: "Sibling panel",
          children: <p>Sibling panels preserve the same disclosure contract as the top level.</p>,
        },
      ]}
    />
  );
}

const demos: Demo[] = [
  {
    title: "One-line smoke",
    description: "单行样例用于快速验收：single、disabled、extra 和安全文案同屏可见。",
    preview: (
      <div className="collapse-doc-one-line" aria-label="Collapse single row acceptance example">
        <Collapse
          aria-label="One-line Collapse smoke"
          mode="single"
          defaultActiveKey="ready"
          items={[
            { key: "ready", header: "One-line release gate", extra: <Tag size="sm" tone="success">aria-expanded</Tag>, children: <p>Enter, Space, Arrow keys, reduced motion, mobile wrap, no antd.</p> },
            { key: "disabled", header: "Disabled archived gate", disabled: true, extra: <Tag size="sm" tone="neutral">disabled</Tag>, children: <p>Disabled content remains unreachable.</p> },
          ]}
        />
      </div>
    ),
    code: `<Collapse mode="single" defaultActiveKey="ready" items={[{ key: "ready", header: "One-line release gate", children: <p>Enter, Space, Arrow keys, reduced motion, mobile wrap, no antd.</p> }, { key: "disabled", header: "Disabled archived gate", disabled: true, children: <p>Disabled content remains unreachable.</p> }]} />`,
  },
  {
    title: "Multiple active",
    description: "默认 multiple 模式允许同时展开多个信息分组，适合设置页和审计说明。",
    preview: <Collapse aria-label="Multiple Collapse demo" defaultActiveKey={["scope", "keyboard"]} items={releaseItems} />,
    code: `<Collapse
  aria-label="Release checklist"
  defaultActiveKey={["scope", "keyboard"]}
  items={[
    { key: "scope", header: "Scope and ownership", extra: <Tag>Base</Tag>, children: <p>...</p> },
    { key: "keyboard", header: "Keyboard contract", children: <p>...</p> },
    { key: "locked", header: "Locked audit trail", disabled: true, children: <p>...</p> },
  ]}
/>`,
  },
  {
    title: "Controlled single",
    description: "single 模式与 activeKey/onActiveKeyChange 配合，适合路由、外部按钮或表单状态同步。",
    preview: <ControlledCollapseDemo />,
    code: `const [activeKey, setActiveKey] = useState<CollapseActiveKey>("design");

<Collapse
  mode="single"
  activeKey={activeKey}
  onActiveKeyChange={setActiveKey}
  items={items}
/>`,
  },
  {
    title: "Header extra and disabled",
    description: "extra 跟随 header 右侧显示；disabled 项保留可读状态但退出交互。",
    preview: (
      <Collapse
        aria-label="Status Collapse demo"
        defaultActiveKey="live"
        mode="single"
        items={[
          { key: "live", header: "Live migration", extra: <Tag size="sm" tone="success">Live</Tag>, children: <p>Traffic is draining safely.</p> },
          { key: "queued", header: "Queued checks", extra: <Tag size="sm">3 items</Tag>, children: <p>Checks wait for operator review.</p> },
          { key: "disabled", header: "Archived batch", disabled: true, extra: <Tag size="sm" tone="neutral">Closed</Tag>, children: <p>Archived.</p> },
        ]}
      />
    ),
    code: `<Collapse
  mode="single"
  items={[
    { key: "live", header: "Live migration", extra: <Tag>Live</Tag>, children: <p>...</p> },
    { key: "disabled", header: "Archived batch", disabled: true, extra: <Tag>Closed</Tag>, children: <p>...</p> },
  ]}
/>`,
  },
  {
    title: "Nested safe styling",
    description: "嵌套 Collapse 保持独立边界、缩进和触控尺寸，避免父子面板视觉粘连。",
    preview: <NestedCollapseDemo />,
    code: `<Collapse
  defaultActiveKey={["parent"]}
  items={[
    {
      key: "parent",
      header: "Parent panel",
      children: <Collapse mode="single" items={innerItems} />,
    },
  ]}
/>`,
  },
  {
    title: "Long content wrapping",
    description: "长标题、长 URL 和命令片段会在面板内换行，移动端不产生横向滚动。",
    preview: (
      <Collapse
        aria-label="Long content Collapse demo"
        defaultActiveKey="long"
        items={[
          {
            key: "long",
            header: "Very long operational incident title with release-candidate-2026-06-07-build-5177-and-mobile-wrap-check",
            extra: <Tag size="sm">Long text</Tag>,
            children: (
              <div className="doc-demo-stack">
                <p>
                  https://internal.example.test/releases/collapse/acceptance/mobile/375/390/very-long-path-without-natural-breaks
                </p>
                <p>
                  rtk bun run acceptance -- --component=collapse --viewport=mobile-375 --verify-long-content-wrapping
                </p>
              </div>
            ),
          },
          {
            key: "closed",
            header: "Closed item with a compact summary",
            children: <p>Collapsed content stays out of keyboard reach until opened.</p>,
          },
        ]}
      />
    ),
    code: `<Collapse
  defaultActiveKey="long"
  items={[
    {
      key: "long",
      header: "Very long operational incident title with release-candidate-2026-06-07-build-5177-and-mobile-wrap-check",
      children: <p>https://internal.example.test/releases/collapse/acceptance/mobile/375/390/very-long-path-without-natural-breaks</p>,
    },
  ]}
/>`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "CollapseItem[]", description: "面板配置。每项包含 key、header、children，可选 disabled 和 extra。" },
  { name: "mode", value: '"single" | "multiple"', description: "single 最多展开一个面板；multiple 可同时展开多个面板。默认 multiple。" },
  { name: "activeKey", value: "string | string[]", description: "受控展开项。single 推荐 string，multiple 推荐 string[]；组件会按 mode 归一化。" },
  { name: "defaultActiveKey", value: "string | string[]", description: "非受控初始展开项。缺省时会展开第一个可用项。" },
  { name: "onActiveKeyChange", value: "(activeKey) => void", description: "用户切换后触发。返回值形态与 mode 对齐。" },
  { name: "aria-label / aria-labelledby", value: "string", description: "为折叠组提供可访问名称，尤其是没有可见标题的组合区域。" },
  { name: "id", value: "string", description: "用于生成 trigger/panel 关联 id；未传时使用 React useId。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-collapse", description: "承载折叠组和 mode 数据，不伪装成导航或 tablist。" },
  { name: "item", value: "section.c-collapse__item", description: "每个面板是独立内容区块，便于嵌套和扫描。" },
  { name: "header", value: "h3 > button", description: "标题使用原生 button disclosure；声明 aria-expanded 和 aria-controls。" },
  { name: "panel", value: 'div[role="region"]', description: "展开时通过 aria-labelledby 回指 header button；收起过渡中使用 aria-hidden/inert，动画结束后 hidden。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "面板主体背景。" },
  { name: "surfaceSubtle", value: "#fbfbfa", description: "header hover 和 nested 容器背景。" },
  { name: "border", value: "#dededb / #ececea", description: "根边界与面板分隔线。" },
  { name: "textMuted", value: "#696967", description: "extra、辅助说明和收起态细节。" },
  { name: "focus", value: "2px #1f1f1d", description: "header button 键盘焦点环。" },
  { name: "motion", value: "180ms ease", description: "panel 高度网格与透明度过渡，收起后再进入 hidden 状态。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "Collapse 用于同页内容显隐，不承担导航、步骤推进或表单校验职责。" },
  { name: "UI", value: "通过", description: "中性列表视觉、8px 以内圆角、extra 右对齐，移动端长标题可换行。" },
  { name: "研发", value: "通过", description: "独立组件；支持 single/multiple、controlled/uncontrolled、disabled、header extra 和嵌套。" },
  { name: "测试", value: "通过", description: "验收覆盖 desktop 与 mobile 360/390/430：点击、Enter/Space 原生触发、Arrow/Home/End 焦点移动、开合动画和无横溢出。" },
  { name: "白帽", value: "通过", description: "不引入 antd、antd-mobile、@ant-design/charts，不解析 HTML 字符串，不使用 dangerouslySetInnerHTML；内容安全边界交给 React children。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo collapse-doc-demo">
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

export function CollapseDoc({ showAnchors = false }: CollapseDocProps) {
  return (
    <TutorialScaffold component="Collapse" kind="display" oneLineExample={`<Collapse items={[{ key: "api", title: "API", children: "Stable" }]} />`}>
    <section className="button-doc collapse-doc" aria-labelledby="collapse-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Collapse 文档目录">
            {collapseDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="collapse-doc-title">{collapseDocMeta.title}</h2>
            <p>
              用于在当前页面内展开或收起成组内容。Collapse 是独立基础组件，不与 Accordion 或 Panel 文档合并，
              不依赖 antd、antd-mobile 或 @ant-design/charts；验收重点是 disclosure aria、受控模型、嵌套样式和移动端可读性。
            </p>
          </header>

          <section className="button-doc-section" id="collapse-when" aria-labelledby="collapse-when-title">
            <h3 id="collapse-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于折叠较长说明、配置分组、审计详情或 FAQ 型内容。</li>
              <li>需要互斥展开时使用 single；需要多段并排查看时使用 multiple。</li>
              <li>需要页面跳转、同级视图切换或步骤流程时不使用 Collapse。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="collapse-demos" aria-labelledby="collapse-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="collapse-demos-title">代码演示</h3>
              <p>示例覆盖 single/multiple、受控/非受控、disabled、header extra、嵌套和移动约束。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="collapse-api" aria-labelledby="collapse-api-title">
            <h3 id="collapse-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="collapse-semantic" aria-labelledby="collapse-semantic-title">
            <h3 id="collapse-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="collapse-token" aria-labelledby="collapse-token-title">
            <h3 id="collapse-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="collapse-a11y" aria-labelledby="collapse-a11y-title">
            <h3 id="collapse-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>Header 使用原生 button，因此点击、Enter 和 Space 都走浏览器默认交互。</li>
              <li>每个 button 声明 aria-expanded 和 aria-controls，panel 展开后通过 aria-labelledby 回指 header。</li>
              <li>ArrowUp / ArrowDown 在可用 header 间移动焦点，Home / End 直达第一个或最后一个可用 header。</li>
              <li>disabled 项使用 disabled 与 aria-disabled，并从焦点移动序列中排除。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="collapse-mobile" aria-labelledby="collapse-mobile-title">
            <h3 id="collapse-mobile-title">Mobile</h3>
            <ul className="button-doc-list">
              <li>Header 最小触控高度为 44px，extra 在窄屏可换行，不挤压标题。</li>
              <li>正文使用 overflow-wrap，长 URL、状态码和命令片段不会撑出视口。</li>
              <li>嵌套 Collapse 增加内边距与浅色背景，父子层级在 360px 宽度下仍可辨认。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="collapse-review" aria-labelledby="collapse-review-title">
            <div className="button-doc-section__heading">
              <h3 id="collapse-review-title">五专家结论</h3>
              <p>组件专项评审记录：产品、UI、研发、测试、白帽均围绕独立 Collapse 边界验收。</p>
            </div>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
