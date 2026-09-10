import { useState, type ReactNode } from "react";
import { AutoComplete, type AutoCompleteOption } from "../components/base/AutoComplete";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type AutoCompleteDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<AutoComplete label="Action" placeholder="Search action" options={commandOptions} mobileOverlay />`;

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

export const autoCompleteDocMeta = {
  title: "AutoComplete 自动完成",
  category: "数据录入",
  anchors: [
    { id: "auto-complete-when", label: "何时使用" },
    { id: "auto-complete-demos", label: "代码演示" },
    { id: "auto-complete-api", label: "API" },
    { id: "auto-complete-semantic", label: "Semantic DOM" },
    { id: "auto-complete-a11y", label: "可访问性" },
    { id: "auto-complete-mobile", label: "移动端" },
    { id: "auto-complete-security", label: "安全" },
    { id: "auto-complete-limits", label: "边界" },
  ],
} satisfies ComponentDocMeta;

const commandOptions: AutoCompleteOption[] = [
  {
    description: "Shortcut and command search",
    label: "Open command palette",
    searchText: "command palette shortcut",
    value: "open-command-palette",
  },
  {
    description: "Browse registered components",
    label: "Open component registry",
    searchText: "registry overview components",
    value: "open-registry",
  },
  { description: "Copy package entry", label: "Copy import path", searchText: "copy import path", value: "copy-import" },
  { description: "Disabled action", disabled: true, label: "Archive deprecated draft", searchText: "archive deprecated", value: "archive-draft" },
];

const ownerOptions: AutoCompleteOption[] = [
  { label: "Design System", searchText: "design system team", value: "design-system" },
  { label: "Component Platform", searchText: "component platform team", value: "component-platform" },
  { label: "Growth Tools", searchText: "growth tools team", value: "growth-tools" },
];

const safeLabelOptions: AutoCompleteOption[] = [
  {
    description: "<script>alert(1)</script>",
    label: "<img src=x onerror=alert(1)>",
    searchText: "literal img tag",
    value: "literal-tag",
  },
  {
    description: "Uses explicit searchText",
    label: (
      <span className="auto-complete-doc-option">
        <strong>Rich label</strong>
        <span>ReactNode display</span>
      </span>
    ),
    searchText: "rich label react node",
    value: "rich-label",
  },
];

const largeOptions: AutoCompleteOption[] = Array.from({ length: 240 }, (_, index) => ({
  description: `Budgeted option ${index + 1}`,
  label: `Command ${String(index + 1).padStart(3, "0")}`,
  searchText: `command-${index + 1}`,
  value: `command-${index + 1}`,
}));

const apiRows: DocRow[] = [
  {
    name: "options",
    value: "AutoCompleteOption[]",
    description: "候选项。value 写入输入框和提交，label 安全展示，description 安全展示补充说明，searchText 只参与过滤。",
  },
  {
    name: "value / defaultValue",
    value: "string",
    description: "输入框文本的受控或非受控值。允许自由输入，不要求必须命中候选项。",
  },
  {
    name: "onValueChange",
    value: "(value: string) => void",
    description: "用户输入或选择候选项后触发。受控模式下由调用方回写 value。",
  },
  {
    name: "open / defaultOpen",
    value: "boolean",
    description: "控制候选层展开状态。disabled 时组件不会渲染可交互候选层。",
  },
  {
    name: "onOpenChange",
    value: "(open: boolean) => void",
    description: "焦点、输入、方向键、选择、Escape 或外部点击导致展开状态变化时触发。",
  },
  {
    name: "onSelect",
    value: "(value, option) => void",
    description: "仅在点击候选项或 Enter 选择当前候选项时触发。",
  },
  {
    name: "filterOption",
    value: "boolean | function",
    description: "默认按 searchText、原始字符串 label 或 value 做大小写不敏感过滤；false 展示所有候选。",
  },
  {
    name: "loading / loadingText",
    value: "boolean / ReactNode",
    description: "展示候选层内部加载状态，不使用全屏 loading。",
  },
  {
    name: "maxFilterOptions",
    value: "number",
    description: "默认最多扫描前 1000 个候选项，避免超大 options 在每次输入时拖慢主线程。",
  },
  {
    name: "maxVisibleOptions",
    value: "number",
    description: "默认最多渲染 80 个候选项；更多结果应配合异步查询、分页或虚拟列表组件。",
  },
  {
    name: "emptyText",
    value: "ReactNode",
    description: "无匹配结果时展示的安全文本节点或 ReactNode。",
  },
  {
    name: "mobileOverlay",
    value: "boolean",
    description: "窄屏下把候选层提升为底部 overlay，减少虚拟键盘和页面滚动冲突。",
  },
  {
    name: "InputHTMLAttributes",
    value: "原生 input 属性",
    description: "透传 name、required、disabled、readOnly、inputMode、form、aria-* 等原生属性。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-autocomplete-field",
    description: "字段容器承载 label、control、候选层和帮助文本；候选层不是 label 子树。",
  },
  {
    name: "label",
    value: "label.c-field__label",
    description: "可见标签通过 htmlFor 关联真实 input。",
  },
  {
    name: "input",
    value: 'input[role="combobox"]',
    description: "真实编辑节点，使用 aria-autocomplete、aria-expanded、aria-controls 和 aria-activedescendant 描述候选层。",
  },
  {
    name: "listbox",
    value: 'div[role="listbox"]',
    description: "候选列表只包含可选 option；loading 和 empty 使用 status，不伪装成 option。",
  },
  {
    name: "option",
    value: 'div[role="option"]',
    description: "候选项可点击、可禁用，active 项通过 aria-selected 暴露。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "ArrowUp / ArrowDown / Enter / Escape",
    description: "方向键在可用项间移动；Enter 选择 active 项；Escape 关闭候选层；Tab 正常离开字段。",
  },
  {
    name: "IME",
    value: "composition safe",
    description: "中文等输入法组合期间，Enter 不会误触发候选选择。",
  },
  {
    name: "Description",
    value: "aria-describedby",
    description: "外部描述与 helpText/errorText 合并，不覆盖调用方语义。",
  },
  {
    name: "Disabled options",
    value: "keyboard skip",
    description: "禁用项可见但不会成为 active 项，也不能被 Enter 或点击选择。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px",
    description: "窄屏输入框和候选项增大触控面积。",
  },
  {
    name: "Overlay",
    value: "bottom sheet",
    description: "mobileOverlay 开启时，窄屏候选层以底部面板显示并限制高度。",
  },
  {
    name: "Font size",
    value: "16px",
    description: "移动端输入字号提升到 16px，降低 iOS 聚焦自动缩放风险。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "label",
    value: "ReactNode",
    description: "候选 label 使用 React 节点渲染，不解析 HTML 字符串。",
  },
  {
    name: "filter text",
    value: "searchText / primitive label / value",
    description: "复杂 ReactNode 不会被 stringify；需要搜索时显式提供 searchText。",
  },
  {
    name: "HTML injection",
    value: "not supported",
    description: "组件内部没有 HTML 字符串注入 API，也不会把用户输入拼成 HTML。",
  },
];

const limitRows: DocRow[] = [
  {
    name: "Multiple",
    value: "不支持",
    description: "多选、标签输入和 token 化编辑应作为独立组件设计。",
  },
  {
    name: "Render budget",
    value: "内置",
    description: "内置过滤和渲染预算保护；真正的大数据量建议使用远程查询、分页或专门的虚拟列表变体。",
  },
  {
    name: "Select replacement",
    value: "不是",
    description: "AutoComplete 允许自由输入；确定从有限集合中选择时仍使用 Select 或后续 Combobox 变体。",
  },
];

function ControlledValueDemo() {
  const [value, setValue] = useState("open");

  return (
    <div className="doc-demo-stack">
      <AutoComplete
        helpText="输入值由 React state 控制，仍然可以自由输入。"
        label="Command"
        onValueChange={setValue}
        options={commandOptions}
        value={value}
      />
      <output className="auto-complete-doc__output">Current value: {value || "empty"}</output>
    </div>
  );
}

function ControlledOpenDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="doc-demo-stack">
      <div className="doc-demo-row">
        <button className="c-button c-button--soft c-button--sm" type="button" onClick={() => setOpen((next) => !next)}>
          {open ? "Close suggestions" : "Open suggestions"}
        </button>
        <span className="auto-complete-doc__state">open: {String(open)}</span>
      </div>
      <AutoComplete
        defaultValue="design"
        label="Owner"
        onOpenChange={setOpen}
        open={open}
        options={ownerOptions}
        placeholder="Search owner"
      />
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础补全",
    description: "options 渲染候选项，输入时按 searchText、字符串 label 或 value 过滤。",
    preview: (
      <AutoComplete
        helpText="试试输入 copy 或 registry。"
        label="Action"
        options={commandOptions}
        placeholder="Search action"
      />
    ),
    code: `<AutoComplete label="Action" placeholder="Search action" helpText="试试输入 copy 或 registry。" options={commandOptions} />`,
  },
  {
    title: "受控 value",
    description: "value/onValueChange 控制输入框文本，不要求值一定来自候选项。",
    preview: <ControlledValueDemo />,
    code: `const [value, setValue] = useState("open"); <AutoComplete label="Command" value={value} onValueChange={setValue} options={commandOptions} />`,
  },
  {
    title: "受控 open",
    description: "open/onOpenChange 允许外部控制候选层展开，同时保留输入、选择和 Escape 的回调。",
    preview: <ControlledOpenDemo />,
    code: `const [open, setOpen] = useState(false); <AutoComplete label="Owner" open={open} onOpenChange={setOpen} options={ownerOptions} />`,
  },
  {
    title: "自定义过滤和空态",
    description: "filterOption 可以替换默认匹配逻辑；无结果时展示 emptyText。",
    preview: (
      <AutoComplete
        defaultOpen
        defaultValue="zzz"
        emptyText="No owner matched this query."
        filterOption={(input, option) => option.value.startsWith(input.trim().toLocaleLowerCase())}
        label="Prefix match"
        options={ownerOptions}
        placeholder="Try design"
      />
    ),
    code: `<AutoComplete label="Prefix match" emptyText="No owner matched this query." filterOption={(input, option) => option.value.startsWith(input.trim().toLocaleLowerCase())} options={ownerOptions} />`,
  },
  {
    title: "禁用输入",
    description: "disabled 会保留字段语义和说明文本，但不会打开候选层或接受选择。",
    preview: (
      <AutoComplete
        disabled
        helpText="Disabled fields keep their label and help text readable."
        label="Locked owner"
        options={ownerOptions}
        placeholder="Unavailable"
      />
    ),
    code: `<AutoComplete disabled label="Locked owner" options={ownerOptions} />`,
  },
  {
    title: "安全 label 与移动 overlay",
    description: "HTML 字符串按文本显示；复杂 ReactNode 用 searchText 参与过滤，窄屏使用底部候选面板。",
    preview: (
      <AutoComplete
        defaultOpen
        helpText="字符串不会被当作 HTML 执行。"
        label="Safe option"
        mobileOverlay
        options={safeLabelOptions}
        placeholder="Search safe labels"
      />
    ),
    code: `<AutoComplete label="Safe option" mobileOverlay defaultOpen options={[{ label: "<img src=x onerror=alert(1)>", description: "<script>alert(1)</script>", searchText: "literal img tag", value: "literal-tag" }, { label: <RichLabel />, description: "Uses explicit searchText", searchText: "rich label react node", value: "rich-label" }]} />`,
  },
  {
    title: "超量候选预算",
    description: "maxFilterOptions 限制过滤扫描量，maxVisibleOptions 限制候选层渲染量，避免超大 options 拖慢输入。",
    preview: (
      <AutoComplete
        defaultOpen
        label="Large command set"
        maxFilterOptions={120}
        maxVisibleOptions={12}
        options={largeOptions}
        placeholder="Search command"
      />
    ),
    code: `<AutoComplete label="Large command set" maxFilterOptions={120} maxVisibleOptions={12} options={largeOptions} />`,
  },
  {
    title: "Loading",
    description: "异步查询时在候选层内部展示 loading，不遮挡整页。",
    preview: (
      <div className="doc-demo-stack">
        <AutoComplete label="Remote issue" loading loadingText="Fetching matching issues" options={[]} placeholder="Search issue" />
        <div className="c-autocomplete__status" role="status" aria-live="polite">
          <span className="c-autocomplete__spinner" aria-hidden="true" />
          <span>Fetching matching issues</span>
        </div>
      </div>
    ),
    code: `<AutoComplete label="Remote issue" loading loadingText="Fetching matching issues" options={[]} />`,
  },
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

export function AutoCompleteDoc({ showAnchors = false }: AutoCompleteDocProps) {
  return (
    <TutorialScaffold component="AutoComplete" kind="data-entry" oneLineExample={oneLineExample} overlay>
      <section className="button-doc auto-complete-doc" aria-labelledby="auto-complete-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="AutoComplete 文档目录">
              {autoCompleteDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="auto-complete-doc-title">{autoCompleteDocMeta.title}</h2>
              <p>
                用于在文本输入过程中提供候选补全。AutoComplete 是独立的可编辑 combobox，不复用 Select
                的原生选择器语义，也不把文档合并进 Input。
                五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认候选过滤、移动 overlay、键盘导航和安全 label 渲染。
              </p>
            </header>

            <section className="button-doc-section" id="auto-complete-when" aria-labelledby="auto-complete-when-title">
              <h3 id="auto-complete-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>用户需要输入文本，同时系统可以给出命令、人员、标签、地址等候选项。</li>
                <li>用户可以继续自由输入，候选项只是补全和提速，而不是强制集合约束。</li>
                <li>如果只能从有限集合中选一个值，优先使用 Select；如果需要多选标签，应设计独立组件。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="auto-complete-demos" aria-labelledby="auto-complete-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="auto-complete-demos-title">代码演示</h3>
                <p>示例覆盖 options、filter、受控 value、受控 open、键盘 combobox、empty、loading、移动 overlay 和安全 label。</p>
              </div>
              <div className="button-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="auto-complete-api" aria-labelledby="auto-complete-api-title">
              <h3 id="auto-complete-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="auto-complete-semantic" aria-labelledby="auto-complete-semantic-title">
              <h3 id="auto-complete-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="auto-complete-a11y" aria-labelledby="auto-complete-a11y-title">
              <h3 id="auto-complete-a11y-title">可访问性</h3>
              <DataTable rows={accessibilityRows} />
            </section>

            <section className="button-doc-section" id="auto-complete-mobile" aria-labelledby="auto-complete-mobile-title">
              <h3 id="auto-complete-mobile-title">移动端</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="auto-complete-security" aria-labelledby="auto-complete-security-title">
              <h3 id="auto-complete-security-title">安全</h3>
              <DataTable rows={securityRows} />
            </section>

            <section className="button-doc-section" id="auto-complete-limits" aria-labelledby="auto-complete-limits-title">
              <h3 id="auto-complete-limits-title">边界</h3>
              <DataTable rows={limitRows} />
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
