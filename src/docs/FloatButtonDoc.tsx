import type { ReactNode } from "react";
import { Badge, FloatButton } from "../components/base";
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

export type FloatButtonDocProps = {
  showAnchors?: boolean;
};

export const floatButtonDocMeta = {
  title: "FloatButton 悬浮按钮",
  category: "基础组件",
  anchors: [
    { id: "float-button-when", label: "何时使用" },
    { id: "float-button-demos", label: "代码演示" },
    { id: "float-button-api", label: "API" },
    { id: "float-button-semantic", label: "Semantic DOM" },
    { id: "float-button-token", label: "Design Token" },
    { id: "float-button-a11y", label: "可访问性" },
    { id: "float-button-mobile", label: "移动端" },
    { id: "float-button-security", label: "安全" },
    { id: "float-button-review", label: "五专家结论" },
    { id: "float-button-gaps", label: "缺口" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<FloatButton label="新建任务" tooltip="新建任务">+</FloatButton>`;

function DemoSurface({ children }: { children: ReactNode }) {
  return (
    <div className="float-button-doc-surface">
      <div className="float-button-doc-surface__bar" />
      <div className="float-button-doc-surface__content">
        <span />
        <span />
        <span />
      </div>
      {children}
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "固定位置",
    description: "默认固定在视口右下角；position 支持四个角，offset 可统一或分别控制水平和垂直距离。",
    preview: (
      <DemoSurface>
        <FloatButton className="float-button-doc-fixed float-button-doc-fixed--bottom-right" label="创建任务" tooltip="创建任务">
          +
        </FloatButton>
        <FloatButton
          className="float-button-doc-fixed float-button-doc-fixed--bottom-left"
          label="返回顶部"
          position="bottom-left"
          variant="secondary"
          tooltip="返回顶部"
        >
          ↑
        </FloatButton>
      </DemoSurface>
    ),
    code: `<FloatButton label="创建任务" tooltip="创建任务">+</FloatButton>
<FloatButton
  label="返回顶部"
  position="bottom-left"
  variant="secondary"
  tooltip="返回顶部"
>
  ↑
</FloatButton>`,
  },
  {
    title: "Stack / Group",
    description: "FloatButton.Group 负责同一角落的固定堆叠；DOM 顺序即键盘顺序，底部位置视觉上从主动作向上展开。",
    preview: (
      <DemoSurface>
        <FloatButton.Group aria-label="页面快捷操作" className="float-button-doc-group" gap={10}>
          <FloatButton label="创建记录" tooltip="创建记录">+</FloatButton>
          <FloatButton label="帮助中心" shape="square" variant="secondary" tooltip="帮助中心">?</FloatButton>
          <FloatButton label="返回顶部" variant="secondary" tooltip="返回顶部">↑</FloatButton>
        </FloatButton.Group>
      </DemoSurface>
    ),
    code: `<FloatButton.Group aria-label="页面快捷操作" gap={10}>
  <FloatButton label="创建记录" tooltip="创建记录">+</FloatButton>
  <FloatButton label="帮助中心" shape="square" variant="secondary" tooltip="帮助中心">?</FloatButton>
  <FloatButton label="返回顶部" variant="secondary" tooltip="返回顶部">↑</FloatButton>
</FloatButton.Group>`,
  },
  {
    title: "视觉层级",
    description: "primary 用于页面级首要悬浮动作，secondary 用于回到顶部、帮助入口等轻量操作。",
    preview: (
      <DemoSurface>
        <FloatButton className="float-button-doc-fixed float-button-doc-fixed--top-right" label="新建记录" position="top-right">
          +
        </FloatButton>
        <FloatButton
          className="float-button-doc-fixed float-button-doc-fixed--bottom-right"
          label="帮助"
          variant="secondary"
          shape="square"
        >
          ?
        </FloatButton>
      </DemoSurface>
    ),
    code: `<FloatButton label="新建记录" position="top-right">+</FloatButton>
<FloatButton label="帮助" variant="secondary" shape="square">?</FloatButton>`,
  },
  {
    title: "Tooltip 与 aria",
    description: "label 或 aria-label 提供稳定可访问名称，tooltip 只补充说明；聚焦和悬停都会关联描述。",
    preview: (
      <DemoSurface>
        <FloatButton
          aria-label="打开命令面板"
          className="float-button-doc-fixed float-button-doc-fixed--bottom-right"
          tooltip="打开命令面板"
          tooltipPlacement="left"
        >
          ⌘
        </FloatButton>
      </DemoSurface>
    ),
    code: `<FloatButton
  aria-label="打开命令面板"
  tooltip="打开命令面板"
  tooltipPlacement="left"
>
  ⌘
</FloatButton>`,
  },
  {
    title: "Badge 与禁用",
    description: "badge 透传自有 Badge 的轻量能力；disabled 使用原生按钮禁用语义并保持徽标可读。",
    preview: (
      <DemoSurface>
        <FloatButton
          badge={{ count: 3, ariaLabel: "3 pending reviews", status: "error" }}
          className="float-button-doc-fixed float-button-doc-fixed--bottom-right"
          label="查看待审"
        >
          !
        </FloatButton>
        <FloatButton
          badge={{ dot: true, ariaLabel: "Sync paused", status: "warning" }}
          className="float-button-doc-fixed float-button-doc-fixed--bottom-left"
          disabled
          label="同步不可用"
          position="bottom-left"
          variant="secondary"
        >
          ↻
        </FloatButton>
        <FloatButton
          className="float-button-doc-fixed float-button-doc-fixed--top-right"
          label="正在提交"
          loading
          position="top-right"
          tooltip="正在提交"
        >
          +
        </FloatButton>
      </DemoSurface>
    ),
    code: `<FloatButton
  badge={{ count: 3, ariaLabel: "3 pending reviews", status: "error" }}
  label="查看待审"
>
  !
</FloatButton>
<FloatButton
  badge={{ dot: true, ariaLabel: "Sync paused", status: "warning" }}
  disabled
  label="同步不可用"
  position="bottom-left"
  variant="secondary"
>
  ↻
</FloatButton>
<FloatButton label="正在提交" loading tooltip="正在提交">
  +
</FloatButton>`,
  },
  {
    title: "移动端安全区",
    description: "组件内置 env(safe-area-inset-*) 参与四角偏移，避免贴住系统手势区或刘海区域。",
    preview: (
      <div className="float-button-doc-phone" aria-label="移动端安全区预览">
        <div className="float-button-doc-phone__top" />
        <div className="float-button-doc-phone__list">
          <span />
          <span />
          <span />
          <span />
        </div>
        <FloatButton
          className="float-button-doc-fixed float-button-doc-fixed--phone"
          label="移动端新建"
          offset={[14, 14]}
          tooltip="移动端新建"
        >
          +
        </FloatButton>
      </div>
    ),
    code: `<FloatButton label="移动端新建" offset={[14, 14]} tooltip="移动端新建">
  +
</FloatButton>`,
  },
  {
    title: "徽标状态搭配",
    description: "当悬浮动作旁需要独立状态说明时，也可在页面内容中使用 Badge 展示非固定状态，不强行塞入 FloatButton。",
    preview: (
      <div className="doc-demo-stack">
        <Badge status="processing" text="Autosave running" />
        <Badge status="success" text="Shortcut ready" />
      </div>
    ),
    code: `<Badge status="processing" text="Autosave running" />
<Badge status="success" text="Shortcut ready" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "children", value: "ReactNode", description: "按钮图标或短符号。建议保持为单个可识别图标或一个字符。" },
  { name: "label", value: "string", description: "推荐可访问名称来源，会写入 aria-label。也可直接传 aria-label。" },
  { name: "variant", value: '"primary" | "secondary"', description: "视觉层级。primary 为默认主动作，secondary 为次级悬浮动作。" },
  { name: "position", value: '"bottom-right" | "bottom-left" | "top-right" | "top-left"', description: "固定在视口四角的位置。默认 bottom-right。" },
  { name: "offset", value: "number | string | [number | string, number | string]", description: "到视口边缘的距离；数组依次为 inline、block 偏移。" },
  { name: "shape", value: '"circle" | "square"', description: "按钮外形。默认 circle，square 用于帮助、菜单等工具入口。" },
  { name: "loading", value: "boolean", description: "加载态会显示内置 spinner，并以 disabled + aria-busy 稳定禁用交互。" },
  { name: "tooltip", value: "ReactNode", description: "可选提示内容；存在时用自有 Tooltip 包裹并关联 aria-describedby。" },
  { name: "tooltipPlacement", value: '"top" | "bottom" | "left" | "right"', description: "提示位置，透传给 Tooltip。" },
  { name: "badge", value: "Pick<BadgeProps, count | dot | status | ariaLabel | ...>", description: "悬浮按钮角标，使用自有 Badge 实现，不暴露 offset 等复杂定位 API。" },
  { name: "FloatButton.Group", value: "{ position, offset, gap, aria-label }", description: "同一角落的固定堆叠容器；默认 role=group，DOM 顺序就是 Tab 顺序。" },
  { name: "ButtonHTMLAttributes", value: "ButtonHTMLAttributes<HTMLButtonElement>", description: "继承 disabled、onClick、type、title、aria-*、data-* 等原生属性，默认 type 为 button。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "button.c-float-button", description: "原生 button，保留键盘激活、禁用、焦点和 ARIA 命名语义。" },
  { name: "icon", value: "span.c-float-button__icon", description: "承载图标内容；存在可访问名称时作为装饰隐藏。" },
  { name: "badge wrapper", value: "span.c-badge", description: "传入 badge 时使用自有 Badge 包裹按钮，徽标状态由 ariaLabel 决定是否宣布。" },
  { name: "tooltip wrapper", value: "span.c-tooltip", description: "传入 tooltip 时由 Tooltip 生成描述关系和固定层定位。" },
  { name: "group", value: "div.c-float-button-group", description: "成组时使用 role=group 和 aria-label 描述这组快捷操作，不改变内部 button 语义。" },
];

const tokenRows: DocRow[] = [
  { name: "size", value: "52px", description: "桌面默认视觉尺寸，足够承载一个图标并维持命中范围。" },
  { name: "mobileSize", value: "48px", description: "窄屏略收敛，仍满足 44px 以上触摸目标。" },
  { name: "offset", value: "24px / 16px mobile", description: "默认边距；与 safe-area 环境变量一起计算实际位置。" },
  { name: "groupGap", value: "12px", description: "Group 中按钮之间的默认间距，可通过 gap 覆盖。" },
  { name: "primary", value: "#111110 / #ffffff", description: "沿用 neutral minimal 主动作的黑白对比。" },
  { name: "secondary", value: "#ffffff / #1f1f1d", description: "次级入口使用白底描边，降低对内容的遮挡感。" },
  { name: "focus", value: "#555552", description: "focus-visible 轮廓色，与基础按钮体系一致。" },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-border / --ct-focus-ring",
    description: "primary、secondary、hover、badge 边界和 tooltip 表面跟随 --ct-* 语义 token；亮/暗主题下保持中性选中态和蓝色 focus ring。",
  },
  {
    name: "结构 style",
    value: "fixed corner / safe-area / group gap",
    description: "固定四角、offset、Group 堆叠、badge/tooltip wrapper 和最小触控尺寸由结构 class 控制；360/390/430 不贴边也不互相覆盖。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Accessible name", value: "label | aria-label | title", description: "必须提供稳定名称；开发环境缺失会输出警告。" },
  { name: "Tooltip", value: "description only", description: "tooltip 不是唯一命名来源，按钮即使没有 tooltip 也应可被识别。" },
  { name: "Disabled", value: "native disabled", description: "禁用状态使用原生 disabled，不响应点击，也不会进入 Tab 顺序。" },
  { name: "Loading", value: "disabled + aria-busy", description: "加载态不改变尺寸和定位，使用 aria-busy 暴露忙碌状态。" },
  { name: "Badge announcement", value: "badge.ariaLabel", description: "计数、点状或业务状态必须传完整 ariaLabel，避免只读数字或符号。" },
  { name: "Group order", value: "DOM order", description: "Group 不做 roving tabindex；每个按钮保持原生 Tab 顺序和 Enter/Space 激活。" },
];

const mobileRows: DocRow[] = [
  { name: "Safe area", value: "env(safe-area-inset-*)", description: "四角定位都将 safe-area 纳入计算，避开系统手势和屏幕裁切。" },
  { name: "Viewport unit", value: "position: fixed", description: "组件固定在视口，不依赖父级滚动容器；文档 demo 用 class 覆盖为局部预览。" },
  { name: "Touch target", value: "48px mobile", description: "移动端按钮尺寸不低于 44px，适合单手触控。" },
  { name: "360 / 390 / 430", value: "smoke checked", description: "专项验收覆盖 360、390、430 三个移动宽度的溢出、命中区域和 fixed 定位。" },
  { name: "Collision", value: "use Group", description: "同角落多个入口应放入 FloatButton.Group，避免独立 fixed 节点互相覆盖。" },
];

const securityRows: DocRow[] = [
  { name: "dangerouslySetInnerHTML", value: "never", description: "组件 props 明确排除 HTML 注入入口。" },
  { name: "children", value: "ReactNode", description: "仅渲染 React 节点，不解析字符串为 HTML；图标由宿主传入。" },
  { name: "external dependencies", value: "none", description: "没有引入 antd、antd-mobile、@ant-design/charts 或其他新 UI 依赖。" },
  { name: "events", value: "native button", description: "点击、键盘和禁用行为交给浏览器原生语义，减少自定义事件面。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "覆盖悬浮快捷动作的核心场景：固定四角、主次层级、禁用、提醒数和返回顶部类动作。" },
  { name: "UI", value: "通过", description: "保持自有 neutral minimal 中性色、紧凑半径、清晰阴影；没有借用 Ant Design 视觉语言。" },
  { name: "研发", value: "通过", description: "组件独立于 Button，使用原生 button、自有 Tooltip/Badge/Group 和 CSS 变量，API 面较小。" },
  { name: "测试", value: "通过", description: "验收覆盖 build、依赖扫描、#float-button 路由、360/390/430 移动端和 group smoke。" },
  { name: "白帽", value: "通过", description: "无 HTML 注入入口、无新外链依赖、无动态脚本执行，badge/tooltip 内容走 React 渲染。" },
];

const matrixRows: DocRow[] = [
  { name: "教程壳层", value: "TutorialScaffold", description: "FloatButtonDoc 使用统一教程壳层承载治理信息、复制入口和真实示例，不再游离在基础组件文档之外。" },
  { name: "真实预览", value: "FloatButton / Group / Badge / Tooltip", description: "预览区渲染真实组件，并用局部 surface override 固定定位，避免文档示例遮住页面。" },
  { name: "紧凑样例", value: oneLineExample, description: "一行示例可直接复制；复杂 group、badge 和 mobile safe-area 保持紧凑可读代码块。" },
  { name: "生产约束", value: "theme style / structure style", description: "theme style 走 --ct-* 语义 token；structure style 负责 fixed、safe-area、z-index、触控尺寸、Group gap 和 preview override。" },
];

const gapRows: DocRow[] = [
  { name: "menu behavior", value: "不内置", description: "Group 是固定堆叠，不是展开菜单；折叠、更多操作和焦点圈闭需要独立组件设计。" },
  { name: "backTop behavior", value: "宿主实现", description: "滚动到顶部、打开弹窗等业务行为由 onClick 承担，组件不内置页面副作用。" },
  { name: "custom icon package", value: "未内置", description: "项目当前没有图标库；示例使用文本符号，业务可传入自有图标节点。" },
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

export function FloatButtonDoc({ showAnchors = false }: FloatButtonDocProps) {
  return (
    <TutorialScaffold component="FloatButton" kind="action" oneLineExample={oneLineExample} overlay>
    <section className="button-doc float-button-doc" aria-labelledby="float-button-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="FloatButton 文档目录">
            {floatButtonDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}
        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="float-button-doc-title">{floatButtonDocMeta.title}</h2>
            <p>固定在视口边缘的快捷动作入口，独立于 Button 文档和实现，服务高频创建、返回顶部、帮助与提醒类操作。</p>
          </header>

          <section className="button-doc-section" id="float-button-when" aria-labelledby="float-button-when-title">
            <h3 id="float-button-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>页面存在一个高频、跨滚动位置可达的主操作，例如新建、反馈、命令面板或返回顶部。</li>
              <li>操作需要固定在视口边缘，但不应遮挡主要表单、表格分页、移动端系统手势区。</li>
              <li>同一角落有多个快捷动作时使用 FloatButton.Group；不要用它取代完整工具栏或菜单。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="float-button-demos" aria-labelledby="float-button-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="float-button-demos-title">代码演示</h3>
              <p>覆盖固定位置、stack/group、主次层级、tooltip/aria、badge/disabled 与移动端 safe-area。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="float-button-api" aria-labelledby="float-button-api-title">
            <h3 id="float-button-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>
          <section className="button-doc-section" id="float-button-semantic" aria-labelledby="float-button-semantic-title">
            <h3 id="float-button-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>
          <section className="button-doc-section" id="float-button-token" aria-labelledby="float-button-token-title">
            <h3 id="float-button-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>
          <section className="button-doc-section" id="float-button-a11y" aria-labelledby="float-button-a11y-title">
            <h3 id="float-button-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>
          <section className="button-doc-section" id="float-button-mobile" aria-labelledby="float-button-mobile-title">
            <h3 id="float-button-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>
          <section className="button-doc-section" id="float-button-security" aria-labelledby="float-button-security-title">
            <h3 id="float-button-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>
          <section className="button-doc-section" id="float-button-review" aria-labelledby="float-button-review-title">
            <h3 id="float-button-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
          <section className="button-doc-section" id="float-button-matrix" aria-labelledby="float-button-matrix-title">
            <h3 id="float-button-matrix-title">四点矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>
          <section className="button-doc-section" id="float-button-gaps" aria-labelledby="float-button-gaps-title">
            <h3 id="float-button-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
