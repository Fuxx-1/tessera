import { useState, type ReactNode } from "react";
import { Slider, type SliderRangeValue } from "../components/base";
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

export type SliderDocProps = {
  showAnchors?: boolean;
};

export const sliderDocMeta = {
  title: "Slider 滑动输入条",
  category: "数据录入组件",
  anchors: [
    { id: "slider-when", label: "何时使用" },
    { id: "slider-demos", label: "代码演示" },
    { id: "slider-api", label: "API" },
    { id: "slider-semantic", label: "Semantic DOM" },
    { id: "slider-token", label: "Design Token" },
    { id: "slider-a11y", label: "可访问性" },
    { id: "slider-mobile", label: "移动端" },
    { id: "slider-review", label: "生产复核" },
    { id: "slider-gaps", label: "扩展建议" },
  ],
} satisfies ComponentDocMeta;

const oneLineExample = `<Slider defaultValue={42} label="完成度" helpText="范围 0 到 100，步长为 1。" />`;

const demos: Demo[] = [
  {
    title: "基础滑动输入",
    description: "非受控模式适合表单初始值，组件内部维护当前数值。",
    preview: <Slider defaultValue={42} helpText="范围 0 到 100，步长为 1。" label="完成度" />,
    code: `<Slider defaultValue={42} label="完成度" helpText="范围 0 到 100，步长为 1。" />`,
  },
  {
    title: "受控值",
    description: "受控模式由宿主管理 value，并通过 onValueChange 接收归一化后的数值。",
    preview: <ControlledSliderDemo />,
    code: `const [value, setValue] = useState(24); <Slider value={value} onValueChange={setValue} min={0} max={60} step={6} label="超时时间" formatValue={(nextValue) => \`\${nextValue}s\`} ariaValueText={(nextValue) => \`\${nextValue} 秒\`} />`,
  },
  {
    title: "边界和浮点步长",
    description: "min、max 和 step 会被归一化，浮点步长按 step 精度输出，避免 0.3000000004 一类展示噪声。",
    preview: (
      <Slider
        defaultValue={0.6}
        formatValue={(value) => value.toFixed(1)}
        helpText="范围 0 到 1，步长为 0.1。"
        label="温度系数"
        max={1}
        min={0}
        step={0.1}
      />
    ),
    code: `<Slider defaultValue={0.6} min={0} max={1} step={0.1} label="温度系数" formatValue={(value) => value.toFixed(1)} />`,
  },
  {
    title: "范围选择",
    description: "range 模式使用两个原生 range 控件，自动阻止起止值交叉，并保持键盘可调。",
    preview: <RangeSliderDemo />,
    code: `const [window, setWindow] = useState<SliderRangeValue>([20, 72]); <Slider range value={window} onValueChange={(nextValue) => setWindow(nextValue as SliderRangeValue)} min={0} max={100} step={4} label="投放窗口" formatRangeValue={([start, end]) => \`\${start}% - \${end}%\`} ariaValueText={(nextValue, thumb) => \`\${thumb === "start" ? "起点" : "终点"} \${nextValue}%\`} />`,
  },
  {
    title: "刻度和 Tooltip",
    description: "marks 固定展示关键刻度；tooltip=\"always\" 展示当前值，适合调节成本、阈值等需要即时确认的场景。",
    preview: (
      <Slider
        ariaValueText={(value) => `${value} GB`}
        defaultValue={64}
        formatValue={(value) => `${value} GB`}
        helpText="关键刻度保持在轨道下方，提示浮层不遮挡输入。"
        label="缓存容量"
        marks={[
          { value: 0, label: "0" },
          { value: 32, label: "32" },
          { value: 64, label: "64" },
          { value: 128, label: "128" },
        ]}
        max={128}
        min={0}
        step={8}
        tooltip="always"
      />
    ),
    code: `<Slider defaultValue={64} min={0} max={128} step={8} label="缓存容量" marks={[{ value: 0, label: "0" }, { value: 32, label: "32" }, { value: 64, label: "64" }, { value: 128, label: "128" }]} tooltip="always" formatValue={(value) => \`\${value} GB\`} />`,
  },
  {
    title: "错误和禁用",
    description: "错误状态通过 aria-invalid 和帮助文本表达；禁用状态沿用原生 disabled。",
    preview: (
      <div className="slider-doc-stack">
        <Slider defaultValue={96} error helpText="当前值超过建议上限。" label="风险阈值" />
        <Slider defaultValue={20} disabled helpText="等待上游配置解锁。" label="采样比例" />
      </div>
    ),
    code: `<Slider defaultValue={96} error label="风险阈值" helpText="当前值超过建议上限。" /> <Slider defaultValue={20} disabled label="采样比例" helpText="等待上游配置解锁。" />`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "value / defaultValue",
    value: "number | [number, number]",
    description: "支持单值和 range 模式的受控/非受控数值。传入值会根据 min、max、step 归一化后渲染。",
  },
  {
    name: "onValueChange",
    value: "(value: number | [number, number]) => void",
    description: "拖动、键盘调整或触控调整后触发，range 模式回传有序的 [start, end]。",
  },
  {
    name: "range",
    value: "boolean",
    description: "开启双滑块范围选择。两端滑块均为原生 range，起点不会超过终点。",
  },
  {
    name: "min / max",
    value: "number",
    description: "数值范围，默认 0 到 100。若传入反向范围，组件会交换边界以保持输入可用。",
  },
  {
    name: "step",
    value: "number | \"any\"",
    description: "步长，默认 1。无效数字会回落为 1；传入 any 时不做步进取整。",
  },
  {
    name: "label / helpText",
    value: "ReactNode",
    description: "label 作为可访问名称来源，helpText 通过 aria-describedby 关联到 input。",
  },
  {
    name: "showValue / formatValue",
    value: "boolean / (value) => ReactNode",
    description: "控制右侧当前值展示，并允许加入单位或自定义格式。",
  },
  {
    name: "formatRangeValue",
    value: "([start, end]) => ReactNode",
    description: "range 模式下自定义右侧范围值展示。",
  },
  {
    name: "marks",
    value: "SliderMark[] | Record<number, ReactNode>",
    description: "在轨道下方展示关键刻度。标记值会按范围和步长归一化，不作为可点击控件。",
  },
  {
    name: "tooltip / tooltipFormatter",
    value: "boolean | \"always\" / (value) => ReactNode",
    description: "在滑块上方展示当前值提示。tooltip 内容默认复用 formatValue，也可单独格式化。",
  },
  {
    name: "ariaValueText",
    value: "(value, thumb) => string",
    description: "为屏幕阅读器提供带单位或语义化的当前值；range 模式 thumb 为 start 或 end。",
  },
  {
    name: "InputHTMLAttributes",
    value: "input props",
    description: "继承原生 input range 属性，例如 name、form、required、aria-label。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div",
    description: "外层容器包裹标题、当前值、range input、刻度和帮助文本，输入通过 aria-labelledby 关联可见标题。",
  },
  {
    name: "control",
    value: "input[type=\"range\"]",
    description: "保留浏览器内建的 slider role、aria-valuemin、aria-valuemax、aria-valuenow、键盘和表单语义。",
  },
  {
    name: "range control",
    value: "two inputs",
    description: "range 模式渲染 start/end 两个原生 range，分别暴露 value、aria-valuetext 和 disabled 状态。",
  },
  {
    name: "marks / tooltip",
    value: "aria-hidden / text",
    description: "marks 为视觉刻度并设为 aria-hidden；tooltip 是当前值文本展示，不注入 HTML。",
  },
  {
    name: "description",
    value: "aria-describedby",
    description: "helpText 与调用方传入的 aria-describedby 会合并，不覆盖宿主已有说明。",
  },
  {
    name: "error",
    value: "aria-invalid",
    description: "error 为 true 时设置 aria-invalid，并用错误色边界和帮助文本同步提示。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "track",
    value: "#dededb",
    description: "未填充轨道颜色，保持中性低干扰。",
  },
  {
    name: "fill / thumb",
    value: "#111110 / #ffffff",
    description: "已选范围使用近黑强调，滑块保持白底黑边，适配 中性极简界面。",
  },
  {
    name: "focus",
    value: "#555552",
    description: "键盘聚焦显示 2px 中性色轮廓。",
  },
  {
    name: "touch target",
    value: "44px",
    description: "输入高度和滑块命中区域满足移动端触控拖动。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "native range",
    description: "方向键、Home、End、PageUp、PageDown 等行为由浏览器提供。",
  },
  {
    name: "Name",
    value: "label / aria-label",
    description: "优先使用 label；无可见标签时调用方必须提供 aria-label。",
  },
  {
    name: "Value",
    value: "ariaValueText",
    description: "数值带单位或业务含义时提供 ariaValueText，避免只读到裸数字。",
  },
  {
    name: "Range",
    value: "start / end",
    description: "范围选择保留两个可聚焦滑块，读屏可区分起点和终点。",
  },
  {
    name: "Disabled",
    value: "disabled",
    description: "禁用状态使用原生 disabled，自动退出可操作序列并阻止提交修改。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch",
    value: "44px target",
    description: "触控宽度随容器伸展，高度满足移动端拖动命中。",
  },
  {
    name: "Gesture",
    value: "touch-action: manipulation",
    description: "允许页面滚动和点击优化，不额外劫持手势。",
  },
  {
    name: "Layout",
    value: "fluid",
    description: "Slider 默认占满父容器宽度，窄屏下标题和值自动保持在同一行并允许内容压缩。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "覆盖单值、范围、marks、tooltip、min/max、step、disabled 和 mobile 移动端触控，不混入 InputNumber 或 Rate API。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "示例保持一行演示，滑轨、填充、刻度、提示和禁用态在 360/375/390 宽度无横向溢出。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "使用自有 React + 原生 range 实现，不依赖 antd；范围值归一化且保持起止顺序。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "专项 smoke 覆盖 #slider 路由、keyboard 键盘、范围交叉保护、marks、tooltip、disabled、移动端和文档独立性。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "label、marks、tooltip 均作为 ReactNode 文本渲染，不使用 dangerouslySetInnerHTML；aria-describedby 不覆盖宿主说明。",
  },
];

const gapRows: DocRow[] = [
  {
    name: "vertical",
    value: "暂不支持",
    description: "当前只支持水平 Slider。纵向模式需要补布局、方向键预期和跨浏览器样式验收。",
  },
];

function ControlledSliderDemo() {
  const [value, setValue] = useState(24);

  return (
    <Slider
      ariaValueText={(nextValue) => `${nextValue} 秒`}
      formatValue={(nextValue) => `${nextValue}s`}
      helpText="每次调整 6 秒，最大 60 秒。"
      label="超时时间"
      max={60}
      min={0}
      onValueChange={setValue}
      step={6}
      value={value}
    />
  );
}

function RangeSliderDemo() {
  const [window, setWindow] = useState<SliderRangeValue>([20, 72]);

  return (
    <Slider
      ariaValueText={(nextValue, thumb) => `${thumb === "start" ? "起点" : "终点"} ${nextValue}%`}
      formatRangeValue={([start, end]) => `${start}% - ${end}%`}
      helpText="键盘左右键可分别调整起点和终点。"
      label="投放窗口"
      max={100}
      min={0}
      onValueChange={(nextValue) => setWindow(nextValue as SliderRangeValue)}
      range
      step={4}
      value={window}
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

export function SliderDoc({ showAnchors = false }: SliderDocProps) {
  return (
    <TutorialScaffold component="Slider" kind="data-entry" oneLineExample={oneLineExample}>
    <section className="button-doc slider-doc" aria-labelledby="slider-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Slider 文档目录">
            {sliderDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="slider-doc-title">{sliderDocMeta.title}</h2>
            <p>
              用于在连续或等距数值范围内选择单个值。当前生产实现基于原生 <code>{"<input type=\"range\">"}</code>，
              覆盖单值、范围、marks、tooltip、步长归一化、可访问值文本和移动端触控命中。
            </p>
          </header>

          <section className="button-doc-section" id="slider-when" aria-labelledby="slider-when-title">
            <h3 id="slider-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当用户需要在已知数值范围内快速调节，例如比例、阈值、时长或强度。</li>
              <li>当精确值不是唯一重点，用户可以通过拖动和键盘微调达成目标。</li>
              <li>需要严格输入任意数字、复杂校验或文本格式时，使用独立的 InputNumber 文档和组件。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="slider-demos" aria-labelledby="slider-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="slider-demos-title">代码演示</h3>
              <p>示例覆盖非受控、受控、范围、marks、tooltip、浮点步长、错误和禁用状态。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="slider-api" aria-labelledby="slider-api-title">
            <h3 id="slider-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="slider-semantic" aria-labelledby="slider-semantic-title">
            <h3 id="slider-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="slider-token" aria-labelledby="slider-token-title">
            <h3 id="slider-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="slider-a11y" aria-labelledby="slider-a11y-title">
            <h3 id="slider-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="slider-mobile" aria-labelledby="slider-mobile-title">
            <h3 id="slider-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="slider-review" aria-labelledby="slider-review-title">
            <h3 id="slider-review-title">生产复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="slider-gaps" aria-labelledby="slider-gaps-title">
            <div className="button-doc-section__heading">
              <h3 id="slider-gaps-title">扩展建议</h3>
              <p>以下能力未进入当前 Slider API，不能在业务中当作已支持能力使用。</p>
            </div>
            <DataTable rows={gapRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
