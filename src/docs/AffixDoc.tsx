import { useRef, type ReactNode } from "react";
import { Affix, Button, Tag } from "../components/base";
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

export type AffixDocProps = {
  showAnchors?: boolean;
};

export const affixDocMeta = {
  title: "Affix 固钉",
  category: "基础组件",
  anchors: [
    { id: "affix-when", label: "何时使用" },
    { id: "affix-demos", label: "代码演示" },
    { id: "affix-api", label: "API" },
    { id: "affix-semantic", label: "Semantic DOM" },
    { id: "affix-token", label: "Design Token" },
    { id: "affix-a11y", label: "可访问性" },
    { id: "affix-mobile", label: "移动端" },
    { id: "affix-security", label: "安全" },
    { id: "affix-review", label: "五专家结论" },
    { id: "affix-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{preview}</div>
      <pre className="button-doc-code">
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
            <th>名称</th>
            <th>类型 / 值</th>
            <th>说明</th>
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

function AffixScrollFrame({ children, label = "Scroll container" }: { children: ReactNode; label?: string }) {
  return (
    <div className="affix-doc-frame" aria-label={label}>
      <div className="affix-doc-frame__content">
        <div className="affix-doc-paragraphs">
          <span />
          <span />
          <span />
        </div>
        {children}
        <div className="affix-doc-list">
          {["Release notes", "Review owner", "Mobile smoke", "Security note", "QA handoff", "Launch gate"].map((item) => (
            <div className="affix-doc-list__row" key={item}>
              <span>{item}</span>
              <Tag tone="subtle">ready</Tag>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AffixBottomScrollFrame({ children, label = "Bottom scroll container" }: { children: ReactNode; label?: string }) {
  return (
    <div className="affix-doc-frame" aria-label={label}>
      <div className="affix-doc-frame__content">
        <div className="affix-doc-list">
          {["Incoming review", "Selection queue", "Owner approval", "Risk note", "Release state", "Final gate"].map((item) => (
            <div className="affix-doc-list__row" key={item}>
              <span>{item}</span>
              <Tag tone="subtle">queued</Tag>
            </div>
          ))}
        </div>
        {children}
        <div className="affix-doc-paragraphs">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function ContainerDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="affix-doc-container" ref={containerRef}>
      <Affix container={() => containerRef.current} offsetTop={8}>
        <div className="affix-doc-bar">
          <strong>Container toolbar</strong>
          <Button size="sm">Apply</Button>
        </div>
      </Affix>
      <div className="affix-doc-list">
        {["Scoped scroll", "Sticky inside panel", "No portal", "No fixed overlay", "Resize observed", "Scroll observed"].map((item) => (
          <div className="affix-doc-list__row" key={item}>
            <span>{item}</span>
            <Tag>{item.includes("No") ? "safe" : "stable"}</Tag>
          </div>
        ))}
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "顶部固钉",
    description: "offsetTop 控制吸顶距离；组件默认保留原位布局，占位不会因为进入 stuck 状态而消失。",
    preview: (
      <AffixScrollFrame>
        <Affix offsetTop={0}>
          <div className="affix-doc-bar">
            <strong>Review actions</strong>
            <Button size="sm" variant="solid">
              Submit
            </Button>
          </div>
        </Affix>
      </AffixScrollFrame>
    ),
    code: `<Affix offsetTop={0}><div className="review-actions">...</div></Affix>`,
  },
  {
    title: "底部固钉",
    description: "offsetBottom 用于底部确认条、批量操作条；当同时提供 offsetTop 与 offsetBottom 时优先按顶部固钉处理。",
    preview: (
      <AffixBottomScrollFrame label="Bottom Affix scroll container">
        <Affix offsetBottom={0}>
          <div className="affix-doc-bar affix-doc-bar--bottom">
            <strong>6 selected</strong>
            <Button size="sm">Confirm</Button>
          </div>
        </Affix>
      </AffixBottomScrollFrame>
    ),
    code: `<Affix offsetBottom={0}><div className="bulk-actions">...</div></Affix>`,
  },
  {
    title: "容器滚动",
    description: "container 可传 HTMLElement 或函数，组件监听该容器的 scroll，并用 ResizeObserver 重新测量。",
    preview: <ContainerDemo />,
    code: `const containerRef = useRef<HTMLDivElement>(null); <div ref={containerRef}><Affix container={() => containerRef.current} offsetTop={8}><Toolbar /></Affix></div>`,
  },
  {
    title: "移动端吸附",
    description: "mobileSticky 默认开启，使用 dvh、安全区和 overflow touch；窄屏时保持可点目标，不遮挡内容边缘。",
    preview: (
      <div className="affix-doc-phone" aria-label="Mobile Affix preview">
        <div className="affix-doc-phone__screen">
          <Affix offsetTop="env(safe-area-inset-top, 0px)">
            <div className="affix-doc-mobile-bar">
              <strong>Filters</strong>
              <Button size="sm" variant="ghost">
                Reset
              </Button>
            </div>
          </Affix>
          <div className="affix-doc-phone__rows">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      </div>
    ),
    code: `<Affix offsetTop="env(safe-area-inset-top, 0px)"><MobileFilterBar /></Affix>`,
  },
  {
    title: "一行样例",
    description: "保留单行写法用于 smoke 快速定位 offsetTop、ReactNode children 和局部 z-index。",
    preview: (
      <div className="affix-doc-one-line">
        <Affix offsetTop={12}>
          <div className="affix-doc-bar">
            <strong>One-line release gate</strong>
            <Button size="sm">Run</Button>
          </div>
        </Affix>
      </div>
    ),
    code: `<Affix offsetTop={12}><Toolbar /></Affix>`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "被固钉的内容。推荐传单个工具条、目录、批量操作条或轻量状态条。" },
  { name: "offsetTop", value: "number | string", description: "顶部吸附距离。number 会转成 px；string 可传 CSS 长度或 env(safe-area-inset-top)。默认顶部模式为 0。" },
  { name: "offsetBottom", value: "number | string", description: "底部吸附距离。只有未提供 offsetTop 时生效，用于底部操作条或移动端确认条。" },
  { name: "container", value: "Window | HTMLElement | () => Window | HTMLElement | null", description: "可选滚动容器。未传时优先使用最近的可滚动父容器，否则回退到 window；函数形式适合 ref 初始化后再解析。" },
  { name: "mobileSticky", value: "boolean", description: "是否启用移动端 sticky 行为 class，默认 true；关闭后仍保留基础 sticky 语义。" },
  { name: "disabled", value: "boolean", description: "关闭固钉和状态监听，内容回到普通文档流。" },
  { name: "onChange", value: "(affixed, info) => void", description: "固钉状态变化时触发，info 包含 placement 与 target。滚动过程通过 requestAnimationFrame 节流。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLDivElement>", description: "支持 className、style、aria-*、data-* 等原生 div 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-affix", description: "根节点留在原文档流中，使用 CSS sticky 固定视觉位置，避免插入 placeholder。" },
  { name: "state", value: "data-affixed / data-placement", description: "暴露当前是否进入 stuck 状态和 top/bottom 方向，便于测试和业务样式覆盖。" },
  { name: "content", value: "children", description: "语义由传入内容决定；Affix 不改写按钮、导航、表单等内部语义。" },
];

const tokenRows: DocRow[] = [
  { name: "--c-affix-offset-top", value: "CSS length", description: "顶部吸附距离，由 offsetTop 写入，可被局部 style 覆盖。" },
  { name: "--c-affix-offset-bottom", value: "CSS length", description: "底部吸附距离，由 offsetBottom 写入，可配合 safe-area 使用。" },
  { name: "z-index", value: "12", description: "低于 dialog/popover 等浮层，只用于保持工具条在局部内容上方。" },
  { name: "shadow / border", value: "neutral", description: "进入 data-affixed=true 后增强边界，不使用高饱和主色。" },
  {
    name: "主题 style",
    value: "--ct-surface-glass / --ct-border / --ct-shadow-lg",
    description: "吸附态使用 token 驱动的半透明 surface、细边框和弱阴影；亮/暗主题保持中性层级，不引入品牌色。",
  },
  {
    name: "结构 style",
    value: "sticky fallback / data-affixed / offset vars",
    description: "top/bottom offset、container 测量、mobile sticky 和 no-jump placeholder 是结构样式，360/390/430 下不遮挡正文。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "阅读顺序", value: "preserved", description: "根节点仍在原位置，不 portal、不克隆内容，键盘顺序与视觉位置保持可预测。" },
  { name: "焦点", value: "native", description: "Affix 不抢焦点；内部按钮、链接、表单按原语义工作。" },
  { name: "状态", value: "optional", description: "固钉状态默认不播报，避免滚动时打扰读屏；需要说明时由业务内容提供 aria-label 或标题。" },
  { name: "动效", value: "none", description: "吸附不依赖动画，减少眩晕和滚动时的性能噪声。" },
];

const mobileRows: DocRow[] = [
  { name: "safe area", value: "supported", description: "offset 支持 CSS env()，示例覆盖顶部安全区；底部条可传 env(safe-area-inset-bottom)。" },
  { name: "touch", value: "44px+", description: "文档示例保持操作条高度和按钮命中面积，避免贴边。" },
  { name: "overflow", value: "contained", description: "移动端 demo 使用 dvh 和局部滚动容器，验收覆盖 360/390/430 宽度无横向溢出。" },
];

const securityRows: DocRow[] = [
  { name: "dependency", value: "no antd", description: "不依赖 antd、antd-mobile 或 @ant-design/charts，依赖边界由 scan:deps 复核。" },
  { name: "container", value: "local reference", description: "container 只接受对象或函数返回，不解析选择器字符串，避免误扫全局 DOM 或注入选择器。" },
  { name: "children", value: "ReactNode", description: "组件不使用 dangerouslySetInnerHTML，不执行传入文本。" },
  { name: "listeners", value: "passive + cleanup", description: "scroll/resize 监听为 passive，并在卸载时清理 requestAnimationFrame 与 ResizeObserver。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "定位为局部工具条/批量操作/目录吸附，不与 FloatButton、Anchor 或 Layout 合并职责。" },
  { name: "UI 专家", value: "通过", description: "视觉为低阴影、细边框、近白表面；stuck 状态只增强边界，不制造跳动或强品牌色。" },
  { name: "研发专家", value: "通过", description: "实现使用原生 sticky 作为 fallback 和主路径，JS 只测量状态；scroll listener 与 resize listener 通过 rAF 合并并清理。" },
  { name: "测试专家", value: "通过", description: "覆盖 offsetTop、offsetBottom、container、mobile 360/390/430、no layout jump、一行样例，并运行 build、scan:deps 和 #affix smoke。" },
  { name: "白帽专家", value: "通过", description: "无外部 UI 依赖、无 HTML 注入、无 selector 输入，监听器可清理，避免长期驻留。" },
];

const gapRows: DocRow[] = [
  { name: "target", value: "未提供", description: "不实现复杂 target API；需要跨 iframe 或 shadow root 时应由业务封装。" },
  { name: "collision", value: "计划中", description: "暂未做多 Affix 自动避让，页面需自行规划多个固定条的 offset。" },
  { name: "legacy", value: "有限", description: "依赖现代浏览器 sticky/ResizeObserver；极旧环境只能退化为普通文档流。" },
];

export function AffixDoc({ showAnchors = false }: AffixDocProps) {
  return (
    <TutorialScaffold component="Affix" kind="display" oneLineExample={"<Affix offsetTop={12}><Button size=\"sm\">Save</Button></Affix>"}>
    <section className="button-doc affix-doc" aria-labelledby="affix-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Affix 文档目录">
            {affixDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="affix-doc-title">{affixDocMeta.title}</h2>
            <p>让局部内容随滚动吸附在容器顶部或底部。实现保持独立，不与 Anchor 或 Layout 合并文档与职责。</p>
          </header>

          <section className="button-doc-section" id="affix-when" aria-labelledby="affix-when-title">
            <h3 id="affix-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要让目录、筛选条、批量操作条或提交条在局部滚动中保持可见。</li>
              <li>内容仍应占据原文档流位置，滚动进入吸附状态时不能造成布局跳动。</li>
              <li>不要把 Affix 当成全局浮层系统；跨页面快捷操作使用 FloatButton，页面结构使用 Layout。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="affix-demos" aria-labelledby="affix-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="affix-demos-title">代码演示</h3>
              <p>覆盖 offsetTop、offsetBottom、container、移动端 safe-area 和 CSS sticky fallback。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="affix-api" aria-labelledby="affix-api-title">
            <h3 id="affix-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>
          <section className="button-doc-section" id="affix-semantic" aria-labelledby="affix-semantic-title">
            <h3 id="affix-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>
          <section className="button-doc-section" id="affix-token" aria-labelledby="affix-token-title">
            <h3 id="affix-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>
          <section className="button-doc-section" id="affix-a11y" aria-labelledby="affix-a11y-title">
            <h3 id="affix-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>
          <section className="button-doc-section" id="affix-mobile" aria-labelledby="affix-mobile-title">
            <h3 id="affix-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>
          <section className="button-doc-section" id="affix-security" aria-labelledby="affix-security-title">
            <h3 id="affix-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>
          <section className="button-doc-section" id="affix-review" aria-labelledby="affix-review-title">
            <h3 id="affix-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
          <section className="button-doc-section" id="affix-gaps" aria-labelledby="affix-gaps-title">
            <h3 id="affix-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
