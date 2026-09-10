import { useState, type ReactNode } from "react";
import { ColorPicker, type ColorPickerSwatch } from "../components/base";
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

export type ColorPickerDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<ColorPicker label="按钮颜色" name="buttonColor" defaultValue="#111110" swatches={brandSwatches} />`;

export const colorPickerDocMeta = {
  title: "ColorPicker 颜色选择器",
  category: "数据录入组件",
  anchors: [
    { id: "color-picker-when", label: "何时使用" },
    { id: "color-picker-demos", label: "代码演示" },
    { id: "color-picker-api", label: "API" },
    { id: "color-picker-validation", label: "校验" },
    { id: "color-picker-semantic", label: "Semantic DOM" },
    { id: "color-picker-a11y", label: "可访问性" },
    { id: "color-picker-mobile", label: "移动端" },
    { id: "color-picker-review", label: "五专家审查" },
    { id: "color-picker-limits", label: "边界" },
  ],
} satisfies ComponentDocMeta;

const brandSwatches: ColorPickerSwatch[] = [
  { label: "Ink", value: "#111110" },
  { label: "Blue", value: "#1677ff" },
  { label: "Green", value: "#1f8a4c" },
  { label: "Amber", value: "#b7791f" },
  { label: "Red", value: "#b42318" },
  { label: "Violet", value: "#6b46c1" },
];

const apiRows: DocRow[] = [
  {
    name: "value / defaultValue",
    value: "string",
    description: "支持受控和非受控模式，接收 #RGB、RGB、#RRGGBB、RRGGBB，输出规范化 #rrggbb。",
  },
  {
    name: "onValueChange",
    value: "(value, info) => void",
    description: "颜色通过 hex 输入、原生颜色选择器或 swatch 改变时触发，info.source 标记来源。",
  },
  {
    name: "swatches",
    value: "ColorPickerSwatch[]",
    description: "可选预设色板，支持字符串或含 label、disabled、value 的对象；无效色值会被过滤。",
  },
  {
    name: "allowAlpha",
    value: "boolean",
    description: "开启简单透明度滑杆。alpha 独立为 0-100 数字，不改变 hex 值本身。",
  },
  {
    name: "alpha / defaultAlpha",
    value: "number",
    description: "透明度受控和非受控值，会被限制在 0 到 100 并取整。",
  },
  {
    name: "label / helpText / errorText",
    value: "ReactNode",
    description: "字段标题、辅助说明和错误说明；错误或 hex 无效时自动设置 aria-invalid。",
  },
  {
    name: "name",
    value: "string",
    description: "渲染隐藏字段参与 FormData。开启 alpha 时额外提交 `${name}Alpha`。",
  },
  {
    name: "disabled / required",
    value: "boolean",
    description: "disabled 禁用所有交互；required 透传给原生 color input。",
  },
];

const validationRows: DocRow[] = [
  {
    name: "hex format",
    value: "#RGB / #RRGGBB",
    description: "只接受 3 位或 6 位十六进制颜色，输入会在有效时同步到原生颜色输入和预览。",
  },
  {
    name: "temporary invalid",
    value: "allowed",
    description: "用户输入过程中可短暂保留无效文本，并立即通过 aria-invalid 与错误文案提示。",
  },
  {
    name: "normalization",
    value: "lowercase output",
    description: "组件回调输出小写 #rrggbb；可见输入框在同步后展示大写，便于人工扫描。",
  },
  {
    name: "unsupported CSS color",
    value: "rejected",
    description: "不接受 rgb()、hsl()、颜色关键字或 CSS 变量，避免安全和解析边界变宽。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=\"group\"]",
    description: "根节点用 label 或 aria-labelledby 作为组名称，帮助文本通过 aria-describedby 关联。",
  },
  {
    name: "native",
    value: "input[type=\"color\"]",
    description: "保留系统颜色选择器、浏览器约束和移动端原生 picker。",
  },
  {
    name: "hex",
    value: "input[type=\"text\"]",
    description: "自定义 hex 输入用于人工粘贴和校验，不复用基础 Input 文档。",
  },
  {
    name: "swatches",
    value: "button[aria-pressed]",
    description: "色板用按钮表达选择动作，当前颜色通过 aria-pressed 标记。",
  },
  {
    name: "alpha",
    value: "input[type=\"range\"]",
    description: "简单透明度沿用原生 range，键盘和触控行为交给浏览器处理。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Name",
    value: "label / aria-label",
    description: "可见 label 作为组名；无可见标题时调用方应传 aria-label。",
  },
  {
    name: "Keyboard",
    value: "native + buttons",
    description: "hex 可键盘输入，色板可 Tab 聚焦并用 Enter/Space 激活，alpha 使用 range 原生键盘。",
  },
  {
    name: "Error",
    value: "aria-invalid",
    description: "错误、errorText 或 hex 无效都会暴露 aria-invalid，错误说明合并到 describedby。",
  },
  {
    name: "Color only",
    value: "labels",
    description: "色板必须通过 label 或规范化值提供可读名称，不只依赖视觉颜色。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Native picker",
    value: "system UI",
    description: "移动端点击预览打开系统颜色选择器，不自绘复杂弹层。",
  },
  {
    name: "Touch target",
    value: ">= 44px",
    description: "窄屏下预览、hex 输入和 alpha 控件保持可触达尺寸，色板按钮保留间距。",
  },
  {
    name: "Layout",
    value: "fluid",
    description: "主控件使用两列网格，窄屏下压缩 hex 输入而不让色板溢出。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "定位为颜色字段，不并入 Input；支持常见表单和设置面板的颜色选择工作流。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "预览、色板、hex 和 alpha 使用中性视觉与固定尺寸，避免布局跳动。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "自有 React 实现，无 antd 系依赖；受控/非受控和值归一化边界明确。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "覆盖 swatches、native color、custom hex validation、alpha、controlled、aria、mobile 验收点。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "只接受 hex，不解析 HTML、CSS 函数、URL 或外部色彩表达式，降低注入和解析风险。",
  },
];

const limitRows: DocRow[] = [
  {
    name: "color spaces",
    value: "暂不支持",
    description: "不提供 HSB/HSL/RGB 面板、渐变、吸管、色域切换或最近使用颜色。",
  },
  {
    name: "popover panel",
    value: "暂不支持",
    description: "当前不做自绘浮层面板，避免定位、焦点陷阱和移动端遮挡复杂度。",
  },
  {
    name: "alpha format",
    value: "独立字段",
    description: "alpha 不编码进 #RRGGBBAA；需要复合格式时由业务层组合。",
  },
];

function ControlledColorPickerDemo() {
  const [color, setColor] = useState("#1677ff");
  const [alpha, setAlpha] = useState(82);

  return (
    <div className="color-picker-doc-controlled">
      <ColorPicker
        allowAlpha
        alpha={alpha}
        helpText="值由 React state 控制，透明度独立同步。"
        label="主题强调色"
        onAlphaChange={setAlpha}
        onValueChange={setColor}
        swatches={brandSwatches}
        value={color}
      />
      <span className="color-picker-doc-output">
        {color} / {alpha}%
      </span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础颜色字段",
    description: "非受控模式适合普通表单，预设色板和原生颜色选择器共享同一个值。",
    preview: (
      <ColorPicker
        defaultValue="#111110"
        helpText="选择品牌色或直接输入 hex。"
        label="按钮颜色"
        name="buttonColor"
        swatches={brandSwatches}
      />
    ),
    code: `<ColorPicker
  name="buttonColor"
  defaultValue="#111110"
  label="按钮颜色"
  helpText="选择品牌色或直接输入 hex。"
  swatches={brandSwatches}
/>`,
  },
  {
    title: "受控与透明度",
    description: "value、alpha、onValueChange 和 onAlphaChange 可组合成设置面板里的受控字段。",
    preview: <ControlledColorPickerDemo />,
    code: `const [color, setColor] = useState("#1677ff");
const [alpha, setAlpha] = useState(82);

<ColorPicker
  allowAlpha
  value={color}
  alpha={alpha}
  onValueChange={setColor}
  onAlphaChange={setAlpha}
  label="主题强调色"
  swatches={brandSwatches}
/>`,
  },
  {
    title: "自定义 hex 校验",
    description: "输入非 hex 内容会保留文本、标记错误，并提示用户修正。",
    preview: (
      <ColorPicker
        defaultValue="#b42318"
        errorText="颜色用于危险动作，请确认可读性。"
        label="危险色"
        swatches={["#b42318", "#7f1d1d", "#f2b8b5"]}
      />
    ),
    code: `<ColorPicker
  defaultValue="#b42318"
  label="危险色"
  errorText="颜色用于危险动作，请确认可读性。"
  swatches={["#b42318", "#7f1d1d", "#f2b8b5"]}
/>`,
  },
  {
    title: "禁用状态",
    description: "disabled 会同时禁用原生颜色输入、hex 输入、色板按钮和 alpha 滑杆。",
    preview: (
      <ColorPicker
        allowAlpha
        defaultAlpha={48}
        defaultValue="#6b46c1"
        disabled
        helpText="由上游主题锁定。"
        label="锁定颜色"
        swatches={brandSwatches}
      />
    ),
    code: `<ColorPicker
  disabled
  allowAlpha
  defaultValue="#6b46c1"
  defaultAlpha={48}
  label="锁定颜色"
  helpText="由上游主题锁定。"
/>`,
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

export function ColorPickerDoc({ showAnchors = false }: ColorPickerDocProps) {
  return (
    <TutorialScaffold component="ColorPicker" kind="data-entry" oneLineExample={oneLineExample}>
      <section className="color-picker-doc" aria-labelledby="color-picker-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="ColorPicker 文档目录">
              {colorPickerDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="color-picker-doc-title">{colorPickerDocMeta.title}</h2>
              <p>
                独立的颜色输入组件，组合原生 <code>{"<input type=\"color\">"}</code>、hex 文本校验、预设色板和可选透明度。
                它不复用 Input 文档，也不依赖 antd 系组件。
              </p>
            </header>

            <section className="button-doc-section" id="color-picker-when" aria-labelledby="color-picker-when-title">
              <h3 id="color-picker-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>需要选择主题色、标签色、图表色或状态色，并希望用户能直接粘贴 hex。</li>
                <li>需要用色板限制推荐颜色，但仍保留系统颜色选择器作为补充入口。</li>
                <li>需要复杂色彩模型、渐变或取色器时，应设计更专门的颜色编辑器。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="color-picker-demos" aria-labelledby="color-picker-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="color-picker-demos-title">代码演示</h3>
                <p>示例覆盖 swatches、native color、custom hex validation、alpha、controlled、aria 和禁用状态。</p>
              </div>
              <div className="button-doc-demo-grid color-picker-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="color-picker-api" aria-labelledby="color-picker-api-title">
              <h3 id="color-picker-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="color-picker-validation" aria-labelledby="color-picker-validation-title">
              <h3 id="color-picker-validation-title">校验</h3>
              <DataTable rows={validationRows} />
            </section>

            <section className="button-doc-section" id="color-picker-semantic" aria-labelledby="color-picker-semantic-title">
              <h3 id="color-picker-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="color-picker-a11y" aria-labelledby="color-picker-a11y-title">
              <h3 id="color-picker-a11y-title">可访问性</h3>
              <DataTable rows={accessibilityRows} />
            </section>

            <section className="button-doc-section" id="color-picker-mobile" aria-labelledby="color-picker-mobile-title">
              <h3 id="color-picker-mobile-title">移动端</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="color-picker-review" aria-labelledby="color-picker-review-title">
              <h3 id="color-picker-review-title">五专家审查</h3>
              <DataTable rows={reviewRows} />
            </section>

            <section className="button-doc-section" id="color-picker-limits" aria-labelledby="color-picker-limits-title">
              <h3 id="color-picker-limits-title">边界</h3>
              <DataTable rows={limitRows} />
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
