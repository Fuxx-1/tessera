import { useState, type ReactNode } from "react";
import { Tag, Transfer, type TransferKey } from "../components/base";
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

export type TransferDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Transfer dataSource={members} defaultTargetKeys={["margaret"]} />`;

export const transferDocMeta = {
  title: "Transfer 穿梭框",
  category: "基础组件",
  anchors: [
    { id: "transfer-when", label: "何时使用" },
    { id: "transfer-demos", label: "代码演示" },
    { id: "transfer-api", label: "API" },
    { id: "transfer-model", label: "选择模型" },
    { id: "transfer-performance", label: "性能边界" },
    { id: "transfer-semantic", label: "Semantic DOM" },
    { id: "transfer-token", label: "Design Token" },
    { id: "transfer-a11y", label: "可访问性" },
    { id: "transfer-security", label: "安全" },
    { id: "transfer-review", label: "五专家结论" },
    { id: "transfer-mobile", label: "移动端" },
    { id: "transfer-faq", label: "FAQ" },
  ],
} satisfies ComponentDocMeta;

const members = [
  {
    key: "ada",
    label: "Ada Lovelace",
    description: "Runtime architecture reviewer",
    searchText: "ada lovelace runtime architecture reviewer",
  },
  {
    key: "grace",
    label: "Grace Hopper",
    description: "Compiler and platform owner",
    searchText: "grace hopper compiler platform owner",
  },
  {
    key: "katherine",
    label: "Katherine Johnson",
    description: "Mission planning lead",
    searchText: "katherine johnson mission planning lead",
  },
  {
    key: "margaret",
    label: "Margaret Hamilton",
    description: "Safety-critical systems",
    searchText: "margaret hamilton safety critical systems",
  },
  {
    key: "readonly",
    label: "Read-only external partner with a very long organization identifier",
    description: "Disabled item stays visible but cannot be selected or moved.",
    disabled: true,
    searchText: "readonly external partner disabled long organization identifier",
  },
];

const longMembers = Array.from({ length: 24 }, (_, index) => {
  const id = index + 1;
  return {
    key: `reviewer-${id}`,
    label: `Reviewer ${String(id).padStart(2, "0")}`,
    description: id % 4 === 0 ? "Long queue candidate with wrapped ownership metadata" : "Queue candidate",
    searchText: `reviewer ${id} long queue candidate ownership metadata`,
  };
});

const cappedMembers = Array.from({ length: 18 }, (_, index) => {
  const id = index + 1;
  return {
    key: `candidate-${id}`,
    label: `Candidate ${String(id).padStart(2, "0")}`,
    description:
      id === 7
        ? "Security note <script>alert(1)</script> is rendered as plain text."
        : "Search to reveal candidates beyond the render budget.",
    searchText: `candidate ${id} transfer render budget security plain text`,
  };
});

function ControlledTransferDemo() {
  const [targetKeys, setTargetKeys] = useState<TransferKey[]>(["katherine"]);
  const [selectedKeys, setSelectedKeys] = useState<TransferKey[]>(["ada"]);

  return (
    <div className="transfer-doc-controlled">
      <Transfer
        dataSource={members}
        leftTitle="Review pool"
        onChange={setTargetKeys}
        onSelectChange={(sourceKeys, targetKeys) => setSelectedKeys([...sourceKeys, ...targetKeys])}
        rightTitle="Assigned reviewers"
        selectedKeys={selectedKeys}
        targetKeys={targetKeys}
      />
      <div className="transfer-doc-controlled__state">
        <span>targetKeys: {targetKeys.join(", ") || "empty"}</span>
        <span>selectedKeys: {selectedKeys.join(", ") || "empty"}</span>
      </div>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "基础穿梭",
    description: "targetKeys 定义右侧集合；移动后保留 dataSource 顺序并清理已移动项的选中态。",
    preview: (
      <Transfer
        dataSource={members}
        defaultTargetKeys={["margaret"]}
        leftTitle="Available reviewers"
        rightTitle="Selected reviewers"
      />
    ),
    code: `<Transfer dataSource={members} defaultTargetKeys={["margaret"]} leftTitle="Available reviewers" rightTitle="Selected reviewers" />`,
  },
  {
    title: "搜索与全选",
    description: "搜索按 label、description 或 searchText 匹配；全选只作用于当前可见且未禁用的项目。",
    preview: (
      <Transfer
        dataSource={members}
        defaultTargetKeys={["grace", "margaret"]}
        leftSearchPlaceholder="Search available"
        leftTitle="Source"
        rightSearchPlaceholder="Search assigned"
        rightTitle="Target"
      />
    ),
    code: `<Transfer dataSource={members} defaultTargetKeys={["grace", "margaret"]} leftSearchPlaceholder="Search available" rightSearchPlaceholder="Search assigned" />`,
  },
  {
    title: "禁用项与整体禁用",
    description: "item.disabled 会阻止选择和移动；整体 disabled 会关闭搜索、选择和移动操作。",
    preview: (
      <div className="doc-demo-stack">
        <Transfer dataSource={members.slice(0, 3)} defaultTargetKeys={["grace"]} disabled />
        <Transfer dataSource={members.slice(3)} defaultTargetKeys={["readonly"]} showSearch={false} />
      </div>
    ),
    code: `<Transfer dataSource={items} defaultTargetKeys={["grace"]} disabled /> <Transfer dataSource={itemsWithDisabled} showSearch={false} />`,
  },
  {
    title: "受控模型",
    description: "targetKeys 和 selectedKeys 都可受控，便于表单、权限或远端状态接管。",
    preview: <ControlledTransferDemo />,
    code: `const [targetKeys, setTargetKeys] = useState(["katherine"]); const [selectedKeys, setSelectedKeys] = useState(["ada"]); <Transfer dataSource={members} targetKeys={targetKeys} selectedKeys={selectedKeys} onChange={setTargetKeys} onSelectChange={(sourceKeys, targetKeys) => setSelectedKeys([...sourceKeys, ...targetKeys])} />`,
  },
  {
    title: "长列表滚动",
    description: "列表内容超过可视高度时只在面板内部滚动，header、搜索和移动按钮不被带走。",
    preview: (
      <Transfer
        dataSource={longMembers}
        defaultTargetKeys={["reviewer-2", "reviewer-4", "reviewer-6", "reviewer-8"]}
        leftTitle="Long source"
        rightTitle="Picked"
      />
    ),
    code: `<Transfer dataSource={longMembers} defaultTargetKeys={["reviewer-2", "reviewer-4", "reviewer-6", "reviewer-8"]} leftTitle="Long source" rightTitle="Picked" />`,
  },
  {
    title: "渲染预算",
    description: "maxVisibleItems 限制单侧可见 DOM 数量，超出项用状态行提示用户继续搜索。",
    preview: <Transfer dataSource={cappedMembers} maxVisibleItems={8} leftTitle="Large source" rightTitle="Picked" />,
    code: `<Transfer dataSource={largeItems} maxVisibleItems={80} leftTitle="Large source" rightTitle="Picked" />`,
  },
  {
    title: "移动端堆叠",
    description: "窄屏下左右列表垂直排列，移动按钮变成整行双按钮，列表区域独立滚动。",
    preview: (
      <div className="transfer-doc-mobile-frame">
        <Transfer dataSource={members} defaultTargetKeys={["margaret"]} />
      </div>
    ),
    code: `<div className="mobile-frame"><Transfer dataSource={members} defaultTargetKeys={["margaret"]} /></div>`,
  },
];

const apiRows: DocRow[] = [
  { name: "dataSource", value: "TransferItem[]", description: "完整数据源。key 必须唯一，左右两侧按 dataSource 顺序展示。" },
  { name: "targetKeys / defaultTargetKeys", value: "string[]", description: "右侧集合。受控时由 targetKeys 驱动，非受控时使用 defaultTargetKeys 初始值。" },
  { name: "selectedKeys / defaultSelectedKeys", value: "string[]", description: "跨左右两侧的选中集合。移动成功后组件会清理已移动 key 的选中态。" },
  { name: "onChange", value: "(targetKeys, info) => void", description: "移动成功时触发。info 包含 direction、movedKeys 和下一份 targetKeys。" },
  { name: "onSelectChange", value: "(sourceKeys, targetKeys) => void", description: "选择变化时分别返回左侧与右侧可移动选中项。" },
  { name: "onListSelectChange", value: "({ direction, selectedKeys }) => void", description: "单侧选择变化回调，适合埋点或局部状态提示。" },
  { name: "renderItem", value: "(item, direction) => ReactNode", description: "自定义项目主内容。description 仍在下一行渲染。" },
  { name: "maxVisibleItems", value: "number", description: "单侧过滤结果的渲染上限，默认使用 UI_RENDER_BUDGETS.transferItems；超出时展示提示行。" },
  { name: "showSearch", value: "boolean", description: "是否展示左右搜索输入，默认 true。" },
  { name: "disabled / item.disabled", value: "boolean", description: "整体禁用或单项禁用。禁用项保持可见，但不能选择或移动。" },
  { name: "locale", value: "Partial labels", description: "覆盖空状态、搜索、溢出提示、全选与移动按钮的可访问文案。" },
];

const semanticRows: DocRow[] = [
  { name: "root", value: "div.c-transfer", description: "三段式布局容器，disabled 时附加视觉状态。" },
  { name: "panel", value: "section[aria-labelledby]", description: "左右列表各自有可见标题、计数、全选和搜索。" },
  { name: "items", value: "ul[role=listbox] > li[role=option]", description: "集合内容暴露多选 listbox/option 状态，同时保留 checkbox 的原生操作。" },
  { name: "selection", value: "input[type=checkbox]", description: "每项和全选都使用原生复选框；aria-selected 与 checked 同步，全选支持 mixed indeterminate 状态。" },
  { name: "move", value: "button", description: "移动操作使用原生按钮，disabled 条件来自可移动选中项。" },
  { name: "overflow", value: "li[role=status]", description: "过滤结果超过渲染预算时用状态行提示，避免误认为数据消失。" },
  { name: "announcement", value: "aria-live=polite", description: "移动成功后朗读移动数量与方向。" },
];

const tokenRows: DocRow[] = [
  { name: "surface", value: "#ffffff / #fbfbfa", description: "列表主体与 header/search 的近白层级。" },
  { name: "border", value: "#dededb / #ececea", description: "外框、分隔线和列表项边界。" },
  { name: "text", value: "#1f1f1d / #696967 / #8a8a86", description: "主文本、说明和弱化计数。" },
  { name: "radius", value: "8px / 6px", description: "面板与控件圆角，保持基础组件克制风格。" },
  { name: "target", value: "44px item min-height", description: "项目行和移动端按钮满足触控尺寸。" },
];

const faqRows: DocRow[] = [
  { name: "和 List/Table 是什么关系？", value: "独立组件", description: "Transfer 使用列表外观表达两组集合迁移，但不是 List 或 Table 的文档合并项。" },
  { name: "是否内置虚拟滚动？", value: "渲染预算而非窗口化", description: "当前提供 maxVisibleItems 上限和搜索缩小范围提示；超大数据应由业务层接入窗口化或远端搜索。" },
  { name: "搜索全选选的是所有项吗？", value: "当前可见项", description: "全选只作用于过滤后可见且未禁用的项目，避免隐藏结果被意外移动。" },
];

const performanceRows: DocRow[] = [
  { name: "default budget", value: "500 items / side", description: "默认使用 UI_RENDER_BUDGETS.transferItems，过滤后每侧最多渲染前 500 项。" },
  { name: "overflow notice", value: "role=status", description: "超出预算时追加提示行，说明当前只显示前 N 项并建议继续搜索。" },
  { name: "not virtualization", value: "explicit boundary", description: "组件不伪装完整窗口化；需要数万项时由业务接入远端查询或虚拟列表。" },
  { name: "selection scope", value: "rendered enabled keys", description: "全选只作用于当前已渲染且可用的 key，避免移动预算后隐藏的条目。" },
];

const securityRows: DocRow[] = [
  { name: "HTML injection", value: "ReactNode only", description: "label、description、locale 和 renderItem 由 React 渲染；组件不使用 dangerouslySetInnerHTML。" },
  { name: "Dependency", value: "self-owned", description: "仅依赖 React、自有 Button/Input 和性能工具，不引入 antd、antd-mobile 或外部 UI 套件。" },
  { name: "Move payload", value: "enabled keys only", description: "disabled item、未知 key 和不存在于 dataSource 的 key 不会进入 movedKeys。" },
  { name: "Search text", value: "string match", description: "searchText 仅用于本地 includes 匹配，不执行表达式、选择器或命令。" },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "覆盖可选/已选集合迁移、搜索、全选、禁用项、受控状态和移动端堆叠。" },
  { name: "UI 专家", value: "PASS", description: "左右面板、header/search/列表滚动区和移动按钮层级清晰；长文本在 375px/390px 不溢出。" },
  { name: "研发专家", value: "PASS", description: "自有 React + CSS 实现，状态模型分离 targetKeys 与 selectedKeys，长列表有明确渲染预算。" },
  { name: "测试专家", value: "PASS", description: "#transfer smoke 覆盖移动、搜索、禁用、键盘、长列表内部滚动、渲染预算和文档独立性。" },
  { name: "白帽专家", value: "PASS", description: "无 HTML 注入入口、无动态脚本执行、无外部 UI 依赖；安全文本按 React 文本节点渲染。" },
];

function DocTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="button-doc-table-wrap">
      <table className="button-doc-table">
        <thead>
          <tr>
            <th scope="col">属性</th>
            <th scope="col">类型 / 当前值</th>
            <th scope="col">说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.value}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TransferDoc({ showAnchors = true }: TransferDocProps) {
  return (
    <TutorialScaffold component="Transfer" kind="data-entry" oneLineExample={oneLineExample}>
    <main className="button-doc transfer-doc">
      <div className="button-doc__layout button-doc__layout--with-toc">
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Transfer 文档目录">
            {transferDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">{transferDocMeta.category}</p>
            <h2>{transferDocMeta.title}</h2>
            <p>
              Transfer 用于在两个集合之间分配项目，覆盖双列表、搜索、全选、移动、禁用、键盘和移动端堆叠。
            </p>
            <p>
              当前实现是自有 React + DOM 组件，不依赖 antd、antd-mobile 或外部 UI 套件。
            </p>
          </header>

          <section className="button-doc-section" id="transfer-when">
            <div className="button-doc-section__heading">
              <h3>何时使用</h3>
              <p>适合权限分配、成员指派、字段选择和中小型集合迁移。</p>
            </div>
            <ul className="button-doc-list">
              <li>需要保留“可选集合”和“已选集合”的上下文，并允许来回移动。</li>
              <li>用户需要搜索、批量选择或区分禁用项。</li>
              <li>只需要单次下拉选择时使用 Select；需要行列比较时使用 Table。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="transfer-demos">
            <div className="button-doc-section__heading">
              <h3>代码演示</h3>
              <p>覆盖核心交互、状态模型和窄屏堆叠。</p>
            </div>
            <div className="button-doc-demo-grid transfer-doc-demo-grid">
              {demos.map((demo) => (
                <article className="button-doc-demo transfer-doc-demo" key={demo.title}>
                  <div className="button-doc-demo__meta">
                    <h3>{demo.title}</h3>
                    <p>{demo.description}</p>
                  </div>
                  <div className="button-doc-demo__preview button-doc-demo__preview--stack">{demo.preview}</div>
                  <pre className="button-doc-code">
                    <code>{demo.code}</code>
                  </pre>
                </article>
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="transfer-api">
            <h3>API</h3>
            <DocTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="transfer-model">
            <div className="button-doc-section__heading">
              <h3>选择模型</h3>
              <p>Transfer 把成员关系和待移动选择拆开，避免状态互相覆盖。</p>
            </div>
            <div className="transfer-doc-model">
              <Tag tone="strong">targetKeys = right side</Tag>
              <Tag tone="subtle">selectedKeys = checked items</Tag>
              <Tag>move filters disabled keys</Tag>
            </div>
            <ul className="button-doc-list">
              <li>移动右侧会把左侧可移动选中项追加到 targetKeys；移动左侧会从 targetKeys 中移除右侧可移动选中项。</li>
              <li>移动成功后 movedKeys 会从 selectedKeys 中清除，并通过 aria-live 朗读移动结果。</li>
              <li>未知 key 不参与渲染；key 必须在 dataSource 内保持唯一。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="transfer-performance">
            <div className="button-doc-section__heading">
              <h3>性能边界</h3>
              <p>Transfer 面向中小型集合，长列表通过渲染预算和局部滚动保持页面稳定。</p>
            </div>
            <DocTable rows={performanceRows} />
          </section>

          <section className="button-doc-section" id="transfer-semantic">
            <h3>Semantic DOM</h3>
            <DocTable rows={semanticRows} />
          </section>

          <section className="button-doc-section" id="transfer-token">
            <h3>Design Token</h3>
            <DocTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="transfer-a11y">
            <div className="button-doc-section__heading">
              <h3>可访问性</h3>
              <p>使用多选 listbox 状态、原生 checkbox 和 button，兼顾读屏定位与键盘操作。</p>
            </div>
            <ul className="button-doc-list">
              <li>Tab 进入全选、项目复选框和移动按钮；Space 切换复选框，Enter/Space 激活按钮。</li>
              <li>项目复选框支持 ArrowUp、ArrowDown、Home、End 在同一列表内移动焦点，不拦截 Tab。</li>
              <li>全选只选择过滤后可见的可用项，并通过 indeterminate 表达部分选中。</li>
              <li>禁用项使用 native disabled，并从 move payload 中排除。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="transfer-security">
            <h3>安全</h3>
            <DocTable rows={securityRows} />
          </section>

          <section className="button-doc-section" id="transfer-review">
            <div className="button-doc-section__heading">
              <h3>五专家结论</h3>
              <p>产品、UI、研发、测试、白帽共同按独立 Transfer 范围验收。</p>
            </div>
            <DocTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="transfer-mobile">
            <div className="button-doc-section__heading">
              <h3>移动端</h3>
              <p>760px 以下切换为上下堆叠，避免双列表造成页面级横向溢出。</p>
            </div>
            <ul className="button-doc-list">
              <li>每个列表保留独立滚动区域，header、搜索和按钮保持在滚动区外。</li>
              <li>移动按钮在窄屏下变成两列整宽按钮，并保持 44px 触控高度。</li>
              <li>长名称、邮箱、路径和组织标识允许换行，不挤压控件。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="transfer-faq">
            <h3>FAQ</h3>
            <div className="button-doc-faq">
              {faqRows.map((row) => (
                <article className="button-doc-faq__item" key={row.name}>
                  <h4>{row.name}</h4>
                  <p>
                    <strong>{row.value}</strong> - {row.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
    </TutorialScaffold>
  );
}
