import { useState, type ReactNode } from "react";
import { DatePicker, type DatePickerValue } from "../components/base";
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

export type DatePickerDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<DatePicker name="dueDate" label="Due date" defaultValue="2026-06-07" />`;

export const datePickerDocMeta = {
  title: "DatePicker 日期选择框",
  category: "基础组件",
  anchors: [
    { id: "date-picker-when", label: "何时使用" },
    { id: "date-picker-demos", label: "代码演示" },
    { id: "date-picker-api", label: "API" },
    { id: "date-picker-rules", label: "日期规则" },
    { id: "date-picker-semantic", label: "Semantic DOM" },
    { id: "date-picker-keyboard", label: "键盘" },
    { id: "date-picker-review", label: "五角色复核" },
    { id: "date-picker-mobile", label: "移动端" },
    { id: "date-picker-limits", label: "边界" },
  ],
} satisfies ComponentDocMeta;

const apiRows: DocRow[] = [
  {
    name: "value / defaultValue",
    value: "string",
    description: "受控或非受控日期值，格式为 YYYY-MM-DD。空字符串表示未选择。",
  },
  {
    name: "onValueChange",
    value: "(value, info) => void",
    description: "选择或清空后触发。info.date 提供原生 Date 或 null，info.source 标识 select / clear。",
  },
  {
    name: "open / defaultOpen",
    value: "boolean",
    description: "控制日历面板展开状态。defaultOpen 适合文档和验收场景。",
  },
  {
    name: "onOpenChange",
    value: "(open: boolean) => void",
    description: "点击触发器、外部点击、Escape 或选择日期导致展开状态变化时触发。",
  },
  {
    name: "min / max",
    value: "string | Date",
    description: "限制可选日期边界。字符串需为 YYYY-MM-DD；Date 会按本地日历日归一化。",
  },
  {
    name: "disabledDate",
    value: "(date: Date) => boolean",
    description: "禁用特定日期。会与 min/max 组合，同时阻止鼠标、触控和键盘选择。",
  },
  {
    name: "defaultPickerDate",
    value: "string | Date",
    description: "无选中值时初始展示的月份，适合提前定位到业务周期。",
  },
  {
    name: "locale",
    value: "string",
    description: "传给 Intl.DateTimeFormat，用于月份、星期、输入展示和日期 aria-label。",
  },
  {
    name: "label / helpText / errorText",
    value: "ReactNode",
    description: "字段标签和辅助文案。帮助或错误文案会自动合并到 aria-describedby。",
  },
  {
    name: "InputHTMLAttributes",
    value: "原生 input 属性",
    description: "继承 name、required、disabled、aria-* 等属性；value/defaultValue/onChange/type 被组件接管。",
  },
];

const ruleRows: DocRow[] = [
  {
    name: "值格式",
    value: "YYYY-MM-DD",
    description: "提交值是稳定字符串，便于表单序列化和接口传输；组件内部再解析为本地 Date。",
  },
  {
    name: "日期比较",
    value: "local calendar day",
    description: "比较前会归一到本地年月日，避免传入 Date 的时分秒影响 min/max。",
  },
  {
    name: "月份网格",
    value: "6 x 7",
    description: "面板始终渲染 42 个日期格，切换月份时布局稳定，焦点不会因行数变化跳动。",
  },
  {
    name: "依赖",
    value: "Date / Intl",
    description: "只使用原生 Date 和 Intl.DateTimeFormat，不引入 dayjs、moment、date-fns 等日期库。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "field",
    value: "div.c-date-picker",
    description: "承载 label、只读展示 input、隐藏提交 input、日历面板和帮助文本。",
  },
  {
    name: "trigger",
    value: "input[readonly] + button",
    description: "展示值的 input 暴露 aria-haspopup、aria-expanded、aria-controls；按钮提供明确打开入口。",
  },
  {
    name: "panel",
    value: 'div[role="dialog"]',
    description: "面板通过 aria-labelledby 关联月份标题，Escape 和外部点击可关闭。",
  },
  {
    name: "calendar",
    value: 'div[role="grid"]',
    description: "星期为 columnheader，日期按钮为 gridcell，选中态使用 aria-selected。",
  },
  {
    name: "today / disabled",
    value: "aria-current / aria-disabled",
    description: "今天使用 aria-current=date；禁用日期同时使用 disabled 和 aria-disabled。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "Input",
    value: "Enter / Space / ArrowDown",
    description: "打开日历面板并聚焦当前选中日期或可用日期。",
  },
  {
    name: "Grid arrows",
    value: "Arrow keys",
    description: "左右移动一天，上下移动一周，并跳过不可选日期。",
  },
  {
    name: "Week edges",
    value: "Home / End",
    description: "移动到当前周的第一天或最后一天。",
  },
  {
    name: "Month",
    value: "PageUp / PageDown",
    description: "切换到上个月或下个月，保持日历网格焦点。",
  },
  {
    name: "Commit",
    value: "Enter / Space",
    description: "选择当前聚焦日期并关闭面板。",
  },
  {
    name: "Close",
    value: "Escape",
    description: "关闭面板，不改变已有值。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px",
    description: "窄屏下输入、月份导航和日期格都提升触控高度，减少误触。",
  },
  {
    name: "Panel width",
    value: "calc(100vw - 20px)",
    description: "面板在移动视口内收敛宽度，并使用内部滚动避免页面横向溢出。",
  },
  {
    name: "Keyboard",
    value: "readonly input",
    description: "输入框只读并设置 inputMode=none，移动端不会弹出文本键盘遮挡日历。",
  },
];

const limitRows: DocRow[] = [
  {
    name: "RangePicker",
    value: "不支持",
    description: "首版只覆盖单日期。范围选择应独立设计 DateRangePicker，不塞进当前 API。",
  },
  {
    name: "TimePicker",
    value: "不合并",
    description: "时间选择涉及时分秒、步长和 12/24 小时制，文档和组件均保持独立。",
  },
  {
    name: "自由输入解析",
    value: "不支持",
    description: "当前输入框只读。需要手输日期时应另行设计 parse/format 和错误提示策略。",
  },
  {
    name: "日期库",
    value: "不引入",
    description: "不使用 dayjs、moment、date-fns、luxon、react-datepicker、rc-picker 等库。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "首版只做单日期选择；min/max、disabledDate、required 清空边界和非法日期空态已覆盖，不合并范围选择。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "日历面板有稳定 6x7 网格、焦点态、明确触发器；移动端 360/390/430 宽度内面板收敛且日期格可触控。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "只使用原生 Date、Intl 与 YYYY-MM-DD 字符串；受控值、隐藏提交值、本地日历日和键盘/ARIA 路径可审计。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "专项 smoke 覆盖 desktop、mobile-360、mobile-390、mobile-430 的选择、清空、禁用日期、无横向 overflow 和无未定义占位字样。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "placeholder、label、helpText 和 errorText 均作为 ReactNode/属性渲染，不解析 HTML，不使用 dangerouslySetInnerHTML，不引入 antd 或长日期库。",
  },
];

function ControlledDemo() {
  const [date, setDate] = useState<DatePickerValue>("2026-06-18");

  return (
    <div className="date-picker-doc-stack">
      <DatePicker
        helpText="受控值会同步到下方摘要。"
        label="Release date"
        locale="en-US"
        onValueChange={setDate}
        value={date}
      />
      <output className="date-picker-doc-output">Current: {date || "empty"}</output>
    </div>
  );
}

function DisabledRuleDemo() {
  return (
    <DatePicker
      defaultOpen
      defaultPickerDate="2026-06-01"
      disabledDate={(date) => date.getDay() === 0 || date.getDay() === 6}
      helpText="周末被 disabledDate 禁用。"
      label="Workday"
      max="2026-06-26"
      min="2026-06-08"
    />
  );
}

const demos: Demo[] = [
  {
    title: "基础日期",
    description: "使用 YYYY-MM-DD 作为表单值，展示文本由 Intl 格式化。",
    preview: <DatePicker defaultValue="2026-06-07" helpText="隐藏 input 会提交 name=dueDate。" label="Due date" name="dueDate" />,
    code: `<DatePicker name="dueDate" label="Due date" defaultValue="2026-06-07" helpText="隐藏 input 会提交 name=dueDate。" />`,
  },
  {
    title: "受控值",
    description: "value 和 onValueChange 组合适合筛选栏、设置表单和联动摘要。",
    preview: <ControlledDemo />,
    code: `const [date, setDate] = useState("2026-06-18"); <DatePicker label="Release date" value={date} onValueChange={setDate} />`,
  },
  {
    title: "边界和禁用日期",
    description: "min、max 与 disabledDate 共同决定可选日期，键盘导航也会跳过禁用日期。",
    preview: <DisabledRuleDemo />,
    code: `<DatePicker label="Workday" min="2026-06-08" max="2026-06-26" disabledDate={(date) => date.getDay() === 0 || date.getDay() === 6} />`,
  },
  {
    title: "移动端窄屏",
    description: "触控目标提升到 44px，面板宽度收敛在视口内。",
    preview: (
      <div className="date-picker-doc-mobile-frame">
        <DatePicker defaultOpen defaultPickerDate="2026-12-01" label="Mobile review" locale="en-US" />
      </div>
    ),
    code: `<DatePicker defaultOpen defaultPickerDate="2026-12-01" label="Mobile review" />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo date-picker-doc-demo">
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

export function DatePickerDoc({ showAnchors = false }: DatePickerDocProps) {
  return (
    <TutorialScaffold component="DatePicker" kind="data-entry" oneLineExample={oneLineExample} overlay>
      <section className="button-doc date-picker-doc" aria-labelledby="date-picker-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="DatePicker 文档目录">
              {datePickerDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="date-picker-doc-title">{datePickerDocMeta.title}</h2>
              <p>
                自有单日期选择组件，覆盖月份导航、min/max、disabledDate、键盘网格和移动端触控。组件只使用原生{" "}
                <code>Date</code> 与 <code>Intl</code>，不引入日期库，也不与 TimePicker 合并文档。
                五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；安全边界确认日期值按 ISO 文本提交，不解析 HTML、不加载外部日历脚本。
              </p>
            </header>

            <section className="button-doc-section" id="date-picker-when" aria-labelledby="date-picker-when-title">
              <h3 id="date-picker-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>需要在表单、筛选栏或任务配置里选择一个明确日期。</li>
                <li>需要通过日历网格理解日期所在周和月份上下文。</li>
                <li>需要时间、日期范围、周选择或季度选择时，应拆成独立组件。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="date-picker-demos" aria-labelledby="date-picker-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="date-picker-demos-title">代码演示</h3>
                <p>覆盖单日期、受控值、月份边界、禁用日期、键盘网格和移动端宽度。</p>
              </div>
              <div className="button-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="date-picker-api" aria-labelledby="date-picker-api-title">
              <h3 id="date-picker-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="date-picker-rules" aria-labelledby="date-picker-rules-title">
              <h3 id="date-picker-rules-title">日期规则</h3>
              <DataTable rows={ruleRows} />
            </section>

            <section className="button-doc-section" id="date-picker-semantic" aria-labelledby="date-picker-semantic-title">
              <h3 id="date-picker-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="date-picker-keyboard" aria-labelledby="date-picker-keyboard-title">
              <h3 id="date-picker-keyboard-title">键盘 / a11y</h3>
              <DataTable rows={keyboardRows} />
            </section>

            <section className="button-doc-section" id="date-picker-review" aria-labelledby="date-picker-review-title">
              <h3 id="date-picker-review-title">五角色复核</h3>
              <DataTable rows={reviewRows} />
            </section>

            <section className="button-doc-section" id="date-picker-mobile" aria-labelledby="date-picker-mobile-title">
              <h3 id="date-picker-mobile-title">移动端</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="date-picker-limits" aria-labelledby="date-picker-limits-title">
              <h3 id="date-picker-limits-title">边界 / 安全</h3>
              <DataTable rows={limitRows} />
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
