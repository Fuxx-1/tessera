import { useMemo, useState, type ReactNode } from "react";
import { Button } from "../components/base";
import { TutorialScaffold } from "./TutorialScaffold";
import {
  Notification,
  NotificationViewport,
  useNotification,
  type NotificationNoticeRecord,
  type NotificationPlacement,
} from "../components/base/Notification";
import type { ComponentDocMeta } from "./ButtonDoc";

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

export type NotificationDocProps = {
  showAnchors?: boolean;
};

const noop = () => {};

export const notificationDocMeta = {
  title: "Notification 通知提醒框",
  category: "反馈",
  anchors: [
    { id: "notification-experts", label: "专家结论" },
    { id: "notification-when", label: "何时使用" },
    { id: "notification-demos", label: "代码演示" },
    { id: "notification-api", label: "API" },
    { id: "notification-semantic", label: "Semantic DOM" },
    { id: "notification-token", label: "Design Token" },
    { id: "notification-a11y", label: "可访问性" },
    { id: "notification-mobile", label: "移动端" },
    { id: "notification-security", label: "安全" },
    { id: "notification-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const expertRows: DocRow[] = [
  { name: "产品专家", value: "富通知边界", description: "Notification 用于边缘系统更新，承载标题、说明、动作、时长和手动关闭；不替代页面内 Alert 或短暂 Message。" },
  { name: "UI 专家", value: "角落堆叠", description: "四角 placement 与 stack limit 要稳定，动作可换行，移动端必须尊重 safe-area。" },
  { name: "研发专家", value: "独立 portal", description: "自有 React 实现，提供组件、Viewport 和 useNotification API；计时器和 portal 在关闭/卸载后清理。" },
  { name: "测试专家", value: "交互验收", description: "覆盖 duration、manual close、maxCount eviction、aria live、route unmount cleanup 和 360/390/430 移动端溢出。" },
  { name: "白帽专家", value: "内容边界", description: "title、description、actions 只作为 ReactNode 渲染，不解析 HTML 字符串，不引入 antd 系依赖，不保留无界队列。" },
];

const apiRows: DocRow[] = [
  { name: "title", value: "ReactNode", description: "通知标题，必填，用于快速说明事件。" },
  { name: "description", value: "ReactNode", description: "通知正文，适合一句到两句上下文说明。" },
  { name: "actions", value: "ReactNode", description: "动作插槽，建议放 1-2 个短按钮，移动端会换行。" },
  { name: "placement", value: '"top-left" | "top-right" | "bottom-left" | "bottom-right"', description: "通知出现位置。组件和 API 均支持。" },
  { name: "duration", value: "number | null", description: "自动关闭时长，单位 ms；null 或小于等于 0 表示常驻。" },
  { name: "onClose", value: '"manual" | "escape" | "timeout" | "api" | "stack-limit"', description: "关闭原因透传给 useNotification 回调；静态组件可区分手动按钮和 Escape。" },
  { name: "closable", value: "boolean", description: "是否展示关闭按钮。默认 true。" },
  { name: "closeLabel", value: "string", description: "关闭按钮的可访问名称。默认 Close notification。" },
  { name: "ariaLive", value: '"polite" | "assertive" | "off"', description: "读屏播报强度；warning/error 默认 role 更强。" },
  { name: "tone", value: '"info" | "success" | "warning" | "error"', description: "视觉与语义语气。默认 info。" },
  { name: "maxCount", value: "number", description: "useNotification 配置项，限制同一 placement 的最大堆叠数量。默认 4。" },
  { name: "container", value: "HTMLElement | null", description: "指定 portal 容器；未传时自动创建并在空栈或卸载后清理。" },
];

const semanticRows: DocRow[] = [
  { name: "Notification", value: "article[role]", description: "单条通知使用 article；info/success 默认为 status，warning/error 或 assertive 为 alert。" },
  { name: "Viewport", value: "portal live region", description: "NotificationViewport 通过 portal 渲染四角栈，根节点也可设置 aria-live。" },
  { name: "actions", value: "button/link slot", description: "动作由调用方提供，组件只负责布局，不拦截业务语义。" },
  { name: "close", value: "button[aria-label]", description: "手动关闭是原生 button，支持键盘和 focus-visible；静态组件也会自关闭。" },
  { name: "data", value: "data-tone / data-placement", description: "暴露状态和位置数据，便于 smoke、E2E 和宿主定位。" },
];

const tokenRows: DocRow[] = [
  { name: "width", value: "min(380px, viewport-safe)", description: "默认栈宽度，移动端按 safe-area 和视口收缩。" },
  { name: "radius", value: "8px", description: "通知卡片圆角，保持和反馈类组件一致。" },
  { name: "shadow", value: "0 14px 34px rgba(...)", description: "边缘浮层使用低饱和阴影，区别于页面内 Alert。" },
  { name: "stackGap", value: "10px", description: "同 placement 通知间距。" },
  { name: "safeArea", value: "env(safe-area-inset-*)", description: "四角定位均读取安全区变量。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Live region", value: "polite/assertive/off", description: "非紧急通知保持 polite；错误和警告可以 assertive；off 不设置 role。" },
  { name: "Keyboard", value: "native close + Escape", description: "关闭按钮可 Tab 到达，Enter/Space 激活；焦点在通知内时 Escape 关闭当前通知。" },
  { name: "Readable content", value: "title + description", description: "图标为 aria-hidden，通知不能只靠颜色或符号表达。" },
  { name: "Focus", value: "no focus steal", description: "Notification 不像 Modal/Drawer 抢焦点，避免打断当前任务。" },
];

const mobileRows: DocRow[] = [
  { name: "Safe area", value: "top/right/bottom/left", description: "四角栈都会避开刘海、手势条和系统边缘。" },
  { name: "Width", value: "calc(100vw - 24px)", description: "小屏下固定留白，长标题和 description 使用 overflow-wrap。" },
  { name: "Actions", value: "wrap", description: "动作按钮允许换行，避免压缩正文或横向溢出。" },
  { name: "Close target", value: "30px+", description: "关闭按钮保持可触达，移动规则中提升为 36px。" },
];

const securityRows: DocRow[] = [
  { name: "No HTML parsing", value: "ReactNode", description: "组件不接受 HTML 字符串解析，不使用 dangerouslySetInnerHTML。" },
  { name: "No antd", value: "self-owned", description: "不依赖 antd、antd-mobile、@ant-design/charts 或其包装层。" },
  { name: "Bounded queue", value: "maxCount", description: "同一 placement 可设置上限，避免无界通知堆积。" },
  { name: "Cleanup", value: "timer + portal", description: "关闭、destroy、空栈或卸载后清理计时器和自动创建的 portal 容器。" },
];

const faqItems = [
  { question: "Notification 和 Message 有什么区别？", answer: "Message 是短反馈，通常只有一行内容；Notification 可以包含标题、说明和动作，适合异步任务或系统事件。" },
  { question: "Notification 和 Alert 能合并吗？", answer: "不合并。Alert 在页面内容流内持续展示，Notification 在视口边缘通过 portal 展示并支持 duration 与堆叠。" },
  { question: "duration={null} 会怎样？", answer: "通知会常驻，直到用户手动关闭、调用 api.close/api.destroy，或被 maxCount 挤出。" },
];

function StaticPlacementPreview() {
  const placements: NotificationPlacement[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const tones = ["info", "warning", "success", "error"] as const;

  return (
    <div className="notification-doc-placement-grid">
      {placements.map((placement, index) => (
        <Notification
          actions={<Button size="sm">Open</Button>}
          ariaLive="off"
          description="Placement keeps edge updates predictable."
          key={placement}
          placement={placement}
          title={placement}
          tone={tones[index]}
        />
      ))}
    </div>
  );
}

function ViewportPreview() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const notices = useMemo<NotificationNoticeRecord[]>(
    () => [
      {
        createdAt: 1,
        description: "Newest notices stay visible while older ones are evicted by stack limit.",
        duration: null,
        key: "viewport-a",
        placement: "top-right",
        title: "Design review ready",
        tone: "success",
      },
      {
        actions: (
          <>
            <Button size="sm">Review</Button>
            <Button size="sm" variant="ghost">Later</Button>
          </>
        ),
        createdAt: 2,
        description: "The safe-area-aware stack constrains width on mobile.",
        duration: null,
        key: "viewport-b",
        placement: "top-right",
        title: "Mobile smoke required",
        tone: "warning",
      },
      {
        createdAt: 3,
        description: "Bottom placement avoids covering header actions.",
        duration: null,
        key: "viewport-c",
        placement: "bottom-left",
        title: "Background sync complete",
        tone: "info",
      },
    ],
    [],
  );

  return (
    <div className="notification-doc-viewport-frame" ref={setContainer}>
      <div className="notification-doc-viewport-frame__bar">
        <span />
        <span />
      </div>
      <NotificationViewport notices={notices} onClose={noop} container={container} portalRootId="notification-doc-static-portal" />
    </div>
  );
}

function ApiDemo() {
  const [api, holder] = useNotification({ duration: 2400, maxCount: 3, placement: "top-right", portalRootId: "notification-doc-demo-portal" });

  const openSuccess = () => {
    api.open({
      actions: <Button size="sm">View report</Button>,
      description: "The notification will close after 2.4 seconds unless manually dismissed.",
      title: "Build artifact uploaded",
      tone: "success",
    });
  };

  const openPersistent = () => {
    api.open({
      actions: (
        <>
          <Button size="sm">Retry</Button>
          <Button size="sm" variant="ghost">Ignore</Button>
        </>
      ),
      ariaLive: "assertive",
      description: "duration=null keeps the notice visible until the user or API closes it.",
      duration: null,
      placement: "bottom-right",
      title: "Verification failed",
      tone: "error",
    });
  };

  const openStack = () => {
    for (let index = 1; index <= 5; index += 1) {
      api.open({
        description: `Stack item ${index}; maxCount keeps the newest three in this corner.`,
        duration: null,
        title: `Queued notification ${index}`,
        tone: index % 2 === 0 ? "info" : "warning",
      });
    }
  };

  const openUpdate = () => {
    const key = api.open({
      description: "This notice will update in place and then close on the updated duration.",
      duration: null,
      title: "Sync queued",
      tone: "info",
    });

    window.setTimeout(() => {
      api.update(key, {
        description: "Updated content reset the timer and closed from the refreshed notice.",
        duration: 900,
        title: "Sync complete",
        tone: "success",
      });
    }, 500);
  };

  return (
    <div className="notification-doc-api-demo">
      {holder}
      <div className="doc-demo-row">
        <Button onClick={openSuccess}>Open timed</Button>
        <Button onClick={openPersistent} variant="solid">Open persistent</Button>
        <Button onClick={openStack}>Stack limit</Button>
        <Button onClick={openUpdate} variant="ghost">Update notice</Button>
        <Button onClick={() => api.destroy()} variant="ghost">Destroy all</Button>
      </div>
      <p>API demo uses a real portal holder. Destroy all clears notices and the auto-created portal.</p>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础通知",
    description: "Notification 独立于 Alert/Message，适合边缘富通知。",
    preview: (
      <Notification
        actions={<Button size="sm">Review</Button>}
        description="A richer system update can include next action and more context."
        title="Component review completed"
        tone="success"
      />
    ),
    code: `<Notification title="Component review completed" description="A richer system update can include next action and more context." actions={<Button size="sm">Review</Button>} tone="success" />`,
  },
  {
    title: "Placement",
    description: "四角 placement 使用同一组件结构，Viewport 决定真实 portal 堆叠位置。",
    preview: <StaticPlacementPreview />,
    code: `<Notification title="top-right" placement="top-right" /> <Notification title="bottom-left" placement="bottom-left" />`,
  },
  {
    title: "长内容换行",
    description: "长标题和长正文使用 anywhere wrapping，移动端仍保持视口内夹紧。",
    preview: (
      <Notification
        ariaLive="off"
        description="Very long notification body keeps wrapping inside the card so mobile users can dismiss it without horizontal scrolling or clipped action targets."
        title="Extremely long notification title wraps without escaping the viewport or covering the close control"
        tone="warning"
      />
    ),
    code: `<Notification title="Extremely long notification title wraps without escaping the viewport" description="Very long body keeps wrapping inside the card." tone="warning" />`,
  },
  {
    title: "Viewport stack",
    description: "NotificationViewport 管理多位置栈，并在空栈后清理自动 portal。",
    preview: <ViewportPreview />,
    code: `<NotificationViewport notices={notices} onClose={(key, reason) => close(key, reason)} />`,
  },
  {
    title: "useNotification API",
    description: "Hook 返回 api 和 holder，支持 open/update/close/destroy、duration 和 maxCount。",
    preview: <ApiDemo />,
    code: `const [api, holder] = useNotification({ duration: 2400, maxCount: 3, placement: "top-right" }); const key = api.open({ title: "Build artifact uploaded", description: "The notification will close after 2.4 seconds." }); api.update(key, { title: "Build verified", duration: 900 });`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo notification-doc-demo">
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

export function NotificationDoc({ showAnchors = false }: NotificationDocProps) {
  return (
    <TutorialScaffold component="Notification" kind="feedback" oneLineExample={`<Notification title="Deploy finished" description="3 services updated" />`} overlay>
    <section className="button-doc notification-doc" aria-labelledby="notification-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Notification 文档目录">
            {notificationDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="notification-doc-title">{notificationDocMeta.title}</h2>
            <p>独立反馈组件/API，用于页面边缘的富通知。它支持 title、description、actions、placement、duration、手动关闭、Escape、stack limit、aria live、portal cleanup 与移动端 safe-area。</p>
          </header>

          <section className="button-doc-section" id="notification-experts" aria-labelledby="notification-experts-title">
            <div className="button-doc-section__heading">
              <h3 id="notification-experts-title">五专家专项结论</h3>
              <p>产品、UI、研发、测试和白帽结论作为本组件的验收口径。</p>
            </div>
            <DataTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="notification-when" aria-labelledby="notification-when-title">
            <h3 id="notification-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>异步任务、系统事件或后台同步完成后，需要在视口边缘提示用户。</li>
              <li>信息比 Message 更完整，需要标题、说明或动作，但不需要阻断当前流程。</li>
              <li>不要把页面内持续提示放到 Notification；这类场景应使用 Alert。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="notification-demos" aria-labelledby="notification-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="notification-demos-title">代码演示</h3>
              <p>覆盖静态组件、四角位置、Viewport 堆叠、duration、manual close、Escape、stack limit 和 portal holder。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="notification-api" aria-labelledby="notification-api-title">
            <h3 id="notification-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="notification-semantic" aria-labelledby="notification-semantic-title">
            <h3 id="notification-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="notification-token" aria-labelledby="notification-token-title">
            <h3 id="notification-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="notification-a11y" aria-labelledby="notification-a11y-title">
            <h3 id="notification-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="notification-mobile" aria-labelledby="notification-mobile-title">
            <h3 id="notification-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="notification-security" aria-labelledby="notification-security-title">
            <h3 id="notification-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="notification-faq" aria-labelledby="notification-faq-title">
            <h3 id="notification-faq-title">FAQ</h3>
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
