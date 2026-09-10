import type { ReactNode } from "react";
import { Descriptions, Tag } from "../components/base";
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

export type DescriptionsDocProps = {
  showAnchors?: boolean;
};

export const descriptionsDocMeta = {
  title: "Descriptions 描述列表",
  category: "基础组件",
  anchors: [
    { id: "descriptions-experts", label: "专家结论" },
    { id: "descriptions-when", label: "何时使用" },
    { id: "descriptions-demos", label: "代码演示" },
    { id: "descriptions-api", label: "API" },
    { id: "descriptions-semantic", label: "Semantic DOM" },
    { id: "descriptions-responsive", label: "响应式" },
    { id: "descriptions-token", label: "Design Token" },
    { id: "descriptions-a11y", label: "可访问性" },
    { id: "descriptions-security", label: "安全" },
    { id: "descriptions-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const releaseItems = [
  { key: "status", label: "Status", value: <Tag tone="strong">Ready</Tag> },
  { key: "owner", label: "Owner", value: "Component platform" },
  { key: "environment", label: "Environment", value: "Production" },
  { key: "region", label: "Region", value: "us-east-1" },
  { key: "window", label: "Maintenance window", value: "2026-06-07 21:00 UTC" },
  { key: "request", label: "Request id", value: "req_01JY0KQH5M2W3VTZ9R4N6P7S8A" },
];

const longItems = [
  { key: "endpoint", label: "Endpoint", value: "https://api.example.internal/v1/release-gates/very-long-service-name-with-unbroken-token-01JY0KQH5M2W3VTZ9R4N6P7S8A" },
  { key: "summary", label: "Summary", value: "Descriptions keeps labels and values readable when content contains long URLs, hashes, or user-provided prose. Text wraps inside the cell instead of increasing page width.", span: 2 },
  { key: "fallback", label: "Fallback", value: "" },
  { key: "safe", label: "<img src=x onerror=alert(1)>", value: "<script>alert('safe text')</script>" },
];

const demos: Demo[] = [
  {
    title: "一行接入",
    description: "最小样例保持一行，便于在详情页、抽屉或确认页直接接入。",
    preview: (
      <div className="descriptions-doc__one-line" aria-label="Descriptions single row acceptance example">
        <Descriptions
          aria-label="Release one-line facts"
          bordered
          column={{ default: 3, sm: 1 }}
          items={releaseItems.slice(0, 3)}
          size="sm"
        />
      </div>
    ),
    code: `<Descriptions aria-label="Release facts" bordered column={{ default: 3, sm: 1 }} items={items} size="sm" />`,
  },
  {
    title: "基础对象详情",
    description: "默认使用 dl 语义，适合对象事实、配置摘要和详情页元信息。",
    preview: <Descriptions title="Release detail" items={releaseItems} column={3} />,
    code: `<Descriptions title="Release detail" column={3} items={[{ key: "status", label: "Status", value: <Tag tone="strong">Ready</Tag> }, { key: "owner", label: "Owner", value: "Component platform" }]} />`,
  },
  {
    title: "边框与顶部标签",
    description: "bordered 适合需要明确单元边界的后台详情；labelPlacement=\"top\" 提升长标签可读性。",
    preview: (
      <Descriptions
        bordered
        column={{ default: 3, md: 2, sm: 1 }}
        items={releaseItems}
        labelPlacement="top"
        size="sm"
        title="Deployment metadata"
      />
    ),
    code: `<Descriptions bordered column={{ default: 3, md: 2, sm: 1 }} labelPlacement="top" size="sm" title="Deployment metadata" items={items} />`,
  },
  {
    title: "table 语义",
    description: "当信息需要行列关联或导出友好结构时使用 semantic=\"table\"，窄屏会转为块状展示。",
    preview: (
      <Descriptions
        bordered
        caption="Incident metadata"
        column={2}
        items={[
          { key: "severity", label: "Severity", value: "S2" },
          { key: "assignee", label: "Assignee", value: "Reliability team" },
          { key: "impact", label: "Impact", value: "Checkout degraded for a subset of traffic.", span: 2 },
        ]}
        labelPlacement="top"
        semantic="table"
        title="Incident detail"
      />
    ),
    code: `<Descriptions bordered caption="Incident metadata" column={2} labelPlacement="top" semantic="table" title="Incident detail" items={items} />`,
  },
  {
    title: "长文本与空值",
    description: "内容槽不解析 HTML 字符串；长 URL、hash、安全文本和空值都在组件内部处理为可读布局。",
    preview: <Descriptions bordered column={{ default: 2, sm: 1 }} emptyText="Pending" items={longItems} title="Runtime facts" />,
    code: `<Descriptions bordered column={{ default: 2, sm: 1 }} emptyText="Pending" items={longTextItems} title="Runtime facts" />`,
  },
  {
    title: "空列表边界",
    description: "items 为空时仍保留可读的键值占位，不渲染空白区域，也不出现未定义文案。",
    preview: <Descriptions aria-label="Empty release facts" bordered column={{ default: 4, md: 2, sm: 1 }} emptyText="No metadata" items={[]} />,
    code: `<Descriptions aria-label="Empty release facts" bordered column={{ default: 4, md: 2, sm: 1 }} emptyText="No metadata" items={[]} />`,
  },
];

const expertRows: DocRow[] = [
  { name: "产品专家", value: "独立基础组件", description: "Descriptions 面向通用对象详情，不与业务层 PropertyList 合并，避免基础能力被业务语义锁死。" },
  { name: "UI 专家", value: "低噪声信息密度", description: "默认无边框、可选 bordered；标签和值保持灰黑层级，长内容优先换行，不制造横向页面滚动。" },
  { name: "研发专家", value: "items-first API", description: "支持 items、column、span、size、labelPlacement、semantic 与 responsive，ReactNode 内容由调用方组合。" },
  { name: "测试专家", value: "移动端验收", description: "覆盖 desktop、360px、390px、430px 宽度、mobile 单列、长 token、bordered、dl/table 两种语义和响应式折列。" },
  { name: "白帽专家", value: "安全文本", description: "组件不解析字符串为 HTML、不发起网络请求、不引入 antd 系依赖，XSS 风险留给 React 默认转义处理。" },
];

const apiRows: DocRow[] = [
  { name: "items", value: "DescriptionsItem[]", description: "必填。每项包含 key、label、value/children、span 和 className 钩子。" },
  { name: "column", value: "number | { default?, sm?, md?, lg? }", description: "列数，限制在 1-4。响应式对象可声明移动和中屏折列。" },
  { name: "bordered", value: "boolean", description: "显示外框与单元格分隔线。适合高密度后台详情和对照数据。" },
  { name: "size", value: '"sm" | "md" | "lg"', description: "控制内边距与字号，默认 md。" },
  { name: "labelPlacement", value: '"start" | "top"', description: "标签和值横向排列或上下排列。长标签、窄容器建议 top。" },
  { name: "semantic", value: '"dl" | "table"', description: "默认 dl。需要明确行列表格语义时可切换 table。" },
  { name: "responsive", value: "boolean", description: "默认 true。移动端自动折列，table 模式转为块状行。" },
  { name: "title / caption", value: "ReactNode", description: "title 渲染为 section 标题；caption 仅在 table 语义下渲染为原生 caption。" },
  { name: "emptyText", value: "ReactNode", description: "value/children 为空时展示的占位内容，默认 Not set。" },
  { name: "HTMLAttributes", value: "section attributes", description: "透传 aria-*、id、data-* 等根元素属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section.c-descriptions", description: "承载标题、语义列表或表格，并接收 aria-labelledby。" },
  { name: "dl mode", value: "dl / dt / dd", description: "默认模式，表达一组术语和值；span 通过 CSS grid 控制视觉宽度。" },
  { name: "table mode", value: "table / caption / th / td", description: "用于表格式详情。labelPlacement=start 使用 th[scope=row]，top 使用 th[scope=col]。" },
  { name: "empty", value: "span.c-descriptions__empty-value", description: "空值有独立 muted 样式，不与真实字符串混淆。" },
];

const responsiveRows: DocRow[] = [
  { name: "desktop", value: "default / lg", description: "最多 4 列，适合详情页和抽屉中的对象元信息。" },
  { name: "tablet", value: "md", description: "默认降到最多 2 列，避免侧栏和文档预览区拥挤。" },
  { name: "mobile", value: "sm = 1 / 360px / 390px / 430px", description: "默认单列；table 模式转块状，不让页面整体横向溢出。" },
  { name: "long text", value: "overflow-wrap:anywhere", description: "URL、hash、超长英文 token 会在单元格内断行。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "bordered 模式主体背景。" },
  { name: "surfaceSubtle", value: "#fbfbfa", description: "table label、caption 和 filler 背景。" },
  { name: "border", value: "#dededb / #ededeb", description: "外框和单元格分隔线。" },
  { name: "text", value: "#1f1f1d", description: "值内容和标题。" },
  { name: "textMuted", value: "#696967 / #8a8a86", description: "标签、空值和辅助文本。" },
  { name: "radius", value: "8px desktop / 6px mobile", description: "和其他基础数据展示组件保持一致。" },
];

const accessibilityRows: DocRow[] = [
  { name: "section name", value: "title / aria-label", description: "有 title 时自动绑定 aria-labelledby；无 title 时建议传 aria-label。" },
  { name: "native semantics", value: "dl or table", description: "默认使用原生描述列表；table 模式保留 caption、th、td 关联。" },
  { name: "visual order", value: "items order", description: "响应式只改变列数，不重排 items 顺序。" },
  { name: "content", value: "ReactNode", description: "交互控件可作为 value 放入，但调用方需保证控件名称和焦点顺序。" },
];

const securityRows: DocRow[] = [
  { name: "HTML strings", value: "not parsed", description: "Descriptions 不提供 dangerouslySetInnerHTML，不执行 Markdown 或 HTML 字符串。" },
  { name: "safe text", value: "React escaped", description: "例如 <img src=x onerror=alert(1)> 会作为普通文本渲染，而不是节点或脚本。" },
  { name: "dependencies", value: "self-owned", description: "不依赖 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "data", value: "caller-owned", description: "组件不请求远程数据、不缓存敏感信息、不记录埋点。" },
];

const faqRows: DocRow[] = [
  { name: "和 PropertyList 怎么选？", value: "基础 vs 业务", description: "Descriptions 是基础数据展示组件；PropertyList 是业务层对象属性摘要，支持 badge、loading、error 等业务壳。" },
  { name: "是否支持编辑？", value: "不内置", description: "Descriptions 只展示静态详情；编辑请组合 Form/Input 或业务组件。" },
  { name: "为什么支持 table？", value: "语义选择", description: "部分对象详情确实需要表格关联、caption 或导出结构；普通键值说明仍推荐 dl。" },
];

function DocTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">项</th>
            <th scope="col">类型 / 结论</th>
            <th scope="col">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.value}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DescriptionsDoc({ showAnchors = true }: DescriptionsDocProps) {
  return (
    <TutorialScaffold component="Descriptions" kind="display" oneLineExample={`<Descriptions items={items} column={{ default: 3, sm: 1 }} />`}>
    <main className="button-doc descriptions-doc">
      <div className="button-doc__layout button-doc__layout--with-toc">
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Descriptions 文档目录">
            {descriptionsDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Base / Data Display</p>
            <h2>Descriptions 描述列表</h2>
            <p>
              自有生产级对象详情组件，覆盖 dl/table 语义选择、响应式折列、边框密度、标签位置和长文本换行。
              它是基础组件，不和业务层 PropertyList 合并文档或实现。
            </p>
            <code>import {"{ Descriptions }"} from "./components/base";</code>
          </header>

          <section className="button-doc-section" id="descriptions-experts" aria-labelledby="descriptions-experts-title">
            <div className="button-doc-section__heading">
              <h3 id="descriptions-experts-title">五专家小组结论</h3>
              <p>产品、UI、研发、测试和白帽共同确认组件边界与验收重点。</p>
            </div>
            <DocTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="descriptions-when" aria-labelledby="descriptions-when-title">
            <div className="button-doc-section__heading">
              <h3 id="descriptions-when-title">何时使用</h3>
              <p>用于详情页、抽屉、确认页和只读配置摘要；不用于可编辑表单、大量数据行或复杂业务状态流。</p>
            </div>
            <ul className="button-doc-list">
              <li>对象字段数量有限，需要按标签和值快速扫描。</li>
              <li>需要在桌面多列、移动单列之间保持阅读顺序稳定。</li>
              <li>需要选择真实 dl 语义或 table 语义，而不是只有视觉栅格。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="descriptions-demos" aria-labelledby="descriptions-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="descriptions-demos-title">代码演示</h3>
              <p>覆盖 items、column、bordered、size、labelPlacement、semantic、responsive collapse 和长文本换行。</p>
            </div>
            <div className="button-doc-demo-grid descriptions-doc-demo-grid">
              {demos.map((demo) => (
                <article className="button-doc-demo" key={demo.title}>
                  <div className="button-doc-demo__meta">
                    <h3>{demo.title}</h3>
                    <p>{demo.description}</p>
                  </div>
                  <div className="button-doc-demo__preview">{demo.preview}</div>
                  <pre className="button-doc-code" aria-label={`${demo.title} 代码`}>
                    <code>{demo.code}</code>
                  </pre>
                </article>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="descriptions-api" aria-labelledby="descriptions-api-title"><h3 id="descriptions-api-title">API</h3><DocTable rows={apiRows} /></section>
          <section className="button-doc-section" id="descriptions-semantic" aria-labelledby="descriptions-semantic-title"><h3 id="descriptions-semantic-title">Semantic DOM</h3><DocTable rows={semanticRows} /></section>
          <section className="button-doc-section" id="descriptions-responsive" aria-labelledby="descriptions-responsive-title"><h3 id="descriptions-responsive-title">响应式</h3><DocTable rows={responsiveRows} /></section>
          <section className="button-doc-section" id="descriptions-token" aria-labelledby="descriptions-token-title"><h3 id="descriptions-token-title">Design Token</h3><DocTable rows={tokenRows} /></section>
          <section className="button-doc-section" id="descriptions-a11y" aria-labelledby="descriptions-a11y-title"><h3 id="descriptions-a11y-title">可访问性</h3><DocTable rows={accessibilityRows} /></section>
          <section className="button-doc-section" id="descriptions-security" aria-labelledby="descriptions-security-title"><h3 id="descriptions-security-title">安全</h3><DocTable rows={securityRows} /></section>
          <section className="button-doc-section" id="descriptions-faq" aria-labelledby="descriptions-faq-title"><h3 id="descriptions-faq-title">FAQ</h3><DocTable rows={faqRows} /></section>
        </div>
      </div>
    </main>
      </TutorialScaffold>
);
}
