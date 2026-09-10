import { useEffect, useState, type ReactNode } from "react";
import { Mentions, type MentionOption } from "../components/base";
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

export type MentionsDocProps = {
  showAnchors?: boolean;
};

export const mentionsDocMeta = {
  title: "Mentions 提及",
  category: "基础组件",
  anchors: [
    { id: "mentions-when", label: "何时使用" },
    { id: "mentions-demos", label: "代码演示" },
    { id: "mentions-api", label: "API" },
    { id: "mentions-semantic", label: "Semantic DOM" },
    { id: "mentions-token", label: "Design Token" },
    { id: "mentions-review", label: "生产复核" },
    { id: "mentions-a11y", label: "Accessibility" },
    { id: "mentions-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Mentions label="Review note" defaultValue="Please review this with @" options={peopleOptions} />`;

const peopleOptions: MentionOption[] = [
  { avatar: "AL", label: "Ada Lovelace", value: "ada", description: "Algorithm notes" },
  { avatar: "GH", label: "Grace Hopper", value: "grace", description: "Compiler review" },
  { avatar: "KJ", label: "Katherine Johnson", value: "katherine", description: "Trajectory check" },
  { avatar: "RB", disabled: true, label: "Readonly Bot", value: "readonly-bot", description: "Cannot be assigned" },
];

const unsafeOptions: MentionOption[] = [
  { label: "Raw @operator", value: "@operator", description: "Leading trigger is removed" },
  { label: "Line break payload", value: "release\nowner", description: "Control chars are stripped" },
  { label: "Whitespace payload", value: "Design Systems", description: "Whitespace becomes dashes" },
  {
    label: "Very long owner name that must wrap inside the suggestion popup without widening the page",
    value: "Platform Reliability Council North America Escalation Rotation",
    description: "Long labels and values stay inside the popup",
  },
  {
    label: "XSS text <img src=x onerror=alert(1)>",
    value: "<img src=x onerror=alert(1)>",
    description: "HTML-like payload is rendered and inserted as inert text",
  },
];

const channelOptions: MentionOption[] = [
  { label: "Release Train", value: "release-train", description: "Channel trigger smoke" },
  { label: "Design Review", value: "design-review", description: "Two-keyword filter target" },
  { label: "QA Desk", value: "qa-desk", description: "Test intake" },
  { disabled: true, label: "Locked Incident Room", value: "locked-room", description: "Disabled options stay inert" },
];

function AsyncMentionsDemo() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MentionOption[]>(peopleOptions);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => {
      setOptions(
        peopleOptions.filter((option) => {
          const target = `${option.value} ${typeof option.label === "string" ? option.label : ""}`.toLocaleLowerCase();
          return target.includes(query.toLocaleLowerCase());
        }),
      );
      setLoading(false);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <Mentions
      defaultValue="Assign follow-up to @"
      helpText="输入 @ 后模拟远端查询。"
      label="Async assignee"
      loading={loading}
      name="asyncMentionsDoc"
      onSearch={(nextQuery) => setQuery(nextQuery)}
      options={options}
      placeholder="Type @ to search"
    />
  );
}

function ControlledMentionsDemo() {
  const [value, setValue] = useState("Notify @");

  return (
    <div className="mentions-doc-controlled">
      <Mentions
        helpText="选择项 value 会先净化，再以纯文本插入。"
        label="Sanitized insert"
        name="sanitizedMentionsDoc"
        onValueChange={setValue}
        options={unsafeOptions}
        value={value}
      />
      <span className="mentions-doc-controlled__value">value: {value}</span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础提及",
    description: "textarea 中输入 @ 后展示建议，方向键移动，Enter 或 Tab 插入当前项。",
    preview: (
      <Mentions
        defaultValue="Please review this with @"
        helpText="支持鼠标和键盘选择；Escape 关闭建议。"
        label="Review note"
        name="basicMentionsDoc"
        options={peopleOptions}
        placeholder="Type @ to mention"
      />
    ),
    code: `<Mentions label="Review note" defaultValue="Please review this with @" options={peopleOptions} helpText="支持鼠标和键盘选择；Escape 关闭建议。" />`,
  },
  {
    title: "异步与 loading",
    description: "onSearch 负责触发远端查询；loading 状态用 role=status 对屏幕阅读器播报。",
    preview: <AsyncMentionsDemo />,
    code: `<Mentions label="Async assignee" loading={loading} options={options} onSearch={(query) => fetchOptions(query)} />`,
  },
  {
    title: "插入值净化",
    description: "组件只插入纯文本 value，移除控制字符、重复触发符、HTML 符号，并压缩空白。",
    preview: <ControlledMentionsDemo />,
    code: `<Mentions label="Sanitized insert" value={value} onValueChange={setValue} options={[{ label: "Raw @operator", value: "@operator" }, { label: "Line break payload", value: "release\\nowner" }, { label: "XSS text <img src=x onerror=alert(1)>", value: "<img src=x onerror=alert(1)>" }]} />`,
  },
  {
    title: "多触发符与多关键词",
    description: "prefix 可配置多个触发符；输入 #design.review 同时匹配多个关键词，disabled 项展示但不可插入。",
    preview: (
      <Mentions
        defaultValue="Discuss in #design.review"
        helpText="支持 @ 和 #；disabled 候选无法通过鼠标或键盘插入。"
        label="Channel mention"
        name="channelMentionsDoc"
        options={channelOptions}
        placeholder="Type @ or #"
        prefix={["@", "#"]}
      />
    ),
    code: `<Mentions label="Channel mention" defaultValue="Discuss in #design.review" prefix={["@","#"]} options={channelOptions} />`,
  },
  {
    title: "组件禁用",
    description: "disabled 阻止输入、搜索、弹层打开和候选插入，仍保留 label 与 helpText 的字段语义。",
    preview: (
      <Mentions
        defaultValue="Locked note for @ada"
        disabled
        helpText="禁用态不响应触发符。"
        label="Disabled mention"
        name="disabledMentionsDoc"
        options={peopleOptions}
      />
    ),
    code: `<Mentions label="Disabled mention" defaultValue="Locked note for @ada" disabled options={peopleOptions} />`,
  },
  {
    title: "移动端触达",
    description: "窄屏保持 16px 字号、44px 建议项和视口内弹层宽度，减少聚焦放大与横向溢出。",
    preview: (
      <div className="mentions-doc-mobile-frame">
        <Mentions
          defaultValue="@"
          helpText="弹层在移动宽度内滚动。"
          label="Mobile mention"
          name="mobileMentionsDoc"
          options={peopleOptions}
          placeholder="Type @"
        />
      </div>
    ),
    code: `<Mentions label="Mobile mention" defaultValue="@" options={peopleOptions} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "options", value: "MentionOption[]", description: "建议项。avatar/label 用于显示，value 用于插入；disabled 项可展示但不可选。" },
  { name: "value / defaultValue", value: "string", description: "受控或非受控文本值。" },
  { name: "onValueChange", value: "(value) => void", description: "文本变化和插入提及时触发。" },
  { name: "onSearch", value: "(query, trigger) => void", description: "光标位于触发片段内时触发，可用于异步拉取建议。" },
  { name: "onSelect", value: "(option, info) => void", description: "建议被插入后触发，info 包含 query 与 trigger。" },
  { name: "loading / loadingText", value: "boolean / ReactNode", description: "展示异步加载态，并通过 role=status 播报。" },
  { name: "emptyText", value: "ReactNode", description: "无匹配项时展示的空态文案。" },
  { name: "maxOptions", value: "number = 60", description: "本地过滤和渲染预算上限；超大候选集应配合 onSearch 远端分页。" },
  { name: "prefix", value: "string | string[] = @", description: "触发符。支持 @、# 等单个或多个触发符，onSearch/onSelect 会返回实际命中的 trigger。" },
  { name: "split", value: "string = space", description: "插入提及后追加的分隔文本。" },
  { name: "placement", value: "bottom | top", description: "建议弹层相对 textarea 的位置。" },
  { name: "label / helpText / errorText", value: "ReactNode", description: "字段标签、说明和错误文案，自动建立 aria 关系。" },
  { name: "textarea props", value: "TextareaHTMLAttributes", description: "透传 placeholder、disabled、required、rows、resize 等原生 textarea 属性。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-field.c-mentions-field", description: "字段容器，包含可见 label、textarea、弹层和帮助文本。" },
  { name: "label", value: "label.c-field__label", description: "通过 htmlFor 关联真实 textarea。" },
  { name: "control", value: "textarea.c-mentions__textarea", description: "真实多行文本输入，保留选择、复制、表单提交与移动输入法行为。" },
  { name: "popup", value: ".c-mentions__popup", description: "建议弹层，随触发片段展示或关闭。" },
  { name: "listbox", value: "[role=listbox]", description: "建议集合，通过 aria-activedescendant 与 textarea 当前项关联。" },
  { name: "option", value: "[role=option]", description: "可点击建议项，aria-selected 标记键盘当前项。" },
];

const tokenRows: DocRow[] = [
  { name: "field border", value: "#dededb / #c8c8c3 / #b42318", description: "默认、hover 和错误态边框。" },
  { name: "popup surface", value: "#ffffff", description: "建议弹层表面，配合细边框和轻阴影。" },
  { name: "active option", value: "#f0f0ee", description: "键盘当前项背景，保持中性色体系。" },
  { name: "radius", value: "6px / 8px", description: "textarea 使用 6px，弹层使用 8px。" },
  { name: "mobile target", value: "44px", description: "移动端建议项最小高度。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "独立 Mentions 文档覆盖评论、审批、任务说明和业务对象提及，不与 Select/AutoComplete 文档合并。" },
  { name: "UI 专家", value: "PASS", description: "textarea、弹层、loading、empty、disabled、长候选和移动端 360/390/430 宽度均保持可读且无横向溢出。" },
  { name: "研发专家", value: "PASS", description: "组件使用原生 textarea、React 文本渲染、prefix 数组、多关键词过滤、受控/非受控、实际 trigger 回传和 maxOptions 预算保护。" },
  { name: "测试专家", value: "PASS", description: "专项 smoke 覆盖触发符、多关键词、键盘选择、disabled、长候选、XSS 文本安全、build 和依赖 scan。" },
  { name: "白帽专家", value: "PASS", description: "option label/description/avatar 文本由 React 转义，插入 value 先经 sanitizeMentionValue 净化，HTML-like payload 不生成 img/script 节点。" },
];

const faqItems = [
  {
    question: "为什么 Mentions 是独立组件，而不是 Textarea 的一个 demo？",
    answer: "提及包含触发解析、建议列表、键盘选择、异步状态和插入净化，行为复杂度已经超过普通多行输入，应独立维护文档和验收。",
  },
  {
    question: "插入 label 还是 value？",
    answer: "插入 value。label 可包含更丰富的展示信息，value 必须是业务可提交的短标识，并会在插入前净化为纯文本。",
  },
  {
    question: "支持多个触发符吗？",
    answer: "支持。prefix 可以传字符串数组，例如 [\"@\", \"#\"]；组件会按光标前最近的触发符打开建议并回传实际 trigger。",
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview button-doc-demo__preview--field">{preview}</div>
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

export function MentionsDoc({ showAnchors = false }: MentionsDocProps) {
  return (
    <TutorialScaffold component="Mentions" kind="data-entry" oneLineExample={oneLineExample} overlay>
    <section className="button-doc mentions-doc" aria-labelledby="mentions-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Mentions 文档目录">
            {mentionsDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="mentions-doc-title">{mentionsDocMeta.title}</h2>
            <p>
              在多行文本中通过 <code>@</code> 触发建议列表，插入人员、机器人或业务对象提及。Mentions 以原生 textarea
              为输入核心，单独处理建议弹层、键盘导航、异步加载和插入值净化。
            </p>
          </header>

          <section className="button-doc-section" id="mentions-when" aria-labelledby="mentions-when-title">
            <h3 id="mentions-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>评论、备注、审批意见或任务说明中需要提及人员、团队、机器人或对象时使用。</li>
              <li>只需要普通多行文本时使用 Textarea；只需要单行搜索建议时使用 AutoComplete 或后续对应组件。</li>
              <li>建议项来自远端服务时，通过 onSearch 和 loading 显式表达异步状态。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mentions-demos" aria-labelledby="mentions-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="mentions-demos-title">代码演示</h3>
              <p>示例覆盖 @ 触发、键盘插入、异步 loading、插入值净化和移动端布局。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="mentions-api" aria-labelledby="mentions-api-title">
            <h3 id="mentions-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="mentions-semantic" aria-labelledby="mentions-semantic-title">
            <h3 id="mentions-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="mentions-token" aria-labelledby="mentions-token-title">
            <h3 id="mentions-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="mentions-review" aria-labelledby="mentions-review-title">
            <h3 id="mentions-review-title">生产复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="mentions-a11y" aria-labelledby="mentions-a11y-title">
            <h3 id="mentions-a11y-title">Accessibility</h3>
            <ul className="button-doc-list">
              <li>有 label 时使用 htmlFor 关联 textarea；无可见 label 时调用方必须提供 aria-label 或 aria-labelledby。</li>
              <li>textarea 暴露 aria-autocomplete、aria-expanded、aria-controls 和 aria-activedescendant。</li>
              <li>方向键移动建议项，Enter 或 Tab 插入，Escape 关闭建议列表。</li>
              <li>loading 使用 role=status；错误态使用 aria-invalid，并将 errorText 合并进 aria-describedby。</li>
              <li>maxOptions 默认限制本地候选过滤和渲染数量；超大人员库应通过 onSearch 做远端分页。</li>
              <li>移动端字号提升到 16px，建议项保持 44px 触控高度，弹层宽度限制在视口内。</li>
              <li>插入值通过 sanitizeMentionValue 处理为纯文本；label 和 description 由 React 渲染，不接受原始 HTML 字符串注入。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="mentions-faq" aria-labelledby="mentions-faq-title">
            <h3 id="mentions-faq-title">FAQ</h3>
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
