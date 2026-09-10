import type { ReactNode } from "react";
import { Button, Divider, Flex, Grid, GridItem, Space, Tag } from "../components/base";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type LayoutPrimitiveId = "divider" | "space" | "flex" | "grid";

export type LayoutPrimitivesDocProps = {
  activeId?: LayoutPrimitiveId;
  showAnchors?: boolean;
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

export const layoutPrimitivesDocMeta = {
  title: "Layout Primitives 布局基础组件",
  category: "布局",
  anchors: [
    { id: "layout-primitives-when", label: "何时使用" },
    { id: "layout-primitives-demos", label: "代码演示" },
    { id: "layout-primitives-api", label: "API" },
    { id: "layout-primitives-mobile", label: "Mobile" },
    { id: "layout-primitives-a11y", label: "Accessibility" },
  ],
} satisfies ComponentDocMeta;

const demos: Demo[] = [
  {
    title: "Divider 内容分隔",
    description: "横向、纵向、带标题、虚线和自定义间距都走同一个 separator 语义。",
    preview: (
      <div className="layout-primitives-doc-stack">
        <p>Overview</p>
        <Divider orientation="start">基础信息</Divider>
        <p>Detail content</p>
        <Space split={<Divider vertical margin={6} />} size="sm">
          <span>Draft</span>
          <span>Ready</span>
          <span>Published</span>
        </Space>
        <Divider dashed margin={10} plain>
          dashed
        </Divider>
      </div>
    ),
    code: `<Divider orientation="start">基础信息</Divider>
<Space split={<Divider vertical margin={6} />} size="sm">
  <span>Draft</span>
  <span>Ready</span>
  <span>Published</span>
</Space>
<Divider dashed margin={10} plain>dashed</Divider>`,
  },
  {
    title: "Space 稳定间距",
    description: "用于一组相邻 inline/control 元素，支持 block、纵向、split 和数值间距。",
    preview: (
      <Space as="div" block size="lg" wrap>
        <Button size="sm">保存</Button>
        <Button size="sm" variant="ghost">
          重置
        </Button>
        <Tag tone="strong">ready</Tag>
        <Tag tone="subtle">mobile-safe</Tag>
      </Space>
    ),
    code: `<Space as="div" block size="lg" wrap>
  <Button size="sm">保存</Button>
  <Button size="sm" variant="ghost">重置</Button>
  <Tag tone="strong">ready</Tag>
</Space>`,
  },
  {
    title: "Flex 工具条布局",
    description: "适合单轴布局，移动端默认把 row 收成 column，避免按钮和文本挤压。",
    preview: (
      <Flex align="center" fullWidth gap="sm" justify="between" wrap>
        <div>
          <strong>Deployments</strong>
          <p className="layout-primitives-doc-muted">128 results</p>
        </div>
        <Space size="sm" wrap>
          <Button size="sm" variant="ghost">
            Export
          </Button>
          <Button size="sm" variant="solid">
            Create
          </Button>
        </Space>
      </Flex>
    ),
    code: `<Flex align="center" fullWidth gap="sm" justify="between" wrap>
  <div>...</div>
  <Space size="sm" wrap>...</Space>
</Flex>`,
  },
  {
    title: "Grid 响应式跨度",
    description: "十二列、固定列和 auto-fit 均可用；GridItem 支持 full、spanMd 和 spanSm。",
    preview: (
      <Grid columns={12} dense gap="sm">
        <GridItem span={8} spanMd="full">
          <div className="layout-primitives-doc-tile layout-primitives-doc-tile--strong">Main / span 8</div>
        </GridItem>
        <GridItem span={4} spanMd="full">
          <div className="layout-primitives-doc-tile">Aside / span 4</div>
        </GridItem>
        <GridItem span={3} spanSm="full">
          <div className="layout-primitives-doc-tile">A</div>
        </GridItem>
        <GridItem span={3} spanSm="full">
          <div className="layout-primitives-doc-tile">B</div>
        </GridItem>
        <GridItem span={6} spanSm="full">
          <div className="layout-primitives-doc-tile">C / span 6</div>
        </GridItem>
      </Grid>
    ),
    code: `<Grid columns={12} dense gap="sm">
  <GridItem span={8} spanMd="full">...</GridItem>
  <GridItem span={4} spanMd="full">...</GridItem>
  <GridItem span={6} spanSm="full">...</GridItem>
</Grid>`,
  },
];

const apiRows: Record<LayoutPrimitiveId, DocRow[]> = {
  divider: [
    { name: "orientation", value: '"start" | "center" | "end"', description: "带标题分割线的标题位置，默认 center。" },
    { name: "vertical", value: "boolean", description: "渲染竖向 separator，适合放在 Space split 中。" },
    { name: "dashed / plain", value: "boolean", description: "虚线和弱强调标题样式，不改变语义。" },
    { name: "margin", value: "number | string", description: "控制横向上下或纵向左右间距；number 会转为非负 px。" },
  ],
  space: [
    { name: "size", value: '"none" | "xs" | "sm" | "md" | "lg" | "xl" | number', description: "统一 gap；number 会转为非负 px。" },
    { name: "direction", value: '"horizontal" | "vertical"', description: "排列方向，默认 horizontal。" },
    { name: "align / wrap", value: "start | center | end | stretch / boolean", description: "交叉轴对齐和换行控制。" },
    { name: "as / block / split", value: "ElementType / boolean / ReactNode", description: "替换根元素、切换块级宽度、插入视觉分隔符。" },
  ],
  flex: [
    { name: "direction", value: '"row" | "column"', description: "主轴方向，默认 row。" },
    { name: "align / justify", value: "CSS flex 对齐枚举", description: "映射常用 align-items 与 justify-content。" },
    { name: "gap", value: "SpaceSize | number", description: "复用间距尺寸，支持非负 px 数值。" },
    { name: "responsive / fullWidth", value: "boolean", description: "row 在小屏默认转 column；fullWidth 让容器占满父级。" },
  ],
  grid: [
    { name: "columns", value: '1 | 2 | 3 | 4 | 6 | 12 | "auto"', description: "固定列数或 auto-fit 响应式列。" },
    { name: "minItemWidth", value: "number", description: "auto 模式下的最小列宽，最低保护为 1px。" },
    { name: "dense", value: "boolean", description: "开启 CSS grid-auto-flow: dense，用于填补跨度空洞。" },
    { name: "GridItem span / spanMd / spanSm", value: '1..12 | "full"', description: "桌面、900px 以下、760px 以下的显式跨度。" },
  ],
};

const a11yRows: DocRow[] = [
  { name: "Divider", value: "separator", description: "默认 role=separator 并设置 aria-orientation；竖向模式也会透传原生属性。" },
  { name: "Space", value: "layout only", description: "不创建额外 landmark；split 标记 aria-hidden，避免朗读装饰符。" },
  { name: "Flex / Grid", value: "as", description: "可用 as=\"section\"、as=\"ul\" 等承载业务语义，组件只负责布局。" },
  { name: "Mobile", value: "responsive defaults", description: "小屏默认压成单列或 column，显式 spanSm 可覆盖。" },
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

export function LayoutPrimitivesDoc({ activeId = "divider", showAnchors = true }: LayoutPrimitivesDocProps) {
  return (
    <TutorialScaffold
      component="LayoutPrimitives"
      kind="display"
      oneLineExample={`<Space size="md" wrap><Button>Save</Button><Button>Cancel</Button></Space>`}
    >
      <section className="button-doc layout-primitives-doc" aria-labelledby="layout-primitives-title">
        <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
          {showAnchors ? (
            <aside className="button-doc__toc" aria-label="Layout Primitives 文档目录">
              {layoutPrimitivesDocMeta.anchors.map((anchor) => (
                <a href={`#${anchor.id}`} key={anchor.id}>
                  {anchor.label}
                </a>
              ))}
            </aside>
          ) : null}

          <div className="button-doc__content">
            <header className="button-doc__header">
              <p className="eyebrow">component doc / layout primitives</p>
              <h2 id="layout-primitives-title">{layoutPrimitivesDocMeta.title}</h2>
              <p>
                Divider、Space、Flex、Grid 是基础布局层。它们只处理分隔、间距、单轴排列和网格，不绑定业务数据，
                也不依赖外部 UI 套件。
              </p>
            </header>

          <section className="button-doc-section" id="layout-primitives-when" aria-labelledby="layout-primitives-when-title">
            <h3 id="layout-primitives-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>Divider 用于内容层次分隔，不用于替代边框装饰。</li>
              <li>Space 用于一组相邻控件的稳定 gap，Flex 用于主轴对齐和工具条。</li>
              <li>Grid 用于二维区域、卡片矩阵和表单布局，移动端默认收敛为单列。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="layout-primitives-demos" aria-labelledby="layout-primitives-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="layout-primitives-demos-title">代码演示</h3>
              <p>示例覆盖 CSS、API、移动端和可访问性验收重点。</p>
            </div>
            <div className="button-doc-demo-grid">
              {demos.map((demo) => (
                <DemoCard key={demo.title} {...demo} />
              ))}
            </div>
          </section>

          <section className="button-doc-section" id="layout-primitives-api" aria-labelledby="layout-primitives-api-title">
            <h3 id="layout-primitives-api-title">API：{activeId}</h3>
            <DataTable rows={apiRows[activeId]} />
          </section>

          <section className="button-doc-section" id="layout-primitives-mobile" aria-labelledby="layout-primitives-mobile-title">
            <h3 id="layout-primitives-mobile-title">Mobile</h3>
            <DataTable
              rows={[
                { name: "Flex responsive", value: "true", description: "760px 以下 row 转 column，减少横向挤压。" },
                { name: "Grid fixed columns", value: "single column", description: "固定列在 760px 以下变为单列。" },
                { name: "GridItem spanSm", value: "explicit override", description: "需要小屏仍保留跨度时显式传入 spanSm。" },
              ]}
            />
          </section>

          <section className="button-doc-section" id="layout-primitives-a11y" aria-labelledby="layout-primitives-a11y-title">
            <h3 id="layout-primitives-a11y-title">Accessibility</h3>
            <DataTable rows={a11yRows} />
          </section>
          </div>
        </div>
      </section>
    </TutorialScaffold>
  );
}
