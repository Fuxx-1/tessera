import type { ReactNode } from "react";
import { Button, Tag } from "../components/base";
import { StatusTimeline } from "../components/business";
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

export type StatusTimelineDocProps = {
  showAnchors?: boolean;
};

export const statusTimelineDocMeta = {
  title: "StatusTimeline 状态时间线",
  category: "业务组件",
  anchors: [
    { id: "status-timeline-when", label: "何时使用" },
    { id: "status-timeline-demos", label: "代码演示" },
    { id: "status-timeline-api", label: "API" },
    { id: "status-timeline-states", label: "状态" },
    { id: "status-timeline-semantic", label: "Semantic DOM" },
    { id: "status-timeline-token", label: "Design Token" },
    { id: "status-timeline-a11y", label: "a11y" },
    { id: "status-timeline-mobile", label: "mobile" },
    { id: "status-timeline-security", label: "security" },
    { id: "status-timeline-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<StatusTimeline title="Release pipeline" items={items} density="compact" />`;

const longDescription =
  "Verification is waiting for the regional smoke suite, owner acknowledgement, and artifact retention policy review. This deliberately long sentence checks wrapping, timeline spacing, marker alignment, and mobile behavior without horizontal scrolling.";

const demos: Demo[] = [
  {
    title: "状态流一行验收",
    description: "一行覆盖 complete、current、warning、error、pending、时间、长说明和元信息，便于桌面与 360/390/430 移动断点复核。",
    preview: (
      <div className="status-timeline-doc__one-line" aria-label="StatusTimeline single row acceptance examples">
        <StatusTimeline
          aria-label="Release pipeline status"
          actions={
            <>
              <Button size="sm" variant="ghost">View log</Button>
              <Button size="sm" variant="solid">Retry current</Button>
            </>
          }
          density="compact"
          items={[
            {
              id: "queued",
              title: "Queued",
              time: "09:12",
              dateTime: "2026-06-07T09:12:00+08:00",
              state: "complete",
              description: "Request accepted by the release controller.",
              meta: <Tag tone="subtle">deploy-4812</Tag>,
            },
            {
              id: "build",
              title: "Build running",
              time: "09:18",
              dateTime: "2026-06-07T09:18:00+08:00",
              state: "current",
              description: longDescription,
              meta: <Tag tone="strong">current</Tag>,
            },
            {
              id: "verify",
              title: "Verification",
              time: "09:31",
              dateTime: "2026-06-07T09:31:00+08:00",
              state: "warning",
              stateLabel: "Needs review",
              description: "Smoke tests passed, but the payment callback sample needs a human sign-off.",
              actions: <Button size="sm" variant="ghost">Review</Button>,
            },
            {
              id: "notify",
              title: "Notify owners",
              time: "09:36",
              dateTime: "2026-06-07T09:36:00+08:00",
              state: "error",
              stateLabel: "Blocked",
              description: "The owner group webhook rejected the delivery token.",
              meta: <Tag tone="subtle">retry scheduled</Tag>,
              actions: <Button size="sm" variant="ghost">Open incident</Button>,
            },
            {
              id: "promote",
              title: "Promote to stable",
              time: "Pending",
              state: "pending",
              description: "Runs after the blocked notification node is resolved.",
            },
          ]}
          title="Release pipeline"
        />
      </div>
    ),
    code: `<StatusTimeline title="Release pipeline" actions={<><Button size="sm">View log</Button><Button size="sm" variant="solid">Retry current</Button></>} density="compact" items={[{ id: "queued", title: "Queued", time: "09:12", state: "complete" }, { id: "build", title: "Build running", time: "09:18", state: "current" }, { id: "verify", title: "Verification", state: "warning", stateLabel: "Needs review" }, { id: "notify", title: "Notify owners", state: "error", stateLabel: "Blocked" }, { id: "promote", title: "Promote to stable", state: "pending" }]} />`,
  },
  {
    title: "加载、空态和错误",
    description: "组件边界内处理常见数据状态，业务页不用额外拼装状态壳。",
    preview: (
      <div className="status-timeline-doc__state-grid">
        <StatusTimeline items={[]} loading loadingLabel="Loading deployment timeline" title="Loading state" />
        <StatusTimeline empty="No status events for this release" items={[]} title="Empty state" />
        <StatusTimeline error="Timeline service is unavailable." items={[]} title="Error state" />
      </div>
    ),
    code: `<StatusTimeline loading items={[]} title="Loading state" /><StatusTimeline empty="No status events" items={[]} title="Empty state" /><StatusTimeline error="Timeline service is unavailable." items={[]} title="Error state" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "StatusTimelineItem[]", description: "必填节点列表；按传入顺序渲染为有序列表，不在组件内排序。" },
  { name: "title / description / actions", value: "ReactNode", description: "可选区域标题、说明和顶部动作，用于命名业务流程边界并承载轻量命令。" },
  { name: "density", value: "comfortable | compact", description: "控制节点间距和内容 padding，紧凑场景使用 compact。" },
  { name: "loading / error / empty", value: "boolean / ReactNode", description: "加载、错误、空态优先级为 loading、error、empty、ready。" },
  { name: "loadingLabel", value: "string", description: "加载骨架的可访问名称，默认 Loading timeline。" },
  { name: "stateLabels", value: "Partial<Record<State, string>>", description: "批量覆盖状态标签文案，单个 item 可用 stateLabel 覆盖。" },
];

const itemRows: DocRow[] = [
  { name: "id", value: "string", description: "稳定 key，建议使用业务节点 id。" },
  { name: "title", value: "ReactNode", description: "节点主标题；字符串标题会参与默认 aria-label。" },
  { name: "time / dateTime", value: "ReactNode / string", description: "可见时间与机器可读 time dateTime，适合审计和测试定位。" },
  { name: "description", value: "ReactNode", description: "节点说明，长文案允许换行并保持 marker 与线条对齐。" },
  { name: "meta", value: "ReactNode", description: "补充元信息槽，可放 Tag、短链接、责任人等小片段。" },
  { name: "actions", value: "ReactNode", description: "节点级动作槽，适合放 1-2 个短按钮；组件只负责布局，不执行业务逻辑。" },
  { name: "state", value: "complete | current | pending | error | warning", description: "控制 marker、标签和 aria-current；默认 pending。" },
  { name: "stateLabel / ariaLabel", value: "string", description: "覆盖可见状态标签或整条节点的可访问名称。" },
];

const stateRows: DocRow[] = [
  { name: "complete", value: "check marker", description: "用于已完成节点，marker 通过勾形和低饱和绿色辅助表达。" },
  { name: "current", value: "aria-current=step", description: "当前节点有黑色环和中心点，并设置 aria-current。" },
  { name: "pending", value: "open marker", description: "待执行节点保持空心 marker 和中性标签。" },
  { name: "warning", value: "! marker", description: "风险节点使用感叹号、标签文案和低饱和警告色，不只靠颜色。" },
  { name: "error", value: "x marker", description: "阻塞节点使用叉形、标签文案和错误色，不只靠颜色。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section", description: "状态时间线是独立业务区域，可通过 title 或外部 aria-label 命名。" },
  { name: "list", value: "ol", description: "节点顺序有意义，保留有序列表语义。" },
  { name: "item", value: "li", description: "每个节点带状态化 aria-label；当前节点额外标记 aria-current=step。" },
  { name: "actions", value: "div[aria-label]", description: "顶部和节点动作各自具名，按钮或链接语义由调用方 ReactNode 保留。" },
  { name: "time", value: "time", description: "有可见 time 时渲染 time 元素，dateTime 透传为机器可读时间。" },
  { name: "marker", value: "aria-hidden", description: "视觉 marker 与连线不重复朗读，状态由文本标签和 aria-label 表达。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #dededb", description: "近白底、细边框、低阴影，和业务组件体系一致。" },
  { name: "line", value: "1px #dededb", description: "连线从 marker 下方延展到下一节点，最后一项自动隐藏。" },
  { name: "marker", value: "15px", description: "状态符号保持小尺寸，避免抢过标题和时间。" },
  { name: "radius", value: "8px max", description: "根容器和状态块不超过 8px 圆角。" },
  { name: "density", value: "62px / 52px item min-height", description: "comfortable 与 compact 提供不同扫描节奏。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "独立承担工作流状态表达，不与基础 Timeline 或 Steps 合并。" },
  { name: "UI 专家", value: "通过", description: "状态流、时间、线条、marker 符号、长说明和当前态层级清晰。" },
  { name: "研发专家", value: "通过", description: "自有 React/TypeScript 实现，actions 为 ReactNode 布局槽位，未使用 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "测试专家", value: "通过", description: "示例覆盖 ready/loading/error/empty、五种状态、顺序、时间、meta、actions、长文案和 360/390/430 移动端收敛。" },
  { name: "白帽专家", value: "通过", description: "不解析 HTML 字符串、不执行动态代码；title、meta、actions 等 ReactNode 内容由宿主显式传入。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
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

export function StatusTimelineDoc({ showAnchors = false }: StatusTimelineDocProps) {
  return (
    <TutorialScaffold component="StatusTimeline" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc status-timeline-doc" aria-labelledby="status-timeline-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="StatusTimeline 文档目录">
            {statusTimelineDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">business component</p>
            <h2 id="status-timeline-doc-title">{statusTimelineDocMeta.title}</h2>
            <p>
              StatusTimeline 面向发布、审批、任务流和告警处置等业务状态链路。它展示节点状态、当前态、时间、说明和元信息；
              基础 Timeline 只记录通用事件顺序，两者不合并。
            </p>
          </header>

          <section className="button-doc-section" id="status-timeline-when" aria-labelledby="status-timeline-when-title">
            <h3 id="status-timeline-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于展示有明确状态流的发布、工单、审批、同步、巡检和告警处置链路。</li>
              <li>需要同时表达 complete、current、pending、warning、error 和节点元信息时使用 StatusTimeline。</li>
              <li>只展示历史事件记录时使用基础 Timeline；需要可点击流程导航时使用 Steps。</li>
              <li>长列表虚拟化、节点分组和审批动作由上层业务组合，不放进本组件边界。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="status-timeline-demos" aria-labelledby="status-timeline-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="status-timeline-demos-title">代码演示</h3>
              <p>示例覆盖状态流、时间、图标/线条、长说明、当前态、移动端和状态壳。</p>
            </div>
            <div className="button-doc-demo-grid status-timeline-doc__demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="status-timeline-api" aria-labelledby="status-timeline-api-title">
            <h3 id="status-timeline-api-title">API</h3>
            <DataTable rows={apiRows} />
            <h4>StatusTimelineItem</h4>
            <DataTable rows={itemRows} />
          </section>

          <section className="button-doc-section" id="status-timeline-states" aria-labelledby="status-timeline-states-title">
            <h3 id="status-timeline-states-title">状态</h3>
            <DataTable rows={stateRows} />
          </section>

          <section className="button-doc-section" id="status-timeline-semantic" aria-labelledby="status-timeline-semantic-title">
            <h3 id="status-timeline-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="status-timeline-token" aria-labelledby="status-timeline-token-title">
            <h3 id="status-timeline-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="status-timeline-a11y" aria-labelledby="status-timeline-a11y-title">
            <h3 id="status-timeline-a11y-title">a11y</h3>
            <p>
              每个节点都有状态文案和 aria-label，当前节点使用 <code>aria-current=&quot;step&quot;</code>。
              marker 与连线是装饰层，设置为 <code>aria-hidden</code>，避免重复朗读。
            </p>
          </section>

          <section className="button-doc-section" id="status-timeline-mobile" aria-labelledby="status-timeline-mobile-title">
            <h3 id="status-timeline-mobile-title">mobile</h3>
            <p>
              360px、390px 与 430px 下，文档一行验收区域收敛为单列；标题、状态标签、时间和长说明允许换行，
              marker 与连线保持固定列宽，避免内容横向溢出。
            </p>
          </section>

          <section className="button-doc-section" id="status-timeline-security" aria-labelledby="status-timeline-security-title">
            <h3 id="status-timeline-security-title">security</h3>
            <p>
              StatusTimeline 不使用 dangerouslySetInnerHTML，不解析外部 HTML，不执行字符串代码。
              title、description、meta 和 actions 是 ReactNode 槽位，调用方需要传入可信内容。
            </p>
          </section>

          <section className="button-doc-section" id="status-timeline-review" aria-labelledby="status-timeline-review-title">
            <h3 id="status-timeline-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
