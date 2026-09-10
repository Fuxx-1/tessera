# Charts · 基础图表（5）

## LineChart 折线图

- 线宽 2px、拐点默认不画（≤12 点时画 3px 实心点）；hover 点放大 5px + 白描边 2px；
- 平滑曲线默认关（工程数据用直线段更诚实）；缺失数据断线不插值（可选虚线连接）；
- hover 竖直参考线 = tooltip 光标规格；多系列共用 tooltip 列出全部；
- 阈值线：1px 虚线 `--ct-text-tertiary` + 右端 11px 标签。

## BarChart 柱状图

- 柱宽 = 类目宽 60%（组内多系列均分 gap 2）、radius 顶部 2xs(2)；
- 类目 gap ≥ 8；横向条形图同规格转置，label 12 secondary 左对齐；
- hover 整类目背景 `rgba(127,127,127,.08)` 光标 + 本柱提亮；
- 堆叠模式段间无缝、总值标签 12/600 顶部可选；负值向下同 radius。

## AreaChart 面积图

- 线 2px + 面积同色 12% 透明填充（渐变 20%→4% 可选）；
- 堆叠面积各系列 24% 透明度、边界线 1.5px；
- 其余同 LineChart。面积不叠加描边纹理。

## PieChart 饼图

- 默认**环形**（内径 62%），中心可放 Statistic（总计 20/600 + label 11 secondary）；
- 扇区间隙 2px（以 surface 色描边实现）；hover 扇区外扩 4px + 其余降 opacity .45；
- 标签优先图例承载；直连标签仅 ≤5 类时启用（11px + 1px 引导线 border-heavy）；
- 类目 >6 自动聚合"其他"（quaternary 灰）。

## Sparkline 迷你图

- 无轴无网格无图例；默认 64×28（紧凑 48×20）；线 1.5px 墨色；
- 终点 3px 实心点；可选终值 11px tabular-nums 尾随；
- 面积变体 8% 填充；柱变体柱宽 ≥2 gap 1；
- 阈值着色：低于基线段换 danger（唯一允许的语义色场景）；
- 容器过窄（<40px）自动只显终值文字。
