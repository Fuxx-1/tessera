import { useState, type ReactNode } from "react";
import { Button, Popconfirm, type PopconfirmCloseReason } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type PopconfirmDocProps = {
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

export const popconfirmDocMeta = {
  title: "Popconfirm 气泡确认框",
  category: "反馈",
  anchors: [
    { id: "popconfirm-when", label: "何时使用" },
    { id: "popconfirm-demos", label: "代码演示" },
    { id: "popconfirm-api", label: "API" },
    { id: "popconfirm-semantic", label: "Semantic DOM" },
    { id: "popconfirm-keyboard", label: "Keyboard / Mobile" },
    { id: "popconfirm-security", label: "安全" },
    { id: "popconfirm-review", label: "五专家结论" },
    { id: "popconfirm-gaps", label: "剩余风险" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "title",
    value: "ReactNode",
    description: "必填确认标题，绑定到 dialog 的 aria-labelledby。",
  },
  {
    name: "description",
    value: "ReactNode",
    description: "可选补充说明，适合描述影响范围或不可逆后果。",
  },
  {
    name: "confirmText / cancelText",
    value: "ReactNode",
    description: "确认和取消按钮文案，默认 Confirm / Cancel。",
  },
  {
    name: "loading",
    value: "boolean",
    description: "外部加载态；onConfirm 返回 Promise 时组件也会自动进入 pending。",
  },
  {
    name: "open / defaultOpen / onOpenChange",
    value: "controlled state",
    description: "支持受控和非受控打开状态，适合表格行操作或审计流。",
  },
  {
    name: "onConfirm / onCancel",
    value: "() => void | Promise<void>",
    description: "确认可以返回 Promise；成功 resolve 后关闭，pending 期间禁止误关。",
  },
  {
    name: "onRequestClose",
    value: "(reason) => void",
    description: "关闭原因包括 cancel、confirm、escape、outside，便于埋点和测试断言。",
  },
  {
    name: "placement",
    value: '"top" | "bottom" | "left" | "right"',
    description: "桌面按触发器定位；窄屏自动夹取到视口内并使用可触控宽度。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "Trigger",
    value: "aria-haspopup=dialog, aria-expanded, aria-controls",
    description: "触发器保留自身语义和事件处理器，组件只补充弹层关系。",
  },
  {
    name: "Panel",
    value: "span[role=dialog][aria-labelledby][aria-describedby?]",
    description: "非阻断确认面板不使用 aria-modal，也不锁定背景滚动。",
  },
  {
    name: "Actions",
    value: "button[type=button]",
    description: "取消优先获得初始焦点，确认按钮在 pending 期间 disabled + aria-busy。",
  },
];

const behaviorRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "Enter / Space / Tab",
    description: "触发器可用 Enter 或 Space 打开；面板内 Tab 做小范围环绕。",
  },
  {
    name: "Escape",
    value: "closeOnEscape",
    description: "默认开启；loading 或 async pending 时忽略 Escape，避免中断关键动作。",
  },
  {
    name: "Outside click",
    value: "closeOnOutsideClick",
    description: "默认开启；pending 时不会因外点关闭。",
  },
  {
    name: "Focus return",
    value: "automatic",
    description: "关闭后把焦点还给打开前的元素，表格行和工具栏场景不会丢失键盘位置。",
  },
  {
    name: "Mobile",
    value: "viewport clamp",
    description: "430px 以下使用视口内宽度，按钮换行并保留触控目标。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Dependency boundary",
    value: "No antd / antd-mobile",
    description: "组件由本仓库 React + CSS 实现，不包装 Popover 或 Modal，不引入外部 UI 库。",
  },
  {
    name: "Content boundary",
    value: "ReactNode",
    description: "不拼接 HTML、不使用 dangerouslySetInnerHTML，富文本清洗应交给上游专用组件。",
  },
  {
    name: "Critical action",
    value: "pending guard",
    description: "确认执行中禁用动作和关闭路径，降低重复提交和误关闭风险。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS - 轻量关键确认",
    description: "Popconfirm 只承接轻量二次确认；复杂说明、表单或多步骤流程应使用 Modal 或 Drawer。",
  },
  {
    name: "UI 专家",
    value: "PASS - 独立气泡",
    description: "保持近白表面、细边框、低阴影和警示小圆点；不与 Popover/Modal 合并视觉或文档。",
  },
  {
    name: "研发专家",
    value: "PASS - 独立实现",
    description: "自有定位、受控状态、async loading、关闭原因和焦点返回；仅复用 Button 与基础 hook。",
  },
  {
    name: "测试专家",
    value: "PASS - 交互矩阵",
    description: "覆盖 title/description、确认/取消、受控、loading、Enter/Space、Escape、外点、焦点返回和 360/390px。",
  },
  {
    name: "白帽专家",
    value: "PASS - 边界清晰",
    description: "无 antd 系依赖，无 HTML 注入路径，pending 期间阻断重复提交和误关；关闭 reason 可审计。",
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

export function PopconfirmDoc({ showAnchors = false }: PopconfirmDocProps) {
  const [controlledOpen, setControlledOpen] = useState(false);
  const [lastReason, setLastReason] = useState<PopconfirmCloseReason | "none">("none");
  const [confirmCount, setConfirmCount] = useState(0);

  const demos: Demo[] = [
    {
      title: "基础确认",
      description: "用于删除、撤销、离开页面等轻量关键动作。",
      preview: (
        <div className="doc-demo-stack">
          <Popconfirm
            confirmText="删除"
            description="该条记录会从当前视图移除。"
            onConfirm={() => setConfirmCount((count) => count + 1)}
            title="确认删除这条记录？"
          >
            <Button variant="ghost">删除记录</Button>
          </Popconfirm>
          <span className="doc-demo-note">确认次数：{confirmCount}</span>
        </div>
      ),
      code: `<Popconfirm title="确认删除这条记录？" description="该条记录会从当前视图移除。" confirmText="删除" onConfirm={deleteRecord}><Button variant="ghost">删除记录</Button></Popconfirm>`,
    },
    {
      title: "受控打开",
      description: "open/onOpenChange 适合行操作、审计或需要外部状态管理的场景。",
      preview: (
        <div className="doc-demo-stack">
          <div className="doc-demo-row">
            <Button onClick={() => setControlledOpen(true)} variant="ghost">
              外部打开
            </Button>
            <Popconfirm
              open={controlledOpen}
              onOpenChange={setControlledOpen}
              onRequestClose={setLastReason}
              placement="bottom"
              title="将此配置应用到生产？"
              description="关闭原因会同步给调用方。"
            >
              <Button>受控确认</Button>
            </Popconfirm>
          </div>
          <span className="doc-demo-note">最后关闭原因：{lastReason}</span>
        </div>
      ),
      code: `<Popconfirm open={open} onOpenChange={setOpen} onRequestClose={setReason} placement="bottom" title="将此配置应用到生产？"><Button>受控确认</Button></Popconfirm>`,
    },
    {
      title: "异步 loading",
      description: "onConfirm 返回 Promise 后自动进入 loading，pending 期间禁用关闭和重复提交。",
      preview: (
        <Popconfirm
          confirmText="归档"
          description="模拟异步提交，完成后关闭并恢复焦点。"
          onConfirm={() => new Promise((resolve) => window.setTimeout(resolve, 700))}
          title="归档该发布计划？"
        >
          <Button>异步归档</Button>
        </Popconfirm>
      ),
      code: `<Popconfirm title="归档该发布计划？" description="模拟异步提交，完成后关闭并恢复焦点。" confirmText="归档" onConfirm={() => archivePlan()}><Button>异步归档</Button></Popconfirm>`,
    },
    {
      title: "移动与方向",
      description: "桌面可指定 placement；移动宽度会自动夹取到视口内。",
      preview: (
        <div className="doc-demo-row">
          <Popconfirm placement="left" title="从左侧弹出？" description="窄屏会自动调整为视口内布局。">
            <Button size="sm">Left</Button>
          </Popconfirm>
          <Popconfirm placement="right" title="从右侧弹出？" description="按钮换行时仍保持触控目标。">
            <Button size="sm">Right</Button>
          </Popconfirm>
        </div>
      ),
      code: `<Popconfirm placement="left" title="从左侧弹出？"><Button size="sm">Left</Button></Popconfirm> <Popconfirm placement="right" title="从右侧弹出？"><Button size="sm">Right</Button></Popconfirm>`,
    },
    {
      title: "禁用状态",
      description: "disabled 时保留触发器原有外观和事件，但不会打开确认面板。",
      preview: (
        <Popconfirm disabled title="禁用时不会打开？" description="该状态用于权限不足、批量选择为空或动作暂不可用。">
          <Button variant="ghost">禁用删除</Button>
        </Popconfirm>
      ),
      code: `<Popconfirm disabled title="禁用时不会打开？" description="该状态用于权限不足、批量选择为空或动作暂不可用。"><Button variant="ghost">禁用删除</Button></Popconfirm>`,
    },
    {
      title: "长文案与转义",
      description: "标题和描述会自然换行；字符串内容由 React 转义，不作为 HTML 执行。",
      preview: (
        <Popconfirm
          confirmText="确认移除"
          description="此操作会立即移除当前项目、关联草稿和未发布配置，请确认你已经完成备份并通知相关协作者；包含 <script>alert(1)</script> 的文本会按普通内容展示。"
          title="确认移除这个包含很长名称的生产配置项 <script>alert(1)</script> 吗？"
        >
          <Button variant="ghost">长文案确认</Button>
        </Popconfirm>
      ),
      code: `<Popconfirm title="确认移除这个包含很长名称的生产配置项 <script>alert(1)</script> 吗？" description="此操作会立即移除当前项目、关联草稿和未发布配置，请确认你已经完成备份并通知相关协作者；包含 <script>alert(1)</script> 的文本会按普通内容展示。" confirmText="确认移除"><Button variant="ghost">长文案确认</Button></Popconfirm>`,
    },
  ];

  return (
    <TutorialScaffold component="Popconfirm" kind="feedback" oneLineExample={`<Popconfirm title="Delete item?" onConfirm={remove}><Button>Delete</Button></Popconfirm>`} overlay>
    <section className="button-doc popconfirm-doc" aria-labelledby="popconfirm-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Popconfirm 文档目录">
            {popconfirmDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="popconfirm-doc-title">{popconfirmDocMeta.title}</h2>
            <p>
              Popconfirm 是轻量二次确认组件，用于在当前上下文附近确认关键动作。它是独立组件，不和 Popover 或
              Modal 合并文档，也不包装 antd 系组件。
            </p>
          </header>

          <section className="button-doc-section" id="popconfirm-when" aria-labelledby="popconfirm-when-title">
            <h3 id="popconfirm-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当操作有轻微风险，需要用户明确确认但不值得进入阻断式 Modal 时使用。</li>
              <li>当确认内容需要标题、简短说明、确认和取消两个动作时使用。</li>
              <li>当流程包含复杂表单、长文案、权限说明或多步骤时，不使用 Popconfirm。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="popconfirm-demos" aria-labelledby="popconfirm-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="popconfirm-demos-title">代码演示</h3>
              <p>示例覆盖基础确认、受控状态、异步 loading、关闭 reason 和移动方向。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="popconfirm-api" aria-labelledby="popconfirm-api-title">
            <h3 id="popconfirm-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="popconfirm-semantic" aria-labelledby="popconfirm-semantic-title">
            <h3 id="popconfirm-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="popconfirm-keyboard" aria-labelledby="popconfirm-keyboard-title">
            <h3 id="popconfirm-keyboard-title">Keyboard / Mobile / a11y</h3>
            <DataTable rows={behaviorRows} />
          </section>

          <section className="button-doc-section" id="popconfirm-security" aria-labelledby="popconfirm-security-title">
            <h3 id="popconfirm-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="popconfirm-review" aria-labelledby="popconfirm-review-title">
            <h3 id="popconfirm-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="popconfirm-gaps" aria-labelledby="popconfirm-gaps-title">
            <h3 id="popconfirm-gaps-title">剩余风险</h3>
            <p>
              当前未内置多按钮、自定义图标、危险色体系或全局队列。长内容和多字段确认应升级为 Modal 或
              Drawer；Popconfirm 保持轻量确认边界。
            </p>
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
