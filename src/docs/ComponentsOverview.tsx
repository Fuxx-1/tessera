import { Button, Card, Icon, Input, Segmented, Tag, Tabs, Toolbar, ToolbarGroup } from "../components/base";
import { DemoContainer } from "./DemoContainer";
import {
  docsComponentItems,
  docsComponentGroups,
  type DocsComponentItem,
  type DocsPageId,
} from "./componentRegistry";

type ComponentsOverviewProps = {
  selectedId: DocsPageId;
  onSelect: (page: DocsPageId) => void;
};

const statusLabels = {
  production: "生产可用",
  stub: "占位",
  planned: "计划中",
  ready: "文档就绪",
  covered: "能力覆盖",
  partial: "部分覆盖",
};

function getStatusLabel(
  status: DocsComponentItem["implementationStatus"] | DocsComponentItem["docsStatus"] | DocsComponentItem["capabilityStatus"],
) {
  return statusLabels[status] ?? status;
}

function countBy<T extends string>(items: DocsComponentItem[], getValue: (item: DocsComponentItem) => T) {
  return items.reduce<Record<T, number>>(
    (counts, item) => {
      const value = getValue(item);
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

const implementationCounts = countBy(docsComponentItems, (item) => item.implementationStatus);
const docsCounts = countBy(docsComponentItems, (item) => item.docsStatus);
const categoryCounts = countBy(docsComponentItems, (item) => item.category);

const acceptanceRows = [
  {
    role: "产品专家",
    focus: "registry 状态、组件职责、planned/stub/production 边界",
    pass: "production 项必须有真实源码与导出；stub 不能被描述成业务可用；planned 只作路线登记。",
  },
  {
    role: "UI 专家",
    focus: "Overview/Detail 可读性、360/390/430 移动端横向滚动、neutral minimal 中性视觉",
    pass: "360px 以上不遮挡；详情页统一包含用途、示例、API、Semantic DOM、Token、mobile 缺口。",
  },
  {
    role: "研发专家",
    focus: "源码一致性、构建、依赖约束",
    pass: "registry 与 src/components 导出一致；build 通过；无 antd、antd-mobile、@ant-design/charts。",
  },
  {
    role: "测试专家",
    focus: "overview/detail/playground/charts 浏览器验收",
    pass: "关键页面可打开、状态矩阵可读、specimen 和 chart SVG 正常渲染，360/390/430 无页面级横向溢出。",
  },
  {
    role: "白帽专家",
    focus: "用户输入、Markdown/SVG、外部依赖与安全边界",
    pass: "文档明确净化/转义边界；禁止外部 UI 套件；SVG/Markdown 风险进入缺口项。",
  },
];

export function ComponentsOverview({ selectedId, onSelect }: ComponentsOverviewProps) {
  return (
    <section className="components-overview" aria-labelledby="components-overview-title">
      <header className="components-overview__header">
        <div>
          <p className="eyebrow">component registry</p>
          <h1 id="components-overview-title">Tessera 教程入口</h1>
          <p>
            先从 Button、Input、Card、Toolbar 这些基础构件理解语言，再进入 Business 与 Charts。每个教程区都用 Tessera 自己的组件承载说明、预览和样例代码。
          </p>
        </div>
        <Toolbar className="components-overview__hero-tools" compact mobileBehavior="wrap" variant="plain" aria-label="教程入口快捷操作">
          <ToolbarGroup>
            <Button icon={<Icon decorative name="search" />} variant="solid" onClick={() => onSelect("button")}>
              从 Button 开始
            </Button>
            <Button icon={<Icon decorative name="code" />} variant="soft" onClick={() => onSelect("playground")}>
              打开 Appendix
            </Button>
          </ToolbarGroup>
          <ToolbarGroup>
            <Tag tone="strong">Base {categoryCounts.Base ?? 0}</Tag>
            <Tag tone="subtle">Business {categoryCounts.Business ?? 0}</Tag>
            <Tag tone="subtle">Charts {categoryCounts.Charts ?? 0}</Tag>
          </ToolbarGroup>
        </Toolbar>
      </header>

      <section className="components-overview__summary" aria-label="Registry 状态汇总">
        {[
          {
            label: "总登记",
            value: docsComponentItems.length,
            note: `Base ${categoryCounts.Base ?? 0} / Business ${categoryCounts.Business ?? 0} / Charts ${categoryCounts.Charts ?? 0}`,
          },
          { label: "生产可用", value: implementationCounts.production ?? 0, note: "真实源码与 barrel export 对齐后才能维持 production。" },
          { label: "占位", value: implementationCounts.stub ?? 0, note: "只允许进入 specimen 或规划讨论，不能当稳定 API。" },
          { label: "计划中", value: implementationCounts.planned ?? 0, note: "保留能力路线，不虚构实现与示例。" },
          { label: "文档就绪", value: docsCounts.ready ?? 0, note: "已具备专页或生产级结构化验收文档。" },
          { label: "文档占位", value: docsCounts.stub ?? 0, note: "已有统一结构，仍需补真实 demo 和 API 深水区。" },
        ].map((item) => (
          <Card className="components-overview__metric" key={item.label} padding="sm">
            <Tag tone="subtle">{item.label}</Tag>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      <section className="components-overview__tutorial" aria-labelledby="components-tutorial-title">
        <div className="components-overview__group-heading">
          <div>
            <p className="eyebrow">how to read</p>
            <h2 id="components-tutorial-title">教程壳层如何使用组件</h2>
          </div>
          <p>入口、导航、筛选、示例和代码都用现有组件表达；这里先展示壳层自身的组合方式。</p>
        </div>
        <div className="components-overview__demo-grid">
          <DemoContainer
            title="入口工具栏"
            description="Toolbar 组织主动作，Tag 暴露状态，Button 保持动作一致。"
            code={'<Toolbar compact>\n  <Button variant="solid">从 Button 开始</Button>\n  <Tag tone="strong">Base</Tag>\n</Toolbar>'}
          >
            <Toolbar compact mobileBehavior="wrap" variant="framed" aria-label="Overview demo toolbar">
              <ToolbarGroup>
                <Button icon={<Icon decorative name="search" />} size="sm" variant="solid">
                  Start
                </Button>
                <Button icon={<Icon decorative name="code" />} size="sm">
                  Appendix
                </Button>
              </ToolbarGroup>
              <ToolbarGroup>
                <Tag tone="strong">ready</Tag>
                <Tag tone="subtle">tutorial</Tag>
              </ToolbarGroup>
            </Toolbar>
          </DemoContainer>

          <DemoContainer
            background="sunken"
            title="组件选择与输入"
            description="Segmented 与 Input 演示教程中常见的选择、搜索和密度控制。"
            code={'<Segmented options={[{ label: "Base", value: "base" }]} value="base" />\n<Input label="Search" placeholder="Button" />'}
          >
            <div className="components-overview__control-demo">
              <Segmented
                label="Layer"
                options={[
                  { label: "Base", value: "base" },
                  { label: "Business", value: "business" },
                  { label: "Charts", value: "charts" },
                ]}
                size="sm"
                value="base"
              />
              <Input label="Search specimen" name="overviewSearchSpecimen" placeholder="Button, Toolbar, Card" />
            </div>
          </DemoContainer>

          <DemoContainer
            title="文档分区"
            description="Tabs 用来承载路径、状态和验收信息，避免首屏文案过密。"
            code={'<Tabs items={[{ id: "path", label: "Path", content: "..." }]} />'}
          >
            <Tabs
              aria-label="Overview information architecture demo"
              items={[
                { id: "path", label: "Path", content: <p>Overview -&gt; component detail -&gt; Appendix specimen.</p> },
                { id: "state", label: "State", content: <p>production / stub / planned always appear as Tags.</p> },
                { id: "proof", label: "Proof", content: <p>Each region pairs preview, code, and acceptance evidence.</p> },
              ]}
            />
          </DemoContainer>
        </div>
      </section>

      <section className="components-overview__acceptance" aria-labelledby="components-acceptance-title">
        <div className="components-overview__group-heading">
          <div>
            <p className="eyebrow">production acceptance</p>
            <h2 id="components-acceptance-title">五角色验收矩阵</h2>
          </div>
          <p>每次把组件推进到 production 或 ready，都需要能回到这里解释证据和风险。</p>
        </div>
        <div className="components-overview__acceptance-grid">
          {acceptanceRows.map((row) => (
            <Card key={row.role} padding="sm" title={row.role}>
              <p>{row.focus}</p>
              <Tag tone="subtle">{row.pass}</Tag>
            </Card>
          ))}
        </div>
      </section>

      <div className="components-overview__groups">
        {docsComponentGroups.map((group) => (
          <section className="components-overview__group" key={group.id} aria-labelledby={`${group.id}-group-title`}>
            <div className="components-overview__group-heading">
              <div>
                <p className="eyebrow">
                  {group.category} / {group.id}
                </p>
                <h2 id={`${group.id}-group-title`}>{group.title}</h2>
              </div>
              <p>
                {group.description}
                <span className="components-overview__group-count">{group.items.length} 项</span>
              </p>
            </div>

            <div className="components-overview__grid">
              {group.items.map((item) => (
                <Card
                  className={`components-overview-card${
                    selectedId === item.id ? " components-overview-card--active" : ""
                  }`}
                  footer={
                    <div className="components-overview-card__footer">
                      <span>{item.source}</span>
                      <Button icon={<Icon decorative name="chevron-right" />} iconPosition="end" size="sm" onClick={() => onSelect(item.id)}>
                        打开
                      </Button>
                    </div>
                  }
                  key={item.id}
                  padding="sm"
                >
                  <div className="components-overview-card__title">
                    <div>
                      <h3>{item.name}</h3>
                      <span>{item.chineseName}</span>
                    </div>
                    <Tag className="components-overview-card__layer" tone="subtle">{item.layer}</Tag>
                  </div>
                  <p>{item.description}</p>
                  <div className="components-overview-card__status" aria-label={`${item.name} 状态`}>
                    <Tag tone={item.implementationStatus === "production" ? "strong" : "subtle"}>{getStatusLabel(item.implementationStatus)}</Tag>
                    <Tag tone={item.docsStatus === "ready" ? "strong" : "subtle"}>{getStatusLabel(item.docsStatus)}</Tag>
                    <Tag tone={item.capabilityStatus === "covered" ? "strong" : "subtle"}>{getStatusLabel(item.capabilityStatus)}</Tag>
                  </div>
                  <div className="components-overview-card__tags" aria-label={`${item.name} 能力标签`}>
                    {item.tags.slice(0, 4).map((tag) => (
                      <Tag key={tag} tone="subtle">{tag}</Tag>
                    ))}
                  </div>
                  <p className="components-overview-card__risk">{item.risk}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
