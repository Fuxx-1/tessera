import { useState, type ReactNode } from "react";
import { Button, Steps } from "../components/base";
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

export type StepsDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Steps ariaLabel="发布流程" current={1} items={steps} />`;

export const stepsDocMeta = {
  title: "Steps 步骤条",
  category: "基础组件",
  anchors: [
    { id: "steps-when", label: "何时使用" },
    { id: "steps-demos", label: "代码演示" },
    { id: "steps-api", label: "API" },
    { id: "steps-semantic", label: "Semantic DOM" },
    { id: "steps-style", label: "主题与结构 style" },
    { id: "steps-a11y", label: "可访问性" },
    { id: "steps-mobile", label: "移动端" },
    { id: "steps-review", label: "五角色复核" },
    { id: "steps-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "items",
    value: "StepItem[]",
    description: "步骤数据。每项包含 title，可选 description、subTitle、status、disabled、key 和 ariaLabel。",
  },
  {
    name: "current",
    value: "number",
    description: "当前步骤索引，默认 0。越界值会被限制在可用步骤范围内。",
  },
  {
    name: "direction",
    value: '"horizontal" | "vertical"',
    description: "步骤排列方向，默认 horizontal。窄屏下 horizontal 会自动转为竖向展示。",
  },
  {
    name: "onChange",
    value: "(index: number) => void",
    description: "传入后步骤变为可点击导航；disabled 项不可点击，也不会触发回调。",
  },
  {
    name: "ariaLabel",
    value: "string",
    description: "根 nav 的可访问名称，默认 Steps。一个页面有多个 Steps 时应传入业务化名称。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLElement>",
    description: "继承 nav 可用属性，例如 id、className、data-* 和 aria-describedby。",
  },
];

const itemRows: DocRow[] = [
  {
    name: "title",
    value: "ReactNode",
    description: "步骤主标题。",
  },
  {
    name: "description",
    value: "ReactNode",
    description: "步骤说明文字，适合展示阶段说明、负责人或下一步提示。",
  },
  {
    name: "subTitle",
    value: "ReactNode",
    description: "标题旁的短补充信息，例如时间、数量或环境名。",
  },
  {
    name: "status",
    value: '"wait" | "process" | "finish" | "error"',
    description: "覆盖单项状态；未传入时由 current 自动推导。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用当前步骤导航。禁用项保留展示语义，不提供按钮交互。",
  },
  {
    name: "ariaLabel",
    value: "string",
    description: "覆盖单项按钮或静态组的可访问名称。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "nav[aria-label]",
    description: "Steps 是流程导航区域，根节点使用 nav 并提供可访问名称。",
  },
  {
    name: "list",
    value: "ol > li",
    description: "步骤保持有序列表语义，让辅助技术能理解流程顺序和数量。",
  },
  {
    name: "interactive item",
    value: "button",
    description: "传入 onChange 且未禁用的步骤使用原生 button，保留键盘激活行为。",
  },
  {
    name: "current",
    value: 'aria-current="step"',
    description: "当前步骤无论是否可点击都会标记 aria-current=\"step\"。",
  },
  {
    name: "disabled static",
    value: 'role="group" aria-disabled="true"',
    description: "禁用项不渲染为按钮，避免产生可聚焦但不可执行的伪交互。",
  },
];

const styleRows: DocRow[] = [
  {
    name: "主题 style",
    value: "--ct-surface-selected / --ct-border / --ct-focus-ring",
    description: "marker、connector、hover、process、finish、error、disabled 和 focus 都读取 --ct-* 中性 token；状态色只保留在文字/标记前景，不做大面积填充。",
  },
  {
    name: "结构 style",
    value: "nav ol/li / connector / responsive vertical",
    description: "水平/竖向列表、连接线、button/static item、aria-current、min-height 44px 和 760px 竖向降级都是结构样式。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "button / static",
    description: "可点击项支持 Enter 和 Space；静态项不进入操作序列。",
  },
  {
    name: "Current",
    value: 'aria-current="step"',
    description: "只在当前项输出，便于读屏用户识别所在阶段。",
  },
  {
    name: "Status",
    value: "sr-only label",
    description: "wait、process、finish、error 都有屏幕阅读器状态文本，视觉状态不只依赖颜色。",
  },
  {
    name: "Hit area",
    value: "min-height 44px",
    description: "可点击项保持足够触控面积，窄屏下与竖向连线一起稳定布局。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Fallback",
    value: "horizontal -> vertical",
    description: "小于 760px 时水平步骤自动降级为竖向，不压缩标题和说明。",
  },
  {
    name: "Connector",
    value: "vertical line",
    description: "移动端连线从横向改为垂直，保持步骤关系清楚。",
  },
  {
    name: "Text",
    value: "overflow-wrap",
    description: "标题、说明和副标题允许换行，避免长文本冲出卡片或遮挡后续内容。",
  },
];

const faqItems = [
  {
    question: "Steps 是否等同于 Tabs？",
    answer: "不是。Steps 表达流程进度和阶段顺序，Tabs 表达同级内容切换。可点击 Steps 也应只用于流程阶段跳转。",
  },
  {
    question: "为什么 disabled 项不是 button？",
    answer: "禁用步骤不应该出现在可操作序列里。静态组能保留标题、描述和状态，同时减少键盘用户的无效停顿。",
  },
  {
    question: "如何处理错误步骤？",
    answer: "给对应 item 传入 status=\"error\"。组件会显示错误标记并向屏幕阅读器输出 Error 状态。",
  },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "步骤条只表达阶段顺序和当前进度，不替代 Tabs、Timeline 或审批详情。" },
  { name: "UI 专家", value: "PASS", description: "process/finish/error 使用中性 marker 面和状态前景，不再使用大面积彩色填充；移动端纵向关系清晰。" },
  { name: "研发专家", value: "PASS", description: "自有 React/TypeScript 实现，nav/ol/li/button 语义稳定，未引入外部 UI 依赖。" },
  { name: "测试专家", value: "PASS", description: "文档覆盖自动状态、可点击、禁用、错误、长标题、竖向和一行样例；smoke 覆盖 360/390/430。" },
  { name: "白帽专家", value: "PASS", description: "内容以 ReactNode 渲染，不解析 HTML；onChange 只返回本地索引，不执行外部 URL 或脚本。" },
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

export function StepsDoc({ showAnchors = false }: StepsDocProps) {
  const [current, setCurrent] = useState(1);
  const demos: Demo[] = [
    {
      title: "基础进度",
      description: "未显式传 status 时，Steps 会根据 current 推导完成、当前和等待状态。",
      preview: (
        <Steps
          ariaLabel="发布流程"
          current={1}
          items={[
            { key: "draft", title: "填写信息", description: "补齐标题、说明和负责人。" },
            { key: "review", title: "内容审核", description: "当前正在进行中。" },
            { key: "publish", title: "发布上线", description: "等待审核通过。" },
          ]}
        />
      ),
      code: `<Steps
  ariaLabel="发布流程"
  current={1}
  items={[
    { key: "draft", title: "填写信息", description: "补齐标题、说明和负责人。" },
    { key: "review", title: "内容审核", description: "当前正在进行中。" },
    { key: "publish", title: "发布上线", description: "等待审核通过。" },
  ]}
/>`,
    },
    {
      title: "一行紧凑流程",
      description: "短流程可以只保留标题，桌面端稳定单行，窄屏下自然转为竖向。",
      preview: (
        <div className="steps-doc-one-line" aria-label="一行步骤示例">
          <Steps
            ariaLabel="一行紧凑流程"
            current={2}
            items={[
              { key: "plan", title: "方案" },
              { key: "dev", title: "开发" },
              { key: "test", title: "测试" },
              { key: "ship", title: "上线" },
            ]}
          />
        </div>
      ),
      code: `<Steps ariaLabel="一行紧凑流程" current={2} items={[{ title: "方案" }, { title: "开发" }, { title: "测试" }, { title: "上线" }]} />`,
    },
    {
      title: "可点击步骤",
      description: "传入 onChange 后，未禁用项使用 button。disabled 项保持静态展示且不会触发回调。",
      preview: (
        <div className="steps-doc-live">
          <Steps
            ariaLabel="可跳转部署步骤"
            current={current}
            items={[
              { key: "queue", title: "排队", subTitle: "09:10", description: "请求已接收。" },
              { key: "build", title: "构建", subTitle: "09:14", description: "正在生成产物。" },
              { key: "verify", title: "验证", description: "等待构建完成。", disabled: true },
              { key: "ship", title: "上线", description: "最终确认。" },
            ]}
            onChange={setCurrent}
          />
          <Button size="sm" variant="ghost" onClick={() => setCurrent(0)}>
            回到第一步
          </Button>
        </div>
      ),
      code: `<Steps
  ariaLabel="可跳转部署步骤"
  current={current}
  items={[
    { key: "queue", title: "排队", subTitle: "09:10", description: "请求已接收。" },
    { key: "build", title: "构建", subTitle: "09:14", description: "正在生成产物。" },
    { key: "verify", title: "验证", description: "等待构建完成。", disabled: true },
    { key: "ship", title: "上线", description: "最终确认。" },
  ]}
  onChange={setCurrent}
/>`,
    },
    {
      title: "长标题换行",
      description: "标题、副标题和说明允许自然换行，适合发布流程、审批节点等真实业务长文案。",
      preview: (
        <Steps
          ariaLabel="长标题发布流程"
          current={1}
          items={[
            {
              key: "collect",
              title: "收集跨团队灰度发布前置条件",
              description: "确认配置、通知和回滚联系人都已经同步。",
            },
            {
              key: "verify",
              title: "验证移动端长标题在窄屏容器内自然换行",
              subTitle: "mobile",
              description: "标题不截断，不遮挡连接线，也不会撑出文档卡片。",
            },
            {
              key: "close",
              title: "完成上线复盘并归档",
              description: "等待最终确认。",
            },
          ]}
        />
      ),
      code: `<Steps
  ariaLabel="长标题发布流程"
  current={1}
  items={[
    {
      key: "collect",
      title: "收集跨团队灰度发布前置条件",
      description: "确认配置、通知和回滚联系人都已经同步。",
    },
    {
      key: "verify",
      title: "验证移动端长标题在窄屏容器内自然换行",
      subTitle: "mobile",
      description: "标题不截断，不遮挡连接线，也不会撑出文档卡片。",
    },
    {
      key: "close",
      title: "完成上线复盘并归档",
      description: "等待最终确认。",
    },
  ]}
/>`,
    },
    {
      title: "竖向与错误状态",
      description: "竖向 Steps 适合详情页、审批流和移动端。单项 status 可覆盖自动推导结果。",
      preview: (
        <Steps
          ariaLabel="审批异常流程"
          current={2}
          direction="vertical"
          items={[
            { key: "apply", title: "提交申请", description: "申请人已提交。" },
            { key: "manager", title: "主管审批", description: "已通过。" },
            { key: "finance", title: "财务复核", status: "error", description: "预算编码缺失。" },
            { key: "done", title: "完成归档", description: "等待复核通过。" },
          ]}
        />
      ),
      code: `<Steps
  ariaLabel="审批异常流程"
  current={2}
  direction="vertical"
  items={[
    { key: "apply", title: "提交申请", description: "申请人已提交。" },
    { key: "manager", title: "主管审批", description: "已通过。" },
    { key: "finance", title: "财务复核", status: "error", description: "预算编码缺失。" },
    { key: "done", title: "完成归档", description: "等待复核通过。" },
  ]}
/>`,
    },
  ];

  return (
    <TutorialScaffold component="Steps" kind="display" oneLineExample={oneLineExample}>
    <section className="button-doc steps-doc" aria-labelledby="steps-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Steps 文档目录">
            {stepsDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="steps-doc-title">{stepsDocMeta.title}</h2>
            <p>
              用于展示多阶段任务的顺序、进度和当前状态。组件使用自有 DOM 与样式实现，不依赖 antd 系组件。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认阶段语义、状态文案、移动端纵向降级和安全依赖边界。
            </p>
          </header>

          <section className="button-doc-section" id="steps-when" aria-labelledby="steps-when-title">
            <h3 id="steps-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>任务存在明确先后顺序，并且用户需要知道当前处于哪个阶段。</li>
              <li>流程步骤数量较少，通常 3 到 6 项；过长流程应拆分为分组详情或时间线。</li>
              <li>只在需要阶段跳转时传入 onChange，否则保持静态进度展示。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="steps-demos" aria-labelledby="steps-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="steps-demos-title">代码演示</h3>
              <p>示例覆盖自动状态、点击切换、禁用项、错误状态、竖向布局和移动端降级。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="steps-api" aria-labelledby="steps-api-title">
            <h3 id="steps-api-title">API</h3>
            <DataTable rows={apiRows} />
            <h4 className="steps-doc__subheading">StepItem</h4>
            <DataTable rows={itemRows} />
          </section>

          <section className="button-doc-section" id="steps-semantic" aria-labelledby="steps-semantic-title">
            <h3 id="steps-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="steps-style" aria-labelledby="steps-style-title">
            <h3 id="steps-style-title">主题与结构 style</h3>
            <DataTable rows={styleRows} />
          </section>

          <section className="button-doc-section" id="steps-a11y" aria-labelledby="steps-a11y-title">
            <h3 id="steps-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="steps-mobile" aria-labelledby="steps-mobile-title">
            <h3 id="steps-mobile-title">移动端 / 安全</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="steps-review" aria-labelledby="steps-review-title">
            <h3 id="steps-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="steps-faq" aria-labelledby="steps-faq-title">
            <h3 id="steps-faq-title">FAQ</h3>
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
