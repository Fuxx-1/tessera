import { useState, type ReactNode } from "react";
import { Rate } from "../components/base";
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

export type RateDocProps = {
  showAnchors?: boolean;
};

export const rateDocMeta = {
  title: "Rate 评分",
  category: "数据录入组件",
  anchors: [
    { id: "rate-when", label: "何时使用" },
    { id: "rate-demos", label: "代码演示" },
    { id: "rate-api", label: "API" },
    { id: "rate-semantic", label: "Semantic DOM" },
    { id: "rate-token", label: "Design Token" },
    { id: "rate-a11y", label: "可访问性" },
    { id: "rate-mobile", label: "移动端" },
    { id: "rate-review", label: "五专家审查" },
    { id: "rate-gaps", label: "扩展建议" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Rate allowHalf defaultValue={3.5} label="服务质量" />`;

const demos: Demo[] = [
  {
    title: "基础评分",
    description: "默认使用 radiogroup 语义，适合离散的一到五级偏好选择。",
    preview: <Rate defaultValue={3} helpText="再次点击当前分值或点击 0 可清除。" label="体验评分" />,
    code: `<Rate defaultValue={3} label="体验评分" helpText="再次点击当前分值或点击 0 可清除。" />`,
  },
  {
    title: "受控和半星",
    description: "allowHalf 将步长切到 0.5，value 和 defaultValue 都会被归一化到合法刻度。",
    preview: <ControlledRateDemo />,
    code: `const [value, setValue] = useState(3.5);

<Rate
  allowHalf
  value={value}
  onValueChange={setValue}
  label="服务质量"
  ariaValueText={(nextValue) => \`\${nextValue} 分，共 5 分\`}
/>`,
  },
  {
    title: "数量和不可清除",
    description: "count 可调整等级数量；allowClear=false 适合必须保留至少一个分值的表单。",
    preview: <Rate allowClear={false} count={7} defaultValue={5} helpText="七级评分，不允许回到 0。" label="可信度" />,
    code: `<Rate count={7} allowClear={false} defaultValue={5} label="可信度" />`,
  },
  {
    title: "Slider 语义",
    description: "semantics=\"slider\" 使用单个 input range，触控拖动和连续键盘调整更直接。",
    preview: (
      <Rate
        allowHalf
        defaultValue={2.5}
        helpText="方向键按 0.5 调整，Home/End 由原生 range 处理。"
        label="移动端手势评分"
        semantics="slider"
      />
    ),
    code: `<Rate
  allowHalf
  defaultValue={2.5}
  label="移动端手势评分"
  semantics="slider"
/>`,
  },
  {
    title: "自定义字符和提示",
    description: "character 接收纯文本字符或返回文本的函数；tooltips 写入安全的 title/aria 文案，长文本会被裁剪。",
    preview: (
      <Rate
        allowHalf
        character="心"
        defaultValue={3.5}
        helpText="长提示只进入原生 title，不解析 HTML，也不会撑破 360px 布局。"
        label="情绪温度"
        tooltips={["非常谨慎", "略有顾虑", "可以接受", "很有把握", "值得推荐给团队复用，提示文案会限制长度避免撑破页面"]}
      />
    ),
    code: `<Rate allowHalf character="心" defaultValue={3.5} label="情绪温度" tooltips={["谨慎", "顾虑", "接受", "把握", "推荐"]} />`,
  },
  {
    title: "只读、错误和禁用",
    description: "只读保留当前值与 aria-readonly；错误关联 aria-invalid 与帮助文本；禁用阻止全部输入。",
    preview: (
      <div className="rate-doc-stack">
        <Rate allowHalf readOnly defaultValue={4.5} helpText="审核快照可读取，不允许修改。" label="专家复核" />
        <Rate error defaultValue={1} helpText="评分低于上线阈值，请补充原因。" label="上线信心" />
        <Rate disabled defaultValue={4} helpText="归档记录不可修改。" label="历史评分" />
      </div>
    ),
    code: `<Rate readOnly allowHalf defaultValue={4.5} label="专家复核" helpText="审核快照可读取，不允许修改。" />
<Rate error defaultValue={1} label="上线信心" helpText="评分低于上线阈值。" />
<Rate disabled defaultValue={4} label="历史评分" helpText="归档记录不可修改。" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "value / defaultValue",
    value: "number",
    description: "支持受控和非受控分值。组件会按 count、allowHalf 与 allowClear 归一化；allowClear=false 时最小值为首个可选刻度。",
  },
  {
    name: "onValueChange",
    value: "(value: number) => void",
    description: "点击、清除、键盘或 range 触控调整后触发，回传归一化后的数值。",
  },
  {
    name: "count",
    value: "number",
    description: "评分项数量，默认 5。无效值回落，范围夹紧到 1 到 20，避免极端布局失控。",
  },
  {
    name: "allowHalf",
    value: "boolean",
    description: "允许 0.5 步长。radio 模式会为每个星标拆分左右命中区；slider 模式设置 step=0.5。",
  },
  {
    name: "allowClear",
    value: "boolean",
    description: "默认 true。允许再次选择当前分值或点击清除按钮回到 0；false 时表单可要求必须选择分值。clear 仅保留为兼容别名。",
  },
  {
    name: "readOnly",
    value: "boolean",
    description: "只读状态保留当前分值、label 和 aria-readonly，拦截点击、键盘、触控拖动和清除，不等同于 disabled。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用全部输入与清除按钮，并通过 aria-disabled 表达外层状态。",
  },
  {
    name: "semantics",
    value: "\"radio\" | \"slider\"",
    description: "radio 是默认离散评分语义；slider 使用原生 range，适合触控拖动和连续调整。",
  },
  {
    name: "label / helpText",
    value: "ReactNode",
    description: "label 作为可访问名称来源，helpText 通过 aria-describedby 关联到交互控件。",
  },
  {
    name: "character",
    value: "string | number | (value, index) => string | number",
    description: "替换默认星形为纯文本字符，半星按文本裁切显示。组件只渲染字符串/数字，不解析 HTML。",
  },
  {
    name: "tooltips",
    value: "Array<string | number>",
    description: "为每个评分项补充原生 title 和 radio aria-label 后缀，空值忽略，连续空白折叠并限制长度。",
  },
  {
    name: "showValue / formatValue",
    value: "boolean / (value) => ReactNode",
    description: "控制右侧当前分值展示，可加入单位、文案或业务等级。",
  },
  {
    name: "ariaValueText",
    value: "(value: number) => string",
    description: "为 slider 语义提供带单位的 aria-valuetext；radio 选项内置每个分值的 aria-label。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div",
    description: "外层字段容器承载 label、当前值、评分控件、清除按钮和帮助文本。",
  },
  {
    name: "radio semantics",
    value: "role=\"radiogroup\" + input[type=\"radio\"]",
    description: "默认模式保留互斥选择语义，同组 input 共享 name，浏览器提供 Tab、方向键和表单行为。",
  },
  {
    name: "half radio",
    value: "two radio inputs per item",
    description: "半星时每个评分项包含左半和右半两个 radio 输入，各自有独立 aria-label。",
  },
  {
    name: "slider semantics",
    value: "input[type=\"range\"]",
    description: "slider 模式保留原生 slider role、aria-valuemin、aria-valuemax、aria-valuenow 和触控拖动。",
  },
  {
    name: "clear action",
    value: "button[type=\"button\"]",
    description: "清除是独立按钮，不伪装成评分项；没有值或 disabled 时自动禁用。",
  },
  {
    name: "readonly state",
    value: "aria-readonly",
    description: "只读状态写在 radiogroup 或 range 上，保留可读语义并阻止改值。",
  },
  {
    name: "description",
    value: "aria-describedby",
    description: "helpText 与调用方传入的 aria-describedby 会合并，避免覆盖业务说明。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "icon size",
    value: "22px",
    description: "星标图形保持紧凑；每项实际命中高度为 44px。",
  },
  {
    name: "active / inactive",
    value: "#111110 / #dededb",
    description: "使用中性色表达填充与未填充状态，避免额外引入高饱和主题色。",
  },
  {
    name: "focus",
    value: "#555552",
    description: "键盘焦点使用 2px 中性色轮廓，覆盖 radio、range 和清除按钮。",
  },
  {
    name: "error",
    value: "#9f2424",
    description: "错误状态以外框和帮助文本同步提示，不只依赖颜色命名。",
  },
  {
    name: "touch target",
    value: "44px",
    description: "评分项高度和清除按钮满足 44px 移动端点按目标，半星左右区域各占一半。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard radio",
    value: "native radio",
    description: "Tab 进入评分组，方向键在 radio 间移动；allowClear=true 时清除按钮可单独聚焦。",
  },
  {
    name: "Keyboard slider",
    value: "native range",
    description: "方向键按 step 调整，Home/End/PageUp/PageDown 行为由浏览器提供。",
  },
  {
    name: "Name",
    value: "label / aria-label",
    description: "优先使用可见 label；无可见标签时调用方必须传 aria-label。",
  },
  {
    name: "Value",
    value: "aria-label / aria-valuetext",
    description: "radio 模式每个输入有分值标签，可合并 tooltips 文案；slider 模式可用 ariaValueText 加入单位或业务描述。",
  },
  {
    name: "Readonly / Disabled",
    value: "aria-readonly / disabled",
    description: "只读保留可读语义并拦截修改；禁用使用真实 disabled，字段容器同步 aria-disabled，避免误触。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Tap",
    value: "44px target",
    description: "每个评分项保持 44px 高命中区，清除按钮为 44px 方形目标，半星时左右各一半，360px、390px、430px 视口均无页面级 overflow。",
  },
  {
    name: "Drag",
    value: "semantics=\"slider\"",
    description: "需要拖动连续调整时使用 slider 语义，控件仍是独立 Rate，不复用 Slider 文档或 API。",
  },
  {
    name: "Layout",
    value: "fit-content",
    description: "默认按评分数量收缩，帮助文本和当前值会在窄容器中保持可读。",
  },
  {
    name: "Gesture",
    value: "touch-action: manipulation",
    description: "优化点按响应，不额外劫持页面滚动手势。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "覆盖 value/defaultValue/count/allowHalf/allowClear/readOnly/disabled，适配必填评分、可清空评分和移动端拖动场景。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "星标、自定义字符、hover、焦点、数值胶囊、清除按钮、错误和禁用状态使用现有中性色系统，移动端半星/整星可点。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "组件为自有实现，不依赖 antd 系；radio 与 range 两条语义路径分离，非有限 count/value 会夹紧归一化，未和 Slider 合并文档。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "可按 radiogroup、radio、slider、button、aria-invalid、disabled、aria-describedby、desktop 与 mobile 360/390/430 做 smoke 定位。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "不渲染 HTML 字符串，不执行外部脚本；character/tooltips 只作为文本、title 与 aria-label 使用，长提示会收敛长度。",
  },
];

const gapRows: DocRow[] = [
  {
    name: "custom icon",
    value: "文本字符已支持",
    description: "支持 string/number/function 形式的文本字符；复杂 ReactNode 图标插槽暂不开放，避免尺寸、焦点和半星裁切失控。",
  },
  {
    name: "character labels",
    value: "已支持",
    description: "例如笑脸、等级文字和逐项 tooltip 可直接传入 character/tooltips，组件会按纯文本处理。",
  },
  {
    name: "RTL half fill",
    value: "待补充",
    description: "当前半星按左到右填充。若接入 RTL，需要明确半星方向、键盘方向和视觉预期。",
  },
];

function ControlledRateDemo() {
  const [value, setValue] = useState(3.5);

  return (
    <Rate
      allowHalf
      ariaValueText={(nextValue) => `${nextValue} 分，共 5 分`}
      formatValue={(nextValue) => `${nextValue.toFixed(1)} 分`}
      helpText="半星步长，当前值由宿主状态控制。"
      label="服务质量"
      onValueChange={setValue}
      value={value}
    />
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

export function RateDoc({ showAnchors = false }: RateDocProps) {
  return (
    <TutorialScaffold component="Rate" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="button-doc rate-doc" aria-labelledby="rate-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Rate 文档目录">
            {rateDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="rate-doc-title">{rateDocMeta.title}</h2>
            <p>
              用离散等级表达满意度、偏好或质量评分。当前生产实现是独立 Rate 组件，覆盖 radio 与 slider
              两种语义、半星、清除、禁用、移动端触控和受控模型，不与 Slider 合并文档。
            </p>
          </header>

          <section className="button-doc-section" id="rate-when" aria-labelledby="rate-when-title">
            <h3 id="rate-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于轻量评分、满意度、质量等级和偏好强弱表达。</li>
              <li>默认 radio 语义适合明确的一组离散选项；需要拖动调整时切换到 slider 语义。</li>
              <li>需要输入精确数值、范围值或复杂刻度时，优先使用 InputNumber 或 Slider。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="rate-demos" aria-labelledby="rate-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="rate-demos-title">代码演示</h3>
              <p>示例覆盖非受控、受控、半星、数量、清除、slider 语义、错误和禁用状态。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="rate-api" aria-labelledby="rate-api-title">
            <h3 id="rate-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="rate-semantic" aria-labelledby="rate-semantic-title">
            <h3 id="rate-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="rate-token" aria-labelledby="rate-token-title">
            <h3 id="rate-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="rate-a11y" aria-labelledby="rate-a11y-title">
            <h3 id="rate-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="rate-mobile" aria-labelledby="rate-mobile-title">
            <h3 id="rate-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="rate-review" aria-labelledby="rate-review-title">
            <h3 id="rate-review-title">五专家审查</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="rate-gaps" aria-labelledby="rate-gaps-title">
            <div className="button-doc-section__heading">
              <h3 id="rate-gaps-title">扩展建议</h3>
              <p>以下能力未进入当前 Rate API，不能在业务中当作已支持能力使用。</p>
            </div>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
