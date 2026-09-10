import { useState, type ReactNode } from "react";
import { Button, Tag, Watermark } from "../components/base";
import type { ComponentDocAnchor, ComponentDocMeta } from "./ButtonDoc";
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

export type WatermarkDocProps = {
  showAnchors?: boolean;
};

export const watermarkDocMeta = {
  title: "Watermark 水印",
  category: "基础组件",
  anchors: [
    { id: "watermark-brief", label: "专家结论" },
    { id: "watermark-when", label: "何时使用" },
    { id: "watermark-demos", label: "代码演示" },
    { id: "watermark-api", label: "API" },
    { id: "watermark-semantic", label: "Semantic DOM" },
    { id: "watermark-token", label: "Design Token" },
    { id: "watermark-a11y", label: "可访问性" },
    { id: "watermark-mobile", label: "移动端性能" },
    { id: "watermark-security", label: "安全边界" },
    { id: "watermark-faq", label: "FAQ" },
  ] satisfies ComponentDocAnchor[],
} satisfies ComponentDocMeta;

const iconMark = "/image-demo-workspace.svg";

function ClickThroughDemo() {
  const [count, setCount] = useState(0);

  return (
    <Watermark content={["Pointer safe", "Layer only"]} gap={[92, 64]} opacity={0.16} rotate={-18}>
      <div className="watermark-doc-panel watermark-doc-panel--interactive">
        <span>Click-through check</span>
        <strong>{count}</strong>
        <Button size="sm" variant="solid" onClick={() => setCount((value) => value + 1)}>
          Increment
        </Button>
      </div>
    </Watermark>
  );
}

function SafetyUrlDemo() {
  return (
    <div className="watermark-doc-safety-stack">
      <Watermark image="javascript:alert(1)" text="Blocked image URL" gap={[96, 76]} opacity={0.18} rotate={-18}>
        <div className="watermark-doc-panel watermark-doc-panel--safe-url">
          <span>Unsafe image URL</span>
          <strong>javascript: is ignored</strong>
        </div>
      </Watermark>
      <Watermark
        content="One-line smoke: repeat rotate opacity pointer-events mobile safe"
        gap={[144, 86]}
        opacity={0.11}
        rotate={-14}
      >
        <div className="watermark-doc-panel watermark-doc-panel--single-line">
          <span>One-line sample</span>
          <strong>repeat / rotate / opacity / pointer-events</strong>
        </div>
      </Watermark>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础文字水印",
    description: "content 作为覆盖层重复渲染在 children 之上，默认不拦截鼠标和触摸事件。",
    preview: (
      <Watermark content="Tessera Internal">
        <div className="watermark-doc-panel">
          <Tag tone="strong">Draft</Tag>
          <h4>Quarterly component review</h4>
          <p>水印层覆盖内容区域，但真实内容仍保持正常阅读、选择和交互。</p>
        </div>
      </Watermark>
    ),
    code: `<Watermark content="Tessera Internal"><ReportPanel /></Watermark>`,
  },
  {
    title: "多行内容和样式",
    description: "content 数组会按行绘制；gap、rotate、opacity 和 font 用于控制密度、角度和可读性。",
    preview: (
      <Watermark
        content={["Owner: Component Team", "Review only"]}
        font={{ color: "#3f3f3c", fontSize: 13, fontWeight: 650 }}
        gap={[116, 76]}
        opacity={0.12}
        rotate={-28}
      >
        <div className="watermark-doc-panel watermark-doc-panel--split">
          <div>
            <span>Risk state</span>
            <strong>Needs owner review</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>2026-06-07</strong>
          </div>
        </div>
      </Watermark>
    ),
    code: `<Watermark content={["Owner: Component Team", "Review only"]} font={{ color: "#3f3f3c", fontSize: 13, fontWeight: 650 }} gap={[116, 76]} opacity={0.12} rotate={-28}><ReviewPanel /></Watermark>`,
  },
  {
    title: "text 别名和图形层",
    description: "text 是 content 的语义别名；image 可叠加在同一个 SVG tile 中，适合低频标识。",
    preview: (
      <Watermark image={iconMark} text="Verified" gap={[104, 88]} opacity={0.1} rotate={-16}>
        <div className="watermark-doc-panel">
          <h4>Signed package</h4>
          <p>图形和文字都由单个背景图重复绘制，不额外生成水印节点列表。</p>
        </div>
      </Watermark>
    ),
    code: `<Watermark image={iconMark} text="Verified" gap={[104, 88]} opacity={0.1}><SignedPackage /></Watermark>`,
  },
  {
    title: "暗色和偏移",
    description: "暗色内容区应降低透明度并使用浅色文字；offset 可把 tile 中心从主要操作区域错开。",
    preview: (
      <Watermark
        content="Dark mode review"
        font={{ color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: 640 }}
        gap={[124, 82]}
        offset={[-18, 12]}
        opacity={0.13}
        rotate={-20}
      >
        <div className="watermark-doc-panel watermark-doc-panel--dark">
          <span>Local dark surface</span>
          <h4>Approver queue</h4>
          <p>水印只覆盖这个局部面板，不扩展到页面或相邻演示区域。</p>
          <Button size="sm" variant="ghost">
            Review
          </Button>
        </div>
      </Watermark>
    ),
    code: `<Watermark content="Dark mode review" font={{ color: "rgba(255,255,255,0.92)", fontSize: 13 }} gap={[124, 82]} offset={[-18, 12]} opacity={0.13} rotate={-20}><ApproverQueue /></Watermark>`,
  },
  {
    title: "点击穿透",
    description: "水印层使用 pointer-events: none，按钮、输入和链接等子内容保持可操作。",
    preview: <ClickThroughDemo />,
    code: `<Watermark content={["Pointer safe", "Layer only"]}><Button onClick={increment}>Increment</Button></Watermark>`,
  },
  {
    title: "安全 URL 和一行验收",
    description: "image 只接受安全图片地址；危险协议会被忽略，文字水印仍按 repeat、rotate 和 opacity 规则渲染。",
    preview: <SafetyUrlDemo />,
    code: `<Watermark image="javascript:alert(1)" text="Blocked image URL"><AuditPanel /></Watermark>; <Watermark content="One-line smoke: repeat rotate opacity pointer-events mobile safe" />`,
  },
];

const expertRows: DocRow[] = [
  {
    name: "产品",
    value: "标识边界",
    description: "Watermark 用于表达所有权、状态或审阅范围；可覆盖局部容器或被外层全屏容器承载，不能把水印文案包装成防泄漏能力。",
  },
  {
    name: "UI",
    value: "低干扰覆盖",
    description: "默认低透明度、斜向重复和中性色，内容优先可读；暗色容器应使用低 opacity 和浅色 font.color。",
  },
  {
    name: "研发",
    value: "单层背景",
    description: "采用 repeat SVG background，不为每个水印 tile 创建 DOM，移动端滚动压力更小。",
  },
  {
    name: "测试",
    value: "可验收",
    description: "覆盖独立路由、点击穿透、移动端宽度、tile 尺寸、构建和禁用依赖扫描。",
  },
  {
    name: "白帽",
    value: "不误导",
    description: "组件不读取用户数据、不上报内容、不声明阻止截图、复制、录屏或外传。",
  },
];

const apiRows: DocRow[] = [
  {
    name: "children",
    value: "ReactNode",
    description: "被水印覆盖的内容区域。未传入 children 时仍可渲染一个空水印容器。",
  },
  {
    name: "content",
    value: "string | string[]",
    description: "水印文本。数组按多行绘制；空字符串会被忽略。",
  },
  {
    name: "text",
    value: "string | string[]",
    description: "content 的语义别名；当 content 存在时优先使用 content。",
  },
  {
    name: "image",
    value: "string",
    description: "可选图片地址，会过滤为相对路径、http(s) 或 blob URL；拒绝 javascript、data、file 等危险协议。",
  },
  {
    name: "gap",
    value: "number | [number, number]",
    description: "水印 tile 之间的水平和垂直间距。默认 [96, 72]。",
  },
  {
    name: "offset",
    value: "number | [number, number]",
    description: "单个 tile 内的水印中心偏移，支持正负值，用于和内容布局错开。默认 [0, 0]。",
  },
  {
    name: "rotate",
    value: "number",
    description: "水印旋转角度，单位为 degree。默认 -22。",
  },
  {
    name: "opacity",
    value: "number",
    description: "水印透明度，取值会被限制在 0 到 1。默认 0.14。",
  },
  {
    name: "font",
    value: "WatermarkFont",
    description: "支持 color、fontFamily、fontSize、fontStyle、fontWeight、lineHeight。",
  },
  {
    name: "zIndex",
    value: "number",
    description: "水印层相对内容的堆叠层级。默认 1。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLDivElement>",
    description: "根节点透传 div 属性，包括 className、style、data-*、aria-label 等。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-watermark",
    description: "创建相对定位容器，承载内容层和水印层。",
  },
  {
    name: "content",
    value: "div.c-watermark__content",
    description: "真实 children 内容层，保持正常 DOM 顺序和交互。",
  },
  {
    name: "layer",
    value: "div.c-watermark__layer",
    description: "纯视觉层，设置 aria-hidden=\"true\" 和 pointer-events: none。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "--c-watermark-image",
    value: "generated SVG",
    description: "组件根据 content、image、font 和 rotate 生成的 SVG background。",
  },
  {
    name: "--c-watermark-tile-width",
    value: "computed px",
    description: "由内容宽度和 gap[0] 推导，可用于验收 tile 密度。",
  },
  {
    name: "--c-watermark-tile-height",
    value: "computed px",
    description: "由内容高度和 gap[1] 推导，移动端避免使用过小 tile。",
  },
  {
    name: "--c-watermark-z-index",
    value: "1",
    description: "水印层 z-index，内容层位于默认堆叠上下文内。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Screen reader",
    value: "aria-hidden layer",
    description: "重复水印不会被读屏重复播报，真实内容仍由 children 提供。",
  },
  {
    name: "Keyboard",
    value: "no focus target",
    description: "水印层不参与 tab 顺序，键盘焦点落在内部可交互元素上。",
  },
  {
    name: "Contrast",
    value: "low opacity",
    description: "默认低透明度减少遮挡；调用方应避免把 opacity 提高到影响正文识别。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "DOM cost",
    value: "one layer",
    description: "无论视口大小都只增加一个视觉层，不按 tile 数量增加节点。",
  },
  {
    name: "Paint",
    value: "repeat background",
    description: "默认 tile 保持适中尺寸，移动端不建议把 gap 调到 24px 以下。",
  },
  {
    name: "Touch",
    value: "pointer-events: none",
    description: "触摸、滚动和点击由真实内容接收，水印不拦截事件。",
  },
  {
    name: "Actions",
    value: "local bounds",
    description: "移动端建议包裹内容面板而不是整页按钮区，避免水印压在主要操作文字上。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Claims",
    value: "visual marker",
    description: "Watermark 只是视觉标识层，不承诺阻止截图、复制、录屏、打印或二次传播。",
  },
  {
    name: "Data",
    value: "no collection",
    description: "组件不读取 children 文本、不扫描页面数据、不发起网络请求。",
  },
  {
    name: "Image",
    value: "safe URL only",
    description: "image 若使用远程 URL，网络请求由浏览器加载该资源产生；敏感场景应使用可信同源资源，组件拒绝 data/javascript/file 协议。",
  },
  {
    name: "Input bounds",
    value: "clamped",
    description: "content 行数、单行长度、fontSize、opacity、zIndex 和 tile 尺寸都有边界，避免异常输入造成遮挡或重绘压力。",
  },
];

const faqItems = [
  {
    question: "Watermark 能防止资料泄露吗？",
    answer: "不能。它只能作为提醒和追溯语境的视觉标识，真正的数据保护需要权限、审计、导出控制等系统能力。",
  },
  {
    question: "为什么不用多个绝对定位文本节点？",
    answer: "重复 DOM 会增加移动端布局和滚动成本。当前实现把水印合成为背景图，只保留一个不可交互视觉层。",
  },
  {
    question: "应该和 Card 或 Layout 文档合并吗？",
    answer: "不合并。Watermark 是覆盖层能力，可以包裹任意局部内容，因此保持独立文档和独立路由。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo watermark-doc-demo">
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

export function WatermarkDoc({ showAnchors = false }: WatermarkDocProps) {
  return (
    <TutorialScaffold component="Watermark" kind="feedback" oneLineExample={`<Watermark content="Internal"><Card>Report</Card></Watermark>`}>
    <section className="button-doc watermark-doc" aria-labelledby="watermark-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Watermark 文档目录">
            {watermarkDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="watermark-doc-title">{watermarkDocMeta.title}</h2>
            <p>
              用于在局部内容上添加重复水印标识。当前 Watermark 是自有 React 实现，使用单个不可交互视觉层叠加在{" "}
              <code>children</code> 之上，支持文字、图形、间距、偏移、旋转、透明度和字体配置。
            </p>
          </header>

          <section className="button-doc-section" id="watermark-brief" aria-labelledby="watermark-brief-title">
            <div className="button-doc-section__heading">
              <h3 id="watermark-brief-title">五专家小组结论</h3>
              <p>本轮按产品、UI、研发、测试、白帽五个视角收敛 Watermark 的能力边界。</p>
            </div>
            <DataTable rows={expertRows} />
          </section>

          <section className="button-doc-section" id="watermark-when" aria-labelledby="watermark-when-title">
            <h3 id="watermark-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当局部内容需要显示审阅范围、所有权、内部状态或环境标识时使用。</li>
              <li>当水印需要覆盖表格、预览、报告、详情区域等任意内容时，直接包裹对应区域。</li>
              <li>全屏水印由业务侧提供全屏容器承载；组件本身不创建 portal，也不突破父容器边界。</li>
              <li>不要把 Watermark 当成安全控制组件；权限、审计、导出和复制控制应由系统能力承担。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="watermark-demos" aria-labelledby="watermark-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="watermark-demos-title">代码演示</h3>
              <p>示例覆盖 text/content 层叠、多行水印、图形水印、gap/offset/rotate、点击穿透和移动端友好的重复背景。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="watermark-api" aria-labelledby="watermark-api-title">
            <h3 id="watermark-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="watermark-semantic" aria-labelledby="watermark-semantic-title">
            <h3 id="watermark-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="watermark-token" aria-labelledby="watermark-token-title">
            <h3 id="watermark-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="watermark-a11y" aria-labelledby="watermark-a11y-title">
            <h3 id="watermark-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="watermark-mobile" aria-labelledby="watermark-mobile-title">
            <h3 id="watermark-mobile-title">移动端性能</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="watermark-security" aria-labelledby="watermark-security-title">
            <h3 id="watermark-security-title">安全边界</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="watermark-faq" aria-labelledby="watermark-faq-title">
            <h3 id="watermark-faq-title">FAQ</h3>
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
