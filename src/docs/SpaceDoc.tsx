import type { ReactNode } from "react";
import { Button, Card, ConfigProvider, Space, Tag } from "../components/base";
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

export type SpaceDocProps = {
  showAnchors?: boolean;
};

const anchors = [
  { id: "space-when", label: "何时使用" },
  { id: "space-demos", label: "代码演示" },
  { id: "space-api", label: "API" },
  { id: "space-semantic", label: "Semantic DOM" },
  { id: "space-token", label: "Design Token" },
  { id: "space-a11y", label: "可访问性" },
  { id: "space-mobile", label: "移动端" },
  { id: "space-security", label: "安全" },
  { id: "space-review", label: "五专家结论" },
  { id: "space-gaps", label: "缺口" },
];

const demos: Demo[] = [
  {
    title: "水平间距",
    description: "默认水平排列并居中对齐，适合按钮、标签和短文本动作组。",
    preview: (
      <Space className="space-doc-horizontal-demo" size="md" wrap>
        <Button size="sm" variant="solid">
          Apply
        </Button>
        <Button size="sm">Save draft</Button>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
      </Space>
    ),
    code: `<Space size="md" wrap><Button size="sm" variant="solid">Apply</Button><Button size="sm">Save draft</Button><Button size="sm" variant="ghost">Cancel</Button></Space>`,
  },
  {
    title: "垂直间距",
    description: "垂直方向用于表单片段、摘要块和列表内的局部节奏。",
    preview: (
      <Space block className="space-doc-vertical-demo" direction="vertical" size="sm">
        <Tag tone="strong">ready</Tag>
        <span className="space-doc-note">Spacing remains stable when the line wraps on mobile viewports.</span>
        <Button size="sm">Open review</Button>
      </Space>
    ),
    code: `<Space block direction="vertical" size="sm"><Tag tone="strong">ready</Tag><span>Spacing remains stable.</span><Button size="sm">Open review</Button></Space>`,
  },
  {
    title: "Wrap 换行",
    description: "水平 wrap 用于无法预估数量的标签或动作，不额外引入 Grid/Flex 结构。",
    preview: (
      <div className="space-doc-wrap-frame">
        <Space className="space-doc-wrap-demo" size="xs" wrap>
          <Tag>queued</Tag>
          <Tag tone="subtle">owner: design systems</Tag>
          <Tag tone="subtle">priority: high</Tag>
          <Tag tone="subtle">release: 2026-06-07</Tag>
          <Button size="sm" variant="ghost">
            Clear
          </Button>
        </Space>
      </div>
    ),
    code: `<Space size="xs" wrap><Tag>queued</Tag><Tag tone="subtle">owner: design systems</Tag><Tag tone="subtle">priority: high</Tag><Button size="sm" variant="ghost">Clear</Button></Space>`,
  },
  {
    title: "Compact 与 Split",
    description: "size=\"xs\" 和 split 适合紧凑元信息；分隔符标记为装饰内容。",
    preview: (
      <Space className="space-doc-compact-demo" size="xs" split={<span>/</span>} wrap={false}>
        <span>Space</span>
        <span>layout</span>
        <span>compact</span>
      </Space>
    ),
    code: `<Space size="xs" split={<span>/</span>} wrap={false}><span>Space</span><span>layout</span><span>compact</span></Space>`,
  },
  {
    title: "交互子项状态",
    description: "Space 不接管子项状态；按钮的 disabled/loading/focus 仍由子组件自己处理，间距和换行保持稳定。",
    preview: (
      <Space block className="space-doc-state-demo" size="sm" wrap>
        <Button size="sm" variant="solid">
          Primary action
        </Button>
        <Button disabled size="sm">
          Disabled
        </Button>
        <Button loading size="sm" variant="ghost">
          Syncing
        </Button>
        <Tag status="success">saved</Tag>
      </Space>
    ),
    code: `<Space block size="sm" wrap><Button size="sm" variant="solid">Primary action</Button><Button disabled size="sm">Disabled</Button><Button loading size="sm" variant="ghost">Syncing</Button><Tag status="success">saved</Tag></Space>`,
  },
  {
    title: "数值 Gap 与 Block",
    description: "数值 size 通过 CSS 变量落到 gap，block 让整组占满容器但仍保持子项最小宽度可收缩。",
    preview: (
      <Card title="Release row" description="The card uses a block Space for a full-width action row.">
        <Space block className="space-doc-gap-demo" size={18} wrap>
          <Tag status="processing">reviewing</Tag>
          <span className="space-doc-note">custom 18px gap</span>
          <Button size="sm" variant="solid">
            Confirm
          </Button>
        </Space>
      </Card>
    ),
    code: `<Space block size={18} wrap><Tag status="processing">reviewing</Tag><span>custom 18px gap</span><Button size="sm" variant="solid">Confirm</Button></Space>`,
  },
  {
    title: "长 Children 与暗色面",
    description: "ReactNode 子项按文本安全转义；长内容可收缩换行，按钮在移动触控视口不被挤压。",
    preview: (
      <ConfigProvider className="space-doc-dark-surface" theme="dark">
        <Space block className="space-doc-long-demo" size="sm" wrap>
          <Tag tone="subtle">escaped text</Tag>
          <span className="space-doc-note">{"<img src=x onerror=alert(1)> stays text, not HTML"}</span>
          <span className="space-doc-note">release-channel/component-space/owner-design-system/very-long-child-content</span>
          <Button size="sm" variant="solid">
            Review safely
          </Button>
        </Space>
      </ConfigProvider>
    ),
    code: `<Space block size="sm" wrap><Tag tone="subtle">escaped text</Tag><span>{"<img src=x onerror=alert(1)> stays text, not HTML"}</span><Button size="sm" variant="solid">Review safely</Button></Space>`,
  },
  {
    title: "一行样例",
    description: "最小导入后的常见一行动作组，便于复制到表单 footer 或工具条尾部。",
    preview: (
      <Space className="space-doc-one-line-demo" size="sm">
        <Tag tone="strong">ready</Tag>
        <Button size="sm">Review</Button>
      </Space>
    ),
    code: `<Space size="sm"><Tag tone="strong">ready</Tag><Button size="sm">Review</Button></Space>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "必填。每个子节点会包裹为 c-space__item，以便统一 gap 和对齐。" },
  { name: "direction", value: '"horizontal" | "vertical"', description: "排列方向。默认 horizontal。" },
  { name: "size", value: '"none" | "xs" | "sm" | "md" | "lg" | "xl" | number', description: "预设或像素数值 gap；数值会被限制为不小于 0。" },
  { name: "align", value: '"start" | "center" | "end" | "stretch"', description: "映射到 align-items。默认 center。" },
  { name: "wrap", value: "boolean", description: "是否允许水平换行。水平默认 true，垂直默认 false。" },
  { name: "split", value: "ReactNode", description: "子项之间的装饰分隔符，渲染为 aria-hidden 的 c-space__split。" },
  { name: "block", value: "boolean", description: "为 true 时根节点 display:flex 且 width:100%，适合占满容器的行。" },
  { name: "as", value: "ElementType", description: "替换根元素，默认 div。用于需要 section、nav、ul 等语义时。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "透传 className、style、aria-*、data-* 等常规属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div or as", description: "默认 div；需要导航或列表语义时由调用方通过 as 提供更合适的根元素。" },
  { name: "item", value: ".c-space__item", description: "每个子节点包裹一层 span，统一对齐和最小宽度收缩。" },
  { name: "split", value: 'span[aria-hidden="true"]', description: "分隔符只做视觉分隔，不进入读屏顺序。" },
  { name: "layout", value: "inline-flex / flex", description: "默认 inline-flex，block 或 vertical 使用 flex；间距由 gap 控制。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-space-gap", value: "0 / 4 / 7 / 10 / 16 / 24px / custom", description: "Space 的唯一核心变量，所有 size 都落到 CSS gap。" },
  { name: ".c-space--xs", value: "4px", description: "最紧凑元信息或 split 文本。" },
  { name: ".c-space--sm", value: "7px", description: "表单片段和垂直小节奏。" },
  { name: ".c-space--md", value: "10px", description: "默认动作组间距。" },
  { name: ".c-space--lg / --xl", value: "16px / 24px", description: "较松散的局部布局，不替代页面级 Grid/Flex。" },
  {
    name: "主题 style",
    value: "none / inherit",
    description: "Space 自身不创建背景或边框，只继承宿主 --ct-* 主题；split 使用 --ct-text-tertiary 保持亮/暗弱化效果。",
  },
  {
    name: "结构 style",
    value: "inline-flex / gap / item wrapper / split",
    description: "方向、wrap、block、align、split 和 gap fallback 都是结构样式，移动端通过换行和 min-width:0 避免 overflow。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Keyboard", value: "no trap", description: "Space 不改变子元素 tab 顺序，也不增加键盘事件。" },
  { name: "Names", value: "host responsibility", description: "按钮、输入等子元素仍需自己提供可访问名称；Space 不合成 label。" },
  { name: "Split", value: "aria-hidden", description: "视觉分隔符不被读出，避免紧凑元信息出现多余标点。" },
  { name: "DOM order", value: "children order", description: "渲染顺序和传入 children 一致，wrap 只改变视觉换行。" },
  { name: "Interactive state", value: "child owned", description: "disabled、loading、focus、pressed 等交互状态由 Button、Tag 或业务控件保留，Space 只维护稳定间距。" },
];

const mobileRows: DocRow[] = [
  { name: "360 / 390 / 430", value: "PASS", description: "样例在 360px、390px 和 430px 视口下无页面级横向溢出。" },
  { name: "Wrap", value: "horizontal", description: "默认水平 Space 允许换行，长标签和动作组能自然折行。" },
  { name: "Overflow", value: "min-width: 0", description: "根节点和 item 都设置 min-width: 0，长文本可在容器内收缩。" },
  { name: "Touch", value: "button safe", description: "Space 不压缩 Button 触控高度；移动触控视口仍保持可点按尺寸。" },
  { name: "Vertical", value: "block friendly", description: "垂直 Space 可配合 block 占满父容器，移动端不产生多余横向尺寸。" },
];

const securityRows: DocRow[] = [
  { name: "Content", value: "ReactNode", description: "组件不解析 HTML 字符串，React 会安全转义 children 文本；类型层排除 dangerouslySetInnerHTML。" },
  { name: "Dependencies", value: "self-owned", description: "未引入 antd、antd-mobile、@ant-design/charts 或外部 UI 组件包。" },
  { name: "Effects", value: "none", description: "组件无网络请求、无计时器、无全局事件监听、无动态脚本执行。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "Space 只解决相邻元素间距，不扩展为栅格、对齐系统或业务容器；使用边界清晰。" },
  { name: "UI 专家", value: "PASS", description: "间距刻度与中性视觉一致，水平、垂直、wrap、compact、split、暗浅色可读和自定义 gap 均有独立样例。" },
  { name: "研发专家", value: "PASS", description: "实现基于 React Children.toArray、CSS gap 和受限枚举 class；覆盖 size、direction、wrap、align、split、block 和导出。" },
  { name: "测试专家", value: "PASS", description: "文档和 smoke 校验覆盖 desktop、360px、390px、430px 的方向、wrap、compact、gap、触控尺寸和溢出。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入、无外部 UI 依赖、无副作用；split 为 aria-hidden，避免装饰符干扰辅助技术。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview space-doc-demo__preview">{preview}</div>
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

export function SpaceDoc({ showAnchors = false }: SpaceDocProps) {
  return (
    <TutorialScaffold
      component="Space"
      kind="display"
      oneLineExample={`<Space size="sm"><Tag>Ready</Tag><Tag>Stable</Tag></Space>`}
    >
      <section className="button-doc space-doc" aria-labelledby="space-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Space 文档目录">
              {anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="space-doc-title">Space 间距</h2>
              <p>
                Space 为一组相邻元素提供稳定 gap。它不负责页面级布局、不做业务容器，也不引入外部 UI 依赖；需要复杂分布时应使用 Flex、Grid 或 Layout。
              </p>
            </header>

          <section className="button-doc-section" id="space-when" aria-labelledby="space-when-title">
            <h3 id="space-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当按钮、Tag、短文本或局部表单项需要固定间距时使用。</li>
              <li>需要简单垂直节奏时使用 direction="vertical"，不要为了页面结构滥用 Space。</li>
              <li>元素数量不确定且允许折行时开启 wrap；需要主轴分布、对齐策略或响应式列宽时使用 Flex/Grid。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="space-demos" aria-labelledby="space-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="space-demos-title">代码演示</h3>
              <p>预览覆盖水平、垂直、wrap、compact、split、交互状态、block、长 children、暗浅色和数值 gap；末尾保留一行样例规范。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="space-api" aria-labelledby="space-api-title">
            <h3 id="space-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="space-semantic" aria-labelledby="space-semantic-title">
            <h3 id="space-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="space-token" aria-labelledby="space-token-title">
            <h3 id="space-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="space-a11y" aria-labelledby="space-a11y-title">
            <h3 id="space-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="space-mobile" aria-labelledby="space-mobile-title">
            <h3 id="space-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="space-security" aria-labelledby="space-security-title">
            <h3 id="space-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="space-review" aria-labelledby="space-review-title">
            <h3 id="space-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="space-gaps" aria-labelledby="space-gaps-title">
            <h3 id="space-gaps-title">缺口</h3>
            <p>
              当前 Space 不支持 AntD Compact 子组件、自动插入表单 label 间距、响应式 size map 或主轴 justify。跨组件建议：如后续需要按钮紧凑组合，应独立设计 Compact/ButtonGroup，而不是把它塞进 Space。
            </p>
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
