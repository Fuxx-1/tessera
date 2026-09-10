import type { ReactNode } from "react";
import { OrganizationChart } from "../components/charts";
import type { OrganizationChartNode } from "../components/charts";
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

export type OrganizationChartDocProps = {
  showAnchors?: boolean;
};

export const organizationChartDocMeta = {
  title: "OrganizationChart 组织架构图",
  category: "可视化组件",
  anchors: [
    { id: "organization-chart-when", label: "何时使用" },
    { id: "organization-chart-demos", label: "代码演示" },
    { id: "organization-chart-api", label: "API" },
    { id: "organization-chart-layout", label: "布局" },
    { id: "organization-chart-semantic", label: "Semantic DOM" },
    { id: "organization-chart-mobile", label: "移动端" },
    { id: "organization-chart-security", label: "安全" },
    { id: "organization-chart-review", label: "五角色审查" },
    { id: "organization-chart-production", label: "生产边界" },
  ],
} satisfies ComponentDocMeta;

const productOrg: OrganizationChartNode = {
  id: "ceo",
  title: "Avery Chen-Williams",
  subtitle: "General Manager, Global Product Operations",
  avatar: "AC",
  children: [
    {
      id: "product",
      title: "Mina Park-Rodriguez",
      subtitle: "Product Lead, Growth & Platform Experience",
      avatar: "MP",
      children: [
        {
          id: "growth",
          title: "Growth Product Management",
          subtitle: "Activation, onboarding and retention experiments",
          avatar: "GP",
          children: [
            { id: "activation", title: "Activation Program Manager", subtitle: "First-week adoption metrics", avatar: "AP" },
          ],
        },
        { id: "platform-pm", title: "Platform PM", subtitle: "Internal tools", avatar: "PP" },
      ],
    },
    {
      id: "design",
      title: "Noah Liu",
      subtitle: "Design Lead",
      avatar: "NL",
      children: [
        { id: "systems", title: "Design Systems", subtitle: "Components & tokens", avatar: "DS" },
        { id: "research", title: "Research", subtitle: "User signals", avatar: "RS" },
      ],
    },
    {
      id: "engineering",
      title: "Iris Wang",
      subtitle: "Engineering Lead",
      avatar: "IW",
      children: [
        { id: "frontend", title: "Frontend", subtitle: "App surfaces", avatar: "FE" },
        { id: "quality", title: "Quality", subtitle: "Automation & release", avatar: "QA" },
      ],
    },
  ],
};

const compactOrg: OrganizationChartNode = {
  id: "ops",
  title: "Operations",
  subtitle: "Incident command",
  avatar: "OP",
  children: [
    { id: "triage", title: "Triage", subtitle: "First response", avatar: "T1" },
    {
      id: "resolution",
      title: "Resolution",
      subtitle: "Fix ownership",
      avatar: "R2",
      children: [
        { id: "api", title: "API", subtitle: "Service health", avatar: "API" },
        { id: "client", title: "Client", subtitle: "Web surface", avatar: "CL" },
      ],
    },
  ],
};

const platformOrg: OrganizationChartNode = {
  id: "vp-platform",
  title: "Alexandra Montgomery-Kapoor",
  subtitle: "VP Platform Engineering, Developer Productivity and Shared Services",
  avatar: "AM",
  children: Array.from({ length: 7 }, (_, groupIndex) => ({
    id: `platform-group-${groupIndex + 1}`,
    title: `Platform Group ${groupIndex + 1}`,
    subtitle: "Service ownership, reliability and delivery metrics",
    avatar: `G${groupIndex + 1}`,
    children: Array.from({ length: 5 }, (_, teamIndex) => ({
      id: `platform-group-${groupIndex + 1}-team-${teamIndex + 1}`,
      title: `Team ${groupIndex + 1}.${teamIndex + 1} Long-name Ownership Squad`,
      subtitle: "Deep nested reporting line with bounded visible lanes",
      avatar: `T${teamIndex + 1}`,
      children: [
        {
          id: `platform-group-${groupIndex + 1}-team-${teamIndex + 1}-lead`,
          title: "Principal Engineering Manager With Exceptionally Long Display Name",
          subtitle: "Windowed below default visible leaf budget",
          avatar: "PE",
        },
      ],
    })),
  })),
};

const demos: Demo[] = [
  {
    title: "Leadership tree",
    description: "默认布局使用 SVG 连接线和 HTML 节点，覆盖长姓名、长职位、多层级、横向滚动和缩放控制。",
    preview: (
      <OrganizationChart
        summary="General Manager leads Product, Design and Engineering with nested teams and long role labels."
        title="Product organization"
        tree={productOrg}
      />
    ),
    code: `<OrganizationChart tree={orgTree} title="Product organization" summary="General Manager leads nested teams with long role labels." />`,
  },
  {
    title: "Compact layout",
    description: "compact 模式直接堆叠层级，适合移动面板、窄容器和审批链路。",
    preview: <OrganizationChart compact summary="Operations tree with incident triage and resolution ownership." title="Incident ownership" tree={compactOrg} />,
    code: `<OrganizationChart compact tree={opsTree} title="Incident ownership" />`,
  },
  {
    title: "Large bounded tree",
    description: "大树先按默认深度折叠，再按可见节点和叶子泳道窗口化；角标显示隐藏后代，避免超宽 SVG 或移动端失控。",
    preview: (
      <OrganizationChart
        defaultExpandedDepth={2}
        maxVisibleLeaves={18}
        maxVisibleNodes={48}
        summary="Large platform organization with default collapsed groups and bounded visible leaf lanes."
        title="Platform organization"
        tree={platformOrg}
      />
    ),
    code: `<OrganizationChart tree={largeOrg} defaultExpandedDepth={2} maxVisibleNodes={48} maxVisibleLeaves={18} title="Platform organization" />`,
  },
  {
    title: "State coverage",
    description: "空、加载、错误状态沿用 ChartFrame，保持尺寸稳定和 aria-busy / alert 语义。",
    preview: <OrganizationChart emptyText="No reporting line selected" title="Empty organization" tree={null} />,
    code: `<OrganizationChart tree={null} title="Empty organization" emptyText="No reporting line selected" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "tree",
    value: "OrganizationChartNode | null",
    description: "根节点入口。节点包含 id、title、subtitle、avatar 和 children；内部限制最大深度与节点数，避免小组件被超大树拖垮。",
  },
  {
    name: "title / summary",
    value: "string",
    description: "可见标题和业务摘要。summary 同时提供给 figure 与树视图说明，关键层级结论应由业务明确写入。",
  },
  {
    name: "compact",
    value: "boolean",
    description: "切换为堆叠树列表布局；移动端也会自动展示堆叠结构，避免宽图压缩导致不可读。",
  },
  {
    name: "nodeWidth / nodeHeight",
    value: "number",
    description: "控制节点尺寸，内部有最小和最大边界。文本使用截断，不会撑破节点。",
  },
  {
    name: "levelGap / siblingGap",
    value: "number",
    description: "控制层级间距和兄弟节点间距，内部收敛到安全范围并保留横向滚动空间。",
  },
  {
    name: "defaultExpandedDepth",
    value: "number",
    description: "默认展开层级；超过该深度的分支会折叠，用户仍可通过节点角标展开或收起。",
  },
  {
    name: "maxVisibleNodes / maxVisibleLeaves",
    value: "number",
    description: "可见节点数和叶子泳道窗口，避免超大树一次性生成过宽画布；隐藏后代以角标和 notice 告知。",
  },
  {
    name: "onSelect",
    value: "(node) => void",
    description: "节点点击回调。节点本体是 button，可键盘聚焦和触发；复杂选择状态应由业务层受控管理。",
  },
  {
    name: "renderAvatar",
    value: "(node) => ReactNode",
    description: "自定义头像槽。默认使用 avatar 文本或 title 首字母，不加载外部图片。",
  },
];

const layoutRows: DocRow[] = [
  {
    name: "default",
    value: "SVG connectors + absolute HTML nodes",
    description: "用自有树布局计算叶子位置，以 SVG path 绘制折线连接，节点仍保留真实 HTML button 语义。",
  },
  {
    name: "scroll safe",
    value: "min canvas + overflow",
    description: "宽树不会压缩节点，容器支持横向与纵向滚动；触屏可平移查看，文档页不会被宽图撑破。",
  },
  {
    name: "zoom",
    value: "70% - 135%",
    description: "默认画布提供放大、缩小和重置按钮，也支持键盘 + / - / 0 / Home 调整视图比例。",
  },
  {
    name: "collapse",
    value: "node aria-expanded",
    description: "有子节点的卡片暴露 aria-expanded；点击角标或在节点聚焦时用 ArrowLeft / ArrowRight 收起展开。",
  },
  {
    name: "compact",
    value: "nested list",
    description: "堆叠模式展示同一份 tree 数据，不复用 Tree 控件，不引入展开/勾选/拖拽等控件语义。",
  },
  {
    name: "limits",
    value: "120 normalized nodes / 8 levels",
    description: "归一化阶段限制总节点和深度；渲染阶段再限制可见节点与叶子泳道，实现超大树的折叠和窗口化边界。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=figure]",
    description: "沿用 ChartFrame，title / summary 连接到 figure，并在 loading 时设置 aria-busy。",
  },
  {
    name: "tree",
    value: "div[role=tree]",
    description: "可视树区域有可访问名称和说明；节点通过 aria-level / aria-posinset / aria-setsize 暴露层级位置。",
  },
  {
    name: "node",
    value: "button",
    description: "节点可 Tab 聚焦、Enter/Space 激活，aria-label 合并 title 和 subtitle；有子节点时使用 aria-expanded 标识折叠状态。",
  },
  {
    name: "connector",
    value: "svg[aria-hidden=true]",
    description: "连接线是视觉辅助，不单独进入读屏流，避免重复朗读层级。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "360-430px",
    value: "stacked by default",
    description: "窄屏隐藏宽画布并展示可折叠嵌套列表，节点保持 44px 以上可触达高度。",
  },
  {
    name: "wide tree",
    value: "pan + zoom",
    description: "桌面和宽容器保留滚动与缩放，不挤压标题、subtitle 或头像。",
  },
  {
    name: "focus",
    value: "visible outline",
    description: "键盘焦点落在节点卡片上，outline 不依赖颜色深浅判断。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "text",
    value: "React text nodes",
    description: "title、subtitle、avatar、summary 和 error 均由 React 文本节点输出，不使用 dangerouslySetInnerHTML。",
  },
  {
    name: "input bounds",
    value: "normalized tree",
    description: "节点数量、深度、id 和文本长度都有上限；非法或空 title 会回退到 Untitled node。",
  },
  {
    name: "dependencies",
    value: "self-owned SVG/HTML",
    description: "不依赖 antd、antd-mobile、@ant-design/charts 或外部图布局库。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "通过",
    description: "覆盖组织、岗位、汇报线和审批责任链；不把它包装成 Tree 控件，避免使用场景混淆。",
  },
  {
    name: "UI",
    value: "通过",
    description: "节点卡片密度克制，连接线轻量，默认横向树、缩放工具和移动堆叠都保持可读。",
  },
  {
    name: "研发",
    value: "通过",
    description: "自有布局计算，SVG 只画连接线，HTML button 承载节点交互；未引入 ant 系或图表库。",
  },
  {
    name: "测试",
    value: "通过",
    description: "需要覆盖空、加载、错误、单节点、多层级、长文案、compact、缩放、键盘焦点和移动断点。",
  },
  {
    name: "白帽",
    value: "通过",
    description: "无 HTML 注入面；树输入经过数量、深度和文本长度收敛，降低资源滥用和异常 SVG 坐标风险。",
  },
];

const productionRows: DocRow[] = [
  {
    name: "large tree",
    value: "collapse + window",
    description: "默认深度折叠与可见叶子泳道共同限制画布宽度，适合接入大组织数据的首屏浏览。",
  },
  {
    name: "not included",
    value: "search / drag handles",
    description: "生产基础能力已覆盖展示、折叠、缩放、平移、移动端和安全文本；搜索定位与专用拖拽手柄属于后续增强。",
  },
  {
    name: "one-line sample",
    value: `<OrganizationChart tree={org} title="Product organization" />`,
    description: "最小接入只需要 tree 和 title；summary、边界参数和 renderAvatar 按业务需要补充。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="charts-doc-demo">
      <div className="charts-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="charts-doc-demo__preview">{preview}</div>
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

const oneLineExample = "<OrganizationChart tree={productOrg} title=\"Product organization\" />";

export function OrganizationChartDoc({ showAnchors = false }: OrganizationChartDocProps) {
  return (
    <TutorialScaffold component="OrganizationChart" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc" aria-labelledby="organization-chart-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="OrganizationChart 文档目录">
            {organizationChartDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="organization-chart-doc-title">{organizationChartDocMeta.title}</h2>
            <p>
              自有 SVG/HTML 组织架构图，用于展示组织、岗位和汇报层级。它和 Tree 控件、MindMap
              主题发散图保持独立模型与独立文档。
            </p>
          </header>

          <section className="button-doc-section" id="organization-chart-when" aria-labelledby="organization-chart-when-title">
            <h3 id="organization-chart-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>展示组织架构、岗位汇报线、项目责任链或审批责任关系。</li>
              <li>需要节点具备卡片化信息、头像、title/subtitle 和轻量选择回调。</li>
              <li>不要用于文件树、勾选树、拖拽排序树；这些属于 Tree / TreeSelect 控件职责。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="organization-chart-demos" aria-labelledby="organization-chart-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="organization-chart-demos-title">代码演示</h3>
              <p>示例覆盖默认层级、compact 堆叠和状态层。</p>
            </div>
            <div className="charts-doc-demo-grid organization-chart-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="organization-chart-api" aria-labelledby="organization-chart-api-title">
            <h3 id="organization-chart-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-layout" aria-labelledby="organization-chart-layout-title">
            <h3 id="organization-chart-layout-title">布局</h3>
            <DataTable rows={layoutRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-semantic" aria-labelledby="organization-chart-semantic-title">
            <h3 id="organization-chart-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-mobile" aria-labelledby="organization-chart-mobile-title">
            <h3 id="organization-chart-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-security" aria-labelledby="organization-chart-security-title">
            <h3 id="organization-chart-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-review" aria-labelledby="organization-chart-review-title">
            <h3 id="organization-chart-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="organization-chart-production" aria-labelledby="organization-chart-production-title">
            <h3 id="organization-chart-production-title">生产边界</h3>
            <DataTable rows={productionRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
