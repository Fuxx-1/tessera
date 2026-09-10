import { useState, type ReactNode } from "react";
import { Button, Segmented, Toolbar, ToolbarGroup } from "../components/base";
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

type SegmentedIconName = "grid" | "list" | "chart";

export type SegmentedDocProps = {
  showAnchors?: boolean;
};

export const segmentedDocMeta = {
  title: "Segmented 分段控制器",
  category: "基础组件",
  anchors: [
    { id: "segmented-when", label: "何时使用" },
    { id: "segmented-demos", label: "代码演示" },
    { id: "segmented-api", label: "API" },
    { id: "segmented-semantic", label: "Semantic DOM" },
    { id: "segmented-keyboard", label: "键盘交互" },
    { id: "segmented-token", label: "Design Token" },
    { id: "segmented-review", label: "五专家复核" },
    { id: "segmented-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const densityOptions = [
  { label: "舒适", value: "comfortable" },
  { label: "标准", value: "regular" },
  { label: "紧凑", value: "compact" },
];

function SegmentedDocIcon({ name }: { name: SegmentedIconName }) {
  const paths = {
    grid: (
      <>
        <rect x="4" y="4" width="5" height="5" rx="1" />
        <rect x="15" y="4" width="5" height="5" rx="1" />
        <rect x="4" y="15" width="5" height="5" rx="1" />
        <rect x="15" y="15" width="5" height="5" rx="1" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M5 19V5" />
        <path d="M5 19h16" />
        <path d="M9 15l3-4 3 2 5-7" />
      </>
    ),
  } satisfies Record<SegmentedIconName, ReactNode>;

  return (
    <svg className="segmented-doc-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function SegmentedDocIconLabel({ icon, text }: { icon: SegmentedIconName; text: string }) {
  return (
    <span className="segmented-doc-icon-label">
      <SegmentedDocIcon name={icon} />
      <span>{text}</span>
    </span>
  );
}

function ControlledDemo() {
  const [value, setValue] = useState("preview");

  return (
    <div className="segmented-doc-stack">
      <Segmented
        label="面板模式"
        hint={`当前模式：${value}`}
        value={value}
        onValueChange={setValue}
        options={[
          { label: "编辑", value: "edit" },
          { label: "预览", value: "preview" },
          { label: "分屏", value: "split" },
        ]}
      />
      <div className="segmented-doc-output" aria-live="polite">
        {value === "edit" ? "显示 Markdown 编辑区" : value === "preview" ? "显示渲染结果" : "编辑和预览并排显示"}
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础切换",
    description: "用于少量互斥选项，默认选中第一个可用项。",
    preview: <Segmented label="列表密度" options={densityOptions} defaultValue="regular" />,
    code: `<Segmented label="列表密度" defaultValue="regular" options={[{ label: "舒适", value: "comfortable" }, { label: "标准", value: "regular" }, { label: "紧凑", value: "compact" }]} />`,
  },
  {
    title: "图标与文本",
    description: "图标作为视觉辅助，文本仍然完整可读，选中态由 aria-checked 和 indicator 同步表达。",
    preview: (
      <Segmented
        label="视图"
        defaultValue="grid"
        options={[
          { label: <SegmentedDocIconLabel icon="grid" text="网格" />, value: "grid" },
          { label: <SegmentedDocIconLabel icon="list" text="列表" />, value: "list" },
          { label: <SegmentedDocIconLabel icon="chart" text="图表" />, value: "chart" },
        ]}
      />
    ),
    code: `<Segmented label="视图" defaultValue="grid" options={[{ label: <IconText icon="grid" text="网格" />, value: "grid" }, { label: <IconText icon="list" text="列表" />, value: "list" }, { label: <IconText icon="chart" text="图表" />, value: "chart" }]} />`,
  },
  {
    title: "受控状态",
    description: "value 与 onValueChange 配合使用，适合筛选、编辑器模式和 URL 状态同步。",
    preview: <ControlledDemo />,
    code: `const [value, setValue] = useState("preview"); <Segmented label="面板模式" value={value} onValueChange={setValue} options={[{ label: "编辑", value: "edit" }, { label: "预览", value: "preview" }, { label: "分屏", value: "split" }]} />`,
  },
  {
    title: "工具栏视图模式",
    description: "放入 Toolbar 时保留内部 radiogroup 语义，Toolbar 负责命令区域分组。",
    preview: (
      <Toolbar compact aria-label="数据表工具栏">
        <ToolbarGroup aria-label="显示模式">
          <Segmented
            size="sm"
            aria-label="显示模式"
            defaultValue="table"
            options={[
              { label: "表格", value: "table" },
              { label: "卡片", value: "cards" },
              { label: "图表", value: "chart" },
            ]}
          />
        </ToolbarGroup>
        <ToolbarGroup aria-label="批量操作">
          <Button size="sm" variant="ghost">
            导出
          </Button>
        </ToolbarGroup>
      </Toolbar>
    ),
    code: `<Toolbar compact aria-label="数据表工具栏"><ToolbarGroup aria-label="显示模式"><Segmented size="sm" aria-label="显示模式" defaultValue="table" options={[{ label: "表格", value: "table" }, { label: "卡片", value: "cards" }, { label: "图表", value: "chart" }]} /></ToolbarGroup></Toolbar>`,
  },
  {
    title: "禁用选项",
    description: "disabled 项不能点击、不能通过键盘选中，也不会成为 roving tab stop。",
    preview: (
      <Segmented
        label="发布范围"
        defaultValue="team"
        options={[
          { label: "仅自己", value: "private" },
          { label: "团队", value: "team" },
          { label: "公开", value: "public", disabled: true, title: "需要审核后开放" },
        ]}
      />
    ),
    code: `<Segmented label="发布范围" defaultValue="team" options={[{ label: "仅自己", value: "private" }, { label: "团队", value: "team" }, { label: "公开", value: "public", disabled: true, title: "需要审核后开放" }]} />`,
  },
  {
    title: "移动宽度与长标签",
    description: "窄容器中组件可以换行，长标签保持可读且不撑破页面。",
    preview: (
      <div className="segmented-doc-mobile-frame">
        <Segmented
          label="时间范围"
          hint="移动端保留 44px 左右的可触控面积。"
          defaultValue="7d"
          options={[
            { label: "今天", value: "today" },
            { label: "最近 7 天", value: "7d" },
            { label: "最近 30 天", value: "30d" },
            { label: "本季度至今", value: "quarter" },
            { label: "自定义范围", value: "custom" },
          ]}
        />
      </div>
    ),
    code: `<Segmented label="时间范围" hint="移动端保留 44px 左右的可触控面积。" defaultValue="7d" options={[{ label: "今天", value: "today" }, { label: "最近 7 天", value: "7d" }, { label: "最近 30 天", value: "30d" }, { label: "本季度至今", value: "quarter" }, { label: "自定义范围", value: "custom" }]} />`,
  },
  {
    title: "长标签与安全文本",
    description: "文本标签由 React 渲染为文本节点，长 token 可换行，不解析 HTML。",
    preview: (
      <Segmented
        label="安全切换"
        defaultValue="plain"
        options={[
          { label: "普通文本", value: "plain" },
          { label: "<img src=x onerror=alert(1)>", value: "unsafe" },
          { label: "trace_segmented_long_label_wrapping_acceptance_2026_06_08", value: "long" },
        ]}
      />
    ),
    code: `<Segmented label="安全切换" defaultValue="plain" options={[{ label: "普通文本", value: "plain" }, { label: "<img src=x onerror=alert(1)>", value: "unsafe" }, { label: "trace_segmented_long_label_wrapping_acceptance_2026_06_08", value: "long" }]} />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "options",
    value: "SegmentedOption[]",
    description: "必填。每个选项包含 value、label，可选 disabled 与 title。",
  },
  {
    name: "value",
    value: "string",
    description: "受控选中值。传入后由调用方负责更新。",
  },
  {
    name: "defaultValue",
    value: "string",
    description: "非受控初始值。未提供时使用第一个非 disabled 选项。",
  },
  {
    name: "onValueChange",
    value: "(value: string) => void",
    description: "选中项变化时触发。disabled 选项不会触发。",
  },
  {
    name: "label",
    value: "ReactNode",
    description: "可见标签，并通过 aria-labelledby 关联到 radiogroup。",
  },
  {
    name: "hint",
    value: "string",
    description: "辅助说明，并通过 aria-describedby 关联到 radiogroup。",
  },
  {
    name: "size",
    value: '"sm" | "md"',
    description: "控制高度和水平内边距。默认 md，工具栏中建议使用 sm。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLDivElement>",
    description: "继承 div 属性，常用 aria-label、id、data-* 和 className。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "field",
    value: "div.c-segmented-field",
    description: "包裹可见 label、radiogroup 和 hint，负责纵向布局。",
  },
  {
    name: "control",
    value: 'div[role="radiogroup"]',
    description: "互斥选项容器。label 存在时使用 aria-labelledby，否则可直接传 aria-label。",
  },
  {
    name: "item",
    value: 'button[role="radio"]',
    description: "每个选项是按钮承载的 radio 语义，使用 aria-checked 表达选中状态。",
  },
  {
    name: "disabled item",
    value: "disabled button",
    description: "禁用项使用原生 disabled，避免被点击、聚焦或提交为可操作控件。",
  },
  {
    name: "toolbar composition",
    value: 'Toolbar > group > radiogroup',
    description: "工具栏负责命令上下文，Segmented 仍保留独立 radiogroup，不改成 toolbar button。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "Tab",
    value: "进入 / 离开组件",
    description: "只让当前选中项或第一个可用项进入 tab 顺序。",
  },
  {
    name: "ArrowRight / ArrowDown",
    value: "下一个可用项",
    description: "循环移动，跳过 disabled 选项，并同步选中值。",
  },
  {
    name: "ArrowLeft / ArrowUp",
    value: "上一个可用项",
    description: "循环移动，跳过 disabled 选项，并同步选中值。",
  },
  {
    name: "Home / End",
    value: "首个 / 末个可用项",
    description: "快速跳转到边界选项。",
  },
  {
    name: "Space / Enter",
    value: "确认当前项",
    description: "聚焦到某个 radio button 后可以用 Space 或 Enter 选择该项；disabled 项仍不会触发。",
  },
  {
    name: "Click",
    value: "选择目标项",
    description: "disabled 项不会触发 onValueChange。",
  },
];

const tokenRows: DocRow[] = [
  { name: "container background", value: "#f0f0ee", description: "分段控件底座背景。" },
  { name: "active background", value: "#ffffff", description: "当前选中项背景。" },
  { name: "indicator", value: "absolute visual layer", description: "桌面单行时滑块跟随选中项，窄屏换行时退化为选中项背景。" },
  { name: "border", value: "#dededb", description: "底座边框。" },
  { name: "text", value: "#1f1f1d", description: "选中项文本。" },
  { name: "text muted", value: "#696967", description: "未选项文本。" },
  { name: "focus", value: "#555552", description: "键盘聚焦轮廓。" },
  { name: "radius", value: "6px / 4px", description: "底座与选项圆角。" },
  { name: "height", value: "30px / 24px", description: "md 与 sm 选项最小高度。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "定位为少量互斥即时切换，不与 Tabs 导航或 Radio 表单场景合并。" },
  { name: "UI 专家", value: "通过", description: "选中态、禁用态、图标+文本、indicator、工具栏小尺寸和移动端换行均保持中性视觉。" },
  { name: "研发专家", value: "通过", description: "自有 React + CSS 实现，未引入 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "覆盖默认/受控、禁用跳过、键盘循环、Home/End、单行样例和窄屏无溢出。" },
  { name: "白帽", value: "通过", description: "label 作为 ReactNode 渲染，不解析 HTML，不使用 dangerouslySetInnerHTML，不发起网络请求。" },
];

const faqItems = [
  {
    question: "它和 RadioGroup 的边界是什么？",
    answer: "Segmented 用于少量、短标签、即时生效的模式切换。表单字段、较长说明或垂直选项应优先用 RadioGroup。",
  },
  {
    question: "为什么工具栏里仍然是 radiogroup？",
    answer: "视图模式、密度、排序这类控件是互斥选择，不是彼此独立的命令按钮。保留 radiogroup 可以让读屏器获得正确上下文。",
  },
  {
    question: "移动端是否支持横向滚动？",
    answer: "当前组件默认换行，避免内容被裁切。需要滚动筛选条时建议由外层容器控制 overflow。",
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

export function SegmentedDoc({ showAnchors = false }: SegmentedDocProps) {
  return (
    <TutorialScaffold component="Segmented" kind="display" oneLineExample={`<Segmented aria-label="View" options={options} defaultValue="table" />`}>
    <section className="button-doc segmented-doc" aria-labelledby="segmented-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Segmented 文档目录">
            {segmentedDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="segmented-doc-title">{segmentedDocMeta.title}</h2>
            <p>
              用于在少量互斥选项之间即时切换。当前实现采用{" "}
              <code>radiogroup</code> + <code>radio</code> 语义、roving tab index、中性色视觉层级和选中态 indicator。
              SegmentedDoc 是独立文档，不合并 Tabs 或 Radio 文档，也不依赖 antd 系组件。
            </p>
          </header>

          <section className="button-doc-section" id="segmented-when" aria-labelledby="segmented-when-title">
            <h3 id="segmented-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于视图模式、密度、时间范围等少量互斥选择，并且切换后立即生效。</li>
              <li>选项应短且可横向浏览，数量建议 2 到 5 个。</li>
              <li>表单问卷、长文本说明、复杂禁用原因优先使用 RadioGroup 或 Select。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="segmented-demos" aria-labelledby="segmented-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="segmented-demos-title">代码演示</h3>
              <p>示例覆盖非受控、图标+文本、受控、Toolbar 组合、禁用项和移动宽度。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="segmented-api" aria-labelledby="segmented-api-title">
            <h3 id="segmented-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="segmented-semantic" aria-labelledby="segmented-semantic-title">
            <h3 id="segmented-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="segmented-keyboard" aria-labelledby="segmented-keyboard-title">
            <h3 id="segmented-keyboard-title">键盘交互 / a11y</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="segmented-token" aria-labelledby="segmented-token-title">
            <h3 id="segmented-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="segmented-review" aria-labelledby="segmented-review-title">
            <h3 id="segmented-review-title">五专家复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="segmented-faq" aria-labelledby="segmented-faq-title">
            <h3 id="segmented-faq-title">FAQ</h3>
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
