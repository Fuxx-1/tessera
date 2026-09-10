import type { ReactNode } from "react";
import { Breadcrumb } from "../components/base";
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

export type BreadcrumbDocProps = {
  showAnchors?: boolean;
};

export const breadcrumbDocMeta = {
  title: "Breadcrumb 面包屑",
  category: "基础组件",
  anchors: [
    { id: "breadcrumb-when", label: "何时使用" },
    { id: "breadcrumb-demos", label: "代码演示" },
    { id: "breadcrumb-api", label: "API" },
    { id: "breadcrumb-aria", label: "ARIA" },
    { id: "breadcrumb-style", label: "主题与结构 style" },
    { id: "breadcrumb-mobile", label: "移动端" },
    { id: "breadcrumb-review", label: "五专家审查" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "一行样例",
    description: "最小用法保持在一行，适合复制到页面标题区或详情页头部。",
    preview: <Breadcrumb items={[{ href: "#overview", label: "首页" }, { label: "详情" }]} />,
    code: `<Breadcrumb items={[{ href: "#overview", label: "首页" }, { label: "详情" }]} />`,
  },
  {
    title: "基础路径",
    description: "最后一项自动作为当前页，使用 aria-current=\"page\" 暴露当前位置。",
    preview: (
      <Breadcrumb
        items={[
          { href: "#overview", label: "首页" },
          { href: "#navigation", label: "导航" },
          { label: "面包屑" },
        ]}
      />
    ),
    code: `<Breadcrumb items={[{ href: "#overview", label: "首页" }, { href: "#navigation", label: "导航" }, { label: "面包屑" }]} />`,
  },
  {
    title: "长文本当前页",
    description: "长标签在项内省略，title 保留完整文本；当前页即使传 href 也不会渲染为链接。",
    preview: (
      <Breadcrumb
        items={[
          { href: "#workspace", label: "工作台" },
          { href: "#release", label: "发布管理" },
          {
            href: "#current-page",
            label: "2026 年第二季度平台稳定性复盘与跨团队行动项跟踪",
            title: "2026 年第二季度平台稳定性复盘与跨团队行动项跟踪",
          },
        ]}
      />
    ),
    code: `<Breadcrumb items={[{ href: "#workspace", label: "工作台" }, { href: "#release", label: "发布管理" }, { href: "#current-page", label: "2026 年第二季度平台稳定性复盘与跨团队行动项跟踪", title: "2026 年第二季度平台稳定性复盘与跨团队行动项跟踪" }]} />`,
  },
  {
    title: "收敛长路径",
    description: "maxItems 保留首项和末尾路径，中间层级以可访问省略节点表达。",
    preview: (
      <Breadcrumb
        maxItems={4}
        items={[
          { href: "#workspace", label: "工作台" },
          { href: "#projects", label: "项目" },
          { href: "#components", label: "组件库" },
          { href: "#base", label: "基础组件" },
          { href: "#navigation", label: "导航" },
          { label: "Breadcrumb" },
        ]}
      />
    ),
    code: `<Breadcrumb maxItems={4} items={[{ href: "#workspace", label: "工作台" }, { href: "#projects", label: "项目" }, { href: "#components", label: "组件库" }, { href: "#base", label: "基础组件" }, { href: "#navigation", label: "导航" }, { label: "Breadcrumb" }]} />`,
  },
  {
    title: "自定义分隔符",
    description: "separator 仅作为视觉间隔并带 aria-hidden，读屏不会反复播报分隔符。",
    preview: (
      <Breadcrumb
        separator=">"
        items={[
          { href: "#data", label: "数据" },
          { href: "#reports", label: "报表" },
          { label: "月度总览" },
        ]}
      />
    ),
    code: `<Breadcrumb separator=">" items={[{ href: "#data", label: "数据" }, { href: "#reports", label: "报表" }, { label: "月度总览" }]} />`,
  },
  {
    title: "超长 URL",
    description: "长 URL 和深层路径会在组件边界内省略，不会撑破页面或预览容器。",
    preview: (
      <Breadcrumb
        items={[
          { href: "#workspace", label: "工作台" },
          {
            href: "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug",
            label:
              "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug",
            title:
              "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug",
          },
          { label: "当前页" },
        ]}
      />
    ),
    code: `<Breadcrumb items={[{ href: "#workspace", label: "工作台" }, { href: "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug", label: "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug", title: "https://example.com/products/tessera/components/base/breadcrumb/release-notes/2026/06/deeply/nested/path/with/a/very/long/slug" }, { label: "当前页" }]} />`,
  },
  {
    title: "链接安全",
    description: "危险协议不会渲染为链接；新窗口外链自动带 noopener noreferrer。",
    preview: (
      <div className="breadcrumb-doc-security-demo">
        <Breadcrumb
          items={[
            { href: "javascript:alert(1)", label: "危险入口" },
            { href: "https://example.com/docs", label: "外部文档", linkProps: { target: "_blank" } },
            { label: "安全结果" },
          ]}
        />
      </div>
    ),
    code: `<Breadcrumb items={[{ href: "javascript:alert(1)", label: "危险入口" }, { href: "https://example.com/docs", label: "外部文档", linkProps: { target: "_blank" } }, { label: "安全结果" }]} />`,
  },
  {
    title: "routes 与 renderItem",
    description: "兼容 routes/path/breadcrumbName，并可用 renderItem 定制标签内容；链接和当前项语义仍由组件接管。",
    preview: (
      <Breadcrumb
        routes={[
          { path: "#console", breadcrumbName: "Console" },
          { path: "#pipelines", breadcrumbName: "Pipelines" },
          { breadcrumbName: "Release 2026.06" },
        ]}
        renderItem={(item, { isCurrent }) => (
          <span className="breadcrumb-doc-rendered-item" {...(isCurrent ? { "data-current": "true" } : {})}>
            {item.label}
          </span>
        )}
      />
    ),
    code: `<Breadcrumb routes={[{ path: "#console", breadcrumbName: "Console" }, { path: "#pipelines", breadcrumbName: "Pipelines" }, { breadcrumbName: "Release 2026.06" }]} renderItem={(item, { isCurrent }) => <span {...(isCurrent ? { "data-current": "true" } : {})}>{item.label}</span>} />`,
  },
  {
    title: "移动端横向滚动",
    description: "mobileBehavior=\"scroll\" 保留完整路径，适合层级短但标签较长的页面。",
    preview: (
      <div className="breadcrumb-doc-mobile-frame">
        <Breadcrumb
          aria-label="移动端路径"
          mobileBehavior="scroll"
          items={[
            { href: "#console", label: "Console" },
            { href: "#automation", label: "Automation" },
            { href: "#incident", label: "Incident review" },
            { label: "Very long active page" },
          ]}
        />
      </div>
    ),
    code: `<Breadcrumb aria-label="移动端路径" mobileBehavior="scroll" items={[{ href: "#console", label: "Console" }, { href: "#automation", label: "Automation" }, { href: "#incident", label: "Incident review" }, { label: "Very long active page" }]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "BreadcrumbItem[]", description: "按层级顺序渲染路径项，最后一项默认是当前页。" },
  {
    name: "routes",
    value: "BreadcrumbRoute[]",
    description: "可选。兼容 path/breadcrumbName 数据形态；未传 items 时作为数据源。",
  },
  { name: "items[].key", value: "string", description: "可选。为动态路径提供稳定 React key。" },
  { name: "items[].href", value: "string", description: "可选。非当前页且存在 href 时渲染为链接。" },
  { name: "items[].label", value: "ReactNode", description: "路径项内容，建议保持简短可读。" },
  { name: "items[].title", value: "string", description: "可选。为截断文本提供原生提示。" },
  {
    name: "items[].linkProps",
    value: "AnchorHTMLAttributes",
    description: "可选。透传 target、rel、download 等链接属性；href、title 和 className 由组件统一接管。",
  },
  {
    name: "renderItem",
    value: "(item, info) => ReactNode",
    description: "可选。定制每项内容；info 提供 index/isCurrent，链接、安全 href 和 aria-current 仍由组件接管。",
  },
  { name: "separator", value: "ReactNode", description: "可选。默认 /，只用于视觉分隔。" },
  { name: "maxItems", value: "number", description: "可选。大于等于 3 时收敛长路径，保留首项和末尾路径。" },
  {
    name: "mobileBehavior",
    value: '"collapse" | "wrap" | "scroll"',
    description: "可选。控制窄屏换行、滚动或首尾优先的响应式表现。",
  },
  { name: "aria-label", value: "string", description: "可选。默认 Breadcrumb，用于命名 nav 地标。" },
  { name: "collapseLabel", value: "string", description: "可选。命名 maxItems 产生的省略节点。" },
];

const ariaRows: DocRow[] = [
  { name: "nav", value: "aria-label", description: "根节点是导航地标，默认可访问名称为 Breadcrumb。" },
  { name: "ol/li", value: "ordered list", description: "路径顺序保留为有序列表，便于理解层级结构。" },
  { name: "current", value: 'aria-current="page"', description: "当前页只在最后一项标记，不再渲染为链接。" },
  { name: "separator", value: 'aria-hidden="true"', description: "分隔符从辅助技术树中隐藏，避免冗余播报。" },
  { name: "ellipsis", value: "aria-label", description: "收敛节点说明隐藏层级数量，不伪装成可点击控件。" },
];

const styleRows: DocRow[] = [
  {
    name: "主题 style",
    value: "--ct-text-secondary / --ct-border / --ct-surface-hover",
    description: "路径文本、当前页、分隔符、hover underline、focus ring 和移动端 frame 都读取 --ct-* token，亮/暗主题保持中性导航层级。",
  },
  {
    name: "结构 style",
    value: "nav ol/li / ellipsis / mobileBehavior",
    description: "maxItems 收敛、separator、renderItem、text-overflow、collapse/wrap/scroll 三种移动策略都属于结构样式。",
  },
];

const mobileDemos: Demo[] = [
  {
    title: "collapse",
    description: "窄屏仅保留首尾路径，减少标题区横向压力。",
    preview: (
      <div className="breadcrumb-doc-mobile-frame">
        <Breadcrumb
          mobileBehavior="collapse"
          items={[
            { href: "#home", label: "Home" },
            { href: "#workspace", label: "Workspace" },
            { href: "#release", label: "Release Center" },
            { label: "Quarterly platform reliability review" },
          ]}
        />
      </div>
    ),
    code: `<Breadcrumb mobileBehavior="collapse" items={[{ href: "#home", label: "Home" }, { href: "#workspace", label: "Workspace" }, { href: "#release", label: "Release Center" }, { label: "Quarterly platform reliability review" }]} />`,
  },
  {
    title: "wrap",
    description: "窄屏完整展示层级并允许换行。",
    preview: (
      <div className="breadcrumb-doc-mobile-frame">
        <Breadcrumb
          mobileBehavior="wrap"
          items={[
            { href: "#home", label: "Home" },
            { href: "#workspace", label: "Workspace" },
            { href: "#release", label: "Release Center" },
            { label: "Quarterly platform reliability review" },
          ]}
        />
      </div>
    ),
    code: `<Breadcrumb mobileBehavior="wrap" items={[{ href: "#home", label: "Home" }, { href: "#workspace", label: "Workspace" }, { href: "#release", label: "Release Center" }, { label: "Quarterly platform reliability review" }]} />`,
  },
  {
    title: "scroll",
    description: "窄屏保留单行并在组件内部横向滚动。",
    preview: (
      <div className="breadcrumb-doc-mobile-frame">
        <Breadcrumb
          mobileBehavior="scroll"
          items={[
            { href: "#home", label: "Home" },
            { href: "#workspace", label: "Workspace" },
            { href: "#release", label: "Release Center" },
            { label: "Quarterly platform reliability review" },
          ]}
        />
      </div>
    ),
    code: `<Breadcrumb mobileBehavior="scroll" items={[{ href: "#home", label: "Home" }, { href: "#workspace", label: "Workspace" }, { href: "#release", label: "Release Center" }, { label: "Quarterly platform reliability review" }]} />`,
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "覆盖层级路径、当前页不可跳转、上级可跳转和非法链接降级边界。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "覆盖分隔符、省略、长标签、浅底容器和移动端 wrap、scroll、collapse 三类策略。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "nav/ol/li 语义稳定；aria-current、items、routes、separator ReactNode 与 renderItem 渲染边界清晰。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "文档示例覆盖核心分支，smoke 覆盖 desktop 及 360/390/430 移动视口。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "label、href、title 和 separator 文本由 React 转义；javascript/data/vbscript 协议不会渲染为链接。",
  },
];

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

export function BreadcrumbDoc({ showAnchors = false }: BreadcrumbDocProps) {
  return (
    <TutorialScaffold component="Breadcrumb" kind="display" oneLineExample={"<Breadcrumb items={[{ href: \"#docs\", label: \"Docs\" }, { label: \"API\" }]} />"}>
    <section className="button-doc breadcrumb-doc" aria-labelledby="breadcrumb-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Breadcrumb 文档目录">
            {breadcrumbDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="breadcrumb-doc-title">{breadcrumbDocMeta.title}</h2>
            <p>
              用于展示当前页面在信息架构中的位置。组件使用原生 <code>{"<nav>"}</code>、<code>{"<ol>"}</code>
              和链接元素组合，不依赖外部 UI 库。
            </p>
          </header>

          <section className="button-doc-section" id="breadcrumb-when" aria-labelledby="breadcrumb-when-title">
            <h3 id="breadcrumb-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>页面存在两级以上层级路径，用户需要回到上层页面时使用。</li>
              <li>最后一项表示当前页，不作为链接，避免重复跳转到当前地址。</li>
              <li>不用于步骤流程、分页或主导航；这些场景应使用对应组件。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="breadcrumb-demos" aria-labelledby="breadcrumb-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="breadcrumb-demos-title">代码演示</h3>
              <p>示例覆盖基础路径、长路径收敛、自定义分隔符、链接安全和移动端滚动策略。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="breadcrumb-api" aria-labelledby="breadcrumb-api-title">
            <h3 id="breadcrumb-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="breadcrumb-aria" aria-labelledby="breadcrumb-aria-title">
            <h3 id="breadcrumb-aria-title">ARIA</h3>
            <DataTable rows={ariaRows} />
          </section>

          <section className="button-doc-section" id="breadcrumb-style" aria-labelledby="breadcrumb-style-title">
            <h3 id="breadcrumb-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="breadcrumb-mobile" aria-labelledby="breadcrumb-mobile-title">
            <div className="button-doc-section__heading">
              <h3 id="breadcrumb-mobile-title">移动端</h3>
              <p>
                默认 collapse 在窄屏隐藏中间项，只保留首尾上下文；wrap 保留换行；scroll 保留完整路径并允许横向浏览。
              </p>
            </div>
            <div className="button-doc-demo-grid breadcrumb-doc-mobile-grid">
              {mobileDemos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="breadcrumb-review" aria-labelledby="breadcrumb-review-title">
            <h3 id="breadcrumb-review-title">五专家审查</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
