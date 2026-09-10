import { useRef, useState, type ReactNode } from "react";
import { Button, Modal, type ModalCloseReason } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type ModalDocProps = {
  showAnchors?: boolean;
};

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

export const modalDocMeta = {
  title: "Modal 对话框",
  category: "反馈",
  anchors: [
    { id: "modal-when", label: "何时使用" },
    { id: "modal-demos", label: "代码演示" },
    { id: "modal-api", label: "API" },
    { id: "modal-semantic", label: "Semantic DOM" },
    { id: "modal-style", label: "主题与结构 style" },
    { id: "modal-keyboard", label: "Keyboard / Mobile" },
    { id: "modal-security", label: "安全" },
    { id: "modal-review", label: "五专家结论" },
    { id: "modal-gaps", label: "剩余风险" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "open",
    value: "boolean",
    description: "受控显示状态；false 时不渲染 portal 内容，也不会保留背景滚动锁。",
  },
  {
    name: "onClose",
    value: "(reason: ModalCloseReason) => void",
    description: "关闭请求来源包含 escape、backdrop、close-button，业务可据此埋点或阻断关闭。",
  },
  {
    name: "title / aria-label",
    value: "ReactNode / string",
    description: "有 title 时使用 aria-labelledby；无 title 时必须传 aria-label 作为可访问名称。",
  },
  {
    name: "description / aria-describedby",
    value: "ReactNode / string",
    description: "description 自动绑定到 aria-describedby，也可叠加外部描述 id。",
  },
  {
    name: "footer",
    value: "ReactNode",
    description: "承载取消、确认或自定义操作；组件不内置按钮顺序，调用方保持业务语义。",
  },
  {
    name: "confirmLoading",
    value: "boolean",
    description: "确认提交中标记 dialog aria-busy，并暂时禁用 ESC、遮罩和关闭按钮，避免重复关闭关键流程。",
  },
  {
    name: "closeOnEscape / closeOnOutsideClick / maskClosable",
    value: "boolean",
    description: "默认都为 true；maskClosable 是遮罩关闭别名，禁用外点关闭时遮罩不进入 Tab 顺序。",
  },
  {
    name: "destroyOnClose",
    value: "boolean",
    description: "默认 true，关闭后卸载内容；设为 false 时隐藏但保留子树状态，适合临时草稿恢复。",
  },
  {
    name: "container",
    value: "HTMLElement | null",
    description: "默认挂载到 AppProvider overlay container 或 document.body；文档样例使用局部容器验收一行样例。",
  },
  {
    name: "initialFocusRef",
    value: "RefObject<HTMLElement | null>",
    description: "打开后优先聚焦指定元素，未指定时聚焦关闭按钮，再退回 dialog 根节点。",
  },
  {
    name: "size",
    value: '"sm" | "md" | "lg"',
    description: "控制最大宽度；移动端会被视口宽度夹取，内容区独立滚动。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "Portal",
    value: ".c-overlay[role=presentation]",
    description: "遮罩和 dialog 被放入独立浮层容器，避免和页面文档流交错。",
  },
  {
    name: "Backdrop",
    value: "button.c-overlay__backdrop[tabIndex=-1]",
    description: "鼠标或触控外点可关闭；无论是否允许外点关闭都不会进入键盘 Tab 顺序。",
  },
  {
    name: "Dialog",
    value: "section[role=dialog][aria-modal=true]",
    description: "根节点带 aria-modal，并通过 title 或 aria-label 形成可访问名称。",
  },
  {
    name: "Header",
    value: "h2 + button[aria-label]",
    description: "标题绑定 aria-labelledby；关闭按钮提供稳定可访问名称和 close-button reason。",
  },
  {
    name: "Body / Footer",
    value: ".c-modal__body + footer",
    description: "正文滚动和页脚操作分离，长内容不会把主要动作推出视口边界。",
  },
];

const styleRows: DocRow[] = [
  {
    name: "主题 style",
    value: "--ct-overlay / --ct-surface-elevated / --ct-shadow-2xl",
    description: "遮罩、浮层面、边框、页头页脚、hover、focus ring 和暗色模式都读取 --ct-* token，不在 ModalDoc 中硬编码主题色。",
  },
  {
    name: "结构 style",
    value: "portal / grid rows / internal scroll / viewport clamp",
    description: "z-index、container 挂载、header/body/footer 三段结构、长内容内部滚动和 360/390/430px 夹紧都属于结构样式。",
  },
];

const behaviorRows: DocRow[] = [
  {
    name: "Focus trap",
    value: "Tab / Shift+Tab loop",
    description: "打开后焦点进入 dialog，键盘焦点在关闭按钮、表单和页脚按钮之间循环。",
  },
  {
    name: "Escape",
    value: "closeOnEscape",
    description: "默认按 Escape 触发 onClose('escape')；关键流程可关闭该路径。",
  },
  {
    name: "Scroll lock",
    value: "document.body.style.overflow",
    description: "打开时锁定 body 滚动，关闭或卸载时恢复打开前的 overflow 值，并支持多浮层计数。",
  },
  {
    name: "Focus return",
    value: "automatic",
    description: "关闭后把焦点还给打开前的元素，适合表格行、工具栏和表单流。",
  },
  {
    name: "Mobile",
    value: "360 / 390 / 430px",
    description: "宽度和最大高度受视口约束，关闭按钮在粗指针设备上提升到 44px 触控尺寸。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Dependency boundary",
    value: "No antd / antd-mobile / charts",
    description: "Modal 由本仓库 React、portal hook 和 CSS 实现，不包装外部 UI 组件库。",
  },
  {
    name: "Content boundary",
    value: "ReactNode",
    description: "组件只渲染调用方传入的 React 子树，不解析 HTML 字符串，不创建注入入口。",
  },
  {
    name: "Dismiss audit",
    value: "close reason",
    description: "关闭来源可审计，关键确认流可根据 reason 拦截 backdrop 或 escape。",
  },
  {
    name: "Background isolation",
    value: "aria-modal + focus trap",
    description: "键盘不会漏到背景控件；视觉遮罩配合滚动锁降低误操作主页面的风险。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "阻断式关键流程",
    description: "open/close、title/footer、confirmLoading、maskClosable 和 destroyOnClose 边界明确；非阻断反馈使用 Message、Notification 或 Alert。",
  },
  {
    name: "UI 专家",
    value: "近白浮层体系",
    description: "遮罩、细边框、低阴影和 8px 圆角符合 neutral minimal 方向；页脚和正文分区清晰。",
  },
  {
    name: "研发专家",
    value: "受控 portal dialog",
    description: "实现覆盖 portal、滚动锁、焦点环绕、关闭 reason、尺寸和局部 container，未与 Drawer 合并。",
  },
  {
    name: "测试专家",
    value: "交互验收矩阵",
    description: "需覆盖打开关闭、遮罩、ESC、Tab 环绕、长内容滚动、按钮动作、aria-modal 和 360/390/430px。",
  },
  {
    name: "白帽专家",
    value: "边界可审计",
    description: "无 antd 系依赖，无 HTML 注入路径；关闭来源和焦点隔离可支撑安全敏感流程审计。",
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

function LongContent() {
  return (
    <div className="modal-doc-long-content">
      {Array.from({ length: 8 }, (_, index) => (
        <p key={index}>
          Checklist item {index + 1}: verify copy, permissions, fallback state, audit logging, mobile overflow,
          keyboard access, focus restoration, and release ownership before publishing.
        </p>
      ))}
    </div>
  );
}

export function ModalDoc({ showAnchors = false }: ModalDocProps) {
  const [basicOpen, setBasicOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [draft, setDraft] = useState("保留草稿");
  const [lastReason, setLastReason] = useState<ModalCloseReason | "none">("none");
  const [modalHost, setModalHost] = useState<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  function closeBasic(reason: ModalCloseReason) {
    setLastReason(reason);
    setBasicOpen(false);
  }

  function submitPendingDemo() {
    setConfirmPending(true);
    window.setTimeout(() => {
      setConfirmPending(false);
      setPendingOpen(false);
    }, 350);
  }

  const demos: Demo[] = [
    {
      title: "基础打开与关闭",
      description: "覆盖按钮打开、关闭按钮、遮罩、Escape 和关闭 reason。",
      preview: (
        <div className="doc-demo-stack">
          <Button onClick={() => setBasicOpen(true)}>打开 Modal</Button>
          <span className="doc-demo-note">最后关闭原因：{lastReason}</span>
          <Modal
            description="这个示例用于验收遮罩、ESC、关闭按钮和焦点返回。"
            onClose={closeBasic}
            open={basicOpen}
            title="发布确认"
          >
            <p>确认后会进入发布队列。关闭来源会同步给调用方。</p>
          </Modal>
        </div>
      ),
      code: `<Button onClick={() => setOpen(true)}>打开 Modal</Button><Modal open={open} title="发布确认" description="验收遮罩、ESC、关闭按钮和焦点返回。" onClose={(reason) => { setLastReason(reason); setOpen(false); }}><p>确认后会进入发布队列。</p></Modal>`,
    },
    {
      title: "表单与初始焦点",
      description: "initialFocusRef 让焦点直接进入第一个字段，Tab 在输入框、按钮和关闭按钮之间循环。",
      preview: (
        <div className="doc-demo-stack">
          <Button onClick={() => setFormOpen(true)} variant="ghost">
            打开表单 Modal
          </Button>
          <Modal
            description="焦点会优先进入变更说明输入框。"
            footer={
              <>
                <Button onClick={() => setFormOpen(false)} variant="ghost">
                  取消
                </Button>
                <Button onClick={() => setFormOpen(false)}>提交</Button>
              </>
            }
            initialFocusRef={firstFieldRef}
            onClose={() => setFormOpen(false)}
            open={formOpen}
            title="提交变更"
          >
            <label className="c-field modal-doc-field">
              <span className="c-field__label">变更说明</span>
              <input
                className="c-input"
                name="modal-change-summary"
                placeholder="例如：补充生产说明"
                ref={firstFieldRef}
                type="text"
              />
              <span className="c-field__hint">用于验收 initialFocusRef 和 Tab 环绕。</span>
            </label>
          </Modal>
        </div>
      ),
      code: `<Modal open={open} title="提交变更" initialFocusRef={firstFieldRef} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>取消</Button><Button onClick={() => setOpen(false)}>提交</Button></>} onClose={() => setOpen(false)}><input ref={firstFieldRef} className="c-input" name="summary" /></Modal>`,
    },
    {
      title: "长内容与局部容器",
      description: "文档样例把 Modal 挂载到局部容器，保持样例一行独立；真实页面仍默认挂载到 App/body。",
      preview: (
        <div className="doc-demo-stack">
          <Button onClick={() => setLongOpen(true)} variant="ghost">
            打开长内容
          </Button>
          <div className="modal-doc-inline-host" ref={setModalHost}>
            <span>局部 overlay host</span>
            <Modal
              closeOnOutsideClick={false}
              container={modalHost}
              description="遮罩外点已禁用，正文区域可滚动。"
              footer={
                <>
                  <Button onClick={() => setLongOpen(false)} variant="ghost">
                    稍后
                  </Button>
                  <Button onClick={() => setLongOpen(false)}>完成验收</Button>
                </>
              }
              onClose={() => setLongOpen(false)}
              open={longOpen}
              size="sm"
              title="长内容检查"
            >
              <LongContent />
            </Modal>
          </div>
        </div>
      ),
      code: `<div ref={setHost} className="modal-doc-inline-host"><Modal open={open} container={host} closeOnOutsideClick={false} title="长内容检查" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>稍后</Button><Button onClick={() => setOpen(false)}>完成验收</Button></>}><LongContent /></Modal></div>`,
    },
    {
      title: "确认 loading 与保留状态",
      description: "提交中锁定关闭路径，destroyOnClose=false 时关闭后保留子树输入状态。",
      preview: (
        <div className="doc-demo-stack">
          <Button onClick={() => setPendingOpen(true)} variant="ghost">
            打开确认 Modal
          </Button>
          <Modal
            confirmLoading={confirmPending}
            description="提交中 ESC、遮罩和关闭按钮都会暂时失效。"
            destroyOnClose={false}
            footer={
              <>
                <Button disabled={confirmPending} onClick={() => setPendingOpen(false)} variant="ghost">
                  取消
                </Button>
                <Button loading={confirmPending} onClick={submitPendingDemo}>
                  提交
                </Button>
              </>
            }
            maskClosable={false}
            onClose={() => setPendingOpen(false)}
            open={pendingOpen}
            title="异步提交"
          >
            <label className="c-field modal-doc-field">
              <span className="c-field__label">草稿内容</span>
              <input
                className="c-input"
                name="modal-preserved-draft"
                onChange={(event) => setDraft(event.target.value)}
                value={draft}
              />
              <span className="c-field__hint">关闭再打开后仍保留，用于验收 destroyOnClose=false。</span>
            </label>
          </Modal>
        </div>
      ),
      code: `<Modal open={open} title="异步提交" confirmLoading={loading} maskClosable={false} destroyOnClose={false} footer={<><Button disabled={loading} onClick={() => setOpen(false)}>取消</Button><Button loading={loading} onClick={submit}>提交</Button></>}><input value={draft} onChange={(event) => setDraft(event.target.value)} /></Modal>`,
    },
  ];

  return (
    <TutorialScaffold component="Modal" kind="feedback" oneLineExample={`<Modal open={open} title="Confirm" onClose={() => setOpen(false)}>Ship?</Modal>`} overlay>
    <section className="button-doc modal-doc" aria-labelledby="modal-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Modal 文档目录">
            {modalDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="modal-doc-title">{modalDocMeta.title}</h2>
            <p>
              Modal 是阻断式对话框组件，用于确认关键动作、承载短表单或展示必须立即处理的信息。它是独立反馈组件，
              不与 Drawer 合并文档，也不包装 antd、antd-mobile 或 @ant-design/charts。
            </p>
          </header>

          <section className="button-doc-section" id="modal-when" aria-labelledby="modal-when-title">
            <h3 id="modal-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要阻断当前页面并要求用户确认、提交或阅读重点信息时使用。</li>
              <li>需要焦点陷阱、ESC、遮罩、滚动锁和明确关闭来源时使用。</li>
              <li>只展示轻量提示时不使用 Modal；长时间任务状态优先使用 Progress、Message 或页面内状态。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="modal-demos" aria-labelledby="modal-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="modal-demos-title">代码演示</h3>
              <p>示例覆盖打开关闭、遮罩、ESC、焦点陷阱、按钮、confirmLoading、destroyOnClose、长内容、局部容器和移动端收敛。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="modal-api" aria-labelledby="modal-api-title">
            <h3 id="modal-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="modal-semantic" aria-labelledby="modal-semantic-title">
            <h3 id="modal-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="modal-style" aria-labelledby="modal-style-title">
            <h3 id="modal-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="modal-keyboard" aria-labelledby="modal-keyboard-title">
            <h3 id="modal-keyboard-title">Keyboard / Mobile</h3>
            <DataTable rows={behaviorRows} />
          </section>

          <section className="button-doc-section" id="modal-security" aria-labelledby="modal-security-title">
            <h3 id="modal-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="modal-review" aria-labelledby="modal-review-title">
            <h3 id="modal-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="modal-gaps" aria-labelledby="modal-gaps-title">
            <h3 id="modal-gaps-title">剩余风险</h3>
            <p>
              当前 Modal 不内置 alert/confirm 静态方法、拖拽、嵌套弹窗管理 UI 或表单校验。
              这些能力应在独立需求中扩展；Drawer 的侧边任务流仍由 Drawer 文档单独验收。
            </p>
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
