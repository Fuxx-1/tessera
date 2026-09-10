import { useRef, useState, type ReactNode } from "react";
import { Anchor, ConfigProvider } from "../components/base";
import type { AnchorItem } from "../components/base";
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

export type AnchorDocProps = {
  showAnchors?: boolean;
};

export const anchorDocMeta = {
  title: "Anchor 锚点",
  category: "基础组件",
  anchors: [
    { id: "anchor-purpose", label: "组件定位" },
    { id: "anchor-demos", label: "代码演示" },
    { id: "anchor-api", label: "API" },
    { id: "anchor-aria", label: "ARIA" },
    { id: "anchor-style", label: "主题与结构 style" },
    { id: "anchor-mobile", label: "移动端" },
    { id: "anchor-review", label: "五专家审查" },
  ],
} satisfies ComponentDocMeta;

const demoItems: AnchorItem[] = [
  { href: "#anchor-demo-intro", label: "Overview", title: "Overview" },
  {
    href: "#anchor-demo-usage",
    label: "Usage",
    title: "Usage",
    children: [
      {
        href: "#anchor-demo-offset",
        label: "Offset and smooth",
        children: [{ href: "#anchor-demo-deep-nested", label: "Deep nested release gate with a very long title" }],
      },
      { href: "#anchor-demo-disabled", label: "Disabled item", disabled: true },
    ],
  },
  { href: "#anchor-demo-api", label: "API", title: "API" },
];

const longTitleItem: AnchorItem = {
  href: "#anchor-demo-long-title",
  label: "Quarterly governance release checklist with a deliberately long heading",
  title: "Quarterly governance release checklist with a deliberately long heading",
};

const longDocumentItems: AnchorItem[] = [
  { href: "#anchor-long-overview", label: "Overview" },
  { href: "#anchor-long-setup", label: "Setup" },
  { href: "#anchor-long-operations", label: "Operations" },
  { href: "#anchor-long-security", label: "Security" },
  { href: "#anchor-long-release", label: "Release" },
];

const containerItems: AnchorItem[] = [
  { href: "#anchor-container-overview", label: "Overview" },
  { href: "#anchor-container-setup", label: "Setup" },
  { href: "#anchor-container-review", label: "Review" },
  { href: "#anchor-container-release", label: "Release" },
];

const demos: Demo[] = [
  {
    title: "一行配置",
    description: "最小用法只需要 items；每个 href 必须指向当前页内已经存在的章节 id。",
    preview: <Anchor current="#anchor-demo-intro" items={[...demoItems.slice(0, 3), longTitleItem]} />,
    code: `<Anchor items={[{ href: "#anchor-demo-intro", label: "Overview" }]} />`,
  },
  {
    title: "受控当前位置",
    description: "current 接收当前 hash，组件用 aria-current=\"location\" 标记所在章节。",
    preview: <ControlledAnchorDemo />,
    code: `const [current, setCurrent] = useState("#anchor-demo-usage"); <Anchor current={current} items={items} onChange={(href) => setCurrent(href)} />`,
  },
  {
    title: "偏移与平滑滚动",
    description: "offset 为固定顶栏预留空间；smooth=false 可改为即时跳转，也会尊重 reduced motion。",
    preview: <Anchor items={demoItems} current="#anchor-demo-offset" offset={72} smooth={false} />,
    code: `<Anchor current="#anchor-demo-offset" items={items} offset={72} smooth={false} />`,
  },
  {
    title: "禁用整组导航",
    description: "disabled 会让所有条目变成静态文本，保留层级但不会触发跳转。",
    preview: <Anchor disabled items={demoItems} current="#anchor-demo-api" />,
    code: `<Anchor disabled current="#anchor-demo-api" items={items} />`,
  },
  {
    title: "过滤危险 href",
    description: "仅允许同页 fragment。外链、路径、协议和空 hash 会作为禁用项渲染，不读取危险 URL。",
    preview: (
      <Anchor
        current="#anchor-safe"
        items={[
          { href: "#anchor-safe", label: "Safe fragment" },
          { href: "https://example.com", label: "Rejected absolute URL" },
          { href: "javascript:alert(1)", label: "Rejected script URL" },
          { href: "#encoded%2fpath", label: "Rejected encoded path" },
          { href: "#", label: "Rejected empty hash" },
        ]}
      />
    ),
    code: `<Anchor items={[{ href: "#anchor-safe", label: "Safe fragment" }, { href: "https://example.com", label: "Rejected absolute URL" }, { href: "javascript:alert(1)", label: "Rejected script URL" }, { href: "#encoded%2fpath", label: "Rejected encoded path" }, { href: "#", label: "Rejected empty hash" }]} />`,
  },
  {
    title: "长文档滚动定位",
    description: "非受控 Anchor 会随页面滚动更新当前项，点击链接会同步 hash 并把焦点留在可继续键盘操作的位置。",
    preview: <LongDocumentAnchorDemo />,
    code: `<Anchor aria-label="Long document sections" items={longDocumentItems} offset={16} smooth={false} />`,
  },
  {
    title: "局部滚动容器",
    description: "scrollContainer 可绑定弹层、侧栏或内容面板，点击与 active 都按容器顶部计算，不依赖 window 滚动。",
    preview: <ScrollContainerAnchorDemo />,
    code: `const containerRef = useRef<HTMLDivElement>(null); <Anchor items={items} offset={12} scrollContainer={() => containerRef.current} />`,
  },
  {
    title: "暗色配置",
    description: "位于 ConfigProvider 暗色边界内时，文本、边框和 active 背景跟随 token 保持可读。",
    preview: (
      <ConfigProvider className="anchor-doc-dark-surface" theme="dark">
        <Anchor current="#anchor-demo-usage" items={demoItems} />
      </ConfigProvider>
    ),
    code: `<ConfigProvider theme="dark"><Anchor current="#anchor-demo-usage" items={items} /></ConfigProvider>`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "AnchorItem[]", description: "必填。按顺序渲染锚点，可通过 children 表达二级目录。" },
  { name: "items[].href", value: "string", description: "必填。仅接受 #section-id 形式的同页 fragment。" },
  { name: "items[].label", value: "ReactNode", description: "锚点文本，建议短句，不放复杂交互控件。" },
  { name: "items[].children", value: "AnchorItem[]", description: "可选。渲染缩进层级，不改变语义列表结构。" },
  { name: "items[].disabled", value: "boolean", description: "可选。禁用单个锚点，渲染为 aria-disabled 静态文本。" },
  { name: "current", value: "string", description: "可选。受控当前 hash；未提供时从 window.location.hash 初始化并监听 hashchange。" },
  { name: "onChange", value: "(href, item) => void", description: "可选。点击安全锚点后回调，适合同步外部状态。" },
  { name: "offset", value: "number", description: "可选。滚动定位时从目标顶部扣除的像素值，默认 0。" },
  { name: "scrollContainer", value: "HTMLElement | Window | () => HTMLElement | Window | null", description: "可选。默认 window；用于局部滚动面板。" },
  { name: "smooth", value: "boolean", description: "可选。默认 true；用户偏好 reduced motion 时自动使用即时滚动。" },
  { name: "disabled", value: "boolean", description: "可选。禁用整组 Anchor。" },
  { name: "mobileStickyFallback", value: "boolean", description: "可选。默认 true，窄屏下切换为顶部吸附横向导航。" },
  { name: "aria-label", value: "string", description: "可选。默认 Anchor navigation，命名 nav 地标。" },
];

const ariaRows: DocRow[] = [
  { name: "nav", value: "aria-label", description: "根节点是导航地标，便于读屏快速定位页内目录。" },
  { name: "ol/li", value: "ordered list", description: "保留章节顺序，嵌套项以缩进表达而不是伪装成菜单。" },
  { name: "current", value: 'aria-current="location"', description: "当前位置标记在安全链接或静态当前项上。" },
  { name: "disabled", value: 'aria-disabled="true"', description: "禁用项和被过滤的危险 href 不生成可点击链接。" },
  { name: "status", value: "sr-only text", description: "隐藏文本同步当前锚点，辅助技术可获得当前位置反馈。" },
];

const styleRows: DocRow[] = [
  {
    name: "主题 style",
    value: "--ct-surface / --ct-border / --ct-surface-hover",
    description: "文本、竖线、current 指示、hover 背景、disabled 和暗色示例都读取 --ct-* 或 ConfigProvider token，选中态保持中性。",
  },
  {
    name: "结构 style",
    value: "nav ol/li / depth padding / mobile sticky",
    description: "层级缩进、active indicator、scrollContainer、offset、long-title ellipsis 和移动端横向 sticky fallback 都是结构样式。",
  },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "定位为长文档页内导航，不与 Breadcrumb 的层级路径或 Menu 的站点导航合并。" },
  { name: "UI 专家", value: "通过", description: "视觉保持轻量目录样式，移动端提供单行吸附横向 fallback。" },
  { name: "研发专家", value: "通过", description: "自有 React 实现，无 antd 系依赖；受控、非受控 hash、window 与局部容器滚动 active 都可用。" },
  { name: "测试专家", value: "通过", description: "示例覆盖安全 href、current、offset、smooth、disabled、长文档和移动端策略。" },
  { name: "白帽专家", value: "通过", description: "只接受同页 fragment，危险 URL 渲染为禁用文本，不暴露 javascript 或外链执行入口。" },
];

function ControlledAnchorDemo() {
  const [current, setCurrent] = useState("#anchor-demo-usage");

  return (
    <div className="anchor-doc-controlled">
      <Anchor current={current} items={demoItems} onChange={(href) => setCurrent(href)} />
      <div className="anchor-doc-controlled__status">
        <span>current</span>
        <code>{current}</code>
      </div>
    </div>
  );
}

function LongDocumentAnchorDemo() {
  return (
    <div className="anchor-doc-long-demo">
      <Anchor aria-label="Long document sections" items={longDocumentItems} offset={16} smooth={false} />
      <div className="anchor-doc-long-demo__document">
        {longDocumentItems.map((item, index) => (
          <section id={item.href.slice(1)} key={item.href} tabIndex={-1}>
            <h4>{item.label}</h4>
            <p>
              This section mirrors a production document region with enough height to make active section tracking observable.
              Anchor keeps the navigation quiet while still exposing location through hash and aria-current.
            </p>
            <p>
              Review row {index + 1} repeats realistic body copy so scroll handling can be checked without rendering a heavy
              virtualized document or relying on an external UI dependency.
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

function ScrollContainerAnchorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="anchor-doc-container-demo">
      <Anchor
        aria-label="Panel sections"
        items={containerItems}
        offset={12}
        scrollContainer={() => containerRef.current}
        smooth={false}
      />
      <div className="anchor-doc-container-demo__viewport" ref={containerRef} tabIndex={0}>
        <div className="anchor-doc-container-demo__content">
          {containerItems.map((item, index) => (
            <section id={item.href.slice(1)} key={item.href} tabIndex={-1}>
              <h4>{item.label}</h4>
              <p>
                Panel section {index + 1} lives inside a bounded scroll area. Anchor measures this section against the
                panel, so the page itself stays still while the active link follows the panel scroll.
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview">{preview}</div>
      <pre className="button-doc-code">
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
            <th>名称</th>
            <th>值</th>
            <th>说明</th>
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

export function AnchorDoc({ showAnchors = false }: AnchorDocProps) {
  return (
    <TutorialScaffold component="Anchor" kind="display" oneLineExample={"<Anchor items={[{ href: \"#api\", label: \"API\" }]} />"}>
    <section className="button-doc anchor-doc" aria-labelledby="anchor-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Anchor 文档目录">
            {anchorDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="anchor-doc-title">{anchorDocMeta.title}</h2>
            <p>
              用于长页面内部的章节导航。Anchor 只处理同页锚点，不承担站点菜单，也不展示页面层级路径。
            </p>
          </header>

          <section className="button-doc-section" id="anchor-purpose" aria-labelledby="anchor-purpose-title">
            <h3 id="anchor-purpose-title">组件定位</h3>
            <ul className="button-doc-list">
              <li>页面内容较长，用户需要快速跳到当前页内章节时使用。</li>
              <li>当前章节可由 current 控制，也可从当前 hash 初始化并监听 hashchange。</li>
              <li>不要和 Breadcrumb 或 Menu 合并：Breadcrumb 表达层级路径，Menu 表达站点级导航。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="anchor-demos" aria-labelledby="anchor-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="anchor-demos-title">代码演示</h3>
              <p>示例覆盖 items、current hash、offset、smooth、disabled、安全 href 和移动端 fallback。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section anchor-doc-mobile" id="anchor-mobile" aria-labelledby="anchor-mobile-title">
            <div className="button-doc-section__heading">
              <h3 id="anchor-mobile-title">移动端</h3>
              <p>mobileStickyFallback 默认开启，窄屏下使用顶部吸附和横向滚动，保留当前项高亮。</p>
            </div>
            <div className="anchor-doc-mobile__frame">
              <Anchor current="#anchor-demo-api" items={demoItems} />
            </div>
          </section>

          <section className="button-doc-section" id="anchor-api" aria-labelledby="anchor-api-title">
            <h3 id="anchor-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="anchor-aria" aria-labelledby="anchor-aria-title">
            <h3 id="anchor-aria-title">ARIA / a11y</h3>
            <DataTable rows={ariaRows} />
          </section>

          <section className="button-doc-section" id="anchor-style" aria-labelledby="anchor-style-title">
            <h3 id="anchor-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="anchor-review" aria-labelledby="anchor-review-title">
            <h3 id="anchor-review-title">五专家审查</h3>
            <DataTable rows={reviewRows} />
          </section>

          <div className="anchor-doc-targets" aria-hidden="true">
            <span id="anchor-demo-intro" />
            <span id="anchor-demo-usage" />
            <span id="anchor-demo-offset" />
            <span id="anchor-demo-deep-nested" />
            <span id="anchor-demo-disabled" />
            <span id="anchor-demo-api" />
            <span id="anchor-demo-long-title" />
            <span id="anchor-safe" />
          </div>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
