import type { ReactNode } from "react";
import { Calendar, Table, Tag, type CalendarEvent, type CalendarMark, type TableColumn } from "../components/base";
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

type ExpertRow = {
  expert: string;
  conclusion: string;
  decision: string;
};

export type CalendarDocProps = {
  showAnchors?: boolean;
};

export const calendarDocMeta = {
  title: "Calendar 日历",
  category: "基础组件",
  anchors: [
    { id: "calendar-when", label: "何时使用" },
    { id: "calendar-demos", label: "代码演示" },
    { id: "calendar-api", label: "API" },
    { id: "calendar-keyboard", label: "键盘与 ARIA" },
    { id: "calendar-year", label: "年视图" },
    { id: "calendar-i18n", label: "Intl 与标签" },
    { id: "calendar-mobile", label: "移动端" },
    { id: "calendar-security", label: "安全文本" },
    { id: "calendar-semantic", label: "Semantic DOM" },
    { id: "calendar-token", label: "Design Token" },
    { id: "calendar-experts", label: "专家结论" },
    { id: "calendar-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const releaseEvents: CalendarEvent[] = [
  { id: "freeze", date: "2026-06-08", title: "Freeze", tone: "subtle" },
  { id: "triage", date: "2026-06-10", title: "Triage", tone: "neutral" },
  { id: "ship", date: "2026-06-12", title: "Ship", tone: "strong" },
  { id: "retro", date: "2026-06-12", title: "Retro", tone: "neutral" },
  { id: "metrics", date: "2026-06-18", title: "Metrics", tone: "subtle" },
  { id: "audit", date: "2026-06-23", title: "Audit", tone: "strong" },
];

const releaseMarks: CalendarMark[] = [
  { date: "2026-06-09", label: "Design review", tone: "neutral" },
  { date: "2026-06-12", label: "Release day", tone: "strong" },
  { date: "2026-06-19", label: "Customer sync", tone: "subtle" },
  { date: "2026-06-26", label: "Ops window", tone: "neutral" },
];

const demos: Demo[] = [
  {
    title: "月视图",
    description: "Calendar 默认渲染 6 行月网格，defaultValue 初始化选中日期与展示月份，受控 viewDate 可接管当前月份。",
    preview: <Calendar defaultValue="2026-06-12" events={releaseEvents} marks={releaseMarks} />,
    code: `<Calendar defaultValue="2026-06-12" events={events} marks={marks} />`,
  },
  {
    title: "年视图",
    description: "viewMode=\"year\" 展示 12 个月份概览，聚合每月事件和标记，上一页/下一页按年份移动。",
    preview: <Calendar defaultValue="2026-06-12" events={releaseEvents} marks={releaseMarks} viewMode="year" />,
    code: `<Calendar defaultValue="2026-06-12" events={events} marks={marks} viewMode="year" />`,
  },
  {
    title: "本地化标签",
    description: "locale 交给 Intl.DateTimeFormat，labels 只覆盖产品文案，不引入全局配置依赖。",
    preview: (
      <Calendar
        defaultValue="2026-06-10"
        events={releaseEvents.slice(0, 4)}
        firstDayOfWeek={1}
        labels={{
          calendar: "Sprint calendar",
          nextMonth: "Next sprint month",
          previousMonth: "Previous sprint month",
          today: "Today",
        }}
        locale="en-GB"
      />
    ),
    code: `<Calendar locale="en-GB" firstDayOfWeek={1} labels={{ calendar: "Sprint calendar", today: "Today" }} />`,
  },
  {
    title: "移动紧凑模式",
    description: "compact 降低单元格高度，保留日期、标记和短事件标签，适合侧栏、抽屉和移动页面。",
    preview: (
      <div className="calendar-doc-mobile-frame">
        <Calendar
          defaultValue="2026-06-12"
          events={releaseEvents}
          marks={releaseMarks}
          maxEventsPerDay={1}
          size="compact"
        />
      </div>
    ),
    code: `<Calendar size="compact" maxEventsPerDay={1} events={events} marks={marks} />`,
  },
  {
    title: "自定义日期内容",
    description: "renderDate 可以追加轻量业务信息，但日期按钮、ARIA 和选择行为仍由 Calendar 维护。",
    preview: (
      <Calendar
        defaultValue="2026-06-18"
        events={releaseEvents.slice(2)}
        renderDate={(info) => (info.dateKey.endsWith("-18") ? <span>Ops</span> : null)}
      />
    ),
    code: `<Calendar renderDate={(info) => info.dateKey.endsWith("-18") ? <span>Ops</span> : null} />`,
  },
  {
    title: "安全文本",
    description: "事件标题按 React 文本渲染，字符串中的脚本片段不会被当作 HTML 执行。",
    preview: <Calendar defaultValue="2026-06-23" events={[{ id: "safe-text", date: "2026-06-23", title: "<img src=x onerror=alert(1)>", tone: "strong" }]} />,
    code: `<Calendar events={[{ id: "safe-text", date: "2026-06-23", title: "<img src=x onerror=alert(1)>" }]} />`,
  },
];

const apiRows: DocRow[] = [
  { name: "value / defaultValue", value: "Date | string", description: "受控或非受控选中日期。字符串推荐 YYYY-MM-DD，本地日期解析，避免时区漂移。" },
  { name: "viewDate", value: "Date | string", description: "受控当前月份。只影响展示月份，不等同于选中日期。" },
  { name: "viewMode", value: '"month" | "year"', description: "month 展示 6 行日期网格；year 展示 12 个月份聚合视图。默认 month。" },
  { name: "onChange", value: "(date, info) => void", description: "选择日期后触发，info 包含 dateKey、today/current/selected 状态、events 和 marks。" },
  { name: "onMonthChange", value: "(month) => void", description: "点击上月/下月、Today 或键盘跨月移动时触发，返回当月第一天。" },
  { name: "events", value: "CalendarEvent[]", description: "按日期展示日程短标签。每项包含 id、date、title、tone。" },
  { name: "marks", value: "CalendarMark[]", description: "按日期展示点状标记。适合风险、提醒、发版窗口等轻量状态。" },
  { name: "maxEventsPerDay", value: "number", description: "单元格内最多展示的事件数，超出后显示 +N。默认 2。" },
  { name: "locale", value: "string", description: "传给 Intl.DateTimeFormat，用于月份、星期和完整日期可访问名称。" },
  { name: "labels", value: "Partial<CalendarLabels>", description: "覆盖 Calendar、Today、上下月、selected、event count 等可见或读屏标签。" },
  { name: "firstDayOfWeek", value: "0 - 6", description: "星期起始日，0 为周日，1 为周一。影响表头和 Home/End 键。" },
  { name: "showOutsideDays", value: "boolean", description: "是否显示相邻月份日期，默认 true。false 时保留按钮但视觉弱化，保持网格稳定。" },
  { name: "size", value: '"comfortable" | "compact"', description: "comfortable 适合主内容区，compact 适合移动端、抽屉和密集面板。" },
  { name: "renderDate", value: "(info) => ReactNode", description: "追加自定义内容。不要替换日期按钮语义或输出可交互嵌套控件。" },
];

const keyboardRows: DocRow[] = [
  { name: "role=grid", value: "root grid", description: "日历主体使用 grid/columnheader/gridcell，日期按钮位于 gridcell 内。" },
  { name: "roving focus", value: "tabIndex 0/-1", description: "只有当前聚焦日期进入 Tab 顺序，方向键在网格中移动。" },
  { name: "Arrow keys", value: "day/week", description: "左右移动一天，上下移动一周。跨月时同步 view month。" },
  { name: "Home / End", value: "week edge", description: "移动到当前周的起点或终点，并遵守 firstDayOfWeek。" },
  { name: "PageUp / PageDown", value: "month/year", description: "PageUp/PageDown 切换月份，Shift 组合切换年份。" },
  { name: "aria-pressed", value: "selected", description: "选中日期用 aria-pressed 表达，今天使用 aria-current=date。" },
];

const i18nRows: DocRow[] = [
  { name: "month title", value: "Intl month/year", description: "默认由 locale 生成，业务也可用 labels.monthLabel 自定义。" },
  { name: "weekday", value: "Intl weekday short", description: "星期标题基于 locale 与 firstDayOfWeek 组合生成。" },
  { name: "day label", value: "Intl dateStyle=full", description: "每个日期按钮都有完整日期、选中、今天、事件数量和标记状态。" },
  { name: "no global config", value: "per instance", description: "Calendar 不依赖 ConfigProvider，便于独立嵌入和局部本地化。" },
];

const yearRows: DocRow[] = [
  { name: "month grid", value: "42 day cells", description: "月视图固定 7 列 x 6 行，跨月日期可展示或弱化，今天和选中态同时可见。" },
  { name: "year grid", value: "12 month cells", description: "年视图固定 4 列桌面、3 列移动，按本地月份聚合 events 和 marks。" },
  { name: "navigation", value: "month/year delta", description: "month 模式上下页移动一个月；year 模式上下页移动一年，Today 回到今天所在月份或年份。" },
  { name: "date key", value: "YYYY-MM-DD", description: "Date 与字符串都会落到本地日期 key，避免 UTC 字符串让日期偏移一天。" },
];

const mobileRows: DocRow[] = [
  { name: "compact", value: "58px cell", description: "移动端示例使用 compact，减少垂直占用但保留 7 列结构。" },
  { name: "short labels", value: "ellipsis", description: "事件标签单行省略，避免撑破窄屏。" },
  { name: "stable grid", value: "repeat(7, minmax(0, 1fr))", description: "列宽固定由容器分配，日期、hover 和事件数量不会造成布局跳动。" },
  { name: "touch target", value: "full cell button", description: "整个日期格都是按钮，不要求用户点中小数字。" },
  { name: "acceptance widths", value: "360 / 390 / 430", description: "Calendar smoke 在 360px、390px、430px 和桌面检查页面无水平溢出。" },
];

const securityRows: DocRow[] = [
  { name: "event title", value: "ReactNode", description: "字符串按文本输出，不解析 HTML；富内容由调用方用 React 节点组合。" },
  { name: "renderDate", value: "composition only", description: "Calendar 不 eval、不 fetch、不 dangerouslySetInnerHTML；renderDate 只接收已计算日期状态。" },
  { name: "safe sample", value: "<img onerror>", description: "安全文本示例直接展示脚本样式字符串，验收确认页面没有真实注入节点。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-calendar", description: "承载头部、导航和月网格。" },
  { name: "header", value: "month title + controls", description: "包含月份标题、上月、Today、下月按钮。" },
  { name: "grid", value: 'div[role="grid"]', description: "可访问名称为当前月份。" },
  { name: "weekday", value: 'div[role="columnheader"]', description: "Intl 生成的星期短标签。" },
  { name: "cell", value: 'div[role="gridcell"] > button', description: "日期按钮提供选择、焦点和完整 aria-label。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #fbfbfa", description: "主背景与相邻月份弱化背景。" },
  { name: "border", value: "#dededb / #ededeb", description: "外框与日期格分隔线。" },
  { name: "selected", value: "#1f1f1d", description: "选中日期反白，保持 neutral minimal 中性色。" },
  { name: "event", value: "#f7f7f5", description: "事件胶囊背景，支持 neutral/strong/subtle 三种轻量 tone。" },
  { name: "radius", value: "8px / 6px / 5px", description: "容器、按钮和事件标签的克制圆角。" },
];

const expertRows: ExpertRow[] = [
  { expert: "产品", conclusion: "Calendar 是展示型月历，不承担 DatePicker 的弹层输入职责。", decision: "独立文档、独立路由，突出 selected date、events/marks、month navigation 和 Today。" },
  { expert: "UI", conclusion: "月格需要足够安静，事件只做短标签和点状标记，不走营销式大卡片。", decision: "白底、细线、中性色选中态，compact 用同一视觉语言收缩密度。" },
  { expert: "研发", conclusion: "日期状态必须可预测，不能被时区字符串和外部 UI 库牵着走。", decision: "使用本地 YYYY-MM-DD key、Intl、React 原生状态和自有 CSS，无 antd 系依赖。" },
  { expert: "测试", conclusion: "风险集中在跨月网格、年视图聚合、键盘焦点、窄屏溢出和受控/非受控切换。", decision: "build、依赖 scan、Calendar smoke 覆盖桌面与 360/390/430 宽度检查。" },
  { expert: "白帽", conclusion: "events/title 接收 ReactNode 但不解析 HTML 字符串，不应产生脚本执行面。", decision: "组件不 fetch、不 eval、不 dangerouslySetInnerHTML；自定义 renderDate 只作为 React composition 点。" },
];

const faqItems = [
  { question: "为什么不和 DatePicker 合并？", answer: "Calendar 是常驻展示组件，面向日程和日期状态浏览；DatePicker 是表单输入控件，面向单次选择和弹层交互。两者可以复用思路，但文档和 API 不合并。" },
  { question: "能做周视图或范围拖拽吗？", answer: "当前版本承诺 month grid 与 year grid。周视图、范围选择和拖拽排期属于后续业务能力，避免第一版 API 过早膨胀。" },
  { question: "事件很多怎么办？", answer: "使用 maxEventsPerDay 控制展示数量，并把详细日程放到外部 List、Popover 或业务侧面板里。" },
];

const expertColumns: Array<TableColumn<ExpertRow>> = [
  { key: "expert", title: "专家", dataIndex: "expert", scope: "row", width: 90, render: (value) => <Tag tone="neutral">{value as string}</Tag> },
  { key: "conclusion", title: "结论", dataIndex: "conclusion" },
  { key: "decision", title: "落地决策", dataIndex: "decision" },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo calendar-doc-demo">
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

export function CalendarDoc({ showAnchors = false }: CalendarDocProps) {
  return (
    <TutorialScaffold component="Calendar" kind="display" oneLineExample={`<Calendar value={new Date()} onChange={setDate} />`}>
    <section className="button-doc calendar-doc" aria-labelledby="calendar-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Calendar 文档目录">
            {calendarDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="calendar-doc-title">{calendarDocMeta.title}</h2>
            <p>
              用于按月浏览日期状态、事件和标记。Calendar 是独立展示组件，不与 DatePicker 合并文档；
              当前覆盖 month grid、selected date、events/marks、month navigation、Today、键盘网格 ARIA、
              Intl/local labels 和 mobile compact。
            </p>
          </header>

          <section className="button-doc-section" id="calendar-when" aria-labelledby="calendar-when-title">
            <h3 id="calendar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要常驻展示一个月内的发布、排期、提醒或状态密度时使用。</li>
              <li>用户需要在月视图中移动焦点、选择日期并查看当天标记时使用。</li>
              <li>如果只是表单里选择一个日期，使用 DatePicker；如果需要复杂排班拖拽，交给业务组件扩展。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="calendar-demos" aria-labelledby="calendar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="calendar-demos-title">代码演示</h3>
              <p>示例覆盖月视图、选中日期、事件/标记、月份导航、本地化、紧凑移动布局和自定义日期内容。</p>
            </div>
            <div className="button-doc-demo-grid calendar-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="calendar-api" aria-labelledby="calendar-api-title">
            <h3 id="calendar-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="calendar-keyboard" aria-labelledby="calendar-keyboard-title">
            <h3 id="calendar-keyboard-title">键盘与 ARIA</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="calendar-year" aria-labelledby="calendar-year-title">
            <h3 id="calendar-year-title">年视图</h3>
            <DataTable rows={yearRows} />
          </section>

          <section className="button-doc-section" id="calendar-i18n" aria-labelledby="calendar-i18n-title">
            <h3 id="calendar-i18n-title">Intl 与标签</h3>
            <DataTable rows={i18nRows} />
          </section>

          <section className="button-doc-section" id="calendar-mobile" aria-labelledby="calendar-mobile-title">
            <h3 id="calendar-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="calendar-security" aria-labelledby="calendar-security-title">
            <h3 id="calendar-security-title">安全文本</h3>
            <DataTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="calendar-semantic" aria-labelledby="calendar-semantic-title">
            <h3 id="calendar-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="calendar-token" aria-labelledby="calendar-token-title">
            <h3 id="calendar-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="calendar-experts" aria-labelledby="calendar-experts-title">
            <h3 id="calendar-experts-title">五专家小组结论</h3>
            <Table
              caption="Calendar 专项五专家结论"
              columns={expertColumns}
              data={expertRows}
              rowKey="expert"
              scrollLabel="Calendar expert conclusions"
              scrollX={760}
            />
          </section>

          <section className="button-doc-section" id="calendar-faq" aria-labelledby="calendar-faq-title">
            <h3 id="calendar-faq-title">FAQ</h3>
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
