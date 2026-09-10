import type { ReactNode } from "react";
import { Button, Card, ConfigProvider, Tag, useConfigProvider } from "../components/base";
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

export type ConfigProviderDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<ConfigProvider theme="dark" locale="zh-CN" prefixCls="acme"><Panel /></ConfigProvider>`;

export const configProviderDocMeta = {
  title: "ConfigProvider 全局化配置",
  category: "基础组件",
  anchors: [
    { id: "config-provider-when", label: "何时使用" },
    { id: "config-provider-demos", label: "代码演示" },
    { id: "config-provider-api", label: "API" },
    { id: "config-provider-context", label: "Context" },
    { id: "config-provider-semantic", label: "Semantic DOM" },
    { id: "config-provider-token", label: "Design Token" },
    { id: "config-provider-a11y", label: "可访问性" },
    { id: "config-provider-mobile", label: "移动端" },
    { id: "config-provider-security", label: "安全" },
    { id: "config-provider-review", label: "专家结论" },
    { id: "config-provider-gaps", label: "缺口" },
    { id: "config-provider-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const localeText = {
  locale: "zh-CN",
  emptyText: "暂无数据",
  loadingText: "加载中",
  okText: "确认",
  cancelText: "取消",
};

const warmTokens = {
  color: {
    canvas: "#f4f7f1",
    surface: "#ffffff",
    surfaceSubtle: "#eef4ea",
    border: "#cbd8c1",
    borderStrong: "#9fb18f",
    text: "#1d241a",
    textMuted: "#5f6c58",
    control: "#e7efdf",
    controlHover: "#dce8d1",
    inverse: "#24351d",
    inverseText: "#ffffff",
    focus: "#47613b",
  },
};

function ContextProbe() {
  const config = useConfigProvider();

  return (
    <div className="config-provider-doc-probe" aria-label="当前 ConfigProvider 上下文">
      <Tag>{config.theme}</Tag>
      <Tag>{config.density}</Tag>
      <Tag>{config.locale.locale}</Tag>
      <Tag>{config.direction}</Tag>
      <Tag>{config.prefixCls}</Tag>
      <span>{config.locale.emptyText}</span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "局部主题与 token",
    description: "token 只写在 provider 容器上，兄弟区域不会被覆盖。",
    preview: (
      <div className="config-provider-doc-split">
        <ConfigProvider className="config-provider-doc-surface" theme={{ name: "light", tokens: warmTokens }}>
          <Card title="Scoped tokens" description="局部浅色主题">
            <div className="doc-demo-stack">
              <ContextProbe />
              <Button variant="solid">Apply scoped theme</Button>
            </div>
          </Card>
        </ConfigProvider>
        <ConfigProvider className="config-provider-doc-surface" theme="dark">
          <Card title="Dark island" description="不污染页面根节点">
            <div className="doc-demo-stack">
              <ContextProbe />
              <Button variant="solid">Run in dark theme</Button>
            </div>
          </Card>
        </ConfigProvider>
      </div>
    ),
    code: `<ConfigProvider theme={{ name: "light", tokens }}>
  <AppSection />
</ConfigProvider>

<ConfigProvider theme="dark">
  <Inspector />
</ConfigProvider>`,
  },
  {
    title: "密度、语言与方向",
    description: "density、locale、direction 通过 context 进入子树，并同步到局部 data/dir/lang 属性。",
    preview: (
      <ConfigProvider
        className="config-provider-doc-surface config-provider-doc-surface--compact"
        density="compact"
        direction="rtl"
        locale={localeText}
        prefixCls="acme"
      >
        <Card title="פרופיל / Profile" description="RTL + zh-CN locale package">
          <div className="doc-demo-stack">
            <ContextProbe />
            <div className="config-provider-doc-actions">
              <Button>{localeText.cancelText}</Button>
              <Button variant="solid">{localeText.okText}</Button>
            </div>
          </div>
        </Card>
      </ConfigProvider>
    ),
    code: `<ConfigProvider
  density="compact"
  direction="rtl"
  locale={{ locale: "zh-CN", okText: "确认", cancelText: "取消" }}
  prefixCls="acme"
>
  <SettingsPanel />
</ConfigProvider>`,
  },
  {
    title: "SSR 安全默认值",
    description: "默认配置来自纯对象，渲染阶段不读取浏览器全局对象。",
    preview: (
      <ConfigProvider className="config-provider-doc-surface">
        <Card title="Default island" description="Server and client share the same fallback">
          <ContextProbe />
        </Card>
      </ConfigProvider>
    ),
    code: `const config = useConfigProvider();
// default: light / comfortable / en-US / ltr`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "theme",
    value: '"light" | "dark" | { name, tokens }',
    description: "选择内置主题或传入局部 token 覆盖。不会写入 :root 或 document。",
  },
  {
    name: "tokens",
    value: "ConfigProviderTokenOverrides",
    description: "补充覆盖 color、radius、shadow、font、size 等 token 分支；危险 CSS 片段会被过滤。",
  },
  {
    name: "density",
    value: '"comfortable" | "compact" | "spacious"',
    description: "子树密度偏好，根节点同步 data-density，组件可通过 context 或 CSS 选择器消费。",
  },
  {
    name: "locale",
    value: "string | ConfigProviderLocale",
    description: "语言包入口。传字符串时仅覆盖 locale；传对象可覆盖 emptyText/loadingText/okText/cancelText。",
  },
  {
    name: "direction",
    value: '"ltr" | "rtl"',
    description: "文本方向，映射到 provider 容器的 dir 属性，并进入 context。",
  },
  {
    name: "prefixCls",
    value: "string",
    description: "局部类名前缀标识，默认 c；仅接受字母开头的短横线安全字符串，不会修改既有组件类名。",
  },
  {
    name: "children",
    value: "ReactNode",
    description: "被配置影响的局部子树。多个 provider 可嵌套，子级会继承并覆盖父级配置。",
  },
];

const contextRows: DocRow[] = [
  {
    name: "useConfigProvider()",
    value: "ConfigProviderContextValue",
    description: "读取 density、direction、locale、prefixCls、theme、tokens，供基础组件或业务组合消费。",
  },
  {
    name: "defaultConfigProviderContext",
    value: "exported constant",
    description: "SSR 和单测可直接复用默认值，无需挂载 DOM。",
  },
  {
    name: "nesting",
    value: "inherited merge",
    description: "内层 provider 继承外层配置，并按传入 props 做浅层语义覆盖与 token 深合并。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-config-provider",
    description: "局部配置边界；同步 data-theme、data-density、data-prefix-cls、dir、lang 和 CSS 变量。",
  },
  {
    name: "provider",
    value: "React Context",
    description: "上下文只影响 React 子树，不通过事件总线或全局 store 扩散。",
  },
  {
    name: "style",
    value: "CSS variables",
    description: "token 变量写在根 div 的 style 上，便于 SSR 输出稳定 HTML。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "--c-config-color-*",
    value: "color branch",
    description: "canvas、surface、border、text、control、focus 等颜色变量。",
  },
  {
    name: "--c-config-radius-*",
    value: "radius branch",
    description: "xs、sm、md 等圆角变量，供子组件或局部 demo 读取。",
  },
  {
    name: "--c-config-size-*",
    value: "size branch",
    description: "controlHeight、controlHeightSm、pageMaxWidth、gap 等尺寸变量。",
  },
  {
    name: "sanitization",
    value: "deny url/expression/javascript/data",
    description: "字符串 token 禁止高风险 CSS 片段，避免把配置入口变成样式注入通道。",
  },
  {
    name: "prefixCls",
    value: "safe identifier",
    description: "只允许字母开头、数字和短横线组成的 1-32 位标识，非法值继承父级。",
  },
  {
    name: "主题 style",
    value: "theme light | dark + sanitized tokens",
    description: "Provider 将 text、surface、border、controlHover、focusRing、shadow 等 token 写入边界变量，亮/暗主题都不依赖全局硬编码。",
  },
  {
    name: "结构 style",
    value: "provider boundary / CSS vars / nested scope",
    description: "作用域、嵌套继承、prefixCls 校验、size 分支和禁用动画属于结构配置，不改写子组件 DOM。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Direction",
    value: "dir",
    description: "RTL/LTR 使用原生 dir 属性，辅助技术和浏览器排版都能识别。",
  },
  {
    name: "Language",
    value: "lang",
    description: "locale.locale 同步到 lang，帮助读屏和浏览器选择合适语言规则。",
  },
  {
    name: "Focus",
    value: "tokenized focus",
    description: "focus token 可被局部主题覆盖，但需要保持足够对比度。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Scope",
    value: "width: 100%",
    description: "provider 默认块级铺满父容器，不制造横向滚动。",
  },
  {
    name: "Density",
    value: "compact still touchable",
    description: "compact 是密度偏好，不鼓励在粗指针设备上压低按钮触控高度。",
  },
  {
    name: "Nesting",
    value: "local islands",
    description: "移动端抽屉、详情页和弹层可以各自包一层 provider，避免全页重排。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Global leakage",
    value: "none",
    description: "不写 documentElement、body、localStorage 或全局事件监听。",
  },
  {
    name: "prefixCls",
    value: "validated",
    description: "prefixCls 只作为局部 data 属性和附加根类名输出，非法字符串不会进入 DOM。",
  },
  {
    name: "Token values",
    value: "filtered strings",
    description: "拒绝 url()、expression()、javascript:、data:、分号和花括号等高风险片段。",
  },
  {
    name: "HTML",
    value: "no dangerouslySetInnerHTML",
    description: "组件不解析字符串 HTML，children 仍由 React 正常渲染。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "通过",
    description: "主题、密度、语言和方向都可在局部业务域配置，不需要等待 App 包裹组件。",
  },
  {
    name: "UI",
    value: "通过",
    description: "浅色、深色、紧凑、RTL 和移动换行场景均有可视化 specimen。",
  },
  {
    name: "研发",
    value: "通过",
    description: "React context + 容器 CSS 变量，无全局写入；默认值不依赖浏览器环境，SSR 安全。",
  },
  {
    name: "测试",
    value: "通过",
    description: "验收关注嵌套继承、token 局部生效、hash 路由、build、scan 和 smoke。",
  },
  {
    name: "白帽",
    value: "通过",
    description: "配置入口不执行代码、不注入 HTML，并对 token 字符串做基础危险片段过滤。",
  },
];

const faqItems = [
  {
    question: "为什么不和 App 合并？",
    answer: "ConfigProvider 只负责配置上下文。App 未来可以承载消息、通知、弹层容器等应用级能力，两者生命周期不同。",
  },
  {
    question: "现有组件会自动改变主题吗？",
    answer:
      "当前 provider 已提供 context、data 属性和 CSS 变量。组件需要逐步消费这些变量，文档 demo 已验证局部变量不会污染兄弟区域。",
  },
  {
    question: "能不能在页面根部统一包一层？",
    answer: "可以，但推荐仍保留局部覆盖能力，尤其是嵌入式预览、设置面板、RTL 内容块和移动抽屉。",
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

export function ConfigProviderDoc({ showAnchors = false }: ConfigProviderDocProps) {
  return (
    <TutorialScaffold component="ConfigProvider" kind="display" oneLineExample={oneLineExample}>
      <section className="button-doc config-provider-doc" aria-labelledby="config-provider-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="ConfigProvider 文档目录">
              {configProviderDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="config-provider-doc-title">{configProviderDocMeta.title}</h2>
              <p>
                为局部 React 子树提供主题 token、密度、语言、方向和 prefixCls 配置。它不承担 App 级消息或弹层容器职责，也不会把配置写到全局
                DOM。
              </p>
            </header>

            <section className="button-doc-section" id="config-provider-when" aria-labelledby="config-provider-when-title">
              <h3 id="config-provider-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>需要为页面片段、嵌入预览、弹层内容或多语言区域设置局部主题和文案时使用。</li>
                <li>需要在同一页面并存浅色/深色、普通/紧凑、LTR/RTL 或不同前缀命名空间内容块时使用。</li>
                <li>不用于消息队列、通知挂载点或应用壳初始化，这些应保留给独立 App 能力。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="config-provider-demos" aria-labelledby="config-provider-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="config-provider-demos-title">代码演示</h3>
                <p>示例覆盖 token/theme、density、locale、direction、prefixCls、context 和 SSR 默认值。</p>
              </div>
              <div className="button-doc-demo-grid config-provider-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="config-provider-api" aria-labelledby="config-provider-api-title">
              <h3 id="config-provider-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="config-provider-context" aria-labelledby="config-provider-context-title">
              <h3 id="config-provider-context-title">Context</h3>
              <DataTable rows={contextRows} />
            </section>

            <section className="button-doc-section" id="config-provider-semantic" aria-labelledby="config-provider-semantic-title">
              <h3 id="config-provider-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="config-provider-token" aria-labelledby="config-provider-token-title">
              <h3 id="config-provider-token-title">Design Token</h3>
              <DataTable rows={tokenRows} />
            </section>

            <section className="button-doc-section" id="config-provider-a11y" aria-labelledby="config-provider-a11y-title">
              <h3 id="config-provider-a11y-title">可访问性</h3>
              <DataTable rows={accessibilityRows} />
            </section>

            <section className="button-doc-section" id="config-provider-mobile" aria-labelledby="config-provider-mobile-title">
              <h3 id="config-provider-mobile-title">移动端</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="config-provider-security" aria-labelledby="config-provider-security-title">
              <h3 id="config-provider-security-title">安全</h3>
              <DataTable rows={securityRows} />
            </section>

            <section className="button-doc-section" id="config-provider-review" aria-labelledby="config-provider-review-title">
              <div className="button-doc-section__heading">
                <h3 id="config-provider-review-title">专家结论</h3>
                <p>产品、UI、研发、测试、白帽五专家小组专项评审记录。</p>
              </div>
              <DataTable rows={reviewRows} />
            </section>

            <section className="button-doc-section" id="config-provider-gaps" aria-labelledby="config-provider-gaps-title">
              <h3 id="config-provider-gaps-title">缺口</h3>
              <p>
                现阶段只提供配置边界和消费 hook。现有基础组件会逐步改造为读取 provider token；本组件不会替代 App、不会内置远程语言包加载，也不会接管持久化偏好。
              </p>
            </section>

            <section className="button-doc-section" id="config-provider-faq" aria-labelledby="config-provider-faq-title">
              <h3 id="config-provider-faq-title">FAQ</h3>
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
