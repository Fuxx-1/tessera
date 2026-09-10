import { useState, type ReactNode } from "react";
import { MindMap, type MindMapBranch, type MindMapStyles } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
  compact?: boolean;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type MindMapDocProps = {
  showAnchors?: boolean;
};

export const mindMapDocMeta = {
  title: "MindMap 思维导图",
  category: "关系与流向",
  anchors: [
    { id: "mind-map-when", label: "何时使用" },
    { id: "mind-map-demos", label: "代码演示" },
    { id: "mind-map-api", label: "API" },
    { id: "mind-map-structure", label: "数据结构" },
    { id: "mind-map-interaction", label: "交互" },
    { id: "mind-map-semantic", label: "Semantic DOM" },
    { id: "mind-map-mobile", label: "移动端" },
    { id: "mind-map-security", label: "安全" },
    { id: "mind-map-token", label: "Design Token" },
    { id: "mind-map-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<MindMap root={root} branches={branches} title="Roadmap mind map" />`;

const root = {
  id: "component-system",
  label: "Component system",
  value: "2026 roadmap",
};

const branches: MindMapBranch[] = [
  {
    id: "product",
    label: "Product scope",
    value: "user jobs",
    children: [
      { id: "prd", label: "Capability registry", value: "coverage" },
      { id: "priority", label: "Release priority", value: "risk first" },
      {
        id: "adoption",
        label: "Adoption path",
        value: "docs",
        children: [
          { id: "examples", label: "Examples", value: "copyable" },
          { id: "status", label: "Status model", value: "visible" },
        ],
      },
    ],
  },
  {
    id: "design",
    label: "UI language",
    value: "neutral",
    children: [
      { id: "density", label: "Dense layouts", value: "scan safe" },
      { id: "tokens", label: "Token discipline", value: "low shadow" },
      { id: "mobile", label: "Mobile scroll", value: "safe" },
    ],
  },
  {
    id: "engineering",
    label: "Engineering",
    value: "self-owned",
    children: [
      { id: "svg", label: "SVG renderer", value: "no chart lib" },
      { id: "state", label: "State layers", value: "empty/error" },
      {
        id: "exports",
        label: "Package surface",
        value: "typed",
        children: [
          { id: "registry", label: "Registry", value: "route" },
          { id: "acceptance", label: "Acceptance", value: "smoke" },
        ],
      },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    value: "evidence",
    children: [
      { id: "keyboard", label: "Keyboard", value: "toggle" },
      { id: "narrow", label: "Narrow viewport", value: "360px" },
      { id: "long-label", label: "Long labels", value: "truncated" },
    ],
  },
  {
    id: "security",
    label: "Security",
    value: "defensive",
    children: [
      { id: "text", label: "Text nodes", value: "escaped" },
      { id: "colors", label: "Safe colors", value: "hex only" },
      { id: "depth", label: "Depth limit", value: "bounded" },
    ],
  },
];

const deepBranches: MindMapBranch[] = [
  {
    id: "root-branch",
    label: "Discovery and synthesis workstream",
    value: "long branch",
    children: [
      {
        id: "nested-one",
        label: "Research notes, user interviews, support tickets",
        value: "inputs",
        children: [
          {
            id: "nested-two",
            label: "Clustered insight",
            value: "theme",
            children: [
              { id: "nested-three", label: "Actionable roadmap candidate", value: "decision" },
              { id: "nested-four", label: "Open question", value: "follow-up" },
            ],
          },
        ],
      },
      { id: "parallel", label: "Parallel validation", value: "test plan" },
    ],
  },
  {
    id: "ops",
    label: "Operational rollout",
    value: "owners",
    children: [
      { id: "training", label: "Training", value: "docs" },
      { id: "handoff", label: "Handoff", value: "support" },
    ],
  },
];

const customStyles: MindMapStyles = {
  colors: ["#66715e", "#9b6a4e", "#6f5d73", "#b48639"],
  connector: "#c8c8c3",
  root: { background: "#1f1f1d", border: "#1f1f1d", color: "#ffffff" },
  branch: { background: "#ffffff", border: "#dededb", color: "#1f1f1d" },
  leaf: { background: "#f7f7f5", border: "#dededb", color: "#555552" },
};

const structureStyles: MindMapStyles = {
  colors: ["#5f625c", "#74776f", "#7b706a"],
  connector: "#b9bab4",
  root: { background: "#3d403a", border: "#565951", color: "#ffffff" },
  branch: { background: "#fbfbfa", border: "#d6d7d2", color: "#1f1f1d" },
  leaf: { background: "#ffffff", border: "#e4e4df", color: "#555552" },
};

const multilineBranches: MindMapBranch[] = [
  {
    id: "north-star",
    label: "Discovery notes that need two readable lines",
    value: "theme and evidence",
    children: [
      { id: "interviews", label: "Interview synthesis with long participant quotes", value: "bounded copy" },
      { id: "metrics", label: "Metric snapshot", value: "kept compact" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery workstream",
    value: "owner map",
    children: [
      { id: "design-review", label: "Design review queue", value: "weekly" },
      { id: "release-readiness", label: "Release readiness checklist", value: "no overlap" },
    ],
  },
  {
    id: "risk",
    label: "Boundary cases",
    value: "mobile / dark",
    children: [
      { id: "overflow", label: "No page level overflow on 360px", value: "scroll inside chart" },
      { id: "toggle", label: "Toggle stays close to parent node", value: "hit target aligned" },
    ],
  },
];

const denseBranches: MindMapBranch[] = Array.from({ length: 14 }, (_, branchIndex) => ({
  id: `dense-${branchIndex}`,
  label: `Dense branch ${branchIndex + 1}`,
  value: branchIndex % 2 === 0 ? "expanded" : "collapsed",
  children: Array.from({ length: 4 }, (_, childIndex) => ({
    id: `dense-${branchIndex}-${childIndex}`,
    label: `Child ${branchIndex + 1}.${childIndex + 1} with bounded label`,
    value: childIndex % 2 === 0 ? "leaf" : "metric",
  })),
}));

function ControlledCollapseDemo() {
  const [collapsedIds, setCollapsedIds] = useState(["engineering"]);

  return (
    <MindMap
      branches={branches}
      collapsedIds={collapsedIds}
      onCollapsedIdsChange={setCollapsedIds}
      root={root}
      summary="Engineering starts collapsed; keyboard and pointer activation update the controlled collapsedIds array."
      title="Controlled collapse"
    />
  );
}

const demos: Demo[] = [
  {
    title: "Balanced mind map",
    description: "中心主题左右分支自动分布，节点、连接线和收起命中层都保持纯 SVG，支持可聚焦收起。",
    preview: (
      <MindMap
        branches={branches}
        defaultCollapsedIds={["adoption"]}
        root={root}
        summary="Five workstreams around a component system roadmap with one nested branch collapsed."
        title="Roadmap mind map"
      />
    ),
    code: `<MindMap root={root} branches={branches} defaultCollapsedIds={["adoption"]} title="Roadmap mind map" />`,
    compact: true,
  },
  {
    title: "Controlled collapse",
    description: "业务可受控管理 collapsedIds，用于把导图状态同步到 URL、侧栏或保存草稿。",
    preview: <ControlledCollapseDemo />,
    code: `<MindMap root={root} branches={branches} collapsedIds={collapsedIds} onCollapsedIdsChange={setCollapsedIds} />`,
    compact: true,
  },
  {
    title: "Multi-line nodes",
    description: "长标题和值在 SVG text/tspan 内最多多行展示，节点高度、连接线端点和按钮位置同步计算。",
    preview: <MindMap branches={multilineBranches} depth={3} root={{ id: "research", label: "Research decision map", value: "multi-line" }} title="Multi-line node map" />,
    code: `<MindMap root={root} branches={multilineBranches} depth={3} title="Multi-line node map" />`,
    compact: true,
  },
  {
    title: "Theme style",
    description: "主题样式负责 root、branch、leaf、connector 和色板；非法颜色会回退到安全图表色。",
    preview: <MindMap branches={branches.slice(0, 3)} root={{ id: "styled", label: "Styled map", value: "tokens" }} styles={customStyles} title="Styled mind map" />,
    code: `<MindMap root={root} branches={branches} styles={themeStyle} />`,
    compact: true,
  },
  {
    title: "Structure style",
    description: "结构样式保持低对比节点和中性连接线，适合知识拆解、方案树和复盘归纳。",
    preview: <MindMap branches={deepBranches} depth={4} root={{ id: "structure", label: "Structure map", value: "depth 4" }} styles={structureStyles} title="Structure style map" />,
    code: `<MindMap root={root} branches={deepBranches} depth={4} styles={structureStyle} />`,
    compact: true,
  },
  {
    title: "Dense boundary",
    description: "大数据边界通过 depth、预算和内部滚动保持稳定；超预算时 notice 给出裁剪信息。",
    preview: <MindMap branches={denseBranches} defaultCollapsedIds={denseBranches.filter((_, index) => index % 2 === 1).map((branch) => branch.id)} depth={2} root={{ id: "dense-root", label: "Dense planning map", value: "14 branches" }} title="Dense mind map" />,
    code: `<MindMap root={root} branches={denseBranches} depth={2} defaultCollapsedIds={collapsedDenseIds} />`,
    compact: true,
  },
];

const stateDemos: Demo[] = [
  {
    title: "Empty",
    description: "无 branches 时保持稳定图表尺寸并展示状态层。",
    preview: <MindMap branches={[]} emptyText="No mind map branches" root={{ id: "empty", label: "Empty map" }} title="Empty map" />,
    code: `<MindMap root={root} branches={[]} emptyText="No mind map branches" />`,
  },
  {
    title: "Loading",
    description: "加载态设置 aria-busy，SVG 降低可见性，状态层保持可读。",
    preview: <MindMap branches={branches.slice(0, 2)} loading loadingText="Loading mind map" root={root} title="Loading map" />,
    code: `<MindMap root={root} branches={branches} loading loadingText="Loading mind map" />`,
  },
  {
    title: "Error",
    description: "错误态使用 alert 语义，便于业务展示数据源或权限问题。",
    preview: <MindMap branches={branches.slice(0, 2)} error="Mind map source unavailable" root={root} title="Error map" />,
    code: `<MindMap root={root} branches={branches} error="Mind map source unavailable" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "root",
    value: "{ id: string; label: string; value?: string }",
    description: "中心主题。root 不参与收起，负责提供导图的第一视觉信号和可访问名称上下文。",
  },
  {
    name: "branches",
    value: "MindMapBranch[]",
    description: "中心主题下的一级分支；子节点通过 children 递归表达。空数组进入空态。",
  },
  {
    name: "depth",
    value: "number",
    description: "限制最大渲染深度，内部收敛到 1-6，避免超深数据撑爆布局和主线程。",
  },
  {
    name: "collapsible",
    value: "boolean",
    description: "默认 true。开启后有 children 的节点会渲染纯 SVG 可聚焦命中层，支持点击、Enter 和 Space 收起/展开。",
  },
  {
    name: "collapsedIds / defaultCollapsedIds",
    value: "string[]",
    description: "受控或非受控收起状态。受控模式通过 onCollapsedIdsChange 回传下一组 id。",
  },
  {
    name: "styles",
    value: "{ root, branch, leaf, connector, colors }",
    description: "节点样式和分支色板。colors 只接受安全十六进制颜色，非法值会回退到内置图表色板。",
  },
  {
    name: "view controls",
    value: "built-in",
    description: "每个非状态图内置平移、缩放和重置控件；Ctrl / Command + 滚轮可围绕指针缩放，桌面指针可拖动画布。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "写入 ChartFrame 和 SVG title / desc。建议 summary 直接描述结论，而不是依赖视觉分支被读屏逐一解释。",
  },
  {
    name: "loading / error / emptyText",
    value: "boolean / ReactNode / string",
    description: "复用图表状态层；状态出现时 SVG 不暴露为 img，避免读屏读到半成品图。",
  },
];

const structureRows: DocRow[] = [
  {
    name: "MindMapRoot",
    value: "id + label + value",
    description: "中心节点是独立输入，不和 OrganizationChart 或 Tree 的节点模型合并，避免业务语义混淆。",
  },
  {
    name: "MindMapBranch",
    value: "id + label + value + children",
    description: "分支适合知识结构、规划拆解、会议结论和探索路径，不适合严格组织汇报线。",
  },
  {
    name: "layout",
    value: "balanced left/right",
    description: "一级分支按索引分布到左右两侧，子树按可见叶子数量分配垂直空间。",
  },
  {
    name: "connector",
    value: "cubic Bezier path",
    description: "连接线统一输出 SVG C 三次贝塞尔曲线路径，避免硬折线破坏思维导图的层级流动感。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "外层沿用 ChartFrame，通过 title / summary 连接 aria-labelledby 和 aria-describedby。",
  },
  {
    name: "svg",
    value: "svg[role=img]",
    description: "SVG 提供 title / desc；加载、错误或空态时从辅助技术中隐藏，状态层承担反馈。",
  },
  {
    name: "node",
    value: "g + rect + text",
    description: "节点文本均为 React / SVG text node，不通过 innerHTML 渲染。",
  },
  {
    name: "toggle",
    value: "svg rect[role=button]",
    description: "可收起节点覆盖透明 SVG rect 命中层，暴露 aria-expanded、aria-label，并支持 Enter / Space。",
  },
  {
    name: "viewport",
    value: "g.c-mind-map__viewport",
    description: "缩放和平移只作用于内部 viewport 分组，连接线保持 vector-effect=non-scaling-stroke。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "readable scroll",
    description: "导图保持稳定 viewBox，窄屏收敛到可读宽度后通过图表容器横向/纵向滚动查看，避免节点互相压缩或整页溢出。",
  },
  {
    name: "touch",
    value: "button controls + scroll",
    description: "移动端保留图表容器滚动和独立视图按钮；拖动画布只在桌面指针启用，避免和页面滚动抢手势。",
  },
  {
    name: "labels",
    value: "bounded text",
    description: "标签和值限制长度，防止单词或异常文本撑破节点；业务结论应写在 summary。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "text",
    value: "React text nodes",
    description: "root、branches、summary、title 均按文本渲染；不接受 HTML 字符串。",
  },
  {
    name: "depth",
    value: "1-6",
    description: "depth 被收敛到固定范围，降低超深输入造成的布局和性能风险。",
  },
  {
    name: "node budget",
    value: "bounded traversal",
    description: "节点清洗、输入计数和可见布局都受 relationNodes 预算约束；超长文档流应先搜索、分页或生成摘要再渲染。",
  },
  {
    name: "styles.colors",
    value: "hex only",
    description: "色板复用 chart palette 校验，仅接受 #rgb / #rrggbb / #rrggbbaa。",
  },
  {
    name: "ids",
    value: "bounded string",
    description: "id、label、value 都会做空白归一和长度限制，避免 SVG 属性和 aria 文本无限膨胀。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "node",
    value: "#ffffff / #fbfbfa / #dededb",
    description: "节点使用近白背景、细边框和低对比阴影，贴合当前组件库的 neutral minimal 方向。",
  },
  {
    name: "root",
    value: "#2c2c2a",
    description: "中心节点默认深色，保证第一视口能直接识别主题。",
  },
  {
    name: "branch",
    value: "neutral / sage / clay / plum / amber-gray",
    description: "一级分支使用低饱和中性色板辅助扫描，避免 AntD 蓝感，但不把含义只绑定到颜色上。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "PASS: root / branches / depth / collapse",
    description: "MindMap 用于主题发散和知识拆解，不和 OrganizationChart 的岗位层级或 Tree 的控件语义混用。",
  },
  {
    name: "UI",
    value: "PASS: balanced layout + bounded text",
    description: "左右分布减少单侧过长；节点尺寸稳定，长标签截断，移动端使用安全滚动、平移和缩放控件。",
  },
  {
    name: "研发",
    value: "PASS: self-owned SVG / HTML",
    description: "无 antd、antd-mobile、@ant-design/charts；布局算法局部、可读，缩放只变换 SVG viewport 分组。",
  },
  {
    name: "测试",
    value: "PASS: states / keyboard / mobile / long labels",
    description: "验收覆盖路由渲染、状态层、收起按钮、Enter/Space、缩放按钮和 360px/390px 无页面级横向溢出。",
  },
  {
    name: "白帽",
    value: "PASS: text escaping / bounded input / safe colors",
    description: "不使用 dangerouslySetInnerHTML；颜色校验、深度收敛和字符串限制降低异常输入风险。",
  },
];

function DemoCard({ code, compact, description, preview, title }: Demo) {
  return (
    <article className={compact ? "demo-container mind-map-doc-demo mind-map-doc-demo--compact" : "demo-container mind-map-doc-demo"}>
      <div className="demo-container__header">
        <h3 className="demo-container__title">{title}</h3>
        <p className="demo-container__description">{description}</p>
      </div>
      <div className="demo-container__preview demo-container__preview--surface mind-map-doc-demo__preview">{preview}</div>
      <pre className="demo-container__code button-doc-code" aria-label={`${title} 代码`} tabIndex={0}>
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

export function MindMapDoc({ showAnchors = false }: MindMapDocProps) {
  return (
    <TutorialScaffold component="MindMap" kind="display" oneLineExample={oneLineExample}>
    <section className="mind-map-doc" aria-labelledby="mind-map-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="MindMap 文档目录">
            {mindMapDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="mind-map-doc-title">{mindMapDocMeta.title}</h2>
            <p>
              自有 SVG 思维导图组件，用教程壳层呈现真实预览和一行样例；它和 OrganizationChart、Tree
              保持独立语义，重点覆盖多行节点、贝塞尔连接线、收起按钮、缩放、暗色和移动端边界。
            </p>
          </header>

          <section className="button-doc-section" id="mind-map-when" aria-labelledby="mind-map-when-title">
            <h3 id="mind-map-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当需要围绕一个主题组织想法、方案、风险、会议结论或知识点时使用。</li>
              <li>当数据表达严格上下级岗位、组织汇报线或可选择树控件时，不应使用 MindMap。</li>
              <li>当前适合小中型层级；超大图应先补虚拟化、搜索定位或专门画布交互。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mind-map-demos" aria-labelledby="mind-map-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="mind-map-demos-title">代码演示</h3>
              <p>教程样例统一使用真实 SVG 预览和单行代码，覆盖布局、受控收起、多行文本、theme style、structure style 和大数据边界。</p>
            </div>
            <div className="mind-map-doc-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
            <div className="mind-map-doc-grid mind-map-doc-grid--states">
              {stateDemos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="mind-map-api" aria-labelledby="mind-map-api-title">
            <h3 id="mind-map-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="mind-map-structure" aria-labelledby="mind-map-structure-title">
            <h3 id="mind-map-structure-title">数据结构</h3>
            <DataTable rows={structureRows} />
          </section>

          <section className="button-doc-section" id="mind-map-interaction" aria-labelledby="mind-map-interaction-title">
            <div className="button-doc-section__heading">
              <h3 id="mind-map-interaction-title">交互</h3>
              <p>收起能力是 MindMap 的可选交互，而不是 Tree 控件复刻。节点按钮只负责展开/收起当前分支。</p>
            </div>
            <ul className="button-doc-list">
              <li>点击有子节点的分支可收起或展开，按钮暴露 aria-expanded。</li>
              <li>聚焦分支后按 Enter 或 Space 执行同样操作。</li>
              <li>视图工具栏支持上下左右平移、放大、缩小和重置；桌面可拖动画布，Ctrl / Command + 滚轮可缩放。</li>
              <li>受控模式适合持久化导图视图；非受控模式适合静态文档示例。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mind-map-semantic" aria-labelledby="mind-map-semantic-title">
            <h3 id="mind-map-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="mind-map-mobile" aria-labelledby="mind-map-mobile-title">
            <h3 id="mind-map-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="mind-map-security" aria-labelledby="mind-map-security-title">
            <h3 id="mind-map-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="mind-map-token" aria-labelledby="mind-map-token-title">
            <h3 id="mind-map-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="mind-map-review" aria-labelledby="mind-map-review-title">
            <div className="button-doc-section__heading">
              <h3 id="mind-map-review-title">五角色审查</h3>
              <p>产品、UI、研发、测试、白帽结论已纳入组件边界、交互、状态和验收。</p>
            </div>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
