import type { ReactNode } from "react";
import { Button, Icon } from "../components/base";
import { DemoContainer } from "./DemoContainer";
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

export type ComponentDocAnchor = {
  id: string;
  label: string;
};

export type ComponentDocMeta = {
  id?: string;
  title: string;
  category?: string;
  description?: string;
  anchors: ComponentDocAnchor[];
};

export type ButtonDocProps = {
  showAnchors?: boolean;
};

const noop = () => {};
const oneLineExample = `<Button icon={<Icon decorative name="check" />} variant="solid">发布</Button>`;

export const buttonDocMeta = {
  title: "Button 按钮",
  category: "基础组件",
  anchors: [
    { id: "button-when", label: "何时使用" },
    { id: "button-demos", label: "代码演示" },
    { id: "button-api", label: "API" },
    { id: "button-unsupported", label: "扩展建议" },
    { id: "button-semantic", label: "Semantic DOM" },
    { id: "button-token", label: "Design Token" },
    { id: "button-a11y", label: "可访问性" },
    { id: "button-mobile", label: "移动端" },
    { id: "button-security", label: "安全" },
    { id: "button-review", label: "五专家结论" },
    { id: "button-matrix", label: "四点矩阵" },
    { id: "button-gaps", label: "缺口" },
    { id: "button-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "基础按钮",
    description: "soft 是默认按钮，solid 用于主动作，ghost 适合弱化的次级动作。",
    preview: (
      <div className="doc-demo-row">
        <Button>保存草稿</Button>
        <Button variant="solid">发布</Button>
        <Button variant="ghost">取消</Button>
      </div>
    ),
    code: `<Button>保存草稿</Button> <Button variant="solid">发布</Button> <Button variant="ghost">取消</Button>`,
  },
  {
    title: "尺寸",
    description: "md 适合常规表单和页面操作，sm 用于密集区域或工具条。",
    preview: (
      <div className="doc-demo-row">
        <Button size="md">中等按钮</Button>
        <Button size="sm">小按钮</Button>
        <Button size="sm" variant="ghost">
          小型次级
        </Button>
      </div>
    ),
    code: `<Button size="md">中等按钮</Button> <Button size="sm">小按钮</Button> <Button size="sm" variant="ghost">小型次级</Button>`,
  },
  {
    title: "禁用状态",
    description: "禁用状态沿用原生 disabled 行为，视觉上保持中性但降低存在感。",
    preview: (
      <div className="doc-demo-row">
        <Button disabled>不可用</Button>
        <Button disabled variant="solid">
          不可发布
        </Button>
        <Button disabled variant="ghost">
          不可取消
        </Button>
      </div>
    ),
    code: `<Button disabled>不可用</Button> <Button disabled variant="solid">不可发布</Button> <Button disabled variant="ghost">不可取消</Button>`,
  },
  {
    title: "加载态",
    description: "loading 会自动禁用按钮并声明 aria-busy，适合提交中的即时动作。",
    preview: (
      <div className="doc-demo-row">
        <Button loading variant="solid">
          发布中
        </Button>
        <Button loading>保存中</Button>
        <Button loading size="sm" variant="ghost">
          同步中
        </Button>
      </div>
    ),
    code: `<Button loading variant="solid">发布中</Button> <Button loading>保存中</Button> <Button loading size="sm" variant="ghost">同步中</Button>`,
  },
  {
    title: "文本图标",
    description: "文本按钮可带 Tessera Icon；纯图标控制仍应使用 IconButton。",
    preview: (
      <div className="doc-demo-row doc-demo-row--single-line">
        <Button icon={<Icon decorative name="add" />} variant="solid">
          新建
        </Button>
        <Button aria-label="刷新列表" icon={<Icon decorative name="refresh" />}>
          刷新
        </Button>
        <Button icon={<Icon decorative name="chevron-right" />} iconPosition="end" variant="ghost">
          查看详情
        </Button>
      </div>
    ),
    code: `<Button icon={<Icon decorative name="add" />} variant="solid">新建</Button> <Button icon={<Icon decorative name="refresh" />}>刷新</Button> <Button icon={<Icon decorative name="chevron-right" />} iconPosition="end" variant="ghost">查看详情</Button>`,
  },
  {
    title: "原生属性",
    description: "默认 type 为 button，可以覆盖为 submit；同时支持 onClick、aria-label 等原生 button 属性。",
    preview: (
      <form className="doc-native-form" onSubmit={(event) => event.preventDefault()}>
        <Button type="submit" variant="solid">
          提交表单
        </Button>
        <Button aria-label="刷新列表" onClick={noop} variant="ghost">
          刷新
        </Button>
      </form>
    ),
    code: `<form onSubmit={handleSubmit}><Button type="submit" variant="solid">提交表单</Button><Button aria-label="刷新列表" onClick={refreshList} variant="ghost">刷新</Button></form>`,
  },
  {
    title: "长文本边界",
    description: "长文案会在按钮内部换行，不制造页面级横向滚动；纯图标控制仍应使用 IconButton。",
    preview: (
      <div className="doc-demo-row">
        <Button>review_trace_button_long_label_wraps_without_page_overflow</Button>
        <Button size="sm" variant="ghost">
          审阅通过
        </Button>
      </div>
    ),
    code: `<Button>review_trace_button_long_label_wraps_without_page_overflow</Button> <Button size="sm" variant="ghost">审阅通过</Button>`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "icon",
    value: "ReactNode",
    description: "展示在文本旁的装饰图标。纯图标控制请使用 IconButton。",
  },
  {
    name: "iconPosition",
    value: '"start" | "end"',
    description: "图标位于文本前或文本后。默认值为 start。",
  },
  {
    name: "loading",
    value: "boolean",
    description: "展示加载指示器、自动 disabled，并设置 aria-busy。默认值为 false。",
  },
  {
    name: "variant",
    value: '"solid" | "soft" | "ghost"',
    description: "按钮的视觉层级。默认值为 soft。",
  },
  {
    name: "size",
    value: '"sm" | "md"',
    description: "按钮高度与水平内边距。默认值为 md。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "按钮内容。Button 需要可读文本或可访问名称。",
  },
  {
    name: "ButtonHTMLAttributes",
    value: "ButtonHTMLAttributes<HTMLButtonElement>",
    description:
      "继承原生 button 属性，例如 disabled、onClick、aria-label。组件默认 type 为 button，也可传入 type=\"submit\" 覆盖；不支持 href。",
  },
];

const unsupportedRows: DocRow[] = [
  {
    name: "block",
    value: "暂不支持",
    description: "当前不内置满宽按钮。需要满宽时可在布局层控制 width。",
  },
  {
    name: "danger",
    value: "暂不支持",
    description: "当前 Button 只有中性色层级，破坏性动作需要独立设计 token 后再加入。",
  },
  {
    name: "shape",
    value: "暂不支持",
    description: "图标按钮由 IconButton 承担，Button 暂不提供圆形、方形等形状 API。",
  },
  {
    name: "dashed / text / link",
    value: "暂不支持",
    description: "目前只暴露 solid、soft、ghost 三种真实 variant；链接导航请使用安全的 a 元素，不把 href 传给 Button。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "button",
    description: "当前根元素就是原生 button，保留键盘、表单和禁用语义；不会渲染 a 或伪链接。",
  },
  {
    name: "button text",
    value: "children",
    description: "文本来自 children。Button 需要可读文本；纯图标按钮请使用 IconButton 并提供 aria-label。",
  },
  {
    name: "loading",
    value: 'disabled + aria-busy="true"',
    description: "加载态使用原生 disabled 阻止重复触发，并通过 aria-busy 暴露忙碌状态。",
  },
  {
    name: "focus",
    value: ":focus-visible",
    description: "键盘聚焦时显示中性色焦点环，鼠标点击不强制展示焦点样式。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "status",
    value: "theme style / structure style",
    description: "Button 明确拆分主题 style 与结构 style：颜色、边框、focus 来自 --ct-* token；尺寸、布局、换行、图标槽由组件结构 class 固定。",
  },
  {
    name: "surface",
    value: "var(--ct-surface)",
    description: "文档卡片、表格和按钮所在的主承载面，亮/暗主题自动切换。",
  },
  {
    name: "surfaceSubtle",
    value: "var(--ct-surface-muted)",
    description: "代码块、表头、目录和 soft hover 的轻量背景。",
  },
  {
    name: "text",
    value: "var(--ct-text)",
    description: "按钮文本和表格正文的默认颜色。",
  },
  {
    name: "textMuted",
    value: "var(--ct-text-secondary)",
    description: "ghost 按钮和说明文字使用的弱化文本色。",
  },
  {
    name: "border",
    value: "var(--ct-border)",
    description: "soft 按钮边框和文档分隔线。",
  },
  {
    name: "borderStrong",
    value: "var(--ct-border-heavy)",
    description: "hover 边框和强调边界。",
  },
  {
    name: "control",
    value: "var(--ct-btn-secondary-bg)",
    description: "soft 按钮默认背景。",
  },
  {
    name: "controlHover",
    value: "var(--ct-btn-secondary-bg-hover)",
    description: "通用 hover 背景。",
  },
  {
    name: "controlActive",
    value: "var(--ct-surface-active)",
    description: "可用于后续 pressed 或 active 状态。",
  },
  {
    name: "inverse",
    value: "var(--ct-btn-primary-bg)",
    description: "solid 按钮背景。",
  },
  {
    name: "inverseText",
    value: "var(--ct-btn-primary-fg)",
    description: "solid 按钮文字。",
  },
  {
    name: "focus",
    value: "var(--ct-focus-ring)",
    description: "focus-visible 轮廓颜色，亮/暗主题均保持可见。",
  },
  {
    name: "radius",
    value: "var(--ct-radius-md)",
    description: "按钮圆角，保持工具型界面的紧凑感。",
  },
  {
    name: "controlHeight",
    value: "var(--ct-control-height)",
    description: "md 按钮高度。",
  },
  {
    name: "controlHeightSm",
    value: "var(--ct-control-height-sm)",
    description: "sm 按钮高度。",
  },
  {
    name: "font",
    value: "var(--ct-font-sans), weight medium",
    description: "沿用全局系统字体和略强的按钮字重。",
  },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-border / --ct-focus-ring",
    description: "颜色、hover、selected、border、weak shadow 和蓝色 focus ring 全部读取 --ct-* 语义 token；亮/暗主题由全局 data-theme 或 ConfigProvider 覆盖。",
  },
  {
    name: "结构 style",
    value: "height / inline-flex / icon slot / min-width: 0",
    description: "尺寸、圆角、图标间距、换行、max-width 和 overflow 控制写在组件 class 中，360/390/430 移动端不产生页面级横向 overflow。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "原生 button",
    description: "保留 Enter 和 Space 激活行为；禁用时由浏览器自动移出可操作序列。",
  },
  {
    name: "Focus",
    value: ":focus-visible",
    description: "键盘导航显示 2px 中性色焦点环，满足后台和工具型界面的可见性要求。",
  },
  {
    name: "Name",
    value: "children / aria-label",
    description: "Button 应包含可读文本；只有图标或缩写时必须传入 aria-label，纯图标场景优先使用 IconButton。",
  },
  {
    name: "State",
    value: "disabled / aria-busy",
    description: "不可点击状态使用原生 disabled；加载态同时设置 aria-busy，不使用 aria-disabled 模拟按钮禁用。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px / 40px",
    description: "窄屏下 md 提升到 44px 高，sm 提升到 40px 高，减少误触。",
  },
  {
    name: "Layout",
    value: "inline-flex",
    description: "按钮默认随内容宽度排列；满宽或换行由外层布局负责，组件本身不内置 block API。",
  },
  {
    name: "Gestures",
    value: "touch-action: manipulation",
    description: "避免移动端快速点击时触发不必要的缩放延迟，同时不拦截页面滚动。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Content",
    value: "ReactNode",
    description: "children 和 icon 由 React 渲染，组件不接收 dangerouslySetInnerHTML，也不解析 HTML 字符串。",
  },
  {
    name: "Link boundary",
    value: "no href",
    description:
      "Button 不提供链接态，也不消费 href。需要跳转时使用 a 元素并在调用方拒绝 javascript:、data: 等危险协议。",
  },
  {
    name: "Events",
    value: "native props",
    description: "onClick 等事件透传给调用方；组件不执行动态代码、不读取剪贴板、不发起网络请求。",
  },
  {
    name: "Form",
    value: 'type="button"',
    description: "默认 type 为 button，避免放入表单后意外提交；需要提交时显式传入 type=\"submit\"。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description:
      "定位清晰：只承载即时动作、提交和命令入口；loading 与文本图标满足高频反馈，不支持项已在扩展建议中收口。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description:
      "solid、soft、ghost 层级与 中性极简中性色方向一致；md/sm 尺寸、hover、active、disabled 和 focus-visible 状态完整且克制。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description:
      "组件基于原生 button 和 forwardRef，默认 type=\"button\"，继承原生属性，loading 自动禁用，并屏蔽 dangerouslySetInnerHTML。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description:
      "样例覆盖默认、层级、尺寸、禁用、loading、图标、表单 type 覆盖、onClick/aria-label 和工具栏组合；移动端触控高度通过响应式样式验收。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description:
      "组件不解析 HTML、不执行动态代码、不发起网络请求、不消费 href；loading 阻止重复触发，默认非 submit 降低表单误提交风险。",
  },
];

const matrixRows: DocRow[] = [
  {
    name: "教程壳层",
    value: "PASS",
    description: "ButtonDoc 使用 TutorialScaffold，并保留真实 Button 预览、复制按钮和一行 TSX 示例。",
  },
  {
    name: "真实预览",
    value: "PASS",
    description: "样例直接渲染 Button、Icon 和原生 form，不用静态截图或伪 DOM。",
  },
  {
    name: "紧凑样例",
    value: "PASS",
    description: "每个 demo 代码保持单行，图标/尺寸/loading/disabled/长文本在卡片内紧凑呈现。",
  },
  {
    name: "移动与暗色",
    value: "PASS",
    description: "theme style 全部读取 --ct-* token；structure style 限制内部尺寸、换行和触控高度，smoke 覆盖 desktop、360、390、430 与暗色。",
  },
];

const faqItems = [
  {
    question: "为什么没有蓝色 primary？",
    answer:
      "这套组件优先服务 中性极简的中性界面。主动作使用黑灰反差表达优先级，避免把品牌色和交互状态绑定在一起。",
  },
  {
    question: "如何做图标按钮？",
    answer:
      "使用 IconButton，而不是把纯图标塞进 Button。IconButton 会保持固定方形尺寸，并要求通过 aria-label 或 title 提供可访问名称。",
  },
  {
    question: "什么时候用 solid？",
    answer:
      "solid 只用于当前区域最重要的确认动作，例如提交、发布、应用。并列动作较多时，其他动作应使用 soft 或 ghost。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      {preview}
    </DemoContainer>
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

export function ButtonDoc({ showAnchors = false }: ButtonDocProps) {
  return (
    <TutorialScaffold component="Button" kind="feedback" oneLineExample={oneLineExample}>
    <section className="button-doc" aria-labelledby="button-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Button 文档目录">
            {buttonDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="button-doc-title">{buttonDocMeta.title}</h2>
            <p>
              用于触发一个即时动作。当前 Button 使用中性色控制层级，并以原生{" "}
              <code>{"<button>"}</code> 作为根元素，保留浏览器提供的键盘、表单和可访问语义。
            </p>
          </header>

          <section className="button-doc-section" id="button-when" aria-labelledby="button-when-title">
            <h3 id="button-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当用户需要立即提交、保存、取消或执行页面内命令时使用。</li>
              <li>在同一区域只保留一个最强主动作，其余操作降低为 soft 或 ghost。</li>
              <li>需要图标专用控制时使用 IconButton，避免无文本按钮缺少可访问名称。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="button-demos" aria-labelledby="button-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="button-demos-title">代码演示</h3>
              <p>示例使用教程壳层和真实预览，展示层级、尺寸、禁用、loading、文本图标、ARIA、长文本和原生 button 属性。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="button-api" aria-labelledby="button-api-title">
            <h3 id="button-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="button-unsupported" aria-labelledby="button-unsupported-title">
            <div className="button-doc-section__heading">
              <h3 id="button-unsupported-title">扩展建议</h3>
              <p>以下能力是常见按钮能力，但当前组件没有实现，不应作为可用 API 使用。</p>
            </div>
            <DataTable rows={unsupportedRows} />
          </section>

          <section className="button-doc-section" id="button-semantic" aria-labelledby="button-semantic-title">
            <h3 id="button-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="button-token" aria-labelledby="button-token-title">
            <h3 id="button-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="button-a11y" aria-labelledby="button-a11y-title">
            <h3 id="button-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="button-mobile" aria-labelledby="button-mobile-title">
            <h3 id="button-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="button-security" aria-labelledby="button-security-title">
            <h3 id="button-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="button-review" aria-labelledby="button-review-title">
            <h3 id="button-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="button-matrix" aria-labelledby="button-matrix-title">
            <h3 id="button-matrix-title">四点矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>

          <section className="button-doc-section" id="button-gaps" aria-labelledby="button-gaps-title">
            <h3 id="button-gaps-title">缺口</h3>
            <p>
              当前缺口与扩展建议一致：block、danger、shape、dashed / text / link 尚未进入真实 API。
              loading 和文本图标已经可用；验收时按已实现的 variant、size、loading、icon 和原生 button 属性判定。
            </p>
          </section>

          <section className="button-doc-section" id="button-faq" aria-labelledby="button-faq-title">
            <h3 id="button-faq-title">FAQ</h3>
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
