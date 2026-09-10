import type { ReactNode } from "react";
import { MobilePreviewFrame } from "../components/business";
import { Button, Segmented, Tag } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { DemoContainer } from "./DemoContainer";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

type ExpertConclusion = {
  role: string;
  conclusion: string;
};

type Demo = {
  title: string;
  description: string;
  preview: ReactNode;
  code: string;
};

export type MobilePreviewFrameDocProps = {
  showAnchors?: boolean;
};

export const mobilePreviewFrameDocMeta = {
  title: "MobilePreviewFrame 移动预览框",
  category: "业务组件",
  anchors: [
    { id: "mobile-preview-frame-when", label: "何时使用" },
    { id: "mobile-preview-frame-demos", label: "代码演示" },
    { id: "mobile-preview-frame-api", label: "API" },
    { id: "mobile-preview-frame-semantic", label: "Semantic DOM" },
    { id: "mobile-preview-frame-a11y", label: "a11y / mobile" },
    { id: "mobile-preview-frame-security", label: "安全边界" },
    { id: "mobile-preview-frame-experts", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<MobilePreviewFrame chrome="ios" title="iPhone 14"><MobileScreenSpecimen /></MobilePreviewFrame>`;

const apiRows: DocRow[] = [
  {
    name: "size",
    value: "iphone-se | iphone-14 | pixel-7 | fold | tablet | { width, height, label }",
    description: "内置常见 viewport，也支持业务传入自定义尺寸；运行期会夹紧异常宽高，容器使用 CSS 变量模拟画布，不创建 iframe。",
  },
  {
    name: "chrome",
    value: "ios | android | none",
    description: "控制设备状态栏、扬声器、底部 home indicator 或 Android 导航提示。",
  },
  {
    name: "orientation",
    value: "portrait | landscape",
    description: "按尺寸自动交换宽高，便于验收横屏/竖屏布局。",
  },
  {
    name: "scrollable",
    value: "boolean",
    description: "默认 true，屏幕区可滚动并可聚焦；false 时可用于短内容快照。",
  },
  {
    name: "screenLabel / safeAreaLabel / statusBarLabel",
    value: "string",
    description: "为外层预览、可滚动屏幕区和 device chrome 提供明确可访问名称。",
  },
  {
    name: "toolbar / footer / children",
    value: "ReactNode",
    description: "toolbar 承载尺寸切换等控制；children 是真实 React 预览内容，footer 展示补充元信息。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "section",
    description: "组件作为业务文档或设计稿预览区块出现，可通过 aria-label/aria-labelledby 命名。",
  },
  {
    name: "device",
    value: "div[aria-label]",
    description: "设备外壳只表达预览语义，不伪装真实浏览上下文。",
  },
  {
    name: "screen",
    value: "div[role=region][tabIndex]",
    description: "可滚动屏幕区有明确名称，键盘用户可聚焦并滚动内容。",
  },
  {
    name: "chrome",
    value: "status/header decoration",
    description: "状态栏和装饰点不参与业务内容阅读，非必要图形使用 aria-hidden。",
  },
];

const expertConclusions: ExpertConclusion[] = [
  {
    role: "产品专家",
    conclusion: "定位为移动端体验预览容器，解决业务组件在不同手机 viewport 下的走查，不承诺 iframe 级隔离或跨域页面嵌入。",
  },
  {
    role: "UI 专家",
    conclusion: "保留 iOS、Android 和无 chrome 三种外观，尺寸信息可见，屏幕圆角、安全区和缩放边界足以支持设计验收。",
  },
  {
    role: "研发专家",
    conclusion: "采用 ReactNode + CSS 变量模拟 viewport，避免 iframe 带来的 CSP、postMessage、焦点穿透和沙箱策略复杂度。",
  },
  {
    role: "测试专家",
    conclusion: "验收覆盖 desktop、360px、390px、430px，包含预设尺寸、自定义尺寸、横竖屏、scrollable true/false、键盘聚焦滚动和无横向 overflow。",
  },
  {
    role: "白帽专家",
    conclusion: "组件不解析 HTML、不执行字符串、不加载远端页面；风险转移到宿主传入的 React children，应按宿主组件自身安全契约审查。",
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

function MobileScreenSpecimen() {
  return (
    <div className="mobile-preview-doc-app">
      <header>
        <span>Release mobile</span>
        <strong>Deployment review</strong>
      </header>
      <div className="mobile-preview-doc-summary">
        <span>Health</span>
        <b>98.4%</b>
      </div>
      {[
        "Build queued",
        "Bundle uploaded",
        "Smoke running",
        "Security review",
        "Canary rollout",
        "Store assets checked",
        "Ready to publish",
      ].map((item, index) => (
        <div className="mobile-preview-doc-step" key={item}>
          <span>{index + 1}</span>
          <p>{item}</p>
          <Tag tone={index < 3 ? "strong" : "subtle"}>{index < 3 ? "done" : "pending"}</Tag>
        </div>
      ))}
      <Button>Open report</Button>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "iOS 可滚动预览",
    description: "屏幕区可聚焦滚动，children 使用业务 React 内容。",
    preview: (
      <MobilePreviewFrame
        chrome="ios"
        description="Scrollable safe-area screen"
        eyebrow="mobile"
        footer="ReactNode content"
        screenLabel="iPhone 14 release review preview"
        title="iPhone 14"
      >
        <MobileScreenSpecimen />
      </MobilePreviewFrame>
    ),
    code: `<MobilePreviewFrame chrome="ios" description="Scrollable safe-area screen" screenLabel="iPhone 14 release review preview" title="iPhone 14"><MobileScreenSpecimen /></MobilePreviewFrame>`,
  },
  {
    title: "Android 横屏",
    description: "同一内容可用 orientation 切换横屏，toolbar 可承载宿主控制。",
    preview: (
      <MobilePreviewFrame
        chrome="android"
        orientation="landscape"
        size="pixel-7"
        title="Pixel 7 landscape"
        toolbar={
          <Segmented
            label="Viewport mode"
            options={[
              { label: "390", value: "390" },
              { label: "412", value: "412" },
            ]}
            size="sm"
            value="412"
          />
        }
      >
        <MobileScreenSpecimen />
      </MobilePreviewFrame>
    ),
    code: `<MobilePreviewFrame chrome="android" orientation="landscape" size="pixel-7" title="Pixel 7 landscape" toolbar={<Segmented label="Viewport mode" options={viewportOptions} value="412" />}><MobileScreenSpecimen /></MobilePreviewFrame>`,
  },
  {
    title: "无 chrome 容器",
    description: "用于嵌在业务面板里的移动画布，不显示设备状态栏。",
    preview: (
      <MobilePreviewFrame
        chrome="none"
        scrollable={false}
        size={{ id: "custom", label: "Custom 360", width: 360, height: 640 }}
        title="Custom 360"
      />
    ),
    code: `<MobilePreviewFrame chrome="none" scrollable={false} size={{ id: "custom", label: "Custom 360", width: 360, height: 640 }} title="Custom 360" />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer title={title} description={description} code={code}>
      <div className="button-doc-demo__preview mobile-preview-frame-doc__preview">{preview}</div>
    </DemoContainer>
  );
}

export function MobilePreviewFrameDoc({ showAnchors = false }: MobilePreviewFrameDocProps) {
  return (
    <TutorialScaffold component="MobilePreviewFrame" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc mobile-preview-frame-doc" aria-labelledby="mobile-preview-frame-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="MobilePreviewFrame 文档目录">
            {mobilePreviewFrameDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="mobile-preview-frame-doc-title">{mobilePreviewFrameDocMeta.title}</h2>
            <p>
              业务层移动预览容器，用 React 子树模拟 iframe-like viewport，覆盖设备尺寸、chrome、安全区、可滚动屏幕和移动端验收。
            </p>
          </header>

          <section className="button-doc-section" id="mobile-preview-frame-when" aria-labelledby="mobile-preview-frame-when-title">
            <h3 id="mobile-preview-frame-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要在文档站、设计验收或后台配置页中预览移动端组件状态。</li>
              <li>需要 iframe-like 的固定 viewport，但内容来自当前 React 应用上下文。</li>
              <li>不适用于嵌入第三方网页、跨域页面或需要浏览器沙箱隔离的场景。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-demos" aria-labelledby="mobile-preview-frame-demos-title">
            <div className="button-doc-section__heading">
              <div>
                <h3 id="mobile-preview-frame-demos-title">代码演示</h3>
                <p>尺寸控制、device chrome、scrollable preview 和无 iframe 的响应式容器。</p>
              </div>
            </div>

            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-api" aria-labelledby="mobile-preview-frame-api-title">
            <h3 id="mobile-preview-frame-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-semantic" aria-labelledby="mobile-preview-frame-semantic-title">
            <h3 id="mobile-preview-frame-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-a11y" aria-labelledby="mobile-preview-frame-a11y-title">
            <h3 id="mobile-preview-frame-a11y-title">a11y / mobile</h3>
            <ul className="button-doc-list">
              <li>滚动屏幕区使用 role=region 和 tabIndex，键盘用户可以进入固定 viewport 并滚动。</li>
              <li>状态栏、home indicator 和装饰信号默认不参与业务阅读顺序。</li>
              <li>外层 scale box 使用 scale 变量、max-width 和 overflow:hidden 约束，desktop、360px、390px、430px 下 no overflow。</li>
              <li>内容区域保留宿主 React 子树语义，不强行重写表单、列表、标题层级。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-security" aria-labelledby="mobile-preview-frame-security-title">
            <h3 id="mobile-preview-frame-security-title">安全边界</h3>
            <ul className="button-doc-list">
              <li>没有 iframe，也不加载 URL，因此不存在 iframe sandbox、allow、postMessage 或跨域焦点代理面。</li>
              <li>组件只渲染 ReactNode，不使用 innerHTML，不执行字符串命令，不解释外部页面协议。</li>
              <li>宿主如果传入富文本、SVG、Markdown 或远程资源，仍需由对应宿主组件承担清洗和权限校验。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mobile-preview-frame-experts" aria-labelledby="mobile-preview-frame-experts-title">
            <div className="button-doc-section__heading">
              <div>
                <h3 id="mobile-preview-frame-experts-title">五专家小组结论</h3>
                <p>产品、UI、研发、测试、白帽共同确认本组件进入业务组件 registry。</p>
              </div>
            </div>
            <div className="mobile-preview-frame-doc__expert-grid">
              {expertConclusions.map((item) => (
                <article key={item.role}>
                  <h4>{item.role}</h4>
                  <p>{item.conclusion}</p>
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
