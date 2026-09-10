import type { ReactNode } from "react";
import { Button, Image } from "../components/base";
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

type ExpertReview = {
  role: string;
  conclusion: string;
};

export type ImageDocProps = {
  showAnchors?: boolean;
};

export const imageDocMeta = {
  title: "Image 图片",
  category: "数据展示",
  anchors: [
    { id: "image-when", label: "何时使用" },
    { id: "image-demos", label: "代码演示" },
    { id: "image-api", label: "API" },
    { id: "image-semantic", label: "Semantic DOM" },
    { id: "image-token", label: "Design Token" },
    { id: "image-a11y", label: "可访问性" },
    { id: "image-mobile", label: "移动端" },
    { id: "image-security", label: "安全" },
    { id: "image-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const demoImage = "/image-demo-architecture.svg";
const fallbackImage = "/image-demo-landscape.svg";
const avatarLikeImage = "/image-demo-workspace.svg";
const invalidImagePayload = "/image-demo-missing.png";

const demos: Demo[] = [
  {
    title: "基础图片",
    description: "src 与 alt 是核心输入；图片默认 lazy 加载，并用 object-fit 控制裁切，caption 可承载长说明。",
    preview: (
      <Image
        alt="Angular concrete building facade"
        aspectRatio="4 / 3"
        caption="Archive caption: architecture-reference-image-with-a-very-long-unbroken-token-for-mobile-wrapping-verification"
        src={demoImage}
        width="100%"
      />
    ),
    code: `<Image alt="Angular concrete building facade" aspectRatio="4 / 3" caption="Archive caption" src="/image-demo-architecture.svg" width="100%" />`,
  },
  {
    title: "fallback 与错误态",
    description: "主图失败后自动尝试 fallback；都不可用时显示文本状态或自定义 fallback 节点。",
    preview: (
      <div className="image-doc-pair">
        <Image alt="Primary failed, fallback landscape" aspectRatio="16 / 10" fallback={fallbackImage} src={invalidImagePayload} />
        <Image
          alt="Broken source"
          aspectRatio="16 / 10"
          fallback={<span className="image-doc-fallback">Image unavailable</span>}
          src={invalidImagePayload}
        />
      </div>
    ),
    code: `<Image alt="Primary failed, fallback landscape" fallback="/image-demo-landscape.svg" src="/index.html" />`,
  },
  {
    title: "预览弹层与安全缩放",
    description: "preview 独立开启，弹层使用安全 zoom 范围、Escape/关闭按钮和焦点管理。",
    preview: (
      <Image
        alt="Workspace with long table and daylight"
        aspectRatio="3 / 2"
        preview={{ initialZoom: 1, maxZoom: 2.5, minZoom: 0.5, title: "Workspace preview" }}
        src={avatarLikeImage}
        width="100%"
      />
    ),
    code: `<Image alt="Workspace with long table and daylight" aspectRatio="3 / 2" preview={{ initialZoom: 1, maxZoom: 2.5, minZoom: 0.5 }} src="/image-demo-workspace.svg" />`,
  },
  {
    title: "fit 与比例",
    description: "contain、cover、scale-down 等 fit 不改变布局尺寸；aspectRatio 保证加载前后稳定。",
    preview: (
      <div className="image-doc-fit-grid">
        <Image alt="Contain sample" aspectRatio="1 / 1" fit="contain" src={demoImage} />
        <Image alt="Cover sample" aspectRatio="1 / 1" fit="cover" src={demoImage} />
        <Image alt="Scale down sample" aspectRatio="1 / 1" fit="scale-down" src={demoImage} />
      </div>
    ),
    code: `<Image alt="Contain sample" aspectRatio="1 / 1" fit="contain" src="/image-demo-architecture.svg" />`,
  },
  {
    title: "加载态",
    description: "loading 可由业务强制展示；原生 img loading 通过 nativeLoading 控制。",
    preview: <Image alt="Loading specimen" aspectRatio="5 / 3" loading loadingLabel="Loading preview" src={demoImage} width="100%" />,
    code: `<Image alt="Loading specimen" aspectRatio="5 / 3" loading loadingLabel="Loading preview" src="/image-demo-architecture.svg" />`,
  },
];

const apiRows: DocRow[] = [
  { name: "src", value: "string", description: "图片地址；允许相对路径、http(s)、blob，拒绝 javascript/vbscript/data 协议。" },
  { name: "alt", value: "string", description: "必填可访问文本；装饰图仍由调用方传空字符串来表达。" },
  { name: "fallback", value: "string | ReactNode", description: "主图加载失败后的备用地址或安全 React 节点；字符串同样经过图片地址过滤。" },
  { name: "caption", value: "ReactNode", description: "同一 figure 下的 figcaption，支持长说明换行，不参与预览标题推导。" },
  { name: "preview", value: "boolean | ImagePreviewConfig", description: "开启独立预览弹层，可配置 title、fit、minZoom、maxZoom、initialZoom、zoom。" },
  { name: "fit", value: '"contain" | "cover" | "fill" | "none" | "scale-down"', description: "映射到 object-fit，默认 cover。" },
  { name: "aspectRatio", value: "number | string", description: "写入 CSS aspect-ratio，避免图片加载前后布局跳动。" },
  { name: "loading", value: "boolean", description: "业务强制加载态；nativeLoading 控制原生 img 的 lazy/eager 行为。" },
  { name: "onLoad / onError", value: "(event, { src }) => void", description: "回调带当前实际地址，fallback 失败时才触发 error。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "figure", description: "组件以 figure 包裹图片和状态层，但不强制 figcaption。" },
  { name: "caption", value: "figcaption", description: "传入 caption 时输出原生 figcaption，并允许长文本在窄屏断行。" },
  { name: "image", value: "img[alt]", description: "真实图片始终是原生 img，不用背景图替代内容图片。" },
  { name: "preview trigger", value: "button[aria-label]", description: "开启 preview 后图片外层成为按钮，键盘和读屏可明确触发预览。" },
  { name: "preview modal", value: "role=dialog", description: "复用 Modal 的 aria-modal、标题绑定、焦点环绕、Escape 和关闭按钮。" },
  { name: "state", value: "role=status", description: "加载、错误和无源状态均使用非打断式状态语义。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#fbfbfa / #ffffff", description: "图片容器和状态层使用中性表面，不制造额外装饰主题。" },
  { name: "border", value: "#dededb", description: "默认一像素边框帮助浅色图片在页面中可见。" },
  { name: "radius", value: "8px", description: "与基础组件半径保持一致。" },
  { name: "overlay", value: "rgba(17, 17, 16, 0.62)", description: "加载和错误状态覆盖层保证文字可读。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Alt", value: "required", description: "业务必须描述图片信息；纯装饰图使用 alt=\"\"，不要省略属性。" },
  { name: "Keyboard", value: "button preview", description: "预览触发器是原生 button，支持 Enter/Space；弹层可 Escape 关闭。" },
  { name: "Zoom", value: "0.25x - 4x clamp", description: "缩放配置会被 clamp，避免不可操作的极端比例。" },
  { name: "Loading", value: "status text", description: "加载态有可读 loadingLabel，不只依赖旋转动画。" },
];

const mobileRows: DocRow[] = [
  { name: "Sizing", value: "max-width: 100%", description: "组件宽度和预览图片都受容器约束，窄屏不横向溢出。" },
  { name: "Aspect", value: "aspect-ratio", description: "卡片、网格和弹层内图片加载前后保持稳定比例。" },
  { name: "Controls", value: "wrap", description: "预览缩放按钮允许换行，360px 宽度下仍保持可点按。" },
  { name: "Caption", value: "overflow-wrap:anywhere", description: "长说明、文件名和连续 token 在 360px 宽度下不制造页面级横向滚动。" },
];

const securityRows: DocRow[] = [
  { name: "Unsafe HTML", value: "never", description: "ImageProps 禁止 dangerouslySetInnerHTML；错误文案和 fallback 节点走 React 渲染。" },
  { name: "URL scheme", value: "filtered", description: "src/fallback 字符串拒绝 javascript、vbscript、data 和未知显式协议。" },
  { name: "Dependencies", value: "self-owned", description: "只复用本仓库 Button/Modal，不引入 antd、antd-mobile 或外部 UI 组件。" },
  { name: "Preview", value: "bounded", description: "zoom、fit、关闭策略都在组件内收束，避免失控缩放和背景误操作。" },
];

const expertReviews: ExpertReview[] = [
  { role: "产品", conclusion: "Image 作为独立数据展示组件交付，覆盖基础展示、失败恢复、预览查看和加载反馈，不与 Avatar 或 Carousel 合并叙事。" },
  { role: "UI", conclusion: "比例、fit、边框、状态层和预览弹层沿用现有中性基础风格，移动端以稳定比例和换行控制优先。" },
  { role: "研发", conclusion: "实现仅依赖 React 与本仓库基础组件；src/fallback 字符串统一过滤，事件回调暴露实际加载地址。" },
  { role: "测试", conclusion: "验收覆盖路由、registry、移动端溢出、加载态、错误态、fallback、preview modal 与 zoom 控件。" },
  { role: "白帽", conclusion: "禁止 unsafe HTML，拒绝危险 URL scheme，预览弹层复用既有焦点管理与关闭策略，风险边界清晰。" },
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

export function ImageDoc({ showAnchors = false }: ImageDocProps) {
  return (
    <TutorialScaffold component="Image" kind="display" oneLineExample={`<Image src={src} alt="Receipt preview" width={160} />`}>
    <section className="button-doc image-doc" aria-labelledby="image-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Image 文档目录">
            {imageDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="image-doc-title">{imageDocMeta.title}</h2>
            <p>
              用于展示内容图片、失败恢复和查看大图。Image 是独立基础组件，不复用 Avatar 或 Carousel 文档边界，也不接收不安全 HTML。
            </p>
          </header>

          <section className="button-doc-section" id="image-when" aria-labelledby="image-when-title">
            <h3 id="image-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>展示产品图、证据截图、封面、空间照片等内容图片时使用。</li>
              <li>需要失败 fallback、加载中、预览弹层或受控比例时使用 Image。</li>
              <li>头像使用 Avatar，轮播使用 Carousel；不要把多图浏览和身份图标语义塞进 Image。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="image-demos" aria-labelledby="image-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="image-demos-title">代码演示</h3>
              <p>示例覆盖 src/alt、fallback、preview modal、zoom、fit、aspect ratio、loading 和 error。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="image-api" aria-labelledby="image-api-title">
            <h3 id="image-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="image-semantic" aria-labelledby="image-semantic-title">
            <h3 id="image-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="image-token" aria-labelledby="image-token-title">
            <h3 id="image-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="image-a11y" aria-labelledby="image-a11y-title">
            <h3 id="image-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="image-mobile" aria-labelledby="image-mobile-title">
            <h3 id="image-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="image-security" aria-labelledby="image-security-title">
            <h3 id="image-security-title">安全</h3>
            <DataTable rows={securityRows} />
            <div className="image-doc-security-proof" aria-label="Unsafe URL filtering proof">
              <Image
                alt="Unsafe URL proof"
                aspectRatio="16 / 9"
                fallback="data:image/svg+xml,%3Csvg%3E%3C/svg%3E"
                src="javascript:alert(1)"
                srcSet="vbscript:alert(2) 1x"
                width="100%"
              />
            </div>
          </section>

          <section className="button-doc-section" id="image-review" aria-labelledby="image-review-title">
            <div className="button-doc-section__heading">
              <h3 id="image-review-title">五专家结论</h3>
              <Button size="sm" variant="ghost">Review recorded</Button>
            </div>
            <div className="image-doc-review-grid">
              {expertReviews.map((review) => (
                <article key={review.role}>
                  <h4>{review.role}</h4>
                  <p>{review.conclusion}</p>
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
