import { Button, Checkbox, Input, Tag } from "../components/base";
import {
  DataToolbar,
  FilterPanel,
  MetricCard,
  MiniChartCard,
  MobilePreviewFrame,
  PropertyList,
  StatusTimeline,
} from "../components/business";
import { Sparkline } from "../components/charts";
import type { BusinessComponentId } from "./componentRegistry";
import { TutorialScaffold } from "./TutorialScaffold";

type BusinessEntry = {
  id: BusinessComponentId;
  name: string;
  purpose: string;
  api: string[];
  states: string[];
  semanticDom: string;
  a11yMobile: string;
  security: string;
  roleReview: {
    product: string;
    ui: string;
    engineering: string;
    testing: string;
    security: string;
  };
};

const businessEntries: BusinessEntry[] = [
  {
    id: "metric-card",
    name: "MetricCard",
    purpose: "指标摘要、趋势标签和图表槽位的业务卡片。",
    api: ["title", "value", "unit", "description", "delta", "chart", "footer", "loading", "error", "empty"],
    states: ["ready: 展示 value/unit/delta/chart", "loading: skeleton + aria-busy", "error: alert", "empty: status"],
    semanticDom: "section > header + value row + optional role=img fallback trend.",
    a11yMobile: "数值和状态不依赖颜色；移动端 header/value/chart 自动纵向收敛。",
    security: "仅渲染 ReactNode，不拼接 HTML；chart 插槽由宿主组件承担自身安全契约。",
    roleReview: {
      product: "覆盖业务指标卡最常见工作流，复杂图表由 charts 组件组合。",
      ui: "低阴影、细边框和中性色趋势，符合 neutral minimal 视觉。",
      engineering: "状态分支清晰，fallback trend 让缺省 chart 仍有稳定布局。",
      testing: "需覆盖 ready/loading/error/empty 和无 chart fallback。",
      security: "无 HTML 注入面，风险集中在外部 chart slot。",
    },
  },
  {
    id: "mini-chart-card",
    name: "MiniChartCard",
    purpose: "单指标趋势摘要，组合 MetricCard 与 Sparkline 的小型业务卡片。",
    api: ["title", "value", "unit", "description", "delta", "data", "status", "sparklineLabel", "loading", "error", "empty"],
    states: ["ready: MetricCard + Sparkline", "status: success/warning/critical", "loading: skeleton", "error: alert", "empty: status"],
    semanticDom: "section-based MetricCard wrapper with an inline Sparkline chart region.",
    a11yMobile: "趋势状态有文本标签；移动端保持单卡片纵向扫描，sparkline 降低高度但保留摘要。",
    security: "只消费数值数据和 ReactNode 文案，不解析 HTML；图形渲染使用自有 Sparkline。",
    roleReview: {
      product: "适合 dashboard 小型 KPI，不替代复杂图表分析。",
      ui: "指标、状态和迷你趋势密度高但不拥挤，适合多卡片网格。",
      engineering: "复用 MetricCard 状态壳和 Sparkline 数据路径，避免重复指标卡逻辑。",
      testing: "需覆盖 status tone、loading/error/empty、空数据和移动端单列卡片。",
      security: "无 URL、Markdown、SVG 注入输入面，风险低。",
    },
  },
  {
    id: "data-toolbar",
    name: "DataToolbar",
    purpose: "列表/表格上方的搜索、筛选、结果计数和动作区。",
    api: ["title", "description", "resultCount", "searchValue", "onSearchChange", "onSearchSubmit", "filters", "actions", "loading", "error", "empty"],
    states: ["ready: search/filter/action 可用", "loading: search disabled + status", "error: alert", "empty: status"],
    semanticDom: "section + role=search form + heading/filter/action slots.",
    a11yMobile: "搜索框有 aria-label；窄屏下主区、filters、actions 纵向排列，按钮保持触摸尺寸。",
    security: "搜索值仅通过回调外传，不执行命令，不进入 innerHTML。",
    roleReview: {
      product: "满足数据页头部的核心操作组合。",
      ui: "结果计数和操作区密度克制，适合后台重复使用。",
      engineering: "受控 searchValue 与 submit 回调分离，便于服务端查询。",
      testing: "需覆盖无 onSearchSubmit、loading disabled 和空态消息。",
      security: "避免在 toolbar 内解释搜索语法或触发危险动作。",
    },
  },
  {
    id: "filter-panel",
    name: "FilterPanel",
    purpose: "承载结构化筛选字段、活跃计数和应用/重置命令。",
    api: ["title", "description", "fields", "children", "activeCount", "onApply", "onReset", "loading", "error", "empty"],
    states: ["ready: fields/children 渲染", "loading: skeleton", "error: alert", "empty: status"],
    semanticDom: "section > header + field label/control/help + footer actions.",
    a11yMobile: "字段 label 使用 htmlFor；移动端字段单列，footer 按钮拉伸。",
    security: "不收集或序列化字段值；control 由宿主传入，避免隐式执行。",
    roleReview: {
      product: "适合中等复杂度过滤，不抢宿主表单模型职责。",
      ui: "字段帮助文案与动作区分层清楚。",
      engineering: "fields 和 children 兼容声明式与自定义两种组合。",
      testing: "需覆盖 label/id 关联、activeCount 和 footer 可选性。",
      security: "不内置 eval/filter DSL，降低注入面。",
    },
  },
  {
    id: "property-list",
    name: "PropertyList",
    purpose: "对象属性、徽标、描述和缺省值展示。",
    api: ["title", "description", "items", "columns", "layout", "density", "emptyValue", "loadingLabel", "loading", "error", "empty"],
    states: ["ready: dl/dt/dd", "compact: reduced padding", "loading: skeleton + aria-busy", "error: alert", "empty: status"],
    semanticDom: "section + optional header + dl grid with dt/dd pairs.",
    a11yMobile: "语义 description list；宿主可传 aria-label/aria-labelledby；移动端强制单列，长 label/value overflow-wrap:anywhere。",
    security: "值作为 ReactNode 渲染，不使用 HTML 注入。",
    roleReview: {
      product: "覆盖详情页核心元数据。",
      ui: "边框网格让属性可扫读但不做重卡片嵌套。",
      engineering: "columns 限制在 1/2/3，layout=stack 可强制单列，emptyValue 避免未定义值泄漏。",
      testing: "需覆盖 emptyValue、compact、stack、loadingLabel、error/empty 和移动端无横向溢出。",
      security: "无解释器和复制面，低风险。",
    },
  },
  {
    id: "status-timeline",
    name: "StatusTimeline",
    purpose: "流程节点、当前状态、异常节点和元信息时间线。",
    api: ["title", "description", "items", "density", "stateLabels", "loadingLabel", "loading", "error", "empty"],
    states: ["ready: complete/current/pending/error/warning", "current: aria-current=step", "loading: skeleton + aria-busy", "error: alert", "empty: status"],
    semanticDom: "section + ordered list; marker is aria-hidden, current item uses aria-current=step, time supports dateTime.",
    a11yMobile: "有序列表保留阅读顺序；移动端文字自动换行，每个节点有文本状态徽标，复杂标题可传 ariaLabel。",
    security: "节点内容为 ReactNode，无 HTML 注入。",
    roleReview: {
      product: "覆盖审批、部署、工单等线性流程。",
      ui: "状态 marker 克制，异常态可见但不刺眼。",
      engineering: "stateLabels 支持本地化，item.stateLabel/ariaLabel 支持单节点覆盖；不虚拟化，保持小中型流程定位。",
      testing: "需覆盖 warning、current aria-current、dateTime、stateLabels、compact、loading/error/empty。",
      security: "无命令执行面。",
    },
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    purpose: "命令搜索、键盘选择和 modal dialog 交互。",
    api: ["items", "open", "defaultOpen", "onOpenChange(reason)", "onSelect", "label", "triggerLabel", "clearOnClose", "enableGlobalShortcut", "loading", "error", "empty"],
    states: ["closed/open", "loading: status", "error: alert", "empty: status", "disabled item", "filtered list"],
    semanticDom: "trigger button[aria-haspopup=dialog] + aria-modal dialog + combobox input + listbox/options.",
    a11yMobile: "打开后聚焦搜索框，Esc 可从 dialog 内任意焦点关闭并回到 trigger；移动端底部 dialog 宽度适配 100vw。",
    security: "全局快捷键默认关闭且避开输入控件；不执行字符串命令；disabled 通过原生 disabled 和 active 计算双重阻断。",
    roleReview: {
      product: "命令入口覆盖搜索、分组、禁用和状态提示，权限与审计策略留给宿主。",
      ui: "搜索区、分组标签和结果列表适合桌面密集命令，移动端回落底部浮层。",
      engineering: "受控/非受控 open 并存，active option id 实例隔离，关闭 reason 可审计。",
      testing: "需覆盖 ArrowUp/Down、Home/End、Enter、Esc、Tab trap、disabled item、受控 open 和移动宽度。",
      security: "命令只在点击或 Enter 时显式激活；宿主必须传入已授权命令，本组件不做权限推断。",
    },
  },
  {
    id: "code-block",
    name: "CodeBlock",
    purpose: "代码展示和复制，CopyBlock 为同一实现别名。",
    api: ["code", "language", "title", "description", "copyLabel", "copiedLabel", "loading", "error", "empty"],
    states: ["ready: pre/code", "copied: status", "copy error: status", "loading/error/empty"],
    semanticDom: "section + header + pre > code; copy status is screen-reader live text.",
    a11yMobile: "代码区域横向滚动；复制按钮禁用态明确。",
    security: "代码用文本节点渲染，不执行、不高亮、不注入 HTML；Clipboard API 失败不泄露异常。",
    roleReview: {
      product: "适合文档和配置片段展示。",
      ui: "保持单色代码块，避免引入重型高亮依赖。",
      engineering: "复制失败有显式状态，SSR/无 Clipboard 场景可降级。",
      testing: "需 mock navigator.clipboard 成功和失败。",
      security: "不会执行代码字符串。",
    },
  },
  {
    id: "markdown-editor",
    name: "MarkdownEditor",
    purpose: "受控/非受控 Markdown 编辑、预览和 Mermaid block 渲染。",
    api: ["value", "defaultValue", "onChange", "mode", "defaultMode", "onModeChange", "placeholder"],
    states: ["edit/split/preview", "empty preview", "readonly controlled", "Mermaid loading/error/ready"],
    semanticDom: "section + tablist mode controls + textarea editor + tabpanel preview.",
    a11yMobile: "780px 以下 split 自动变单列；textarea/preview 保留阅读顺序。",
    security: "Markdown 禁 HTML，DOMPurify 禁 script/style/iframe/object/embed/form/svg/math/data attrs；Mermaid fence 交给 SVG 查看器二次清洗。",
    roleReview: {
      product: "覆盖文档编辑的核心需求，长文档高级能力可后续扩展。",
      ui: "编辑区和预览区并排，移动端回落单列。",
      engineering: "拆分 Markdown/Mermaid block，避免把 Mermaid 当 HTML 渲染。",
      testing: "需覆盖 XSS markdown、mode 受控、readonly controlled 和 Mermaid race。",
      security: "当前最敏感面，已经采用 markdown-it html=false + DOMPurify + SVG sanitizer。",
    },
  },
  {
    id: "mermaid-svg-viewer",
    name: "MermaidSvgViewer",
    purpose: "Mermaid 文本到安全 SVG 的渲染、错误态和平移缩放查看。",
    api: ["source", "title", "maxSourceLength"],
    states: ["idle/loading", "ready: sanitized SVG", "error: parse/sanitize/length/render error"],
    semanticDom: "figure + figcaption controls + role=img viewport.",
    a11yMobile: "触摸 pointer pan、wheel zoom、按钮 zoom/reset；移动端 controls 全宽。",
    security: "Mermaid strict/htmlLabels=false；SVG 将 foreignObject 文本岛转为 text，移除 script/style/media/canvas、事件属性、data/file/javascript/vbscript URL 和危险 style url。",
    roleReview: {
      product: "把 Mermaid 作为可审查子能力独立登记。",
      ui: "查看器有标题、控制条、错误消息和稳定高度。",
      engineering: "渲染 promise 有取消标记，避免旧结果覆盖新 source。",
      testing: "需覆盖空 source、超长 source、非法语法和含危险链接的 SVG sanitizer。",
      security: "默认 source 长度上限降低前端阻塞风险。",
    },
  },
  {
    id: "mobile-preview-frame",
    name: "MobilePreviewFrame",
    purpose: "在文档和后台工具中模拟移动设备 viewport、chrome 和可滚动预览画布。",
    api: ["title", "description", "size", "orientation", "chrome", "scrollable", "children", "footer", "toolbar"],
    states: ["ready: device preview", "portrait/landscape", "chrome: ios/android/none", "scrollable/non-scrollable"],
    semanticDom: "section + header controls + focusable preview screen + optional footer.",
    a11yMobile: "预览屏可聚焦并按真实 viewport 比例约束；宿主内容保持 DOM 语义，不通过 iframe 隔离。",
    security: "不嵌入第三方 URL 或 iframe；children 由宿主 React 传入，遵循各自组件安全契约。",
    roleReview: {
      product: "帮助业务组件在文档内复核移动端效果，不承担真实设备模拟器职责。",
      ui: "device chrome、状态栏和内容区比例稳定，避免预览画布撑破页面。",
      engineering: "通过 CSS 变量约束尺寸和方向，不引入 iframe、跨域或设备模拟依赖。",
      testing: "需覆盖 375/390 宽度、横竖屏、scrollable 焦点和 chrome none。",
      security: "无外部页面加载、URL 解析或文件名输入面，主要风险来自宿主 children。",
    },
  },
];

const oneLineExample = `<MetricCard title="Canary success" value="86.2" unit="%" />`;

const overviewTrend = [
  { label: "Mon", value: 48 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 63 },
  { label: "Thu", value: 72 },
  { label: "Fri", value: 78 },
  { label: "Sat", value: 81 },
  { label: "Sun", value: 86 },
];

const latencyTrend = [
  { label: "09:00", value: 180 },
  { label: "10:00", value: 220 },
  { label: "11:00", value: 260 },
  { label: "12:00", value: 312 },
  { label: "13:00", value: 288 },
  { label: "14:00", value: 248 },
];

function BusinessReleaseConsoleDemo() {
  return (
    <div className="business-doc-console" aria-label="Business component product console example">
      <DataToolbar
        activeFilters={
          <>
            <Tag tone="subtle">env: production</Tag>
            <Tag tone="subtle">owner: platform</Tag>
            <Tag tone="subtle">window: 7d</Tag>
          </>
        }
        filters={<Button size="sm" variant="soft">Filters</Button>}
        primaryAction={{ id: "create-release", label: "Create release", priority: "primary" }}
        refreshAction={{ id: "refresh", label: "Refresh", priority: "ghost", ariaLabel: "Refresh release console" }}
        resultLabel="128 releases"
        search={{ defaultValue: "checkout", placeholder: "Search releases", showSubmit: true }}
        secondaryActions={[{ id: "export", label: "Export", priority: "secondary" }]}
        title="Release console"
      />

      <div className="business-doc-console__metrics">
        <MetricCard
          chart={<Sparkline data={overviewTrend} height={64} title="Canary success trend" />}
          chartLabel="Canary success trend"
          delta={{ description: "vs last window", direction: "up", label: "+8.4%", tone: "positive" }}
          description="Successful canary rollouts"
          density="compact"
          title="Canary success"
          value="86.2"
          unit="%"
        />
        <MiniChartCard
          delta={{ description: "above target", direction: "up", label: "+9.1%" }}
          sparkline={latencyTrend}
          sparklineSummary="Latency rose at noon and is being watched by the release team."
          status="warning"
          title="Latency p95"
          value="312ms"
        />
      </div>

      <div className="business-doc-console__body">
        <FilterPanel
          activeCount={3}
          columns={2}
          fields={[
            { id: "business-owner", label: "Owner", control: <Input id="business-owner" name="owner" defaultValue="platform" /> },
            { id: "business-service", label: "Service", control: <Input id="business-service" name="service" defaultValue="checkout" /> },
            {
              id: "business-risk",
              label: "High risk only",
              control: <Checkbox id="business-risk" name="risk">Include blocked nodes</Checkbox>,
              span: 2,
            },
          ]}
          title="Release filters"
        />
        <PropertyList
          columns={2}
          items={[
            { id: "request", label: "Request", value: "rel_2026_checkout_4812" },
            { id: "environment", label: "Environment", value: "Production", status: "Healthy", statusTone: "success" },
            { id: "owner", label: "Owner", value: "Platform operations" },
            { id: "window", label: "Window", value: "7 days" },
          ]}
          title="Selected release"
        />
        <StatusTimeline
          density="compact"
          items={[
            { id: "queued", title: "Queued", time: "09:12", state: "complete", description: "Release request accepted." },
            { id: "build", title: "Build running", time: "09:18", state: "current", description: "Bundle verification is in progress." },
            { id: "notify", title: "Owner notification", time: "09:36", state: "warning", description: "Webhook retry scheduled." },
          ]}
          title="Release status"
        />
      </div>

      <MobilePreviewFrame chrome="ios" size="iphone-se" title="Mobile release card" footer="360 class preview">
        <div className="business-doc-mobile-card">
          <strong>Checkout rollout</strong>
          <span>Canary success 86.2%</span>
          <Button size="sm" variant="solid">Review</Button>
        </div>
      </MobilePreviewFrame>
    </div>
  );
}

export function BusinessDoc({ selectedId = "metric-card" }: { selectedId?: BusinessComponentId }) {
  const selected = businessEntries.find((entry) => entry.id === selectedId) ?? businessEntries[0];

  return (
    <TutorialScaffold component="Business" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc business-doc" aria-labelledby="business-doc-title">
      <div className="button-doc__layout">
        <aside className="button-doc__toc" aria-label="Business components">
          {businessEntries.map((entry) => (
            <a href={`#business-${entry.id}`} key={entry.id}>
              {entry.name}
            </a>
          ))}
        </aside>

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Business / production detail</p>
            <h2 id="business-doc-title">{selected.name}</h2>
            <p>
              Business 组件统一详情页，覆盖 API、状态、语义 DOM、a11y、mobile 和 security。当前打开项：
              <code>{selected.id}</code>。
            </p>
          </header>

          <section className="button-doc-section" aria-labelledby="business-acceptance-title">
            <div className="button-doc-section__heading">
              <h3 id="business-acceptance-title">Production Contract</h3>
              <p>所有条目遵循自有实现，不使用 antd、antd-mobile 或 @ant-design/charts。</p>
            </div>
            <ul className="button-doc-list">
              <li>必须提供 ready/loading/error/empty 或等价状态，不让宿主猜测空白原因。</li>
              <li>移动端以单列、可滚动、触摸尺寸和换行优先，不依赖 hover。</li>
              <li>Markdown/Mermaid/复制/命令面板均按安全敏感面处理。</li>
              <li>语义 DOM 优先使用 section、form、dl、ol、dialog、combobox、listbox、pre/code、figure。</li>
            </ul>
          </section>

          <section className="button-doc-section" aria-labelledby="business-console-title">
            <div className="button-doc-section__heading">
              <h3 id="business-console-title">Product Console Pattern</h3>
              <p>业务组件教程的样板区：数据工具栏、筛选、指标、属性、状态链路和移动预览必须能组合成真实产品界面。</p>
            </div>
            <BusinessReleaseConsoleDemo />
          </section>

          {businessEntries.map((entry) => (
            <section className="button-doc-section business-doc-entry" id={`business-${entry.id}`} key={entry.id}>
              <div className="button-doc-section__heading">
                <div>
                  <h3>{entry.name}</h3>
                  <p>{entry.purpose}</p>
                </div>
              </div>
              <div className="business-doc-grid">
                <article>
                  <h4>API</h4>
                  <p>{entry.api.join(", ")}</p>
                </article>
                <article>
                  <h4>States</h4>
                  <ul>
                    {entry.states.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article>
                  <h4>Semantic DOM</h4>
                  <p>{entry.semanticDom}</p>
                </article>
                <article>
                  <h4>A11y / Mobile</h4>
                  <p>{entry.a11yMobile}</p>
                </article>
                <article className="business-doc-grid__wide">
                  <h4>Security</h4>
                  <p>{entry.security}</p>
                </article>
              </div>
              <div className="business-doc-roles" aria-label={`${entry.name} five role review`}>
                <span>产品专家：{entry.roleReview.product}</span>
                <span>UI 专家：{entry.roleReview.ui}</span>
                <span>研发专家：{entry.roleReview.engineering}</span>
                <span>测试专家：{entry.roleReview.testing}</span>
                <span>白帽专家：{entry.roleReview.security}</span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
