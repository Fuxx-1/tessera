import type { ReactNode } from "react";
import { Skeleton } from "../components/base";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
};

export type SkeletonDocProps = {
  showAnchors?: boolean;
};

export const skeletonDocMeta = {
  title: "Skeleton 骨架屏",
  category: "反馈",
  anchors: [
    { id: "skeleton-when", label: "何时使用" },
    { id: "skeleton-demos", label: "代码演示" },
    { id: "skeleton-api", label: "API" },
    { id: "skeleton-semantic", label: "Semantic DOM" },
    { id: "skeleton-token", label: "Design Token" },
    { id: "skeleton-a11y", label: "可访问性" },
    { id: "skeleton-mobile", label: "移动端" },
    { id: "skeleton-security", label: "安全" },
    { id: "skeleton-review", label: "五专家结论" },
    { id: "skeleton-gaps", label: "缺口" },
    { id: "skeleton-faq", label: "FAQ" },
  ],
};

const demos: Demo[] = [
  {
    title: "一行验收矩阵",
    description: "单行样例覆盖 paragraph、avatar、image、button、table、card 与 shimmer，窄屏允许横向滚动但页面不溢出。",
    preview: (
      <div className="skeleton-doc-demo-shell" aria-label="Skeleton 一行验收预览">
        <Skeleton loadingLabel="Loading user card" avatar={{ size: "md" }} paragraph={{ rows: 3, widths: ["100%", "84%", "58%"] }} title={{ width: "46%" }} />
        <Skeleton image={{ aspectRatio: "4 / 3", width: 132 }} />
        <Skeleton button={{ width: 104 }} />
        <Skeleton table={{ rows: 3 }} />
        <Skeleton card={{ rows: 2 }} />
      </div>
    ),
    code: `<Skeleton loadingLabel="Loading user card" avatar paragraph={{ rows: 3 }} /><Skeleton image /><Skeleton button /><Skeleton table /><Skeleton card />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "loading",
    value: "boolean",
    description: "默认 true。为 false 时直接渲染 children，不输出骨架屏状态节点。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "真实内容。loading=false 时保持原样返回，便于宿主用同一个组件包裹异步内容。",
  },
  {
    name: "loadingLabel",
    value: "string",
    description: "读屏状态文本，默认 Loading content。传入 aria-label 时也会同步到隐藏状态文本，避免出现标签和状态文案不一致。",
  },
  {
    name: "active",
    value: "boolean",
    description: "默认 true。只控制 shimmer 动画；不会改变 loading=true 时的 aria-busy 语义。",
  },
  {
    name: "avatar",
    value: "boolean | { size?: 'sm' | 'md' | 'lg' }",
    description: "输出圆形头像占位。适合资料、评论、列表项等结构已知的加载状态。",
  },
  {
    name: "title",
    value: "boolean | { width?: string | number }",
    description: "输出标题占位，可用 width 控制标题宽度；false 可关闭标题。",
  },
  {
    name: "paragraph",
    value: "boolean | { rows?: number; widths?: Array<string | number> }",
    description: "输出段落行。rows 控制行数，widths 按行覆盖宽度；false 可关闭段落。",
  },
  {
    name: "image / button / table / card",
    value: "boolean | object",
    description: "输出图片、按钮、表格行、卡片媒体等结构占位。仅表达形态，不引入交互、排序或真实表格语义。",
  },
  {
    name: "preset",
    value: "'paragraph' | 'avatar' | 'image' | 'button' | 'table' | 'card'",
    description: "面向常用占位形态的快捷名称；复杂布局仍建议直接组合多个 Skeleton。",
  },
  {
    name: "lines",
    value: "number",
    description: "段落行数快捷参数，优先级高于 paragraph.rows。",
  },
  {
    name: "size / round / width",
    value: "'sm' | 'md' | 'lg'; boolean; string | number",
    description: "控制整体密度、条形圆角和容器宽度；宽度会被 CSS 限制在父容器内。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=status][aria-busy=true]",
    description: "loading=true 时根节点声明 polite 状态和忙碌语义，便于读屏感知局部区域正在加载。",
  },
  {
    name: "visual placeholders",
    value: "aria-hidden=true",
    description: "头像、标题、段落线、图片块、按钮块、表格行和卡片媒体都是装饰性占位，不暴露给辅助技术。",
  },
  {
    name: "status text",
    value: "sr-only loadingLabel",
    description: "视觉上隐藏但可读屏读取。业务可通过 loadingLabel 或 aria-label 本地化状态名称。",
  },
  {
    name: "motion",
    value: "active shimmer + reduced motion fallback",
    description: "active=true 启用轻量 shimmer；系统 prefers-reduced-motion 下 CSS 会停止动画。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "surface",
    value: "#e7e7e4 / #f4f4f2",
    description: "骨架底色和高光色保持中性灰阶，符合 neutral minimal 近白表面方向。",
  },
  {
    name: "avatarSize",
    value: "30px / 38px / 46px",
    description: "分别对应 sm、md、lg，与常见列表和详情密度匹配。",
  },
  {
    name: "buttonHeight",
    value: "30px / 36px / 42px",
    description: "按钮占位随 size 改变高度，保持与真实 Button 的密度接近，避免加载结束时跳动。",
  },
  {
    name: "tableGrid",
    value: "3 stable columns",
    description: "表格占位固定三列比例，列内线条用百分比收短，适配 360、390、430 宽度。",
  },
  {
    name: "cardMedia",
    value: "aspect-ratio: 16 / 7",
    description: "卡片媒体区域固定比例，保证封面或图表加载前后高度稳定。",
  },
  {
    name: "imageMedia",
    value: "aspect-ratio: 16 / 9",
    description: "独立图片占位可通过 image.width、image.height、image.aspectRatio 控制尺寸，默认不撑破父容器。",
  },
  {
    name: "lineHeight",
    value: "9px / 12px / 14px",
    description: "段落行高度随 size 缩放，避免小屏或紧凑区域显得笨重。",
  },
  {
    name: "titleHeight",
    value: "13px / 17px / 21px",
    description: "标题占位比正文段落更强，帮助用户预判内容层级。",
  },
  {
    name: "radius",
    value: "999px / 6px",
    description: "默认胶囊形；round=true 时标题和段落改为 6px 条块，头像仍保持圆形。",
  },
  {
    name: "motion",
    value: "1.4s ease-in-out",
    description: "动画节奏轻微，不作为唯一状态信号；低动效模式下完全停止。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Busy state",
    value: "loading=true => aria-busy=true",
    description: "加载语义不依赖 active，因此静态骨架屏同样能表达内容尚未准备好。",
  },
  {
    name: "Reduced motion",
    value: "@media (prefers-reduced-motion: reduce)",
    description: "用户偏好低动效时 shimmer 停止，页面仍保留结构占位和对比层次。",
  },
  {
    name: "Focus",
    value: "non-interactive",
    description: "Skeleton 不产生可聚焦控件，不接管键盘事件，不阻断页面焦点路径。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Min viewport",
    value: "320px+",
    description: "根节点和 body 使用 min-width: 0，段落行宽使用百分比时不会撑破窄屏。",
  },
  {
    name: "Width guard",
    value: "max-width: 100%",
    description: "即使传入固定 width，组件也被限制在父容器内，避免 360/390/430 宽度横向滚动。",
  },
  {
    name: "Layout",
    value: "grid",
    description: "头像、图片、表格和卡片占位都使用稳定尺寸或 grid；正文、单元格和媒体区域可随容器自然收缩。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Content",
    value: "ReactNode children",
    description: "组件不解析 HTML 字符串、不使用 dangerouslySetInnerHTML；真实内容由 React 正常渲染。",
  },
  {
    name: "Network",
    value: "none",
    description: "不发起请求、不读取本地存储、不访问剪贴板，只渲染占位 DOM。",
  },
  {
    name: "User input",
    value: "width values as CSS properties",
    description: "宽度只作为 React style 值写入，不生成 HTML；业务仍应避免把不可信字符串当作样式配置传入。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "定位限定为结构已知的内容加载占位；覆盖资料、图片、按钮、表格、卡片，不承载同步或长任务进度。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "paragraph/avatar/title/image/button/table/card 层级清楚，动效克制；中性灰阶、低阴影环境和暗色宿主中都保持可辨识结构。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "API 面小且稳定，loading/children、active、avatar/title/paragraph/size/round/width 均由真实源码支持。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "专项样例一行覆盖 paragraph、avatar、image、button、table、card、动画和响应式宽度；桌面、360、390、430 视口纳入验收。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "无外部 UI 库、无 HTML 注入、无网络副作用；装饰占位 aria-hidden，读屏只获得状态语义。",
  },
];

const gapRows: DocRow[] = [
  {
    name: "Open gap",
    value: "none",
    description: "本轮复核未遗留 Skeleton 生产验收缺口；后续只在真实业务暴露新加载形态时扩展 preset。",
  },
];

const faqItems = [
  {
    question: "active=false 是不是表示不加载？",
    answer: "不是。active=false 只停止 shimmer 动画；是否显示骨架屏由 loading 控制。",
  },
  {
    question: "什么时候不要用 Skeleton？",
    answer: "当结构未知、需要表达可量化进度、或用户必须读到具体状态文本时，应使用 Empty、Spin、Progress 或业务状态区。",
  },
  {
    question: "能放在很窄的移动卡片里吗？",
    answer: "可以。根节点和正文列都允许收缩，width 也被限制在父容器内，避免小屏横向溢出。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo skeleton-doc-demo">
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

export function SkeletonDoc({ showAnchors = false }: SkeletonDocProps) {
  return (
    <TutorialScaffold component="Skeleton" kind="feedback" oneLineExample={`<Skeleton lines={3} aria-label="Loading profile" />`}>
    <section className="button-doc skeleton-doc" aria-labelledby="skeleton-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Skeleton 文档目录">
            {skeletonDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="skeleton-doc-title">{skeletonDocMeta.title}</h2>
            <p>
              用于在内容结构已知、数据尚未返回时展示安全占位。当前 Skeleton 是自有基础组件，不依赖 antd、antd-mobile 或
              @ant-design/charts。
            </p>
          </header>

          <section className="button-doc-section" id="skeleton-when" aria-labelledby="skeleton-when-title">
            <h3 id="skeleton-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>内容结构可以预判，但真实标题、头像、段落或卡片数据仍在加载时使用。</li>
              <li>列表、资料卡、图片位、按钮位、表格区和详情页可通过 paragraph、avatar、image、button、table、card 保持布局稳定。</li>
              <li>需要持续状态文本、阻断操作或展示可量化进度时，不使用 Skeleton，也不把 Spin/Progress 文档合并进本页。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="skeleton-demos" aria-labelledby="skeleton-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="skeleton-demos-title">代码演示</h3>
              <p>文档只保留一个生产验收样例，确保所有可用形态都由真实 Skeleton API 支撑。</p>
            </div>
            <div className="button-doc-demo-grid skeleton-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="skeleton-api" aria-labelledby="skeleton-api-title">
            <h3 id="skeleton-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="skeleton-semantic" aria-labelledby="skeleton-semantic-title">
            <h3 id="skeleton-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="skeleton-token" aria-labelledby="skeleton-token-title">
            <h3 id="skeleton-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="skeleton-a11y" aria-labelledby="skeleton-a11y-title">
            <h3 id="skeleton-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="skeleton-mobile" aria-labelledby="skeleton-mobile-title">
            <h3 id="skeleton-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="skeleton-security" aria-labelledby="skeleton-security-title">
            <h3 id="skeleton-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="skeleton-review" aria-labelledby="skeleton-review-title">
            <h3 id="skeleton-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="skeleton-gaps" aria-labelledby="skeleton-gaps-title">
            <h3 id="skeleton-gaps-title">缺口</h3>
            <DataTable rows={gapRows} />
          </section>

          <section className="button-doc-section" id="skeleton-faq" aria-labelledby="skeleton-faq-title">
            <h3 id="skeleton-faq-title">FAQ</h3>
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
