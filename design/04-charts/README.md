# Charts 层 · 图表设计规范（15）

> 对应 `src/components/charts`（自有 SVG 实现）。Codex 图表证据来自其 Chart_* 组件 CSS
>（`00-source/codex-tokens.raw.json → chartCss`），结构性结论：**轴/网格用 UI 边框令牌、
> 刻度文字用次级文字令牌、tooltip 是标准悬浮面、图例是可点的水洗胶囊行**。

## 分组

| 文件 | 图表 |
| --- | --- |
| `01-basic.md` | LineChart, BarChart, AreaChart, PieChart, Sparkline |
| `02-statistical.md` | ScatterChart, RadarChart, Heatmap, Treemap, FunnelChart, GaugeChart |
| `03-relation-text.md` | SankeyChart, OrganizationChart, MindMap, WordCloud |

## 1. 图表基座（ChartFrame，全员继承）

| 元素 | 规格 |
| --- | --- |
| 容器 | 透明底继承所在 Card；图表自身不带边框/标题（标题归卡片） |
| 轴线/刻度线 | 1px `--ct-border`；只保留必要的 x 轴线，y 轴线默认隐藏 |
| 网格线 | 1px `--ct-border-light`，仅横向；纵向网格默认关 |
| 轴刻度文字 | 11px `--ct-text-secondary`；数字 tabular-nums |
| tooltip | = UI 悬浮面：`--ct-surface-elevated` + hairline+md 影 + radius-md + padding 8 12 + 11–12px；系列行 = 10px 圆点 + 名称 secondary + 值主色 500 |
| tooltip 光标 | 竖线 `rgba(127,127,127,.16)` / 柱底 `rgba(127,127,127,.08)`（Codex alpha 原值，双主题通用） |
| 图例 | 行内胶囊：10px 圆点 marker + 12px 文字、padding 4 8 radius-sm、hover 水洗、点击隐藏系列（opacity .4 + 删除线可选）、选中底 `--ct-surface-muted` |
| 值标签 | 12px/600 `--ct-text` |
| 空态 | 紧凑 Empty；加载 Skeleton 矩形 |
| 动效 | 首帧入场 300ms（线描入/柱升起）一次性；数据更新 160ms 补间；reduced-motion 直接终态 |

## 2. 系列色板（与 UI 色隔离）

沿用 `palette.ts` 低饱和土色系（Codex 风格的"内容色不抢 UI 色"精神）：

| 序 | 色 | 名 |
| --- | --- | --- |
| 1 | `#2c2c2a` | 墨（主系列，呼应反相中性） |
| 2 | `#66715e` | 鼠尾草 |
| 3 | `#9b6a4e` | 陶土 |
| 4 | `#6f5d73` | 李紫 |
| 5 | `#b48639` | 琥珀 |
| 6 | `#8a6f52` | 驼 |

- 单系列图默认全用墨色；多系列按序取色；语义图（涨跌）可映射 success/danger；
- 暗色主题同板提亮 12%（`mixChartColor(color, '#fff', .12)`）；
- 面积/柱 hover：本体提亮 8% 或其余系列降 opacity .45（二选一，图内一致）。

## 3. 无障碍

- SVG 根挂 `role="img"` + `aria-label` 摘要；关键数据提供 sr-only 表格或 `desc`；
- 不依赖颜色区分系列：≥3 系列时线型/点形差异化可选开启；
- 交互元素（图例、可点扇区）可聚焦并有焦点环。
