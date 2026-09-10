import { useState, type ReactNode } from "react";
import { TimePicker, type TimePickerValue } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

export type TimePickerDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<TimePicker label="开始时间" defaultValue="10:15" step={900} />`;

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

export const timePickerDocMeta = {
  title: "TimePicker 时间选择框",
  category: "数据录入",
  anchors: [
    { id: "time-picker-when", label: "何时使用" },
    { id: "time-picker-demos", label: "代码演示" },
    { id: "time-picker-api", label: "API" },
    { id: "time-picker-semantic", label: "Semantic DOM" },
    { id: "time-picker-keyboard", label: "Keyboard / Mobile" },
    { id: "time-picker-review", label: "五角色审查" },
    { id: "time-picker-gaps", label: "剩余风险" },
  ],
} satisfies ComponentDocMeta;

export function TimePickerDoc({ showAnchors = false }: TimePickerDocProps) {
  const [controlledValue, setControlledValue] = useState<TimePickerValue>("09:30");
  const [secondsValue, setSecondsValue] = useState<TimePickerValue>("14:20:30");
  const [twelveHourValue, setTwelveHourValue] = useState<TimePickerValue>("13:30");

  const demos: Demo[] = [
    {
      title: "基础时间",
      description: "默认输出 HH:mm 字符串，非受控场景通过 defaultValue 初始化。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker defaultValue="10:15" helpText="点击输入框或按钮可打开自有时间列表。" label="开始时间" />
        </div>
      ),
      code: `<TimePicker
  defaultValue="10:15"
  helpText="点击输入框或按钮可打开自有时间列表。"
  label="开始时间"
/>`,
    },
    {
      title: "秒与步长",
      description: "showSeconds 输出 HH:mm:ss；step 使用秒，键盘上下键和候选列表共用同一粒度。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker
            helpText="每 30 秒步进，范围限制在下午时段。"
            label="采样时间"
            max="18:00:00"
            min="13:00:00"
            onValueChange={setSecondsValue}
            showSeconds
            step={30}
            value={secondsValue}
          />
        </div>
      ),
      code: `const [value, setValue] = useState("14:20:30");

<TimePicker
  showSeconds
  step={30}
  min="13:00:00"
  max="18:00:00"
  value={value}
  onValueChange={setValue}
/>`,
    },
    {
      title: "12 小时制",
      description: "formatMode=\"12h\" 只改变展示和可输入格式；提交值仍是稳定的 HH:mm 或 HH:mm:ss。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker
            formatMode="12h"
            helpText={`提交值：${twelveHourValue}。可输入 01:30 PM 或 13:30。`}
            label="访谈时间"
            max="17:00"
            min="09:00"
            onValueChange={setTwelveHourValue}
            step={1800}
            value={twelveHourValue}
          />
        </div>
      ),
      code: `const [value, setValue] = useState("13:30");

<TimePicker
  formatMode="12h"
  min="09:00"
  max="17:00"
  step={1800}
  value={value}
  onValueChange={setValue}
/>`,
    },
    {
      title: "受控与范围",
      description: "value/onValueChange 保持受控；min/max 会夹紧输入、步进和面板选择结果。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker
            helpText={`当前值：${controlledValue || "未选择"}。可输入 08:00 到 20:00。`}
            label="交付窗口"
            max="20:00"
            min="08:00"
            onValueChange={setControlledValue}
            step={900}
            value={controlledValue}
          />
        </div>
      ),
      code: `const [value, setValue] = useState("09:30");

<TimePicker
  min="08:00"
  max="20:00"
  step={900}
  value={value}
  onValueChange={setValue}
/>`,
    },
    {
      title: "禁用时间与清除",
      description: "disabledTime 可按小时、分钟、秒或 totalSeconds 禁用候选；清除按钮提交空字符串。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker
            defaultValue="09:30"
            disabledTime={({ hour, minute }) => hour === 12 || (hour === 9 && minute < 30)}
            helpText="09:00 与 12 点整段不可选；手输禁用时间会回退。"
            label="可预约时间"
            max="18:00"
            min="09:00"
            step={1800}
          />
        </div>
      ),
      code: `<TimePicker
  min="09:00"
  max="18:00"
  step={1800}
  defaultValue="09:30"
  disabledTime={({ hour, minute }) => hour === 12 || (hour === 9 && minute < 30)}
/>`,
    },
    {
      title: "原生 fallback",
      description: "nativeFallback 可显式使用 input[type=time]；默认保持自有面板，便于桌面与移动文档一致验收。",
      preview: (
        <div className="doc-demo-stack time-picker-doc-demo-line">
          <TimePicker
            defaultValue="07:45"
            helpText="用于移动端或偏好系统时间选择器的场景。"
            label="提醒时间"
            nativeFallback
            step={300}
          />
        </div>
      ),
      code: `<TimePicker
  nativeFallback
  defaultValue="07:45"
  step={300}
  label="提醒时间"
/>`,
    },
  ];

  return (
    <TutorialScaffold component="TimePicker" kind="data-entry" oneLineExample={oneLineExample} overlay>
    <section className="button-doc time-picker-doc" aria-labelledby="time-picker-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="TimePicker 文档目录">
            {timePickerDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="time-picker-doc-title">{timePickerDocMeta.title}</h2>
            <p>
              独立时间输入组件，专注一天内时间点选择。它不和 DatePicker 合并文档，也不承担日期、时区、日期范围或跨天时段选择。
            </p>
          </header>

          <section className="button-doc-section" id="time-picker-when" aria-labelledby="time-picker-when-title">
            <h3 id="time-picker-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要选择一天内的开始时间、提醒时间、执行窗口或采样时间时使用。</li>
              <li>需要 HH:mm:ss 时开启 showSeconds；常规业务默认使用 HH:mm，降低输入复杂度。</li>
              <li>需要 12 小时展示时使用 formatMode="12h"；业务值仍保持 24 小时字符串，便于提交和比较。</li>
              <li>需要日期、日期时间组合、跨天范围或时区换算时，不要把 TimePicker 和 DatePicker 混在一个组件里。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="time-picker-demos" aria-labelledby="time-picker-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="time-picker-demos-title">代码演示</h3>
              <p>示例覆盖 HH:mm、HH:mm:ss、12/24 小时、step、min/max、disabledTime、清除、自有移动面板和显式原生 fallback。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="time-picker-api" aria-labelledby="time-picker-api-title">
            <h3 id="time-picker-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="time-picker-semantic" aria-labelledby="time-picker-semantic-title">
            <h3 id="time-picker-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="time-picker-keyboard" aria-labelledby="time-picker-keyboard-title">
            <h3 id="time-picker-keyboard-title">Keyboard / Mobile</h3>
            <ul className="button-doc-list">
              <li>桌面输入框获得焦点后打开 listbox，按钮可显式展开；Enter 提交输入，Escape 还原当前值并关闭。</li>
              <li>ArrowUp / ArrowDown 按 step 调整时间，所有结果都会被 min/max 夹紧。</li>
              <li>Home / End 跳到范围内首个或最后一个可用时间；disabledTime 命中的候选不可点击，键盘步进会跳过。</li>
              <li>
                allowClear 默认为 true；清除按钮可键盘聚焦，触发 <code>onValueChange("", {"{ source: 'clear', seconds: null }"})</code>。
              </li>
              <li>默认在桌面与移动视口都使用自有 listbox；nativeFallback=true 或 "auto" 才会切到原生 input[type=time]。</li>
              <li>12 小时模式为了保持 AM/PM 文本输入，会固定使用自有面板，不切换原生 time。</li>
              <li>读屏通过 label、aria-describedby、aria-invalid、aria-expanded 和 listbox/option 语义理解字段状态。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="time-picker-review" aria-labelledby="time-picker-review-title">
            <div className="button-doc-section__heading">
              <h3 id="time-picker-review-title">五角色审查</h3>
              <p>专项验收以产品、交互、可访问性、前端工程和安全五个视角收敛。</p>
            </div>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="time-picker-gaps" aria-labelledby="time-picker-gaps-title">
            <h3 id="time-picker-gaps-title">剩余风险</h3>
            <ul className="button-doc-list">
              <li>暂不支持时间范围选择；范围应由业务层组合两个 TimePicker 并处理开始结束关系。</li>
              <li>暂不做时区换算、日期联动和 24:00 跨天语义；输入 "24:00"、ISO 字符串和带时区后缀的字符串会被视为非法。</li>
              <li>自有面板最多渲染 1440 个候选项；全日秒级细粒度选择建议设置 min/max、较大 step 或走原生输入。</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
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

const apiRows: DocRow[] = [
  { name: "value / defaultValue", value: "string", description: "受控和非受控值。格式为 HH:mm 或 HH:mm:ss。" },
  { name: "onValueChange", value: "(value, info) => void", description: "值变化回调。info.source 区分 input、panel、step、blur、clear。" },
  { name: "allowClear", value: "boolean", description: "是否显示清除按钮，默认 true；清除后提交空字符串和 seconds: null。" },
  { name: "showSeconds", value: "boolean", description: "开启后显示和提交 HH:mm:ss；默认只显示 HH:mm。" },
  { name: "formatMode", value: "\"24h\" | \"12h\"", description: "展示与手输格式，默认 24h；12h 支持 AM/PM，但提交值仍为 24 小时字符串。" },
  { name: "step", value: "number", description: "步进秒数，默认 60。用于键盘、原生 input step 和自有候选列表。" },
  { name: "min / max", value: "string", description: "可选时间范围，输入、步进和面板选择都会夹紧到范围内。" },
  { name: "disabledTime", value: "(info) => boolean", description: "按 hour、minute、second、totalSeconds 或 value 禁用离散时间，面板与键盘步进都会遵守。" },
  { name: "nativeFallback", value: "boolean | \"auto\"", description: "默认 false 使用自有面板；true 强制原生 time；auto 在移动/粗指针设备使用原生选择器。" },
  { name: "label / helpText / errorText", value: "ReactNode", description: "字段标签、说明和错误文案，自动关联可访问属性。" },
  { name: "InputHTMLAttributes", value: "input props", description: "继承常用原生 input 属性，但 value、type、step、min、max 等由组件管理。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-time-picker", description: "字段根节点负责 blur 边界和错误状态样式。" },
  { name: "label", value: "label[for]", description: "存在 label 时绑定输入框 id。" },
  { name: "control", value: "input.c-time-picker__input", description: "默认为 text 输入；开启 fallback 时为原生 input[type=time]。" },
  { name: "clear", value: "button", description: "可选清除按钮，提交空值并保持焦点在输入框。" },
  { name: "trigger", value: "button", description: "显式打开时间面板或调用原生 showPicker。" },
  { name: "panel", value: "div[role=listbox]", description: "桌面自有候选列表，每项是 button[role=option]，禁用项带 aria-disabled。" },
];

const reviewRows: DocRow[] = [
  { name: "产品", value: "通过", description: "只覆盖一天内时间点选择，支持 12/24 小时显示，不混入日期、范围和时区承诺。" },
  { name: "UI", value: "通过", description: "手输、清除、按钮、候选列表、键盘步进和原生 fallback 路径都可达，样例预览保持单行字段。" },
  { name: "A11y", value: "通过", description: "保留 label、描述、错误、展开状态和 listbox/option 语义。" },
  { name: "研发", value: "通过", description: "自有实现，无 antd 系依赖；受控与非受控状态使用项目 hook。" },
  { name: "测试", value: "通过", description: "覆盖 12/24h、秒、step、disabledTime、清除、min/max、键盘和移动视口验收路径。" },
  { name: "安全", value: "通过", description: "值仅作为受限时间字符串处理，拒绝 ISO/时区边界，不渲染 HTML，不执行外部输入。" },
];
