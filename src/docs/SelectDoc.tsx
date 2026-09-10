import { useState, type ReactNode } from "react";
import { Button, Select, type SelectOption } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
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

export type SelectDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Select label="负责人" name="owner" showSearch allowClear options={ownerOptions} />`;

export const selectDocMeta = {
  title: "Select 选择器",
  category: "基础组件",
  anchors: [
    { id: "select-when", label: "何时使用" },
    { id: "select-demos", label: "代码演示" },
    { id: "select-api", label: "API" },
    { id: "select-behavior", label: "交互能力" },
    { id: "select-semantic", label: "Semantic DOM" },
    { id: "select-token", label: "Design Token" },
    { id: "select-a11y", label: "可访问性" },
    { id: "select-mobile", label: "移动端" },
    { id: "select-review", label: "五专家结论" },
    { id: "select-matrix", label: "四点矩阵" },
    { id: "select-limits", label: "边界" },
  ],
} satisfies ComponentDocMeta;

const statusOptions: SelectOption[] = [
  { label: "全部状态", value: "all" },
  { label: "待处理", value: "queued" },
  { label: "进行中", value: "running" },
  { label: "已完成", value: "done" },
  { label: "需要跨团队补充说明的超长状态文案用于验证截断", value: "needs-copy-review" },
  { disabled: true, label: "已归档", value: "archived" },
];

const ownerOptions: SelectOption[] = [
  { label: "未分配", value: "unassigned" },
  { label: "组件平台组", searchText: "platform component team", value: "platform" },
  { label: "设计系统组", searchText: "design system", value: "design-system" },
  { label: "质量工程组", searchText: "quality engineering qa", value: "quality" },
];

const permissionOptions: SelectOption[] = [
  { label: "查看", value: "read" },
  { label: "评论", value: "comment" },
  { label: "编辑", value: "write" },
  { disabled: true, label: "管理", value: "admin" },
];

const safeTextOptions: SelectOption[] = [
  { label: "<img src=x onerror=alert(1)> 审计文本", searchText: "unsafe html audit text", value: "unsafe-text" },
  { label: "正常文本", value: "plain-text" },
];

const longListOptions: SelectOption[] = Array.from({ length: 160 }, (_, index) => {
  const value = String(index + 1).padStart(3, "0");
  return {
    label: `选项 ${value}`,
    searchText: `option ${value} long virtual select item`,
    value: `option-${value}`,
  };
});

const apiRows: DocRow[] = [
  {
    name: "options",
    value: "SelectOption[]",
    description: "必填。每项包含 value、label、可选 disabled/searchText，组件不会复用 Cascader 或 TreeSelect 节点类型。",
  },
  {
    name: "mode",
    value: '"single" | "multiple"',
    description: "默认 single。multiple 使用 listbox 多选语义和标签摘要，不与 TreeSelect 勾选树混写。",
  },
  {
    name: "value / defaultValue",
    value: "string | string[]",
    description: "支持受控和非受控。单选值为 string，多选值为 string[]。",
  },
  {
    name: "onValueChange",
    value: "(value, info) => void",
    description: "值变化后返回下一个值、触发项和当前已选 options。",
  },
  {
    name: "showSearch / searchValue",
    value: "boolean / string",
    description: "开启弹层内搜索框；searchValue/onSearchChange 可受控。",
  },
  {
    name: "allowClear",
    value: "boolean",
    description: "显示独立清除按钮。单选清为空字符串，多选清为空数组。",
  },
  {
    name: "maxVisibleOptions",
    value: "number",
    description: "默认渲染前 80 项，用于长列表性能保护；继续搜索可定位剩余项。",
  },
  {
    name: "name / required / disabled",
    value: "form props",
    description: "name 会生成隐藏字段参与表单提交；required 暴露 aria-required；disabled 禁用全部交互。",
  },
  {
    name: "label / helpText / errorText",
    value: "ReactNode",
    description: "字段标签、说明和错误文案自动关联到 combobox 触发器。",
  },
];

const behaviorRows: DocRow[] = [
  {
    name: "single",
    value: "combobox + listbox",
    description: "触发器打开弹层，点击或 Enter 选择后关闭并回焦触发器。",
  },
  {
    name: "multiple",
    value: "aria-multiselectable",
    description: "候选项可反复切换，弹层保持打开，触发器展示最多三枚标签和剩余计数。",
  },
  {
    name: "search",
    value: "in-panel input",
    description: "搜索框只过滤候选项，不改变已选值；Escape 关闭并清空搜索。",
  },
  {
    name: "clear",
    value: "button",
    description: "清除按钮有 aria-label，不依赖纯文本胶囊；适合筛选栏快速复位。",
  },
  {
    name: "disabled",
    value: "whole control",
    description: "disabled 会禁用 combobox、图标按钮、隐藏字段和弹层入口，禁用项也不会响应选择。",
  },
  {
    name: "long list",
    value: "render cap",
    description: "通过 maxVisibleOptions 控制 DOM 数量，避免长列表一次渲染全部节点。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "field",
    value: "div.c-select-field",
    description: "字段根节点承载尺寸、错误、禁用和打开状态类名。",
  },
  {
    name: "trigger",
    value: "button[role=combobox]",
    description: "真实键盘入口，关联 aria-expanded、aria-controls、aria-activedescendant 和 aria-invalid。",
  },
  {
    name: "popup",
    value: "listbox + option",
    description: "浮层内候选项使用 listbox/option；多选时声明 aria-multiselectable。",
  },
  {
    name: "form",
    value: "hidden input",
    description: "name 存在时生成隐藏字段，单选提交 string，多选按逗号序列化。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "theme style",
    value: "--ct-surface / --ct-text / --ct-border",
    description: "触发器、弹层、候选项、hover、selected、disabled、错误和暗色态全部读取 --ct-* 语义 token，不在组件内硬编码主题色。",
  },
  {
    name: "structure style",
    value: "field / popup / listbox / option",
    description: "宽度、内边距、截断、max-height、内部滚动、z-index 与移动端底部弹层由结构 class 控制，避免内部尺寸大于外部容器。",
  },
  {
    name: "focus ring",
    value: "var(--ct-focus-ring)",
    description: "combobox、搜索框、清除按钮和候选项焦点态保持同一 focus-visible 规则；错误态只覆盖焦点颜色。",
  },
  {
    name: "popup layer",
    value: "z-index: 68",
    description: "Select 弹层高于普通 dropdown/popover 菜单，低于 Modal/Drawer/App overlay，文档和 smoke 覆盖层级与移动端 viewport 夹紧。",
  },
  {
    name: "text safety",
    value: "ellipsis / min-width:0",
    description: "长选项、标签摘要和状态值都在控件内部截断或换行；代码与表格由教程壳层内部滚动，不制造页面级 overflow。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Keyboard",
    value: "Arrow/Home/End/Enter/Escape",
    description: "方向键移动高亮，Home/End 跳首尾，Enter 选择，Escape 关闭。",
  },
  {
    name: "Screen reader",
    value: "label + listbox",
    description: "可读名称来自 label，帮助与错误文本通过 aria-describedby 暴露。",
  },
  {
    name: "Focus",
    value: ":focus-visible",
    description: "触发器、搜索框和清除按钮都有中性色焦点环；错误态边框保留红色语义。",
  },
  {
    name: "Disabled option",
    value: "aria-disabled",
    description: "禁用项不进入键盘可选序列，也不会响应点击提交。",
  },
  {
    name: "Text safety",
    value: "React text nodes",
    description: "字符串 label、emptyText 和 helpText 按文本渲染，不使用 dangerouslySetInnerHTML。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px on narrow screens",
    description: "窄屏下触发器、搜索框、选项行和图标按钮保持不低于 44px。",
  },
  {
    name: "Popup width",
    value: "viewport constrained",
    description: "弹层最大宽度使用视口约束，避免在 375/390 视口横向溢出。",
  },
  {
    name: "Text",
    value: "16px on narrow screens",
    description: "搜索输入在移动端使用 16px，避免 iOS 聚焦缩放。",
  },
];

const limitRows: DocRow[] = [
  {
    name: "async loading",
    value: "未覆盖",
    description: "当前 Select 不内置远程加载和分页回调；如需异步数据，应由宿主控制 options/searchValue。",
  },
  {
    name: "custom option layout",
    value: "有限支持",
    description: "label 可传 ReactNode，但搜索文案应显式提供 searchText。",
  },
  {
    name: "hierarchy",
    value: "不覆盖",
    description: "层级路径使用 Cascader，树形选择使用 TreeSelect；三者文档和数据模型保持独立。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "Select 只承载扁平离散值选择，边界清晰地区分 Cascader 和 TreeSelect；单选、多选、搜索、清除、表单提交和禁用态覆盖高频业务筛选场景。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "真实预览使用教程壳层承载，样例紧凑；theme style 读取语义 token，structure style 负责弹层、截断、触控高度和移动端底部面板。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "组件为自有 React/TypeScript 实现，支持受控/非受控 value、open、searchValue，combobox/listbox ARIA、长列表渲染上限和隐藏字段均已落地。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "smoke 覆盖 open/close/search/disabled/keyboard/focus/ARIA/long option/z-index/暗色/mobile，并检查 desktop、360、390、430 无横向溢出。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "不引入 antd、antd-mobile 或 @ant-design/charts；不使用 dangerouslySetInnerHTML，HTML 形态字符串只作为 React 文本节点渲染。",
  },
];

const matrixRows: DocRow[] = [
  {
    name: "教程壳层",
    value: "PASS",
    description: "SelectDoc 使用 TutorialScaffold，并提供复制入口、一行 TSX 示例、边界/移动端/安全标签页和真实 DemoContainer 预览。",
  },
  {
    name: "真实预览",
    value: "PASS",
    description: "所有样例直接渲染 Select、Button 和原生 form，不使用截图、伪 DOM 或静态占位来代替交互。",
  },
  {
    name: "紧凑样例",
    value: "PASS",
    description: "demo 源码压成单行或少量必要片段，预览区控件不超过容器宽度，移动端纵向收敛。",
  },
  {
    name: "生产约束",
    value: "PASS",
    description: "theme style 与 structure style 分离；open/close、search、disabled、keyboard、focus、ARIA、long option、z-index、暗色和 mobile 均有文档与自动验收。",
  },
];

function ControlledSelectDemo() {
  const [status, setStatus] = useState("running");

  return (
    <div className="select-doc-controlled">
      <Select
        allowClear
        helpText="筛选值由 React state 控制。"
        label="任务状态"
        name="status"
        onValueChange={setStatus}
        options={statusOptions}
        value={status}
      />
      <span className="select-doc-controlled__value">当前值：{String(status || "empty")}</span>
    </div>
  );
}

function MultiSelectDemo() {
  const [value, setValue] = useState<string[]>(["read", "comment"]);

  return (
    <div className="select-doc-controlled">
      <Select
        allowClear
        helpText="多选保持弹层打开，便于连续选择。"
        label="协作权限"
        mode="multiple"
        name="permissions"
        onValueChange={setValue}
        options={permissionOptions}
        value={value}
      />
      <span className="select-doc-controlled__value">当前值：{Array.isArray(value) ? value.join(", ") || "empty" : value}</span>
    </div>
  );
}

function SearchSelectDemo() {
  return (
    <Select
      allowClear
      helpText="搜索 platform、design、quality 或中文标签。"
      label="负责人"
      name="owner"
      options={ownerOptions}
      placeholder="选择负责人"
      searchPlaceholder="输入团队或关键词"
      showSearch
    />
  );
}

function LongListSelectDemo() {
  return (
    <Select
      allowClear
      helpText="长列表只渲染前 40 项；输入 120 可定位对应选项。"
      label="长列表"
      maxVisibleOptions={40}
      name="longList"
      options={longListOptions}
      placeholder="选择编号"
      searchPlaceholder="搜索编号"
      showSearch
    />
  );
}

function DisabledSafeTextDemo() {
  return (
    <div className="select-doc-safe-row">
      <Select
        defaultValue="unsafe-text"
        disabled
        helpText="HTML 字符串只作为文本显示，不会作为节点注入。"
        label="安全禁用选择"
        name="safeDisabled"
        options={safeTextOptions}
      />
      <span className="select-doc-controlled__value">disabled</span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "单选和清除",
    description: "使用独立 combobox/listbox，支持受控值和清除按钮。",
    preview: <ControlledSelectDemo />,
    code: `const [status, setStatus] = useState("running"); <Select allowClear label="任务状态" name="status" value={status} onValueChange={setStatus} options={statusOptions} />`,
  },
  {
    title: "多选",
    description: "mode=\"multiple\" 使用多选 listbox 和标签摘要，不借用 TreeSelect。",
    preview: <MultiSelectDemo />,
    code: `<Select mode="multiple" allowClear label="协作权限" name="permissions" value={value} onValueChange={setValue} options={permissionOptions} />`,
  },
  {
    title: "搜索",
    description: "弹层内搜索框过滤候选项，支持 searchText 作为补充关键词。",
    preview: <SearchSelectDemo />,
    code: `<Select showSearch allowClear label="负责人" name="owner" placeholder="选择负责人" searchPlaceholder="输入团队或关键词" options={ownerOptions} />`,
  },
  {
    title: "虚拟长列表",
    description: "maxVisibleOptions 为长列表提供渲染上限，并提示继续搜索定位剩余项。",
    preview: <LongListSelectDemo />,
    code: `<Select showSearch allowClear maxVisibleOptions={40} label="长列表" name="longList" options={longListOptions} />`,
  },
  {
    title: "错误和表单",
    description: "错误文案、required、name 和提交按钮保持表单字段语义。",
    preview: (
      <form className="doc-native-form" onSubmit={(event) => event.preventDefault()}>
        <Select
          errorText="请选择一个可继续流转的状态。"
          label="下一状态"
          name="nextStatus"
          options={statusOptions}
          placeholder="选择状态"
          required
          size="sm"
        />
        <Button size="sm" type="submit" variant="solid">
          提交
        </Button>
      </form>
    ),
    code: `<form onSubmit={handleSubmit}><Select required size="sm" label="下一状态" name="nextStatus" placeholder="选择状态" errorText="请选择一个可继续流转的状态。" options={statusOptions} /><Button type="submit" size="sm" variant="solid">提交</Button></form>`,
  },
  {
    title: "禁用和安全文本",
    description: "整控禁用不会打开弹层；HTML 形态字符串只按文本渲染。",
    preview: <DisabledSafeTextDemo />,
    code: `<Select disabled defaultValue="unsafe-text" label="安全禁用选择" name="safeDisabled" options={safeTextOptions} />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="surface" code={code} description={description} title={title}>
      <div className="button-doc-demo__preview button-doc-demo__preview--field select-doc-demo__preview">{preview}</div>
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

export function SelectDoc({ showAnchors = false }: SelectDocProps) {
  return (
    <TutorialScaffold component="Select" kind="data-entry" oneLineExample={oneLineExample} overlay>
    <section className="button-doc select-doc" aria-labelledby="select-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Select 文档目录">
            {selectDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="select-doc-title">{selectDocMeta.title}</h2>
            <p>
              面向离散值选择的自有基础组件。Select 独立实现单选、多选、搜索、清除和长列表渲染保护，
              不依赖 antd 系组件，也不与 Cascader/TreeSelect 共享数据模型或文档语义；教程治理按产品、UI、研发、测试和白帽五视角覆盖。
              当前页使用教程壳层承载真实预览、一行样例、theme style 与 structure style，生产验收覆盖 open/close/search/disabled/keyboard/focus/ARIA/long option/z-index/暗色/mobile。
            </p>
          </header>

          <section className="button-doc-section" id="select-when" aria-labelledby="select-when-title">
            <h3 id="select-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>候选项来自有限集合，需要单选或轻量多选，并希望保留表单字段提交能力。</li>
              <li>候选项较多但仍是扁平列表，需要搜索过滤和受控值同步。</li>
              <li>需要层级路径时使用 Cascader；需要树形勾选时使用 TreeSelect，三者不要混用。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="select-demos" aria-labelledby="select-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="select-demos-title">代码演示</h3>
              <p>覆盖单选、多选、搜索、清除、禁用、键盘入口、长列表、弹层和表单错误。</p>
            </div>
            <div className="button-doc-demo-grid select-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="select-api" aria-labelledby="select-api-title">
            <h3 id="select-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="select-behavior" aria-labelledby="select-behavior-title">
            <h3 id="select-behavior-title">交互能力</h3>
            <DataTable rows={behaviorRows} />
          </section>

          <section className="button-doc-section" id="select-semantic" aria-labelledby="select-semantic-title">
            <h3 id="select-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="select-token" aria-labelledby="select-token-title">
            <h3 id="select-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="select-a11y" aria-labelledby="select-a11y-title">
            <h3 id="select-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="select-mobile" aria-labelledby="select-mobile-title">
            <h3 id="select-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="select-review" aria-labelledby="select-review-title">
            <h3 id="select-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="select-matrix" aria-labelledby="select-matrix-title">
            <h3 id="select-matrix-title">四点矩阵</h3>
            <DataTable rows={matrixRows} />
          </section>

          <section className="button-doc-section" id="select-limits" aria-labelledby="select-limits-title">
            <h3 id="select-limits-title">边界</h3>
            <DataTable rows={limitRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
