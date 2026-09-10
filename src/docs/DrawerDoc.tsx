import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Button, Card, Drawer, Input, Segmented, Tag, Textarea } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DrawerPlacement = "bottom" | "left" | "right" | "top";

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

export type DrawerDocProps = {
  showAnchors?: boolean;
};

export const drawerDocMeta = {
  title: "Drawer 抽屉",
  category: "反馈",
  anchors: [
    { id: "drawer-when", label: "何时使用" },
    { id: "drawer-demos", label: "代码演示" },
    { id: "drawer-api", label: "API" },
    { id: "drawer-semantic", label: "Semantic DOM" },
    { id: "drawer-token", label: "Design Token" },
    { id: "drawer-a11y", label: "可访问性" },
    { id: "drawer-mobile", label: "移动端" },
    { id: "drawer-security", label: "安全" },
    { id: "drawer-review", label: "五专家结论" },
    { id: "drawer-gaps", label: "缺口" },
    { id: "drawer-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

function DrawerFormContent({ firstFieldRef }: { firstFieldRef?: RefObject<HTMLInputElement | null> }) {
  return (
    <div className="drawer-doc-form">
      <label className="drawer-doc-native-field">
        <span>任务名称</span>
        <input defaultValue="release-2026-06-07" name="drawerTaskName" ref={firstFieldRef} />
      </label>
      <Input defaultValue="component-owner" label="负责人" name="drawerOwner" />
      <Segmented
        label="优先级"
        options={[
          { label: "低", value: "low" },
          { label: "中", value: "medium" },
          { label: "高", value: "high" },
        ]}
        value="medium"
      />
      <Textarea
        defaultValue="抽屉适合承接不离开当前页面的编辑、配置和辅助详情。正文区域独立滚动，页面背景锁定滚动。"
        label="说明"
        minRows={5}
        name="drawerNotes"
      />
    </div>
  );
}

function PlacementDemo() {
  const [placement, setPlacement] = useState<DrawerPlacement>("right");
  const [open, setOpen] = useState(false);
  const [lastReason, setLastReason] = useState("尚未关闭");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  return (
    <div className="drawer-doc-playground">
      <div className="drawer-doc-toolbar">
        <Segmented
          label="展开位置"
          onValueChange={(value) => setPlacement(value as DrawerPlacement)}
          options={[
            { label: "右", value: "right" },
            { label: "左", value: "left" },
            { label: "上", value: "top" },
            { label: "下", value: "bottom" },
          ]}
          value={placement}
        />
        <Button onClick={() => setOpen(true)} ref={triggerRef} variant="solid">
          打开抽屉
        </Button>
      </div>
      <div className="drawer-doc-status" aria-live="polite">
        <Tag tone="subtle">placement: {placement}</Tag>
        <Tag tone="subtle">last close: {lastReason}</Tag>
      </div>
      <Drawer
        closeLabel="关闭任务抽屉"
        description="使用 ESC、遮罩点击、触控遮罩或关闭按钮退出。Tab 焦点会限制在抽屉内部。"
        footer={
          <div className="drawer-doc-footer">
            <Button onClick={() => setOpen(false)} variant="ghost">
              取消
            </Button>
            <Button onClick={() => setOpen(false)} variant="solid">
              保存
            </Button>
          </div>
        }
        initialFocusRef={firstFieldRef}
        onClose={(reason) => {
          setLastReason(reason);
          setOpen(false);
          window.requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        open={open}
        placement={placement}
        size="md"
        title="编辑发布任务"
      >
        <DrawerFormContent firstFieldRef={firstFieldRef} />
      </Drawer>
    </div>
  );
}

function ScrollDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="drawer-doc-playground">
      <Button onClick={() => setOpen(true)}>打开长内容抽屉</Button>
      <Drawer
        closeLabel="关闭长内容抽屉"
        description="正文区域滚动，页面 body 在抽屉打开期间 overflow:hidden。"
        footer={<Button onClick={() => setOpen(false)}>完成</Button>}
        onClose={() => setOpen(false)}
        open={open}
        placement="right"
        size="sm"
        title="滚动锁验证"
      >
        <div className="drawer-doc-long-content">
          {Array.from({ length: 12 }, (_, index) => (
            <Card
              description={`第 ${index + 1} 条内容用于确认抽屉正文滚动不会带动页面背景。`}
              key={index}
              title={`检查项 ${index + 1}`}
            >
              <p>长内容保持在抽屉内部滚动；关闭后焦点回到触发入口。</p>
            </Card>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "位置与关闭行为",
    description: "一个真实抽屉样例覆盖 right/left/top/bottom、遮罩、ESC、触控点击、焦点陷阱和关闭原因。",
    preview: <PlacementDemo />,
    code: `<Drawer open={open} placement="right" title="编辑发布任务" description="ESC、遮罩或关闭按钮退出。" initialFocusRef={firstFieldRef} onClose={() => setOpen(false)}><input ref={firstFieldRef} name="drawerTaskName" /></Drawer>`,
  },
  {
    title: "长内容与滚动锁",
    description: "抽屉正文独立滚动；打开后页面背景锁定滚动，适合检查移动端惯性滚动边界。",
    preview: <ScrollDemo />,
    code: `<Drawer open={open} placement="right" size="sm" title="滚动锁验证" onClose={() => setOpen(false)}><LongContent /></Drawer>`,
  },
];

const apiRows: DocRow[] = [
  { name: "open", value: "boolean", description: "受控显示状态。false 时不渲染 portal 内容。" },
  { name: "onClose", value: "(reason: DrawerCloseReason) => void", description: "关闭请求回调，reason 为 escape、backdrop 或 close-button。" },
  { name: "placement", value: '"right" | "left" | "top" | "bottom"', description: "抽屉从视口哪一侧展开。默认 right。" },
  { name: "size", value: '"sm" | "md" | "lg"', description: "侧向抽屉控制宽度，上下抽屉控制高度。默认 md。" },
  { name: "title", value: "ReactNode", description: "标题内容；存在时自动绑定 aria-labelledby。" },
  { name: "description", value: "ReactNode", description: "标题下说明；存在时自动加入 aria-describedby。" },
  { name: "children", value: "ReactNode", description: "抽屉正文内容，渲染在可滚动 body 区域。" },
  { name: "footer", value: "ReactNode", description: "底部动作区，常放取消、确认或保存按钮。" },
  { name: "closeOnEscape", value: "boolean", description: "是否允许 ESC 关闭。默认 true。" },
  { name: "closeOnOutsideClick", value: "boolean", description: "是否允许点击或触控遮罩关闭。默认 true。" },
  { name: "closeLabel", value: "string", description: "头部关闭按钮的可访问名称。默认 Close drawer。" },
  { name: "initialFocusRef", value: "RefObject<HTMLElement | null>", description: "打开后优先聚焦的元素；未传时聚焦关闭按钮。" },
  { name: "container", value: "HTMLElement | null", description: "portal 挂载容器；默认读取 App overlay root，否则使用 document.body。" },
  { name: "className / bodyClassName", value: "string", description: "分别追加到抽屉根节点与正文区域。" },
  { name: "aria-label / aria-describedby", value: "string", description: "无 title 时 aria-label 默认 Drawer，也可自定义；aria-describedby 会与 description 合并。" },
];

const semanticRows: DocRow[] = [
  { name: "portal", value: ".c-overlay", description: "fixed overlay 覆盖当前容器或 body；App 容器下可收敛到局部 overlay root。" },
  { name: "dialog", value: "section[role=dialog][aria-modal=true]", description: "抽屉主体是模态 dialog，title 自动关联 aria-labelledby。" },
  { name: "backdrop", value: "div[aria-hidden=true]", description: "遮罩只负责指针/触控关闭，不进入 Tab 顺序和读屏路径。" },
  { name: "header", value: "header > h2 + .c-drawer__close", description: "头部提供标题和唯一读屏可见关闭按钮；不复用 Modal 命名。" },
  { name: "description", value: ".c-drawer__description", description: "说明区使用块级容器承载 ReactNode，避免复杂内容生成无效段落嵌套。" },
  { name: "body", value: ".c-drawer__body", description: "正文区域 overflow:auto，可承载表单、详情、列表和长内容。" },
  { name: "footer", value: "footer", description: "可选动作区，保持在抽屉底部并与正文滚动分离。" },
];

const tokenRows: DocRow[] = [
  { name: "backdrop", value: "rgba(17, 17, 16, 0.28)", description: "中性遮罩，避免蓝色主色污染。" },
  { name: "surface", value: "#ffffff", description: "抽屉表面。" },
  { name: "border", value: "#dededb", description: "主体、头部和底部边界。" },
  { name: "shadow", value: "0 18px 48px rgba(17,17,16,0.18)", description: "低饱和浮层阴影，强调层级但不抢正文。" },
  { name: "z-index", value: "overlay 50 + panel 1", description: "遮罩和抽屉同属 overlay 层，面板在遮罩上方且低于更高优先级系统浮层。" },
  { name: "side size", value: "320 / 420 / 640px", description: "sm、md、lg 的左右抽屉宽度，并以 calc(100vw - 32px) 收敛。" },
  { name: "top/bottom size", value: "300 / 420 / 640px", description: "sm、md、lg 的上下抽屉高度，并以 calc(100vh - 32px) 收敛。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Focus trap", value: "document keydown", description: "Focus trap 由 Tab 和 Shift+Tab 在抽屉可聚焦元素内环绕；无可聚焦元素时聚焦 dialog。" },
  { name: "Initial focus", value: "initialFocusRef", description: "可把焦点放到首个业务字段；默认进入关闭按钮，避免焦点落在背景。" },
  { name: "Dialog name", value: "title / aria-label", description: "有 title 时绑定 aria-labelledby；无 title 时使用 aria-label，默认名称为 Drawer。" },
  { name: "Restore focus", value: "previous activeElement", description: "关闭清理时恢复打开前焦点；样例额外回补触发按钮焦点。" },
  { name: "Escape", value: "closeOnEscape", description: "Escape 默认触发 onClose('escape')；可按业务风险关闭该能力。" },
  { name: "Scroll lock", value: "body overflow hidden", description: "Scroll lock 在打开期间锁定页面滚动，并支持多个 overlay 计数恢复。" },
  { name: "Mask", value: "backdrop click", description: "mask 遮罩只承担鼠标和触控关闭，关闭原因统一回传 backdrop。" },
];

const mobileRows: DocRow[] = [
  { name: "360 / 390 / 430", value: "100vw", description: "430px 及以下左右抽屉使用移动端全宽，不产生横向溢出。" },
  { name: "top / bottom", value: "100vh cap", description: "上下抽屉在小屏按视口高度收敛，正文继续内部滚动。" },
  { name: "Safe area", value: "env(safe-area-inset-*)", description: "头部、正文和底部动作区接入系统安全区，避免贴边遮挡。" },
  { name: "Touch backdrop", value: "pointer click target", description: "遮罩触控点击与鼠标点击走同一关闭路径。" },
  { name: "Close target", value: "30px / mobile 36px", description: "关闭按钮在移动端样式规则中扩大触达面积。" },
  { name: "Long text", value: "wrap + overflow:auto", description: "标题、说明、表单和长内容不应撑出抽屉。" },
];

const securityRows: DocRow[] = [
  { name: "dependencies", value: "self-owned", description: "未引入 antd、antd-mobile 或 @ant-design/charts。" },
  { name: "content", value: "ReactNode", description: "组件接收 ReactNode，不解析 HTML 字符串，也不暴露 dangerouslySetInnerHTML；由 React 常规转义边界保护文本内容。" },
  { name: "portal", value: "container override", description: "支持显式挂载容器，降低嵌入式应用误跨边界覆盖风险。" },
  { name: "side effects", value: "scroll/focus only", description: "内部副作用限定为滚动锁、焦点管理和键盘监听，卸载时清理。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "适合二级任务、编辑表单和详情补充；文档明确不把强确认流程并入 Drawer。" },
  { name: "UI 专家", value: "PASS", description: "四方向、尺寸、遮罩、头/体/底布局完整；视觉保持 neutral minimal 中性表面。" },
  { name: "研发专家", value: "PASS", description: "实现自有 portal、滚动锁、焦点陷阱和关闭 reason；无禁用依赖。" },
  { name: "测试专家", value: "PASS", description: "专项样例可直接覆盖 desktop/mobile 的开关、位置、遮罩、ESC、触控、滚动和 Tab 环绕。" },
  { name: "白帽专家", value: "PASS", description: "不解析 HTML、不发起网络请求，遮罩从读屏树隐藏，清理副作用边界清楚。" },
];

const gapRows: DocRow[] = [
  { name: "动画", value: "planned", description: "当前无 slide transition；如补动画需尊重 prefers-reduced-motion 并补验收。" },
  { name: "Nested overlays", value: "risk note", description: "滚动锁支持计数；嵌套 Drawer/Modal 的焦点栈仍建议后续做专项自动化。" },
  { name: "Mobile safe area", value: "covered", description: "430px 及以下接入 env(safe-area-inset-*)；仍建议在真机刘海屏补充视觉抽检。" },
];

const faqItems = [
  { question: "Drawer 和 Modal 的边界是什么？", answer: "Drawer 用于不离开当前页面的辅助任务、编辑和详情；强阻断确认、危险操作和全局决策更适合 Modal。" },
  { question: "点击遮罩为什么也是关闭？", answer: "默认符合轻量侧边任务预期。高风险表单可设置 closeOnOutsideClick=false，只保留显式按钮关闭。" },
  { question: "为什么遮罩不进入读屏路径？", answer: "抽屉头部已经提供唯一的可访问关闭按钮；遮罩只承担指针和触控关闭，避免读屏用户听到重复入口。" },
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

export function DrawerDoc({ showAnchors = false }: DrawerDocProps) {
  return (
    <TutorialScaffold component="Drawer" kind="feedback" oneLineExample={`<Drawer open={open} title="Filters" onClose={() => setOpen(false)} />`} overlay>
    <section className="button-doc drawer-doc" aria-labelledby="drawer-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Drawer 文档目录">
            {drawerDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="drawer-doc-title">{drawerDocMeta.title}</h2>
            <p>
              从屏幕边缘展开的临时任务面板。当前 Drawer 是自有 React 实现，独立于 Modal 文档，
              覆盖四方向、遮罩、滚动锁、焦点陷阱、ESC 和移动端触控验收。
            </p>
          </header>

          <section className="button-doc-section" id="drawer-when" aria-labelledby="drawer-when-title">
            <h3 id="drawer-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要保留当前页面上下文，同时处理编辑、配置、筛选详情或辅助信息。</li>
              <li>任务可以从页面边缘进入，用户关闭后应回到原触发位置继续浏览。</li>
              <li>不要把强确认、危险操作阻断或全局决策流程放进 Drawer；这类场景使用 Modal。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="drawer-demos" aria-labelledby="drawer-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="drawer-demos-title">代码演示</h3>
              <p>样例一行入口可直接验收打开、关闭、位置切换、遮罩、滚动锁和键盘焦点。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="drawer-api" aria-labelledby="drawer-api-title">
            <h3 id="drawer-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="drawer-semantic" aria-labelledby="drawer-semantic-title">
            <h3 id="drawer-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="drawer-token" aria-labelledby="drawer-token-title">
            <h3 id="drawer-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="drawer-a11y" aria-labelledby="drawer-a11y-title">
            <h3 id="drawer-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="drawer-mobile" aria-labelledby="drawer-mobile-title">
            <h3 id="drawer-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="drawer-security" aria-labelledby="drawer-security-title">
            <h3 id="drawer-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="drawer-review" aria-labelledby="drawer-review-title">
            <h3 id="drawer-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="drawer-gaps" aria-labelledby="drawer-gaps-title">
            <h3 id="drawer-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>

          <section className="button-doc-section" id="drawer-faq" aria-labelledby="drawer-faq-title">
            <h3 id="drawer-faq-title">FAQ</h3>
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
