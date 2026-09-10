import type { ReactNode } from "react";
import { Button, Result, Tag } from "../components/base";
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

export type ResultDocProps = {
  showAnchors?: boolean;
};

export const resultDocMeta = {
  title: "Result 结果",
  category: "反馈",
  anchors: [
    { id: "result-review", label: "专家结论" },
    { id: "result-when", label: "何时使用" },
    { id: "result-demos", label: "代码演示" },
    { id: "result-api", label: "API" },
    { id: "result-semantic", label: "Semantic DOM" },
    { id: "result-token", label: "Design Token" },
    { id: "result-a11y", label: "可访问性" },
    { id: "result-mobile", label: "移动端" },
    { id: "result-security", label: "安全" },
    { id: "result-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖 success/error/warning/info/403/404/500、title/subTitle 和 actions 边界，Result 只表达流程终点。" },
  { name: "UI 专家", value: "PASS", description: "状态图标、标题、说明和动作层级清晰；留白克制，compact 与移动端保持单列可读。" },
  { name: "研发专家", value: "PASS", description: "自有 React/CSS 实现，ReactNode 边界保留 0 节点；默认 region 语义、图标 aria-hidden、无全局副作用。" },
  { name: "测试专家", value: "PASS", description: "验收 role=region、data-status、标题关联、长文本、动作换行，以及 desktop/360/390/430 不横向溢出。" },
  { name: "白帽专家", value: "PASS", description: "title/subTitle/actions/icon/children 都由 React 渲染，不解析 HTML 字符串，不引入 antd 系依赖。" },
];

const customIcon = (
  <span className="doc-result-badge-icon" aria-hidden="true">
    OK
  </span>
);

const demos: Demo[] = [
  {
    title: "成功结果",
    description: "流程完成后的全页或区块级确认，动作给出后续去向。",
    preview: (
      <Result
        status="success"
        title="Deployment published"
        subTitle="The production bundle is available and smoke checks have passed."
        actions={
          <>
            <Button variant="solid" size="sm">Open release</Button>
            <Button size="sm">View logs</Button>
          </>
        }
      />
    ),
    code: `<Result status="success" title="Deployment published" subTitle="The production bundle is available and smoke checks have passed." actions={<><Button>Open release</Button><Button>View logs</Button></>} />`,
  },
  {
    title: "异常结果",
    description: "错误、警告和信息态表达不同终点，但不使用 Alert 的紧急条幅语义。",
    preview: (
      <div className="doc-result-grid">
        <Result size="compact" status="error" title="Publish failed" subTitle="Fix validation errors and retry." actions={<Button size="sm">Retry</Button>} />
        <Result size="compact" status="warning" title="Review required" subTitle="Security approval is pending." actions={<Button size="sm">Open task</Button>} />
      </div>
    ),
    code: `<Result size="compact" status="error" title="Publish failed" /><Result size="compact" status="warning" title="Review required" />`,
  },
  {
    title: "状态码",
    description: "403、404、500 使用同一组件边界承载错误落地页，不需要额外装饰。",
    preview: (
      <div className="doc-result-grid doc-result-grid--three">
        <Result size="compact" status="403" title="Access denied" subTitle="Ask an owner to grant access." />
        <Result size="compact" status="404" title="Page not found" subTitle="Check the link or return home." />
        <Result size="compact" status="500" title="Service unavailable" subTitle="Try again after the worker recovers." />
      </div>
    ),
    code: `<Result status="403" title="Access denied" /><Result status="404" title="Page not found" /><Result status="500" title="Service unavailable" />`,
  },
  {
    title: "自定义 icon slot",
    description: "icon 可传自有节点；容器默认 aria-hidden，文本语义来自 title/subTitle。",
    preview: (
      <Result
        icon={customIcon}
        status="info"
        title="Checklist ready"
        subTitle="Use the review tags below to decide whether the workflow can move forward."
        actions={
          <>
            <Tag tone="strong">reviewed</Tag>
            <Tag tone="subtle">mobile-safe</Tag>
          </>
        }
      />
    ),
    code: `<Result icon={<span>OK</span>} status="info" title="Checklist ready" actions={<Tag tone="strong">reviewed</Tag>} />`,
  },
  {
    title: "长文本边界",
    description: "长标题、长说明和长动作标签都在 Result 自身边界内换行，不制造页面级 overflow。",
    preview: (
      <Result
        size="compact"
        status="info"
        title="Release-package-validation-completed-with-an-extra-long-human-readable-title"
        subTitle={<span>SubTitle ReactNode keeps long audit text, nested inline nodes, and numeric checkpoints like {0} visible without placeholder leakage.</span>}
        actions={
          <>
            <Button variant="solid" size="sm">Open production validation report</Button>
            <Button size="sm">Download reviewer evidence bundle</Button>
          </>
        }
      />
    ),
    code: `<Result size="compact" status="info" title="Release-package-validation-completed-with-an-extra-long-human-readable-title" subTitle={<span>SubTitle ReactNode keeps long audit text and numeric checkpoints like {0} visible.</span>} actions={<><Button>Open production validation report</Button><Button>Download reviewer evidence bundle</Button></>} />`,
  },
  {
    title: "一行样例",
    description: "单行 smoke 同时覆盖 status、icon、title、subTitle 和 actions，窄屏允许动作换行但页面不横向溢出。",
    preview: (
      <div className="doc-result-one-line" aria-label="Result single row acceptance example">
        <Result
          size="compact"
          status="success"
          icon={<span aria-hidden="true">✓</span>}
          title="One-line smoke passed"
          subTitle="ReactNode text, safe icon slot, and action wrap stay within the Result boundary."
          actions={
            <>
              <Button variant="solid" size="sm">Primary</Button>
              <Button size="sm">Secondary</Button>
            </>
          }
        />
      </div>
    ),
    code: `<Result size="compact" status="success" icon={<span>✓</span>} title="One-line smoke passed" subTitle="ReactNode text, safe icon slot, and action wrap stay within the Result boundary." actions={<><Button>Primary</Button><Button>Secondary</Button></>} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "status", value: '"success" | "error" | "info" | "warning" | "403" | "404" | "500"', description: "结果状态。默认 info，并输出 data-status 便于测试定位。" },
  { name: "title", value: "ReactNode", description: "结果标题，渲染为 role=heading level 2，并自动作为 region 的可访问名称。" },
  { name: "subTitle", value: "ReactNode", description: "结果说明，自动连接 aria-describedby。" },
  { name: "actions", value: "ReactNode", description: "动作槽位，通常放 1-2 个 Button 或轻量链接，移动端自动换行。" },
  { name: "icon", value: "ReactNode", description: "自定义图标槽。图标容器默认 aria-hidden，避免重复朗读状态。" },
  { name: "size", value: '"md" | "compact"', description: "默认 md；compact 适合卡片、抽屉或密集设置页里的结果区块。" },
  { name: "children", value: "ReactNode", description: "可选补充内容，放简短摘要、编号或状态元信息；不要塞复杂表单。" },
  { name: "HTMLAttributes", value: "HTMLAttributes<HTMLElement>", description: "透传 id、className、role、aria-*、data-* 等 section 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "section[role=region]", description: "Result 是流程终点区域，默认使用具名 region，而不是 alert 或 status live region。" },
  { name: "label", value: "aria-labelledby", description: "传入 title 时自动关联标题；无 title 时用 status fallback aria-label。" },
  { name: "description", value: "aria-describedby", description: "传入 subTitle 时自动关联说明文本。" },
  { name: "icon", value: "aria-hidden", description: "默认与自定义图标都作为视觉辅助，不承担唯一语义。" },
  { name: "actions", value: "ReactNode", description: "动作保持调用方语义，按钮仍是原生 button 或链接。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff", description: "结果区域不强制卡片背景，文档示例在可见 surface 上展示。" },
  { name: "text", value: "#1f1f1d", description: "标题主文本。" },
  { name: "textMuted", value: "#696967", description: "说明文本和紧凑辅助内容。" },
  { name: "iconSize", value: "56px / 42px", description: "默认和 compact 的图标容器尺寸。" },
  { name: "radius", value: "8px", description: "图标容器圆角，符合基础组件约束。" },
  { name: "maxWidth", value: "560px", description: "正文最大宽度，避免结果说明形成过长行。" },
];

const accessibilityRows: DocRow[] = [
  { name: "Region name", value: "title", description: "Result 应提供清晰 title，说明流程最终状态，例如 Published、Access denied。" },
  { name: "No forced live", value: "region", description: "Result 常用于导航后页面，不默认打断读屏；即时错误仍应使用 Alert。" },
  { name: "Icon fallback", value: "text label", description: "状态必须通过标题/说明表达，不只依赖颜色、符号或状态码图形。" },
  { name: "Actions", value: "visible text", description: "动作标签需说明去向，例如 Retry、Back home、Open release。" },
  { name: "One-line smoke", value: "doc-result-one-line", description: "文档保留单行验收样例，便于定位 compact、ReactNode icon 和移动端动作换行。" },
];

const mobileRows: DocRow[] = [
  { name: "Layout", value: "single column", description: "Result 始终单列居中；紧凑模式减少 padding 和 icon size。" },
  { name: "Actions", value: "wrap + stretch", description: "窄屏动作换行并占满容器，避免按钮互相挤压。" },
  { name: "Text", value: "wrap", description: "标题与说明允许换行，正文最大宽度随容器收缩。" },
];

const securityRows: DocRow[] = [
  { name: "content", value: "ReactNode", description: "title、subTitle、actions、icon 和 children 由 React 渲染，不解析 HTML 字符串。" },
  { name: "effects", value: "none", description: "组件没有计时器、网络请求、路由跳转或全局状态副作用。" },
  { name: "dependencies", value: "self-owned", description: "不依赖 antd、antd-mobile 或 @ant-design/charts。" },
];

const faqItems = [
  { question: "Result 和 Empty 的区别是什么？", answer: "Result 是流程结束后的结果页或结果区块；Empty 是某个数据容器没有内容。" },
  { question: "Result 和 Alert 的区别是什么？", answer: "Alert 是页面内持续提示或即时错误；Result 是用户已经到达一个终点状态，不默认使用 live region。" },
  { question: "可以放复杂插画吗？", answer: "不建议。Result 保持图标级状态表达，复杂插画容易让结果页变成装饰页面并增加移动端负担。" },
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

export function ResultDoc({ showAnchors = false }: ResultDocProps) {
  return (
    <TutorialScaffold component="Result" kind="feedback" oneLineExample={`<Result status="success" title="Published" />`}>
    <section className="button-doc result-doc" aria-labelledby="result-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Result 文档目录">
            {resultDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>{anchor.label}</a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="result-doc-title">{resultDocMeta.title}</h2>
            <p>用于在流程结束后展示明确结果、原因和下一步动作。当前 Result 是自有 React 实现，覆盖 status、title、subTitle、actions、icon slot、语义 region 和紧凑移动布局。</p>
          </header>

          <section className="button-doc-section" id="result-review" aria-labelledby="result-review-title">
            <h3 id="result-review-title">专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="result-when" aria-labelledby="result-when-title">
            <h3 id="result-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>提交、发布、支付、审批等流程完成后，需要展示最终状态和下一步动作。</li>
              <li>权限拒绝、页面不存在、服务异常等独立落地页或区块级结果。</li>
              <li>不要用 Result 替代 Empty 的无数据状态，也不要替代 Alert 的页面内即时提示。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="result-demos" aria-labelledby="result-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="result-demos-title">代码演示</h3>
              <p>示例覆盖成功、异常、状态码、自定义 icon、actions 和 compact 布局。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => <DemoCard key={demo.title} {...demo} />)}
            </div>
          </section>

          <section className="button-doc-section" id="result-api" aria-labelledby="result-api-title">
            <h3 id="result-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="result-semantic" aria-labelledby="result-semantic-title">
            <h3 id="result-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="result-token" aria-labelledby="result-token-title">
            <h3 id="result-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="result-a11y" aria-labelledby="result-a11y-title">
            <h3 id="result-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="result-mobile" aria-labelledby="result-mobile-title">
            <h3 id="result-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="result-security" aria-labelledby="result-security-title">
            <h3 id="result-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="result-faq" aria-labelledby="result-faq-title">
            <h3 id="result-faq-title">FAQ</h3>
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
