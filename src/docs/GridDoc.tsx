import type { ReactNode } from "react";
import { Grid, GridItem, Tag } from "../components/base";
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

export type GridDocProps = {
  showAnchors?: boolean;
};

export const gridDocMeta = {
  title: "Grid 栅格",
  category: "布局",
  anchors: [
    { id: "grid-when", label: "何时使用" },
    { id: "grid-demos", label: "代码演示" },
    { id: "grid-api", label: "API" },
    { id: "grid-breakpoints", label: "断点" },
    { id: "grid-semantic", label: "Semantic DOM" },
    { id: "grid-token", label: "Design Token" },
    { id: "grid-a11y", label: "可访问性" },
    { id: "grid-review", label: "复核结论" },
    { id: "grid-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  { name: "Grid as", value: "ElementType", description: "根元素，默认 div。可传 section、ul、form 等承载业务语义。" },
  { name: "columns", value: '1 | 2 | 3 | 4 | 6 | 12 | "auto"', description: "固定列数或 auto-fit 列宽。默认 12 列；运行时非法值回退为 12。" },
  { name: "gap", value: "SpaceSize | number", description: "使用 none/xs/sm/md/lg/xl 或非负 px 数值写入 CSS gap；非有限数字回退为 0。" },
  { name: "dense", value: "boolean", description: "开启 grid-auto-flow: dense，用于跨度不同项目的视觉补位。" },
  { name: "minItemWidth", value: "number", description: 'columns="auto" 时的最小项目宽度，使用 min(100%, value) 防止窄屏溢出。' },
  { name: "GridItem as", value: "ElementType", description: "项目元素，默认 div。可传 li、article、label 等。" },
  { name: "span", value: '1..12 | "full"', description: "桌面跨度。数字运行时夹到 1..12；full 等于 1 / -1。" },
  { name: "spanMd", value: '1..12 | "full"', description: "900px 以下的跨度覆盖；数字运行时夹到 1..12。" },
  { name: "spanSm", value: '1..12 | "full"', description: "760px 以下的显式跨度覆盖；未设置时固定列 GridItem 默认整行。" },
];

const breakpointRows: DocRow[] = [
  { name: "desktop", value: "> 900px", description: "固定列按 columns 渲染；span 控制项目占据的轨道数。" },
  { name: "medium", value: "<= 900px", description: "spanMd 覆盖 span；没有 spanMd 时保留桌面跨度。" },
  { name: "small", value: "<= 760px", description: "固定列子项默认整行，spanSm 可显式恢复半宽、三分之一宽等小屏布局。" },
  { name: "auto", value: "auto-fit", description: "auto 模式不强制单列，由 minItemWidth 与容器宽度决定列数。" },
  { name: "overflow", value: "min-width: 0", description: "容器和项目都允许内容收缩；长文本样例使用换行保护。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div | custom element", description: "Grid 不默认添加 role=grid，避免误承诺表格型键盘模型。" },
  { name: "item", value: "div | custom element", description: "GridItem 只负责跨度，不覆盖业务语义和交互语义。" },
  { name: "source order", value: "DOM order", description: "dense 只影响视觉补位，读屏和键盘顺序仍以 DOM 为准。" },
  { name: "responsive", value: "CSS media query", description: "断点由 CSS 类控制，服务端渲染时不依赖 window 尺寸。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-grid-gap", value: "0 | 4 | 8 | 12 | 18 | 24px | custom", description: "由 gap prop 写入，统一行列间距。" },
  { name: "--c-grid-min", value: "minItemWidth px", description: "auto-fit 最小列宽，最小保护为 1px。" },
  { name: "grid-template", value: "repeat(n, minmax(0, 1fr))", description: "固定列使用稳定等分轨道，hover 和内容变化不改变列宽。" },
  { name: "item min width", value: "0", description: "项目允许内部文本折行，避免撑破文档和移动视口。" },
  {
    name: "主题 style",
    value: "none / inherit",
    description: "Grid 只负责二维排布，不创建主题面；示例 cell 使用 --ct-surface-muted、--ct-border、--ct-text 展示亮/暗主题边界。",
  },
  {
    name: "结构 style",
    value: "CSS grid / span / auto-fit / breakpoints",
    description: "columns、dense、span、spanMd、spanSm 和 minmax(0,1fr) 全部属于结构样式，固定列小屏默认整行以避免 overflow。",
  },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "职责限定为二维布局、卡片矩阵和表单排布；不混入 Masonry、Flex 或业务数据职责。" },
  { name: "UI 专家", value: "通过", description: "桌面固定列、auto-fit、小屏默认整行和显式 spanSm 都有可视样例；gap 与边界统一。" },
  { name: "研发专家", value: "通过", description: "React/TypeScript 自有实现，非法 columns/span 有 clamp；无 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "覆盖 12 列跨度、auto-fit、dense、900/760 断点、360/390/430 移动宽度和溢出保护。" },
  { name: "白帽专家", value: "通过", description: "children 是 ReactNode，不渲染 HTML 字符串，不使用 dangerouslySetInnerHTML，不读取远程资源。" },
];

const demos: Demo[] = [
  {
    title: "十二列跨度",
    description: "桌面使用 8/4/3/3/6 跨度；900px 以下 spanMd 全宽；760px 以下默认整行。",
    preview: (
      <Grid columns={12} dense gap="sm">
        <GridItem span={8} spanMd="full">
          <GridDocCell label="Content" value="span 8" />
        </GridItem>
        <GridItem span={4} spanMd="full">
          <GridDocCell label="Aside" value="span 4" />
        </GridItem>
        <GridItem span={3}>
          <GridDocCell label="A" value="span 3" />
        </GridItem>
        <GridItem span={3}>
          <GridDocCell label="B" value="span 3" />
        </GridItem>
        <GridItem span={6}>
          <GridDocCell label="C" value="span 6" />
        </GridItem>
      </Grid>
    ),
    code: `<Grid columns={12} dense gap="sm">
  <GridItem span={8} spanMd="full">...</GridItem>
  <GridItem span={4} spanMd="full">...</GridItem>
  <GridItem span={3}>...</GridItem>
  <GridItem span={3}>...</GridItem>
  <GridItem span={6}>...</GridItem>
</Grid>`,
  },
  {
    title: "Auto-fit 列宽",
    description: "auto 模式根据 minItemWidth 产生列数；375/390 宽度下不会横向溢出。",
    preview: (
      <Grid columns="auto" gap="sm" minItemWidth={142}>
        {["Backlog", "Review", "Ready", "Done"].map((label) => (
          <GridItem key={label}>
            <GridDocCell label={label} value="auto" />
          </GridItem>
        ))}
      </Grid>
    ),
    code: `<Grid columns="auto" gap="sm" minItemWidth={142}>
  <GridItem>Backlog</GridItem>
  <GridItem>Review</GridItem>
  <GridItem>Ready</GridItem>
  <GridItem>Done</GridItem>
</Grid>`,
  },
  {
    title: "小屏显式跨度",
    description: "固定列小屏默认整行；spanSm 可让关键数据在 375/390 宽度保持两列一行。",
    preview: (
      <Grid className="grid-doc-mobile-specimen" columns={12} gap="sm">
        <GridItem span={6} spanSm={6}>
          <GridDocCell label="CPU" value="spanSm 6" />
        </GridItem>
        <GridItem span={6} spanSm={6}>
          <GridDocCell label="Memory" value="spanSm 6" />
        </GridItem>
        <GridItem span={12} spanSm="full">
          <GridDocCell label="Trace" value="full" long />
        </GridItem>
      </Grid>
    ),
    code: `<Grid columns={12} gap="sm">
  <GridItem span={6} spanSm={6}>CPU</GridItem>
  <GridItem span={6} spanSm={6}>Memory</GridItem>
  <GridItem span={12} spanSm="full">Trace</GridItem>
</Grid>`,
  },
];

function GridDocCell({ label, long = false, value }: { label: string; long?: boolean; value: string }) {
  return (
    <article className="grid-doc-cell">
      <span>{label}</span>
      <strong>{value}</strong>
      {long ? <p>trace_2026_06_07_grid_component_mobile_overflow_acceptance</p> : null}
    </article>
  );
}

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

export function GridDoc({ showAnchors = true }: GridDocProps) {
  return (
    <TutorialScaffold component="Grid" kind="display" oneLineExample={"<Grid columns={3} gap=\"sm\"><GridItem>Item</GridItem></Grid>"}>
    <section className="button-doc grid-doc" aria-labelledby="grid-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Grid 文档目录">
            {gridDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc / layout</p>
            <h2 id="grid-doc-title">{gridDocMeta.title}</h2>
            <p>
              Grid 是基础栅格组件，用自有 CSS grid 提供固定列、auto-fit 列宽、响应式跨度和稳定 gap。
              它只负责布局，不伪装成数据表格，也不绑定业务卡片样式。
            </p>
          </header>

          <section className="button-doc-section" id="grid-when" aria-labelledby="grid-when-title">
            <h3 id="grid-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于二维区域、卡片矩阵、表单排布、指标概览和需要显式跨度的页面区块。</li>
              <li>只需要单轴排列时优先使用 Flex 或 Space；高度不一致并追求瀑布流紧凑时使用 Masonry。</li>
              <li>不要把 Grid 当作可交互表格；需要单元格键盘模型时应由业务层实现完整语义。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="grid-demos" aria-labelledby="grid-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="grid-demos-title">代码演示</h3>
              <p>三组样例分别覆盖固定列跨度、auto-fit 列宽和小屏显式 spanSm。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="grid-api" aria-labelledby="grid-api-title">
            <h3 id="grid-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="grid-breakpoints" aria-labelledby="grid-breakpoints-title">
            <h3 id="grid-breakpoints-title">断点</h3>
            <DataTable rows={breakpointRows} />
          </section>

          <section className="button-doc-section" id="grid-semantic" aria-labelledby="grid-semantic-title">
            <h3 id="grid-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="grid-token" aria-labelledby="grid-token-title">
            <h3 id="grid-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="grid-a11y" aria-labelledby="grid-a11y-title">
            <h3 id="grid-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>通过 <code>as</code> 传入真实业务语义，例如 <code>ul</code>/<code>li</code> 或 <code>section</code>/<code>article</code>。</li>
              <li><code>dense</code> 不改变 DOM 顺序；不要用视觉位置表达唯一的阅读顺序、排名或状态。</li>
              <li>容器和项目都使用 <code>min-width: 0</code>，长标识符应允许换行，移动端不产生横向滚动。</li>
              <li><code>children</code> 以 ReactNode 渲染并由 React 转义；组件类型层拒绝 <code>dangerouslySetInnerHTML</code>。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="grid-review" aria-labelledby="grid-review-title">
            <h3 id="grid-review-title">复核结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="grid-gaps" aria-labelledby="grid-gaps-title">
            <h3 id="grid-gaps-title">缺口与扩展</h3>
            <ul className="button-doc-list">
              <li>暂不内置 Ant Design 的 Row/Col offset、push、pull、order、gutter 数组和断点对象 API。</li>
              <li>暂不提供独立 order 属性；需要视觉顺序调整时由业务层明确评估读屏和键盘顺序。</li>
              <li>暂不提供 container query 版本；当前断点为全局 CSS media query。</li>
              <li>
                <Tag tone="subtle">no antd</Tag> 当前实现只依赖 React、TypeScript 和自有 CSS。
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
