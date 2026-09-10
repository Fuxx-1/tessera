import { ChartDocShowcase } from "./ChartDocShowcase";
import { AreaChart } from "../components/charts";
import { ComponentDetailDoc } from "./ComponentDocTemplate";
import { getDocsComponentItem } from "./componentRegistry";
import { TutorialScaffold } from "./TutorialScaffold";

export type AreaChartDocProps = {
  showAnchors?: boolean;
};

const areaTrendData = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 51 },
  { label: "Thu", value: 76 },
  { label: "Fri", value: 68 },
  { label: "Sat", value: 92 },
  { label: "Sun", value: 84 },
];

const areaSignedData = [
  { label: "North America", value: 32 },
  { label: "Europe", value: -12 },
  { label: "Asia Pacific", value: 46 },
  { label: "Latin America", value: 18 },
  { label: "Middle East", value: -7 },
  { label: "Africa", value: 14 },
];

const areaDuplicateLabelsData = [
  { label: "Sprint 1", value: 12 },
  { label: "Sprint 1", value: 19 },
  { label: "Sprint 2 very long imported release label", value: 28 },
  { label: "Sprint 3", value: 22 },
  { label: "Sprint 4", value: 31 },
];

const areaAnomalyData = [
  { label: "Valid A", value: 18 },
  { label: "NaN input", value: Number.NaN },
  { label: "Valid B", value: 34 },
  { label: "Infinity input", value: Number.POSITIVE_INFINITY },
  { label: "Valid C", value: 27 },
  { label: "Valid D", value: 46 },
];

const areaLargeData = Array.from({ length: 25000 }, (_, index) => ({
  label: `P${index + 1}`,
  value: 48 + Math.sin(index / 180) * 18 + Math.cos(index / 41) * 6,
}));

const areaSinglePointData = [{ label: "Only retained point after filters", value: -8 }];

const areaSeries = [
  {
    name: "Desktop",
    data: [
      { label: "Jan", value: 42 },
      { label: "Feb", value: 48 },
      { label: "Mar", value: 51 },
      { label: "Apr", value: 58 },
      { label: "May", value: 62 },
      { label: "Jun", value: 69 },
    ],
  },
  {
    name: "Mobile web",
    color: "#66715e",
    fillOpacity: 0.2,
    data: [
      { label: "Jan", value: 32 },
      { label: "Feb", value: 36 },
      { label: "Mar", value: 43 },
      { label: "Apr", value: Number.NaN },
      { label: "May", value: 55 },
      { label: "Jun", value: 61 },
    ],
  },
  {
    name: "Tablet rollout",
    color: "url(javascript:blocked)",
    data: [],
  },
];

const areaReviewRows = [
  "产品：面积图用于强调趋势量感和累计变化，不替代精确点值对比或多序列堆叠分析。",
  "UI：默认 clay 色、SVG 渐变面积、线面双编码、零基线、网格、图例和标签截断保持可扫描。",
  "研发：实现只使用 React 与自有 SVG/utils，fillOpacity、height、margin、domain、异常数据、多序列和数万点输入均收敛。",
  "测试：独立路由覆盖常规、多序列、重复标签、单点、正负值、empty、loading、error、异常值、25000 点采样、移动端无溢出和 SVG 可访问描述。",
  "白帽：不引入 antd、antd-mobile、@ant-design/charts；颜色只接受安全 hex，标签以 React 文本节点进入 SVG，不拼接 HTML。",
];

const oneLineExample = "<AreaChart data={trendData} title=\"Coverage trend\" summary=\"Coverage improves through the week.\" />";

export function AreaChartDoc({ showAnchors = false }: AreaChartDocProps) {
  return (
    <TutorialScaffold component="AreaChart" kind="display" oneLineExample={oneLineExample}>
      <>
      <ComponentDetailDoc item={getDocsComponentItem("area-chart")} />
      <ChartDocShowcase focus="area-chart" showAnchors={showAnchors} />
      <section className="chart-doc-showcase area-chart-doc" aria-labelledby="area-chart-production-title">
        <div className="button-doc__content">
          <section className="button-doc-section" id="area-chart-production" aria-labelledby="area-chart-production-title">
            <div className="button-doc-section__heading">
              <h3 id="area-chart-production-title">AreaChart 生产专项</h3>
              <p>独立页验证 API 用法、SVG 渐变面积、颜色、坐标轴、点位 title tooltip、零基线、状态语义、移动端边界和禁用外部图表依赖，不合并到 ChartsDoc。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Coverage trend</h3>
                  <p>常规趋势使用受控 Y 轴、透明度收敛和可读 summary。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <AreaChart
                    data={areaTrendData}
                    fillOpacity={0.28}
                    scale={{ includeZero: true, tickCount: 4, yDomain: [0, 100] }}
                    summary="Coverage grows through Saturday and remains above the weekly start."
                    title="AreaChart coverage trend"
                    xLabelMaxLength={8}
                  />
                  <code>{`<AreaChart data={data} title="AreaChart coverage trend" />`}</code>
                </div>
              </article>
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Signed baseline</h3>
                  <p>正负值围绕零基线闭合，长标签在移动端截断并保留 title。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <AreaChart
                    data={areaSignedData}
                    fillOpacity={0.34}
                    scale={{ tickCount: 5, yDomain: [-20, 60] }}
                    summary="Regional deltas cross the zero baseline with positive and negative values."
                    title="AreaChart signed deltas"
                    valueFormatter={(value) => `${value > 0 ? "+" : ""}${value}%`}
                    xLabelMaxLength={7}
                  />
                  <code>{`<AreaChart data={signedData} valueFormatter={(value) => value + "%"} />`}</code>
                </div>
              </article>
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Multi-series overlay</h3>
                  <p>多序列共享标签轴和 Y 域；空序列被忽略，非法颜色回退到安全色板。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <AreaChart
                    data={[]}
                    fillOpacity={0.26}
                    scale={{ includeZero: true, tickCount: 4 }}
                    series={areaSeries}
                    summary="Desktop and mobile web share the same month axis; empty tablet data is skipped."
                    title="AreaChart multi-series overlay"
                    xLabelMaxLength={7}
                  />
                  <code>{`<AreaChart data={[]} series={series} title="AreaChart multi-series overlay" />`}</code>
                </div>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="area-chart-data-strategy" aria-labelledby="area-chart-data-strategy-title">
            <div className="button-doc-section__heading">
              <h3 id="area-chart-data-strategy-title">异常值与大数据策略</h3>
              <p>非法数值先过滤；数万点输入按 SVG 渲染预算顺序采样到 160 点，并在图表下方显示性能提示。</p>
            </div>
            <div className="charts-doc-demo-grid">
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Sanitized input</h3>
                  <p>NaN 和 Infinity 不进入 path、circle 或坐标轴 domain，剩余点仍保留 tooltip title。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <AreaChart
                    data={areaAnomalyData}
                    fillOpacity={0.3}
                    scale={{ includeZero: true, tickCount: 4 }}
                    summary="AreaChart filters non-finite values before path generation."
                    title="AreaChart sanitized values"
                    xLabelMaxLength={8}
                  />
                  <code>{`<AreaChart data={dirtyData} title="AreaChart sanitized values" />`}</code>
                </div>
              </article>
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>25,000 point input</h3>
                  <p>默认只渲染 160 个 SVG 点，避免把浏览器主线程交给不可审计的大 path。</p>
                </div>
                <div className="charts-doc-demo__preview">
                  <AreaChart
                    data={areaLargeData}
                    fillOpacity={0.22}
                    scale={{ includeZero: true, tickCount: 4 }}
                    summary="Large AreaChart input is sampled to the SVG render budget."
                    title="AreaChart large input sampling"
                    xLabelMaxLength={5}
                  />
                  <code>{`<AreaChart data={largeData} title="AreaChart large input sampling" />`}</code>
                </div>
              </article>
              <article className="charts-doc-demo">
                <div className="charts-doc-demo__meta">
                  <h3>Duplicate labels and single point</h3>
                  <p>重复标签保留原始顺序，不用 label 查找定位；单点仍闭合到零基线。</p>
                </div>
                <div className="charts-doc-demo__preview area-chart-doc__stack">
                  <AreaChart
                    data={areaDuplicateLabelsData}
                    fillOpacity={0.3}
                    scale={{ includeZero: true, tickCount: 4 }}
                    summary="Duplicate labels keep separate x positions through source indexes."
                    title="AreaChart duplicate labels"
                    xLabelMaxLength={9}
                  />
                  <AreaChart
                    data={areaSinglePointData}
                    fillOpacity={0.36}
                    height={180}
                    scale={{ includeZero: true, tickCount: 3 }}
                    summary="Single negative point closes to the zero baseline."
                    title="AreaChart single negative point"
                    valueFormatter={(value) => `${value}%`}
                    xLabelMaxLength={8}
                  />
                  <code>{`<AreaChart data={onePointData} height={180} title="AreaChart single negative point" />`}</code>
                </div>
              </article>
            </div>
          </section>

          <section className="button-doc-section" id="area-chart-states" aria-labelledby="area-chart-states-title">
            <h3 id="area-chart-states-title">状态与审查</h3>
            <div className="charts-doc-state-grid area-chart-doc__states">
              <AreaChart data={[]} emptyText="No area chart data" title="AreaChart empty state" />
              <AreaChart data={areaTrendData} loading loadingText="Loading area trend" title="AreaChart loading state" />
              <AreaChart data={areaTrendData} error="Area trend service unavailable." title="AreaChart error state" />
            </div>
            <ul className="button-doc-list">
              {areaReviewRows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </>
    </TutorialScaffold>
  );
}
