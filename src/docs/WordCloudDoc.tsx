import { WordCloud } from "../components/charts";
import type { ComponentDocMeta } from "./ButtonDoc";
import { TutorialScaffold } from "./TutorialScaffold";

type DocRow = {
  name: string;
  value: string;
  description: string;
};

export type WordCloudDocProps = {
  showAnchors?: boolean;
};

export const wordCloudDocMeta = {
  title: "WordCloud 词云",
  category: "可视化组件",
  anchors: [
    { id: "word-cloud-when", label: "何时使用" },
    { id: "word-cloud-demos", label: "代码演示" },
    { id: "word-cloud-api", label: "API" },
    { id: "word-cloud-layout", label: "布局策略" },
    { id: "word-cloud-a11y", label: "可访问性" },
    { id: "word-cloud-limits", label: "限制" },
    { id: "word-cloud-review", label: "五角色审查" },
  ],
} satisfies ComponentDocMeta;

const conceptWords = [
  { label: "Accessibility", value: 96 },
  { label: "Responsive", value: 84 },
  { label: "SVG", value: 78 },
  { label: "Deterministic", value: 72 },
  { label: "Fallback", value: 64 },
  { label: "Mobile", value: 58 },
  { label: "Tokens", value: 52 },
  { label: "No overlap", value: 48 },
  { label: "Charts", value: 44 },
  { label: "React", value: 40 },
  { label: "Docs", value: 32 },
  { label: "Security", value: 28 },
];

const mixedWords = [
  { label: "产品", value: 88 },
  { label: "体验", value: 72 },
  { label: "研发", value: 68 },
  { label: "测试", value: 56 },
  { label: "白帽", value: 52 },
  { label: "移动端", value: 48 },
  { label: "语义", value: 43 },
  { label: "权重", value: 39 },
  { label: "关键词", value: 35 },
  { label: "布局", value: 31 },
  { label: "降级", value: 26 },
];

const denseWords = [
  { label: "Component", value: 60 },
  { label: "Review", value: 59 },
  { label: "Registry", value: 58 },
  { label: "<img src=x onerror=alert(1)>safe-text", value: 57.5 },
  { label: "Route", value: 57 },
  { label: "Export", value: 56 },
  { label: "Build", value: 55 },
  { label: "Scan", value: 54 },
  { label: "Smoke", value: 53 },
  { label: "Spacing", value: 52 },
  { label: "State", value: 51 },
  { label: "Summary", value: 50 },
  { label: "Fallback list", value: 49 },
  { label: "Small screen", value: 48 },
  { label: "Label", value: 47 },
  { label: "Value", value: 46 },
];

const longVocabularyWords = [
  ...Array.from({ length: 10000 }, (_, index) => ({
    label: index % 137 === 0 ? `Supercalifragilisticexpialidocious-keyword-${index}` : `Keyword ${index + 1}`,
    value: ((index * 37) % 997) + 1,
  })),
  { label: "A-very-long-product-feedback-keyword-that-should-never-escape-the-SVG-viewBox-or-card", value: 1400 },
  { label: "数万词输入先聚合再截断", value: 1360 },
  { label: "Top-N layout budget", value: 1280 },
  { label: "Fallback list", value: 1120 },
];

const apiRows: DocRow[] = [
  {
    name: "data",
    value: "Array<{ label: string; value: number }>",
    description: "只渲染有限正数；label 会规范空白并限制长度，value 映射字号，文本由 React 安全转义。",
  },
  {
    name: "minFontSize / maxFontSize",
    value: "number",
    description: "线性字号范围，非法值会被收敛；默认 14 到 48。",
  },
  {
    name: "maxWords",
    value: "number",
    description: "最多参与布局的词数，默认 36，上限 80；输入数万词时组件只保留有限 Top-N 候选，业务侧仍应先聚合同义词。",
  },
  {
    name: "padding",
    value: "number",
    description: "词与词之间的矩形碰撞留白，默认 10。",
  },
  {
    name: "colors",
    value: "string[]",
    description: "安全十六进制色板；空色板或非法颜色回退到内置 chartSeriesColors。",
  },
  {
    name: "showFallbackList",
    value: "boolean",
    description: "默认展示有序文本列表，作为屏幕阅读器、长词裁剪和布局失败词的可读兜底。",
  },
];

const reviewRows: DocRow[] = [
  {
    name: "产品",
    value: "通过",
    description: "适合表达关键词权重、反馈主题和搜索热词，不用于严谨排名或精确比例阅读。",
  },
  {
    name: "UI",
    value: "通过",
    description: "字号层级清晰，色彩来自多色板，移动端保留稳定 viewBox 和列表阅读。",
  },
  {
    name: "研发",
    value: "通过",
    description: "自有 SVG/HTML 实现，确定性排序与螺旋放置，不引入 antd 系或重型布局库。",
  },
  {
    name: "测试",
    value: "通过",
    description: "覆盖空、加载、错误、密集词、中文词、移动端和不可放置词兜底。",
  },
  {
    name: "白帽",
    value: "通过",
    description: "文本由 React 节点输出，数值只接受有限正数，色值经过安全十六进制过滤。",
  },
];

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

const oneLineExample = "<WordCloud data={conceptWords} title=\"Component keywords\" summary=\"Accessibility leads.\" />";

export function WordCloudDoc({ showAnchors = false }: WordCloudDocProps) {
  return (
    <TutorialScaffold component="WordCloud" kind="display" oneLineExample={oneLineExample}>
      <section className="charts-doc word-cloud-doc" aria-labelledby="word-cloud-doc-title">
      <div className={showAnchors ? "button-doc__layout button-doc__layout--with-toc" : "button-doc__layout"}>
        {showAnchors ? (
          <aside className="button-doc__toc" aria-label="WordCloud 文档目录">
            {wordCloudDocMeta.anchors.map((anchor) => (
              <a href={`#${anchor.id}`} key={anchor.id}>
                {anchor.label}
              </a>
            ))}
          </aside>
        ) : null}

        <div className="button-doc__content">
          <header className="button-doc__header">
            <p className="eyebrow">component doc</p>
            <h2 id="word-cloud-doc-title">{wordCloudDocMeta.title}</h2>
            <p>轻量词云组件，用自有 SVG 文字和 HTML 有序列表表达关键词权重，不依赖 @ant-design/charts、antd 或重型布局库。</p>
          </header>

          <section className="button-doc-section" id="word-cloud-when" aria-labelledby="word-cloud-when-title">
            <h3 id="word-cloud-when-title">何时使用</h3>
            <ul className="button-doc-list">
              <li>用于反馈摘要、搜索热词、文档主题和小中型文本分布探索。</li>
              <li>需要精准排名时同时展示 fallback list，或改用 BarChart / Table。</li>
              <li>需要旋转词、形状蒙版、碰撞优化动画或千级词布局时，应接入专门布局模块后再生产化。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="word-cloud-demos" aria-labelledby="word-cloud-demos-title">
            <div className="button-doc-section__heading">
              <h3 id="word-cloud-demos-title">代码演示</h3>
              <p>示例覆盖字号映射、中文词、密集词、状态层和可访问列表兜底。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Basic</h3>
                  <p>按 value 排序并映射字号，使用确定性中心螺旋放置。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <WordCloud data={conceptWords} summary="Accessibility and Responsive are the strongest weighted terms." title="Component keywords" />
                </div>
                <pre className="button-doc-code" aria-label="WordCloud basic 代码">
                  <code>{`<WordCloud data={words} title="Component keywords" summary="Accessibility leads." />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Mixed language</h3>
                  <p>中文和英文同走文本节点渲染，列表保留完整排名。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <WordCloud data={mixedWords} maxFontSize={52} minFontSize={16} title="Review vocabulary" valueFormatter={(value) => `${value} pts`} />
                </div>
                <pre className="button-doc-code" aria-label="WordCloud mixed 代码">
                  <code>{`<WordCloud data={words} minFontSize={16} maxFontSize={52} valueFormatter={(value) => value + " pts"} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Dense fallback</h3>
                  <p>当局部词无法放入 SVG 时，fallback list 仍提供完整可读数据；尖括号样例验证文本安全。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <WordCloud data={denseWords} height={220} maxFontSize={42} maxWords={15} padding={12} title="Dense review terms" />
                </div>
                <pre className="button-doc-code" aria-label="WordCloud dense 代码">
                  <code>{`<WordCloud data={denseWords} height={220} maxFontSize={42} maxWords={15} padding={12} />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Large input</h3>
                  <p>数万词输入先做 Top-N 候选收敛，超长词会视觉裁剪并在 title 与 fallback list 中保留完整安全 label。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <WordCloud data={longVocabularyWords} height={240} maxFontSize={44} maxWords={24} title="Large vocabulary keywords" />
                </div>
                <pre className="button-doc-code" aria-label="WordCloud large input 代码">
                  <code>{`<WordCloud data={largeWords} maxWords={24} height={240} title="Large vocabulary keywords" />`}</code>
                </pre>
              </article>

              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>States</h3>
                  <p>空、加载和错误状态复用 ChartFrame，保持容器尺寸稳定。</p>
                </div>
                <div className="charts-doc-demo__preview word-cloud-doc__states">
                  <WordCloud data={[]} emptyText="No keywords yet" title="Empty word cloud" />
                  <WordCloud data={conceptWords.slice(0, 5)} loading loadingText="Loading keywords" title="Loading word cloud" />
                  <WordCloud data={conceptWords.slice(0, 5)} error="Keyword service unavailable." title="Error word cloud" />
                </div>
                <pre className="button-doc-code" aria-label="WordCloud states 代码">
                  <code>{`<WordCloud data={[]} emptyText="No keywords yet" />`}</code>
                </pre>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="word-cloud-api" aria-labelledby="word-cloud-api-title">
            <h3 id="word-cloud-api-title">API</h3>
            <DataTable rows={apiRows} />
          </section>

          <section className="button-doc-section" id="word-cloud-layout" aria-labelledby="word-cloud-layout-title">
            <h3 id="word-cloud-layout-title">布局策略</h3>
            <ul className="button-doc-list">
              <li>数据按 value 降序和原始顺序稳定排序，保证同一输入每次得到相同布局。</li>
              <li>数万词输入会在扫描阶段保留最多 80 个 Top-N 候选，避免对全量词表做昂贵 SVG 排版。</li>
              <li>字号使用线性缩放，超长词先按可用宽度做确定性视觉裁剪，碰撞检测基于裁剪后的矩形边界。</li>
              <li>从画布中心沿确定性螺旋尝试放置，best effort 避免重叠；失败词不会丢失，会继续出现在 fallback list。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="word-cloud-a11y" aria-labelledby="word-cloud-a11y-title">
            <h3 id="word-cloud-a11y-title">可访问性</h3>
            <ul className="button-doc-list">
              <li>SVG 使用 role="img"，内部同步 title 和 desc。</li>
              <li>每个词提供原生 SVG title，包含完整 label 和格式化 value；视觉裁剪词会标记 clipped。</li>
              <li>有序 fallback list 始终保留完整数据阅读路径，辅助技术不需要解析视觉位置，长词也不会只剩省略版本。</li>
              <li>状态层出现时隐藏底层 SVG，避免同时朗读旧图形和状态提示。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="word-cloud-limits" aria-labelledby="word-cloud-limits-title">
            <h3 id="word-cloud-limits-title">限制</h3>
            <ul className="button-doc-list">
              <li>不做旋转、任意形状蒙版、动画退火或全局最优排布。</li>
              <li>超长词会限制输入 label 长度，再按 SVG 可用宽度视觉裁剪；若仍无法稳定阅读，应依赖 fallback list 或改用表格。</li>
              <li>不适合未聚合的千级精读词表或需要精确面积比较的分析场景。</li>
              <li>当前无键盘 tooltip；精确数值依赖 fallback list 和业务 summary。</li>
            </ul>
          </section>

          <section className="button-doc-section" id="word-cloud-review" aria-labelledby="word-cloud-review-title">
            <h3 id="word-cloud-review-title">五角色审查</h3>
            <DataTable rows={reviewRows} />
          </section>
        </div>
      </div>
    </section>
    </TutorialScaffold>
  );
}
