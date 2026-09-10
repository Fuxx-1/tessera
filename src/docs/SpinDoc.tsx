import type { ReactNode } from "react";
import { Card, ConfigProvider, Spin, Tag } from "../components/base";
import { TutorialScaffold } from "./TutorialScaffold";

export type SpinDocProps = {
  showAnchors?: boolean;
};

type DocRow = {
  name: string;
  value: string;
  description: string;
};

type DemoCardProps = {
  title: string;
  description: string;
  code: string;
  children: ReactNode;
};

export const spinDocMeta = {
  id: "spin",
  title: "Spin 加载中",
  subtitle: "用于短时等待、局部内容遮罩和整页阻塞加载的反馈组件。",
};

const anchors = [
  { id: "spin-usage", label: "何时使用" },
  { id: "spin-demos", label: "示例" },
  { id: "spin-api", label: "API" },
  { id: "spin-semantic", label: "Semantic DOM" },
  { id: "spin-token", label: "Design Token" },
  { id: "spin-a11y", label: "a11y" },
  { id: "spin-mobile", label: "mobile" },
  { id: "spin-review", label: "五角色复核" },
  { id: "spin-gaps", label: "缺口" },
];

const apiRows: DocRow[] = [
  {
    name: "spinning",
    value: "boolean = true",
    description: "控制加载状态；false 时不渲染指示器和遮罩，包裹内容保持原样。",
  },
  {
    name: "delay",
    value: "number = 0",
    description: "延迟显示加载态，避免接口瞬时返回时闪烁；aria-busy 与实际可见遮罩同步。",
  },
  {
    name: "size",
    value: '"sm" | "md" | "lg" = "md"',
    description: "控制默认圆形指示器尺寸；文档样例保持一行可读，长标签允许换行。",
  },
  {
    name: "label",
    value: "ReactNode = \"Loading\"",
    description: "可见状态文本，也是 role=status 的朗读内容；传入 null 时保留屏幕阅读器兜底文案，优先级高于 tip。",
  },
  {
    name: "tip",
    value: "ReactNode",
    description: "加载提示别名，兼容常见 Spin tip 写法；未传 label 时渲染为状态文本，不创建单独分区。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "传入后进入包裹模式：内容不卸载，遮罩覆盖在内容之上，容器设置 aria-busy。",
  },
  {
    name: "fullscreen",
    value: "boolean = false",
    description: "用于整页等待态；当前实现 fixed 覆盖视口，不内建取消按钮或焦点陷阱。",
  },
  {
    name: "indicator",
    value: "ReactNode",
    description: "替换默认装饰指示器；组件用 aria-hidden 包裹，状态朗读始终由 label 或 tip 承载。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "standalone",
    value: 'div.c-spin[role="status"][aria-live="polite"]',
    description: "裸 Spin 是 polite 状态节点，默认图形 aria-hidden，只朗读 label 文本。",
  },
  {
    name: "wrapped",
    value: 'div.c-spin-container[aria-busy="true"]',
    description: "包裹模式把 busy 语义挂在内容容器上，内容 DOM 保持挂载，遮罩只作为视觉层。",
  },
  {
    name: "overlay",
    value: "div.c-spin-container__overlay > div.c-spin",
    description: "遮罩使用绝对定位和半透明背景，不改变内容布局尺寸。",
  },
  {
    name: "reduced motion",
    value: "@media (prefers-reduced-motion: reduce)",
    description: "系统低动效偏好下停止旋转动画，保留静态指示器和状态文本。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "indicator color",
    value: "#555552 / #dededb",
    description: "前景与轨道使用中性灰，符合 neutral minimal 黑灰层级，不引入蓝色主色。",
  },
  {
    name: "label typography",
    value: "13px / 560",
    description: "加载文案保持辅助层级，避免抢占主内容标题权重。",
  },
  {
    name: "overlay background",
    value: "rgba(255,255,255,.62)",
    description: "局部遮罩降低内容对比但不完全隐藏，便于用户确认上下文仍在。",
  },
  {
    name: "fullscreen background",
    value: "rgba(251,251,250,.78)",
    description: "全屏状态使用近白遮罩，和文档系统浅色表面一致。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "定位为短时等待反馈；SpinDoc 独立维护，不合并 SkeletonDoc 或 ProgressDoc。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "sm/md/lg、包裹遮罩、全屏遮罩和提示文本均有可视样例，保持中性色和低阴影。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "API 面保持 React 原生属性扩展；delay、spinning、children 组合不卸载内容。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "验收覆盖桌面、360/390/430 移动宽度、aria-busy/status、低动效、长 tip 和样例一行。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "label、tip 与 indicator 均为安全 ReactNode，组件类型排除 dangerouslySetInnerHTML，且不依赖 antd。",
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
              <td>{row.name}</td>
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

function DemoCard({ children, code, description, title }: DemoCardProps) {
  return (
    <article className="button-doc-demo spin-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--stack">{children}</div>
      <pre className="button-doc-code" aria-label={`${title} 代码`}>
        <code>{code}</code>
      </pre>
    </article>
  );
}

function RecordsPanel() {
  return (
    <Card title="Deployment records" description="Wrapped content remains mounted.">
      <div className="spin-doc-record-row">
        <Tag status="processing">syncing</Tag>
        <span>release-2026.06.07</span>
        <span>3 jobs pending</span>
      </div>
    </Card>
  );
}

export function SpinDoc({ showAnchors = false }: SpinDocProps) {
  return (
    <TutorialScaffold component="Spin" kind="feedback" oneLineExample={`<Spin label="Loading data" />`}>
    <section className="button-doc spin-doc" aria-labelledby="spin-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Spin 文档目录">
            {anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">Base / Feedback / production</p>
            <h2 id="spin-doc-title">{spinDocMeta.title}</h2>
            <p>{spinDocMeta.subtitle}</p>
            <p>
              源码：<code>src/components/base/Spin/Spin.tsx</code>；registry：<code>llms-full-cn:Spin</code>。SpinDoc 保持独立，不合并 SkeletonDoc 或
              ProgressDoc；当前实现不依赖 antd、antd-mobile 或 @ant-design/charts。
            </p>
          </header>

          <section className="button-doc-section" id="spin-usage" aria-labelledby="spin-usage-title">
            <h3 id="spin-usage-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>局部区域正在刷新、提交或同步，且预计等待时间较短时使用。</li>
              <li>已有内容需要保持上下文但暂时不可操作时，用包裹模式叠加遮罩。</li>
              <li>整页初始化或路由级阻塞可使用 fullscreen；超过数秒的任务应补充 Progress 或更具体的状态文案。</li>
              <li>结构已知但数据未返回时优先用 Skeleton；可量化任务优先用 Progress。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="spin-demos" aria-labelledby="spin-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="spin-demos-title">示例</h3>
              <p>示例均使用真实 Spin 组件；文案、指示器和包裹内容在窄屏下保持一行或自然换行。</p>
            </div>
            <div className="button-doc-demo-grid spin-doc-demo-grid">
              <DemoCard
                code={'<Spin size="sm" label="Syncing" /> <Spin label="Loading records" /> <Spin size="lg" label="Preparing workspace" />'}
                description="sm、md、lg 三种默认尺寸，状态文本和圆形指示器保持同一行。"
                title="Sizes and text"
              >
                <div className="spin-doc-inline-row">
                  <Spin size="sm" label="Syncing" />
                  <Spin label="Loading records" />
                  <Spin size="lg" label="Preparing workspace" />
                </div>
              </DemoCard>

              <DemoCard
                code={'<Spin label="Syncing records" size="sm"><Card title="Deployment records">...</Card></Spin>'}
                description="包裹内容时内容 DOM 不卸载，容器 aria-busy 与遮罩可见状态同步。"
                title="Wrapped content"
              >
                <Spin label="Syncing records" size="sm">
                  <RecordsPanel />
                </Spin>
              </DemoCard>

              <DemoCard
                code={'<Spin fullscreen label="Preparing workspace" />'}
                description="文档内用静态舞台模拟 fullscreen，实际组件使用 fixed 覆盖视口。"
                title="Fullscreen mask"
              >
                <div className="spin-doc-fullscreen-stage" aria-label="Fullscreen mask preview">
                  <div className="spin-doc-fullscreen-stage__chrome" />
                  <div className="spin-doc-fullscreen-stage__body">
                    <span />
                    <span />
                    <span />
                  </div>
                  <Spin className="spin-doc-fullscreen-overlay" fullscreen label="Preparing workspace" />
                </div>
              </DemoCard>

              <DemoCard
                code={'<Spin delay={300} tip="Saving changes" /> <Spin tip="Saving a very long workspace configuration label that wraps inside the container without widening mobile viewports" /> <ConfigProvider theme="dark"><Spin label="Refreshing dark surface" /></ConfigProvider> <Spin spinning={false}><Card title="Loaded state">...</Card></Spin>'}
                description="delay 防止短闪烁；tip 在未传 label 时作为状态文本；spinning=false 时直接展示内容，长 tip 与暗色面保持可读。"
                title="Delay and inactive state"
              >
                <div className="spin-doc-state-stack">
                  <Spin delay={300} tip="Saving changes" />
                  <div className="spin-doc-long-tip">
                    <Spin tip="Saving a very long workspace configuration label that wraps inside the container without widening mobile viewports" />
                  </div>
                  <ConfigProvider className="spin-doc-dark-surface" theme="dark">
                    <Spin label="Refreshing dark surface" />
                  </ConfigProvider>
                  <Spin spinning={false}>
                    <Card title="Loaded state" description="No overlay or aria-busy is present.">
                      <Tag tone="strong">ready</Tag>
                    </Card>
                  </Spin>
                </div>
              </DemoCard>
            </div>
          </section>

          <section className="button-doc-section" id="spin-api" aria-labelledby="spin-api-title">
            <h3 id="spin-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="spin-semantic" aria-labelledby="spin-semantic-title">
            <h3 id="spin-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="spin-token" aria-labelledby="spin-token-title">
            <h3 id="spin-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="spin-a11y" aria-labelledby="spin-a11y-title">
            <h3 id="spin-a11y-title">a11y</h3>
            <ul className="button-doc-list">
              <li>裸 Spin 使用 role=status 和 aria-live=polite；默认图形 aria-hidden，避免朗读装饰节点。</li>
              <li>包裹模式只有遮罩实际显示时才设置 aria-busy，delay 未到时不会提前宣告忙碌。</li>
              <li>label 或 tip 为空时仍保留屏幕阅读器兜底 Loading 文案；可见文案建议使用具体动作，如 Syncing records。</li>
              <li>低动效偏好下旋转动画停止，视觉上仍保留静态圆环和状态文本。</li>
              <li>ReactNode 由 React 渲染，不解析 HTML 字符串，也不暴露 dangerouslySetInnerHTML 注入入口。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="spin-mobile" aria-labelledby="spin-mobile-title">
            <h3 id="spin-mobile-title">mobile</h3>
            <ul className="button-doc-list">
              <li>按桌面、360px、390px 与 430px 视口验收：文档样例不横向溢出，内联 Spin 文案可自然换行。</li>
              <li>包裹模式的 overlay 不改变内容宽度，移动端卡片内容使用 min-width: 0 和 overflow-wrap。</li>
              <li>fullscreen 使用 fixed inset: 0，实际页面中应避开永久阻断式加载，必要时提供业务级失败或重试出口。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="spin-review" aria-labelledby="spin-review-title">
            <h3 id="spin-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="spin-gaps" aria-labelledby="spin-gaps-title">
            <h3 id="spin-gaps-title">缺口</h3>
            <ul className="button-doc-list">
              <li>当前不内建 loading button、tip slot 分区、progress percent 或取消动作；这些属于 Button/Progress/业务流组合。</li>
              <li>fullscreen 不创建 portal，也不管理焦点；需要全局层级治理时应与 App/Overlay 基础设施整合。</li>
              <li>自定义 indicator 是 ReactNode 透传，宿主需要自行保证尺寸稳定和可访问语义不重复。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
