import { useMemo, useState, type ReactNode } from "react";
import { Button, MESSAGE_DEFAULT_MAX_COUNT, Message, message, type MessageItem, type MessageStatus } from "../components/base";
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

export type MessageDocProps = {
  showAnchors?: boolean;
};

export const messageDocMeta = {
  title: "Message 全局提示",
  category: "反馈",
  anchors: [
    { id: "message-experts", label: "专家结论" },
    { id: "message-when", label: "何时使用" },
    { id: "message-demos", label: "代码演示" },
    { id: "message-api", label: "API" },
    { id: "message-semantic", label: "Semantic DOM" },
    { id: "message-token", label: "Design Token" },
    { id: "message-a11y", label: "可访问性" },
    { id: "message-mobile", label: "移动端" },
    { id: "message-security", label: "安全" },
    { id: "message-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const statusMessages: Record<MessageStatus, string> = {
  error: "Publish failed. Check validation errors.",
  info: "Draft synced with local workspace.",
  loading: "Generating release notes...",
  success: "Message API is ready.",
  warning: "Token budget is near the soft limit.",
};

const expertRows: DocRow[] = [
  { name: "产品", value: "短反馈", description: "Message 只承载操作后的轻量状态，不承载长说明、复杂动作和确认流程。" },
  { name: "UI", value: "顶部居中栈", description: "视觉保持近白、细边框、低阴影；状态用图标、文本、边框和表面共同表达。" },
  { name: "研发", value: "独立 API", description: `提供 Message/MessageStack 组件和 message 单例 API；默认最多 ${MESSAGE_DEFAULT_MAX_COUNT} 条，portal 生命周期独立清理。` },
  { name: "测试", value: "计时与关闭", description: "覆盖 stack、success/error/warning/info/loading、duration、manual close、overflow 和 destroy 后容器清理。" },
  { name: "白帽", value: "安全边界", description: "只渲染 ReactNode，不解析 HTML 字符串；无网络副作用，无外部 UI 库依赖。" },
];

function StackDemo() {
  const messages = useMemo<MessageItem[]>(
    () => [
      { content: "Build passed and artifacts are ready.", id: "doc-success", status: "success" },
      { content: "Review mobile smoke before publishing.", closable: true, id: "doc-warning", status: "warning" },
      { content: "Uploading evidence bundle...", duration: 0, id: "doc-loading", status: "loading" },
    ],
    [],
  );

  return (
    <div className="message-doc-stack-demo">
      <Message messages={messages} placement="static" />
    </div>
  );
}

function ApiDemo() {
  const [lastAction, setLastAction] = useState("No message opened yet.");

  function openStatus(status: MessageStatus) {
    const handle =
      status === "success"
        ? message.success(statusMessages[status], { closable: true })
        : status === "error"
          ? message.error(statusMessages[status], { closable: true, duration: 0, onClose: (_, reason) => setLastAction(`error closed: ${reason}`) })
          : status === "warning"
            ? message.warning(statusMessages[status], { closable: true })
            : status === "loading"
              ? message.loading(statusMessages[status], { closable: true, duration: 0 })
              : message.info(statusMessages[status], { closable: true });

    setLastAction(`${status} opened: ${handle.id}`);
  }

  function openUpdatable() {
    const handle = message.loading(<span>Saving <strong>draft</strong>...</span>, { duration: 0, id: "message-doc-save", closable: true });
    setLastAction(`loading opened: ${handle.id}`);
    window.setTimeout(() => {
      handle.update({ content: "Draft saved.", status: "success", duration: 1600 });
      setLastAction(`updated: ${handle.id}`);
    }, 900);
  }

  return (
    <div className="doc-demo-stack">
      <div className="demo-row">
        <Button size="sm" onClick={() => openStatus("success")}>Success</Button>
        <Button size="sm" onClick={() => openStatus("error")}>Error</Button>
        <Button size="sm" onClick={() => openStatus("warning")}>Warning</Button>
        <Button size="sm" onClick={() => openStatus("info")}>Info</Button>
        <Button size="sm" onClick={() => openStatus("loading")}>Loading</Button>
        <Button size="sm" variant="ghost" onClick={openUpdatable}>Update</Button>
        <Button size="sm" variant="ghost" onClick={() => message.destroy()}>Destroy</Button>
      </div>
      <p className="message-doc-action-log" aria-live="polite">{lastAction}</p>
    </div>
  );
}

function ManualCloseDemo() {
  const [messages, setMessages] = useState<MessageItem[]>([
    { content: "Manual close keeps this message until the user dismisses it.", closable: true, duration: 0, id: "manual-1", status: "info" },
  ]);

  return (
    <div className="message-doc-stack-demo">
      <Message messages={messages} placement="static" onClose={(id) => setMessages((items) => items.filter((item) => item.id !== id))} />
      {messages.length === 0 ? (
        <Button
          size="sm"
          onClick={() =>
            setMessages([
              { content: "Manual close keeps this message until the user dismisses it.", closable: true, duration: 0, id: "manual-1", status: "info" },
            ])
          }
        >
          Restore message
        </Button>
      ) : null}
    </div>
  );
}

function QueueBudgetDemo() {
  const [lastAction, setLastAction] = useState(`Queue budget keeps at most ${MESSAGE_DEFAULT_MAX_COUNT} global messages.`);

  function openBurst() {
    message.destroy();
    for (let index = 1; index <= MESSAGE_DEFAULT_MAX_COUNT + 2; index += 1) {
      message.info(`Queued save event ${index}`, {
        closable: true,
        duration: 0,
        maxCount: MESSAGE_DEFAULT_MAX_COUNT,
        onClose: (_, reason) => {
          if (reason === "overflow") {
            setLastAction(`Oldest message closed by ${reason}.`);
          }
        },
      });
    }
    setLastAction(`Opened ${MESSAGE_DEFAULT_MAX_COUNT + 2}; visible budget is ${MESSAGE_DEFAULT_MAX_COUNT}.`);
  }

  return (
    <div className="doc-demo-stack">
      <div className="demo-row">
        <Button size="sm" onClick={openBurst}>Open burst</Button>
        <Button size="sm" variant="ghost" onClick={() => message.open({ content: "Autosave event updated in place.", duration: 0, id: "autosave-debounce", maxCount: MESSAGE_DEFAULT_MAX_COUNT })}>Update same id</Button>
      </div>
      <p className="message-doc-action-log" aria-live="polite">{lastAction}</p>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "消息栈",
    description: "Message 组件可直接渲染消息栈，适合自管容器、测试和局部沙箱。",
    preview: <StackDemo />,
    code: `<Message messages={[{ id: "success", status: "success", content: "Build passed." }, { id: "warning", status: "warning", content: "Review mobile smoke.", closable: true }, { id: "loading", status: "loading", content: "Uploading...", duration: 0 }]} />`,
  },
  {
    title: "命令式 API",
    description: "message.success/error/warning/info/loading 会自动创建 portal，并在栈清空后卸载。",
    preview: <ApiDemo />,
    code: `const handle = message.loading(<span>Saving <strong>draft</strong>...</span>, { id: "save", duration: 0, closable: true, onClose: (_, reason) => console.log(reason) }); handle.update({ status: "success", content: "Draft saved.", duration: 1600 });`,
  },
  {
    title: "手动关闭",
    description: "duration=0 不自动关闭，closable 提供原生按钮和 aria-label。",
    preview: <ManualCloseDemo />,
    code: `<Message messages={[{ id: "manual", status: "info", content: "Manual close.", duration: 0, closable: true }]} onClose={(id, reason) => reason === "manual" && removeMessage(id)} />`,
  },
  {
    title: "队列预算",
    description: `高频消息默认最多保留 ${MESSAGE_DEFAULT_MAX_COUNT} 条；重复 id 会更新原消息，超出预算按 overflow 关闭最旧项。`,
    preview: <QueueBudgetDemo />,
    code: `message.info("Queued save event", { id: "autosave", maxCount: ${MESSAGE_DEFAULT_MAX_COUNT}, duration: 0, onClose: (_, reason) => console.log(reason) });`,
  },
  {
    title: "安全区",
    description: "全局 portal 使用 safe-area inset，移动端顶部堆叠不会贴住刘海或系统栏。",
    preview: (
      <div className="message-doc-mobile-frame">
        <div className="message-doc-mobile-frame__bar" />
        <div className="message-doc-mobile-frame__message">
          <Message
            placement="static"
            messages={[
              { content: "Mobile safe-area preserved.", closable: true, duration: 0, id: "mobile-safe-area", status: "success" },
            ]}
          />
        </div>
      </div>
    ),
    code: `.c-message-portal { inset: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) auto max(12px, env(safe-area-inset-left)); }`,
  },
];

const apiRows: DocRow[] = [
  { name: "Message", value: "MessageStackProps", description: "PascalCase 组件入口，渲染 messages 数组；适合受控和测试场景。" },
  { name: "messages", value: "MessageItem[]", description: "消息栈数据。每项至少需要 id、status、content。" },
  { name: "status", value: '"success" | "error" | "warning" | "info" | "loading"', description: "消息状态，决定视觉、默认 live 区域和默认 duration。" },
  { name: "content", value: "ReactNode", description: "消息内容，由 React 渲染，不解析 HTML 字符串。" },
  { name: "duration", value: "number", description: "自动关闭时间，单位 ms。success/error/warning/info 默认 3000，loading 默认 0；0 表示不自动关闭。" },
  { name: "closable", value: "boolean", description: "是否显示手动关闭按钮。默认 false。" },
  { name: "closeLabel", value: "string", description: "关闭按钮可访问名称。默认 Close message。" },
  { name: "ariaLive", value: '"polite" | "assertive" | "off"', description: "覆盖默认 live 区域。error/warning 默认 assertive，其余默认 polite。" },
  { name: "maxCount", value: "number", description: `命令式 API 队列预算，默认 ${MESSAGE_DEFAULT_MAX_COUNT}；超出后关闭最旧消息并触发 overflow。` },
  { name: "onClose", value: "(id, reason) => void", description: "关闭回调包含 manual、timeout、api、overflow、destroy 原因，便于审计与埋点。" },
  { name: "message.open", value: "(options) => MessageHandle", description: "命令式创建或按 id 更新消息，返回 close/update handle。" },
  { name: "message.destroy", value: "() => void", description: "关闭全部消息，并触发 portal cleanup。" },
  { name: "message.*", value: "success/error/warning/info/loading", description: "状态快捷方法，参数为 content 与可选 options。" },
];

const semanticRows: DocRow[] = [
  { name: "portal", value: "div[data-tessera-message-root]", description: "命令式 API 创建独立 body 容器，栈清空后卸载并移除。" },
  { name: "stack", value: "role=presentation", description: "栈容器只负责定位和堆叠，不作为可读状态本身。" },
  { name: "item", value: "role=status | alert", description: "error/warning 默认 alert，其他状态默认 status；ariaLive=off 时不输出 role。" },
  { name: "status", value: "data-status", description: "每条消息暴露 data-status，便于测试定位。" },
  { name: "close", value: "button[aria-label]", description: "手动关闭使用原生按钮，支持键盘和 focus-visible。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #fbfbfa", description: "默认和 loading 表面使用近白中性色。" },
  { name: "successSurface", value: "#f7fbf8", description: "成功消息表面，搭配绿色边框和图标。" },
  { name: "warningSurface", value: "#fcf9ef", description: "警告消息表面，搭配琥珀边框和图标。" },
  { name: "errorSurface", value: "#fcf6f6", description: "错误消息表面，搭配红色边框和图标。" },
  { name: "shadow", value: "0 8px 28px rgba(17,17,16,.12)", description: "全局浮层轻阴影，不做重拟物或蓝色主色。" },
  { name: "safeArea", value: "env(safe-area-inset-*)", description: "移动端使用系统安全区变量夹紧定位。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Live region", value: "polite/assertive", description: "非紧急状态 polite；错误和警告 assertive，避免失败信息被延迟。" },
  { name: "Dismiss", value: "native button", description: "closable 消息有可访问名称，不只依赖 × 符号。" },
  { name: "Motion", value: "prefers-reduced-motion", description: "loading spinner 复用全局减弱动态规则。" },
  { name: "Color", value: "icon + text + border", description: "状态不只靠颜色区分，文案必须能独立表达结果。" },
];

const mobileRows: DocRow[] = [
  { name: "Safe area", value: "top/right/left inset", description: "顶部全局消息避开刘海、状态栏和左右安全区。" },
  { name: "Stacking", value: "newest below", description: "队列按打开顺序从上到下堆叠，移动端仍保持 8px 间距和完整宽度约束。" },
  { name: "Budget", value: `max ${MESSAGE_DEFAULT_MAX_COUNT}`, description: "高频消息默认限制可见数量，避免顶部栈遮挡主要操作；必要时用 id 更新同一条。" },
  { name: "Width", value: "min(520px, viewport)", description: "移动端在视口内收缩，长文本 anywhere 换行。" },
  { name: "Touch", value: "32px close, 42px item", description: "关闭控件保留明确点击区域，消息主体避免过高密度。" },
];

const securityRows: DocRow[] = [
  { name: "content", value: "ReactNode", description: "不把字符串当 HTML 解析，不调用 dangerouslySetInnerHTML。" },
  { name: "side effects", value: "local DOM only", description: "命令式 API 只管理本地 portal、计时器和 React root，不发网络请求。" },
  { name: "cleanup", value: "root.unmount + remove", description: "最后一条消息关闭后卸载 React root 并移除容器，降低常驻 DOM 泄漏。" },
  { name: "dependencies", value: "self-owned", description: "不依赖 antd、antd-mobile 或 @ant-design/charts。" },
];

const faqItems = [
  { question: "Message 和 Alert 的区别是什么？", answer: "Message 是全局短反馈，会自动消失或手动关闭；Alert 是页面内持续提示，不内置计时器。" },
  { question: "loading 为什么默认不自动关闭？", answer: "loading 通常代表未完成任务，默认需要调用 close、update 或 destroy，避免误报任务结束。" },
  { question: "可以传入富文本吗？", answer: "可以传入 ReactNode，例如 strong 或 inline code；字符串不会被当作 HTML 解析。" },
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

export function MessageDoc({ showAnchors = false }: MessageDocProps) {
  return (
    <TutorialScaffold component="Message" kind="feedback" oneLineExample={`<Message tone="success">Saved</Message>`} overlay>
    <section className="button-doc message-doc" aria-labelledby="message-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Message 文档目录">
            {messageDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="message-doc-title">{messageDocMeta.title}</h2>
            <p>用于展示短暂、全局、非阻断的一行操作反馈。当前 Message 是自有 React 实现，包含独立组件、命令式 API、portal cleanup、aria-live 和移动端 safe-area 堆叠。</p>
          </header>

          <section className="button-doc-section" id="message-experts" aria-labelledby="message-experts-title">
            <h3 id="message-experts-title">五专家小组结论</h3>
            <DataTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="message-when" aria-labelledby="message-when-title">
            <h3 id="message-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>操作完成、失败、排队、同步中等短反馈，需要在当前页面顶部即时出现。</li>
              <li>信息不要求用户处理复杂动作，也不应阻断当前工作流。</li>
              <li>内容应保持短句，避免标题、描述、动作区或复杂确认流程。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="message-demos" aria-labelledby="message-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="message-demos-title">代码演示</h3>
              <p>示例覆盖 stack、五种状态、duration、manual close、API update、destroy 和移动端 safe-area。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="message-api" aria-labelledby="message-api-title">
            <h3 id="message-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="message-semantic" aria-labelledby="message-semantic-title">
            <h3 id="message-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="message-token" aria-labelledby="message-token-title">
            <h3 id="message-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="message-a11y" aria-labelledby="message-a11y-title">
            <h3 id="message-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="message-mobile" aria-labelledby="message-mobile-title">
            <h3 id="message-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="message-security" aria-labelledby="message-security-title">
            <h3 id="message-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="message-faq" aria-labelledby="message-faq-title">
            <h3 id="message-faq-title">FAQ</h3>
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
