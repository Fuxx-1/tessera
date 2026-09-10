import { useState, type ReactNode } from "react";
import { ConfigProvider, Tag } from "../components/base";
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

export type TagDocProps = {
  showAnchors?: boolean;
};

export const tagDocMeta = {
  title: "Tag 标签",
  category: "基础组件",
  anchors: [
    { id: "tag-when", label: "何时使用" },
    { id: "tag-demos", label: "代码演示" },
    { id: "tag-api", label: "API" },
    { id: "tag-semantic", label: "Semantic DOM" },
    { id: "tag-token", label: "Design Token" },
    { id: "tag-a11y", label: "可访问性" },
    { id: "tag-mobile", label: "移动端" },
    { id: "tag-coverage", label: "覆盖范围" },
    { id: "tag-review", label: "五视角复核" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "基础标签",
    description: "neutral 是默认标签，subtle 降低存在感，strong 用于少量高优先级元信息。",
    preview: (
      <div className="doc-demo-row tag-doc-one-line" aria-label="Tag single row tone examples">
        <Tag>base</Tag>
        <Tag tone="subtle">subtle</Tag>
        <Tag tone="strong">production</Tag>
        <Tag size="md">medium</Tag>
      </div>
    ),
    code: `<Tag>base</Tag> <Tag tone="subtle">subtle</Tag> <Tag tone="strong">production</Tag> <Tag size="md">medium</Tag>`,
  },
  {
    title: "状态与自定义色",
    description: "tone 给标签赋予稳定的业务状态色；color 仅接收安全 hex，用于少量品牌或团队分类。",
    preview: (
      <div className="doc-demo-row">
        <Tag tone="success">ready</Tag>
        <Tag tone="warning">review</Tag>
        <Tag tone="danger">blocked</Tag>
        <Tag status="processing">running</Tag>
        <Tag color="#6f5d73">custom</Tag>
      </div>
    ),
    code: `<Tag tone="success">ready</Tag> <Tag tone="warning">review</Tag> <Tag tone="danger">blocked</Tag> <Tag status="processing">running</Tag> <Tag color="#6f5d73">custom</Tag>`,
  },
  {
    title: "强状态",
    description: "strong 与状态 tone 都应少量使用，避免状态标签在密集界面里抢走主动作层级。",
    preview: (
      <div className="doc-demo-row">
        <Tag tone="strong">live</Tag>
        <Tag tone="warning">delayed</Tag>
        <Tag tone="danger">incident</Tag>
        <Tag tone="info">deploying</Tag>
      </div>
    ),
    code: `<Tag tone="strong">live</Tag> <Tag tone="warning">delayed</Tag> <Tag tone="danger">incident</Tag> <Tag tone="info">deploying</Tag>`,
  },
  {
    title: "图标、长文本与安全文本",
    description: "icon 作为装饰内容渲染，长文本在受限宽度内省略；文本按 ReactNode 输出，不解释为 HTML。",
    preview: (
      <div className="doc-demo-row doc-demo-row--constrained">
        <Tag icon={<span>*</span>} tone="info" title="background sync job with long label">background sync job with long label</Tag>
        <Tag icon={<span>!</span>} tone="warning">requires owner review</Tag>
        <Tag tone="subtle">{"<img src=x onerror=alert(1)>"}</Tag>
      </div>
    ),
    code: `<Tag icon={<span>*</span>} tone="info" title="background sync job with long label">background sync job with long label</Tag> <Tag icon={<span>!</span>} tone="warning">requires owner review</Tag> <Tag tone="subtle">{"<img src=x onerror=alert(1)>"}</Tag>`,
  },
  {
    title: "浅色与暗色",
    description: "Tag 在浅色和 ConfigProvider dark 边界中保持状态色、边框和关闭按钮可读。",
    preview: (
      <div className="doc-demo-row">
        <Tag tone="success">light ready</Tag>
        <ConfigProvider theme="dark" className="tag-doc-dark-surface">
          <Tag tone="success">dark ready</Tag>
          <Tag tone="warning">dark watch</Tag>
          <Tag color="#6f5d73">dark custom</Tag>
        </ConfigProvider>
      </div>
    ),
    code: `<Tag tone="success">light ready</Tag> <ConfigProvider theme="dark"><Tag tone="success">dark ready</Tag><Tag tone="warning">dark watch</Tag><Tag color="#6f5d73">dark custom</Tag></ConfigProvider>`,
  },
  {
    title: "关闭与选择",
    description: "可关闭标签使用独立按钮，可选择标签渲染为 button 并暴露 aria-pressed；closable=false 可保留回调但不渲染关闭控件。",
    preview: <TagInteractionDemo />,
    code: `const [visible, setVisible] = useState(true);
const [checked, setChecked] = useState(false);

{visible ? (
  <Tag tone="info" closeAriaLabel="移除筛选 Owner" onClose={() => setVisible(false)}>
    Owner: Ada
  </Tag>
) : null}
<Tag checkable checked={checked} onCheckedChange={setChecked}>
  selected
</Tag>
<Tag closable={false} onClose={() => setVisible(false)}>
  locked
</Tag>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "标签文本或轻量内容。建议保持短句或短词。" },
  { name: "size", value: '"sm" | "md"', description: "控制高度、字号和内边距。默认 sm。" },
  { name: "tone", value: '"neutral" | "subtle" | "strong" | "success" | "warning" | "danger" | "info"', description: "控制视觉层级和业务状态色。默认 neutral。" },
  { name: "status", value: '"default" | "neutral" | "success" | "warning" | "error" | "processing"', description: "状态语义别名；error 映射为 danger，processing 映射为 info。" },
  { name: "color", value: "string", description: "自定义 hex 强调色，例如 #6f5d73；非法 CSS 值会被忽略，避免 URL 或脚本注入。" },
  { name: "icon", value: "ReactNode", description: "可选装饰图标，会以 aria-hidden 渲染。" },
  { name: "onClose", value: "() => void", description: "传入后渲染关闭按钮，调用方负责从列表中移除该标签。" },
  { name: "closable", value: "boolean", description: "显式控制关闭按钮是否渲染；closable=false 可用于不可关闭边界。" },
  { name: "closeAriaLabel", value: "string", description: "关闭按钮的可访问名称，默认“移除标签”。" },
  { name: "checkable", value: "boolean", description: "渲染为可切换 button，适合筛选标签；通过 checked 和 onCheckedChange 受控。" },
  { name: "checked", value: "boolean", description: "checkable 的受控选中态，默认 false。" },
  { name: "onCheckedChange", value: "(checked: boolean) => void", description: "checkable 状态变化回调。" },
  { name: "disabled", value: "boolean", description: "禁用可点击、可选择或可关闭标签。" },
  { name: "dangerouslySetInnerHTML", value: "never", description: "Tag 只接收 ReactNode 内容，不开放 HTML 字符串注入入口。" },
  { name: "HTMLAttributes", value: "span / button native props", description: "静态标签透传 span 属性，交互标签透传 button 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "span.c-tag / button.c-tag", description: "静态或可关闭标签以 span 承载；可点击和可选择标签以 button 承载。" },
  { name: "icon", value: "span.c-tag__icon", description: "图标槽默认为装饰内容，避免和文本重复朗读。" },
  { name: "label", value: "span.c-tag__label", description: "承载文本并在窄容器内省略，调用方可用 title 提供完整值。" },
  { name: "close", value: "button.c-tag__close", description: "关闭按钮具备独立 aria-label，并阻止事件冒泡。" },
];

const tokenRows: DocRow[] = [
  { name: "radius", value: "6px", description: "与 Tessera 工具型控件保持一致，不使用过度胶囊化。" },
  { name: "neutral", value: "#f0f0ee / #696967", description: "默认标签背景和文本色。" },
  { name: "subtle", value: "#fbfbfa / #8a8a86", description: "弱化标签，适合辅助元信息。" },
  { name: "strong", value: "#111110 / #ffffff", description: "高强调标签，数量应受控。" },
  { name: "status colors", value: "success / warning / error / processing", description: "使用低饱和状态面和深色文本，保证可读性。" },
  { name: "custom color", value: "--c-tag-custom-*", description: "color 会派生背景、边框和文本 CSS 变量，并过滤非 hex 值。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Name", value: "children", description: "可访问名称来自文本内容；只有图标时必须传入 aria-label。" },
  { name: "Icon", value: "aria-hidden", description: "icon 被视为装饰，不参与朗读，状态含义应写在文本中。" },
  { name: "Checkable", value: "button + aria-pressed", description: "checkable 标签可通过 Enter / Space 切换，状态由 aria-pressed 暴露。" },
  { name: "Closable", value: "named close button", description: "关闭按钮必须有能说明删除对象的 closeAriaLabel，例如“移除筛选 Owner”。" },
  { name: "Contrast", value: "state tokens", description: "状态文本使用深色而不是只靠背景色区分。" },
  { name: "Theme", value: "light / dark", description: "ConfigProvider dark 边界下状态色仍有独立背景、边框和文本色。" },
];

const mobileRows: DocRow[] = [
  { name: "Width", value: "max-width: 100%", description: "Tag 不会超过父容器，长文本会省略。" },
  { name: "Density", value: "22px / 28px", description: "sm 和 md 适合密集信息展示；粗指针设备上的交互标签会提升到 40px 以上。" },
  { name: "Wrapping", value: "parent controls wrap", description: "多个 Tag 的换行由外层 flex/grid 管理。" },
];

const coverageRows: DocRow[] = [
  { name: "已覆盖", value: "size / tone / status / color / icon / onClose / checkable", description: "当前满足分类、状态、自定义色、元信息、关闭和筛选选择场景。" },
  { name: "不支持", value: "bordered=false / color preset names", description: "暂不实现无边框 API 或预设色名；color 只接收 hex，非法 CSS 值会被忽略。" },
  { name: "组合关系", value: "Table / PropertyList / StatusTimeline", description: "Tag 适合作为业务组件中的短元信息，不承担复杂交互；本文档不合并其他组件文档。" },
];

const reviewRows: DocRow[] = [
  { name: "产品视角", value: "PASS", description: "覆盖分类、状态、关闭、筛选选择和密集元信息，不承担导航或复杂反馈职责。" },
  { name: "设计视角", value: "PASS", description: "中性层级、状态色、6px 圆角、focus-visible 和移动触控尺寸保持一致。" },
  { name: "研发视角", value: "PASS", description: "自有 React + scoped CSS 实现，覆盖 checked、closable、onClose、color 与导出，不依赖 antd、antd-mobile 或外部 UI 套件。" },
  { name: "测试视角", value: "PASS", description: "#tag smoke 覆盖 tone、color、onClose、checkable、icon、长文本、desktop 与 360/390/430 移动端溢出和一行样例。" },
  { name: "安全视角", value: "PASS", description: "children 与 icon 均为 ReactNode 渲染，组件类型排除 dangerouslySetInnerHTML。" },
];

function TagInteractionDemo() {
  const [visible, setVisible] = useState(true);
  const [checked, setChecked] = useState(false);

  return (
    <div className="doc-demo-row">
      {visible ? (
        <Tag tone="info" closeAriaLabel="移除筛选 Owner" onClose={() => setVisible(false)}>
          Owner: Ada
        </Tag>
      ) : (
        <Tag tone="subtle">removed</Tag>
      )}
      <Tag checkable checked={checked} onCheckedChange={setChecked}>
        {checked ? "selected" : "selectable"}
      </Tag>
      <Tag checkable checked={false} disabled>
        disabled
      </Tag>
      <Tag tone="subtle" closable={false} onClose={() => setVisible(false)}>
        locked
      </Tag>
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
              <td><code>{row.name}</code></td>
              <td><code>{row.value}</code></td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TagDoc({ showAnchors = false }: TagDocProps) {
  return (
    <TutorialScaffold component="Tag" kind="display" oneLineExample={`<Tag tone="success">Ready</Tag>`}>
    <section className="button-doc" aria-labelledby="tag-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Tag 文档目录">
            {tagDocMeta.anchors.map((anchor) => <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>)}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tag-doc-title">{tagDocMeta.title}</h2>
            <p>用于展示短标签、分类、状态和元信息。Tag 支持静态展示、关闭和轻量筛选选择，不承担导航语义。</p>
          </header>

          <section className="button-doc-section" id="tag-when" aria-labelledby="tag-when-title">
            <h3 id="tag-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于列表、表格、卡片和属性面板中的短分类、状态或环境标识。</li>
              <li>状态含义必须通过文本表达，不只依赖颜色。</li>
              <li>需要筛选选择或移除单个条件时，可使用 checkable 或 onClose；需要导航时使用链接或 Button。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tag-demos" aria-labelledby="tag-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tag-demos-title">代码演示</h3>
              <p>示例覆盖层级、状态、强状态、图标、长文本和移动端省略行为。</p>
            </div>
            <div className="button-doc-demo-grid">{demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}</div>
          </section>

          <section className="button-doc-section" id="tag-api" aria-labelledby="tag-api-title"><h3 id="tag-api-title">API</h3><DataTable rows={apiRows} /></section>
          <section className="button-doc-section" id="tag-semantic" aria-labelledby="tag-semantic-title"><h3 id="tag-semantic-title">Semantic DOM</h3><DataTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="tag-token" aria-labelledby="tag-token-title"><h3 id="tag-token-title">Design Token</h3><DataTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="tag-a11y" aria-labelledby="tag-a11y-title"><h3 id="tag-a11y-title">可访问性</h3><DataTable rows={accessibilityRows} /></section>
          <section className="button-doc-section" id="tag-mobile" aria-labelledby="tag-mobile-title"><h3 id="tag-mobile-title">移动端</h3><DataTable rows={mobileRows} /></section>
          <section className="button-doc-section" id="tag-coverage" aria-labelledby="tag-coverage-title"><h3 id="tag-coverage-title">覆盖范围</h3><DataTable rows={coverageRows} /></section>
          <section className="button-doc-section" id="tag-review" aria-labelledby="tag-review-title"><h3 id="tag-review-title">五视角复核</h3><DataTable rows={reviewRows} /></section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
