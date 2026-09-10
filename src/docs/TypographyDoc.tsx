import type { ReactNode } from "react";
import { Code, Keyboard, Link, Paragraph, Quote, Text, Title, Typography } from "../components/base";
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

export type TypographyDocProps = {
  showAnchors?: boolean;
};

export const typographyDocMeta = {
  title: "Typography 排版",
  category: "基础组件",
  anchors: [
    { id: "typography-when", label: "何时使用" },
    { id: "typography-demos", label: "代码演示" },
    { id: "typography-api", label: "API" },
    { id: "typography-ellipsis", label: "ellipsis" },
    { id: "typography-copyable", label: "copyable" },
    { id: "typography-semantic", label: "Semantic DOM" },
    { id: "typography-token", label: "Design Token" },
    { id: "typography-a11y", label: "可访问性" },
    { id: "typography-mobile", label: "移动端" },
    { id: "typography-security", label: "安全" },
    { id: "typography-gaps", label: "缺口" },
    { id: "typography-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const longUrl =
  "https://tessera.local/docs/typography/mobile-wrapping/very-long-token-without-natural-breakpoints-2026-acceptance";

const demos: Demo[] = [
  {
    title: "Text 层级",
    description: "Text 覆盖正文色调、尺寸、字重和常见内联语义，不引入外部 UI 库。",
    preview: (
      <Typography compact>
        <div className="doc-demo-row">
          <Text>默认文本</Text>
          <Text tone="secondary">次级文本</Text>
          <Text tone="muted">弱化文本</Text>
          <Text tone="success" weight="medium">
            成功
          </Text>
          <Text tone="warning">警告</Text>
          <Text tone="danger">危险</Text>
        </div>
        <div className="doc-demo-row">
          <Text strong>strong</Text>
          <Text underline>underline</Text>
          <Text delete>delete</Text>
          <Text mark>mark</Text>
        </div>
      </Typography>
    ),
    code: `<Text>默认文本</Text> <Text tone="secondary">次级文本</Text> <Text strong>strong</Text> <Text mark>mark</Text>`,
  },
  {
    title: "Title 语义标题",
    description: "level 决定真实 h1-h5，visualLevel 只改变视觉尺寸，避免用样式伪造文档结构。",
    preview: (
      <div className="typography-doc-heading-demo" data-typography-demo="semantic-headings">
        <Title level={1} visualLevel={3}>
          Release overview
        </Title>
        <Title level={2} visualLevel={4}>
          Scope and status
        </Title>
        <Title level={3} visualLevel={5} tone="secondary">
          Evidence checklist
        </Title>
      </div>
    ),
    code: `<Title level={1} visualLevel={3}>Release overview</Title> <Title level={2} visualLevel={4}>Scope and status</Title> <Title level={3} visualLevel={5}>Evidence checklist</Title>`,
  },
  {
    title: "Paragraph 与省略",
    description: "Paragraph 支持 lead、移动端换行和可展开多行 ellipsis；省略只负责视觉截断。",
    preview: (
      <div className="typography-doc-constrained" data-typography-demo="ellipsis">
        <Paragraph lead>
          适合文档摘要、工作台说明和密集面板中的可读正文，默认保留自然行高和中性颜色。
        </Paragraph>
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}>
          Typography 的多行省略依赖浏览器 line clamp。它不会改写原始文本，也不会向屏幕阅读器隐藏内容；需要完整阅读时提供展开控制。
          This paragraph also includes a long English fragment to make wrapping visible in mobile acceptance runs.
        </Paragraph>
      </div>
    ),
    code: `<Paragraph lead>适合文档摘要...</Paragraph> <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}>Typography 的多行省略依赖浏览器 line clamp...</Paragraph>`,
  },
  {
    title: "Code 与 Keyboard",
    description: "Code 是内联代码标记；多行代码、行号和语言标签由业务组件 CodeBlock 承担。",
    preview: (
      <Typography compact>
        <Paragraph>
          Run <Code>rtk bun run build</Code>, then press <Keyboard>⌘</Keyboard> + <Keyboard>K</Keyboard> to open command search.
        </Paragraph>
        <Paragraph>
          Long token: <Code>typography_inline_code_token_without_breakpoints_2026_06_07</Code>
        </Paragraph>
      </Typography>
    ),
    code: `<Paragraph>Run <Code>rtk bun run build</Code>, then press <Keyboard>⌘</Keyboard> + <Keyboard>K</Keyboard>.</Paragraph>`,
  },
  {
    title: "copyable",
    description: "copyable 只在用户点击时写入剪贴板，成功或失败通过 role=status 反馈。",
    preview: (
      <div className="typography-doc-copyable" data-typography-demo="copyable">
        <Text copyable={{ copiedLabel: "已复制" }} weight="medium">
          <span>typography-copy-token-2026</span>
        </Text>
        <Paragraph copyable={{ copiedLabel: "段落已复制" }}>
          这段文本可以复制。组件不会读取剪贴板，也不会解析 HTML 字符串。
        </Paragraph>
      </div>
    ),
    code: `<Text copyable={{ copiedLabel: "已复制" }}><span>typography-copy-token-2026</span></Text> <Paragraph copyable>这段文本可以复制。</Paragraph>`,
  },
  {
    title: "移动端换行",
    description: "长 URL、英文 token、CJK 混排和外链都应在窄屏内换行，不制造横向滚动。",
    preview: (
      <div className="typography-doc-mobile-frame" data-typography-demo="mobile-wrapping">
        <Title level={3} visualLevel={4}>
          Mobile wrapping specimen with a very long heading token
        </Title>
        <Paragraph mobileWrap="anywhere">
          {longUrl} 与中文说明混排时必须在 360px 宽度内自然换行，不能撑破文档容器。
        </Paragraph>
        <Link href="https://example.com/typography-audit" mobileWrap="anywhere" target="_blank">
          {longUrl}
        </Link>
      </div>
    ),
    code: `<Paragraph mobileWrap="anywhere">${longUrl}</Paragraph>`,
  },
  {
    title: "Link 安全边界",
    description: "Link 会移除 javascript/data/vbscript href；target=_blank 自动补齐 noopener noreferrer。",
    preview: (
      <div className="typography-doc-link-safety" data-typography-demo="link-safety">
        <Paragraph>
          <Link href="javascript:alert('blocked')">危险 href 不会渲染为可跳转地址</Link>
        </Paragraph>
        <Paragraph>
          <Link href="https://example.com/release-notes" target="_blank">
            安全外链会带上 rel 防护
          </Link>
        </Paragraph>
        <Paragraph>
          <Link href="#typography-api">页面内锚点保持可用</Link>
        </Paragraph>
      </div>
    ),
    code: `<Link href="javascript:alert('blocked')">危险 href 不会渲染为可跳转地址</Link> <Link href="https://example.com/release-notes" target="_blank">安全外链会带上 rel 防护</Link> <Link href="#typography-api">页面内锚点保持可用</Link>`,
  },
];

const apiRows: DocRow[] = [
  { name: "Typography", value: "HTMLAttributes<HTMLDivElement>", description: "排版容器，提供默认段落间距和 compact 密度。" },
  { name: "Text", value: "span/code/kbd/del/mark", description: "内联文本。支持 tone、size、weight、strong、underline、delete、mark、code、keyboard。" },
  { name: "Title", value: "level / visualLevel", description: "level 渲染真实 h1-h5；visualLevel 仅调整视觉级别。" },
  { name: "Paragraph", value: "p", description: "正文段落。支持 lead、ellipsis、copyable、mobileWrap、tone、size、weight。" },
  { name: "Code", value: "code", description: "内联代码标记。多行代码、行号和语言标签使用业务组件 CodeBlock。" },
  { name: "Keyboard", value: "kbd", description: "键盘按键语义，用于快捷键和输入提示。" },
  { name: "copyable", value: "boolean | config", description: "配置复制文本、按钮标签、成功标签、超时和 onCopy 结果回调。" },
  { name: "ellipsis", value: "boolean | { rows, expandable, symbol }", description: "单行或多行视觉截断，可提供展开按钮。" },
  { name: "mobileWrap", value: "normal | anywhere | nowrap", description: "控制移动端和窄容器中的长词换行策略。" },
];

const ellipsisRows: DocRow[] = [
  { name: "single line", value: "ellipsis", description: "ellipsis=true 使用单行 text-overflow，适合表格、列表标题和短标签。" },
  { name: "multi line", value: "rows", description: "rows > 1 使用 line clamp；父容器需要有明确宽度。" },
  { name: "expandable", value: "button", description: "expandable=true 会渲染展开按钮，按钮不会被截断内容裁掉。" },
];

const copyableRows: DocRow[] = [
  { name: "write", value: "navigator.clipboard.writeText", description: "在安全上下文和用户点击中优先使用 Clipboard API。" },
  { name: "fallback", value: "textarea + execCommand", description: "浏览器不支持 Clipboard API 时使用隐藏 textarea 写入，不读取剪贴板。" },
  { name: "feedback", value: "role=status", description: "复制成功或失败进入无障碍状态区，同时按钮 data-copy-state 便于验收。" },
];

const semanticRows: DocRow[] = [
  { name: "Typography", value: "div", description: "容器不改变文档大纲。" },
  { name: "Title", value: "h1-h5", description: "真实标题元素来自 level，visualLevel 不影响语义。" },
  { name: "Paragraph", value: "p", description: "正文段落保留自然阅读顺序。" },
  { name: "Code / Keyboard", value: "code / kbd", description: "使用浏览器原生内联语义，不替代业务代码块。" },
  { name: "copy", value: "button + status", description: "复制入口是原生 button，反馈区域使用 role=status。" },
];

const tokenRows: DocRow[] = [
  { name: "text", value: "#1f1f1d", description: "默认正文和标题颜色。" },
  { name: "muted", value: "#696967 / #8a8a86", description: "次级和弱化文字。" },
  { name: "surfaceSubtle", value: "#fbfbfa", description: "代码、键盘和引用的轻量背景。" },
  { name: "border", value: "#dededb", description: "内联代码、键盘、引用和复制按钮边界。" },
  { name: "radius", value: "4px / 6px", description: "文本内联标记保持紧凑圆角。" },
  { name: "fontMono", value: "ui-monospace", description: "Code 和 Keyboard 使用系统等宽字体栈。" },
  {
    name: "主题 style",
    value: "--ct-text / --ct-text-secondary / --ct-surface-sunken",
    description: "文字层级、链接、引用、代码面和复制按钮反馈读取 --ct-* token；亮/暗主题下保持可读对比和中性 hover。",
  },
  {
    name: "结构 style",
    value: "semantic element / line-height / wrap",
    description: "标题级别、段落、ellipsis、copy/expand 控件和 long-token wrap 属于结构样式，360/390/430 下不遮挡相邻内容。",
  },
];

const accessibilityRows: DocRow[] = [
  { name: "Heading", value: "level", description: "按页面结构选择 level，不用 visualLevel 伪造层级。" },
  { name: "Copy", value: "button", description: "复制入口可聚焦，结果通过 role=status 宣告。" },
  { name: "Ellipsis", value: "expandable", description: "关键内容不应只依赖截断展示；长正文可提供展开。" },
  { name: "Color", value: "text + contrast", description: "状态色仍配合文字，不把颜色作为唯一信息来源。" },
];

const mobileRows: DocRow[] = [
  { name: "Text / Paragraph", value: "overflow-wrap", description: "默认正常换行，mobileWrap=anywhere 用于 URL、token 和窄栏。" },
  { name: "Title", value: "anywhere", description: "标题默认允许长词换行，避免移动端撑破布局。" },
  { name: "Code", value: "anywhere", description: "内联代码允许长 token 换行；多行代码交给 CodeBlock。" },
  { name: "Keyboard", value: "nowrap per key", description: "单个按键不拆开，按键之间可由外层自然换行。" },
];

const securityRows: DocRow[] = [
  { name: "HTML", value: "ReactNode", description: "组件不接收 dangerouslySetInnerHTML，不解析 HTML 字符串。" },
  { name: "href", value: "safe protocols", description: "Link 仅保留 http、https、mailto、tel、相对路径和锚点；危险协议会移除 href。" },
  { name: "target", value: "noopener noreferrer", description: "target=_blank 自动合并 rel=noopener noreferrer，保留调用方已有 rel token。" },
  { name: "Clipboard", value: "write only", description: "copyable 只写入明确文本，不读取剪贴板内容。" },
  { name: "External UI", value: "none", description: "实现不依赖 antd、antd-mobile 或 @ant-design/charts。" },
];

const faqItems = [
  {
    question: "Typography.Code 能不能当代码块用？",
    answer: "不能。它只负责内联 code 语义和轻量样式，多行展示、行号、语言标签和代码复制由 CodeBlock 承担。",
  },
  {
    question: "visualLevel 会影响语义吗？",
    answer: "不会。只有 level 决定真实 h1-h5。visualLevel 是为了在不破坏文档大纲时调整视觉尺寸。",
  },
  {
    question: "ellipsis 会修改文本吗？",
    answer: "不会。ellipsis 是 CSS 视觉截断；copyable 使用原始文本或显式 text 配置。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo typography-doc-demo">
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

export function TypographyDoc({ showAnchors = false }: TypographyDocProps) {
  return (
    <TutorialScaffold
      component="Typography"
      kind="display"
      oneLineExample={`<Typography compact><Text strong>Release ready</Text><Paragraph mobileWrap="anywhere">Stable text wraps safely.</Paragraph></Typography>`}
    >
    <section className="button-doc typography-doc" aria-labelledby="typography-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Typography 文档目录">
            {typographyDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="typography-doc-title">{typographyDocMeta.title}</h2>
            <p>
              独立的基础排版组件，覆盖正文、标题、段落、内联代码、键盘标记、省略、复制和移动端长文本换行。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；风险集中在长文本溢出、外链 rel、复制权限和宿主传入内容边界。
            </p>
          </header>

          <section className="button-doc-section" id="typography-when" aria-labelledby="typography-when-title">
            <h3 id="typography-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要稳定表达页面标题、说明正文、内联代码、快捷键或状态文字时使用。</li>
              <li>需要 copyable 或 ellipsis，但不需要编辑态富文本时使用。</li>
              <li>多行代码展示、Markdown 预览和编辑器能力分别使用 CodeBlock 与 MarkdownEditor。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="typography-demos" aria-labelledby="typography-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="typography-demos-title">代码演示</h3>
              <p>示例直接渲染生产组件，覆盖 Text、Title、Paragraph、Code、Keyboard、ellipsis、copyable 和移动端换行。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="typography-api" aria-labelledby="typography-api-title">
            <h3 id="typography-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="typography-ellipsis" aria-labelledby="typography-ellipsis-title">
            <h3 id="typography-ellipsis-title">ellipsis</h3>
            <DataTable rows={ellipsisRows} />
          </section>

          <section className="button-doc-section" id="typography-copyable" aria-labelledby="typography-copyable-title">
            <h3 id="typography-copyable-title">copyable</h3>
            <DataTable rows={copyableRows} />
          </section>

          <section className="button-doc-section" id="typography-semantic" aria-labelledby="typography-semantic-title">
            <h3 id="typography-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="typography-token" aria-labelledby="typography-token-title">
            <h3 id="typography-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="typography-a11y" aria-labelledby="typography-a11y-title">
            <h3 id="typography-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="typography-mobile" aria-labelledby="typography-mobile-title">
            <h3 id="typography-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="typography-security" aria-labelledby="typography-security-title">
            <h3 id="typography-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="typography-gaps" aria-labelledby="typography-gaps-title">
            <h3 id="typography-gaps-title">缺口</h3>
            <p>
              当前不支持 AntD 的 editable 文本、复杂 mark 组合或多行代码块能力。需要可编辑文本时应先设计独立编辑体验；需要代码块时使用
              CodeBlock。
            </p>
            <Quote citeLabel="Implementation boundary">Typography 是文本语义和可读性组件，不是 Markdown、富文本或代码展示系统。</Quote>
          </section>

          <section className="button-doc-section" id="typography-faq" aria-labelledby="typography-faq-title">
            <h3 id="typography-faq-title">FAQ</h3>
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
