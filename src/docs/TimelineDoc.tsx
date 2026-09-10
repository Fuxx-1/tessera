import type { ReactNode } from "react";
import { Timeline } from "../components/base";
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

export type TimelineDocProps = {
  showAnchors?: boolean;
};

export const timelineDocMeta = {
  title: "Timeline 时间轴",
  category: "基础组件",
  anchors: [
    { id: "timeline-when", label: "何时使用" },
    { id: "timeline-demos", label: "代码演示" },
    { id: "timeline-api", label: "API" },
    { id: "timeline-semantic", label: "Semantic DOM" },
    { id: "timeline-a11y", label: "可访问性" },
    { id: "timeline-mobile", label: "移动端" },
    { id: "timeline-acceptance", label: "验收样例" },
    { id: "timeline-review", label: "五专家结论" },
    { id: "timeline-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "items",
    value: "TimelineItem[]",
    description: "时间轴数据。每项包含 title，可选 children、time、status、dot、pending、key、className 和 ariaLabel。",
  },
  {
    name: "mode",
    value: '"left" | "right" | "alternate"',
    description: "节点内容位置，默认 left。alternate 在窄屏下自动堆叠为左侧时间线。",
  },
  {
    name: "reverse",
    value: "boolean",
    description: "反向展示 items，适合把最新事件放在顶部；不会修改传入数组。",
  },
  {
    name: "pending / pendingDot",
    value: "ReactNode | boolean",
    description: "在末尾追加一个待发生节点；配合 reverse 时 pending 节点会随视觉顺序前置，读屏顺序保持一致。",
  },
  {
    name: "ariaLabel",
    value: "string",
    description: "根有序列表的可访问名称，默认 Timeline。页面存在多个时间轴时应提供业务化名称。",
  },
  {
    name: "HTMLAttributes",
    value: 'Omit<HTMLAttributes<HTMLOListElement>, "dangerouslySetInnerHTML">',
    description: "继承安全的 ol 属性，例如 id、className、data-* 和 aria-describedby；不开放 dangerouslySetInnerHTML。",
  },
];

const itemRows: DocRow[] = [
  {
    name: "title",
    value: "ReactNode",
    description: "事件标题或节点主内容。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "事件说明区域，支持长文本、列表、标签等普通 React 内容。",
  },
  {
    name: "time",
    value: "ReactNode",
    description: "节点时间。视觉上作为次级信息展示；需要机器可读时间时可在外层自行传入 time 元素。",
  },
  {
    name: "status",
    value: '"default" | "success" | "processing" | "pending" | "warning" | "error"',
    description: "节点状态，用于 dot 色彩和屏幕阅读器状态文本。",
  },
  {
    name: "pending",
    value: "boolean",
    description: "把单个数据项标记为待发生节点；未显式设置 status 时会使用 pending 状态。",
  },
  {
    name: "dot",
    value: "ReactNode",
    description: "自定义节点标记。组件仍保留状态 class，便于外层控制样式。",
  },
  {
    name: "ariaLabel",
    value: "string",
    description: "覆盖单个 li 的可访问名称，适合标题为复杂节点时补充明确语义。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "ol[aria-label]",
    description: "Timeline 是按顺序阅读的事件列表，根节点使用有序列表语义。",
  },
  {
    name: "item",
    value: "li[aria-label]",
    description: "每个事件是列表项，并提供包含视觉序号、总数和状态的默认可访问名称。",
  },
  {
    name: "time",
    value: ".c-timeline__time",
    description: "时间槽位在标题前展示；当需要精确 datetime 时可以用 ReactNode 自行传入 time 元素。",
  },
  {
    name: "status",
    value: "sr-only label",
    description: "状态不只依赖颜色，组件为 default、success、processing、pending、warning、error 输出隐藏文本。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Order",
    value: "ol / reverse",
    description: "默认按 items 顺序阅读；reverse 只改变渲染顺序，读屏顺序与视觉顺序保持一致，序号也按渲染后顺序计算。",
  },
  {
    name: "Custom dot",
    value: 'aria-hidden="true"',
    description: "dot 属于视觉标记，不进入读屏序列；请通过 title、children 或 ariaLabel 传达含义。",
  },
  {
    name: "Long text",
    value: "overflow-wrap",
    description: "标题、时间和正文都允许换行，避免长链接、构建号或英文连续文本撑破容器。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Stacked",
    value: "max-width: 760px",
    description: "小屏下 left、right、alternate 都堆叠为单列左侧时间线。",
  },
  {
    name: "Connector",
    value: "stable rail",
    description: "移动端保留固定 rail 宽度，dot、连线和长内容不会互相挤压。",
  },
  {
    name: "Text",
    value: "minmax(0, 1fr)",
    description: "内容列使用可收缩网格，长文案在卡片和窄屏中稳定换行。",
  },
];

const acceptanceRows: DocRow[] = [
  {
    name: "Vertical",
    value: "left / right",
    description: "基础竖向和右侧竖向都保留 ol/li 语义、固定 rail 和可换行内容列。",
  },
  {
    name: "Alternate",
    value: "mode=\"alternate\"",
    description: "宽屏左右交替，移动端堆叠为单列左侧时间线。",
  },
  {
    name: "Reverse",
    value: "reverse",
    description: "最新事件前置，视觉顺序、DOM 顺序和默认 aria 序号一致。",
  },
  {
    name: "Pending",
    value: "pending",
    description: "待发生节点在普通模式下位于末尾，在 reverse 模式下前置；不会出现空值文本。",
  },
  {
    name: "Custom dot",
    value: "dot",
    description: "自定义 dot 只作为 aria-hidden 视觉标记，状态含义由文本和 sr-only 状态共同表达。",
  },
  {
    name: "Safe text",
    value: "ReactNode",
    description: "组件不解析字符串 HTML；长链接、构建号和用户可见文本按 React 默认转义输出。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "Timeline 定位为事件历史和时间记录，覆盖 pending、reverse、alternate 边界，不承担 Steps 流程导航，也不合并 StatusTimeline。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "默认竖向、支持右侧和交替布局，状态点克制清晰；长内容与窄屏堆叠不破坏阅读节奏。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "独立 base 组件，无 antd 系依赖；items、status、time、reverse、alternate、custom dot 均由类型约束。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "文档示例覆盖 desktop、360、390、430、基础、pending、反向、交替、自定义 dot、长链接换行和移动端堆叠。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "组件不解析 HTML 字符串，不 fetch、不 eval、不使用 dangerouslySetInnerHTML；dot 为 aria-hidden 视觉标记。",
  },
];

const faqItems = [
  {
    question: "Timeline 和 Steps 怎么区分？",
    answer: "Timeline 记录事件历史或时间顺序，Steps 表达流程阶段和当前步骤。需要流程导航、可点击阶段时使用 Steps。",
  },
  {
    question: "为什么不合并 StatusTimeline？",
    answer: "StatusTimeline 是业务组件，面向工作流状态、元信息和异常节点；Timeline 是基础组件，只承担通用事件序列展示。",
  },
  {
    question: "自定义 dot 可以放交互控件吗？",
    answer: "不建议。dot 被视为视觉标记并 aria-hidden，交互应放在 title 或 children 中，并使用明确按钮或链接。",
  },
];

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

export function TimelineDoc({ showAnchors = false }: TimelineDocProps) {
  const demos: Demo[] = [
    {
      title: "基础事件",
      description: "用 items 描述事件标题、时间、状态和正文；根节点保持有序列表语义。",
      preview: (
        <Timeline
          ariaLabel="发布事件"
          items={[
            {
              key: "created",
              status: "success",
              time: "09:10",
              title: "创建发布单",
              children: "负责人提交发布窗口、影响范围和回滚联系人。",
            },
            {
              key: "running",
              status: "processing",
              time: "10:24",
              title: "灰度验证中",
              children: "自动化检查正在采集核心链路的通过率。",
            },
            {
              key: "next",
              time: "11:00",
              title: "等待全量",
              children: "达到观察窗口后再推进到全量发布。",
            },
          ]}
        />
      ),
      code: `<Timeline
  ariaLabel="发布事件"
  items={[
    { key: "created", status: "success", time: "09:10", title: "创建发布单", children: "负责人提交发布窗口、影响范围和回滚联系人。" },
    { key: "running", status: "processing", time: "10:24", title: "灰度验证中", children: "自动化检查正在采集核心链路的通过率。" },
    { key: "next", time: "11:00", title: "等待全量", children: "达到观察窗口后再推进到全量发布。" },
  ]}
/>`,
    },
    {
      title: "反向时间",
      description: "reverse 让最新事件显示在最前面；pending 节点也随视觉顺序前置，读屏顺序一致。",
      preview: (
        <Timeline
          ariaLabel="工单更新"
          pending="等待线上观测窗口结束"
          pendingDot="?"
          reverse
          items={[
            { key: "open", status: "success", time: "May 20", title: "工单创建", children: "客服记录用户反馈并完成分级。" },
            { key: "triage", status: "warning", time: "May 21", title: "等待依赖确认", children: "需要上游服务确认接口限流策略。" },
            { key: "fixed", status: "processing", time: "May 22", title: "修复验证", children: "补丁已进入预发环境。" },
          ]}
        />
      ),
      code: `<Timeline
  ariaLabel="工单更新"
  pending="等待线上观测窗口结束"
  pendingDot="?"
  reverse
  items={[
    { key: "open", status: "success", time: "May 20", title: "工单创建", children: "客服记录用户反馈并完成分级。" },
    { key: "triage", status: "warning", time: "May 21", title: "等待依赖确认", children: "需要上游服务确认接口限流策略。" },
    { key: "fixed", status: "processing", time: "May 22", title: "修复验证", children: "补丁已进入预发环境。" },
  ]}
/>`,
    },
    {
      title: "交替布局",
      description: "alternate 适合宽屏审计记录；窄屏会自动堆叠成单列，不压缩正文。",
      preview: (
        <Timeline
          ariaLabel="审计记录"
          mode="alternate"
          items={[
            { key: "request", time: "08:30", title: "申请权限", children: "研发提交临时排障权限，期限为 2 小时。" },
            { key: "approve", status: "success", time: "08:42", title: "主管审批通过", children: "审批意见已同步到安全审计空间。" },
            { key: "expire", status: "error", time: "10:42", title: "权限自动回收", children: "到期后系统撤销访问令牌并写入审计日志。" },
          ]}
        />
      ),
      code: `<Timeline
  ariaLabel="审计记录"
  mode="alternate"
  items={[
    { key: "request", time: "08:30", title: "申请权限", children: "研发提交临时排障权限，期限为 2 小时。" },
    { key: "approve", status: "success", time: "08:42", title: "主管审批通过", children: "审批意见已同步到安全审计空间。" },
    { key: "expire", status: "error", time: "10:42", title: "权限自动回收", children: "到期后系统撤销访问令牌并写入审计日志。" },
  ]}
/>`,
    },
    {
      title: "右侧竖向",
      description: "mode=\"right\" 把内容放在 rail 左侧，适合右侧对齐的短审计信息；移动端自动回到左侧时间线。",
      preview: (
        <Timeline
          ariaLabel="右侧对齐日志"
          mode="right"
          items={[
            { key: "queued", status: "default", time: "14:00", title: "进入队列", children: "任务已进入低优先级执行队列。" },
            { key: "worker", status: "processing", time: "14:02", title: "分配执行器", children: "worker-asia-shanghai-17 正在拉取上下文。" },
            { key: "done", status: "success", time: "14:08", title: "执行完成", children: "产物已写入只读归档空间。" },
          ]}
        />
      ),
      code: `<Timeline
  ariaLabel="右侧对齐日志"
  mode="right"
  items={[
    { key: "queued", status: "default", time: "14:00", title: "进入队列", children: "任务已进入低优先级执行队列。" },
    { key: "worker", status: "processing", time: "14:02", title: "分配执行器", children: "worker-asia-shanghai-17 正在拉取上下文。" },
    { key: "done", status: "success", time: "14:08", title: "执行完成", children: "产物已写入只读归档空间。" },
  ]}
/>`,
    },
    {
      title: "自定义节点与长内容",
      description: "dot 可替换为短符号；长标题、长链接和连续英文会在内容列内换行。",
      preview: (
        <Timeline
          ariaLabel="导入任务"
          items={[
            {
              key: "upload",
              dot: "1",
              status: "success",
              time: "2026-06-07 13:08",
              title: "上传数据包",
              children: "manifest-release-candidate-2026-06-07-cn-production-batch-0000001842.json 已完成校验。",
            },
            {
              key: "parse",
              dot: "2",
              status: "processing",
              time: "2026-06-07 13:12",
              title: "解析字段映射和异常行",
              children:
                "长内容会自然折行，包括 https://internal.example.invalid/releases/very-long-path/with-many-segments/and-query-values?trace=timeline-mobile-wrapping-check。",
            },
            {
              key: "review",
              dot: "!",
              status: "warning",
              time: "2026-06-07 13:20",
              title: "等待人工复核",
              children: "发现 4 条高风险变更，需要负责人确认再进入写入阶段。",
            },
          ]}
        />
      ),
      code: `<Timeline
  ariaLabel="导入任务"
  items={[
    { key: "upload", dot: "1", status: "success", time: "2026-06-07 13:08", title: "上传数据包", children: "manifest-release-candidate-2026-06-07-cn-production-batch-0000001842.json 已完成校验。" },
    { key: "parse", dot: "2", status: "processing", time: "2026-06-07 13:12", title: "解析字段映射和异常行", children: "长内容会自然折行，包括 https://internal.example.invalid/releases/very-long-path/with-many-segments/and-query-values?trace=timeline-mobile-wrapping-check。" },
    { key: "review", dot: "!", status: "warning", time: "2026-06-07 13:20", title: "等待人工复核", children: "发现 4 条高风险变更，需要负责人确认再进入写入阶段。" },
  ]}
/>`,
    },
    {
      title: "一行验收矩阵",
      description: "单行代码同时覆盖 pending、reverse、alternate、custom dot 和全部状态，便于 smoke 时快速定位。",
      preview: (
        <div className="timeline-doc-one-line" aria-label="Timeline single line acceptance examples">
          <Timeline
            ariaLabel="一行验收时间轴"
            mode="alternate"
            pending="待发生节点"
            pendingDot="N"
            reverse
            items={[
              { key: "default", status: "default", dot: "D", time: "S0", title: "默认节点", children: "默认状态文本。" },
              { key: "success", status: "success", dot: "S", time: "S1", title: "成功节点", children: "成功状态文本。" },
              { key: "processing", status: "processing", dot: "P", time: "S2", title: "处理中节点", children: "处理中状态文本。" },
              { key: "warning", status: "warning", dot: "W", time: "S3", title: "警告节点", children: "警告状态文本。" },
              { key: "error", status: "error", dot: "E", time: "S4", title: "错误节点", children: "错误状态文本。" },
            ]}
          />
        </div>
      ),
      code: `<Timeline ariaLabel="一行验收时间轴" mode="alternate" pending="待发生节点" pendingDot="N" reverse items={[{ key: "default", status: "default", dot: "D", time: "S0", title: "默认节点", children: "默认状态文本。" }, { key: "success", status: "success", dot: "S", time: "S1", title: "成功节点", children: "成功状态文本。" }, { key: "processing", status: "processing", dot: "P", time: "S2", title: "处理中节点", children: "处理中状态文本。" }, { key: "warning", status: "warning", dot: "W", time: "S3", title: "警告节点", children: "警告状态文本。" }, { key: "error", status: "error", dot: "E", time: "S4", title: "错误节点", children: "错误状态文本。" }]} />`,
    },
  ];

  return (
    <TutorialScaffold component="Timeline" kind="display" oneLineExample={`<Timeline items={items} />`}>
    <div className="button-doc timeline-doc">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <nav className="button-doc__toc" aria-label="Timeline 文档目录">
            {timelineDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">{timelineDocMeta.category}</p>
            <h2 id="timeline-doc-title">{timelineDocMeta.title}</h2>
            <p>按时间顺序展示事件、日志和节点历史。Timeline 是基础展示组件，不承载流程导航，也不与 StatusTimeline 合并。</p>
          </header>

          <section className="button-doc-section" id="timeline-when">
            <h3>何时使用</h3>
            <ul className="button-doc-list">
              <li>需要展示事件历史、审计记录、工单更新、待发生 pending 节点或导入进度时。</li>
              <li>需要按时间顺序阅读，并保留明确列表语义时。</li>
              <li>不适合用来表达当前流程阶段；这类场景优先使用 Steps 或业务 StatusTimeline。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="timeline-demos">
            <h3>代码演示</h3>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard {...demo} key={demo.title} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="timeline-api">
            <h3>API</h3>
            <DataTable rows={apiRows} />
            <h4>TimelineItem</h4>
            <DataTable rows={itemRows} />
          </section>

          <section className="button-doc-section" id="timeline-semantic">
            <h3>Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="timeline-a11y">
            <h3>可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="timeline-mobile">
            <h3>移动端</h3>
            <p>smoke 覆盖 desktop、360px、390px 与 430px；页面级 scrollWidth 不超过 viewportWidth，时间、标题和正文均允许换行。</p>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="timeline-acceptance">
            <h3>验收样例</h3>
            <DataTable rows={acceptanceRows} />
          </section>

          <section className="button-doc-section" id="timeline-review">
            <h3>五专家小组结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="timeline-faq">
            <h3>FAQ</h3>
            <div className="button-doc-faq">
              {faqItems.map((item) => (
                <article key={item.question}>
                  <h4>{item.question}</h4>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
      </TutorialScaffold>
);
}
