import { useState, type ReactNode } from "react";
import { Button, Carousel, Tag } from "../components/base";
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

export type CarouselDocProps = {
  showAnchors?: boolean;
};

export const carouselDocMeta = {
  title: "Carousel 走马灯",
  category: "基础组件",
  anchors: [
    { id: "carousel-when", label: "何时使用" },
    { id: "carousel-demos", label: "代码演示" },
    { id: "carousel-api", label: "API" },
    { id: "carousel-semantic", label: "Semantic DOM" },
    { id: "carousel-token", label: "Design Token" },
    { id: "carousel-a11y", label: "Accessibility" },
    { id: "carousel-review", label: "专家结论" },
    { id: "carousel-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const scenicSlides = [
  {
    id: "garden",
    label: "Calm garden dashboard",
    content: (
      <div className="carousel-doc-slide carousel-doc-slide--garden">
        <span>Workspace</span>
        <strong>Calm garden dashboard</strong>
        <p>Image-safe content keeps focal text inside the slide instead of relying on cropped assets.</p>
      </div>
    ),
  },
  {
    id: "studio",
    label: "Studio operations board",
    content: (
      <div className="carousel-doc-slide carousel-doc-slide--studio">
        <span>Operations</span>
        <strong>Studio release board</strong>
        <p>Cards, screenshots, and media can share one fixed-ratio viewport without page overflow.</p>
      </div>
    ),
  },
  {
    id: "report",
    label: "Weekly report panel",
    content: (
      <div className="carousel-doc-slide carousel-doc-slide--report">
        <span>Review</span>
        <strong>Weekly report panel</strong>
        <p>Dots and keyboard navigation expose the same active index contract.</p>
      </div>
    ),
  },
];

const longContentSlides = [
  {
    id: "long-brief",
    label: "Long release brief",
    content: (
      <div className="carousel-doc-long-slide">
        <span>Release brief</span>
        <strong>Long content stays inside the carousel viewport</strong>
        <p>
          This slide intentionally contains a longer paragraph so reviewers can confirm that text wraps, remains readable,
          and does not create horizontal page overflow on desktop or mobile widths.
        </p>
      </div>
    ),
  },
  {
    id: "long-checklist",
    label: "Long checklist panel",
    content: (
      <div className="carousel-doc-long-slide carousel-doc-long-slide--alt">
        <span>Checklist</span>
        <strong>Keyboard, swipe, dots, arrows, autoplay pause, and image safety are reviewed together.</strong>
        <p>Dense content should stay clipped to the viewport height while preserving enough line-height to scan.</p>
      </div>
    ),
  },
];

function ControlledCarouselDemo() {
  const [index, setIndex] = useState(0);

  return (
    <div className="carousel-doc-controlled">
      <Carousel aria-label="Controlled Carousel demo" index={index} items={scenicSlides} onIndexChange={setIndex} />
      <div className="doc-demo-row" aria-label="外部切换轮播">
        {scenicSlides.map((slide, slideIndex) => (
          <Button
            key={slide.id}
            onClick={() => setIndex(slideIndex)}
            size="sm"
            variant={index === slideIndex ? "solid" : "ghost"}
          >
            {slideIndex + 1}
          </Button>
        ))}
        <Tag tone="subtle">index: {index}</Tag>
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础轮播",
    description: "默认提供上一张、下一张和圆点入口；ArrowLeft / ArrowRight / Home / End 可键盘切换。",
    preview: <Carousel aria-label="Basic Carousel demo" defaultIndex={1} items={scenicSlides} />,
    code: `<Carousel aria-label="Feature carousel" defaultIndex={1} items={[{ id: "garden", label: "Calm garden dashboard", content: <Slide /> }, { id: "studio", label: "Studio operations board", content: <Slide /> }]} />`,
  },
  {
    title: "受控 index",
    description: "index 和 onIndexChange 可与外部按钮、路由或表单状态同步；回调会携带来源。",
    preview: <ControlledCarouselDemo />,
    code: `const [index, setIndex] = useState(0); <Carousel aria-label="Controlled Carousel" index={index} items={items} onIndexChange={setIndex} />`,
  },
  {
    title: "自动播放与暂停",
    description: "autoplay 在 hover、focus 和 touch drag 时暂停；系统减少动态效果时自动停止计时器。",
    preview: <Carousel aria-label="Autoplay Carousel demo" autoplay interval={3200} items={scenicSlides} />,
    code: `<Carousel aria-label="Autoplay Carousel" autoplay interval={3200} pauseOnHover pauseOnFocus items={items} />`,
  },
  {
    title: "图片安全布局",
    description: "图片被限制在固定比例 viewport 内，支持 cover / contain，不会撑破移动端容器。",
    preview: (
      <div className="carousel-doc-mobile-frame">
        <Carousel
          aria-label="Image-safe Carousel demo"
          imageFit="contain"
          items={[
            {
              id: "image-a",
              label: "Product screen image",
              content: (
                <img
                  alt="Layered product screen preview"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23f7f7f5'/%3E%3Crect x='96' y='70' width='608' height='310' rx='22' fill='%23ffffff' stroke='%23dededb'/%3E%3Crect x='134' y='112' width='208' height='34' rx='8' fill='%232f5d50'/%3E%3Crect x='134' y='176' width='532' height='34' rx='8' fill='%23dededb'/%3E%3Crect x='134' y='234' width='320' height='34' rx='8' fill='%239fb2a8'/%3E%3Crect x='134' y='292' width='428' height='34' rx='8' fill='%23d6c58f'/%3E%3C/svg%3E"
                />
              ),
            },
            scenicSlides[1],
          ]}
        />
      </div>
    ),
    code: `<Carousel aria-label="Image-safe Carousel" imageFit="contain" items={[{ id: "screen", label: "Product screen image", content: <img alt="Layered product screen preview" src={src} /> }]} />`,
  },
  {
    title: "长内容收敛",
    description: "较长标题和说明在 slide 内部换行并裁切，不让页面产生横向滚动。",
    preview: <Carousel aria-label="Long content Carousel demo" items={longContentSlides} />,
    code: `<Carousel aria-label="Long content Carousel" items={[{ id: "brief", label: "Long release brief", content: <LongSlide /> }]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "items", value: "CarouselItem[]", description: "轮播项配置。每项包含 content，可选 id 与 label。" },
  { name: "children", value: "ReactNode", description: "不传 items 时可直接用 children 作为轮播项。" },
  { name: "index", value: "number", description: "受控当前项，从 0 开始。传入后组件不会自行保存 active index。" },
  { name: "defaultIndex", value: "number", description: "非受控初始项。越界值会被安全限制到有效范围。" },
  { name: "onIndexChange", value: "(index, info) => void", description: "点击、键盘、圆点、滑动或自动播放切换时触发，并返回来源。" },
  { name: "autoplay / interval", value: "boolean / number", description: "开启自动播放并设置间隔；最小间隔会限制为 1000ms。" },
  { name: "pauseOnHover / pauseOnFocus", value: "boolean", description: "鼠标悬停或组件获得焦点时暂停自动播放，默认开启。" },
  { name: "showArrows / showDots", value: "boolean", description: "控制上一张、下一张与圆点导航是否展示。" },
  { name: "loop", value: "boolean", description: "是否在首尾循环。关闭后首尾按钮会禁用。" },
  { name: "imageFit", value: '"cover" | "contain"', description: "图片项的 object-fit 策略，默认 cover。" },
  { name: "reducedMotion", value: "boolean", description: "显式覆盖减少动态效果状态；未传时读取系统 prefers-reduced-motion。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: 'div[role="region"]', description: "声明 carousel roledescription，并承载键盘与暂停状态。" },
  { name: "viewport", value: "div.c-carousel__viewport", description: "固定比例裁切区，负责防止图片或内容撑破布局。" },
  { name: "slide", value: 'div[role="group"]', description: "每项声明 slide roledescription；非当前项 aria-hidden 且 inert。" },
  { name: "arrows", value: "button", description: "原生按钮提供上一张、下一张操作和禁用状态。" },
  { name: "dots", value: 'div[role="tablist"]', description: "圆点作为同级 slide selector，并通过 aria-controls 指向 slide。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "slide 内容主承载面。" },
  { name: "surfaceSubtle", value: "#f0f0ee", description: "viewport 背景与图片 contain 留白。" },
  { name: "control", value: "rgba(31, 31, 29, 0.68)", description: "悬浮箭头按钮背景，保证压在图片上仍可读。" },
  { name: "active", value: "#2f5d50", description: "当前圆点与重点 slide 装饰色。" },
  { name: "border", value: "#dededb", description: "viewport、文档表格和移动框边界。" },
  { name: "focus", value: "2px #1f1f1d", description: "键盘焦点环，与其他基础组件保持一致。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "通过", description: "轮播、自动播放、指示器、前后按钮和暂停边界完整，不合并 Image 文档，不承诺 AntD API 镜像。" },
  { name: "UI 专家", value: "通过", description: "固定比例 viewport、裁切、控件命中、动效和移动端滑动以容器内收缩为第一约束。" },
  { name: "研发专家", value: "通过", description: "受控/非受控 activeIndex 同源，timer cleanup、prefers-reduced-motion、键盘与 ARIA 均有实现，无第三方 UI 依赖。" },
  { name: "测试专家", value: "通过", description: "验收覆盖 desktop 与 360/390/430 mobile，包含按钮、圆点、键盘、暂停、滑动、图片和长内容不溢出。" },
  { name: "白帽专家", value: "通过", description: "不注入 HTML，不拉取远程脚本；图片 alt 文本明确，非当前 slide inert，降低隐藏交互误触风险。" },
];

const faqItems = [
  {
    question: "Carousel 是否复用 Image 文档？",
    answer: "不复用。Carousel 只说明轮播容器和图片安全布局；Image 独立组件后续应有自己的预览、占位和错误态文档。",
  },
  {
    question: "为什么减少动态效果时不自动播放？",
    answer: "轮播自动切换属于持续运动，系统声明减少动态效果时应停止计时器，并移除 slide transition。",
  },
  {
    question: "是否支持复杂缩略图、垂直轮播或渐隐效果？",
    answer: "这一版不支持。当前优先交付稳定 index 合约、可访问操作、触摸滑动和移动端安全布局。",
  },
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

export function CarouselDoc({ showAnchors = false }: CarouselDocProps) {
  return (
    <TutorialScaffold component="Carousel" kind="display" oneLineExample={`<Carousel items={items} aria-label="Release highlights" />`}>
    <section className="button-doc carousel-doc" aria-labelledby="carousel-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Carousel 文档目录">
            {carouselDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="carousel-doc-title">{carouselDocMeta.title}</h2>
            <p>
              用于在有限空间内轮播展示图片、截图或内容页。当前 Carousel 聚焦自有实现、受控 index、键盘和触摸操作、自动播放暂停、
              减少动态效果、图片安全布局与移动端不溢出，不与 Image 文档合并。
            </p>
          </header>

          <section className="button-doc-section" id="carousel-when" aria-labelledby="carousel-when-title">
            <h3 id="carousel-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于同一位置展示少量并列内容，例如产品截图、活动横幅、功能介绍或状态面板。</li>
              <li>内容需要被逐项阅读、比较或长期停留时，优先使用 Tabs、List 或 Card，不使用自动轮播。</li>
              <li>移动端必须让轮播在父容器内收缩，图片不应撑出页面横向滚动。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="carousel-demos" aria-labelledby="carousel-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="carousel-demos-title">代码演示</h3>
              <p>示例覆盖基础轮播、受控 index、自动播放暂停、图片安全布局和长内容收敛。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="carousel-api" aria-labelledby="carousel-api-title">
            <h3 id="carousel-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="carousel-semantic" aria-labelledby="carousel-semantic-title">
            <h3 id="carousel-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="carousel-token" aria-labelledby="carousel-token-title">
            <h3 id="carousel-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="carousel-a11y" aria-labelledby="carousel-a11y-title">
            <h3 id="carousel-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>根节点可聚焦；ArrowLeft / ArrowRight 切换相邻项，Home / End 切换首尾项。</li>
              <li>上一张、下一张和圆点均为原生 button，圆点通过 aria-selected 暴露当前项。</li>
              <li>非当前 slide 使用 aria-hidden 和 inert，避免隐藏内容被读屏或键盘误触。</li>
              <li>获得焦点、鼠标悬停或触摸拖动时暂停自动播放，减少动态效果时停止自动播放并移除过渡。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="carousel-review" aria-labelledby="carousel-review-title">
            <h3 id="carousel-review-title">专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="carousel-faq" aria-labelledby="carousel-faq-title">
            <h3 id="carousel-faq-title">FAQ</h3>
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
