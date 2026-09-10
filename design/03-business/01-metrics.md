# Business · 指标与状态（4）

## MetricCard 指标卡

看板核心单元。Card 基座 + 固定信息层级：

```
label 12px secondary          ← 指标名
value 28px/600 tabular-nums   ← 主数值（中性墨色）
delta ↑2.4% 12px + 副注       ← 趋势（success/danger 只染这里）
```

- padding 16、min-width 200；数值与 label 间距 4、delta 间距 8；
- 可挂尾随 Sparkline（右侧 64×28，与 delta 同基线）；
- loading = 三行 Skeleton 保持同高；错误态 label 保留 + danger 12px 提示。
- 组网格：`repeat(auto-fill, minmax(220px, 1fr))` gap 16，移动端单列。

禁忌：主数值染色；卡内超过一个强调元素。

## MiniChartCard 迷你图卡

MetricCard 的图形增强版：上半 = MetricCard 头两行，下半嵌 64px 高迷你图
（Sparkline/迷你柱，图表层规格）；图与数字区间距 12；图表无轴无图例，
tooltip 沿用图表基座；hover 卡片升 hairline+sm 影（可点时）。

## PropertyList 属性列表

详情页键值对：

- 行高 ≥32：label 12–13 tertiary 宽 30%（min 96 max 160）+ value 13 主色；
- 行间无线（靠 8px 节奏），分组间 border-light + 16 间距、分组标题 12/500 secondary；
- value 内可嵌 Tag/状态点/代码片段/链接（各自组件规格）；空值显示 `—` quaternary；
- 可复制 value hover 现身复制钮（IconButton sm ghost）；
- 双列模式（宽 >720）列间 32。

## StatusTimeline 状态时间线

任务/部署过程的状态流：Timeline 基座 + 状态强化：

- 节点 16px：完成=success 实心勾圆、进行中=accent 描边 + 呼吸点（reduced-motion 静止）、
  失败=danger 实心 ×、等待=border-heavy 空圈；
- 主行：标题 13/500 + 时间 12 tertiary 右对齐；详情 12 secondary 可折叠（Collapse 行为）；
- 进行中节点到下一节点的轨道段用 1px 虚线；
- 附日志的节点可嵌 CodeBlock 紧凑态（max-height 160 内滚）。
