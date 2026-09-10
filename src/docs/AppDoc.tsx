import { useState, type ReactNode } from "react";
import { AppProvider, AppShell, Button, Modal, useAppFeedback } from "../components/base";
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

export type AppDocProps = {
  showAnchors?: boolean;
};

export const appDocMeta = {
  title: "App 包裹组件",
  category: "基础组件",
  anchors: [
    { id: "app-when", label: "何时使用" },
    { id: "app-demos", label: "代码演示" },
    { id: "app-api", label: "API" },
    { id: "app-context", label: "Context" },
    { id: "app-boundary", label: "主题与边界" },
    { id: "app-semantic", label: "Semantic DOM" },
    { id: "app-token", label: "Design Token" },
    { id: "app-a11y", label: "可访问性" },
    { id: "app-mobile", label: "移动端" },
    { id: "app-security", label: "安全" },
    { id: "app-review", label: "五专家结论" },
    { id: "app-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<AppProvider><AppShell><Dashboard /></AppShell></AppProvider>`;

const apiRows: DocRow[] = [
  { name: "AppProvider.children", value: "ReactNode", description: "提供 App 上下文，必须包裹 AppShell 或 useAppFeedback 调用方。" },
  { name: "messagePlacement", value: '"top" | "bottom"', description: "短提示堆叠位置。默认 top。" },
  { name: "notificationPlacement", value: '"top-right" | "top-left" | "bottom-right" | "bottom-left"', description: "通知堆叠位置。默认 top-right。" },
  { name: "AppShell.children", value: "ReactNode", description: "应用内容主体。AppShell 会在同一边界内渲染 overlay root 和反馈 viewport。" },
  { name: "theme", value: '"default" | "muted" | "inverse"', description: "只控制 AppShell 容器外观，不承担全局 token、locale 或组件默认值配置。" },
  { name: "mobileSafeRoot", value: "boolean", description: "启用 safe-area padding，默认 true，适合移动端根容器。" },
];

const contextRows: DocRow[] = [
  { name: "useAppFeedback().message", value: "info | success | warning | error | open | destroy", description: "展示短暂操作反馈，支持 key 更新和 duration=0 持久展示。" },
  { name: "useAppFeedback().notification", value: "info | success | warning | error | open | destroy", description: "展示带标题和描述的边缘通知，适合异步任务或系统事件。" },
  { name: "useAppOverlayContainer()", value: "HTMLElement | null", description: "读取 AppShell 内部 overlay root；Modal 和 Drawer 默认使用该容器，调用方仍可传 container 覆盖。" },
  { name: "duration", value: "number", description: "毫秒级自动关闭时间。默认 3200，传 0 表示不自动关闭。" },
  { name: "key", value: "string", description: "用于更新或销毁指定反馈项，避免重复操作提示堆满屏幕。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-app-shell[data-c-app-theme]", description: "应用级边界容器，不改变子树语义。" },
  { name: "body", value: "div.c-app-shell__body", description: "承载业务内容，与 overlay root 同级。" },
  { name: "overlay root", value: "div[data-c-app-overlay-root]", description: "为 Modal、Drawer 等 portal 组件提供边界内挂载点。" },
  { name: "message viewport", value: 'div[role="status"][aria-live="polite"]', description: "短提示使用 polite live region，避免打断当前读屏任务。" },
  { name: "notification", value: 'section[role="status"]', description: "通知项带标题、描述和关闭按钮。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #fbfbfa", description: "default 与 muted 容器表面，保持 neutral minimal 近白层级。" },
  { name: "inverse", value: "#111110", description: "inverse 容器用于深色工具面板预览，不作为全局主题机制。" },
  { name: "safeArea", value: "env(safe-area-inset-*)", description: "root padding 会合并 safe-area 环境变量，避开系统手势区。" },
  { name: "noticeWidth", value: "min(360px, 100vw - 32px)", description: "反馈项在桌面保持可扫读宽度，在移动端不溢出。" },
  { name: "zIndex", value: "70 / 80", description: "App 反馈高于普通 tooltip/popover，overlay portal 保持在同一应用边界内。" },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-surface-muted / --ct-overlay",
    description: "AppShell、message、notification、overlay root 的 surface、border、weak shadow 和状态 mark 读取 --ct-*，亮/暗主题完整切换。",
  },
  {
    name: "结构 style",
    value: "provider context / overlay root / safe-area",
    description: "Provider 边界、overlayRoot 挂载、消息位置、通知宽度和 safe-area padding 属于结构样式，移动端自动收敛。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Live region", value: "polite", description: "message 和 notification 不使用 assertive，降低频繁操作反馈对读屏的干扰。" },
  { name: "Dismiss", value: "native button", description: "每个反馈项都有可聚焦关闭按钮，支持键盘关闭。" },
  { name: "Focus trap", value: "Modal / Drawer", description: "App 只提供容器边界，焦点管理仍由具体 overlay 组件负责。" },
  { name: "Reduced motion", value: "no required animation", description: "当前反馈项无依赖动画的状态传达，内容始终可见。" },
];

const mobileRows: DocRow[] = [
  { name: "Root safe area", value: "mobileSafeRoot=true", description: "AppShell 默认为根容器加入 safe-area padding，适合移动壳或 PWA 页面。" },
  { name: "Notice placement", value: "full width clamp", description: "移动端 message 和 notification 使用安全区内的左右间距，不贴边。" },
  { name: "Overlay boundary", value: "inside AppShell", description: "弹层默认不直接挂到 body，便于移动预览框、嵌入式工具和局部主题容器独立验收。" },
];

const securityRows: DocRow[] = [
  { name: "No HTML parsing", value: "ReactNode only", description: "反馈内容由 React 渲染，不解析 HTML 字符串，不开放 dangerouslySetInnerHTML。" },
  { name: "No remote effect", value: "local state", description: "message/notification 只维护本地队列，不访问网络、剪贴板或存储。" },
  { name: "Boundary override", value: "container prop", description: "Modal/Drawer 允许显式 container 覆盖，避免跨应用边界误挂载。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "App 解决应用级反馈和弹层边界，不抢 ConfigProvider 的全局配置职责。" },
  { name: "UI 专家", value: "PASS", description: "反馈层沿用中性色、细边框和低阴影，避免蓝色主色或 antd 视觉继承。" },
  { name: "研发专家", value: "PASS", description: "组件命名为 AppProvider/AppShell，嵌套子树读取最近的 overlay root；doc route id 保留 app。" },
  { name: "测试专家", value: "PASS", description: "覆盖 build、禁用依赖扫描、#app 路由、桌面与 360/390/430 移动端 safe-area smoke。" },
  { name: "白帽专家", value: "PASS", description: "不解析 HTML，不引入远程依赖；overlay root 明确边界，降低跨应用挂载和样式穿透风险。" },
];

const gapRows: DocRow[] = [
  { name: "Static API", value: "planned", description: "当前不提供 message.xxx 的模块级静态调用，避免脱离 React 边界。" },
  { name: "ConfigProvider merge", value: "not planned", description: "AppDoc 与 ConfigProviderDoc 独立维护，主题 token、locale、默认尺寸不放入 App。" },
  { name: "Queue policy", value: "partial", description: "当前支持 key 更新和手动 destroy，暂未提供 maxCount、分组和优先级队列。" },
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

function AppFeedbackActions() {
  const { message, notification } = useAppFeedback();

  return (
    <div className="doc-demo-row">
      <Button
        onClick={() =>
          message.success(<span data-app-doc-safe-node="message">{"<img src=x onerror=alert(1)>"}</span>, {
            key: "draft-save",
            duration: 0,
          })
        }
      >
        Message
      </Button>
      <Button
        variant="solid"
        onClick={() =>
          notification.info({
            description: <span data-app-doc-safe-node="notification-description">{0}</span>,
            duration: 0,
            key: "deploy-note",
            title: <span data-app-doc-safe-node="notification-title">{"<script>alert(1)</script>"}</span>,
          })
        }
      >
        Notification
      </Button>
      <Button variant="ghost" onClick={() => {
        message.destroy();
        notification.destroy();
      }}>
        Clear
      </Button>
    </div>
  );
}

function AppOverlayDemo() {
  const [open, setOpen] = useState(false);

  return (
    <AppProvider>
      <AppShell className="app-doc-shell-demo" theme="muted">
        <div className="app-doc-shell-demo__panel">
          <strong>Bounded application shell</strong>
          <p>Modal uses the AppShell overlay root by default, keeping portal content inside this boundary.</p>
          <Button onClick={() => setOpen(true)} variant="solid">
            Open modal
          </Button>
        </div>
        <Modal
          description="The portal host is AppShell's overlay root unless a container prop overrides it."
          onClose={() => setOpen(false)}
          open={open}
          title="App overlay boundary"
        >
          <p className="app-doc-note">This dialog stays inside the App demo root instead of escaping to document.body.</p>
        </Modal>
      </AppShell>
    </AppProvider>
  );
}

const demos: Demo[] = [
  {
    title: "反馈上下文",
    description: "AppProvider 暴露 message 和 notification；AppShell 负责渲染反馈 viewport。",
    preview: (
      <AppProvider>
        <AppShell className="app-doc-shell-demo">
          <div className="app-doc-shell-demo__panel">
            <strong>Feedback boundary</strong>
            <p>Click actions to render persistent feedback inside this shell.</p>
            <AppFeedbackActions />
          </div>
        </AppShell>
      </AppProvider>
    ),
    code: `<AppProvider><AppShell><AppFeedbackActions /></AppShell></AppProvider>`,
  },
  {
    title: "Overlay 容器边界",
    description: "Modal 和 Drawer 默认读取 AppShell 的 overlay root，适合嵌入式应用和移动预览。",
    preview: <AppOverlayDemo />,
    code: `<AppProvider><AppShell theme="muted"><Button onClick={() => setOpen(true)}>Open modal</Button><Modal open={open} onClose={() => setOpen(false)} title="App overlay boundary">Bounded portal content</Modal></AppShell></AppProvider>`,
  },
  {
    title: "移动端安全根",
    description: "mobileSafeRoot 默认开启，根容器 padding 会合并 safe-area 环境变量。",
    preview: (
      <div className="app-doc-phone" aria-label="App mobile safe root preview">
        <AppProvider notificationPlacement="bottom-right">
          <AppShell className="app-doc-phone__screen">
            <div className="app-doc-phone__bar" />
            <div className="app-doc-phone__content">
              <strong>Mobile shell</strong>
              <span>Safe-area aware root</span>
            </div>
          </AppShell>
        </AppProvider>
      </div>
    ),
    code: `<AppProvider notificationPlacement="bottom-right"><AppShell mobileSafeRoot><MobileWorkflow /></AppShell></AppProvider>`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
      <pre className="button-doc-code" aria-label={`${title} 代码`}>
        <code>{code}</code>
      </pre>
    </article>
  );
}

export function AppDoc({ showAnchors = false }: AppDocProps) {
  return (
    <TutorialScaffold component="App" kind="feedback" oneLineExample={oneLineExample} overlay>
    <section className="button-doc app-doc" aria-labelledby="app-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="App 文档目录">
            {appDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="app-doc-title">{appDocMeta.title}</h2>
            <p>
              AppDoc 独立记录 App 包裹组件，提供 feedback context、overlay container
              边界和移动端安全根。它不合并 Message/Notification 文档，不与 ConfigProvider 合并文档，也不承担主题 token 或国际化配置。
            </p>
          </header>

          <section className="button-doc-section" id="app-when" aria-labelledby="app-when-title">
            <h3 id="app-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>页面或嵌入式应用需要统一承载 message、notification 和 overlay portal 时使用。</li>
              <li>移动端根节点需要 safe-area 保护，或文档 demo 需要限制弹层挂载边界时使用。</li>
              <li>需要配置主题算法、组件默认属性或国际化时使用 ConfigProvider，而不是 App。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="app-demos" aria-labelledby="app-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="app-demos-title">代码演示</h3>
              <p>示例覆盖反馈上下文、overlay 容器边界和 mobile safe root，代码样例保持一行便于复制。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="app-api" aria-labelledby="app-api-title">
            <h3 id="app-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="app-context" aria-labelledby="app-context-title">
            <h3 id="app-context-title">Context</h3>
            <DataTable rows={contextRows} />
          </section>

          <section className="button-doc-section" id="app-boundary" aria-labelledby="app-boundary-title">
            <h3 id="app-boundary-title">主题与边界</h3>
            <ul className="button-doc-list">
              <li>AppShell 的 theme 只影响自身容器，不向外写 CSS 变量，不替代 ConfigProvider。</li>
              <li>overlay root 位于 AppShell 内部，Modal/Drawer 默认读取该容器，仍可通过 container 显式覆盖。</li>
              <li>导出的生产组件名为 AppProvider 和 AppShell，避免和文档站根组件 src/App.tsx 命名冲突。</li>
              <li>文档路由 id 保留为 app，方便按 AntD 顶级条目能力矩阵追踪。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="app-semantic" aria-labelledby="app-semantic-title">
            <h3 id="app-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="app-token" aria-labelledby="app-token-title">
            <h3 id="app-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="app-a11y" aria-labelledby="app-a11y-title">
            <h3 id="app-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="app-mobile" aria-labelledby="app-mobile-title">
            <h3 id="app-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="app-security" aria-labelledby="app-security-title">
            <h3 id="app-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="app-review" aria-labelledby="app-review-title">
            <h3 id="app-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="app-gaps" aria-labelledby="app-gaps-title">
            <h3 id="app-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
