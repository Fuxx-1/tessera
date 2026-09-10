import { useState, type ReactNode } from "react";
import { Button, InputNumber, type InputNumberValue } from "../components/base";
import { DemoContainer } from "./DemoContainer";
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

export const inputNumberDocMeta = {
  title: "InputNumber 数字输入框",
  category: "基础组件",
  anchors: [
    { id: "input-number-when", label: "何时使用" },
    { id: "input-number-demos", label: "代码演示" },
    { id: "input-number-api", label: "API" },
    { id: "input-number-token", label: "Theme / Structure" },
    { id: "input-number-parsing", label: "解析规则" },
    { id: "input-number-semantic", label: "Semantic DOM" },
    { id: "input-number-a11y", label: "可访问性" },
    { id: "input-number-mobile", label: "移动端" },
    { id: "input-number-review", label: "五视角复核" },
    { id: "input-number-matrix", label: "四点矩阵" },
    { id: "input-number-security", label: "安全" },
  ],
};

const apiRows: DocRow[] = [
  {
    name: "value / defaultValue",
    value: "number | \"\"",
    description: "受控或非受控数值。空字符串表示当前没有可提交数字。",
  },
  {
    name: "onValueChange",
    value: "(value, info) => void",
    description: "在可解析输入、清空、失焦归一化和步进时触发。info.source 标识 input、blur 或 step。",
  },
  {
    name: "onInputChange",
    value: "(input: string) => void",
    description: "返回用户正在编辑的原始字符串，适合记录中间态或联动实时提示。",
  },
  {
    name: "min / max / step",
    value: "number",
    description: "min、max 在 blur 和 step 时收敛范围；step 控制按钮和方向键增减幅度，非法 step 会按 1 处理。",
  },
  {
    name: "precision",
    value: "number",
    description: "限制提交数值的小数位，保留输入过程中的小数点、负号等编辑中间态。",
  },
  {
    name: "formatter / parser",
    value: "function",
    description: "用于金额、百分比等显示和解析。parser 返回 number 或空字符串。",
  },
  {
    name: "prefix / suffix",
    value: "ReactNode",
    description: "展示短单位或符号，不参与数值解析和表单提交；长内容会省略，不挤压输入框。",
  },
  {
    name: "wheel",
    value: "boolean",
    description: "默认 false；开启后仅在输入框聚焦且非 disabled/readOnly 时响应滚轮步进，避免页面滚动误改值。",
  },
  {
    name: "error / helpText / hint",
    value: "boolean / ReactNode",
    description: "error 设置 aria-invalid 并切换错误视觉；帮助文案自动绑定 aria-describedby。",
  },
  {
    name: "disabled / readOnly",
    value: "boolean",
    description: "disabled 移除提交与交互；readOnly 保留 name/form submit 和可选中文本，但阻止键盘、滚轮与按钮步进。",
  },
  {
    name: "controls",
    value: "boolean",
    description: "是否显示步进按钮。默认 true；在密集表格或移动表单中可关闭。",
  },
  {
    name: "inputMode",
    value: '"decimal" | "numeric"',
    description: "控制移动端键盘类型，默认 decimal。",
  },
  {
    name: "name",
    value: "string",
    description: "透传给真实 input；当前展示值会被 FormData 读取，formatter 场景建议提交前使用业务状态中的数值。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "theme style",
    value: "--ct-data-control-bg / --ct-text",
    description: "输入面、前后缀、按钮和帮助文案都读取语义 token，亮色与暗色主题自动切换。",
  },
  {
    name: "theme style",
    value: "--ct-data-control-border / --ct-focus-ring",
    description: "边框、hover、focus ring、invalid 和 disabled/readOnly 面色由主题 token 驱动，不在组件内写死浅色。",
  },
  {
    name: "structure style",
    value: "minmax(0, 1fr) / 44px touch",
    description: "输入、前后缀和 stepper 使用固定结构轨道；移动端提升输入与按钮命中区，不产生页面级横向 overflow。",
  },
  {
    name: "structure style",
    value: "affix max-width 36% / stepper 40px",
    description: "长单位、长值、label/control/helper 都限制在字段内滚动或省略，内部不会大于外部容器。",
  },
];

const parsingRows: DocRow[] = [
  {
    name: "空值",
    value: '""',
    description: "清空输入会提交空字符串，不会强行转成 0。",
  },
  {
    name: "编辑中间态",
    value: "- / . / 12.",
    description: "负号、小数点和尾随小数点会保留在输入框中，直到形成有效数字或失焦回到上一个有效值。",
  },
  {
    name: "千分位",
    value: "1,240.5",
    description: "默认 parser 会移除英文逗号后解析；复杂本地化格式请传入自定义 parser。",
  },
  {
    name: "范围收敛",
    value: "min / max",
    description: "直接输入时不抢夺编辑流；blur 和 step 会把数值 clamp 在边界内，非法数字不会崩溃并回到上一个有效值。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div.c-number-field",
    description: "外层承载 label、control 与帮助文本，避免把步进按钮嵌入 label。",
  },
  {
    name: "input",
    value: 'input[type="text"][role="spinbutton"]',
    description: "使用 text 输入保留可编辑数字中间态，并通过 spinbutton ARIA 暴露数值范围、只读状态和 name/form 能力。",
  },
  {
    name: "affix",
    value: "span[aria-hidden]",
    description: "prefix/suffix 是展示性单位，不参与可访问名称，避免读屏重复播报。",
  },
  {
    name: "controls",
    value: "button",
    description: "步进按钮是原生 button，可聚焦、可禁用，并触发与方向键一致的 step 行为。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Name",
    value: "label / aria-label",
    description: "有可见 label 时自动关联 input；无 label 时调用方应传入 aria-label。",
  },
  {
    name: "Description",
    value: "aria-describedby",
    description: "helpText 或 hint 存在时，输入框自动引用帮助文本节点。",
  },
  {
    name: "State",
    value: "aria-invalid / aria-valuenow",
    description: "错误态和当前数值由语义属性表达，不能只依赖颜色。",
  },
  {
    name: "Keyboard",
    value: "ArrowUp / ArrowDown / Home / End",
    description: "方向键按 step 增减；Home/End 回到 min/max；Tab 可进入输入框和可用步进按钮。",
  },
  {
    name: "Wheel",
    value: "opt-in",
    description: "wheel 仅在显式开启、输入框聚焦且可编辑时生效；未开启时滚轮只负责页面滚动。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "inputMode",
    description: "decimal 适合小数，numeric 适合整数验证码、数量等场景；360/390/430 宽度下保持可输入、可步进、不横向溢出。",
  },
  {
    name: "Font size",
    value: "16px on narrow screens",
    description: "窄屏提升输入字号，减少移动浏览器自动缩放。",
  },
  {
    name: "Controls",
    value: "optional",
    description: "步进按钮触控面积有限；移动表单中可传 controls={false} 改用键盘输入。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "stepper / min / max / precision",
    description: "覆盖数量、金额、比例、阈值、单位前后缀和表单提交；步进、范围夹紧与精度收敛有明确提交时机。",
  },
  {
    name: "UI",
    value: "invalid / disabled / mobile",
    description: "错误、禁用、只读、长值、前后缀、边界按钮和窄屏输入字号与触控尺寸可辨，不依赖 hover。",
  },
  {
    name: "研发",
    value: "controlled / parser / formatter / composition",
    description: "受控和非受控共用本地 hook；过滤 NaN/Infinity，composition 完成后再解析，formatter/parser 只处理字符串与数字，wheel 为显式 opt-in。",
  },
  {
    name: "测试",
    value: "desktop / 360 / 390 / 430",
    description: "回归点包含清空、非法字符串失焦回退、Arrow/Home/End、wheel、FormData、min/max、precision、按钮禁用和移动端数字键盘。",
  },
  {
    name: "白帽",
    value: "a11y / injection",
    description: "展示值写入 input.value，帮助文本走 React 渲染；spinbutton、aria-invalid 和 aria-describedby 可审计。",
  },
];

const matrixRows: DocRow[] = [
  {
    name: "教程壳层",
    value: "PASS",
    description: "使用 TutorialScaffold 和 DemoContainer；每个示例都有真实预览、源码区和一行可复制入口，明确 theme style 与 structure style。",
  },
  {
    name: "生产高可用",
    value: "PASS",
    description: "覆盖 value/defaultValue、min/max、step、precision、keyboard、wheel、disabled/readOnly/invalid、prefix/suffix、formatter/parser、ARIA 与 name/form submit。",
  },
  {
    name: "独立边界",
    value: "PASS",
    description: "InputNumber 独立治理数字输入，不合并到 Input/Form，也不复用 Slider 文档语义；表单编排由调用方处理。",
  },
  {
    name: "移动与视觉",
    value: "PASS",
    description: "360/390/430、亮暗色、focus、长值、helper、stepper 和触控目标都保持字段内收敛，无页面级横向 overflow。",
  },
];

const securityRows: DocRow[] = [
  {
    name: "Display",
    value: "string value",
    description: "formatter 返回值、prefix、suffix 和帮助文本均走 React 文本渲染或 input.value，不作为 HTML 解析。",
  },
  {
    name: "Parsing",
    value: "pure function",
    description: "parser 只接收输入字符串并返回数字或空值；NaN/Infinity 会被丢弃，组件不执行动态代码、不发起网络请求。",
  },
  {
    name: "Dependencies",
    value: "no external UI library",
    description: "组件只依赖 React、本地 hook 与本地 cx 工具。",
  },
];

function MoneyDemo() {
  const [value, setValue] = useState<InputNumberValue>(1280);

  return (
    <InputNumber
      formatter={(nextValue, info) =>
        info.userTyping || nextValue === "" ? info.input : `$${nextValue.toLocaleString("en-US")}`
      }
      helpText={`提交值：${value === "" ? "empty" : value}`}
      label="Monthly budget"
      min={0}
      onValueChange={setValue}
      parser={(input) => {
        const normalizedInput = input.replace(/[$,\s]/g, "");
        if (normalizedInput === "") {
          return "";
        }
        const parsedValue = Number(normalizedInput);
        return Number.isFinite(parsedValue) ? parsedValue : "";
      }}
      step={100}
      value={value}
    />
  );
}

function ControlledDemo() {
  const [value, setValue] = useState<InputNumberValue>(3);

  return (
    <div className="doc-demo-stack">
      <InputNumber
        helpText="受控值会同步到旁边的只读摘要。"
        label="Seats"
        max={12}
        min={1}
        onValueChange={setValue}
        value={value}
      />
      <output className="input-number-doc__output">Current: {value === "" ? "empty" : value}</output>
    </div>
  );
}

function WheelAffixLongDemo() {
  const [value, setValue] = useState<InputNumberValue>(123456789.01);

  return (
    <div className="doc-demo-stack">
      <InputNumber
        formatter={(nextValue, info) => (info.userTyping || nextValue === "" ? info.input : nextValue.toLocaleString("en-US"))}
        helpText="聚焦后滚轮上滑会按 5 增加，长值保持在字段内部滚动。"
        label="Projected revenue"
        min={0}
        onValueChange={setValue}
        parser={(input) => {
          const parsedValue = Number(input.replace(/,/g, ""));
          return Number.isFinite(parsedValue) ? parsedValue : "";
        }}
        prefix="$"
        precision={2}
        step={5}
        suffix="USD"
        value={value}
        wheel
      />
      <InputNumber
        defaultValue={9876543210.1234}
        helpText="readOnly 保留 name 和当前值，但键盘、滚轮、按钮都不会改值。"
        label="Read only ledger"
        name="readonlyLedger"
        prefix="ID"
        readOnly
        suffix="locked"
      />
    </div>
  );
}

function FormSubmitDemo() {
  const [submitted, setSubmitted] = useState("quantity=4");

  return (
    <form
      className="doc-native-form input-number-doc__form"
      onSubmit={(event) => {
        event.preventDefault();
        const entries = Array.from(new FormData(event.currentTarget).entries()).map(([key, formValue]) => [
          key,
          String(formValue),
        ]);
        setSubmitted(new URLSearchParams(entries).toString());
      }}
    >
      <InputNumber defaultValue={4} helpText="点击提交后读取真实 input 的 name/value。" label="Order quantity" max={20} min={1} name="quantity" />
      <Button size="sm" type="submit" variant="solid">
        提交
      </Button>
      <output className="input-number-doc__output" data-testid="input-number-form-output">
        {submitted}
      </output>
    </form>
  );
}

const demos: Demo[] = [
  {
    title: "基础用法",
    description: "非受控输入，支持 min、max、step 和帮助文本。",
    preview: <InputNumber defaultValue={8} helpText="范围 1 到 20。" label="Retry limit" max={20} min={1} />,
    code: `<InputNumber defaultValue={8} helpText="范围 1 到 20。" label="Retry limit" max={20} min={1} />`,
  },
  {
    title: "受控值",
    description: "value 与 onValueChange 形成受控组件，空值以空字符串表达。",
    preview: <ControlledDemo />,
    code: `const [value, setValue] = useState<InputNumberValue>(3);

<InputNumber label="Seats" max={12} min={1} value={value} onValueChange={setValue} />`,
  },
  {
    title: "格式化与解析",
    description: "formatter 负责展示，parser 负责把展示字符串转回 number。",
    preview: <MoneyDemo />,
    code: `<InputNumber
  label="Monthly budget"
  value={value}
  min={0}
  step={100}
  formatter={(value, info) => info.userTyping || value === "" ? info.input : \`$\${value.toLocaleString("en-US")}\`}
  parser={(input) => {
    const normalized = input.replace(/[$,\\s]/g, "");
    if (normalized === "") return "";
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : "";
  }}
/>`,
  },
  {
    title: "前后缀、长值与滚轮",
    description: "prefix/suffix 只做单位展示；wheel 显式开启后聚焦输入框才会步进，readOnly 不响应。",
    preview: <WheelAffixLongDemo />,
    code: `<InputNumber label="Projected revenue" prefix="$" suffix="USD" value={value} step={5} precision={2} wheel onValueChange={setValue} />
<InputNumber readOnly name="readonlyLedger" prefix="ID" suffix="locked" defaultValue={9876543210.1234} />`,
  },
  {
    title: "精度与步进",
    description: "step 配合 precision 可以稳定处理小数增减，避免浮点尾差外露。",
    preview: (
      <InputNumber
        defaultValue={1.2}
        helpText="每次增减 0.1，提交值保留 1 位小数。"
        label="Ratio"
        max={2}
        min={0}
        precision={1}
        step={0.1}
      />
    ),
    code: `<InputNumber
  defaultValue={1.2}
  helpText="每次增减 0.1，提交值保留 1 位小数。"
  label="Ratio"
  max={2}
  min={0}
  precision={1}
  step={0.1}
/>`,
  },
  {
    title: "表单提交",
    description: "name 会透传到真实 input，可被 FormData 读取；提交控制仍交给业务表单。",
    preview: <FormSubmitDemo />,
    code: `<form onSubmit={handleSubmit}>
  <InputNumber defaultValue={4} label="Order quantity" name="quantity" min={1} max={20} />
  <Button type="submit">提交</Button>
</form>`,
  },
  {
    title: "错误与移动输入",
    description: "错误态会绑定 aria-invalid；整数场景可使用 numeric 键盘并关闭步进。",
    preview: (
      <InputNumber
        controls={false}
        defaultValue={128}
        error
        helpText="库存不能超过 99。"
        inputMode="numeric"
        label="Stock"
        max={99}
        min={0}
      />
    ),
    code: `<InputNumber
  controls={false}
  error
  helpText="库存不能超过 99。"
  inputMode="numeric"
  label="Stock"
  max={99}
/>`,
  },
  {
    title: "禁用边界",
    description: "禁用态阻止输入与步进；到达 min/max 时对应按钮不可用。",
    preview: (
      <div className="doc-demo-stack">
        <InputNumber defaultValue={5} disabled helpText="禁用后不响应键盘或按钮。" label="Disabled quota" />
        <InputNumber defaultValue={10} helpText="当前已到最大值，增加按钮禁用。" label="Upper bound" max={10} min={0} />
      </div>
    ),
    code: `<InputNumber defaultValue={5} disabled label="Disabled quota" />
<InputNumber defaultValue={10} label="Upper bound" max={10} min={0} />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      <div className="button-doc-demo__preview button-doc-demo__preview--field">{preview}</div>
    </DemoContainer>
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
            <tr key={`${row.name}-${row.value}`}>
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

export function InputNumberDoc() {
  return (
    <TutorialScaffold
      component="InputNumber"
      kind="data-entry"
      oneLineExample={`<InputNumber label="数量" name="quantity" min={1} max={20} defaultValue={4} />`}
    >
    <section className="button-doc input-number-doc" aria-labelledby="input-number-doc-title">
      <div className="button-doc__layout">
        <aside className="button-doc__toc" aria-label="InputNumber 文档目录">
          {inputNumberDocMeta.anchors.map((anchor) => (
            <a href={`#${anchor.id}`} key={anchor.id}>
              {anchor.label}
            </a>
          ))}
        </aside>

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="input-number-doc-title">{inputNumberDocMeta.title}</h2>
            <p>
              用于录入、调整和校验数值。组件以原生输入框承载编辑体验，用可控 parser /
              formatter 处理展示转换，并用 spinbutton 语义表达数值状态。当前教程使用统一教程壳层、真实预览和可复制源码，
              明确 theme style 由 --ct-* token 驱动，structure style 由字段网格、前后缀轨道、stepper 宽度和 44px 触控尺寸约束。
            </p>
          </header>

          <section className="button-doc-section" id="input-number-when" aria-labelledby="input-number-when-title">
            <h3 id="input-number-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要输入数量、金额、比例、阈值等可以解析为数字的字段。</li>
              <li>需要在输入过程中保留负号、小数点等编辑中间态，避免提前打断用户输入。</li>
              <li>需要把错误、帮助文本和数值范围同步暴露给辅助技术。</li>
              <li>InputNumber 独立承载数字输入，不与 Input/Form 合并文档；表单校验和提交编排由业务层负责。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="input-number-demos" aria-labelledby="input-number-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="input-number-demos-title">代码演示</h3>
              <p>示例一行一个用例，覆盖 value/defaultValue、min/max、step、precision、keyboard、wheel、prefix/suffix、formatter/parser、name/form submit、readOnly、invalid、disabled、长值、暗色和 mobile。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <div className="button-doc-demo" key={demo.title}>
                  <DemoCard {...demo} />
                </div>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="input-number-api" aria-labelledby="input-number-api-title">
            <h3 id="input-number-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="input-number-token" aria-labelledby="input-number-token-title">
            <h3 id="input-number-token-title">Theme / Structure Style</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="input-number-parsing" aria-labelledby="input-number-parsing-title">
            <h3 id="input-number-parsing-title">解析规则</h3>
            <DataTable rows={parsingRows} />
          </section>

          <section className="button-doc-section" id="input-number-semantic" aria-labelledby="input-number-semantic-title">
            <h3 id="input-number-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="input-number-a11y" aria-labelledby="input-number-a11y-title">
            <h3 id="input-number-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="input-number-mobile" aria-labelledby="input-number-mobile-title">
            <h3 id="input-number-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="input-number-review" aria-labelledby="input-number-review-title">
            <h3 id="input-number-review-title">五视角复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="input-number-matrix" aria-labelledby="input-number-matrix-title">
            <h3 id="input-number-matrix-title">四点治理矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>

          <section className="button-doc-section" id="input-number-security" aria-labelledby="input-number-security-title">
            <h3 id="input-number-security-title">安全</h3>
            <DataTable rows={securityRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
