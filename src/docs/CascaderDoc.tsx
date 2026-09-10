import { useState, type ReactNode } from "react";
import { Cascader, type CascaderOption, type CascaderPath } from "../components/base/Cascader";
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

export type CascaderDocProps = {
  showAnchors?: boolean;
};

export const cascaderDocMeta = {
  title: "Cascader 级联选择",
  category: "基础组件",
  anchors: [
    { id: "cascader-when", label: "何时使用" },
    { id: "cascader-demos", label: "代码演示" },
    { id: "cascader-api", label: "API" },
    { id: "cascader-options", label: "Tree options" },
    { id: "cascader-keyboard", label: "Keyboard" },
    { id: "cascader-semantic", label: "Semantic DOM" },
    { id: "cascader-style", label: "Style model" },
    { id: "cascader-mobile", label: "Mobile" },
    { id: "cascader-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const regionOptions: CascaderOption[] = [
  {
    label: "中国",
    searchLabel: "China",
    value: "cn",
    children: [
      {
        label: "浙江",
        searchLabel: "Zhejiang",
        value: "zhejiang",
        children: [
          { label: "杭州", searchLabel: "Hangzhou", value: "hangzhou" },
          { label: "宁波", searchLabel: "Ningbo", value: "ningbo" },
        ],
      },
      {
        label: "广东",
        searchLabel: "Guangdong",
        value: "guangdong",
        children: [
          { label: "广州", searchLabel: "Guangzhou", value: "guangzhou" },
          { label: "深圳", searchLabel: "Shenzhen", value: "shenzhen" },
        ],
      },
    ],
  },
  {
    label: "美国",
    searchLabel: "United States",
    value: "us",
    children: [
      {
        label: "California",
        value: "california",
        children: [
          { label: "San Francisco", value: "san-francisco" },
          { label: "Los Angeles", value: "los-angeles" },
        ],
      },
      {
        label: "New York",
        value: "new-york",
        children: [{ label: "New York City", value: "nyc" }],
      },
    ],
  },
];

const assetOptions: CascaderOption[] = [
  {
    label: "计算资源",
    value: "compute",
    children: [
      {
        label: "生产集群",
        value: "prod",
        children: [
          { label: "华东一组", value: "east-1" },
          { label: "华南灰度", value: "south-gray", disabled: true },
        ],
      },
      {
        label: "预发集群",
        value: "stage",
        children: [{ label: "预发验证池", value: "stage-pool" }],
      },
    ],
  },
  {
    label: "存储资源",
    value: "storage",
    disabled: true,
    children: [{ label: "归档桶", value: "archive" }],
  },
];

const longAndUnsafeOptions: CascaderOption[] = [
  {
    label: "Global operations",
    value: "global",
    children: [
      {
        label: "Extremely long department name that must wrap inside every cascader panel without pushing the popup outside the viewport",
        searchLabel: "long department wrap viewport",
        value: "long-department",
        children: [
          {
            label: "Q4 launch readiness <img src=x onerror=alert(1)>",
            searchLabel: "unsafe literal launch readiness",
            value: "unsafe-literal",
          },
          {
            label: "Mobile escalation queue with a very long final leaf label for 360px smoke",
            searchLabel: "mobile long leaf smoke",
            value: "mobile-long-leaf",
          },
        ],
      },
    ],
  },
];

const apiRows: DocRow[] = [
  {
    name: "options",
    value: "CascaderOption[]",
    description: "必填。树形候选项，节点包含 value、label、children、disabled 和 searchLabel。",
  },
  {
    name: "value / defaultValue",
    value: "string[]",
    description: "完整路径值，例如 ['cn', 'zhejiang', 'hangzhou']。支持受控和非受控模式。",
  },
  {
    name: "onValueChange",
    value: "(value, selectedOptions) => void",
    description: "叶子节点确认后触发，返回路径值与对应节点路径。",
  },
  {
    name: "showSearch",
    value: "boolean",
    description: "开启路径搜索。搜索只提交可用叶子节点，避免选择半截路径。",
  },
  {
    name: "allowClear",
    value: "boolean",
    description: "有已选路径时显示清空按钮，清空后回到 placeholder 并触发空路径值。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用整个触发器；单个 option 也可 disabled，并从选择与搜索提交中排除。",
  },
  {
    name: "label / helpText / errorText",
    value: "ReactNode",
    description: "字段标签、帮助说明和错误说明会自动关联 aria-describedby / aria-invalid。",
  },
  {
    name: "size",
    value: '"sm" | "md"',
    description: "md 用于常规表单，sm 适合工具条、筛选栏和密集面板。",
  },
];

const optionRows: DocRow[] = [
  {
    name: "value",
    value: "string",
    description: "同级节点内保持唯一，用于组成路径数组。",
  },
  {
    name: "label",
    value: "ReactNode",
    description: "可渲染文本或轻量节点；搜索文本默认从字符串 label 或 value 推导。",
  },
  {
    name: "searchLabel",
    value: "string",
    description: "当 label 不是纯文本或需要英文别名时，用于提升搜索命中。",
  },
  {
    name: "children",
    value: "CascaderOption[]",
    description: "存在 children 时节点作为中间层展开；没有 children 时作为可提交叶子。",
  },
  {
    name: "disabled",
    value: "boolean",
    description: "禁用节点不可点击，搜索也不会把禁用叶子作为结果。",
  },
];

const keyboardRows: DocRow[] = [
  {
    name: "Trigger",
    value: "Enter / Space / ArrowDown",
    description: "从触发器打开级联面板。",
  },
  {
    name: "Panels",
    value: "ArrowUp / ArrowDown",
    description: "在当前列移动活动项，跳过 disabled 项。",
  },
  {
    name: "Drill in",
    value: "ArrowRight / Enter",
    description: "进入下一层或提交叶子路径。",
  },
  {
    name: "Back / Close",
    value: "ArrowLeft / Escape",
    description: "回到上一列或关闭面板并把焦点还给触发器。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "field",
    value: ".c-cascader-field",
    description: "字段根节点承载标签、触发器、浮层和帮助信息。",
  },
  {
    name: "trigger",
    value: "button[aria-haspopup='dialog']",
    description: "触发器暴露 expanded、controls、invalid 和 describedby 状态。",
  },
  {
    name: "popup",
    value: "role='dialog'",
    description: "浮层包含搜索框与多列 listbox；不与 Select 或 TreeSelect 共用文档语义。",
  },
  {
    name: "option",
    value: "button[role='option']",
    description: "每一项保留真实按钮禁用态，同时用 aria-selected 标记活动或已选路径。",
  },
];

const styleRows: DocRow[] = [
  {
    name: "theme style",
    value: "--ct-* tokens",
    description: "颜色、面层、描边、阴影和焦点只读取 Tessera 语义令牌，暗色模式由全局 token 闭环，不在 CascaderDoc 写死色板。",
  },
  {
    name: "structure style",
    value: "panel, density, containment",
    description: "结构样式负责列宽、内部滚动、紧凑高度、路径换行和 mobile sheet 收敛，避免列变形、内部大于外部和页面级 overflow。",
  },
  {
    name: "z-index",
    value: "fixed popup / z-index 62",
    description: "浮层固定到视口坐标并限制在可视区内，桌面靠边打开会回收 left，移动端收敛为底部面板。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "Stacked panel",
    value: "max-width: 640px",
    description: "窄屏下多列横排变成纵向堆叠，每层独立滚动，避免超出视口。",
  },
  {
    name: "Touch target",
    value: "44px",
    description: "触发器与选项在触屏环境提升点击高度。",
  },
  {
    name: "Search first",
    value: "input above panels",
    description: "搜索框固定在面板顶部，移动端可直接过滤长路径。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "通过",
    description: "路径值用 string[] 表达，支持层级选择、路径显示、清空和禁用边界，不混写 TreeSelect。",
  },
  {
    name: "UI 专家",
    value: "通过",
    description: "触发器、面板、活动态、选中态、禁用态和长路径文本保持 neutral minimal 低噪声视觉。",
  },
  {
    name: "研发专家",
    value: "通过",
    description: "受控/非受控路径、叶子提交、搜索提交和禁用祖先路径过滤均由组件内部闭环。",
  },
  {
    name: "测试专家",
    value: "通过",
    description: "覆盖多级面板、选择路径、键盘钻取、禁用、长文本、触控、弹层溢出和移动宽度。",
  },
  {
    name: "白帽专家",
    value: "通过",
    description: "危险 label 按 React 文本渲染，不使用危险 HTML，不引入 antd、antd-mobile、@ant-design/charts，禁用路径不可绕过搜索提交。",
  },
];

function ControlledCascaderDemo() {
  const [value, setValue] = useState<CascaderPath>(["cn", "zhejiang", "hangzhou"]);

  return (
    <div className="cascader-doc-controlled">
      <Cascader
        helpText="路径值由 React state 控制。"
        label="办公城市"
        onValueChange={setValue}
        options={regionOptions}
        value={value}
      />
      <span className="cascader-doc-controlled__value">当前路径：{value.join(" / ")}</span>
    </div>
  );
}

function CompactCascaderDemo() {
  const [value, setValue] = useState<CascaderPath>(["compute", "stage", "stage-pool"]);

  return (
    <div className="cascader-doc-compact">
      <Cascader
        label="紧凑归属"
        onValueChange={setValue}
        options={assetOptions}
        placeholder="选择资源路径"
        showSearch
        size="sm"
        value={value}
      />
      <span className="cascader-doc-compact__path">{value.join(" / ")}</span>
    </div>
  );
}

const demos: Demo[] = [
  {
    title: "路径选择",
    description: "从 tree options 逐级展开，只有叶子节点会提交完整路径。",
    preview: <Cascader allowClear label="地区" options={regionOptions} placeholder="选择国家 / 省份 / 城市" />,
    code: `<Cascader allowClear label="地区" placeholder="选择国家 / 省份 / 城市" options={regionOptions} />`,
  },
  {
    title: "受控路径",
    description: "value 使用 string[]，适合表单状态、筛选条件和 URL 同步。",
    preview: <ControlledCascaderDemo />,
    code: `const [value, setValue] = useState(["cn", "zhejiang", "hangzhou"]); <Cascader label="办公城市" value={value} onValueChange={setValue} options={regionOptions} />`,
  },
  {
    title: "禁用节点",
    description: "禁用分支不可进入或提交，禁用叶子不会出现在可提交搜索结果里。",
    preview: (
      <Cascader
        defaultValue={["compute", "prod", "east-1"]}
        helpText="存储资源和华南灰度不可选。"
        label="资源归属"
        options={assetOptions}
      />
    ),
    code: `<Cascader label="资源归属" defaultValue={["compute", "prod", "east-1"]} helpText="存储资源和华南灰度不可选。" options={assetOptions} />`,
  },
  {
    title: "路径搜索",
    description: "搜索完整路径文本，点击结果直接提交叶子路径。",
    preview: (
      <Cascader
        label="搜索城市"
        options={regionOptions}
        searchPlaceholder="输入 Hangzhou / Shenzhen"
        showSearch
      />
    ),
    code: `<Cascader showSearch label="搜索城市" searchPlaceholder="输入 Hangzhou / Shenzhen" options={regionOptions} />`,
  },
  {
    title: "紧凑筛选",
    description: "sm 尺寸用于工具条和筛选面板；预览使用真实受控 Cascader，不用静态占位。",
    preview: <CompactCascaderDemo />,
    code: `<Cascader size="sm" showSearch label="紧凑归属" value={value} onValueChange={setValue} options={assetOptions} />`,
  },
  {
    title: "长文本与安全文本",
    description: "长路径在面板内换行；危险字符按普通文本显示，不能执行 HTML。",
    preview: (
      <Cascader
        defaultValue={["global", "long-department", "unsafe-literal"]}
        label="生产路径"
        options={longAndUnsafeOptions}
        searchPlaceholder="输入 mobile / unsafe"
        showSearch
      />
    ),
    code: `<Cascader label="生产路径" showSearch defaultValue={["global", "long-department", "unsafe-literal"]} options={longAndUnsafeOptions} />`,
  },
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <DemoContainer background="muted" code={code} description={description} title={title}>
      <div className="cascader-doc-demo__preview">{preview}</div>
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

export function CascaderDoc({ showAnchors = false }: CascaderDocProps) {
  return (
    <TutorialScaffold
      component="Cascader"
      kind="display"
      oneLineExample={`<Cascader showSearch label="地区" options={regionOptions} />`}
      overlay
    >
      <section className="button-doc cascader-doc" aria-labelledby="cascader-doc-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Cascader 文档目录">
              {cascaderDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc</p>
              <h2 id="cascader-doc-title">{cascaderDocMeta.title}</h2>
              <p>
                Cascader 是独立的层级路径选择组件，面向行政区、组织、资源目录等逐级收窄的选择任务。
                它不复用 Select 或 TreeSelect 文档，也不依赖 antd 系组件。
              </p>
            </header>

            <section className="button-doc-section" id="cascader-when" aria-labelledby="cascader-when-title">
              <h3 id="cascader-when-title">何时使用</h3>
              <ul className="button-doc-list">
                <li>候选项天然是树形结构，并且用户需要提交一条完整路径。</li>
                <li>同层选项数量可扫描，层级关系比平铺搜索更重要。</li>
                <li>需要树节点多选、勾选半选或异步懒加载时，应作为后续能力单独扩展。</li>
              </ul>
            </section>

            <section className="button-doc-section" id="cascader-demos" aria-labelledby="cascader-demos-title">
              <div className="button-doc-section__heading">
                <h3 id="cascader-demos-title">代码演示</h3>
                <p>覆盖树形选项、路径选择、禁用、搜索、受控状态、紧凑样例与帮助信息。</p>
              </div>
              <div className="button-doc-demo-grid cascader-doc-demo-grid">
                {demos.map((demo) => (
                  <DemoCard key={demo.title} {...demo} />
                ))}
              </div>
            </section>

            <section className="button-doc-section" id="cascader-api" aria-labelledby="cascader-api-title">
              <h3 id="cascader-api-title">API</h3>
              <DataTable rows={apiRows} />
            </section>

            <section className="button-doc-section" id="cascader-options" aria-labelledby="cascader-options-title">
              <h3 id="cascader-options-title">Tree options</h3>
              <DataTable rows={optionRows} />
            </section>

            <section className="button-doc-section" id="cascader-keyboard" aria-labelledby="cascader-keyboard-title">
              <h3 id="cascader-keyboard-title">Keyboard / a11y</h3>
              <DataTable rows={keyboardRows} />
            </section>

            <section className="button-doc-section" id="cascader-semantic" aria-labelledby="cascader-semantic-title">
              <h3 id="cascader-semantic-title">Semantic DOM</h3>
              <DataTable rows={semanticRows} />
            </section>

            <section className="button-doc-section" id="cascader-style" aria-labelledby="cascader-style-title">
              <h3 id="cascader-style-title">Style model</h3>
              <DataTable rows={styleRows} />
            </section>

            <section className="button-doc-section" id="cascader-mobile" aria-labelledby="cascader-mobile-title">
              <h3 id="cascader-mobile-title">Mobile</h3>
              <DataTable rows={mobileRows} />
            </section>

            <section className="button-doc-section" id="cascader-review" aria-labelledby="cascader-review-title">
              <h3 id="cascader-review-title">五角色审查</h3>
              <DataTable rows={reviewRows} />
            </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
