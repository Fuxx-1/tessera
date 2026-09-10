import type { ReactNode } from "react";
import { Button, IconButton, Input, Segmented, Toolbar, ToolbarGroup } from "../components/base";
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

export type ToolbarDocProps = {
  showAnchors?: boolean;
};

const oneLineExample = `<Toolbar aria-label="编辑器工具栏"><ToolbarGroup aria-label="提交"><Button size="sm">Save</Button></ToolbarGroup></Toolbar>`;

export const toolbarDocMeta = {
  title: "Toolbar 工具栏",
  category: "基础组件",
  anchors: [
    { id: "toolbar-when", label: "何时使用" },
    { id: "toolbar-demos", label: "代码演示" },
    { id: "toolbar-api", label: "API" },
    { id: "toolbar-group-api", label: "ToolbarGroup" },
    { id: "toolbar-a11y", label: "可访问性" },
    { id: "toolbar-mobile", label: "移动端" },
    { id: "toolbar-token", label: "样式令牌" },
    { id: "toolbar-review", label: "五角色复核" },
    { id: "toolbar-acceptance", label: "验收清单" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "基础命令条",
    description: "默认使用 role=toolbar，并通过 ToolbarGroup 给命令建立可读分组。",
    preview: (
      <Toolbar aria-label="编辑器工具栏">
        <ToolbarGroup aria-label="文本样式">
          <IconButton label="加粗" size="sm" tooltip="加粗">
            B
          </IconButton>
          <IconButton label="斜体" size="sm" tooltip="斜体">
            I
          </IconButton>
          <IconButton label="代码" size="sm" tooltip="代码">
            {"</>"}
          </IconButton>
        </ToolbarGroup>
        <ToolbarGroup aria-label="提交">
          <Button size="sm" variant="ghost">
            预览
          </Button>
          <Button size="sm" variant="solid">
            发布
          </Button>
        </ToolbarGroup>
      </Toolbar>
    ),
    code: `<Toolbar aria-label="编辑器工具栏"><ToolbarGroup aria-label="文本样式"><IconButton label="加粗" size="sm">B</IconButton><IconButton label="斜体" size="sm">I</IconButton><IconButton label="代码" size="sm">{"</>"}</IconButton></ToolbarGroup><ToolbarGroup aria-label="提交"><Button size="sm" variant="ghost">预览</Button><Button size="sm" variant="solid">发布</Button></ToolbarGroup></Toolbar>`,
  },
  {
    title: "搜索与伸展分组",
    description: "grow 让输入类区域占据剩余空间，右侧操作保持固定宽度。",
    preview: (
      <Toolbar aria-label="列表工具栏" variant="framed">
        <ToolbarGroup grow aria-label="搜索">
          <Input aria-label="搜索任务" placeholder="搜索任务" />
        </ToolbarGroup>
        <ToolbarGroup separated aria-label="视图与操作">
          <Segmented
            label="视图"
            options={[
              { label: "表格", value: "table" },
              { label: "卡片", value: "card" },
            ]}
            size="sm"
            value="table"
          />
          <Button size="sm" variant="solid">
            新建
          </Button>
        </ToolbarGroup>
      </Toolbar>
    ),
    code: `<Toolbar aria-label="列表工具栏" variant="framed"><ToolbarGroup grow aria-label="搜索"><Input aria-label="搜索任务" placeholder="搜索任务" /></ToolbarGroup><ToolbarGroup separated aria-label="视图与操作"><Segmented label="视图" size="sm" value="table" options={options} /><Button size="sm" variant="solid">新建</Button></ToolbarGroup></Toolbar>`,
  },
  {
    title: "状态与溢出动作",
    description: "disabled、loading 和更多入口都保留按钮语义；Toolbar 只管理分组和键盘移动边界。",
    preview: (
      <Toolbar aria-label="发布工具栏" density="compact" justify="start" variant="framed">
        <ToolbarGroup aria-label="发布快捷操作">
          <Button size="sm" variant="solid">
            保存
          </Button>
          <Button loading size="sm" variant="soft">
            同步中
          </Button>
          <Button disabled size="sm" variant="ghost">
            回滚
          </Button>
        </ToolbarGroup>
        <ToolbarGroup separated aria-label="更多发布操作">
          <IconButton aria-haspopup="menu" aria-expanded="false" label="更多操作" size="sm" tooltip="更多操作">
            ...
          </IconButton>
        </ToolbarGroup>
      </Toolbar>
    ),
    code: `<Toolbar aria-label="发布工具栏" density="compact" justify="start" variant="framed"><ToolbarGroup aria-label="发布快捷操作"><Button size="sm" variant="solid">保存</Button><Button loading size="sm">同步中</Button><Button disabled size="sm" variant="ghost">回滚</Button></ToolbarGroup><ToolbarGroup separated aria-label="更多发布操作"><IconButton label="更多操作" aria-haspopup="menu" aria-expanded="false" size="sm">...</IconButton></ToolbarGroup></Toolbar>`,
  },
  {
    title: "垂直工具栏",
    description: "orientation=vertical 会同步 aria-orientation，适合侧边工具带。",
    preview: (
      <div className="toolbar-doc-vertical-preview">
        <Toolbar aria-label="画布工具" orientation="vertical" justify="start" variant="framed" wrap={false}>
          <ToolbarGroup aria-label="选择工具">
            <IconButton label="选择" size="sm" tooltip="选择">
              ↖
            </IconButton>
            <IconButton label="移动" size="sm" tooltip="移动">
              +
            </IconButton>
          </ToolbarGroup>
          <ToolbarGroup separated aria-label="缩放">
            <IconButton label="放大" size="sm" tooltip="放大">
              +
            </IconButton>
            <IconButton label="缩小" size="sm" tooltip="缩小">
              -
            </IconButton>
          </ToolbarGroup>
        </Toolbar>
      </div>
    ),
    code: `<Toolbar aria-label="画布工具" orientation="vertical" justify="start" variant="framed" wrap={false}><ToolbarGroup aria-label="选择工具">...</ToolbarGroup><ToolbarGroup separated aria-label="缩放">...</ToolbarGroup></Toolbar>`,
  },
  {
    title: "Sticky 页头工具栏",
    description: "sticky 只提供吸顶布局类名，宿主仍决定所在滚动容器和层级上下文。",
    preview: (
      <div className="toolbar-doc-sticky-preview">
        <Toolbar aria-label="详情页吸顶工具栏" justify="start" sticky variant="framed">
          <ToolbarGroup aria-label="详情快捷操作">
            <Button size="sm" variant="ghost">
              复制链接
            </Button>
            <Button size="sm" variant="ghost">
              收藏
            </Button>
            <Button size="sm" variant="solid">
              提交
            </Button>
          </ToolbarGroup>
        </Toolbar>
      </div>
    ),
    code: `<Toolbar aria-label="详情页吸顶工具栏" justify="start" sticky variant="framed"><ToolbarGroup aria-label="详情快捷操作"><Button size="sm" variant="ghost">复制链接</Button><Button size="sm" variant="ghost">收藏</Button><Button size="sm" variant="solid">提交</Button></ToolbarGroup></Toolbar>`,
  },
  {
    title: "移动端滚动",
    description: "mobileBehavior=scroll 在小屏保持单行横向滚动，适合图标命令较多的场景。",
    preview: (
      <div className="toolbar-doc-mobile-preview">
        <Toolbar aria-label="移动编辑工具栏" density="compact" justify="start" mobileBehavior="scroll" wrap={false}>
          <ToolbarGroup aria-label="格式">
            {["B", "I", "U", "S", "</>"].map((item) => (
              <IconButton label={item} key={item} size="sm" tooltip={item}>
                {item}
              </IconButton>
            ))}
          </ToolbarGroup>
          <ToolbarGroup separated aria-label="插入">
            <Button size="sm" variant="ghost">
              Link
            </Button>
            <Button size="sm" variant="ghost">
              Image
            </Button>
          </ToolbarGroup>
        </Toolbar>
      </div>
    ),
    code: `<Toolbar aria-label="移动编辑工具栏" density="compact" justify="start" mobileBehavior="scroll" wrap={false}>...</Toolbar>`,
  },
  {
    title: "移动端堆叠",
    description: "mobileBehavior=stack 在窄屏把分组变成全宽纵向排列，输入和按钮仍可点击。",
    preview: (
      <div className="toolbar-doc-mobile-preview">
        <Toolbar aria-label="移动筛选工具栏" mobileBehavior="stack" variant="framed">
          <ToolbarGroup grow aria-label="移动搜索">
            <Input aria-label="搜索记录" placeholder="搜索记录" />
          </ToolbarGroup>
          <ToolbarGroup separated aria-label="移动操作">
            <Button size="sm" variant="ghost">
              重置
            </Button>
            <Button size="sm" variant="solid">
              应用
            </Button>
          </ToolbarGroup>
        </Toolbar>
      </div>
    ),
    code: `<Toolbar aria-label="移动筛选工具栏" mobileBehavior="stack" variant="framed"><ToolbarGroup grow aria-label="移动搜索"><Input aria-label="搜索记录" placeholder="搜索记录" /></ToolbarGroup><ToolbarGroup separated aria-label="移动操作"><Button size="sm" variant="ghost">重置</Button><Button size="sm" variant="solid">应用</Button></ToolbarGroup></Toolbar>`,
  },
];

const toolbarApiRows: DocRow[] = [
  {
    name: "children",
    value: "ReactNode",
    description: "工具栏内容。推荐直接包含 ToolbarGroup，也可放入状态文本或轻量控件。",
  },
  {
    name: "density",
    value: '"regular" | "compact"',
    description: "控制高度和内边距。默认 regular；compact 适合编辑器、表格头和密集筛选区。",
  },
  {
    name: "compact",
    value: "boolean",
    description: "兼容旧 API。为 true 时等同 density=\"compact\"，显式 density 优先。",
  },
  {
    name: "orientation",
    value: '"horizontal" | "vertical"',
    description: "主轴方向，默认 horizontal。role 为 toolbar 时会同步 aria-orientation。",
  },
  {
    name: "justify",
    value: '"start" | "center" | "end" | "between"',
    description: "主轴分布方式，默认 between。",
  },
  {
    name: "align",
    value: '"start" | "center" | "end" | "stretch"',
    description: "交叉轴对齐方式，默认 center。",
  },
  {
    name: "variant",
    value: '"subtle" | "plain" | "framed"',
    description: "背景和边界样式。subtle 适合页头，plain 适合内嵌，framed 适合独立工具面。",
  },
  {
    name: "wrap",
    value: "boolean",
    description: "是否允许内容换行，默认 true。横向滚动工具条可设为 false。",
  },
  {
    name: "mobileBehavior",
    value: '"wrap" | "scroll" | "stack"',
    description: "小屏行为。wrap 默认换行，scroll 横向滚动，stack 将分组纵向排列。",
  },
  {
    name: "rovingFocus",
    value: "boolean",
    description: "默认 true；在非输入控件上用方向键/Home/End 在可聚焦命令间移动，输入框仍保留原生编辑键盘。",
  },
  {
    name: "sticky",
    value: "boolean",
    description: "添加吸顶样式，适合详情页或编辑器页头；宿主负责滚动容器和遮挡层级。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLDivElement>",
    description: "继承 div 属性，例如 id、style、aria-label、data-* 和事件处理。",
  },
];

const groupApiRows: DocRow[] = [
  {
    name: "children",
    value: "ReactNode",
    description: "同一语义分组内的命令、输入控件或状态内容。",
  },
  {
    name: "grow",
    value: "boolean",
    description: "分组是否伸展占据剩余空间，常用于搜索框或批量筛选区域。",
  },
  {
    name: "separated",
    value: "boolean",
    description: "在当前分组前显示细分隔线，用于视觉拆分命令簇。",
  },
  {
    name: "align",
    value: '"start" | "center" | "end" | "stretch"',
    description: "分组内部交叉轴对齐方式，默认 center。",
  },
  {
    name: "HTMLAttributes",
    value: "HTMLAttributes<HTMLDivElement>",
    description: "默认 role=group，可覆盖 role，并支持 aria-label、aria-labelledby 等原生属性。",
  },
];

const a11yRows: DocRow[] = [
  {
    name: "toolbar",
    value: 'role="toolbar"',
    description: "Toolbar 默认声明 toolbar 语义；页面存在多个工具栏时必须提供 aria-label 或 aria-labelledby。",
  },
  {
    name: "orientation",
    value: 'aria-orientation="horizontal | vertical"',
    description: "随 orientation 自动同步，帮助辅助技术理解方向。",
  },
  {
    name: "group",
    value: 'role="group"',
    description: "ToolbarGroup 默认声明 group。每个命令簇建议提供 aria-label，说明该组用途。",
  },
  {
    name: "focus",
    value: ":focus-within",
    description: "工具栏获得键盘焦点时显示内描边；单个按钮、输入框仍保留自己的焦点样式。",
  },
  {
    name: "keyboard",
    value: "roving focus",
    description: "方向键/Home/End 可在命令间移动焦点；输入框、选择框和文本域不会被劫持。",
  },
  {
    name: "disabled / loading",
    value: "由子控件表达",
    description: "Toolbar 不伪造禁用或忙碌状态，Button/IconButton 继续负责 disabled、aria-busy 和 tooltip。",
  },
];

const mobileRows: DocRow[] = [
  {
    name: "wrap",
    value: "默认",
    description: "窄屏允许换行，适合少量按钮和包含输入框的业务工具栏。",
  },
  {
    name: "scroll",
    value: "横向滚动",
    description: "小屏保持单行，按钮不被压缩；容器开启惯性滚动。",
  },
  {
    name: "stack",
    value: "分组堆叠",
    description: "小屏下 Toolbar 和 ToolbarGroup 全宽纵向排列，适合筛选、搜索和多操作组合。",
  },
  {
    name: "touch target",
    value: "由子控件保证",
    description: "Toolbar 不缩小 Button 或 IconButton 的尺寸；密集模式仍应使用可点击的 sm 控件。",
  },
  {
    name: "viewports",
    value: "360px / 390px / 430px",
    description: "文档验收在三个常见移动宽度检查无页面级 overflow，scroll 模式只在工具栏内部横滚。",
  },
];

const tokenRows: DocRow[] = [
  {
    name: "toolbarSurface",
    value: "#fbfbfa / #ffffff / transparent",
    description: "分别对应 subtle、framed、plain 三种承载面。",
  },
  {
    name: "toolbarBorder",
    value: "#dededb",
    description: "底部分隔、外框和分组分隔线。",
  },
  {
    name: "toolbarRadius",
    value: "8px",
    description: "framed 形态的外框圆角，与文档卡片和弹层保持一致。",
  },
  {
    name: "toolbarGap",
    value: "8px / 4px",
    description: "工具栏分组间距为 8px，组内控件间距为 4px。",
  },
  {
    name: "toolbarHeight",
    value: "46px / 38px",
    description: "regular 与 compact 的最小高度。",
  },
  {
    name: "toolbarFocus",
    value: "rgba(85, 85, 82, 0.36)",
    description: "focus-within 的中性内描边。",
  },
  {
    name: "toolbarSticky",
    value: "position: sticky; top: 0",
    description: "吸顶工具栏使用中性背景和局部阴影，避免覆盖后续内容时丢失边界。",
  },
  {
    name: "主题 style",
    value: "--ct-surface / --ct-border / --ct-shadow-sm",
    description: "subtle、plain、framed、sticky、separator、focus-within 都使用 --ct-* 中性 token；亮/暗主题下只切换 surface、border、weak shadow。",
  },
  {
    name: "结构 style",
    value: "role=toolbar / groups / mobileBehavior",
    description: "方向、density、wrap、scroll、stack、grow group 和 separated 线由结构 class 控制，360/390/430 下选择滚动或堆叠避免横向 overflow。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品专家",
    value: "PASS",
    description: "Toolbar 只承载通用命令分组、快捷动作、状态动作和更多入口；单动作继续用 Button，复杂查询区继续用 DataToolbar。",
  },
  {
    name: "UI 专家",
    value: "PASS",
    description: "图标按钮密度、分组分隔、compact/regular、sticky、wrap/scroll/stack 小屏策略独立可配，360/390/430 宽度不压缩工具项。",
  },
  {
    name: "研发专家",
    value: "PASS",
    description: "默认 role=toolbar 并同步 aria-orientation，ToolbarGroup 默认 role=group；roving focus 仅处理命令焦点，children 组合保持原控件语义并兼容 SSR。",
  },
  {
    name: "测试专家",
    value: "PASS",
    description: "验收覆盖桌面和 360/390/430 移动端，断言无页面级横向 overflow、无空值字样、示例代码保持一行。",
  },
  {
    name: "白帽专家",
    value: "PASS",
    description: "label、tooltip 与 children 作为 ReactNode 安全渲染；Toolbar 和 ToolbarGroup 拒绝 dangerouslySetInnerHTML，不解析 HTML。",
  },
];

const acceptanceItems = [
  "多个工具栏同时出现在页面时均可通过 aria-label 区分。",
  "ToolbarGroup 的视觉分隔不改变 DOM 顺序，Tab 顺序与内容顺序一致。",
  "移动端 wrap、scroll、stack 三种策略均不挤压子控件文本。",
  "scroll 模式只在工具栏内部横向滚动，不制造页面级 overflow。",
  "disabled、loading、更多入口和 sticky 状态都有独立样例，且不会显示空值字样。",
  "vertical 模式同步 aria-orientation，且分组分隔线仍贴合主轴。",
  "未引入外部 UI 库，组件只依赖本仓库基础控件与 CSS。",
];

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

export function ToolbarDoc({ showAnchors = false }: ToolbarDocProps) {
  return (
    <TutorialScaffold component="Toolbar" kind="action" oneLineExample={oneLineExample}>
    <section className="button-doc toolbar-doc" aria-labelledby="toolbar-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="Toolbar 文档目录">
            {toolbarDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="toolbar-doc-title">{toolbarDocMeta.title}</h2>
            <p>
              用于组织一组相关命令、输入控件或状态操作。Toolbar 只负责语义容器和稳定布局，
              Button、IconButton、Segmented、Input 等子控件继续负责自身交互。
              五角色生产复核覆盖产品专家、UI 专家、研发专家、测试专家和白帽专家；重点确认命令密度、移动端滚动策略、焦点顺序和安全依赖边界。
            </p>
          </header>

          <section className="button-doc-section" id="toolbar-when" aria-labelledby="toolbar-when-title">
            <h3 id="toolbar-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>当同一区域有多个相关命令，需要按语义分组并保持紧凑排列时使用。</li>
              <li>编辑器、表格头、详情页操作区、画布侧边工具带适合使用 Toolbar。</li>
              <li>只承载单个主动作时直接使用 Button；复杂筛选查询区优先使用业务组件 DataToolbar。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="toolbar-demos" aria-labelledby="toolbar-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="toolbar-demos-title">代码演示</h3>
              <p>示例覆盖基础命令条、伸展分组、disabled/loading、更多入口、sticky、垂直方向和移动端横向滚动/堆叠，代码样例统一保持一行。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="toolbar-api" aria-labelledby="toolbar-api-title">
            <h3 id="toolbar-api-title">Toolbar API</h3>
            <DataTable rows={toolbarApiRows} />
          </section>

          <section className="button-doc-section" id="toolbar-group-api" aria-labelledby="toolbar-group-api-title">
            <h3 id="toolbar-group-api-title">ToolbarGroup API</h3>
            <DataTable rows={groupApiRows} />
          </section>

          <section className="button-doc-section" id="toolbar-a11y" aria-labelledby="toolbar-a11y-title">
            <h3 id="toolbar-a11y-title">可访问性</h3>
            <DataTable rows={a11yRows} />
          </section>

          <section className="button-doc-section" id="toolbar-mobile" aria-labelledby="toolbar-mobile-title">
            <h3 id="toolbar-mobile-title">移动端</h3>
            <DataTable rows={mobileRows} />
          </section>

          <section className="button-doc-section" id="toolbar-token" aria-labelledby="toolbar-token-title">
            <h3 id="toolbar-token-title">样式令牌</h3>
            <DataTable rows={tokenRows} />
          </section>

          <section className="button-doc-section" id="toolbar-review" aria-labelledby="toolbar-review-title">
            <h3 id="toolbar-review-title">五角色复核</h3>
            <DataTable rows={reviewRows} />
          </section>

          <section className="button-doc-section" id="toolbar-acceptance" aria-labelledby="toolbar-acceptance-title">
            <h3 id="toolbar-acceptance-title">验收清单</h3>
            <ul className="button-doc-list">
              {acceptanceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  
    </TutorialScaffold>
  );
}
