import type { ReactNode } from "react";
import { Icon, IconButton } from "../components/base";
import { TutorialScaffold } from "./TutorialScaffold";

type ComponentDocMeta = {
  title: string;
  category: string;
  anchors: Array<{ id: string; label: string }>;
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

export type IconButtonDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<IconButton label="搜索数据" tooltip="搜索数据"><Icon decorative name="search" /></IconButton>`;

export const iconButtonDocMeta = {
  title: "IconButton 图标按钮",
  category: "基础组件",
  anchors: [
    { id: "icon-button-when", label: "何时使用" },
    { id: "icon-button-demos", label: "代码演示" },
    { id: "icon-button-api", label: "API" },
    { id: "icon-button-a11y", label: "可访问性" },
    { id: "icon-button-semantic", label: "Semantic DOM" },
    { id: "icon-button-mobile", label: "移动端" },
    { id: "icon-button-security", label: "安全" },
    { id: "icon-button-token", label: "Design Token" },
    { id: "icon-button-acceptance", label: "验收清单" },
    { id: "icon-button-review", label: "五专家复核" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "可访问名称与提示",
    description: "label 或 aria-label 负责名称，tooltip/title 只做提示或兼容兜底。",
    preview: (
      <div className="icon-button-doc-row">
        <IconButton label="新增条目" tooltip="新增条目">
          <Icon decorative name="add" />
        </IconButton>
        <IconButton aria-label="搜索数据" tooltip="搜索数据">
          <Icon decorative name="search" />
        </IconButton>
        <IconButton title="关闭面板">
          <Icon decorative name="close" />
        </IconButton>
      </div>
    ),
    code: `<IconButton label="新增条目" tooltip="新增条目"><Icon decorative name="add" /></IconButton> <IconButton aria-label="搜索数据" tooltip="搜索数据"><Icon decorative name="search" /></IconButton> <IconButton title="关闭面板"><Icon decorative name="close" /></IconButton>`,
  },
  {
    title: "尺寸与语气",
    description: "sm/md/lg 保持方形视觉尺寸；tone 用于表达动作风险，不替代业务权限判断。",
    preview: (
      <div className="icon-button-doc-row">
        <IconButton label="小号设置" size="sm" tooltip="小号设置">
          <Icon decorative name="settings" />
        </IconButton>
        <IconButton label="同步成功" tone="success" tooltip="同步成功">
          <Icon decorative name="check" />
        </IconButton>
        <IconButton label="打开详情" size="lg" tone="accent" tooltip="打开详情">
          <Icon decorative name="external-link" />
        </IconButton>
        <IconButton label="删除" tone="danger" tooltip="删除">
          <Icon decorative name="trash" />
        </IconButton>
      </div>
    ),
    code: `<IconButton label="小号设置" size="sm"><Icon decorative name="settings" /></IconButton> <IconButton label="同步成功" tone="success"><Icon decorative name="check" /></IconButton> <IconButton label="打开详情" size="lg" tone="accent"><Icon decorative name="external-link" /></IconButton> <IconButton label="删除" tone="danger"><Icon decorative name="trash" /></IconButton>`,
  },
  {
    title: "按下状态",
    description: "pressed 用于可切换命令，例如加粗、预览、锁定。不要把一次性动作标成 pressed。",
    preview: (
      <div className="icon-button-doc-row">
        <IconButton label="加粗已开启" pressed tooltip="加粗">
          <Icon decorative name="edit" />
        </IconButton>
        <IconButton label="斜体未开启" pressed={false} tooltip="斜体">
          <Icon decorative name="info" />
        </IconButton>
      </div>
    ),
    code: `<IconButton label="加粗已开启" pressed tooltip="加粗"><Icon decorative name="edit" /></IconButton> <IconButton label="斜体未开启" pressed={false} tooltip="斜体"><Icon decorative name="info" /></IconButton>`,
  },
  {
    title: "加载与禁用",
    description: "loading 会进入 busy 与 disabled 状态；disabled 保留名称但不会进入 Tab 顺序。",
    preview: (
      <div className="icon-button-doc-row">
        <IconButton label="正在刷新" loading tooltip="正在刷新">
          <Icon decorative name="upload" />
        </IconButton>
        <IconButton disabled label="删除不可用" tone="danger" tooltip="删除不可用">
          <Icon decorative name="trash" />
        </IconButton>
      </div>
    ),
    code: `<IconButton label="正在刷新" loading tooltip="正在刷新"><Icon decorative name="upload" /></IconButton> <IconButton disabled label="删除不可用" tone="danger" tooltip="删除不可用"><Icon decorative name="trash" /></IconButton>`,
  },
  {
    title: "安全 ReactNode 图标",
    description: "children 只作为 ReactNode 渲染；内联 SVG 必须由调用方提供安全节点，不解析 HTML 字符串。",
    preview: (
      <div className="icon-button-doc-row">
        <IconButton label="自定义安全 SVG" tooltip="自定义安全 SVG">
          <svg aria-hidden="true" focusable="false" height="18" viewBox="0 0 24 24" width="18">
            <path d="M12 4 5 8v6c0 4 3 6 7 7 4-1 7-3 7-7V8l-7-4Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <path d="m9 12 2 2 4-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </IconButton>
      </div>
    ),
    code: `<IconButton label="自定义安全 SVG" tooltip="自定义安全 SVG"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M12 4 5 8v6c0 4 3 6 7 7 4-1 7-3 7-7V8l-7-4Z" /></svg></IconButton>`,
  },
  {
    title: "单行紧凑动作组",
    description: "多个 IconButton 可以在局部操作区并排展示；每个按钮仍独立提供 label 与 tooltip。",
    preview: (
      <div className="icon-button-doc-row" aria-label="文本样式操作">
        <IconButton label="加粗" size="sm" tooltip="加粗">
          <Icon decorative name="edit" />
        </IconButton>
        <IconButton label="斜体" size="sm" tooltip="斜体">
          <Icon decorative name="info" />
        </IconButton>
        <IconButton label="复制代码" size="sm" tooltip="复制代码">
          <Icon decorative name="copy" />
        </IconButton>
      </div>
    ),
    code: `<div className="icon-button-doc-row" aria-label="文本样式操作"><IconButton label="加粗" size="sm" tooltip="加粗"><Icon decorative name="edit" /></IconButton> <IconButton label="斜体" size="sm" tooltip="斜体"><Icon decorative name="info" /></IconButton> <IconButton label="复制代码" size="sm" tooltip="复制代码"><Icon decorative name="copy" /></IconButton></div>`,
  },
];

const apiRows: DocRow[] = [
  {
    name: "label",
    value: "string",
    description: "推荐的可访问名称来源。会写入 aria-label，适合所有无文本图标按钮。",
  },
  {
    name: "aria-label",
    value: "string",
    description: "继承原生属性。优先级高于 label，用于需要直接控制 ARIA 名称的场景。",
  },
  {
    name: "tooltip",
    value: "ReactNode",
    description: "可选提示内容。存在时通过 Tooltip 包裹按钮，提示打开时用 aria-describedby 关联。",
  },
  {
    name: "tooltipPlacement",
    value: '"top" | "bottom" | "left" | "right"',
    description: "tooltip 展示方向。默认由 Tooltip 使用 top。",
  },
  {
    name: "loading",
    value: "boolean",
    description: "加载态。渲染 spinner、aria-busy，并禁用按钮以避免重复提交。",
  },
  {
    name: "pressed",
    value: "boolean",
    description: "切换型按钮状态。传入时渲染 aria-pressed。",
  },
  {
    name: "size",
    value: '"sm" | "md" | "lg"',
    description: "视觉尺寸。默认 md；触摸设备命中面积最低 44px。",
  },
  {
    name: "tone",
    value: '"neutral" | "accent" | "success" | "warning" | "danger"',
    description: "语气颜色。默认 neutral，用于提醒操作性质。",
  },
  {
    name: "ButtonHTMLAttributes",
    value: "ButtonHTMLAttributes<HTMLButtonElement>",
    description: "继承 disabled、onClick、type、title 等原生 button 属性，默认 type 为 button。",
  },
  {
    name: "dangerouslySetInnerHTML",
    value: "never",
    description: "显式排除危险 HTML 注入；图标内容应通过安全 ReactNode 传入。",
  },
];

const semanticRows: DocRow[] = [
  {
    name: "root",
    value: "button",
    description: "原生按钮，保留键盘激活、禁用和表单语义。",
  },
  {
    name: "accessible name",
    value: "aria-label",
    description: "来自 aria-label、label 或字符串 title。开发环境缺失时会输出警告。",
  },
  {
    name: "tooltip relation",
    value: "aria-describedby",
    description: "tooltip 打开时由 Tooltip 生成描述关系，聚焦和悬停均可显示。",
  },
  {
    name: "toggle state",
    value: "aria-pressed",
    description: "仅在 pressed 有值时出现，表达开关式命令当前状态。",
  },
  {
    name: "busy state",
    value: "aria-busy + disabled",
    description: "loading 时表达忙碌状态，并阻止重复点击。",
  },
];

const tokenRows: DocRow[] = [
  { name: "sizeSm", value: "30px", description: "桌面密集工具栏视觉尺寸。" },
  { name: "sizeMd", value: "36px", description: "默认视觉尺寸。" },
  { name: "sizeLg", value: "42px", description: "更高强调度视觉尺寸。" },
  { name: "touchTarget", value: "44px", description: "粗指针设备上的最小命中尺寸。" },
  { name: "radius", value: "6px", description: "保持工具型界面清晰边界。" },
  { name: "textMuted", value: "#696967", description: "默认图标颜色。" },
  { name: "controlHover", value: "low-alpha neutral", description: "悬停背景使用低透明中性面，tone 只保留前景语义色。" },
  { name: "focus", value: "#555552", description: "focus-visible 轮廓颜色。" },
  {
    name: "主题 style",
    value: "--ct-surface-hover / --ct-surface-selected / --ct-focus-ring",
    description: "hover 与 pressed 统一为中性交互面，focus 使用蓝色 ring；亮/暗主题只切换 token，不改变 DOM。",
  },
  {
    name: "结构 style",
    value: "square button / fixed size / centered icon",
    description: "sm/md/lg 尺寸、方形圆角、spinner overlay、tooltip 关系和 44px 触控命中由结构 class 保证。",
  },
];

const reviewRows: DocRow[] = [
  { name: "产品专家", value: "PASS", description: "仅覆盖图标型命令，不合并 Button、FloatButton、Toolbar 或 Icon 图形文档。" },
  { name: "UI 专家", value: "PASS", description: "尺寸、tone、pressed、disabled、loading 与一行样例在桌面和移动端保持稳定。" },
  { name: "研发专家", value: "PASS", description: "自有 React/TypeScript 实现，forwardRef，原生 button 语义，无 antd 依赖。" },
  { name: "测试专家", value: "PASS", description: "#icon-button smoke 覆盖路由、ARIA、tooltip/title、状态、移动命中、focus 和安全边界。" },
  { name: "白帽专家", value: "PASS", description: "排除 dangerouslySetInnerHTML；children/tooltip 以 ReactNode 渲染，SVG 不经字符串注入。" },
];

const acceptanceItems = [
  "所有实例必须提供 label、aria-label 或字符串 title。",
  "tooltip 不作为唯一命名来源；没有 tooltip 时按钮仍可被屏幕阅读器识别。",
  "pressed 只用于切换型动作，并正确映射 aria-pressed。",
  "loading 必须有 aria-busy、spinner 和 disabled 行为，避免重复触发。",
  "tone 只表达操作语气，不承载权限或业务状态判断。",
  "sm/md/lg 在桌面保持稳定方形尺寸，触摸设备命中面积不低于 44px。",
  "disabled 保留原生 disabled 行为，不响应点击，不进入 Tab 顺序。",
  "children 允许安全 SVG/ReactNode，不允许 dangerouslySetInnerHTML。",
  "不得引入 antd、antd-mobile 或 @ant-design/charts。",
];

function DemoCard({ code, description, preview, title }: Demo) {
  return (
    <article className="icon-button-doc-demo">
      <div className="icon-button-doc-demo__meta">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="icon-button-doc-demo__preview">{preview}</div>
      <pre className="icon-button-doc-code" aria-label={`${title} 代码`}>
        <code>{code}</code>
      </pre>
    </article>
  );
}

function DataTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="icon-button-doc-table-wrap">
      <table className="icon-button-doc-table">
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

export function IconButtonDoc({ showAnchors = false }: IconButtonDocProps) {
  return (
    <TutorialScaffold component="IconButton" kind="action" oneLineExample={oneLineExample} overlay>
    <section className="button-doc icon-button-doc" aria-labelledby="icon-button-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="IconButton 文档目录">
            {iconButtonDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="icon-button-doc-title">{iconButtonDocMeta.title}</h2>
            <p>
              用于承载只有图标或符号的命令。IconButton 固定方形视觉尺寸，并把可访问名称、tooltip、
              title 兜底、size、tone、disabled、loading、pressed 和移动端命中目标作为生产约束处理。
            </p>
          </header>

          <section className="icon-button-doc-section" id="icon-button-when" aria-labelledby="icon-button-when-title">
            <h3 id="icon-button-when-title">何时使用</h3>
            <ul className="icon-button-doc-list">
              <li>用于工具栏、标题栏、表格行操作、编辑器命令等空间有限的区域。</li>
              <li>当图标不能被所有用户稳定理解时，必须提供 tooltip 作为视觉补充。</li>
              <li>需要明确文字动作时优先使用 Button，不要用图标按钮承载复杂文案。</li>
            </ul>
          </section>

          <section className="icon-button-doc-section" id="icon-button-demos" aria-labelledby="icon-button-demos-title">
            <div className="icon-button-doc-section__heading">
              <h3 id="icon-button-demos-title">代码演示</h3>
              <p>示例覆盖 aria-label、tooltip/title、size、tone、disabled、loading、pressed、安全 ReactNode 和单行紧凑动作组。</p>
            </div>
            <div className="icon-button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="icon-button-doc-section" id="icon-button-api" aria-labelledby="icon-button-api-title">
            <h3 id="icon-button-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="icon-button-doc-section" id="icon-button-a11y" aria-labelledby="icon-button-a11y-title">
            <h3 id="icon-button-a11y-title">可访问性</h3>
            <ul className="icon-button-doc-list">
              <li>可访问名称优先使用 label；业务需要精确控制时使用 aria-label。</li>
              <li>title 可以作为兼容兜底，但不推荐作为主要 API，因为不同辅助技术支持不稳定。</li>
              <li>tooltip 是描述，不是名称；按钮即使没有 tooltip 也必须可被读出操作含义。</li>
              <li>pressed 只表达当前是否处于按下状态，不用于 loading、selected 或 menu open。</li>
              <li>loading 使用 aria-busy 并临时禁用按钮，避免辅助技术和指针行为不一致。</li>
            </ul>
          </section>

          <section className="icon-button-doc-section" id="icon-button-semantic" aria-labelledby="icon-button-semantic-title">
            <h3 id="icon-button-semantic-title">Semantic DOM</h3>
            <DataTable rows={semanticRows} />
          </section>

          <section className="icon-button-doc-section" id="icon-button-mobile" aria-labelledby="icon-button-mobile-title">
            <h3 id="icon-button-mobile-title">移动端</h3>
            <ul className="icon-button-doc-list">
              <li>粗指针设备和 640px 以下屏幕统一把命中目标提升到 44px，不压缩内部图标。</li>
              <li>文档样例保持一行，窄屏使用局部横向滚动，避免页面整体横向溢出。</li>
              <li>focus-visible 轮廓不依赖 hover，键盘和触摸路径都能定位当前命令。</li>
            </ul>
          </section>

          <section className="icon-button-doc-section" id="icon-button-security" aria-labelledby="icon-button-security-title">
            <h3 id="icon-button-security-title">安全</h3>
            <ul className="icon-button-doc-list">
              <li>IconButton 不接收 dangerouslySetInnerHTML，tooltip 和 children 都作为 ReactNode 交给 React 转义或渲染。</li>
              <li>内联 SVG 只能通过 JSX 节点传入；组件不会把字符串解析成 SVG/HTML。</li>
              <li>组件不引入 antd、antd-mobile 或 @ant-design/charts，也不从 Button、FloatButton、Toolbar 或 Icon 文档复用内容。</li>
            </ul>
          </section>

          <section className="icon-button-doc-section" id="icon-button-token" aria-labelledby="icon-button-token-title">
            <h3 id="icon-button-token-title">Design Token</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="icon-button-doc-section" id="icon-button-acceptance" aria-labelledby="icon-button-acceptance-title">
            <h3 id="icon-button-acceptance-title">验收清单</h3>
            <ul className="icon-button-doc-list">
              {acceptanceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="icon-button-doc-section" id="icon-button-review" aria-labelledby="icon-button-review-title">
            <h3 id="icon-button-review-title">五专家复核</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
