import type { ReactNode } from "react";
import { Button, Tag } from "../components/base";
import { PropertyList } from "../components/business";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
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

export type PropertyListDocProps = {
  showAnchors?: boolean;
};

export const propertyListDocMeta = {
  title: "PropertyList 属性列表",
  category: "业务组件",
  anchors: [
    { id: "property-list-when", label: "何时使用" },
    { id: "property-list-demos", label: "代码演示" },
    { id: "property-list-api", label: "API" },
    { id: "property-list-states", label: "状态" },
    { id: "property-list-semantic", label: "Semantic DOM" },
    { id: "property-list-token", label: "Design Token" },
    { id: "property-list-a11y", label: "a11y" },
    { id: "property-list-mobile", label: "mobile" },
    { id: "property-list-security", label: "security" },
    { id: "property-list-review", label: "五专家结论" },
    { id: "property-list-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<PropertyList title="Release metadata" columns={2} items={items} />`;

const demos: Demo[] = [
  {
    title: "属性一行验收",
    description: "同一个 PropertyList 覆盖三列键值、badge、补充说明、空值和长值；移动端收敛为单列。",
    preview: (
      <div className="property-list-doc__one-line" aria-label="PropertyList single row acceptance example">
        <PropertyList
          columns={3}
          description="Release object summary used in details, drawer bodies, and operation panels; key, value, status, copy, and action all stay in one component boundary."
          emptyValue="Unscheduled"
          items={[
            {
              id: "environment",
              label: "Environment",
              value: "Production",
              status: "Healthy",
              statusTone: "success",
              badge: <Tag tone="strong">live</Tag>,
            },
            {
              id: "owner",
              label: "Owner",
              value: "Platform component team",
              action: <Button size="sm" variant="ghost">Open owner</Button>,
            },
            { id: "window", label: "Maintenance window", value: "", description: "Empty string is rendered as a visible fallback." },
            {
              id: "request",
              label: "Request id",
              value: "deploy_2026_06_07_property_list_release_candidate_8f6c2d4b90c1",
              copy: <Button size="sm" variant="ghost">Copy</Button>,
              description: "Long identifiers wrap inside the value cell.",
            },
            {
              id: "endpoint",
              label: "Callback URL",
              value: "https://internal.example.test/releases/property-list/acceptance/very-long-path-with-query?region=ap-southeast-1&owner=platform",
              status: "Pending DNS verification",
              statusTone: "warning",
            },
            { id: "approver", label: "Approver", value: null, emptyValue: "Pending review" },
          ]}
          title="Release metadata"
        />
      </div>
    ),
    code: `<PropertyList title="Release metadata" columns={3} emptyValue="Unscheduled" items={[{ id: "environment", label: "Environment", value: "Production", status: "Healthy", badge: <Tag>live</Tag> }, { id: "owner", label: "Owner", value: "Platform component team", action: <Button>Open owner</Button> }, { id: "request", label: "Request id", value: "deploy_...", copy: <Button>Copy</Button> }, { id: "window", label: "Maintenance window", value: "" }, { id: "approver", label: "Approver", value: null, emptyValue: "Pending review" }]} />`,
  },
  {
    title: "密度与堆叠",
    description: "compact 用于抽屉、弹层和详情侧栏；stack 强制单列，适合审计信息和窄容器。",
    preview: (
      <PropertyList
        aria-label="Audit properties"
        density="compact"
        emptyValue="Not captured"
        items={[
          { id: "actor", label: "Actor", value: "ops-reviewer@example.test" },
          { id: "source", label: "Source", value: "Tessera acceptance runner" },
          { id: "ip", label: "IP allowlist" },
        ]}
        layout="stack"
      />
    ),
    code: `<PropertyList aria-label="Audit properties" density="compact" layout="stack" items={auditItems} />`,
  },
  {
    title: "加载、错误和空态",
    description: "状态壳由组件边界提供，section 同步 aria-busy，错误和空态有明确可访问语义。",
    preview: (
      <div className="property-list-doc__state-stack">
        <PropertyList loading loadingLabel="Loading release properties" items={[]} title="Loading state" />
        <PropertyList error="Release metadata source is unavailable." items={[]} title="Error state" />
        <PropertyList empty="No properties have been attached." items={[]} title="Empty state" />
      </div>
    ),
    code: `<PropertyList loading loadingLabel="Loading release properties" items={[]} /><PropertyList error="Release metadata source is unavailable." items={[]} /><PropertyList empty="No properties have been attached." items={[]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "PropertyListItem[]", description: "必填属性入口；每项需要稳定 id、label，可选 value、description、badge、status、copy、action 和 item 级 emptyValue。" },
  { name: "title / description", value: "ReactNode", description: "可选区域标题和说明；有 title 且宿主未传 aria 名称时自动关联 section。" },
  { name: "columns", value: "1 | 2 | 3", description: "控制桌面属性网格列数；移动端统一收敛为单列。" },
  { name: "layout", value: "grid | stack", description: "grid 按列展示，stack 强制单列，适合抽屉、弹层、窄侧栏和审计信息。" },
  { name: "density", value: "comfortable | compact", description: "comfortable 用于详情页，compact 用于高密度业务容器。" },
  { name: "items[].status / statusTone", value: "ReactNode / neutral | success | warning | critical", description: "状态是属性元信息而非值本身；tone 只改变弱语义外观，文本仍需自带含义。" },
  { name: "items[].copy / action", value: "ReactNode", description: "复制和行级动作槽位由宿主传入自有 Button/IconButton，并负责权限、回调和反馈。" },
  { name: "emptyValue", value: "ReactNode", description: "统一缺省值；未传值、null、空字符串和 false 都渲染为可见 fallback。" },
  { name: "loading / error / empty", value: "boolean / ReactNode / ReactNode", description: "内置加载骨架、错误 alert 和空态 status，避免业务方重复拼装状态壳。" },
  { name: "loadingLabel", value: "string", description: "加载骨架的可访问名称，默认 Loading properties。" },
];

const stateRows: DocRow[] = [
  { name: "ready", value: "section > dl", description: "每项用 dt/dd 表达属性名和值；badge 和 description 是补充，不替代值。" },
  { name: "empty value", value: "emptyValue", description: "空值渲染为弱化文本，读屏和视觉用户都能知道该属性未设置。" },
  { name: "loading", value: "aria-busy + role=status", description: "根节点同步 aria-busy，骨架带 loadingLabel。" },
  { name: "error", value: "role=alert", description: "错误态优先于空态和 ready 内容，明确提示数据源不可用。" },
  { name: "empty", value: "role=status", description: "items 为空且无错误/加载时渲染空态文案。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "属性摘要是独立业务区域；可通过 title、aria-label 或 aria-labelledby 命名。" },
  { name: "content", value: "dl > div > dt + dd", description: "使用描述列表表达键值关系，不用表格伪装，也不合并到 Descriptions。" },
  { name: "status / badge", value: "span", description: "status 和 badge 是短状态或元信息；复杂交互应放到 action，不塞进 dt。" },
  { name: "copy / action", value: "ReactNode slot", description: "槽位保留宿主传入节点的原生按钮语义，不重写 onClick、type、disabled 或 aria 属性。" },
  { name: "states", value: "status / alert", description: "加载、空态和错误态都有明确角色，便于辅助技术宣布。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白业务面、细边框、低阴影，保持 neutral minimal 中性详情页质感。" },
  { name: "cell border", value: "#ececea", description: "单元格用更轻边线分隔，避免表格化压迫感。" },
  { name: "radius", value: "7px / 8px", description: "内部网格 7px，外层业务容器 8px，不超过既有设计系统边界。" },
  { name: "text", value: "12px label / 14px value", description: "标签弱化、值加重，适合快速扫描对象详情。" },
  { name: "status tone", value: "neutral / success / warning / critical", description: "状态色保持低饱和；文本含义优先，不只靠颜色传达。" },
  { name: "wrap", value: "overflow-wrap:anywhere", description: "长 URL、hash、用户输入长词在桌面和移动端都不撑破容器。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "PropertyList 独立承担业务对象属性摘要，不与基础 Descriptions 合并；DescriptionList 仅作为兼容别名。" },
  { name: "UI 专家", value: "通过", description: "桌面三列可扫描，375px/390px 收敛单列；长值、空值、badge 和说明均可读。" },
  { name: "研发专家", value: "通过", description: "只消费 React、自有 Tag 和自有业务组件；未引入 antd、antd-mobile、@ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "文档样例覆盖一行验收、key/value/status/copy/action、长值、空字符串、null、状态壳、compact/stack 和移动断点。" },
  { name: "白帽专家", value: "通过", description: "组件不解析 HTML 字符串、不执行动态代码；React 默认转义文本值，富内容由宿主显式传入 ReactNode。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack property-list-doc-demo">{preview}</div>
    </DemoContainer>
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

export function PropertyListDoc({ showAnchors = false }: PropertyListDocProps) {
  return (
    <TutorialScaffold component="PropertyList" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc property-list-doc" aria-labelledby="property-list-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="PropertyList 文档目录">
            {propertyListDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component</p>
            <h2 id="property-list-doc-title">{propertyListDocMeta.title}</h2>
            <p>
              PropertyList 是生产级业务属性摘要组件，用于在详情页、抽屉、弹层和操作面板中展示稳定键值关系。
              它保持独立文档和业务边界，不合并进基础 Descriptions。
            </p>
            <code>import {"{ PropertyList }"} from "./components/business";</code>
          </header>

          <section className="button-doc-section" id="property-list-when" aria-labelledby="property-list-when-title">
            <h3 id="property-list-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于对象详情、发布摘要、审计信息和审批上下文中的业务属性列表。</li>
              <li>需要 badge、status、copy/action 槽位、业务状态壳、空值 fallback、compact 密度或抽屉单列时使用 PropertyList。</li>
              <li>只做基础数据展示、跨行合并或表格式描述时，使用基础 Descriptions。</li>
              <li>需要编辑字段、分组折叠或超大数据量时，由 Form、Collapse、Table 或虚拟化方案组合承担。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="property-list-demos" aria-labelledby="property-list-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="property-list-demos-title">代码演示</h3>
              <p>样例保持一行验收入口，并覆盖状态、长值、空值和移动收敛。</p>
            </div>
            <div className="button-doc-demo-grid property-list-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="property-list-api" aria-labelledby="property-list-api-title">
            <h3 id="property-list-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="property-list-states" aria-labelledby="property-list-states-title">
            <h3 id="property-list-states-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="property-list-semantic" aria-labelledby="property-list-semantic-title">
            <h3 id="property-list-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="property-list-token" aria-labelledby="property-list-token-title">
            <h3 id="property-list-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="property-list-a11y" aria-labelledby="property-list-a11y-title">
            <h3 id="property-list-a11y-title">a11y</h3>
            <ul className="button-doc-list">
              <li>根节点是 section，有 title 时自动通过 aria-labelledby 命名；宿主仍可显式传 aria-label。</li>
              <li>真实内容使用 dl/dt/dd 表达键值关系，状态内容使用 role=status 或 role=alert。</li>
              <li>空值始终渲染为可读 fallback，不让读屏遇到静默空白。</li>
              <li>状态不只靠 badge 或 status 色彩表达，status 文本和 badge 文本必须自带含义。</li>
              <li>copy/action 槽位保留宿主按钮语义；复制成功提示、权限禁用和焦点反馈由宿主按钮实现。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="property-list-mobile" aria-labelledby="property-list-mobile-title">
            <h3 id="property-list-mobile-title">mobile</h3>
            <p>
              375px 和 390px 断点按单列属性流验收；标签、值、badge 和 description 都允许换行，
              页面不应出现横向滚动。compact + stack 是抽屉和窄侧栏推荐组合。
            </p>
          </section>

          <section className="button-doc-section" id="property-list-security" aria-labelledby="property-list-security-title">
            <h3 id="property-list-security-title">security</h3>
            <p>
              不允许引入 antd、antd-mobile 或 @ant-design/charts。PropertyList 不解析 HTML 字符串、不执行 Markdown 或脚本；
              用户输入作为文本值时由 React 转义，copy/action/status 等富 ReactNode 槽位需由宿主保证来源可信。
            </p>
          </section>

          <section className="button-doc-section" id="property-list-review" aria-labelledby="property-list-review-title">
            <h3 id="property-list-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="property-list-gaps" aria-labelledby="property-list-gaps-title">
            <h3 id="property-list-gaps-title">缺口</h3>
            <ul className="button-doc-list">
              <li>不内置剪贴板写入；需要复制时由宿主在 copy 槽位组合自有 Button/IconButton 并负责反馈。</li>
              <li>不内置编辑、折叠分组、虚拟滚动和权限遮罩；这些属于上层业务模型。</li>
              <li>DescriptionList 是兼容别名，不代表与基础 Descriptions 合并实现或文档。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
