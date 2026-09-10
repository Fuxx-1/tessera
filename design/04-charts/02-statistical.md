# Charts · 统计与指标图（6）

## ScatterChart 散点图

- 点 5px（数据量 >200 降 3.5px）、系列色 75% 透明度防重叠糊；hover 点 7px + 白描边；
- 双轴均显示轴线；趋势线可选 1.5px 虚线墨色；
- 气泡变体：半径映射 4–20px + 图例给出尺寸参照。

## RadarChart 雷达图

- 蛛网：环 1px border-light（4–5 环）、辐条 1px border-light；轴标签 11 secondary；
- 系列：线 2px + 12% 填充；≤3 系列上限（更多转柱状）；
- 顶点 hover 3px 点 + tooltip。

## Heatmap 热力图

- 单色浓度阶（墨色 4%→88% 的 7 档 color-mix，暗色主题白系），**不用红绿双色阶**
 （语义对比场景才允许 danger↔success 双极阶且必须过色盲检查）；
- 格间隙 2px、radius-2xs；hover 格 1.5px `--ct-text` 描边；
- 色例：横向渐变条 8px 高 + 两端 min/max 11px 标签；
- 空格（无数据）用 `--ct-surface-muted` + 斜纹可选。

## Treemap 矩形树图

- 块填充系列色 80% + 2px surface 色间隙、radius-2xs；
- 块标签：名称 12/500 + 值 11 secondary，装不下自动省略/隐藏（<48×24 无标签）；
- 层级下钻：面包屑 12px 于图上方；hover 块提亮 8%；
- 同层用同色浓度阶（85%→45%）而非跳色。

## FunnelChart 漏斗图

- 层高等分、宽度按值映射；层间 gap 4；层 radius-2xs；
- 同色浓度递减（首层 90% → 末层 40%），不做彩虹漏斗；
- 层标签：阶段名 12 + 值/转化率 12/600 居中（浅层色深用白字自动反差）；
- 层间转化率徽注 11 secondary 于右侧。

## GaugeChart 仪表盘

- 270° 弧、轨 8px `--ct-border` radius-full 端点；
- 进度弧 8px 墨色（阈值区间可映射 success/warning/danger 分段底轨 20% 透明）；
- 中心：当前值 24/600 + 单位 12 secondary + 目标 11 tertiary；
- 指针可选（三角 + 圆座）；数值变化补间 300ms。
