import { useState, type ReactNode } from "react";
import { Alert, Button, Icon } from "../components/base";
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

export type AlertDocProps = {
  showAnchors?: boolean;
};

export const alertDocMeta = {
  title: "Alert 警告提示",
  category: "反馈",
  anchors: [
    { id: "alert-when", label: "何时使用" },
    { id: "alert-demos", label: "代码演示" },
    { id: "alert-api", label: "API" },
    { id: "alert-semantic", label: "Semantic DOM" },
    { id: "alert-token", label: "Design Token" },
    { id: "alert-a11y", label: "可访问性" },
    { id: "alert-mobile", label: "移动端" },
    { id: "alert-security", label: "安全" },
    { id: "alert-review", label: "专家复核" },
    { id: "alert-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

function ClosableDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="doc-demo-stack">
      {open ? (
        <Alert
          closable
          status="success"
          title="Release notes saved"
          description="The local draft has been updated."
          onClose={() => setOpen(false)}
        />
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          Restore alert
        </Button>
      )}
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "状态",
    description: "status 决定视觉语气和默认 aria role；warning 与 error 默认更强。",
    preview: (
      <div className="doc-demo-stack">
        <Alert status="info" title="Draft available" description="Review the generated component API before publishing." />
        <Alert status="success" title="Build passed" description="Types and bundle output are ready for smoke review." />
        <Alert status="warning" title="Coverage is partial" description="Confirm keyboard and mobile behavior before release." />
        <Alert status="error" title="Publish failed" description="Fix validation errors and retry the operation." />
      </div>
    ),
    code: `<Alert status="info" title="Draft available" />
<Alert status="success" title="Build passed" />
<Alert status="warning" title="Coverage is partial" />
<Alert status="error" title="Publish failed" />`,
  },
  {
    title: "一行样例",
    description: "常见表单或设置页的短提示保持一行结构，便于验收基础行高、图标和语义。",
    preview: (
      <div className="alert-doc__single-line" aria-label="Alert single row acceptance example">
        <Alert status="info" title="Settings saved." />
      </div>
    ),
    code: `<Alert status="info" title="Settings saved." />`,
  },
  {
    title: "关闭",
    description: "closable 生成带 aria-label 的关闭按钮；可受控，也可用 defaultOpen 非受控关闭。",
    preview: <ClosableDemo />,
    code: `const [open, setOpen] = useState(true);

<Alert
  open={open}
  closable
  status="success"
  title="Release notes saved"
  onClose={() => setOpen(false)}
/>`,
  },
  {
    title: "操作",
    description: "action 用于提供短动作。长流程应跳转页面或打开业务面板。",
    preview: (
      <Alert
        status="warning"
        title="Token budget is low"
        description="Compact logs before starting another broad verification pass."
        action={<Button size="sm">Compact</Button>}
      />
    ),
    code: `<Alert
  status="warning"
  title="Token budget is low"
  action={<Button size="sm">Compact</Button>}
/>`,
  },
  {
    title: "弱化图标",
    description: "showIcon=false 适合密集列表内的轻量状态，语义 role 仍由 status 决定。",
    preview: <Alert showIcon={false} status="info" title="Inline note" description="This variant avoids icon noise in dense panels." />,
    code: `<Alert showIcon={false} status="info" title="Inline note" />`,
  },
  {
    title: "自定义图标",
    description: "icon 接收安全 ReactNode；默认图标容器 aria-hidden，不重复播报视觉符号。",
    preview: (
      <Alert
        icon={<Icon decorative name="settings" size="sm" />}
        status="success"
        title="Policy synced"
        description="The custom ReactNode icon remains decorative while text carries the message."
      />
    ),
    code: `<Alert
  icon={<Icon decorative name="settings" size="sm" />}
  status="success"
  title="Policy synced"
/>`,
  },
  {
    title: "长文案",
    description: "正文区域允许自然换行，适合包含 trace、URL 或较长恢复建议的页面内提示。",
    preview: (
      <Alert
        status="warning"
        title="Verification needs another pass"
        description="The trace tessera_components_alert_mobile_wrapping_acceptance_2026_06_07 should remain readable beside the close button, with no horizontal overflow on 375px and 390px viewports."
        closable
      />
    ),
    code: `<Alert
  status="warning"
  title="Verification needs another pass"
  description="Long trace text wraps inside the alert."
  closable
/>`,
  },
];

const apiRows: DocRow[] = [
  { name: "status", value: '"info" | "success" | "warning" | "error"', description: "提示状态。默认 info。tone 仍可用作兼容别名，status 优先。" },
  { name: "title", value: "ReactNode", description: "提示标题，渲染为正文区域的强调文本。" },
  { name: "description", value: "ReactNode", description: "补充说明，适合一句话以内的状态解释。" },
  { name: "children", value: "ReactNode", description: "自定义正文内容；与 description 同时存在时会显示在其后。" },
  { name: "action", value: "ReactNode", description: "右侧短动作插槽，通常放小尺寸 Button。" },
  { name: "closable", value: "boolean", description: "是否显示关闭按钮。默认 false。" },
  { name: "closeLabel", value: "string", description: "关闭按钮的可访问名称。默认 Dismiss alert。" },
  { name: "open", value: "boolean", description: "受控显示状态。传入后关闭按钮只触发 onClose，不会自行隐藏。" },
  { name: "defaultOpen", value: "boolean", description: "非受控初始显示状态。默认 true。" },
  { name: "onClose", value: "() => void", description: "关闭按钮点击后的回调。" },
  { name: "showIcon", value: "boolean", description: "是否显示状态图标。默认 true。" },
  { name: "icon", value: "ReactNode", description: "自定义图标。图标容器默认 aria-hidden。" },
  { name: "role", value: "AriaRole", description: "透传 div role。未传时 warning/error 为 alert，info/success 为 status。" },
  { name: "aria-live", value: '"polite" | "assertive" | "off"', description: "默认随 role 输出：alert 为 assertive，status 为 polite；可由调用方覆盖。" },
  { name: "aria-atomic", value: "Booleanish", description: "默认 true，让读屏完整播报提示内容；可由调用方覆盖。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "透传 id、className、aria-*、data-* 等 div 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div[role][aria-live]", description: "根节点为 div。warning/error 默认 role=alert + assertive，info/success 默认 role=status + polite；可覆盖。" },
  { name: "icon", value: "aria-hidden", description: "默认图标只传达视觉状态，不额外进入读屏文本。" },
  { name: "close", value: "button[aria-label]", description: "关闭按钮是原生 button，名称由 closeLabel 提供。" },
  { name: "status", value: "data-status", description: "根节点暴露 data-status，便于测试和宿主侧定位。" },
];

const tokenRows: DocRow[] = [
  { name: "infoSurface", value: "#ffffff", description: "info 默认表面。" },
  { name: "successSurface", value: "#f5faf6", description: "成功提示背景。" },
  { name: "warningSurface", value: "#fbf8ef", description: "警告提示背景。" },
  { name: "errorSurface", value: "#fbf5f5", description: "错误提示背景。" },
  { name: "border", value: "#dededb", description: "默认边框；各 status 使用轻量语义边框。" },
  { name: "radius", value: "8px", description: "页面内反馈容器圆角。" },
  { name: "gap", value: "10px", description: "图标、正文、动作和关闭按钮之间的间距。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Live region", value: "role", description: "非紧急提示用 status；风险和失败提示默认 alert，避免调用方忘记语义。" },
  { name: "Dismiss", value: "button", description: "关闭使用原生按钮，支持键盘操作和 focus-visible 样式。" },
  { name: "Name", value: "title / description", description: "提示内容必须自带可读文本，不能只依赖图标或颜色。" },
  { name: "Color", value: "text + border + surface", description: "状态不只靠颜色区分，默认图标和文本共同表达。" },
];

const mobileRows: DocRow[] = [
  { name: "Layout", value: "single column actions", description: "窄屏下 action 会换到正文下方，关闭按钮保持右上角可触达。" },
  { name: "Close target", value: "36px on mobile", description: "移动端关闭按钮触达面积提升，减少误触。" },
  { name: "Text", value: "wrap", description: "标题、说明和操作区允许换行，不挤压主内容。" },
];

const securityRows: DocRow[] = [
  { name: "content", value: "ReactNode", description: "title、description、children 和 action 由 React 渲染，不解析 HTML 字符串。" },
  { name: "dangerouslySetInnerHTML", value: "never", description: "AlertProps 在类型层禁止 dangerouslySetInnerHTML，避免把提示组件变成 HTML 注入入口。" },
  { name: "close", value: "local callback", description: "关闭只触发本地 onClose，不内置网络请求、计时器或跨页面副作用。" },
  { name: "dependencies", value: "self-owned", description: "No antd / antd-mobile / @ant-design/charts；生产依赖边界由 scan:deps 复核。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "仅覆盖页面内持续提示，不合并 Result/Message/Notification 的短反馈或结果页语义。" },
  { name: "UI 专家", value: "PASS", description: "info/success/warning/error 四态、图标、action、closable 与一行样例都在同一独立 AlertDoc 中可见。" },
  { name: "研发专家", value: "PASS", description: "自有 React + scoped CSS 实现，status 优先于 tone，ReactNode 插槽不解析 HTML 字符串。" },
  { name: "测试专家", value: "PASS", description: "#alert smoke 覆盖 role alert/status、关闭交互、移动端宽度和一行样例。" },
  { name: "白帽专家", value: "PASS", description: "禁止 dangerouslySetInnerHTML，安全内容由 ReactNode 转义；禁用 antd 类外部 UI 依赖。" },
];

const faqItems = [
  { question: "status 和 tone 的关系是什么？", answer: "status 是推荐 API；tone 是早期兼容别名。当两者同时传入时，以 status 为准。" },
  { question: "Alert 会自动消失吗？", answer: "不会。Alert 是页面内提示，不内置计时器。需要短暂全局反馈时应设计 Message/Notification。" },
  { question: "closable 后是否会卸载？", answer: "非受控模式会在点击关闭后返回 null；受控模式由 open 决定是否渲染。" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo alert-doc-demo">
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

export function AlertDoc({ showAnchors = false }: AlertDocProps) {
  return (
    <TutorialScaffold component="Alert" kind="feedback" oneLineExample={`<Alert tone="warning" title="Quota is almost full" />`}>
    <section className="button-doc alert-doc" aria-labelledby="alert-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Alert 文档目录">
            {alertDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="alert-doc-title">{alertDocMeta.title}</h2>
            <p>用于在页面内容区域展示明确的状态反馈。当前 Alert 是自有 React 实现，独立覆盖 status、closable、action、icon、role alert/status、移动端和安全 ReactNode。</p>
          </header>

          <section className="button-doc-section" id="alert-when" aria-labelledby="alert-when-title">
            <h3 id="alert-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>页面、表单或面板内需要持续可见的提示、成功、警告或错误信息。</li>
              <li>信息需要被用户读完或主动关闭，而不是短暂闪现。</li>
              <li>不要用 Alert 承担 toast、弹窗确认或复杂错误详情列表。</li>
              <li>AlertDoc 独立维护，不合并 Result/Message 文档，也不复用全局反馈的生命周期规则。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="alert-demos" aria-labelledby="alert-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="alert-demos-title">代码演示</h3>
              <p>示例覆盖 status、dismiss、action、无图标和移动端换行相关结构。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="alert-api" aria-labelledby="alert-api-title">
            <h3 id="alert-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="alert-semantic" aria-labelledby="alert-semantic-title">
            <h3 id="alert-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="alert-token" aria-labelledby="alert-token-title">
            <h3 id="alert-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="alert-a11y" aria-labelledby="alert-a11y-title">
            <h3 id="alert-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="alert-mobile" aria-labelledby="alert-mobile-title">
            <h3 id="alert-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="alert-security" aria-labelledby="alert-security-title">
            <h3 id="alert-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="alert-review" aria-labelledby="alert-review-title">
            <h3 id="alert-review-title">专家复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="alert-faq" aria-labelledby="alert-faq-title">
            <h3 id="alert-faq-title">FAQ</h3>
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
