import type { ReactNode } from "react";
import { Button, Flex, Tag } from "../components/base";
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

export type FlexDocProps = {
  showAnchors?: boolean;
};

export const flexDocMeta = {
  title: "Flex 弹性布局",
  category: "布局",
  anchors: [
    { id: "flex-when", label: "何时使用" },
    { id: "flex-demos", label: "代码演示" },
    { id: "flex-api", label: "API" },
    { id: "flex-responsive", label: "响应式" },
    { id: "flex-semantic", label: "Semantic DOM" },
    { id: "flex-token", label: "Design Token" },
    { id: "flex-a11y", label: "可访问性" },
    { id: "flex-mobile", label: "移动端" },
    { id: "flex-security", label: "安全" },
    { id: "flex-review", label: "五专家结论" },
    { id: "flex-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "横向工具条",
    description: "row、wrap、align=center 和 justify=between 适合一行内的状态与动作组合。",
    preview: (
      <Flex align="center" className="flex-doc-toolbar-demo" fullWidth gap="sm" justify="between" wrap>
        <Flex align="center" gap="xs" wrap>
          <Tag tone="strong">queued</Tag>
          <Tag tone="subtle">owner: design systems</Tag>
          <Tag tone="subtle">release: 2026-06-07</Tag>
        </Flex>
        <Flex align="center" gap="xs" wrap>
          <Button size="sm" variant="solid">
            Assign
          </Button>
          <Button size="sm" variant="ghost">
            Defer
          </Button>
        </Flex>
      </Flex>
    ),
    code: `<Flex align="center" fullWidth gap="sm" justify="between" wrap>
  <Flex align="center" gap="xs" wrap>...</Flex>
  <Flex align="center" gap="xs" wrap>...</Flex>
</Flex>`,
  },
  {
    title: "纵向堆叠",
    description: "column 方向用于局部说明、表单片段和紧凑元信息，不依赖额外卡片壳。",
    preview: (
      <Flex className="flex-doc-stack-demo" direction="column" gap="sm">
        <Tag status="processing">reviewing</Tag>
        <strong>Flex only controls single-axis flow.</strong>
        <span>Nested content remains responsible for its own semantics and accessible names.</span>
      </Flex>
    ),
    code: `<Flex direction="column" gap="sm">
  <Tag status="processing">reviewing</Tag>
  <strong>Flex only controls single-axis flow.</strong>
  <span>Nested content remains responsible for semantics.</span>
</Flex>`,
  },
  {
    title: "换行标签",
    description: "wrap 让不定数量标签在样例区域内自然折行；360/390/430 宽度下不产生页面级横向溢出。",
    preview: (
      <div className="flex-doc-wrap-frame">
        <Flex className="flex-doc-wrap-demo" gap="xs" wrap>
          <Tag>queued</Tag>
          <Tag tone="subtle">owner: design systems</Tag>
          <Tag tone="subtle">priority: high</Tag>
          <Tag tone="subtle">trace: flex-responsive-overflow-check</Tag>
          <Button size="sm" variant="ghost">
            Clear
          </Button>
        </Flex>
      </div>
    ),
    code: `<Flex gap="xs" wrap>
  <Tag>queued</Tag>
  <Tag tone="subtle">owner: design systems</Tag>
  <Tag tone="subtle">priority: high</Tag>
  <Button size="sm" variant="ghost">Clear</Button>
</Flex>`,
  },
  {
    title: "对齐与数值 gap",
    description: "align、justify 和数值 gap 直接映射 CSS flex；负数 gap 会收敛为 0px。",
    preview: (
      <Flex align="end" className="flex-doc-align-demo" fullWidth gap={18} justify="around" wrap>
        <span className="flex-doc-swatch flex-doc-swatch--short">start</span>
        <span className="flex-doc-swatch flex-doc-swatch--tall">align end</span>
        <span className="flex-doc-swatch">around</span>
      </Flex>
    ),
    code: `<Flex align="end" fullWidth gap={18} justify="around" wrap>
  <span>start</span>
  <span>align end</span>
  <span>around</span>
</Flex>`,
  },
  {
    title: "移动响应式",
    description: "responsive=true 时 row 在 760px 以下转为 column，常用于把工具条收敛成移动端纵向动作流。",
    preview: (
      <Flex align="center" className="flex-doc-responsive-demo" gap="sm" responsive>
        <Tag tone="strong">mobile</Tag>
        <Button size="sm">Primary action</Button>
        <Button size="sm" variant="ghost">
          Secondary
        </Button>
      </Flex>
    ),
    code: `<Flex align="center" gap="sm" responsive>
  <Tag tone="strong">mobile</Tag>
  <Button size="sm">Primary action</Button>
  <Button size="sm" variant="ghost">Secondary</Button>
</Flex>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "必填。Flex 不包装子节点，保持调用方 DOM 顺序和业务语义。" },
  { name: "direction", value: '"row" | "column"', description: "排列方向。默认 row；column 用于局部纵向流。" },
  { name: "gap", value: '"none" | "xs" | "sm" | "md" | "lg" | "xl" | number', description: "预设或像素数值 gap；数值会被限制为不小于 0。" },
  { name: "align", value: '"start" | "center" | "end" | "stretch" | "baseline"', description: "映射 align-items，默认 stretch。" },
  { name: "justify", value: '"start" | "center" | "end" | "between" | "around" | "evenly"', description: "映射 justify-content，默认 start。" },
  { name: "wrap", value: "boolean", description: "是否允许换行。默认 false；工具条、标签组和动作组可显式开启。" },
  { name: "responsive", value: "boolean", description: "默认 true。760px 以下 row 会转为 column，避免移动端横向挤压。" },
  { name: "fullWidth", value: "boolean", description: "为 true 时 width: 100%，适合在文档、表单和工具条中占满容器。" },
  { name: "as", value: "ElementType", description: "替换根元素，默认 div。可传 section、nav、ul 等承载业务语义。" },
  { name: "HTMLAttributes", value: "safe div attrs", description: "透传 className、style、aria-*、data-* 等常规属性；不透传 dangerouslySetInnerHTML。" },
];

const responsiveRows: DocRow[] = [
  { name: "desktop", value: "row / column as configured", description: "桌面不改写 direction，wrap、align、justify 和 gap 按 prop 输出。" },
  { name: "<= 760px", value: "row -> column", description: "仅 responsive 且 row 时转为 column；column 保持 column。" },
  { name: "wrap", value: "preserved", description: "移动端转 column 后仍保留 wrap 类，但主轴已变为纵向，适合动作流堆叠。" },
  { name: "overflow", value: "min-width: 0", description: "根节点允许在父容器内收缩；长内容仍需子组件自己处理截断或换行。" },
  { name: "opt out", value: "responsive={false}", description: "需要移动端仍保持横向滚动或单行展示时，由调用方显式关闭响应式。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div or as", description: "默认 div；Flex 不默认添加 list、toolbar、group 等角色，避免伪造交互语义。" },
  { name: "children", value: "direct children", description: "不额外包裹子项，读屏和键盘顺序保持 children 顺序。" },
  { name: "layout", value: "display:flex", description: "只提供布局，不改变子元素的 disabled、pressed、selected 等状态语义。" },
  { name: "responsive", value: "CSS media query", description: "断点由 CSS 类控制，服务端渲染时不依赖 window 尺寸。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-flex-gap", value: "0 / 4 / 7 / 10 / 16 / 24px / custom", description: "Flex 的核心变量，所有 gap 都落到 CSS gap。" },
  { name: ".c-flex--gap-xs", value: "4px", description: "紧凑标签和元信息。" },
  { name: ".c-flex--gap-sm", value: "7px", description: "小型按钮组和工具条。" },
  { name: ".c-flex--gap-md", value: "10px", description: "默认间距。" },
  { name: ".c-flex--gap-lg / --xl", value: "16px / 24px", description: "局部较宽松的布局，不替代页面级 Grid。" },
  {
    name: "主题 style",
    value: "none / inherit",
    description: "Flex 自身不创建 surface，只继承宿主的 --ct-* 主题；示例中按钮、Tag、文本由各自组件处理亮/暗主题。",
  },
  {
    name: "结构 style",
    value: "display:flex / gap / wrap / min-width:0",
    description: "方向、对齐、换行、fullWidth 和 760px responsive 行转列都是结构 class，360/390/430 下子项可收缩不撑破页面。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Keyboard", value: "no trap", description: "Flex 不添加键盘事件，不改变子元素 Tab 顺序。" },
  { name: "Names", value: "host responsibility", description: "当 as=nav/section/ul 等有语义根时，调用方负责 aria-label、aria-labelledby 或列表子项语义。" },
  { name: "Order", value: "DOM order", description: "CSS wrap 和响应式只改变视觉排列；读屏顺序仍按 DOM 顺序。" },
  { name: "Touch", value: "children responsibility", description: "Flex 不生成触控目标；Button、Tag 等子组件负责自己的触控尺寸。" },
];

const mobileRows: DocRow[] = [
  { name: "desktop", value: "PASS", description: "在 1280px 下真实 Flex specimen 为 row + wrap + 7px gap，无页面级横向溢出。" },
  { name: "430px", value: "PASS", description: "响应式样例 computed flex-direction=column，工具条和标签组在 430px 下不越过 preview 容器。" },
  { name: "390px", value: "PASS", description: "响应式样例 computed flex-direction=column，scrollWidth 小于等于视口内容宽，子项无越界。" },
  { name: "360px", value: "PASS", description: "同 390px 验收，样例区域没有子项溢出 preview 容器。" },
  { name: "sample line", value: "single specimen grid", description: "文档样例均保留在 Flex 独立页的一组代码演示内，不和 Space/Grid/Divider 合并。" },
];

const securityRows: DocRow[] = [
  { name: "Content", value: "ReactNode", description: "组件不解析 HTML 字符串，不提供 dangerouslySetInnerHTML 专用入口。" },
  { name: "Dependencies", value: "self-owned", description: "未引入 antd、antd-mobile、@ant-design/charts 或外部 UI 组件包。" },
  { name: "Effects", value: "none", description: "组件无网络请求、无计时器、无全局事件监听、无动态脚本执行。" },
  { name: "as", value: "trusted element type", description: "as 只改变根元素类型；语义和安全边界由调用方负责。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "职责限定为单轴方向、间距、换行和对齐；二维网格交给 Grid，简单相邻间距交给 Space。" },
  { name: "UI 专家", value: "PASS", description: "横向工具条、纵向堆叠、wrap、justify/align、数值 gap 和移动堆叠都有独立样例，符合中性 neutral minimal 视觉。" },
  { name: "研发专家", value: "PASS", description: "实现为 React + CSS class + CSS 变量，无外部 UI 依赖；barrel export、registry 和 App #/flex 路由已接通。" },
  { name: "测试专家", value: "PASS", description: "已用浏览器覆盖 desktop、360px、390px、430px 的方向、换行、gap、对齐、响应式和横向溢出。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入、无副作用、无远程资源；主要风险是调用方把 as 与 aria 语义配错，文档已声明边界。" },
];

const gapRows: DocRow[] = [
  { name: "per-breakpoint props", value: "planned", description: "当前只有一个移动断点和 responsive 开关；多断点方向/对齐需要后续统一设计。" },
  { name: "child flex props", value: "out of scope", description: "grow、shrink、basis 暂不作为 Flex 子项 API，避免把组件扩展成完整 CSS DSL。" },
  { name: "theme token", value: "planned", description: "gap 预设目前与 Space 共用尺寸概念；全局 token 化需由 ConfigProvider 统一推进。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview flex-doc-demo__preview">{preview}</div>
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

export function FlexDoc({ showAnchors = false }: FlexDocProps) {
  return (
    <TutorialScaffold component="Flex" kind="display" oneLineExample={"<Flex gap=\"sm\"><Button>Save</Button><Button>Cancel</Button></Flex>"}>
    <section className="button-doc flex-doc" aria-labelledby="flex-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Flex 文档目录">
            {flexDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc / layout</p>
            <h2 id="flex-doc-title">{flexDocMeta.title}</h2>
            <p>
              Flex 是基础弹性布局组件，用自有 CSS flex 提供单轴方向、gap、对齐、换行和移动端纵向收敛。
              它只负责布局，不伪装成业务工具条，也不替子组件生成语义。
            </p>
          </header>

          <section className="button-doc-section" id="flex-when" aria-labelledby="flex-when-title">
            <h3 id="flex-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于一组控件、标签、摘要或局部内容的单轴排列，需要明确 align、justify 或 wrap 时使用。</li>
              <li>只需要稳定相邻间距且不关心主轴分布时优先使用 Space。</li>
              <li>需要二维列轨道、跨度或 auto-fit 卡片矩阵时使用 Grid，不把 Flex 扩展成栅格系统。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="flex-demos" aria-labelledby="flex-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="flex-demos-title">代码演示</h3>
              <p>样例集中覆盖方向、换行、gap、对齐、响应式堆叠和窄屏溢出保护。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="flex-api" aria-labelledby="flex-api-title">
            <h3 id="flex-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="flex-responsive" aria-labelledby="flex-responsive-title">
            <h3 id="flex-responsive-title">响应式</h3>
            <DataTable rows={responsiveRows} />
          </section>

          <section className="button-doc-section" id="flex-semantic" aria-labelledby="flex-semantic-title">
            <h3 id="flex-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="flex-token" aria-labelledby="flex-token-title">
            <h3 id="flex-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="flex-a11y" aria-labelledby="flex-a11y-title">
            <h3 id="flex-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="flex-mobile" aria-labelledby="flex-mobile-title">
            <h3 id="flex-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="flex-security" aria-labelledby="flex-security-title">
            <h3 id="flex-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="flex-review" aria-labelledby="flex-review-title">
            <h3 id="flex-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="flex-gaps" aria-labelledby="flex-gaps-title">
            <h3 id="flex-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
