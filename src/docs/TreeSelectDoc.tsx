import { useState, type ReactNode } from "react";
import { TreeSelect, type TreeSelectNode, type TreeSelectValue } from "../components/base";
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

export type TreeSelectDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<TreeSelect allowClear label="负责团队" treeData={orgTreeData} />`;

export const treeSelectDocMeta = {
  title: "TreeSelect 树选择",
  category: "基础组件",
  anchors: [
    { id: "tree-select-when", label: "何时使用" },
    { id: "tree-select-demos", label: "代码演示" },
    { id: "tree-select-api", label: "API" },
    { id: "tree-select-keyboard", label: "键盘" },
    { id: "tree-select-semantic", label: "Semantic DOM" },
    { id: "tree-select-a11y", label: "可访问性" },
    { id: "tree-select-mobile", label: "移动端" },
    { id: "tree-select-review", label: "生产验收" },
    { id: "tree-select-limits", label: "边界" },
  ],
} satisfies ComponentDocMeta;

const orgTreeData: TreeSelectNode[] = [
  {
    label: "产品中心",
    searchText: "产品中心 product",
    value: "product",
    children: [
      { label: "体验平台", searchText: "体验平台 experience", value: "product-experience" },
      { label: "增长工具", searchText: "增长工具 growth", value: "product-growth" },
      { disabled: true, label: "归档项目", searchText: "归档项目 archive", value: "product-archive" },
    ],
  },
  {
    label: "研发中心",
    searchText: "研发中心 engineering",
    value: "engineering",
    children: [
      {
        label: "组件平台",
        searchText: "组件平台 components",
        value: "engineering-components",
        children: [
          { label: "基础组件", searchText: "基础组件 base components", value: "engineering-components-base" },
          { label: "业务组件", searchText: "业务组件 business components", value: "engineering-components-business" },
        ],
      },
      { label: "质量效能", searchText: "质量效能 quality", value: "engineering-quality" },
    ],
  },
  {
    label: "运营中心",
    searchText: "运营中心 operations",
    value: "operations",
    children: [
      { label: "内容运营", searchText: "内容运营 content", value: "operations-content" },
      { label: "客户成功", searchText: "客户成功 success", value: "operations-success" },
    ],
  },
];

const longTreeData: TreeSelectNode[] = Array.from({ length: 18 }, (_, groupIndex) => ({
  label: `区域 ${groupIndex + 1}`,
  searchText: `区域 ${groupIndex + 1} region ${groupIndex + 1}`,
  value: `region-${groupIndex + 1}`,
  children: Array.from({ length: 12 }, (_, teamIndex) => ({
    label: `团队 ${groupIndex + 1}-${teamIndex + 1}`,
    searchText: `团队 ${groupIndex + 1}-${teamIndex + 1} team ${groupIndex + 1}-${teamIndex + 1}`,
    value: `region-${groupIndex + 1}-team-${teamIndex + 1}`,
  })),
}));

const safeTreeData: TreeSelectNode[] = [
  {
    label: "<img src=x onerror=alert(1)>",
    searchText: "literal html xss img onerror",
    value: "literal-html",
  },
  {
    label: "超长节点 / platform / cn-north / workspace / component / tree-select / ownership / 2026",
    searchText: "long node platform tree select ownership 2026",
    value: "long-safe-label",
  },
  {
    disabled: true,
    label: "禁用节点不会提交",
    searchText: "disabled node",
    value: "disabled-safe-node",
  },
];

const apiRows: DocRow[] = [
  {
    name: "treeData",
    value: "TreeSelectNode[]",
    description: "必填。节点包含 value、label、children、disabled 和 searchText；value 在整棵树中应唯一。",
  },
  {
    name: "value / defaultValue",
    value: "string | string[]",
    description: "单选使用 string，checkable 多选使用 string[]；受控时由调用方同步更新。",
  },
  {
    name: "allowClear",
    value: "boolean",
    description: "显示独立清除按钮。单选清为空字符串，checkable 多选清为空数组，并恢复 combobox 焦点。",
  },
  {
    name: "checkable",
    value: "boolean",
    description: "开启后使用复选状态，父节点选择会级联到未禁用子节点，并展示 mixed 半选状态。",
  },
  {
    name: "showSearch / searchValue",
    value: "boolean / string",
    description: "默认开启搜索。searchValue 与 onSearchChange 可受控筛选关键字，命中子节点时保留祖先上下文。",
  },
  {
    name: "expandedKeys",
    value: "string[]",
    description: "控制展开节点。默认展开第一层有子节点的分支，可用 onExpandedKeysChange 接管。",
  },
  {
    name: "open / defaultOpen",
    value: "boolean",
    description: "控制弹层打开状态。Escape 或外部点击会触发 onOpenChange(false)。",
  },
  {
    name: "onValueChange",
    value: "(value, info) => void",
    description: "值变化回调。info.node 是本次操作节点，selectedNodes 是当前选中节点快照。",
  },
  {
    name: "label / helpText / errorText",
    value: "ReactNode",
    description: "字段标签、辅助说明和错误说明会自动连接 htmlFor、aria-describedby 和 aria-invalid。",
  },
  {
    name: "mobileMode",
    value: '"popover" | "sheet"',
    description: "移动端可选择贴近控件的弹层或底部 sheet 式弹层。默认 popover。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "ArrowDown / ArrowUp",
    value: "移动 active 节点",
    description: "弹层关闭时方向键会先打开弹层；打开后在可用节点之间移动。",
  },
  {
    name: "Enter / Space",
    value: "选择节点",
    description: "单选提交当前节点并关闭弹层；checkable 切换当前节点及其未禁用子节点。",
  },
  {
    name: "ArrowRight / ArrowLeft",
    value: "展开 / 收起",
    description: "当前节点存在子节点时控制展开状态，不改变选中值。",
  },
  {
    name: "Home / End",
    value: "首尾跳转",
    description: "跳到当前可见候选项的第一个或最后一个可用节点。",
  },
  {
    name: "Escape",
    value: "关闭弹层",
    description: "关闭树弹层并清空临时搜索词，焦点保持在 combobox 输入框。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "field",
    value: "div.c-tree-select-field",
    description: "字段容器负责标签、帮助文本、错误态、隐藏表单值和弹层定位。",
  },
  {
    name: "trigger",
    value: 'input[role="combobox"]',
    description: "焦点留在输入框，通过 aria-expanded、aria-controls 和 aria-activedescendant 指向树节点。",
  },
  {
    name: "popup",
    value: 'div[role="tree"]',
    description: "弹层主体使用 tree 语义，节点使用 treeitem、aria-level、aria-expanded 和 aria-selected。",
  },
  {
    name: "checkable",
    value: "aria-checked",
    description: "多选节点用 aria-checked=true/false/mixed 表达复选状态，不混用 listbox option。",
  },
];

const accessibilityRows: DocRow[] = [
  {
    name: "Name",
    value: "label + htmlFor",
    description: "可见标签直接绑定 combobox 输入框；无标签场景可传 aria-label。",
  },
  {
    name: "Active item",
    value: "aria-activedescendant",
    description: "键盘焦点不进入每个节点，屏幕阅读器仍能获知当前 active treeitem。",
  },
  {
    name: "Disabled",
    value: "aria-disabled + button disabled",
    description: "禁用节点不可被选择，展开按钮也会禁用；父节点级联会跳过禁用子节点。",
  },
  {
    name: "Search",
    value: "aria-autocomplete=list",
    description: "搜索只过滤展示结果，不直接提交输入值；选择必须来自真实树节点。",
  },
  {
    name: "Safe text",
    value: "React escaped text",
    description: "字符串 label 按普通文本渲染，不走 HTML 注入路径，危险字符不会被解析为节点。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Touch target",
    value: "44px",
    description: "移动端输入框和树节点都保持 44px 左右高度，便于触控选择。",
  },
  {
    name: "Sheet mode",
    value: 'mobileMode="sheet"',
    description: "窄屏时可把弹层固定到底部，限制最大高度并使用内部滚动。",
  },
  {
    name: "Keyboard",
    value: "input remains focused",
    description: "搜索时软键盘不反复丢焦；选择节点后由组件决定关闭或保留弹层。",
  },
];

const limitRows: DocRow[] = [
  {
    name: "Tree / Cascader",
    value: "不合并",
    description: "TreeSelect 是表单选择控件；Tree 是独立树视图，Cascader 是逐级路径选择，文档和 API 不混写。",
  },
  {
    name: "Virtual list",
    value: "暂不支持",
    description: "当前实现限制索引 10000 个节点、深度 64 层、可见渲染 160 项并提示继续搜索。超大数据量需要独立虚拟化与异步加载设计。",
  },
  {
    name: "Budget guard",
    value: "10000 / 64 / 160",
    description: "索引、展开、搜索、级联勾选和键盘 active 都复用预算内节点，避免深树或数万节点一次性撑爆 DOM。",
  },
  {
    name: "Custom tag render",
    value: "暂不支持",
    description: "多选摘要保持简洁文本；复杂标签输入应拆成专门的 TokenInput 或 Transfer 方案。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "层级选择",
    description: "覆盖展开、选择、checkable 多选、清除、搜索、禁用节点、长树和移动端 sheet。",
  },
  {
    name: "UI 专家",
    value: "一行样例",
    description: "每个 demo 是独立一行，输入框、弹层和长文本都限制在容器内。",
  },
  {
    name: "研发专家",
    value: "自有实现",
    description: "只使用 React 与本仓库工具函数，不引入 antd、Tree、Cascader 或 Select 的实现模型，并带索引/深度/渲染预算。",
  },
  {
    name: "测试专家",
    value: "可回归",
    description: "文档提供基础、受控、多选、错误、长树与安全文本样例，smoke 可直接驱动 #tree-select。",
  },
  {
    name: "白帽专家",
    value: "XSS 文本安全",
    description: "危险字符以字符串展示，隐藏值来自 value 字段，禁用节点不会被点击或键盘提交。",
  },
];

function ControlledTreeSelectDemo() {
  const [value, setValue] = useState<TreeSelectValue>("engineering-components-base");

  return (
    <div className="select-doc-controlled">
      <TreeSelect
        allowClear
        helpText="选择值由 React state 控制。"
        label="归属团队"
        onValueChange={setValue}
        treeData={orgTreeData}
        value={value}
      />
      <span className="select-doc-controlled__value">当前值：{String(value)}</span>
    </div>
  );
}

function CheckableTreeSelectDemo() {
  const [value, setValue] = useState<TreeSelectValue>(["engineering-components-base", "engineering-quality"]);

  return (
    <TreeSelect
      allowClear
      checkable
      defaultOpen
      helpText="父节点会级联切换未禁用的子节点。"
      label="可见范围"
      mobileMode="sheet"
      name="visibilityScope"
      onValueChange={setValue}
      placeholder="选择多个范围"
      treeData={orgTreeData}
      value={value}
    />
  );
}

const demos: Demo[] = [
  {
    title: "基础树选择",
    description: "适合组织、分类、区域等层级值，输入框保持 combobox 语义。",
    preview: (
      <TreeSelect
        allowClear
        helpText="输入关键字可过滤树节点。"
        label="负责团队"
        name="team"
        placeholder="选择团队"
        treeData={orgTreeData}
      />
    ),
    code: `<TreeSelect
  allowClear
  label="负责团队"
  name="team"
  placeholder="选择团队"
  helpText="输入关键字可过滤树节点。"
  treeData={orgTreeData}
/>`,
  },
  {
    title: "受控选择",
    description: "value 与 onValueChange 可用于筛选栏、权限表单和详情编辑。",
    preview: <ControlledTreeSelectDemo />,
    code: `const [value, setValue] = useState<TreeSelectValue>("engineering-components-base");

<TreeSelect
  allowClear
  label="归属团队"
  value={value}
  onValueChange={setValue}
  treeData={orgTreeData}
/>`,
  },
  {
    title: "可勾选多选",
    description: "checkable 模式提供多选、半选、父子级联和移动端 sheet 演示。",
    preview: <CheckableTreeSelectDemo />,
    code: `<TreeSelect
  allowClear
  checkable
  defaultOpen
  mobileMode="sheet"
  name="visibilityScope"
  label="可见范围"
  placeholder="选择多个范围"
  treeData={orgTreeData}
/>`,
  },
  {
    title: "错误状态",
    description: "错误提示会进入 aria-describedby，并同步 aria-invalid。",
    preview: (
      <TreeSelect
        errorText="请选择一个未禁用的可流转节点。"
        label="审批节点"
        placeholder="选择审批节点"
        treeData={orgTreeData}
      />
    ),
    code: `<TreeSelect
  label="审批节点"
  placeholder="选择审批节点"
  errorText="请选择一个未禁用的可流转节点。"
  treeData={orgTreeData}
/>`,
  },
  {
    title: "长树性能",
    description: "大候选集限制首屏渲染数量，并通过搜索继续收敛结果。",
    preview: (
      <TreeSelect
        defaultOpen
        helpText="当前样例含 234 个节点，弹层只渲染前 160 项。"
        label="覆盖区域"
        placeholder="搜索区域或团队"
        treeData={longTreeData}
      />
    ),
    code: `<TreeSelect
  defaultOpen
  label="覆盖区域"
  placeholder="搜索区域或团队"
  treeData={longTreeData}
/>`,
  },
  {
    title: "安全文本与禁用",
    description: "危险字符按普通文本展示，超长节点可换行，禁用项不会提交。",
    preview: (
      <TreeSelect
        defaultOpen
        helpText="label 字符串不会被解析为 HTML。"
        label="安全节点"
        placeholder="搜索 long 或 xss"
        treeData={safeTreeData}
      />
    ),
    code: `<TreeSelect
  defaultOpen
  label="安全节点"
  placeholder="搜索 long 或 xss"
  helpText="label 字符串不会被解析为 HTML。"
  treeData={safeTreeData}
/>`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo tree-select-doc-demo">
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

export function TreeSelectDoc({ showAnchors = false }: TreeSelectDocProps) {
  return (
    <TutorialScaffold component="TreeSelect" kind="data-entry" oneLineExample={oneLineExample} overlay>
    <section className="button-doc tree-select-doc" aria-labelledby="tree-select-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="TreeSelect 文档目录">
            {treeSelectDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tree-select-doc-title">{treeSelectDocMeta.title}</h2>
            <p>
              面向层级数据选择的自有基础组件。TreeSelect 独立实现 tree combobox、搜索、清除、可选
              checkable、多键盘路径和移动端弹层，不依赖 antd 系组件，也不与 Tree 或 Cascader 合并文档。
            </p>
          </header>

          <section className="button-doc-section" id="tree-select-when" aria-labelledby="tree-select-when-title">
            <h3 id="tree-select-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用户需要从组织、分类、权限范围等树形结构中选择单个或多个节点。</li>
              <li>选择结果需要作为表单字段出现，同时候选项需要保留层级关系。</li>
              <li>只浏览树结构时使用 Tree；需要按路径逐级钻取时使用 Cascader。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tree-select-demos" aria-labelledby="tree-select-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tree-select-demos-title">代码演示</h3>
              <p>覆盖基础、受控、多选勾选、清除、错误帮助和移动端 sheet。</p>
            </div>
            <div className="button-doc-demo-grid tree-select-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="tree-select-api" aria-labelledby="tree-select-api-title">
            <h3 id="tree-select-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="tree-select-keyboard" aria-labelledby="tree-select-keyboard-title">
            <h3 id="tree-select-keyboard-title">键盘</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="tree-select-semantic" aria-labelledby="tree-select-semantic-title">
            <h3 id="tree-select-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="tree-select-a11y" aria-labelledby="tree-select-a11y-title">
            <h3 id="tree-select-a11y-title">可访问性</h3>
            <DataTable rows={accessibilityRows} />
          </section>

          <section className="button-doc-section" id="tree-select-mobile" aria-labelledby="tree-select-mobile-title">
            <h3 id="tree-select-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="tree-select-review" aria-labelledby="tree-select-review-title">
            <h3 id="tree-select-review-title">生产验收</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="tree-select-limits" aria-labelledby="tree-select-limits-title">
            <h3 id="tree-select-limits-title">边界</h3>
            <DataTable rows={limitRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
