import { useState, type ReactNode } from "react";
import { Tag } from "../components/base/Tag";
import { Tree, type TreeNode } from "../components/base/Tree";
import { TutorialScaffold } from "./TutorialScaffold";

type ComponentDocMeta = {
  anchors: Array<{ id: string; label: string }>;
  category: string;
  title: string;
};

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

export type TreeDocProps = {
  showAnchors?: boolean;
};

export const treeDocMeta = {
  title: "Tree 树形控件",
  category: "基础组件",
  anchors: [
    { id: "tree-when", label: "何时使用" },
    { id: "tree-demos", label: "代码演示" },
    { id: "tree-api", label: "API" },
    { id: "tree-keyboard", label: "Keyboard" },
    { id: "tree-semantic", label: "Semantic DOM" },
    { id: "tree-performance", label: "Performance" },
    { id: "tree-mobile", label: "Mobile" },
    { id: "tree-review", label: "五专家结论" },
  ],
} satisfies ComponentDocMeta;

const workspaceTree: TreeNode[] = [
  {
    key: "docs",
    label: "Documentation",
    children: [
      { key: "docs-overview", label: "Overview" },
      { key: "docs-components", label: "Components" },
      {
        key: "docs-review",
        label: "Review notes",
        children: [
          { key: "docs-review-product", label: "Product summary" },
          { key: "docs-review-a11y", label: "Accessibility checklist" },
        ],
      },
    ],
  },
  {
    key: "src",
    label: "src",
    children: [
      {
        key: "src-components",
        label: "components",
        children: [
          { key: "src-components-base", label: "base" },
          { key: "src-components-business", label: "business" },
        ],
      },
      { key: "src-docs", label: "docs" },
    ],
  },
  {
    key: "archive",
    label: "Archived experiments",
    disabled: true,
    children: [{ key: "archive-v1", label: "Legacy draft" }],
  },
];

const permissionTree: TreeNode[] = [
  {
    key: "workspace",
    label: "Workspace access",
    children: [
      {
        key: "workspace-docs",
        label: "Docs",
        children: [
          { key: "workspace-docs-read", label: "Read" },
          { key: "workspace-docs-write", label: "Write" },
        ],
      },
      {
        key: "workspace-settings",
        label: "Settings",
        children: [
          { key: "workspace-settings-read", label: "Read" },
          { key: "workspace-settings-admin", label: "Admin", disabled: true },
        ],
      },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    children: [
      { key: "billing-read", label: "Read invoices" },
      { key: "billing-export", label: "Export reports" },
    ],
  },
];

const reviewTree: TreeNode[] = [
  {
    key: "review",
    label: "Review scope",
    children: [
      { key: "review-product", label: "Product expert" },
      { key: "review-ui", label: "UI expert" },
      { key: "review-dev", label: "Engineering expert" },
      { key: "review-test", label: "Testing expert" },
      { key: "review-security", label: "White-hat expert" },
    ],
  },
  {
    key: "evidence",
    label: "Evidence",
    children: [
      { key: "evidence-desktop", label: "Desktop run" },
      { key: "evidence-mobile", label: "Mobile run" },
    ],
  },
];

const unsafeTree: TreeNode[] = [
  {
    key: "safe-root",
    label: "安全文本边界",
    children: [
      { key: "literal-img", label: "<img src=x onerror=alert(1)>" },
      { key: "long-label", label: "Very long tree node label that should stay inside the tree scroller on narrow mobile screens" },
    ],
  },
];

const largeTree: TreeNode[] = Array.from({ length: 18 }, (_, sectionIndex) => ({
  key: `section-${sectionIndex + 1}`,
  label: `Section ${sectionIndex + 1}`,
  children: Array.from({ length: 8 }, (_, itemIndex) => ({
    key: `section-${sectionIndex + 1}-item-${itemIndex + 1}`,
    label: `Item ${itemIndex + 1}`,
    children: Array.from({ length: 4 }, (_, leafIndex) => ({
      key: `section-${sectionIndex + 1}-item-${itemIndex + 1}-leaf-${leafIndex + 1}`,
      label: `Leaf ${leafIndex + 1}`,
    })),
  })),
}));

const apiRows: DocRow[] = [
  {
    name: "treeData",
    value: "TreeNode[]",
    description: "必填。节点包含 key、label、children、disabled；TreeNode 与 TreeSelectNode 独立定义。",
  },
  {
    name: "expandedKeys / defaultExpandedKeys",
    value: "string[]",
    description: "受控或非受控展开节点。只影响当前 Tree，不和选择值或 checkbox 值混用。",
  },
  {
    name: "selectedKeys / defaultSelectedKeys",
    value: "string[]",
    description: "受控或非受控选择节点。single 模式最多保留一个，multiple 模式支持多选切换。",
  },
  {
    name: "checkedKeys / defaultCheckedKeys",
    value: "string[]",
    description: "checkable 开启后可用；父节点勾选会批量处理可用后代，并跳过 disabled 节点。",
  },
  {
    name: "onExpandedKeysChange",
    value: "(keys, info) => void",
    description: "展开/折叠时触发，info 返回触发 key 和原始 TreeNode。",
  },
  {
    name: "onSelectedKeysChange",
    value: "(keys, info) => void",
    description: "点击节点、Enter 或 Space 选择时触发。multiple 模式支持 Cmd/Ctrl/Shift 附加选择；键盘连续多选不包含范围选择。",
  },
  {
    name: "onCheckedKeysChange",
    value: "(keys, info) => void",
    description: "checkbox 状态变化时触发，info.checked 表示本次操作是勾选还是取消。",
  },
  {
    name: "disabled / emptyText / ariaLabel",
    value: "boolean / ReactNode / string",
    description: "控制整棵树禁用、空态文案和无外部标题时的可访问名称。",
  },
  {
    name: "maxVisibleNodes",
    value: "number",
    description: "默认 800。限制一次进入 DOM 的可见节点数量；折叠分支仍不渲染，超大树应配合搜索、分页或虚拟窗口扩展。",
  },
  {
    name: "unsupported",
    value: "drag-and-drop / async load",
    description: "当前生产边界不内置拖拽排序或异步加载；如需 DnD，应以独立扩展重新评估拖入子节点、禁用节点、键盘和移动端语义。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "ArrowUp / ArrowDown",
    value: "move active",
    description: "在可见且未禁用的节点之间移动 active descendant，不把每个节点放进 Tab 序列。",
  },
  {
    name: "ArrowRight",
    value: "expand or enter child",
    description: "有子节点且未展开时展开；已展开时移动到第一个可用子节点。",
  },
  {
    name: "ArrowLeft",
    value: "collapse or parent",
    description: "已展开分支会折叠；叶子或已折叠分支移动到父节点。",
  },
  {
    name: "Home / End",
    value: "first / last",
    description: "跳到第一个或最后一个可用可见节点。",
  },
  {
    name: "Enter / Space",
    value: "select / check",
    description: "Enter 触发选择；Space 在 checkable 模式切换 checkbox，否则触发选择。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "div[role=tree]",
    description: "根节点承载 aria-activedescendant、aria-label 和键盘事件。",
  },
  {
    name: "item",
    value: "div[role=treeitem]",
    description: "每个可见节点声明 aria-level、aria-posinset、aria-setsize、aria-expanded 和 aria-selected。",
  },
  {
    name: "multiple select",
    value: "aria-multiselectable",
    description: "非 checkable 且 selectionMode=multiple 时根节点暴露多选语义，节点继续用 aria-selected 表达状态。",
  },
  {
    name: "checkable item",
    value: "aria-checked=true | false | mixed",
    description: "半选态用 mixed 暴露；视觉 checkbox 是按钮，但不进入 Tab 序列。",
  },
  {
    name: "disabled",
    value: "aria-disabled",
    description: "禁用节点不可选择、不可勾选、不可展开；批量勾选会跳过其子树。",
  },
];

const performanceRows: DocRow[] = [
  {
    name: "flatten",
    value: "iterative stack",
    description: "构建索引用显式栈，不在 render 路径递归渲染深树，降低 large-ish 数据的调用栈风险。",
  },
  {
    name: "visibility",
    value: "expanded ancestor filter",
    description: "只渲染当前可见节点；折叠分支的后代不进入 DOM。",
  },
  {
    name: "scope",
    value: "render budget",
    description: "默认最多渲染 800 个可见节点，避免数万节点一次性炸 DOM；真正的虚拟窗口、搜索和拖拽排序应后续单独扩展。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "touch target",
    value: "44px coarse pointer",
    description: "移动端和触屏环境提升行高与按钮命中区域。",
  },
  {
    name: "overflow",
    value: "horizontal safe",
    description: "树容器允许横向滚动，深层缩进不会撑破页面主布局。",
  },
  {
    name: "density",
    value: "compact visual",
    description: "保持低阴影、中性边框和可扫描行距，不使用抽屉或 TreeSelect 的表单浮层模式。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "Tree != TreeSelect",
    description: "产品专家：Tree 负责浏览和操作层级结构，不承担表单下拉取值；文档、API 和路由均独立。",
  },
  {
    name: "UI",
    value: "neutral minimal neutral",
    description: "UI 专家：保留近白底、细边框、低阴影和小半径，使用展开符与 checkbox 状态表达层级。",
  },
  {
    name: "研发",
    value: "controlled state",
    description: "研发专家：expanded/selected/checked 都支持受控和非受控；flatten/index 用迭代流程避免深递归风险。",
  },
  {
    name: "测试",
    value: "keyboard + disabled + mobile",
    description: "测试专家：验收覆盖展开折叠、选择、多选、半选态、禁用子树、空态、长树、窄屏和 docs smoke；拖拽为未支持边界。",
  },
  {
    name: "白帽",
    value: "no html injection",
    description: "白帽专家：label 接收 ReactNode 但组件不使用 innerHTML；危险字符按普通文本显示，key 仅经字符清洗后进入 DOM id。",
  },
];

function ControlledTreeDemo() {
  const [selectedKeys, setSelectedKeys] = useState(["docs-components"]);
  const [expandedKeys, setExpandedKeys] = useState(["docs", "src", "src-components"]);

  return (
    <div className="tree-doc-controlled">
      <Tree
        ariaLabel="Workspace files"
        defaultExpandedKeys={["docs"]}
        expandedKeys={expandedKeys}
        onExpandedKeysChange={setExpandedKeys}
        onSelectedKeysChange={setSelectedKeys}
        selectedKeys={selectedKeys}
        treeData={workspaceTree}
      />
      <div className="tree-doc-state" aria-live="polite">
        <Tag tone="subtle">selected: {selectedKeys[0] ?? "none"}</Tag>
        <Tag tone="subtle">expanded: {expandedKeys.length}</Tag>
      </div>
    </div>
  );
}

function CheckableTreeDemo() {
  const [checkedKeys, setCheckedKeys] = useState(["workspace-docs-read"]);

  return (
    <div className="tree-doc-controlled">
      <Tree
        ariaLabel="Permission tree"
        checkable
        checkedKeys={checkedKeys}
        defaultExpandedKeys={["workspace", "workspace-docs", "workspace-settings", "billing"]}
        onCheckedKeysChange={setCheckedKeys}
        selectionMode="multiple"
        treeData={permissionTree}
      />
      <div className="tree-doc-state" aria-live="polite">
        <Tag tone="subtle">{checkedKeys.length} checked</Tag>
        <Tag tone="subtle">disabled admin skipped</Tag>
      </div>
    </div>
  );
}

function MultiSelectTreeDemo() {
  const [selectedKeys, setSelectedKeys] = useState(["review-product", "review-test"]);

  return (
    <div className="tree-doc-controlled">
      <Tree
        ariaLabel="Review checklist"
        defaultExpandedKeys={["review", "evidence"]}
        onSelectedKeysChange={setSelectedKeys}
        selectedKeys={selectedKeys}
        selectionMode="multiple"
        treeData={reviewTree}
      />
      <div className="tree-doc-state" aria-live="polite">
        <Tag tone="subtle">{selectedKeys.length} selected</Tag>
        <Tag tone="subtle">Cmd/Ctrl/Shift click adds nodes</Tag>
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础层级",
    description: "默认展开常用分支，点击节点选择，点击箭头展开或折叠。",
    preview: <ControlledTreeDemo />,
    code: `<Tree ariaLabel="Workspace files" treeData={workspaceTree} expandedKeys={expandedKeys} selectedKeys={selectedKeys} onExpandedKeysChange={setExpandedKeys} onSelectedKeysChange={setSelectedKeys} />`,
  },
  {
    title: "可勾选权限树",
    description: "checkable 支持父子联动、半选态和 disabled 子树跳过。",
    preview: <CheckableTreeDemo />,
    code: `<Tree checkable ariaLabel="Permission tree" treeData={permissionTree} checkedKeys={checkedKeys} defaultExpandedKeys={["workspace", "workspace-docs", "workspace-settings", "billing"]} onCheckedKeysChange={setCheckedKeys} />`,
  },
  {
    title: "多选浏览树",
    description: "selectionMode=multiple 使用 aria-multiselectable；点击会切换节点，Cmd/Ctrl/Shift 点击保留已有选择。",
    preview: <MultiSelectTreeDemo />,
    code: `<Tree ariaLabel="Review checklist" treeData={reviewTree} selectionMode="multiple" selectedKeys={selectedKeys} defaultExpandedKeys={["review", "evidence"]} onSelectedKeysChange={setSelectedKeys} />`,
  },
  {
    title: "Large-ish data",
    description: "折叠渲染可见节点，内部索引使用迭代栈构建，适合中等规模层级数据。",
    preview: (
      <Tree
        ariaLabel="Large-ish tree"
        defaultExpandedKeys={["section-1", "section-1-item-1", "section-2"]}
        maxVisibleNodes={40}
        treeData={largeTree}
      />
    ),
    code: `<Tree ariaLabel="Large-ish tree" treeData={largeTree} defaultExpandedKeys={["section-1", "section-1-item-1", "section-2"]} maxVisibleNodes={40} />`,
  },
  {
    title: "长文本与安全文本",
    description: "长标签在树容器内横向滚动，危险字符按普通文本渲染，不创建 HTML 节点。",
    preview: <Tree ariaLabel="Unsafe text tree" defaultExpandedKeys={["safe-root"]} treeData={unsafeTree} />,
    code: `<Tree ariaLabel="Unsafe text tree" treeData={unsafeTree} defaultExpandedKeys={["safe-root"]} />`,
  },
  {
    title: "空态和禁用",
    description: "空数据仍提供 role=tree 和状态文案；整棵树可进入禁用状态。",
    preview: <Tree ariaLabel="Empty disabled tree" disabled emptyText="No available nodes" treeData={[]} />,
    code: `<Tree disabled ariaLabel="Empty disabled tree" emptyText="No available nodes" treeData={[]} />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="button-doc-demo tree-doc-demo">
      <div className="button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="button-doc-demo__preview tree-doc-demo__preview">{preview}</div>
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

export function TreeDoc({ showAnchors = false }: TreeDocProps) {
  return (
    <TutorialScaffold component="Tree" kind="display" oneLineExample={`<Tree items={items} defaultExpandedKeys={["root"]} />`}>
    <section className="button-doc tree-doc" aria-labelledby="tree-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Tree 文档目录">
            {treeDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="tree-doc-title">{treeDocMeta.title}</h2>
            <p>
              展示和操作层级数据的自有基础组件。Tree 不依赖 antd 系组件，也不复用 TreeSelect 文档：
              TreeSelect 是表单选择器，Tree 是页面内的层级浏览、选择和勾选控件。
              拖拽排序不在当前组件边界内，避免把 DnD、异步加载和表单树选择语义混在一起。
            </p>
          </header>

          <section className="button-doc-section" id="tree-when" aria-labelledby="tree-when-title">
            <h3 id="tree-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>需要展示文件、权限、组织、资源目录等嵌套层级。</li>
              <li>需要在页面内展开、折叠、选择或批量勾选节点。</li>
              <li>需要在表单输入框中弹出树形选择时，应使用 TreeSelect，而不是把 Tree 包进 Select 文档。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="tree-demos" aria-labelledby="tree-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="tree-demos-title">代码演示</h3>
              <p>覆盖 nested nodes、expand/collapse、select、multiple、checkable、disabled、空态、XSS 文本安全和 large-ish 长树数据。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="tree-api" aria-labelledby="tree-api-title">
            <h3 id="tree-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="tree-keyboard" aria-labelledby="tree-keyboard-title">
            <h3 id="tree-keyboard-title">Keyboard</h3>
            <DataTable rows={keyboardRows} />
          </section>

          <section className="button-doc-section" id="tree-semantic" aria-labelledby="tree-semantic-title">
            <h3 id="tree-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="tree-performance" aria-labelledby="tree-performance-title">
            <h3 id="tree-performance-title">Performance</h3>
            <DataTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="tree-mobile" aria-labelledby="tree-mobile-title">
            <h3 id="tree-mobile-title">Mobile</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="tree-review" aria-labelledby="tree-review-title">
            <h3 id="tree-review-title">五专家结论</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
      </TutorialScaffold>
);
}
