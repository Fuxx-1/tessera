# Business 层 · 业务组件设计规范（11）

> 对应 `src/components/business`。业务件由 Base 件组合而成，**不得引入新的原始视觉**——
> 所有颜色/圆角/阴影仍取 `--ct-*` 令牌，本层只定义"组合方式与信息密度"。

## 分组

| 文件 | 组件 |
| --- | --- |
| `01-metrics.md` | MetricCard, MiniChartCard, PropertyList, StatusTimeline |
| `02-toolbar-filter.md` | DataToolbar, FilterPanel, CommandPalette |
| `03-content-render.md` | CodeBlock, MarkdownEditor, MermaidSvgViewer, MobilePreviewFrame |

## 共同纪律

1. 业务卡片 = Card 规格（surface + border + radius-xl + padding 16），不另起炉灶；
2. 数字一律 tabular-nums；趋势语义色只染箭头和百分比，不染主数值；
3. 空/加载/错误三态必须齐备（Empty 紧凑态 / Skeleton / 状态条）；
4. 业务件的移动端行为在本层文档内声明（何时堆叠、何时横滚）。
