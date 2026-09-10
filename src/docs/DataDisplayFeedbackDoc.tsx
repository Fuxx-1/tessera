import { useState, type ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Empty,
  List,
  Modal,
  Popover,
  Progress,
  Skeleton,
  Spin,
  Table,
  Tooltip,
  type TableColumn,
} from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type TargetComponent =
  | "Table"
  | "List"
  | "Badge"
  | "Alert"
  | "Empty"
  | "Skeleton"
  | "Spin"
  | "Progress"
  | "Tooltip"
  | "Popover"
  | "Modal"
  | "Drawer";

type RoleReview = {
  component: TargetComponent;
  product: string;
  ui: string;
  engineering: string;
  test: string;
  security: string;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

type ReleaseRow = {
  key: string;
  name: string;
  owner: string;
  status: ReactNode;
  progress: number;
};

export type DataDisplayFeedbackDocProps = {
  showAnchors?: boolean;
};

export const dataDisplayFeedbackDocMeta = {
  title: "Data Display / Feedback / Overlay 生产化",
  category: "Base components",
  anchors: [
    { id: "base-scope", label: "范围" },
    { id: "base-demos", label: "状态演示" },
    { id: "base-api", label: "API" },
    { id: "base-dom", label: "Semantic DOM" },
    { id: "base-a11y", label: "A11y / Mobile" },
    { id: "base-security", label: "Security" },
    { id: "base-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Table caption="Release readiness" columns={columns} data={rows} rowKey="key" scrollX={760} />`;

const targetComponents: TargetComponent[] = [
  "Table",
  "List",
  "Badge",
  "Alert",
  "Empty",
  "Skeleton",
  "Spin",
  "Progress",
  "Tooltip",
  "Popover",
  "Modal",
  "Drawer",
];

const releaseRows: ReleaseRow[] = [
  {
    key: "table",
    name: "Table",
    owner: "Base team",
    status: <Badge status="success" text="ready" />,
    progress: 92,
  },
  {
    key: "overlay",
    name: "Overlay",
    owner: "Feedback team",
    status: <Badge status="processing" text="review" />,
    progress: 76,
  },
  {
    key: "mobile",
    name: "Mobile QA",
    owner: "Design QA",
    status: <Badge status="warning" text="narrow" />,
    progress: 64,
  },
];

const releaseColumns: Array<TableColumn<ReleaseRow>> = [
  { key: "name", title: "Component", dataIndex: "name", width: 160 },
  { key: "owner", title: "Owner", dataIndex: "owner", width: 160 },
  { key: "status", title: "Status", dataIndex: "status", width: 150 },
  {
    key: "progress",
    title: "Progress",
    dataIndex: "progress",
    width: 220,
    render: (value) => <Progress value={Number(value)} label="Readiness" />,
  },
];

const apiRows: DocRow[] = [
  {
    name: "Table",
    value: "columns, data, rowKey, loading, error, scrollX, stickyHeader",
    description: "横向滚动容器具有 region 语义和键盘可聚焦入口；加载和错误状态不会与数据行混排。",
  },
  {
    name: "List",
    value: "items, renderItem, getKey, header, footer, loading, error",
    description: "以 role=list/listitem 输出结构化行，保留 header/footer 和空、加载、错误状态。",
  },
  {
    name: "Badge / Alert",
    value: "status, count, dot, text / tone, action, closable",
    description: "Badge 支持计数和状态文本；Alert 根据 tone 默认选择 status 或 alert 语义。",
  },
  {
    name: "Empty / Skeleton / Spin / Progress",
    value: "action, lines, label, value, max, status",
    description: "覆盖空、加载占位、加载中、确定进度四类反馈，均提供可读名称或状态语义。",
  },
  {
    name: "Tooltip / Popover",
    value: "content, placement, open, defaultOpen, onOpenChange",
    description: "Tooltip 支持 hover/focus/touch 和 Escape 关闭；Popover 支持受控状态、外点关闭和键盘打开。",
  },
  {
    name: "Modal / Drawer",
    value: "open, title, description, footer, onClose(reason), closeOnEscape, closeOnOutsideClick, initialFocusRef, container",
    description: "阻断式弹层锁定页面滚动、初始聚焦、Tab 焦点环绕、Escape/遮罩/关闭按钮 reason 和关闭后焦点恢复。",
  },
];

const domRows: DocRow[] = [
  {
    name: "Table",
    value: "table, caption, thead, tbody, th[scope=col], td",
    description: "横滚外层使用 role=region + aria-label，便于键盘和读屏定位宽表。",
  },
  {
    name: "List",
    value: "section[aria-busy], div[role=list], div[role=listitem]",
    description: "不强制 item 内容形态，业务可放链接、按钮或描述块。",
  },
  {
    name: "Overlay",
    value: "section[role=dialog][aria-modal=true][aria-labelledby]",
    description: "Modal 和 Drawer 共享弹层焦点管理；标题存在时自动绑定 aria-labelledby。",
  },
  {
    name: "Floating",
    value: "Tooltip role=tooltip, Popover role=dialog",
    description: "短提示和可交互内容分离；Popover 触发器声明 aria-haspopup 和 aria-expanded。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Dependency boundary",
    value: "No antd / antd-mobile / @ant-design/charts",
    description: "本批组件只使用 React 和本仓库基础工具，不引入外部 UI 包。",
  },
  {
    name: "Content rendering",
    value: "ReactNode, no innerHTML",
    description: "组件不拼接 HTML，不执行用户字符串。富文本清洗仍应留给 MarkdownEditor 等专用组件。",
  },
  {
    name: "Overlay behavior",
    value: "focus trap, scroll lock, explicit close policy",
    description: "减少焦点逃逸、背景误操作和移动端滚动穿透。遮罩关闭和 Escape 可按场景关闭。",
  },
  {
    name: "Data display",
    value: "stable keys and bounded values",
    description: "Table/List 允许调用方提供稳定 key；Progress 对非法值和越界值做 clamp。",
  },
];

const roleReviews: RoleReview[] = targetComponents.map((component) => ({
  component,
  product:
    component === "Modal" || component === "Drawer"
      ? "用于明确的阻断式或侧边流程，关闭策略必须可解释。"
      : "覆盖常见数据呈现和状态反馈，默认文案保持中性且可被业务覆盖。",
  ui:
    component === "Table"
      ? "宽表保持横滚，不压缩到不可读；390px 和 360px 下保留稳定边距。"
      : "视觉延续近白表面、细边框、低阴影，触控目标和文本换行按窄屏校验。",
  engineering:
    component === "Tooltip" || component === "Popover"
      ? "触发器保留原事件处理器，并补充键盘/触屏关闭路径。"
      : "API 保持向后兼容，新增生产行为通过可选 props 暴露。",
  test:
    component === "Modal" || component === "Drawer"
      ? "重点验收打开聚焦、Tab 环绕、Escape、遮罩关闭、关闭后焦点恢复和滚动锁。"
      : "验收 ready/loading/error/empty/disabled 或状态变体，并在 390px/360px 观察溢出。",
  security:
    component === "Modal" || component === "Drawer" || component === "Popover"
      ? "白帽重点关注背景操作隔离、焦点逃逸、误关策略和未清洗 HTML 注入。"
      : "白帽重点关注文本渲染边界、ARIA 误报、状态颜色不可作为唯一信息。",
}));

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">组件 / 项</th>
            <th scope="col">接口 / 语义</th>
            <th scope="col">生产说明</th>
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

export function DataDisplayFeedbackDoc({ showAnchors = false }: DataDisplayFeedbackDocProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <TutorialScaffold component="Data Display / Feedback" kind="feedback" oneLineExample={oneLineExample} overlay>
    <section className="base-production-doc" aria-labelledby="base-production-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Base production 文档目录">
            {dataDisplayFeedbackDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">production batch</p>
            <h2 id="base-production-title">{dataDisplayFeedbackDocMeta.title}</h2>
            <p>
              本页覆盖 Table/List/Badge/Alert/Empty/Skeleton/Spin/Progress/Tooltip/Popover/Modal/Drawer 的生产验收面：
              状态、ARIA、焦点、关闭行为、移动端、表格横滚和弹层安全。
            </p>
          </header>

          <section className="button-doc-section" id="base-scope" aria-labelledby="base-scope-title">
            <h3 id="base-scope-title">范围</h3>
            <div className="base-production-chip-grid">
              {targetComponents.map((component) => (
                <Badge ariaLabel={`${component} production reviewed`} status="success" text={component} key={component} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="base-demos" aria-labelledby="base-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="base-demos-title">状态演示</h3>
              <p>同屏覆盖数据展示、反馈状态、浮层和阻断式弹层，便于 desktop 与 390px/360px smoke。</p>
            </div>
            <div className="base-production-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Table / List / Progress</h3>
                  <p>Table 使用横滚 region，List 展示行结构，Progress 输出可读进度。</p>
                </div>
                <Table
                  caption="Production readiness"
                  columns={releaseColumns}
                  data={releaseRows}
                  rowKey="key"
                  scrollX={760}
                  stickyHeader
                />
                <List
                  header="Review queue"
                  items={releaseRows}
                  getKey={(item) => item.key}
                  renderItem={(item) => (
                    <div className="base-production-list-row">
                      <span>{item.name}</span>
                      <span>{item.status}</span>
                    </div>
                  )}
                />
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Feedback states</h3>
                  <p>Alert、Empty、Skeleton、Spin 展示 ready/error/empty/loading 的真实 DOM。</p>
                </div>
                <Alert
                  action={<Button size="sm">View log</Button>}
                  closable
                  description="Docs, ARIA, focus behavior and mobile smoke are in scope."
                  tone="success"
                  title="Batch review ready"
                />
                <Empty
                  action={
                    <Button size="sm" variant="ghost">
                      Create record
                    </Button>
                  }
                  description="Filtered result returned no rows."
                  title="No matching data"
                />
                <Skeleton avatar paragraph={{ rows: 3 }} />
                <Spin label="Refreshing status" size="sm" />
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Tooltip / Popover / Overlay</h3>
                  <p>Tooltip 支持 focus/touch；Popover 支持受控语义；Modal/Drawer 管理焦点和关闭行为。</p>
                </div>
                <div className="demo-row">
                  <Tooltip content="Short, non-interactive helper text.">
                    <Button variant="ghost">Tooltip</Button>
                  </Tooltip>
                  <Popover
                    title="Popover title"
                    content="Use popover for richer non-modal context. Escape or outside click closes it."
                  >
                    <Button variant="ghost">Popover</Button>
                  </Popover>
                  <Button onClick={() => setModalOpen(true)}>Open modal</Button>
                  <Button onClick={() => setDrawerOpen(true)} variant="ghost">
                    Open drawer
                  </Button>
                </div>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="base-api" aria-labelledby="base-api-title">
            <h3 id="base-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="base-dom" aria-labelledby="base-dom-title">
            <h3 id="base-dom-title">Semantic DOM</h3>
            <DataTable rows={domRows} />
          </section>

          <section className="button-doc-section" id="base-a11y" aria-labelledby="base-a11y-title">
            <h3 id="base-a11y-title">A11y / Mobile</h3>
            <ul className="button-doc-list">
              <li>390px 和 360px 下文档区不横向撑破；宽表只在表格 region 内横滚。</li>
              <li>Modal/Drawer 打开后初始聚焦关闭按钮，Tab 在弹层内环绕，关闭后恢复触发按钮焦点。</li>
              <li>Tooltip 不只依赖 hover，焦点和触屏 pointerdown 都可展示，Escape 可关闭。</li>
              <li>Progress、Spin、Skeleton、Alert 输出 status/alert/progressbar 等语义，状态不只依赖颜色。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="base-security" aria-labelledby="base-security-title">
            <h3 id="base-security-title">Security</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="base-review" aria-labelledby="base-review-title">
            <h3 id="base-review-title">五角色审查</h3>
            <div className="base-production-review-grid">
              {roleReviews.map((review) => (
                <article className="base-production-review" key={review.component}>
                  <h4>{review.component}</h4>
                  <dl>
                    <div>
                      <dt>产品专家</dt>
                      <dd>{review.product}</dd>
                    </div>
                    <div>
                      <dt>UI 专家</dt>
                      <dd>{review.ui}</dd>
                    </div>
                    <div>
                      <dt>研发专家</dt>
                      <dd>{review.engineering}</dd>
                    </div>
                    <div>
                      <dt>测试专家</dt>
                      <dd>{review.test}</dd>
                    </div>
                    <div>
                      <dt>白帽专家</dt>
                      <dd>{review.security}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal
        description="Checks focus trap, Escape, backdrop, aria-modal and close reason behavior."
        footer={<Button onClick={() => setModalOpen(false)}>Confirm</Button>}
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        size="md"
        title="Production modal"
      >
        <p>
          Modal locks page scroll, traps focus inside the dialog, closes with Escape or backdrop by default, and restores
          focus to the opener after close.
        </p>
      </Modal>

      <Drawer
        description="Uses the same modal overlay contract with a side-panel layout."
        footer={<Button onClick={() => setDrawerOpen(false)}>Done</Button>}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        placement="right"
        size="md"
        title="Production drawer"
      >
        <p>Drawer shares the overlay contract with Modal while preserving a side-panel layout for secondary workflows.</p>
      </Drawer>
    </section>
    </TutorialScaffold>
  );
}
